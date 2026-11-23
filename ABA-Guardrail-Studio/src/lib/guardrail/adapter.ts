import { z } from "zod";

// Contract for a future external evaluator (e.g. a model-based RAG evaluator).
// The prototype never calls a live model: candidate findings come from synthetic fixtures
// or from requests posted to the adapter, and are always treated as untrusted.
export const ExternalEvaluationRequestSchema = z.object({
  request_id: z.string().min(1).max(100),
  note_id: z.string().min(1).max(100),
  note_version: z.number().int().positive(),
  rubric_version: z.string().min(1).max(50),
  note_blocks: z.array(z.object({ block_id: z.string(), text: z.string().max(20000) })).min(1).max(100),
  profile_id: z.string().max(100).nullable(),
  payer: z.string().max(100).nullable().optional(),
  service_type: z.string().max(50).nullable().optional(),
  candidate_findings: z.array(z.unknown()).max(100),
  source_references: z.array(z.string()).max(100),
  evaluation_state: z.enum(["complete", "partial", "model_unavailable"]),
});
export type ExternalEvaluationRequest = z.infer<typeof ExternalEvaluationRequestSchema>;

export interface ValidatedFinding {
  finding_id: string | null;
  rule_id: string | null;
  evidence_span: string | null;
  verified_source_id: string | null;
  guardrail_decision: string;
  safe_revision_prompt: string | null;
  reason_codes: string[];
  next_action: string;
}

export interface ExternalEvaluator {
  readonly name: string;
  readonly enabled: boolean;
  evaluate(req: ExternalEvaluationRequest): Promise<unknown[]>;
}

/** Placeholder: production clinical integration is intentionally disabled in this prototype. */
export const disabledExternalEvaluator: ExternalEvaluator = {
  name: "External evaluator (not connected)",
  enabled: false,
  async evaluate() {
    throw new Error("External evaluator is disabled in this research prototype.");
  },
};

export const SAMPLE_ADAPTER_REQUEST: ExternalEvaluationRequest = {
  request_id: "REQ-DEMO-001",
  note_id: "N-001",
  note_version: 1,
  rubric_version: "rubric-0.3-provisional",
  note_blocks: [
    { block_id: "b1", text: "SYNTHETIC NOTE — NOT A REAL PATIENT\nSession date: 2026-03-02. Start 09:00, end 11:00. Service: 97153.\nRendering provider: Synthetic RBT A.\nTarget: manding with vocal approximations.\nClient independently manded 12 of 20 opportunities (60%).\nPrompting faded from model prompts to gestural prompts.\nBehavior: 2 instances of elopement recorded with ABC data (antecedent: transition request).\nCaregiver present for the last 15 minutes." },
  ],
  profile_id: "PROF-A-97153",
  payer: "Synthetic Payer A",
  service_type: "97153",
  candidate_findings: [
    { finding_id: "X-1", finding_type: "issue", rule_id: "R-SIG-01", note_version: 1, evidence_span: null, explanation: "No provider signature is present.", severity: "high", source_id: "S-PAY-A-01" },
    { finding_id: "X-2", finding_type: "issue", rule_id: "R-DATA-01", note_version: 1, evidence_span: "Client completed 9 of 10 matching trials.", explanation: "Accuracy is 90%.", severity: "medium", source_id: "S-INT-01" },
  ],
  source_references: ["S-PAY-A-01", "S-INT-01"],
  evaluation_state: "complete",
};
