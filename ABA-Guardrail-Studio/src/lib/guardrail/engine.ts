import {
  CHECK_KEYS,
  CHECK_LABELS,
  CandidateFindingSchema,
  type CheckKey,
  type CheckResult,
  type CheckStatus,
  type Decision,
  type EngineResult,
  type EvaluationContext,
} from "./types";
import { hasSensitiveIdentifiers } from "./privacy";

// Deterministic checks only. Keyword overlap, similarity or valid JSON alone never count as support.
const CLINICAL_TERMS = [
  "diagnosis", "diagnosed", "seizure", "epilepsy", "medication", "medicated", "adhd", "anxiety",
  "depression", "injury", "injured", "hospital", "self-injury", "aggression", "elopement", "pica",
  "tantrum", "regression", "allergy", "sleep disorder", "level 3", "level 2", "level 1",
];
const AUTHORITY_PATTERN =
  /\b(denied|deny|denial|fraud\w*|terminat\w*|diagnos\w*|billing (is )?approved|approved for payment|claim (will|should|must) be|not medically necessary|must be reported|legal(ly)? (liable|violation)|unlawful)\b/i;
const INJECTION_PATTERN =
  /(ignore (all |any |the )?(previous |prior |above )?instructions|system note:|disregard (the )?(rubric|rules)|mark this note (as )?(fully )?compliant|you are now)/i;
const COMPLIANCE_MARKERS = /(as instructed|per the (system )?note|fully compliant|ignore (previous|prior) instructions)/i;
const ID_TOKENS = /\b[A-Z]{1,4}(-[A-Z0-9]+)+\b/g;

const NEXT_ACTION: Record<Decision, string> = {
  RELEASE_FLAG: "Display the finding with its verified evidence and approved citation.",
  NO_FLAG: "Nothing to display for this rule. This is not a statement of overall compliance.",
  SUPPRESS: "Withhold the finding. Log the reason codes for evaluator improvement.",
  ABSTAIN: "Do not display. Clarify rule applicability or gather evidence, then re-run.",
  REVIEW_REQUIRED: "Route to an authorized reviewer before anything is displayed.",
  PARTIAL_UNAVAILABLE: "Fail closed. Retry once the verification service is available.",
};

function numberPresent(n: string, text: string) {
  const esc = n.replace(".", "\\.");
  return new RegExp(`(?<![\\d.])${esc}(?![\\d]|\\.\\d)`).test(text);
}

