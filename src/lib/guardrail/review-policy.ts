import type { CheckResult } from "./types";

export function canApproveRelease(decision: string, checks: CheckResult[]): boolean {
  return ["RELEASE_FLAG", "REVIEW_REQUIRED"].includes(decision)
    && ["rule", "version", "applicable", "evidence", "citation", "privacy"].every((key) => checks.some((c) => c.key === key && c.status === "pass"));
}