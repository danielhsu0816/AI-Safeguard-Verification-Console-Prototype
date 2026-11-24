import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, ArrowLeft, FileCheck2, TestTubeDiagonal, Unplug } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, Panel } from "./app-shell";
import { DecisionBadge, StatusBadge } from "./decision-badge";
import { Button } from "@/components/ui/button";
import { group2RulesQuery, group2DecisionsQuery } from "@/lib/queries";
import { runTestCase } from "@/lib/guardrail.functions";
import type { Trace } from "@/lib/group2/runner";
import { PROVISIONAL } from "@/lib/group2/import";
import { useAuth } from "@/hooks/use-auth";

export function Group2Verification({ tc, evaluation }: { tc: Tables<"test_cases">; evaluation: Tables<"evaluations"> | undefined }) {
  const maps = useQuery(group2RulesQuery);
  const decisions = useQuery(group2DecisionsQuery);
  const qc = useQueryClient();
  const run = useServerFn(runTestCase);
  const { isReviewer } = useAuth();
  const [busy, setBusy] = useState(false);
  const trace = evaluation?.execution_trace as unknown as (Trace & { input?: { synthetic_input: string; target_rule_ids: string[] } }) | undefined;
  const mapping = decisions.data?.find((d) => d.decision === evaluation?.decision);
  const snapshot = evaluation?.registry_snapshot as unknown as { group2_rules?: Tables<"group2_rule_map">[] } | undefined;
  const rules = (snapshot?.group2_rules ?? maps.data ?? []).filter((r) => tc.target_rule_ids.includes("RBT-ALL") || tc.target_rule_ids.includes(r.rule_id));
  return <AppShell title="Evidence Verification" description={`${tc.case_id} · ${tc.title}`} actions={<><Button variant="outline" asChild><Link to="/tests"><ArrowLeft className="size-4" /> Cases</Link></Button>{isReviewer && <Button disabled={busy} onClick={async () => { setBusy(true); try { const result = await run({ data: { case_id: tc.case_id, mode: "automatic" } }); toast.info(`${result.decision} · independently calculated`); await Promise.all(["test_cases", "evaluations", "audit_events"].map((key) => qc.invalidateQueries({ queryKey: [key] }))); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); } }}><Play className="size-4" /> {busy ? "Running…" : "Run fixture"}</Button>}</>}>
    <div className="flex flex-wrap items-center gap-3"><StatusBadge status={tc.execution_status} /><span className="text-xs text-muted-foreground">{PROVISIONAL}</span></div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border-l-2 border-primary py-2 pl-4"><div className="flex items-center gap-2 text-sm font-medium"><FileCheck2 className="size-4 text-primary" /> Deterministic rules</div><p className="mt-1 text-xs text-muted-foreground">{trace ? `${trace.deterministic.filter((r) => ["issue", "clear"].includes(r.status)).length} predicates executed` : "Not Run"}</p></div>
      <div className="border-l-2 border-warning py-2 pl-4"><div className="flex items-center gap-2 text-sm font-medium"><TestTubeDiagonal className="size-4 text-warning" /> Simulated candidate</div><p className="mt-1 text-xs text-muted-foreground">{trace?.simulation ? "Scenario simulation executed · not model output" : "Not invoked"}</p></div>
      <div className="border-l-2 border-border py-2 pl-4"><div className="flex items-center gap-2 text-sm font-medium"><Unplug className="size-4 text-muted-foreground" /> External model</div><p className="mt-1 text-xs text-muted-foreground">Unavailable · never invoked</p></div>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-3">
      <Panel title="Original synthetic scenario"><p className="whitespace-pre-wrap text-sm leading-relaxed">{trace?.input?.synthetic_input ?? tc.synthetic_input}</p><dl className="mt-5 space-y-3 text-sm"><Field label="Target rule IDs" value={tc.target_rule_ids.join("; ")} /><Field label="Failure mode" value={tc.failure_mode} /><Field label="Evidence check" value={tc.evidence_check ?? "—"} /></dl></Panel>
      <Panel title="Provisional expectations"><div className="mb-4"><DecisionBadge decision={tc.expected_guardrail_decision} /></div><dl className="space-y-4 text-sm"><Field label="Expected safe feedback — not an actual result" value={tc.expected_safe_feedback ?? "—"} /><Field label="Forbidden output" value={tc.forbidden_output ?? "—"} /></dl></Panel>
      <Panel title="Actual verification"><DecisionBadge decision={evaluation?.decision} /><p className="mt-2 text-sm">{evaluation ? mapping?.ui_label ?? evaluation.decision : "Not Run — no actual decision"}</p>{evaluation && <><p className="mt-3 text-xs text-muted-foreground">{evaluation.execution_kind.replace(/_/g, " ")} · {evaluation.created_at}</p><p className="mt-3 text-sm">{mapping?.next_action}</p><div className="mt-3 flex flex-wrap gap-1">{evaluation.reason_codes.map((r) => <code key={r} className="break-all bg-muted p-1 text-xs">{r}</code>)}</div><p className="mt-3 text-sm">{trace?.assessable === false ? "Not assessable — excluded from pass rate" : evaluation.decision === evaluation.expected_decision_snapshot ? "Matches provisional expected decision" : "Mismatch — clinical review required"}</p></>}</Panel>
    </div>
    {trace && <section className="space-y-4 border-t pt-5"><h2 className="font-semibold">Executed checks</h2><div className="divide-y border bg-card">{trace.deterministic.map((r, i) => <div key={`${r.rule_id}-${i}`} className="grid gap-2 p-3 text-sm md:grid-cols-[100px_150px_1fr]"><code>{r.rule_id}</code><span>{r.status.replace(/_/g, " ")}</span><span>{r.detail}</span></div>)}</div>{trace.simulation && <div className="divide-y border bg-card">{trace.simulation.checks.map((c) => <div key={c.name} className="grid gap-2 p-3 text-sm md:grid-cols-[150px_100px_1fr]"><span>{c.name}</span><span>{c.outcome}</span><span>{c.detail}</span></div>)}</div>}</section>}
    <section className="space-y-3 border-t pt-5"><h2 className="font-semibold">Original Group 1 rule mapping</h2><div className="divide-y">{rules.map((r) => <div key={r.rule_id} className="grid gap-2 py-3 text-sm sm:grid-cols-[100px_1fr_110px]"><code>{r.rule_id}</code><span>{r.original_wording}</span><span className="text-muted-foreground">{r.method}</span></div>)}</div></section>
  </AppShell>;
}
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>; }