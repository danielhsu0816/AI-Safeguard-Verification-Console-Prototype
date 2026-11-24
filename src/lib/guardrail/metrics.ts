import { DECISIONS } from "./types";
import type { Tables } from "@/integrations/supabase/types";

export interface MetricFilters { from: string; to: string; decision: string; category: string; profile: string; status: string }
export const ALL_FILTER = "__all";
export function measureDashboard(cases: Tables<"test_cases">[], evaluations: Tables<"evaluations">[], rules: Tables<"rules">[], reviews: Tables<"review_actions">[], filters: MetricFilters) {
  const ruleMap = new Map(rules.map((r) => [r.rule_id, r]));
  const selectedCases = cases.filter((c) =>
    (filters.profile === ALL_FILTER || c.profile_id === filters.profile)
    && (filters.status === ALL_FILTER || c.execution_status === filters.status)
    && (filters.category === ALL_FILTER || c.target_rule_ids.some((id) => ruleMap.get(id)?.category === filters.category)));
  const caseMap = new Map(selectedCases.map((c) => [c.case_id, c]));
  const filtered = evaluations.filter((e) =>
    (!filters.from || e.created_at.slice(0, 10) >= filters.from)
    && (!filters.to || e.created_at.slice(0, 10) <= filters.to)
    && (filters.decision === ALL_FILTER || e.decision === filters.decision)
    && (filters.category === ALL_FILTER || ruleMap.get(e.rule_id ?? "")?.category === filters.category)
    && (!e.test_case_id || caseMap.has(e.test_case_id))
    && (e.test_case_id !== null || filters.profile === ALL_FILTER && filters.status === ALL_FILTER));
  const latest = new Map<string, Tables<"evaluations">>();
  for (const e of [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const k = e.test_case_id ?? e.id;
    if (!latest.has(k)) latest.set(k, e);
  }
  const executed = [...latest.values()].filter((e) => {
    if (!e.test_case_id || !caseMap.has(e.test_case_id)) return false;
    const trace = e.execution_trace as unknown as { assessable?: boolean } | undefined;
    return e.execution_kind !== "external_model_unavailable" && trace?.assessable !== false && caseMap.get(e.test_case_id)?.execution_status !== "not_executed";
  });
  const passed = executed.filter((e) => e.decision === (e.expected_decision_snapshot ?? caseMap.get(e.test_case_id ?? "")?.expected_guardrail_decision)).length;
  const closed = new Set(reviews.filter((r) => r.action !== "escalate").map((r) => r.evaluation_id));
  const awaiting = [...latest.values()].filter((e) => ["REVIEW_REQUIRED", "ABSTAIN", "PARTIAL_UNAVAILABLE"].includes(e.decision) && !closed.has(e.id)).length;
  const counts = Object.fromEntries(DECISIONS.map((d) => [d, filtered.filter((e) => e.decision === d).length]));
  return { filtered, counts, awaiting, executed: executed.length, total: selectedCases.length, passed, measured: evaluations.length > 0 };
}