export function evaluateFinding(raw: unknown, ctx: EvaluationContext): EngineResult {
  const checks = new Map<CheckKey, CheckResult>();
  const set = (key: CheckKey, status: CheckStatus, detail: string) =>
    checks.set(key, { key, label: CHECK_LABELS[key], status, detail });
  for (const k of CHECK_KEYS) set(k, "skipped", "Not evaluated.");
  const list = () => CHECK_KEYS.flatMap((k) => { const c = checks.get(k); return c ? [c] : []; });
  const finish = (decision: Decision, reasons: string[], prompt: string | null, range: EngineResult["evidence_range"]): EngineResult => ({
    decision,
    checks: list(),
    reason_codes: reasons,
    safe_revision_prompt: decision === "RELEASE_FLAG" || decision === "REVIEW_REQUIRED" ? prompt : null,
    next_action: NEXT_ACTION[decision],
    evidence_range: range,
  });

  if (!ctx.verifierAvailable) {
    for (const k of CHECK_KEYS) set(k, "unavailable", "Verification service unavailable — failed closed.");
    return finish("PARTIAL_UNAVAILABLE", ["VERIFIER_UNAVAILABLE"], null, null);
  }

  const parsed = CandidateFindingSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    set("schema", "fail", `Malformed candidate finding — ${issues}`);
    return finish("SUPPRESS", ["MALFORMED_OUTPUT"], null, null);
  }
  set("schema", "pass", "All required fields present with valid types.");
  const f = parsed.data;
  const note = ctx.noteText;
  const noteLower = note.toLowerCase();
  const privacyRisk = hasSensitiveIdentifiers(note) || hasSensitiveIdentifiers(JSON.stringify(f));
  set("privacy", privacyRisk ? "fail" : "pass", privacyRisk ? "Potential personal identifiers detected — withheld." : "No identifiers detected by the conservative prototype screen; this is not a de-identification guarantee.");

  // Rule registration
  const rule = ctx.rules.find((r) => r.rule_id === f.rule_id);
  let ruleOk = false;
  if (!rule) set("rule", "fail", `${f.rule_id} is not in the rule registry.`);
  else if (rule.status !== "active") set("rule", "fail", `${f.rule_id} is ${rule.status}, not active.`);
  else if ((rule.effective_from && rule.effective_from > ctx.today) || (rule.effective_to && rule.effective_to < ctx.today))
    set("rule", "fail", `${f.rule_id} is outside its effective window.`);
  else {
    ruleOk = true;
    set("rule", "pass", `${rule.rule_id} v-active: ${rule.title}`);
  }

  // Version
  const versionOk = f.note_version === ctx.currentNoteVersion;
  set("version", versionOk ? "pass" : "fail",
    versionOk ? `Finding targets current version v${ctx.currentNoteVersion}.` : `Finding targets v${f.note_version}; current note is v${ctx.currentNoteVersion} (stale).`);

  // Citation
  const source = ctx.sources.find((s) => s.source_id === f.source_id);
  let citationOk = false;
  if (!source) set("citation", "fail", `${f.source_id} does not exist in the source registry.`);
  else if (source.approval_status !== "approved") set("citation", "fail", `${f.source_id} is ${source.approval_status}, not approved.`);
  else if (source.authenticity_verified !== true) set("citation", "fail", "Approved source passage integrity could not be verified.");
  else if (source.effective_date && source.effective_date > ctx.today) set("citation", "fail", "Source is not yet effective.");
  else if (rule && rule.source_id !== f.source_id) set("citation", "fail", `${f.rule_id} is governed by ${rule.source_id}, not ${f.source_id}.`);
  else {
    citationOk = true;
    set("citation", "pass", `${source.source_id} (${source.source_type.replace("_", " ")}, v${source.document_version}) approved.`);
  }

  // Applicability
  let applicability: "yes" | "no" | "unknown" = "unknown";
  if (rule && ruleOk) {
    const a = rule.applicability;
    if (!a || !a.payers?.length || !a.service_types?.length) {
      set("applicable", "warn", "Rule applicability is not defined in the registry.");
    } else if (!ctx.payer || !ctx.serviceType) {
      set("applicable", "warn", "Source profile (payer / service type) is unknown.");
    } else {
      const payerOk = a.payers.includes("*") || a.payers.includes(ctx.payer);
      const svcOk = a.service_types.includes("*") || a.service_types.includes(ctx.serviceType);
      const sourceOk = (!source?.payer || source.payer === ctx.payer) && (!source?.service_type || source.service_type === ctx.serviceType);
      applicability = payerOk && svcOk && sourceOk ? "yes" : "no";
      set("applicable", applicability === "yes" ? "pass" : "fail",
        applicability === "yes" ? `Applies to ${ctx.payer} / ${ctx.serviceType}.` : `Does not apply to ${ctx.payer} / ${ctx.serviceType}.`);
    }
  }

  // Evidence
  let range: EngineResult["evidence_range"] = null;
  let evidence: "ok" | "fabricated" | "missing" | "missed_issue" | "contradicted" = "ok";
  if (f.evidence_span) {
    const idx = note.indexOf(f.evidence_span);
    if (idx < 0) evidence = "fabricated";
    else range = { start: idx, end: idx + f.evidence_span.length };
  }
  if (rule && ruleOk && applicability === "yes" && rule.check_type === "required_element" && rule.required_pattern) {
    let present = false;
    // Only these bounded, audited predicates are executable. Arbitrary registry regexes never run.
    if (rule.required_pattern === "Signature:\\s*\\S") present = /^Signature:\s*\S+/im.test(note);
    else if (rule.required_pattern === "start\\s+\\d{1,2}:\\d{2}.*end\\s+\\d{1,2}:\\d{2}") present = /\bstart\s+(?:[01]?\d|2[0-3]):[0-5]\d[^\n]{0,200}\bend\s+(?:[01]?\d|2[0-3]):[0-5]\d/i.test(note);
    else {
      set("evidence", "unavailable", "No audited deterministic predicate is available for this rule.");
      return finish("PARTIAL_UNAVAILABLE", ["UNSUPPORTED_PREDICATE"], null, range);
    }
    if (evidence === "fabricated") set("evidence", "fail", "Quoted span does not appear verbatim in the note.");
    else if (f.finding_type === "issue") {
      if (present) { evidence = "contradicted"; set("evidence", "fail", "Required element IS present — finding contradicted by the note."); }
      else set("evidence", "pass", "Required element verified absent by deterministic pattern check.");
    } else {
      if (!present) { evidence = "missed_issue"; set("evidence", "fail", "Model reported no issue, but the required element is absent."); }
      else set("evidence", "pass", "Required element verified present.");
    }
  } else if (evidence === "fabricated") {
    set("evidence", "fail", "Quoted span does not appear verbatim in the note.");
  } else if (f.finding_type === "issue" && !f.evidence_span) {
    evidence = "missing";
    set("evidence", "fail", "Issue finding has no evidence span.");
  } else {
    set("evidence", range ? "pass" : "warn", range ? `Exact match at characters ${range.start}–${range.end}. Quote matching alone does not validate the explanation.` : "No grounded span or deterministic predicate supports this finding.");
  }

  // Numbers
  const corpus = `${note}\n${source?.approved_passage ?? ""}`;
  const nums = (f.explanation.replace(ID_TOKENS, " ").match(/\d+(?:\.\d+)?/g) ?? []);
  const unsupportedNums = [...new Set(nums.filter((n) => !numberPresent(n, corpus)))];
  set("numbers", unsupportedNums.length ? "fail" : "pass",
    unsupportedNums.length ? `Not found in note or source: ${unsupportedNums.join(", ")}` : nums.length ? `All numbers (${[...new Set(nums)].join(", ")}) appear in the note or source.` : "No numerical claims.");

  // Clinical facts
  const expLower = f.explanation.toLowerCase();
  const unsupportedTerms = CLINICAL_TERMS.filter((t) => expLower.includes(t) && !noteLower.includes(t));
  const deterministic = rule?.check_type === "required_element" && evidence === "ok";
  const factualTextVerified = note.includes(f.explanation) || deterministic && /^(?:The note does not include the rendering provider signature\.|No provider signature is present\.|Signature missing\.|A provider signature is present\.|Session start and end times are not documented\.|No service modifier is documented\.)$/i.test(f.explanation);
  set("clinical", unsupportedTerms.length ? "fail" : factualTextVerified ? "pass" : "warn",
    unsupportedTerms.length ? `Clinical terms not in the note: ${unsupportedTerms.join(", ")}` : factualTextVerified ? "Explanation supported by an exact passage or audited required-element predicate." : "Factual support cannot be established for unrestricted prose. Human review required; absence of keywords is not proof.");

  // Authority
  const overreach = f.explanation.match(AUTHORITY_PATTERN);
  set("authority", overreach ? "fail" : "pass",
    overreach ? `Billing/legal/diagnostic conclusion language: “${overreach[0]}”` : "No billing, legal or diagnostic conclusions.");

  // Prompt injection
  const injected = INJECTION_PATTERN.test(note);
  const complied = injected && (f.finding_type === "no_issue" || COMPLIANCE_MARKERS.test(f.explanation));
  if (complied) set("injection", "fail", "Note contains an embedded instruction and the finding follows it.");
  else if (injected) set("injection", "warn", "Embedded instruction detected in note; finding did not follow it.");
  else set("injection", "pass", "No embedded instructions detected.");

  // Decision — strict priority, fail closed.
  const prompt = rule
    ? rule.check_type === "required_element"
      ? `${rule.title}: this element was not found in the note. If it was completed at the time of service, add it. Do not add information that was not observed or recorded.`
      : `${rule.title}: review the highlighted text against the cited source. Do not add observations, times, data or outcomes that were not recorded.`
    : null;

  if (!ruleOk) return finish("SUPPRESS", [rule ? "RULE_INACTIVE" : "UNREGISTERED_RULE"], null, range);
  if (privacyRisk) return finish("SUPPRESS", ["PRIVACY_RISK"], null, null);
  if (!versionOk) return finish("SUPPRESS", ["STALE_NOTE_VERSION"], null, range);
  if (!citationOk) return finish("SUPPRESS", ["UNVERIFIED_CITATION"], null, range);
  if (complied) return finish("SUPPRESS", ["PROMPT_INJECTION_COMPLIANCE"], null, range);
  if (applicability === "unknown") return finish("ABSTAIN", ["UNKNOWN_APPLICABILITY"], null, range);
  if (applicability === "no") return finish("NO_FLAG", ["RULE_NOT_APPLICABLE"], null, range);
  if (evidence === "fabricated") return finish("SUPPRESS", ["EVIDENCE_NOT_MATCHED"], null, null);
  if (evidence === "contradicted") return finish("SUPPRESS", ["FINDING_CONTRADICTED"], null, range);
  if (evidence === "missing") return finish("ABSTAIN", ["INSUFFICIENT_EVIDENCE"], null, range);
  if (evidence === "missed_issue") return finish("REVIEW_REQUIRED", ["POSSIBLE_MISSED_ISSUE"], prompt, range);
  if (unsupportedNums.length) return finish("SUPPRESS", ["UNSUPPORTED_NUMBER"], null, range);
  if (unsupportedTerms.length) return finish("SUPPRESS", ["UNSUPPORTED_CLINICAL_FACT"], null, range);
  if (overreach) return finish("REVIEW_REQUIRED", ["AUTHORITY_OVERREACH"], prompt, range);
  if (source?.source_type === "proposed_safeguard") return finish("REVIEW_REQUIRED", ["PROPOSED_SOURCE_ONLY"], prompt, range);
  if (rule?.check_type === "judgment") return finish("REVIEW_REQUIRED", ["JUDGMENT_REQUIRED"], prompt, range);
  if (injected) return finish("REVIEW_REQUIRED", ["EMBEDDED_INSTRUCTION_DETECTED"], prompt, range);
  if (!deterministic || !factualTextVerified) return finish("REVIEW_REQUIRED", ["FACTUAL_SUPPORT_REQUIRES_REVIEW"], prompt, range);
  if (f.finding_type === "no_issue") return finish("NO_FLAG", ["NO_ISSUE_VERIFIED"], null, range);
  return finish("RELEASE_FLAG", ["VERIFIED"], prompt, range);
}

