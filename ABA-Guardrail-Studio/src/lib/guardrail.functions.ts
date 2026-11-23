import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateFinding } from "@/lib/guardrail/engine";
import { ExternalEvaluationRequestSchema, type ValidatedFinding } from "@/lib/guardrail/adapter";
import { DECISIONS, type RuleRecord, type SourceRecord } from "@/lib/guardrail/types";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { assertSyntheticInput } from "@/lib/guardrail/privacy";
import { canApproveRelease } from "@/lib/guardrail/review-policy";
import type { CheckResult } from "@/lib/guardrail/types";
import { compareExpected, executeFixture, ExecutionMode } from "./group2/runner";
import { originalRules, workbookModels } from "./group2/import";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };
const json = (v: unknown): Json => JSON.parse(JSON.stringify(v)) as Json;
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
async function writer(c: Ctx) {
  await requireRole(c, ["admin", "reviewer"]);
  // Privileged writes are necessary: browser roles are read-only, so they cannot forge verified decisions.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function passageHash(text: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return "sha256:" + Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getRoles(c: Ctx) {
  const { data } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  return new Set<string>((data ?? []).map((r: { role: string }) => r.role));
}
async function requireRole(c: Ctx, roles: string[]) {
  const mine = await getRoles(c);
  if (!roles.some((r) => mine.has(r))) throw new Error("Forbidden: your role cannot perform this action.");
}
async function loadRegistry(c: Ctx) {
  const [rules, sources, settings] = await Promise.all([
    c.supabase.from("rules").select("*"),
    c.supabase.from("sources").select("*"),
    c.supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  const integrity = await Promise.all((sources.data ?? []).map(async (s) => ({ ...s, authenticity_verified: s.passage_hash === await passageHash(s.approved_passage ?? "") })));
  const available = !rules.error && !sources.error && !settings.error;
  return {
    rules: (rules.data ?? []) as unknown as RuleRecord[],
    sources: integrity as SourceRecord[],
    // If settings cannot be read, fail closed.
    verifierAvailable: available && (settings.data?.verifier_available ?? false),
    model_version: settings.data?.model_version ?? "unknown",
    source_bundle_version: settings.data?.source_bundle_version ?? "unknown",
  };
}
const today = () => new Date().toISOString().slice(0, 10);

async function audit(c: Ctx, e: Record<string, unknown>) {
  // Operational audit never includes note text.
  const { error } = await (await writer(c)).from("audit_events").insert({ actor_id: c.userId, event_type: String(e["event_type"] ?? "action"), ...e });
  if (error) throw new Error("The audit record could not be saved.");
}

async function runOne(c: Ctx, caseId: string, reg: Awaited<ReturnType<typeof loadRegistry>>, mode: ExecutionMode = "automatic") {
  const { data: tc, error } = await c.supabase.from("test_cases").select("*").eq("case_id", caseId).maybeSingle();
  if (error || !tc) throw new Error(`Test case ${caseId} not found`);
  if (tc.import_bundle) {
    const result = executeFixture({ synthetic_input: tc.synthetic_input, target_rule_ids: tc.target_rule_ids }, originalRules, mode);
    const status = compareExpected(result.decision, tc.expected_guardrail_decision, result.trace);
    const { data: ev, error: saveError } = await (await writer(c)).from("evaluations").insert({
      test_case_id: tc.case_id, decision: result.decision, checks: [], reason_codes: [result.reason],
      rule_id: tc.target_rule_ids[0] ?? null, evaluated_by: c.userId,
      model_version: "No live model — Group 2 fixture harness v1", source_bundle_version: tc.import_bundle,
      candidate_finding: json(result.trace.simulation?.candidate ?? {}),
      execution_kind: result.trace.kind, execution_trace: json({ ...result.trace, input: { synthetic_input: tc.synthetic_input, target_rule_ids: tc.target_rule_ids } }),
      expected_decision_snapshot: tc.expected_guardrail_decision,
      registry_snapshot: json({ group2_rules: workbookModels().rules, rules: [], sources: [] }),
      safe_revision_prompt: result.decision === "RELEASE_FLAG" ? "Verify the recorded fields against the original session record. Enter only actual documented values; do not infer missing times or change billable units." : null,
    }).select("id").single();
    if (saveError || !ev) throw new Error("Fixture execution could not be saved.");
    const { error: updateError } = await (await writer(c)).from("test_cases").update({ execution_status: status, actual_decision: result.decision, last_run_at: new Date().toISOString() }).eq("case_id", tc.case_id);
    if (updateError) throw new Error("Execution saved, but case status could not be updated.");
    return { case_id: tc.case_id, decision: result.decision, passed: status === "pass", evaluation_id: ev.id, execution_kind: result.trace.kind, comparison: status };
  }
  if (mode === "external_model") throw new Error("External-model execution is unavailable; no live model was invoked.");
  const { data: nv } = await c.supabase.from("note_versions").select("content,version")
    .eq("note_id", tc.note_id ?? "").eq("version", tc.note_version ?? 0).maybeSingle();
  const result = evaluateFinding(tc.candidate_finding, {
    noteText: nv?.content ?? "",
    currentNoteVersion: tc.note_version ?? 0,
    payer: tc.payer, serviceType: tc.service_type,
    rules: reg.rules, sources: reg.sources,
    verifierAvailable: reg.verifierAvailable && !!nv,
    today: today(),
  });
  const candidate = record(tc.candidate_finding);
  const ruleId = typeof candidate["rule_id"] === "string" ? candidate["rule_id"] : tc.target_rule_ids[0] ?? null;
  const { data: ev, error: evErr } = await (await writer(c)).from("evaluations").insert({
    test_case_id: tc.case_id, note_id: tc.note_id, note_version: tc.note_version, rule_id: ruleId,
    decision: result.decision, checks: json(result.checks), reason_codes: result.reason_codes,
    safe_revision_prompt: result.safe_revision_prompt, candidate_finding: tc.candidate_finding,
    execution_kind: "simulated_candidate", expected_decision_snapshot: tc.expected_guardrail_decision,
    model_version: reg.model_version, source_bundle_version: reg.source_bundle_version, evaluated_by: c.userId, registry_snapshot: json({ rules: reg.rules, sources: reg.sources }),
  }).select("id").single();
  if (evErr || !ev) throw new Error("Evaluation could not be saved.");
  const passed = result.decision === tc.expected_guardrail_decision;
  const { error: updateError } = await (await writer(c)).from("test_cases").update({
    execution_status: passed ? "pass" : "fail",
    actual_decision: result.decision,
    review_status: !passed || result.decision === "REVIEW_REQUIRED" ? "needs_review" : tc.review_status,
    last_run_at: new Date().toISOString(),
  }).eq("case_id", tc.case_id);
  if (updateError) throw new Error("Evaluation saved, but case status could not be updated.");
  await audit(c, {
    event_type: "test_run", test_case_id: tc.case_id, note_version: tc.note_version, evaluation_id: ev.id,
    rule_id: ruleId, guardrail_decision: result.decision,
    failure_reason: passed ? null : `expected ${tc.expected_guardrail_decision}; ${result.reason_codes.join(",")}`,
    model_version: reg.model_version, source_bundle_version: reg.source_bundle_version,
  });
  return { case_id: tc.case_id, decision: result.decision, passed, evaluation_id: ev.id as string, execution_kind: "simulated_candidate", comparison: passed ? "pass" : "fail" };
}

export const runTestCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ case_id: z.string().min(1).max(50), mode: ExecutionMode.default("automatic") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin", "reviewer"]);
    const reg = await loadRegistry(context);
    return runOne(context, data.case_id, reg, data.mode);
  });

