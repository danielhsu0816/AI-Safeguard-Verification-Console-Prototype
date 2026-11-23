import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BUNDLE, caseInsert, originalCsv, parseGroup2Csv, sameOriginal, workbookModels } from "./group2/import";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Context = { supabase: SupabaseClient<Database>; userId: string };
async function importCsv(context: Context, csv: string, bundle = false) {
  const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (roleError || !admin) throw new Error("Only an authorized administrator can import fixtures.");
  const rows = parseGroup2Csv(csv);
  const ids = rows.map((r) => r.case_id);
  const { data: existing, error } = await context.supabase.from("test_cases").select("case_id,original_record").in("case_id", ids);
  if (error) throw new Error("Existing cases could not be checked; nothing imported.");
  for (const row of rows) {
    const prev = existing?.find((e) => e.case_id === row.case_id);
    if (prev && !sameOriginal(prev.original_record, row)) throw new Error(`${row.case_id}: ID already exists with different original content. No cases overwritten; use a new reviewed fixture ID.`);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (bundle) {
    const models = workbookModels();
    const results = await Promise.all([
      supabaseAdmin.from("group2_rule_map").upsert(models.rules, { onConflict: "rule_id", ignoreDuplicates: true }),
      supabaseAdmin.from("group2_interface_fields").upsert(models.fields, { onConflict: "field_key", ignoreDuplicates: true }),
      supabaseAdmin.from("group2_decision_map").upsert(models.decisions, { onConflict: "decision", ignoreDuplicates: true }),
      supabaseAdmin.from("group2_acceptance_tests").upsert(models.acceptance, { onConflict: "test_id", ignoreDuplicates: true }),
    ]);
    if (results.some((r) => r.error)) throw new Error("Workbook import incomplete. Retry safely; existing records will not be overwritten.");
  }
  const insertedRows = rows.filter((r) => !existing?.some((e) => e.case_id === r.case_id));
  if (insertedRows.length) {
    const { error: insertError } = await supabaseAdmin.from("test_cases").upsert(insertedRows.map(caseInsert), { onConflict: "case_id", ignoreDuplicates: true });
    if (insertError) throw new Error("Cases could not be imported. Retry safely; existing execution records are preserved.");
  }
  const { data: stored, error: readError } = await context.supabase.from("test_cases").select("case_id,original_record").in("case_id", ids);
  if (readError || rows.some((r) => !sameOriginal(stored?.find((e) => e.case_id === r.case_id)?.original_record, r))) throw new Error("Import verification failed; retry or review conflicting case IDs.");
  const { error: auditError } = await supabaseAdmin.from("audit_events").insert({ actor_id: context.userId, event_type: "group2_import", failure_reason: `${BUNDLE}: ${insertedRows.length} new; ${rows.length - insertedRows.length} unchanged` });
  if (auditError) throw new Error("Import saved, but audit recording failed. Retry safely.");
  return { inserted: insertedRows.length, unchanged: rows.length - insertedRows.length, total: rows.length };
}

export const importGroup2Csv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ csv: z.string().min(1).max(2_000_000) }).parse(d))
  .handler(({ data, context }) => importCsv(context, data.csv));

export const importGroup2Bundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => importCsv(context, originalCsv, true));