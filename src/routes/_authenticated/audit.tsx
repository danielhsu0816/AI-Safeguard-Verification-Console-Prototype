import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { AppShell, LoadState } from "@/components/app/app-shell";
import { DecisionBadge } from "@/components/app/decision-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditQuery, downloadCsv } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Trail — ABA Guardrail Studio" }, { name: "description", content: "Append-only operational audit log without note text." }, { property: "og:title", content: "Audit Trail — ABA Guardrail Studio" }, { property: "og:description", content: "Append-only operational audit log without note text." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuditPage,
});

function AuditPage() {
  const audit = useQuery(auditQuery);
  const [q, setQ] = useState("");
  const rows = useMemo(() => (audit.data ?? []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())), [audit.data, q]);
  return (
    <AppShell title="Audit Trail" description="Append-only. Operational logs never contain raw note text or PHI — only identifiers, versions and decisions."
      actions={<Button variant="outline" onClick={() => downloadCsv("audit-trail.csv", rows)}><Download className="size-4" /> Export CSV</Button>}>
      <Input className="max-w-md" placeholder="Filter events…" value={q} onChange={(e) => setQ(e.target.value)} />
      <LoadState isLoading={audit.isLoading} error={audit.error} />
      {audit.data && (
        <div className="surface overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{["timestamp", "event", "actor_id", "test_case_id", "note_v", "evaluation_id", "rule_id", "decision", "failure_reason", "model_version", "source_bundle", "reviewer_action"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.event_id} className="text-xs">
                  <TableCell className="whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{r.event_type}</TableCell>
                  <TableCell className="font-mono" title={r.actor_id}>{r.actor_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono">{r.test_case_id ?? "—"}</TableCell>
                  <TableCell>{r.note_version ?? "—"}</TableCell>
                  <TableCell className="font-mono" title={r.evaluation_id ?? ""}>{r.evaluation_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell className="font-mono">{r.rule_id ?? "—"}</TableCell>
                  <TableCell>{r.guardrail_decision ? <DecisionBadge decision={r.guardrail_decision} /> : "—"}</TableCell>
                  <TableCell className="max-w-[220px]">{r.failure_reason ?? "—"}</TableCell>
                  <TableCell>{r.model_version ?? "—"}</TableCell>
                  <TableCell>{r.source_bundle_version ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px]">{r.reviewer_action ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">No events recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