export const runAllTestCases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: ExecutionMode.default("automatic") }).parse(d))
  .handler(async ({ context, data }) => {
    await requireRole(context, ["admin", "reviewer"]);
    const reg = await loadRegistry(context);
    const { data: cases } = await context.supabase.from("test_cases").select("case_id").order("case_id");
    const results = [];
    for (const c of cases ?? []) results.push(await runOne(context, c.case_id, reg, data.mode));
    return results;
  });

export const markTestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ case_id: z.string().min(1), execution_status: z.literal("not_executed"), rationale: z.string().trim().min(10).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const { error } = await (await writer(context)).from("test_cases").update({ execution_status: data.execution_status, actual_decision: null, last_run_at: null }).eq("case_id", data.case_id);
    if (error) throw new Error(error.message);
    await audit(context, { event_type: "manual_test_status", test_case_id: data.case_id, reviewer_action: `mark_${data.execution_status}` });
    return { ok: true };
  });

const ImportRowSchema = z.object({
  case_id: z.string().trim().regex(/^[A-Za-z0-9_-]{2,40}$/, "case_id must be 2–40 letters, digits, - or _"),
  title: z.string().trim().min(3).max(200),
  target_rule_ids: z.array(z.string().trim().min(1)).min(1),
  failure_mode: z.string().trim().min(2).max(100),
  synthetic_input: z.string().trim().min(3).max(2000),
  note_id: z.string().trim().min(1),
  note_version: z.number().int().positive(),
  profile_id: z.string().trim().max(100).nullable(),
  payer: z.string().trim().max(100).nullable(),
  service_type: z.string().trim().max(50).nullable(),
  candidate_finding: z.record(z.string(), z.unknown()),
  expected_guardrail_decision: z.enum(DECISIONS),
  expected_safe_feedback: z.string().max(2000).nullable(),
  forbidden_output: z.string().max(2000).nullable(),
  evidence_check: z.string().max(500).nullable(),
  proposed_priority: z.enum(["low", "medium", "high", "critical"]),
});
export type ImportRow = z.infer<typeof ImportRowSchema>;