// ----- Revision comparison -----
export type RevisionStatus = "Resolved" | "Remaining" | "New" | "Not assessable";
export interface VersionFinding { rule_id: string; decision: Decision }

function classify(d: Decision | undefined): "flag" | "clean" | "na" {
  if (d === "RELEASE_FLAG" || d === "REVIEW_REQUIRED") return "flag";
  if (d === "NO_FLAG") return "clean";
  return "na";
}

export function compareRevisions(prev: VersionFinding[], next: VersionFinding[]) {
  const ids = [...new Set([...prev, ...next].map((f) => f.rule_id))].sort();
  const rows: { rule_id: string; previous: Decision | null; current: Decision | null; status: RevisionStatus }[] = [];
  for (const rule_id of ids) {
    const a = prev.find((f) => f.rule_id === rule_id)?.decision;
    const b = next.find((f) => f.rule_id === rule_id)?.decision;
    const ca = a === undefined ? "none" : classify(a);
    const cb = b === undefined ? "none" : classify(b);
    let status: RevisionStatus | null;
    if (cb === "na" || cb === "none") status = ca === "flag" || ca === "na" ? "Not assessable" : cb === "na" ? "Not assessable" : null;
    else if (cb === "flag") status = ca === "flag" ? "Remaining" : ca === "na" ? "Not assessable" : "New";
    else status = ca === "flag" ? "Resolved" : ca === "na" ? "Not assessable" : null; // clean before and after: nothing to report
    if (status) rows.push({ rule_id, previous: a ?? null, current: b ?? null, status });
  }
  return rows;
}
