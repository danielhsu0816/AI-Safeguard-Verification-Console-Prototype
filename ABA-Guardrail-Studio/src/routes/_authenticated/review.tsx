import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, LoadState, Panel } from "@/components/app/app-shell";
import { DecisionBadge } from "@/components/app/decision-badge";
import { ChecksList } from "@/components/app/checks-list";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { evaluationsQuery, reviewsQuery } from "@/lib/queries";
import { submitReview } from "@/lib/guardrail.functions";
import { useAuth } from "@/hooks/use-auth";
import type { CheckResult } from "@/lib/guardrail/types";
import { canApproveRelease } from "@/lib/guardrail/review-policy";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Human Review Queue — ABA Guardrail Studio" }, { name: "description", content: "Reviewer decisions with mandatory rationale." }, { property: "og:title", content: "Human Review Queue — ABA Guardrail Studio" }, { property: "og:description", content: "Reviewer decisions with mandatory rationale." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReviewPage,
});

const QUEUE_DECISIONS = ["REVIEW_REQUIRED", "ABSTAIN", "PARTIAL_UNAVAILABLE"];
const ACTIONS = [
  { v: "approve_release", l: "Approve release" },
  { v: "confirm_suppress", l: "Confirm suppress" },
  { v: "mark_no_flag", l: "Mark no flag" },
  { v: "escalate", l: "Escalate" },
] as const;

function ReviewPage() {
  const evals = useQuery(evaluationsQuery);
  const reviews = useQuery(reviewsQuery);
  const { isReviewer } = useAuth();
  const [tab, setTab] = useState("pending");
  const items = useMemo(() => {
    const seen = new Set<string>();
    const latest = (evals.data ?? []).filter((e) => { const k = e.test_case_id ?? e.id; if (seen.has(k)) return false; seen.add(k); return true; });
    const reviewed = new Set((reviews.data ?? []).filter((r) => r.action !== "escalate").map((r) => r.evaluation_id));
    return latest.filter((e) => QUEUE_DECISIONS.includes(e.decision) && (tab === "pending" ? !reviewed.has(e.id) : reviewed.has(e.id)));
  }, [evals.data, reviews.data, tab]);

  return (
    <AppShell title="Human Review Queue" description="Reviewer actions are stored separately from machine output. Historical decisions are never overwritten or deleted.">
      <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="done">Reviewed</TabsTrigger></TabsList></Tabs>
      <LoadState isLoading={evals.isLoading || reviews.isLoading} error={evals.error || reviews.error} />
      {!evals.isLoading && !items.length && <Panel><p className="text-sm text-muted-foreground">{tab === "pending" ? "Nothing is awaiting review. Items appear here after tests produce REVIEW_REQUIRED, ABSTAIN or PARTIAL_UNAVAILABLE." : "No reviewed items yet."}</p></Panel>}
      <div className="space-y-4">
        {items.map((e) => <ReviewCard key={e.id} ev={e} history={(reviews.data ?? []).filter((r) => r.evaluation_id === e.id)} canAct={isReviewer} />)}
      </div>
    </AppShell>
  );
}

function ReviewCard({ ev, history, canAct }: { ev: Tables<"evaluations">; history: Tables<"review_actions">[]; canAct: boolean }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitReview);
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const f = (ev.candidate_finding ?? {}) as Record<string, unknown>;
  const checks = ev.checks as unknown as CheckResult[];
  const uncertain = checks.filter((c) => c.status !== "pass");
  return (
    <section className="surface grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-xs text-muted-foreground">{ev.test_case_id}</code><code className="text-xs">{ev.rule_id}</code>
          <DecisionBadge decision={ev.decision} />
          <Link to="/verify" search={{ evaluation: ev.id }} className="text-xs text-primary hover:underline">Open evidence</Link>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Flagged evidence</div>
          <p className="mt-1 text-sm">{typeof f["evidence_span"] === "string" ? `“${f["evidence_span"]}”` : "No quoted span (required-element check)."}</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Proposed feedback</div>
          <p className="mt-1 text-sm">{ev.safe_revision_prompt ?? "None generated."}</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Uncertainty reasons</div>
          <div className="mt-1 flex flex-wrap gap-1">{ev.reason_codes.map((r: string) => <code key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{r}</code>)}</div>
        </div>
        {uncertain.length > 0 && <ChecksList checks={uncertain} />}
      </div>
      <div className="space-y-3">
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Review history (append-only)</div>
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border p-2 text-xs">
                <div className="font-medium">{h.action.replace(/_/g, " ")} · {new Date(h.created_at).toLocaleString()}</div>
                <div className="mt-0.5 text-muted-foreground">{h.rationale}</div>
              </div>
            ))}
          </div>
        )}
        {canAct && (
          <>
            <Textarea placeholder="Rationale (required, at least 10 characters)" value={rationale} onChange={(e) => setRationale(e.target.value)} className="min-h-24" />
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map((a) => (
                <Button key={a.v} variant={a.v === "approve_release" ? "default" : "outline"} size="sm" disabled={saving || a.v === "approve_release" && !canApproveRelease(ev.decision, checks)}
                  onClick={async () => {
                    if (rationale.trim().length < 10) return void toast.error("Rationale must be at least 10 characters.");
                    setSaving(true);
                    try {
                      await submit({ data: { evaluation_id: ev.id, action: a.v, rationale } });
                      toast.success("Review recorded"); setRationale("");
                      ["review_actions", "audit_events", "test_cases"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
                    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
                  }}>{a.l}</Button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
