import { expect, it } from "vitest";
import { executeFixture, compareExpected, deterministicChecks, simulateCandidate, verifySimulatedCandidate } from "@/lib/group2/runner";
import { originalCsv, originalRules, parseGroup2Csv } from "@/lib/group2/import";
const originals = parseGroup2Csv(originalCsv);
const fixture = (id: string) => {
  const row = originals.find((r) => r.case_id === id); if (!row) throw new Error(id);
  return { synthetic_input: row.synthetic_input, target_rule_ids: row.target_rule_ids.split(";") };
};
it("executes missing end-time rule without inventing an ending", () => {
  const result = executeFixture(fixture("G2-001"), originalRules);
  expect(result).toMatchObject({ decision: "RELEASE_FLAG", trace: { kind: "deterministic_rule", simulation: null } });
  expect(result.trace.deterministic[0]).toMatchObject({ rule_id: "RBT-004", status: "issue" });
});
it("actually calculates 60 minutes and compares with recorded 120", () => {
  const result = executeFixture(fixture("G2-002"), originalRules);
  expect(result.decision).toBe("RELEASE_FLAG");
  expect(result.trace.deterministic[0]?.detail).toContain("Calculated 60 minutes");
  const corrected = deterministicChecks({ synthetic_input: "Start 10:00; End 11:00; duration 60 minutes", target_rule_ids: ["RBT-005"] });
  expect(corrected[0]?.status).toBe("clear");
});
it("never obtains actual decisions from expected decisions or case IDs", () => {
  const input = fixture("G2-002"); const result = executeFixture(input, originalRules);
  expect(compareExpected(result.decision, "NO_FLAG", result.trace)).toBe("fail");
  expect(compareExpected(result.decision, "RELEASE_FLAG", result.trace)).toBe("pass");
});
it("distinguishes simulation from deterministic execution and rejects an unsupported rewrite", () => {
  const result = executeFixture(fixture("G2-014"), originalRules);
  expect(result).toMatchObject({ decision: "SUPPRESS", trace: { kind: "simulated_candidate" } });
  expect(result.trace.simulation?.candidate["claimed_text"]).toBe("client independently completed transitions.");
});
it("checks actual candidate changes independently rather than mapping failure labels to decisions", () => {
  const input = fixture("G2-014"); const candidate = simulateCandidate(input);
  expect(verifySimulatedCandidate(candidate, input, originalRules).decision).toBe("SUPPRESS");
  expect(verifySimulatedCandidate({ ...candidate, claimed_text: null }, input, originalRules).decision).toBe("REVIEW_REQUIRED");
});
it("calculates 4/6 and rejects the proposed 90 percent", () => {
  expect(executeFixture(fixture("G2-021"), originalRules).reason).toBe("MEASUREMENT_SUBSTITUTION");
});
it("does not mark unavailable external-model execution passed even when expected matches", () => {
  const result = executeFixture(fixture("G2-019"), originalRules, "external_model");
  expect(result.trace.kind).toBe("external_model_unavailable");
  expect(compareExpected(result.decision, "PARTIAL_UNAVAILABLE", result.trace)).toBe("unavailable");
});
it("does not infer semantic adequacy for original Claude-owned negative control", () => {
  const result = executeFixture(fixture("G2-016"), originalRules);
  expect(result.decision).toBe("REVIEW_REQUIRED");
  expect(compareExpected(result.decision, "NO_FLAG", result.trace)).toBe("fail");
});
it("reports unsupported deterministic predicates as unavailable, not a pass", () => {
  const result = executeFixture(fixture("G2-018"), originalRules, "deterministic_rule");
  expect(result.decision).toBe("PARTIAL_UNAVAILABLE");
  expect(result.trace.assessable).toBe(false);
});
it("blocks malformed response, unknown IDs, stale approval and injection simulations", () => {
  for (const id of ["G2-022", "G2-023", "G2-031", "G2-015"]) expect(executeFixture(fixture(id), originalRules).decision).toBe("SUPPRESS");
});