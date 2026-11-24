import { describe, expect, it } from "vitest";
import { caseInsert, originalCsv, parseGroup2Csv, sameOriginal, workbookModels, PROVISIONAL } from "@/lib/group2/import";

const rows = parseGroup2Csv(originalCsv);
describe("Original Group 2 import", () => {
  it("preserves all 32 case IDs and original test text", () => {
    expect(rows.map((r) => r.case_id)).toEqual(Array.from({ length: 32 }, (_, i) => `G2-${String(i + 1).padStart(3, "0")}`));
    expect(rows[0]?.synthetic_input).toBe("Start: 09:00; End: [blank]");
    expect(rows[1]?.target_rule_ids).toBe("RBT-005;RBT-031");
  });
  it("keeps original expected decisions unchanged", () => {
    expect(rows.map((r) => r.expected_guardrail_decision)).toEqual(["RELEASE_FLAG","RELEASE_FLAG","ABSTAIN","RELEASE_FLAG","RELEASE_FLAG","RELEASE_FLAG","RELEASE_FLAG","RELEASE_FLAG","REVIEW_REQUIRED","ABSTAIN","REVIEW_REQUIRED","ABSTAIN","SUPPRESS","SUPPRESS","SUPPRESS","NO_FLAG","SUPPRESS","RELEASE_FLAG","PARTIAL_UNAVAILABLE","ABSTAIN","SUPPRESS","SUPPRESS","SUPPRESS","NO_FLAG","REVIEW_REQUIRED","ABSTAIN","SUPPRESS","SUPPRESS","SUPPRESS","SUPPRESS","SUPPRESS","SUPPRESS"]);
  });
  it("initializes all imported cases Not Run and provisional without actual results", () => {
    for (const row of rows) expect(caseInsert(row)).toMatchObject({ execution_status: "not_executed", actual_decision: null, review_status: "Provisional — Clinical Review Required", candidate_finding: {} });
    expect(PROVISIONAL).toBe("Provisional — Clinical Review Required");
  });
  it("keeps four distinct workbook models with all original rows", () => {
    const models = workbookModels();
    expect(models.rules).toHaveLength(40); expect(models.fields).toHaveLength(20); expect(models.decisions).toHaveLength(6); expect(models.acceptance).toHaveLength(8);
    expect(models.rules[0]?.rule_id).toBe("RBT-001");
    expect(models.acceptance.find((r) => r.test_id === "A08")).toMatchObject({ review_status: "Not measured", execution_status: "not_executed" });
  });
  it("recognizes exact reimports and rejects conflicts without overwriting results", () => {
    const first = rows[0]; if (!first) throw new Error("Missing fixture");
    expect(sameOriginal({ ...first }, first)).toBe(true);
    expect(sameOriginal({ ...first, expected_guardrail_decision: "NO_FLAG" }, first)).toBe(false);
    expect(sameOriginal({ ...first, synthetic_input: "Changed" }, first)).toBe(false);
  });
  it("rejects duplicates and unknown rule IDs with clear row errors", () => {
    expect(() => parseGroup2Csv(originalCsv + originalCsv.split("\n")[1] + "\n")).toThrow("duplicate case ID G2-001");
    expect(() => parseGroup2Csv(originalCsv.replace("RBT-004;RBT-005", "RBT-999"))).toThrow("CSV row 2: unknown target_rule_ids");
  });
  it("rejects imported results instead of treating them as measured passes", () => {
    expect(() => parseGroup2Csv(originalCsv.replace("Not run", "pass"))).toThrow("execution_status");
    expect(() => parseGroup2Csv(originalCsv.replace("Not run,,", "Not run,RELEASE_FLAG,"))).toThrow("actual_decision");
  });
});