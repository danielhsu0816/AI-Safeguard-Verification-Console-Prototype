import { expect, it } from "vitest";
import { canApproveRelease } from "@/lib/guardrail/review-policy";
import { assertSyntheticInput } from "@/lib/guardrail/privacy";
import type { CheckResult } from "@/lib/guardrail/types";
const checks = ["rule", "version", "applicable", "evidence", "citation", "privacy"].map((key) => ({ key, status: "pass", label: "", detail: "" })) as CheckResult[];
it("permits review release only when all grounding and applicability checks passed", () => {
  expect(canApproveRelease("REVIEW_REQUIRED", checks)).toBe(true);
  expect(canApproveRelease("REVIEW_REQUIRED", checks.filter((c) => c.key !== "citation"))).toBe(false);
});
it("never lets review override suppressed, unknown-applicability or unavailable findings", () => {
  for (const decision of ["SUPPRESS", "ABSTAIN", "PARTIAL_UNAVAILABLE"]) expect(canApproveRelease(decision, checks)).toBe(false);
});
it("rejects personal identifiers at persistence boundaries", () => {
  expect(() => assertSyntheticInput("DOB: 2001-01-01")).toThrow();
  expect(() => assertSyntheticInput("SYNTHETIC: Client Fox, 12 of 20 opportunities")).not.toThrow();
});