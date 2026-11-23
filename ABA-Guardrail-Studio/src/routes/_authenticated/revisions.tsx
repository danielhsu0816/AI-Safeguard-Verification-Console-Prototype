import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, LoadState, Panel } from "@/components/app/app-shell";
import { DecisionBadge, toneVariants } from "@/components/app/decision-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { evaluationsQuery, notesQuery, noteVersionsQuery } from "@/lib/queries";
import { compareRevisions, type RevisionStatus } from "@/lib/guardrail/engine";
import { addNoteVersion } from "@/lib/guardrail.functions";
import { useAuth } from "@/hooks/use-auth";
import type { CheckResult, Decision } from "@/lib/guardrail/types";

export const Route = createFileRoute("/_authenticated/revisions")({
  head: () => ({ meta: [{ title: "Revision Comparison — ABA Guardrail Studio" }, { name: "description", content: "Compare findings across immutable note versions." }, { property: "og:title", content: "Revision Comparison — ABA Guardrail Studio" }, { property: "og:description", content: "Compare findings across immutable note versions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RevisionsPage,
});

const TONE: Record<RevisionStatus, "success" | "warning" | "critical" | "neutral"> = { Resolved: "success", Remaining: "warning", New: "critical", "Not assessable": "neutral" };
const sel = "h-9 min-w-0 max-w-full rounded-md border border-input bg-card px-3 text-sm";

function RevisionsPage() {
  const notes = useQuery(notesQuery);
  const versions = useQuery(noteVersionsQuery);
  const evals = useQuery(evaluationsQuery);
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const addVersion = useServerFn(addNoteVersion);
  const [noteId, setNoteId] = useState("N-001");
  const nv = (versions.data ?? []).filter((v) => v.note_id === noteId);
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [draft, setDraft] = useState("");

  const latestByRule = (version: number) => {
    const out = new Map<string, Decision>();
    const eligible = (evals.data ?? []).filter((e) => e.note_id === noteId && e.note_version === version && e.rule_id);
    // Stale and inapplicable adversarial test candidates are not assessments of this version.
    const grounded = eligible.filter((e) => {
      const checks = e.checks as unknown as CheckResult[];
      return checks.some((c) => c.key === "version" && c.status === "pass") && checks.some((c) => c.key === "applicable" && c.status === "pass");
    });
    for (const e of [...grounded, ...eligible]) if (e.rule_id && !out.has(e.rule_id)) out.set(e.rule_id, e.decision as Decision);
    return [...out].map(([rule_id, decision]) => ({ rule_id, decision }));
  };
  const rows = useMemo(() => compareRevisions(latestByRule(a), latestByRule(b)), [evals.data, noteId, a, b]);
  const textA = nv.find((v) => v.version === a)?.content.split("\n") ?? [];
  const textB = nv.find((v) => v.version === b)?.content.split("\n") ?? [];

  return (
    <AppShell title="Revision Comparison" description="Note versions are immutable. A resolved issue does not imply overall clinical compliance.">
      <LoadState isLoading={notes.isLoading || versions.isLoading} error={notes.error || versions.error} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select className={sel} value={noteId} onChange={(e) => { setNoteId(e.target.value); setA(1); setB(2); }}>{notes.data?.map((n) => <option key={n.note_id} value={n.note_id}>{n.note_id} — {n.title}</option>)}</select>
        <span>compare</span>
        <select className={sel} value={a} onChange={(e) => setA(Number(e.target.value))}>{nv.map((v) => <option key={v.id} value={v.version}>v{v.version}</option>)}</select>
        <span>→</span>
        <select className={sel} value={b} onChange={(e) => setB(Number(e.target.value))}>{nv.map((v) => <option key={v.id} value={v.version}>v{v.version}</option>)}</select>
      </div>
      <Panel title="Finding comparison">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No comparable evaluations for these versions yet. Run tests that target both versions.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>rule</TableHead><TableHead>v{a}</TableHead><TableHead>v{b}</TableHead><TableHead>status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.rule_id}><TableCell className="font-mono text-xs">{r.rule_id}</TableCell><TableCell><DecisionBadge decision={r.previous} /></TableCell><TableCell><DecisionBadge decision={r.current} /></TableCell><TableCell><span className={toneVariants({ tone: TONE[r.status] })}>{r.status}</span></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">“Resolved” means only that the specific tested rule no longer flags. It is not a compliance determination.</p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        {[{ id: "previous", v: a, lines: textA, other: textB, tone: "bg-critical/10" }, { id: "current", v: b, lines: textB, other: textA, tone: "bg-success/12" }].map((side) => (
          <Panel key={side.id} title={`Version ${side.v}`}>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {side.lines.map((l, i) => <div key={i} className={side.other.includes(l) ? "" : `${side.tone} rounded px-1`}>{l || " "}</div>)}
            </pre>
          </Panel>
        ))}
      </div>
      {isAdmin && (
        <Panel title="Save new immutable version">
          <Textarea className="min-h-40 font-mono text-xs" placeholder="SYNTHETIC NOTE — NOT A REAL PATIENT…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setDraft(nv.at(-1)?.content ?? "")}>Start from latest</Button>
            <Button onClick={async () => {
              try { const r = await addVersion({ data: { note_id: noteId, content: draft } }); toast.success(`Saved ${noteId} v${r.version}`); setDraft(""); qc.invalidateQueries({ queryKey: ["note_versions"] }); }
              catch (e) { toast.error((e as Error).message); }
            }}>Save version</Button>
            <span className="text-xs text-muted-foreground">Text must be labeled SYNTHETIC. Never enter real patient information.</span>
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
