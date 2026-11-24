import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

async function readAll<T>(fetchPage: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const page = await q(fetchPage(start, start + 499));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export const casesQuery = queryOptions({ queryKey: ["test_cases"], queryFn: () => readAll((start, end) => supabase.from("test_cases").select("*").order("case_id").range(start, end)) });
export const evaluationsQuery = queryOptions({ queryKey: ["evaluations"], queryFn: () => readAll((start, end) => supabase.from("evaluations").select("*").order("created_at", { ascending: false }).range(start, end)) });
export const rulesQuery = queryOptions({ queryKey: ["rules"], queryFn: () => readAll((start, end) => supabase.from("rules").select("*").order("rule_id").range(start, end)) });
export const sourcesQuery = queryOptions({ queryKey: ["sources"], queryFn: () => readAll((start, end) => supabase.from("sources").select("*").order("source_id").range(start, end)) });
export const notesQuery = queryOptions({ queryKey: ["notes"], queryFn: () => readAll((start, end) => supabase.from("notes").select("*").order("note_id").range(start, end)) });
export const noteVersionsQuery = queryOptions({ queryKey: ["note_versions"], queryFn: () => readAll((start, end) => supabase.from("note_versions").select("*").order("version").range(start, end)) });
export const reviewsQuery = queryOptions({ queryKey: ["review_actions"], queryFn: () => readAll((start, end) => supabase.from("review_actions").select("*").order("created_at", { ascending: false }).range(start, end)) });
export const auditQuery = queryOptions({ queryKey: ["audit_events"], queryFn: () => readAll((start, end) => supabase.from("audit_events").select("*").order("timestamp", { ascending: false }).range(start, end)) });
export const settingsQuery = queryOptions({ queryKey: ["app_settings"], queryFn: () => q<Tables<"app_settings">>(supabase.from("app_settings").select("*").eq("id", 1).single<Tables<"app_settings">>()) });
export const group2RulesQuery = queryOptions({ queryKey: ["group2_rule_map"], queryFn: () => readAll((start, end) => supabase.from("group2_rule_map").select("*").order("rule_id").range(start, end)) });
export const group2InterfaceQuery = queryOptions({ queryKey: ["group2_interface_fields"], queryFn: () => readAll((start, end) => supabase.from("group2_interface_fields").select("*").order("position").range(start, end)) });
export const group2DecisionsQuery = queryOptions({ queryKey: ["group2_decision_map"], queryFn: () => readAll((start, end) => supabase.from("group2_decision_map").select("*").order("decision").range(start, end)) });
export const group2AcceptanceQuery = queryOptions({ queryKey: ["group2_acceptance_tests"], queryFn: () => readAll((start, end) => supabase.from("group2_acceptance_tests").select("*").order("test_id").range(start, end)) });

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const first = rows[0];
  if (!first) return;
  const headers = Object.keys(first);
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    const safe = /^[=+@\-]/.test(s) ? "'" + s : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
