import { z } from "zod";

export const DECISIONS = [
  "RELEASE_FLAG",
  "NO_FLAG",
  "SUPPRESS",
  "ABSTAIN",
  "REVIEW_REQUIRED",
  "PARTIAL_UNAVAILABLE",
] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_INFO: Record<Decision, { label: string; description: string; tone: "success" | "warning" | "critical" | "neutral" | "primary" }> = {
  RELEASE_FLAG: { label: "Release flag", description: "Supported finding that may be shown with verified evidence.", tone: "success" },
  NO_FLAG: { label: "No flag", description: "No issue detected for the specifically tested rule.", tone: "neutral" },
  SUPPRESS: { label: "Suppress", description: "Unsupported, fabricated, malformed or stale content is withheld.", tone: "critical" },
  ABSTAIN: { label: "Abstain", description: "Insufficient evidence or unknown rule applicability.", tone: "warning" },
  REVIEW_REQUIRED: { label: "Review required", description: "Authorized human judgment is needed.", tone: "primary" },
  PARTIAL_UNAVAILABLE: { label: "Partial / unavailable", description: "Model or verification service is unavailable. Failed closed.", tone: "warning" },
};

export const CandidateFindingSchema = z.object({
  finding_id: z.string().min(1),
  finding_type: z.enum(["issue", "no_issue"]),
  rule_id: z.string().min(1),
  note_version: z.number().int().positive(),
  evidence_span: z.string().min(1).nullable(),
  explanation: z.string().min(1).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]),
  source_id: z.string().min(1),
});
export type CandidateFinding = z.infer<typeof CandidateFindingSchema>;

export interface Applicability {
  payers?: string[];
  service_types?: string[];
}

export interface RuleRecord {
  rule_id: string;
  title: string;
  category: string;
  check_type: "evidence_span" | "required_element" | "judgment";
  severity: string;
  applicability: Applicability | null;
  required_pattern: string | null;
  source_id: string | null;
  effective_from: string | null;
  effective_to: string | null;
  status: "active" | "draft" | "retired";
}

export interface SourceRecord {
  source_id: string;
  title: string;
  source_type: "law" | "payer_requirement" | "internal_policy" | "proposed_safeguard";
  approval_status: "approved" | "pending" | "rejected";
  approved_passage: string | null;
  document_version: string;
  authenticity_verified?: boolean;
  effective_date?: string | null;
  payer?: string | null;
  service_type?: string | null;
}

export interface EvaluationContext {
  noteText: string;
  currentNoteVersion: number;
  payer: string | null;
  serviceType: string | null;
  rules: RuleRecord[];
  sources: SourceRecord[];
  verifierAvailable: boolean;
  today: string; // YYYY-MM-DD
}

export const CHECK_KEYS = [
  "schema",
  "rule",
  "version",
  "applicable",
  "evidence",
  "citation",
  "numbers",
  "clinical",
  "authority",
  "injection",
  "privacy",
] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

export const CHECK_LABELS: Record<CheckKey, string> = {
  schema: "Schema valid",
  rule: "Registered rule ID",
  version: "Correct note version",
  applicable: "Rule applicable",
  evidence: "Evidence present and matched",
  citation: "Citation exists in approved registry",
  numbers: "Numerical claims supported",
  clinical: "No unsupported clinical facts",
  authority: "No authority overreach",
  injection: "No prompt-injection compliance",
  privacy: "No suspected personal identifiers",
};

export type CheckStatus = "pass" | "fail" | "warn" | "skipped" | "unavailable";
export interface CheckResult {
  key: CheckKey;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface EngineResult {
  decision: Decision;
  checks: CheckResult[];
  reason_codes: string[];
  safe_revision_prompt: string | null;
  next_action: string;
  evidence_range: { start: number; end: number } | null;
}