export const importTestCases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(ImportRowSchema).min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    data.rows.forEach((r) => assertSyntheticInput(JSON.stringify(r)));
    const ids = data.rows.map((r) => r.case_id);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate case_id values inside the file.");
    const { data: existing } = await context.supabase.from("test_cases").select("case_id").in("case_id", ids);
    if (existing?.length) throw new Error(`Already exists: ${existing.map((e: any) => e.case_id).join(", ")}`);
    const { data: nvs } = await context.supabase.from("note_versions").select("note_id,version");
    const known = new Set((nvs ?? []).map((n: any) => `${n.note_id}@${n.version}`));
    const missing = data.rows.filter((r) => !known.has(`${r.note_id}@${r.note_version}`));
    if (missing.length) throw new Error(`Unknown note version for: ${missing.map((m) => m.case_id).join(", ")}`);
    const { error } = await (await writer(context)).from("test_cases").insert(data.rows.map((r) => ({ ...r, candidate_finding: json(r.candidate_finding) })));
    if (error) throw new Error(error.message);
    await audit(context, { event_type: "test_import", failure_reason: `${data.rows.length} cases imported` });
    return { inserted: data.rows.length };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      evaluation_id: z.string().uuid(),
      action: z.enum(["approve_release", "confirm_suppress", "mark_no_flag", "escalate"]),
      rationale: z.string().trim().min(10, "Rationale must be at least 10 characters").max(2000),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin", "reviewer"]);
    assertSyntheticInput(data.rationale);
    const { data: ev } = await context.supabase.from("evaluations").select("*").eq("id", data.evaluation_id).single();
    if (!ev) throw new Error("Evaluation not found");
    if (data.action === "approve_release" && !canApproveRelease(ev.decision, ev.checks as unknown as CheckResult[])) throw new Error("Safety-blocked findings cannot be released by review. Correct the cause and rerun verification.");
    const { error } = await (await writer(context)).from("review_actions").insert({ ...data, reviewer_id: context.userId });
    if (error) throw new Error(error.message);
    if (ev.test_case_id) await (await writer(context)).from("test_cases").update({ review_status: "reviewed" }).eq("case_id", ev.test_case_id);
    return { ok: true };
  });

const RuleInput = z.object({
  rule_id: z.string().trim().regex(/^R-[A-Z0-9-]{2,30}$/, "Format R-XXX-00"),
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(2).max(100),
  check_type: z.enum(["evidence_span", "required_element", "judgment"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  applicability: z.object({ payers: z.array(z.string()).min(1), service_types: z.array(z.string()).min(1) }).nullable(),
  required_pattern: z.string().max(300).nullable().refine((p) => { if (!p) return true; try { new RegExp(p); return true; } catch { return false; } }, "Invalid pattern"),
  source_id: z.string().min(1),
  effective_from: z.string().nullable(),
  effective_to: z.string().nullable(),
  status: z.enum(["active", "draft", "retired"]),
  approved_by: z.string().max(100).nullable(),
});
export const saveRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RuleInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const { data: src } = await context.supabase.from("sources").select("source_id").eq("source_id", data.source_id).maybeSingle();
    if (!src) throw new Error("Source does not exist in the registry.");
    const { data: prev } = await context.supabase.from("rules").select("version").eq("rule_id", data.rule_id).maybeSingle();
    const row = { ...data, version: (prev?.version ?? 0) + 1 };
    assertSyntheticInput(JSON.stringify(row));
    const { error } = prev
      ? await (await writer(context)).from("rules").update(row).eq("rule_id", data.rule_id)
      : await (await writer(context)).from("rules").insert(row);
    if (error) throw new Error(error.message);
    await audit(context, { event_type: prev ? "rule_updated" : "rule_created", rule_id: data.rule_id, failure_reason: `version ${row.version}` });
    return { ok: true };
  });

