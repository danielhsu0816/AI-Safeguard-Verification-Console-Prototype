import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, LoadState, Panel } from "@/components/app/app-shell";
import { DecisionBadge, toneVariants } from "@/components/app/decision-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { settingsQuery } from "@/lib/queries";
import { evaluateExternalRequest, updateSettings } from "@/lib/guardrail.functions";
import { SAMPLE_ADAPTER_REQUEST, disabledExternalEvaluator, type ValidatedFinding } from "@/lib/guardrail/adapter";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ABA Guardrail Studio" }, { name: "description", content: "Verification service, roles and integration adapter." }, { property: "og:title", content: "Settings — ABA Guardrail Studio" }, { property: "og:description", content: "Verification service, roles and integration adapter." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useQuery(settingsQuery);
  const config = settings.data;
  const { user, roles, isAdmin } = useAuth();
  const qc = useQueryClient();
  const update = useServerFn(updateSettings);
  const evaluate = useServerFn(evaluateExternalRequest);
  const [payload, setPayload] = useState(JSON.stringify(SAMPLE_ADAPTER_REQUEST, null, 2));
  const [out, setOut] = useState<ValidatedFinding[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AppShell title="Settings" description="Prototype configuration. No production clinical integration is enabled, and no HIPAA certification is claimed.">
      <LoadState isLoading={settings.isLoading} error={settings.error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Your access">
          <div className="text-sm">{user?.email}</div>
          <div className="mt-2 flex gap-2">{roles.map((r) => <span key={r} className={toneVariants({ tone: "primary" })}>{r}</span>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Roles are stored server-side. Admins manage the registry, imports and settings; Reviewers run tests and record review decisions.</p>
        </Panel>
        {config && (
          <Panel title="Verification service">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Verifier available</div>
                <p className="text-xs text-muted-foreground">Turn off to simulate an outage. Every evaluation then fails closed as PARTIAL_UNAVAILABLE.</p>
              </div>
              <Switch checked={config.verifier_available} disabled={!isAdmin}
                onCheckedChange={async (v) => {
                  try { await update({ data: { verifier_available: v } }); qc.invalidateQueries({ queryKey: ["app_settings"] }); toast.success(v ? "Verifier enabled" : "Verifier disabled — failing closed"); }
                  catch (e) { toast.error((e as Error).message); }
                }} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-muted-foreground">Model version</dt><dd className="font-mono">{config.model_version}</dd></div>
              <div><dt className="text-muted-foreground">Source bundle</dt><dd className="font-mono">{config.source_bundle_version}</dd></div>
            </dl>
          </Panel>
        )}
      </div>
      <Panel title="External evaluator adapter">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={toneVariants({ tone: "warning" })}>{disabledExternalEvaluator.name}</span>
          <span className="text-xs text-muted-foreground">No live model is called. Paste a request to dry-run it through the server-side guardrail engine.</span>
        </div>
        <Textarea className="min-h-72 font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <Button disabled={busy} onClick={async () => {
            setErr(null); setOut(null); setBusy(true);
            try { const r = await evaluate({ data: JSON.parse(payload) }); setOut(r.findings); }
            catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
          }}>{busy ? "Validating…" : "Validate request"}</Button>
          <Button variant="outline" onClick={() => setPayload(JSON.stringify(SAMPLE_ADAPTER_REQUEST, null, 2))}>Reset sample</Button>
        </div>
        {err && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-critical/10 p-3 text-xs text-critical">{err}</pre>}
        {out && (
          <div className="mt-4 space-y-2">
            {out.map((f, i) => (
              <div key={i} className="rounded-lg border p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2"><code>{f.finding_id ?? "(no id)"}</code><code>{f.rule_id}</code><DecisionBadge decision={f.guardrail_decision} /></div>
                <div className="mt-1 text-muted-foreground">{f.reason_codes.join(", ")} · {f.next_action}</div>
                <pre className="mt-2 overflow-x-auto rounded bg-muted p-2">{JSON.stringify(f, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
