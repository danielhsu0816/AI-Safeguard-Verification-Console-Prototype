import { useMemo, type ReactNode } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, LoadState, Panel } from "@/components/app/app-shell";
import { DecisionBadge, StatusBadge } from "@/components/app/decision-badge";
import { ChecksList } from "@/components/app/checks-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesQuery, evaluationsQuery, noteVersionsQuery, rulesQuery, sourcesQuery } from "@/lib/queries";
import { DECISION_INFO, type CheckResult, type Decision } from "@/lib/guardrail/types";
import { Group2Verification } from "@/components/app/group2-verification";

export const Route = createFileRoute("/_authenticated/verify")({
  validateSearch: (s: Record<string, unknown>): { evaluation?: string; case?: string } => ({ ...(typeof s["evaluation"] === "string" ? { evaluation: s["evaluation"] } : {}), ...(typeof s["case"] === "string" ? { case: s["case"] } : {}) }),
  head: () => ({ meta: [{ title: "Evidence Verification — ABA Guardrail Studio" }, { name: "description", content: "Three-panel evidence verification workspace." }, { property: "og:title", content: "Evidence Verification — ABA Guardrail Studio" }, { property: "og:description", content: "Three-panel evidence verification workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: VerifyPage,
});

const SOURCE_TYPE_LABEL: Record<string, string> = { law: "Law", payer_requirement: "Payer requirement", internal_policy: "Internal policy", proposed_safeguard: "Proposed safeguard" };

function VerifyPage() {
  const { evaluation, case: caseId } = Route.useSearch();
  const navigate = useNavigate({ from: "/verify" });
  const evals = useQuery(evaluationsQuery);
  const versions = useQuery(noteVersionsQuery);
  const rules = useQuery(rulesQuery);
  const sources = useQuery(sourcesQuery);
  const cases = useQuery(casesQuery);

  const latestPerCase = useMemo(() => {
    const seen = new Set<string>();
    return (evals.data ?? []).filter((e) => { const k = e.test_case_id ?? e.id; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [evals.data]);
  const ev = evals.data?.find((e) => e.id === evaluation) ?? latestPerCase[0];
  const note = versions.data?.find((v) => v.note_id === ev?.note_id && v.version === ev?.note_version);
  const finding = (ev?.candidate_finding ?? {}) as Record<string, unknown>;
  const snapshot = ev?.registry_snapshot as unknown as { rules?: Tables<"rules">[]; sources?: Tables<"sources">[] } | undefined;
  const rule = (snapshot?.rules ?? rules.data)?.find((r) => r.rule_id === finding["rule_id"]);
  const source = (snapshot?.sources ?? sources.data)?.find((s) => s.source_id === finding["source_id"]);
  const checks = (ev?.checks ?? []) as unknown as CheckResult[];
  const evidenceOk = checks.find((c) => c.key === "evidence")?.status === "pass";
  const citationOk = checks.find((c) => c.key === "citation")?.status === "pass";
  const tc = cases.data?.find((c) => c.case_id === ev?.test_case_id);

  const span = typeof finding["evidence_span"] === "string" ? (finding["evidence_span"] as string) : null;
  const idx = note && span ? note.content.indexOf(span) : -1;

  const loading = evals.isLoading || versions.isLoading;
  const selectedGroup2 = cases.data?.find((c) => c.import_bundle && (caseId ? c.case_id === caseId : c.case_id === ev?.test_case_id));
  if (selectedGroup2) return <Group2Verification tc={selectedGroup2} evaluation={evaluation ? evals.data?.find((e) => e.id === evaluation && e.test_case_id === selectedGroup2.case_id) : evals.data?.find((e) => e.test_case_id === selectedGroup2.case_id)} />;
  return (
    <AppShell title="Evidence Verification" description="Exact-text grounding only. Keyword overlap, semantic similarity or valid JSON alone are never treated as factual support.">
      <LoadState isLoading={loading} error={evals.error || versions.error} />
      {!loading && !latestPerCase.length && <Panel><p className="text-sm text-muted-foreground">No evaluations yet. Run a test in the Test Case Laboratory first.</p></Panel>}
      {ev && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={ev.id} onValueChange={(v) => navigate({ search: { evaluation: v } })}>
              <SelectTrigger className="w-full max-w-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {latestPerCase.map((e) => <SelectItem key={e.id} value={e.id}>{e.test_case_id} · {e.rule_id ?? "?"} · {e.decision}</SelectItem>)}
              </SelectContent>
            </Select>
            <DecisionBadge decision={ev.decision} />
            <span className="text-xs text-muted-foreground">{DECISION_INFO[ev.decision as Decision]?.description}</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Synthetic note & evidence">
              <div className="mb-2 font-mono text-xs text-muted-foreground">{ev.note_id} · version {ev.note_version} (immutable)</div>
              {note ? (
                <pre className="whitespace-pre-wrap rounded-lg bg-background/60 p-3 font-mono text-xs leading-relaxed">
                  {idx >= 0 && span ? <>{note.content.slice(0, idx)}<mark className="evidence-mark text-foreground">{span}</mark>{note.content.slice(idx + span.length)}</> : note.content}
                </pre>
              ) : <p className="text-sm text-critical">Note version unavailable.</p>}
              <div className="mt-3 text-xs">
                <div className="font-medium uppercase tracking-wider text-muted-foreground">Quoted evidence</div>
                {span ? (
                  <p className={`mt-1 ${idx >= 0 ? "text-success" : "text-critical"}`}>{idx >= 0 ? "Exact match highlighted." : "Not found verbatim in this note version."} “{span}”</p>
                ) : <p className="mt-1 text-muted-foreground">No span quoted{rule?.check_type === "required_element" ? " — required element checked by deterministic pattern." : "."}</p>}
              </div>
            </Panel>
            <Panel title="Candidate AI finding (untrusted)">
              <dl className="space-y-3 text-sm">
                <Row k="Rule ID" v={<code>{String(finding["rule_id"] ?? "—")}</code>} />
                <Row k="Finding type" v={String(finding["finding_type"] ?? "—")} />
                <Row k="Severity" v={String(finding["severity"] ?? "—")} />
                <Row k="Note version claimed" v={String(finding["note_version"] ?? "—")} />
                <Row k="Explanation" v={<span className={ev.decision === "SUPPRESS" ? "line-through decoration-critical/60" : ""}>{String(finding["explanation"] ?? "—")}</span>} />
              </dl>
              {ev.decision === "SUPPRESS" && <p className="mt-3 rounded-lg bg-critical/10 p-2 text-xs text-critical">Withheld — this text must not be shown to end users.</p>}
              <div className="mt-4 border-t pt-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Safe revision prompt</div>
                <p className="mt-1 text-sm">{ev.safe_revision_prompt ?? <span className="text-muted-foreground">None — not releasable.</span>}</p>
              </div>
              {tc && <div className="mt-3 text-xs text-muted-foreground">Expected (provisional): <DecisionBadge decision={tc.expected_guardrail_decision} /></div>}
              <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Raw JSON</summary><pre className="mt-2 overflow-x-auto rounded bg-muted p-2">{JSON.stringify(finding, null, 2)}</pre></details>
            </Panel>
            <Panel title="Source & guardrail results">
              {source ? (
                <div className="mb-4 space-y-2 break-words text-sm">
                  <div className="flex flex-wrap items-center gap-2"><code className="text-xs">{source.source_id}</code><StatusBadge status={source.approval_status} /><span className="text-xs text-muted-foreground">{SOURCE_TYPE_LABEL[source.source_type]}</span></div>
                  <div className="font-medium">{source.title}</div>
                  {citationOk && source.approved_passage && <blockquote className="border-l-2 border-primary pl-3 text-sm italic">{source.approved_passage}</blockquote>}
                  <div className="text-xs text-muted-foreground">{source.issuing_organization} · v{source.document_version} · effective {source.effective_date ?? "—"}</div>
                  <div className="break-all font-mono text-[10px] text-muted-foreground">Passage digest: {source.passage_hash ?? "unavailable"}</div>
                  {rule && <div className="text-xs">Applicability: <code>{rule.applicability ? JSON.stringify(rule.applicability) : "unknown"}</code></div>}
                </div>
              ) : <p className="mb-4 text-sm text-critical">Cited source “{String(finding["source_id"] ?? "—")}” is not in the registry.</p>}
              <ChecksList checks={checks} />
              <div className="mt-3 flex flex-wrap gap-1">{ev.reason_codes.map((r) => <code key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{r}</code>)}</div>
              {!evidenceOk && <p className="mt-2 text-xs text-muted-foreground">Evidence was not verified; nothing from this finding may be displayed as fact.</p>}
            </Panel>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-0.5">{v}</dd></div>;
}
