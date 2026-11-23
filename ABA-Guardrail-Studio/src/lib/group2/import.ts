import Papa from "papaparse";
import { z } from "zod";
import source from "./source.json";
import { DECISIONS } from "../guardrail/types";
import { assertSyntheticInput } from "../guardrail/privacy";

export const BUNDLE = source.version;
export const PROVISIONAL = "Provisional — Clinical Review Required";
export const OriginalCaseSchema = z.object({
  case_id: z.string().regex(/^G2-[A-Za-z0-9_-]{1,30}$/),
  title: z.string().min(1).max(200),
  target_rule_ids: z.string().min(1).max(500),
  failure_mode: z.string().min(1).max(100),
  synthetic_input: z.string().min(1).max(2000),
  expected_guardrail_decision: z.enum(DECISIONS),
  expected_safe_feedback: z.string().max(2000),
  forbidden_output: z.string().max(2000),
  evidence_check: z.string().max(500),
  proposed_priority: z.enum(["none", "low", "medium", "high", "critical"]),
  execution_status: z.literal("Not run"),
  actual_decision: z.literal(""),
  review_status: z.literal("Provisional - needs BCBA review"),
}).strict();
export type OriginalCase = z.infer<typeof OriginalCaseSchema>;
export const originalRules = source.sheets.Rule_Map.map((r) => r.Group1_rule_id);

export function validateOriginalCases(raw: unknown[]): OriginalCase[] {
  const seen = new Set<string>();
  return raw.map((value, i) => {
    const parsed = OriginalCaseSchema.safeParse(value);
    if (!parsed.success) throw new Error(`CSV row ${i + 2}: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`);
    const row = parsed.data;
    if (seen.has(row.case_id)) throw new Error(`CSV row ${i + 2}: duplicate case ID ${row.case_id}.`);
    seen.add(row.case_id);
    const ids = row.target_rule_ids.split(";");
    if (ids.some((id) => id !== "RBT-ALL" && !originalRules.includes(id))) throw new Error(`CSV row ${i + 2}: unknown target_rule_ids; preserve the registered RBT IDs.`);
    if (new Set(ids).size !== ids.length) throw new Error(`CSV row ${i + 2}: repeated target rule ID.`);
    assertSyntheticInput(JSON.stringify(row));
    return row;
  });
}

export function parseGroup2Csv(text: string): OriginalCase[] {
  if (text.length > 2_000_000) throw new Error("CSV exceeds the 2 MB limit.");
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length) throw new Error(`CSV format: ${parsed.errors.map((e) => `row ${(e.row ?? 0) + 2}: ${e.message}`).join("; ")}`);
  if (!parsed.data.length || parsed.data.length > 500) throw new Error("CSV must contain 1–500 cases.");
  return validateOriginalCases(parsed.data);
}

export function sameOriginal(a: unknown, b: OriginalCase): boolean {
  const parsed = OriginalCaseSchema.safeParse(a);
  return parsed.success && Object.keys(b).every((key) => parsed.data[key as keyof OriginalCase] === b[key as keyof OriginalCase]);
}

export function caseInsert(row: OriginalCase) {
  return {
    case_id: row.case_id, title: row.title, target_rule_ids: row.target_rule_ids.split(";"),
    failure_mode: row.failure_mode, synthetic_input: row.synthetic_input,
    expected_guardrail_decision: row.expected_guardrail_decision,
    expected_safe_feedback: row.expected_safe_feedback, forbidden_output: row.forbidden_output,
    evidence_check: row.evidence_check, proposed_priority: row.proposed_priority,
    execution_status: "not_executed", review_status: PROVISIONAL, actual_decision: null,
    candidate_finding: {}, import_bundle: BUNDLE, original_record: row,
  };
}

export function workbookModels() {
  return {
    rules: source.sheets.Rule_Map.map((r) => ({ rule_id: r.Group1_rule_id, original_wording: r["Original Group 1 wording"], method: r["Method [G1]"], default_priority: r["Default priority [G1]"], validation_boundary: r["Group2 UX / validation boundary"], original_record: r })),
    fields: source.sheets.Group1_Interface.map((r, i) => ({ field_key: `G1-${String(i + 1).padStart(2, "0")}`, layer: r.Layer, field_name: r.Field, type_values: r["Type / values"], group2_use: r["Group 2 use"], position: i, original_record: r })),
    decisions: source.sheets.Decision_Map.map((r) => ({ decision: r.Decision, ui_label: r["UI label"], show_explanation: r["Show AI explanation"], next_action: r["Next action"], group3_processing: r["Group3 processing"], original_record: r })),
    acceptance: source.sheets.Acceptance_Tests.map((r) => ({ test_id: r["Test ID"], criterion: r["Acceptance criterion"], expected: r.Expected, owner: r.Owner, review_status: r["Review status"], execution_status: "not_executed", original_record: r })),
  };
}

export const originalCsv = source.csv;