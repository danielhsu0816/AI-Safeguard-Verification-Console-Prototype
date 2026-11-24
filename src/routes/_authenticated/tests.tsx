import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { parseGroup2Csv, sameOriginal, type OriginalCase, PROVISIONAL } from "@/lib/group2/import";
import { importGroup2Csv, importGroup2Bundle } from "@/lib/group2.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExecutionMode } from "@/lib/group2/runner";
import { toast } from "sonner";
import { Play, PlayCircle, Upload, Download, Search, ScanSearch } from "lucide-react";
import { AppShell, LoadState } from "@/components/app/app-shell";
import { DecisionBadge, StatusBadge } from "@/components/app/decision-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { casesQuery, downloadCsv, evaluationsQuery } from "@/lib/queries";
import { markTestStatus, runAllTestCases, runTestCase } from "@/lib/guardrail.functions";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/tests")({
  head: () => ({ meta: [{ title: "Test Case Laboratory — ABA Guardrail Studio" }, { name: "description", content: "Run provisional synthetic guardrail test cases." }, { property: "og:title", content: "Test Case Laboratory — ABA Guardrail Studio" }, { property: "og:description", content: "Run provisional synthetic guardrail test cases." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TestsPage,
});

type TC = Tables<"test_cases">;

function TestsPage() {
  const qc = useQueryClient();
  const cases = useQuery(casesQuery);
  const { isAdmin, isReviewer } = useAuth();
  const [search, setSearch] = useState("");
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<TC | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const run = useServerFn(runTestCase);
  const importBundle = useServerFn(importGroup2Bundle);
  const [mode, setMode] = useState<ExecutionMode>("automatic");
  const runAll = useServerFn(runAllTestCases);

  const refresh = () => Promise.all(["test_cases", "evaluations", "audit_events"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (cases.data ?? []).filter((c) => (!failuresOnly || c.execution_status === "fail") && (!s || [c.case_id, c.title, c.failure_mode, c.target_rule_ids.join(" "), c.expected_guardrail_decision, c.actual_decision ?? ""].join(" ").toLowerCase().includes(s)));
  }, [cases.data, search, failuresOnly]);

  async function runOne(id: string) {
    setBusy(id);
    try {
      const r = await run({ data: { case_id: id, mode } });
      toast[r.passed ? "success" : "warning"](`${id}: ${r.decision} — ${r.comparison === "unavailable" ? "not assessable; no pass recorded" : r.passed ? "matches expected" : "differs from expected"}`);
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function runEverything() {
    setBusy("all");
    try {
      const r = await runAll({ data: { mode } });
      toast.info(`Ran ${r.length} cases · ${r.filter((x) => x.passed).length} matched expected · ${r.filter((x) => x.comparison === "unavailable").length} not assessable`);
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <AppShell
      title="Test Case Laboratory"
      description="Fictional, provisional test cases. Expected decisions are project design inputs — not clinically approved gold labels."
      actions={<>
        {isAdmin && <Button variant="outline" disabled={!!busy} onClick={async () => { setBusy("import"); try { const r = await importBundle(); toast.success(`${r.inserted} imported · ${r.unchanged} unchanged`); await refresh(); } catch(e) { toast.error((e as Error).message); } finally { setBusy(null); } }}><Upload className="size-4" /> Load Group 2 package</Button>}
        {isAdmin && <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="size-4" /> Import CSV</Button>}
        <Button variant="outline" onClick={() => downloadCsv("guardrail-test-results.csv", (cases.data ?? []).map(({ candidate_finding, synthetic_input, ...r }) => ({ ...r, target_rule_ids: r.target_rule_ids.join(";") })))}><Download className="size-4" /> Export results</Button>
        {isReviewer && <Button onClick={runEverything} disabled={!!busy}><PlayCircle className="size-4" /> {busy === "all" ? "Running…" : "Run all tests"}</Button>}
      </>}
    >
      <div className="flex flex-wrap items-center gap-3"><Select value={mode} onValueChange={(v) => setMode(v as ExecutionMode)}><SelectTrigger aria-label="Execution mode" className="w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="automatic">Automatic fixture runner</SelectItem><SelectItem value="deterministic_rule">Deterministic rules only</SelectItem><SelectItem value="simulated_candidate">Simulated candidate guardrail</SelectItem><SelectItem value="external_model">External model — unavailable</SelectItem></SelectContent></Select><span className="text-xs text-muted-foreground">{PROVISIONAL}</span></div>
      <Button variant="outline" onClick={() => setFailuresOnly(!failuresOnly)}>{failuresOnly ? "Show all cases" : "Review failures"}</Button>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search case, rule, failure mode, decision…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <LoadState isLoading={cases.isLoading} error={cases.error} />
      {cases.data && (
        <div className="surface overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>case_id</TableHead><TableHead>title</TableHead><TableHead>rules</TableHead><TableHead>failure_mode</TableHead>
                <TableHead>expected</TableHead><TableHead>actual</TableHead><TableHead>execution</TableHead><TableHead>review</TableHead><TableHead>priority</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.case_id} className="cursor-pointer" onClick={() => setDetail(c)}>
                  <TableCell className="font-mono text-xs"><Button variant="link" size="sm" onClick={() => setDetail(c)}>{c.case_id}</Button></TableCell>
                  <TableCell className="max-w-[240px] truncate">{c.title}</TableCell>
                  <TableCell className="font-mono text-xs">{c.target_rule_ids.join(", ")}</TableCell>
                  <TableCell className="text-xs">{c.failure_mode.replace(/_/g, " ")}</TableCell>
                  <TableCell><DecisionBadge decision={c.expected_guardrail_decision} /></TableCell>
                  <TableCell><DecisionBadge decision={c.actual_decision} /></TableCell>
                  <TableCell><StatusBadge status={c.execution_status} /></TableCell>
                  <TableCell><StatusBadge status={c.review_status} /></TableCell>
                  <TableCell className="text-xs capitalize">{c.proposed_priority}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isReviewer && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => runOne(c.case_id)}><Play className="size-3.5" />{busy === c.case_id ? "…" : "Run"}</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No matching test cases.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
      <CaseDetail tc={detail} onClose={() => setDetail(null)} onRun={runOne} busy={busy} isAdmin={isAdmin} onChanged={refresh} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} existing={new Set((cases.data ?? []).map((c) => c.case_id))} onDone={refresh} />
    </AppShell>
  );
}

function Field({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={`mt-1 text-sm ${mono ? "whitespace-pre-wrap break-all font-mono text-xs" : ""}`}>{v ?? "—"}</div>
    </div>
  );
}

function CaseDetail({ tc, onClose, onRun, busy, isAdmin, onChanged }: { tc: TC | null; onClose: () => void; onRun: (id: string) => void; busy: string | null; isAdmin: boolean; onChanged: () => void }) {
  const evals = useQuery(evaluationsQuery);
  const cases = useQuery(casesQuery);
  const mark = useServerFn(markTestStatus);
  const [rationale, setRationale] = useState("");
  const live = tc ? cases.data?.find((c) => c.case_id === tc.case_id) ?? tc : null;
  const last = live ? evals.data?.find((e) => e.test_case_id === live.case_id) : undefined;
  if (!live) return null;
  const match = live.actual_decision ? live.actual_decision === live.expected_guardrail_decision : null;
  return (
    <Dialog open={!!tc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{live.case_id}</span> {live.title}</DialogTitle>
          <DialogDescription>Fictional provisional test case · {live.failure_mode.replace(/_/g, " ")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 rounded-xl bg-muted p-4 sm:grid-cols-3">
          <Field k="Expected" v={<DecisionBadge decision={live.expected_guardrail_decision} />} />
          <Field k="Actual" v={<DecisionBadge decision={live.actual_decision} />} />
          <Field k="Comparison" v={live.execution_status === "unavailable" ? "Not assessable — no pass recorded" : match === null ? "Not executed" : match ? <span className="font-medium text-success">Match</span> : <span className="font-medium text-critical">Mismatch — review failure</span>} />
        </div>
        {last && (
          <div className="text-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest reason codes</div>
            <div className="mt-1 flex flex-wrap gap-1">{last.reason_codes.map((r) => <code key={r} className="rounded bg-muted px-1.5 py-0.5 text-xs">{r}</code>)}</div>
              <Link to="/verify" search={{ evaluation: last.id, case: live.case_id }} className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"><ScanSearch className="size-4" /> Open in Evidence Verification</Link>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field k="target_rule_ids" v={live.target_rule_ids.join(", ")} mono />
          <Field k="note / context" v={live.import_bundle ? "Original synthetic scenario · no clinical note or payer profile supplied" : `${live.note_id} v${live.note_version} · ${live.profile_id ?? "no profile"}`} mono />
          <Field k="synthetic_input" v={live.synthetic_input} />
          <Field k="evidence_check" v={live.evidence_check} />
          <Field k="expected_safe_feedback" v={live.expected_safe_feedback} />
          <Field k="forbidden_output" v={live.forbidden_output} />
        </div>
        {last && <Field k="Execution provenance" v={last.execution_kind.replace(/_/g, " ")} />}
        <Field k="candidate finding (untrusted)" v={JSON.stringify(live.candidate_finding, null, 2)} mono />
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button onClick={() => onRun(live.case_id)} disabled={!!busy}><Play className="size-4" /> Run test</Button>
          {live.import_bundle && <Button variant="outline" asChild><Link to="/verify" search={{ case: live.case_id }}><ScanSearch className="size-4" /> Verify evidence</Link></Button>}
        </div>
        {isAdmin && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-sm font-medium">Reset execution status</div>
            <Textarea placeholder="Rationale (required, min 10 characters)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
            <div className="flex gap-2">
              {(["not_executed"] as const).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={async () => {
                  try { await mark({ data: { case_id: live.case_id, execution_status: s, rationale } }); toast.success(`Marked ${s.replace("_", " ")}`); setRationale(""); onChanged(); }
                  catch (e) { toast.error((e as Error).message.includes("rationale") ? "Rationale must be at least 10 characters" : (e as Error).message); }
                }}>Mark {s.replace("_", " ")}</Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose, existing: _existing, onDone }: { open: boolean; onClose: () => void; existing: Set<string>; onDone: () => void }) {
  const cases = useQuery(casesQuery);
  const save = useServerFn(importGroup2Csv);
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<OriginalCase[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function parse(file: File) {
    setRows([]); setError(""); setCsv("");
    try {
      const text = await file.text();
      const parsed = parseGroup2Csv(text);
      for (const row of parsed) {
        const existing = cases.data?.find((c) => c.case_id === row.case_id);
        if (existing && !sameOriginal(existing.original_record, row)) throw new Error(`${row.case_id}: conflicts with stored original content; no overwrite permitted.`);
      }
      setCsv(text); setRows(parsed);
    } catch(e) { setError((e as Error).message); }
  }
  return <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Import Group 2 CSV</DialogTitle><DialogDescription>Synthetic fixtures · original expectations retained · existing executions preserved</DialogDescription></DialogHeader>
    <Input aria-label="Group 2 CSV file" type="file" accept=".csv,text/csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) void parse(file); }} />
    {error && <p role="alert" className="break-words text-sm text-critical">{error}</p>}
    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Title</TableHead><TableHead>Expected</TableHead><TableHead>Import</TableHead></TableRow></TableHeader><TableBody>{rows.map((r) => <TableRow key={r.case_id}><TableCell>{r.case_id}</TableCell><TableCell>{r.title}</TableCell><TableCell><DecisionBadge decision={r.expected_guardrail_decision} /></TableCell><TableCell>{cases.data?.some((c) => c.case_id === r.case_id) ? "Unchanged" : "New · Not Run"}</TableCell></TableRow>)}</TableBody></Table></div>
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!rows.length || !!error || busy} onClick={async () => { setBusy(true); try { const r = await save({ data: { csv } }); toast.success(`${r.inserted} imported · ${r.unchanged} unchanged`); onDone(); onClose(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}>Import {rows.length || ""} cases</Button></div>
  </DialogContent></Dialog>;
}