const SourceInput = z.object({
  source_id: z.string().trim().regex(/^S-[A-Z0-9-]{2,30}$/, "Format S-XXX-00"),
  title: z.string().trim().min(3).max(300),
  issuing_organization: z.string().trim().min(2).max(200),
  source_type: z.enum(["law", "payer_requirement", "internal_policy", "proposed_safeguard"]),
  jurisdiction: z.string().max(100).nullable(),
  payer: z.string().max(100).nullable(),
  service_type: z.string().max(50).nullable(),
  verified_url: z.string().url().nullable(),
  effective_date: z.string().nullable(),
  retrieved_date: z.string().nullable(),
  content_hash: z.string().max(200).nullable(),
  approval_status: z.enum(["approved", "pending", "rejected"]),
  document_version: z.string().trim().min(1).max(30),
  approved_passage: z.string().max(5000).nullable(),
});
export const saveSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SourceInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    assertSyntheticInput(JSON.stringify(data));
    const row = { ...data, passage_hash: await passageHash(data.approved_passage ?? "") };
    const { data: prev } = await context.supabase.from("sources").select("source_id").eq("source_id", data.source_id).maybeSingle();
    const { error } = prev
      ? await (await writer(context)).from("sources").update(row).eq("source_id", data.source_id)
      : await (await writer(context)).from("sources").insert(row);
    if (error) throw new Error(error.message);
    await audit(context, { event_type: prev ? "source_updated" : "source_created", failure_reason: `${data.source_id} → ${data.approval_status}` });
    return { ok: true };
  });

export const addNoteVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ note_id: z.string().min(1), content: z.string().trim().min(10).max(20000) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    assertSyntheticInput(data.content);
    if (!/SYNTHETIC/i.test(data.content)) throw new Error("Note text must be labeled SYNTHETIC. Never enter real patient information.");
    const { data: last } = await context.supabase.from("note_versions").select("version").eq("note_id", data.note_id).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (last?.version ?? 0) + 1;
    const { error } = await (await writer(context)).from("note_versions").insert({ note_id: data.note_id, version, content: data.content });
    if (error) throw new Error(error.message);
    await audit(context, { event_type: "note_version_saved", note_version: version, failure_reason: data.note_id });
    return { version };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ verifier_available: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const { error } = await (await writer(context)).from("app_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    await audit(context, { event_type: "settings_changed", failure_reason: `verifier_available=${data.verifier_available}` });
    return { ok: true };
  });

export const evaluateExternalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExternalEvaluationRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin", "reviewer"]);
    assertSyntheticInput(JSON.stringify(data));
    const reg = await loadRegistry(context);
    const submittedText = data.note_blocks.map((b) => b.text).join("\n");
    const { data: nv, error: noteError } = await context.supabase.from("note_versions").select("content").eq("note_id", data.note_id).eq("version", data.note_version).maybeSingle();
    const { data: profiles } = await context.supabase.from("test_cases").select("payer,service_type").eq("profile_id", data.profile_id ?? "").limit(1);
    const profile = profiles?.[0];
    const noteMatched = !!nv && !noteError && nv.content === submittedText;
    const findings: ValidatedFinding[] = [];
    for (const raw of data.candidate_findings) {
      const o = record(raw);
      const citationBound = typeof o["source_id"] === "string" && data.source_references.includes(o["source_id"]);
      const r = evaluateFinding(raw, {
        noteText: nv?.content ?? "", currentNoteVersion: data.note_version,
        payer: profile?.payer ?? null, serviceType: profile?.service_type ?? null,
        rules: reg.rules, sources: citationBound ? reg.sources : [],
        verifierAvailable: reg.verifierAvailable && noteMatched && data.evaluation_state === "complete", today: today(),
      });
      if (!noteMatched) r.reason_codes = ["NOTE_VERSION_CONTENT_MISMATCH"];
      const cite = r.checks.find((c) => c.key === "citation")?.status === "pass";
      const ruleId = typeof o["rule_id"] === "string" ? o["rule_id"] : null;
      const { error } = await (await writer(context)).from("evaluations").insert({
        note_id: data.note_id, note_version: data.note_version, rule_id: ruleId,
        decision: r.decision, checks: json(r.checks), reason_codes: r.reason_codes,
        safe_revision_prompt: r.safe_revision_prompt, candidate_finding: json(raw),
        model_version: "external-adapter-dry-run", source_bundle_version: reg.source_bundle_version,
        evaluated_by: context.userId, registry_snapshot: json({ rules: reg.rules, sources: reg.sources }),
      });
      if (error) throw new Error("Adapter evaluation could not be saved.");
      findings.push({
        finding_id: typeof o["finding_id"] === "string" ? o["finding_id"] : null,
        rule_id: ruleId,
        evidence_span: r.evidence_range && typeof o["evidence_span"] === "string" ? o["evidence_span"] : null,
        verified_source_id: cite && typeof o["source_id"] === "string" ? o["source_id"] : null,
        guardrail_decision: r.decision, safe_revision_prompt: r.safe_revision_prompt,
        reason_codes: r.reason_codes, next_action: r.next_action,
      });
    }
    await audit(context, { event_type: "adapter_request", note_version: data.note_version, failure_reason: `${data.request_id}: ${findings.length} findings`, model_version: "external-adapter-dry-run", source_bundle_version: reg.source_bundle_version });
    return { request_id: data.request_id, findings };
  });
