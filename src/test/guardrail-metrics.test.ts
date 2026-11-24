import { expect, it } from "vitest";
import { ALL_FILTER, measureDashboard } from "@/lib/guardrail/metrics";
import type { Tables } from "@/integrations/supabase/types";
const filters = { from: "", to: "", decision: ALL_FILTER, category: ALL_FILTER, profile: ALL_FILTER, status: ALL_FILTER };
const cases = [{ case_id: "TC-1", profile_id: "P", execution_status: "pass", target_rule_ids: ["R"], expected_guardrail_decision: "REVIEW_REQUIRED" }] as Tables<"test_cases">[];
const rules = [{ rule_id: "R", category: "Documentation" }] as Tables<"rules">[];
const evaluations = [{ id: "E", test_case_id: "TC-1", rule_id: "R", decision: "REVIEW_REQUIRED", created_at: "2026-11-23T00:00:00Z" }] as Tables<"evaluations">[];
it("does not fabricate measured performance before a stored run exists", () => {
  expect(measureDashboard(cases, [], rules, [], filters)).toMatchObject({ measured: false, executed: 0, passed: 0 });
});
it("excludes unavailable Group 2 executions even when expected decision matches", () => {
  const unavailable = [{ ...evaluations[0], id: "U", test_case_id: "TC-1", decision: "REVIEW_REQUIRED", created_at: "2026-11-23T00:00:00Z", execution_kind: "external_model_unavailable", execution_trace: { assessable: false } }] as Tables<"evaluations">[];
  expect(measureDashboard(cases, unavailable, rules, [], filters)).toMatchObject({ executed: 0, passed: 0 });
});
it("uses stored expected-vs-actual decisions for execution pass rate", () => {
  expect(measureDashboard(cases, evaluations, rules, [], filters)).toMatchObject({ measured: true, executed: 1, passed: 1 });
});
it("removes reviewed findings from awaiting human review", () => {
  const reviews = [{ evaluation_id: "E", action: "confirm_suppress" }] as Tables<"review_actions">[];
  expect(measureDashboard(cases, evaluations, rules, reviews, filters).awaiting).toBe(0);
  expect(measureDashboard(cases, evaluations, rules, [], filters).awaiting).toBe(1);
});
it("applies date, category, decision and source profile filters to measured runs", () => {
  expect(measureDashboard(cases, evaluations, rules, [], { ...filters, from: "2026-11-24" }).executed).toBe(0);
  expect(measureDashboard(cases, evaluations, rules, [], { ...filters, category: "Other" }).filtered).toHaveLength(0);
  expect(measureDashboard(cases, evaluations, rules, [], { ...filters, profile: "Other" }).filtered).toHaveLength(0);
  expect(measureDashboard(cases, evaluations, rules, [], { ...filters, decision: "SUPPRESS" }).filtered).toHaveLength(0);
});