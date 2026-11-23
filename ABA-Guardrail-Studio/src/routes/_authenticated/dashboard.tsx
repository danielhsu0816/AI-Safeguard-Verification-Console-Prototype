import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, LoadState, Panel } from "@/components/app/app-shell";
import { DecisionBadge } from "@/components/app/decision-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesQuery, evaluationsQuery, rulesQuery, reviewsQuery } from "@/lib/queries";
import { measureDashboard } from "@/lib/guardrail/metrics";
import { DECISIONS, DECISION_INFO } from "@/lib/guardrail/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ABA Guardrail Studio" }, { name: "description", content: "Measured guardrail metrics from stored test runs." }, { property: "og:title", content: "Dashboard — ABA Guardrail Studio" }, { property: "og:description", content: "Measured guardrail metrics from stored test runs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

const ALL = "__all";
function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  const unmeasured = value === "Not yet measured";
  return (
    <div className="surface p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={unmeasured ? "mt-3 text-base font-medium text-muted-foreground" : "mt-2 text-3xl font-semibold tabular-nums"}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const cases = useQuery(casesQuery);
  const evals = useQuery(evaluationsQuery);
  const rules = useQuery(rulesQuery);
  const reviews = useQuery(reviewsQuery);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [decision, setDecision] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [profile, setProfile] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const data = useMemo(() => {
    const cs = cases.data ?? [];
    const rs = rules.data ?? [];
    const measured = measureDashboard(cs, evals.data ?? [], rs, reviews.data ?? [], { from, to, decision, category, profile, status });
    const activeRules = rs.filter((r) => r.status === "active");
    const coveredRules = new Set(measured.filtered.map((e) => e.rule_id).filter((id) => activeRules.some((r) => r.rule_id === id)));
    return {
      ...measured, coveredRules: coveredRules.size, activeRules: activeRules.length,
      categories: [...new Set(rs.map((r) => r.category))],
      profiles: [...new Set(cs.map((c) => c.profile_id).filter(Boolean))] as string[],
    };
  }, [cases.data, evals.data, rules.data, reviews.data, from, to, decision, category, profile, status]);

  const loading = cases.isLoading || evals.isLoading || rules.isLoading;
  const err = cases.error || evals.error || rules.error;
  const nm = "Not yet measured";
  const n = data.filtered.length;
  const group2 = (cases.data ?? []).filter((c) => c.import_bundle);
  const deterministicRuns = (evals.data ?? []).filter((e) => e.execution_kind === "deterministic_rule").length;
  const simulatedRuns = (evals.data ?? []).filter((e) => e.execution_kind === "simulated_candidate").length;

  return (
    <AppShell title="Dashboard" description="All figures are computed from stored synthetic test runs. Provisional test outcomes are not clinical truth.">
      <section className="grid gap-4 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><div className="text-xs font-medium text-muted-foreground">Group 2 imported cases</div><div className="mt-2 text-2xl font-semibold tabular-nums">{group2.length}<span className="ml-2 text-xs font-normal text-muted-foreground">{group2.filter((c) => c.execution_status === "not_executed").length} Not Run</span></div></div>
        <div><div className="text-xs font-medium text-muted-foreground">Deterministic executions</div><div className="mt-2 text-2xl font-semibold tabular-nums">{deterministicRuns}</div></div>
        <div><div className="text-xs font-medium text-muted-foreground">Simulated candidate executions</div><div className="mt-2 text-2xl font-semibold tabular-nums">{simulatedRuns}</div></div>
        <div><div className="text-xs font-medium text-muted-foreground">External model</div><div className="mt-2 text-base font-medium text-muted-foreground">Unavailable · 0 live runs</div></div>
      </section>
      <Panel title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label="Through date" value={to} onChange={(e) => setTo(e.target.value)} />
          <F value={decision} onChange={setDecision} label="Decision" options={[...DECISIONS]} />
          <F value={category} onChange={setCategory} label="Rule category" options={data.categories} />
          <F value={profile} onChange={setProfile} label="Source profile" options={data.profiles} />
          <F value={status} onChange={setStatus} label="Test status" options={["pass", "fail", "not_executed"]} />
        </div>
      </Panel>
      <LoadState isLoading={loading} error={err} />
      {!loading && !err && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Total evaluations" value={data.measured ? String(n) : nm} />
            <Stat label="Released findings" value={data.measured ? String(data.counts["RELEASE_FLAG"]) : nm} />
            <Stat label="Suppressed findings" value={data.measured ? String(data.counts["SUPPRESS"]) : nm} />
            <Stat label="Awaiting human review" value={data.measured ? String(data.awaiting) : nm} />
            <Stat label="Provisional test coverage" value={data.executed ? `${Math.round((data.executed / data.total) * 100)}%` : nm}
              hint={data.executed ? `${data.executed}/${data.total} cases executed · ${data.coveredRules}/${data.activeRules} active rules exercised` : undefined} />
            <Stat label="Provisional expected-match rate" value={data.executed ? `${Math.round((data.passed / data.executed) * 100)}%` : nm}
              hint={data.executed ? `${data.passed} of ${data.executed} matched the provisional expected decision` : undefined} />
          </div>
          <Panel title="Decision distribution">
            {n === 0 ? <p className="text-sm text-muted-foreground">{data.measured ? "No evaluations match these filters." : "Not yet measured. Run tests in the Test Case Laboratory."}</p> : (
              <div className="space-y-3">
                {DECISIONS.map((d) => {
                  const c = data.counts[d] ?? 0;
                  return (
                    <div key={d} className="grid grid-cols-[minmax(0,180px)_minmax(16px,1fr)_24px] items-center gap-3 text-sm">
                      <DecisionBadge decision={d} />
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(c / n) * 100}%` }} /></div>
                      <span className="text-right tabular-nums">{c}</span>
                    </div>
                  );
                })}
                <p className="pt-2 text-xs text-muted-foreground">{DECISION_INFO.NO_FLAG.description} It never implies overall clinical compliance.</p>
              </div>
            )}
          </Panel>
        </>
      )}
    </AppShell>
  );
}

function F({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All · {label}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
