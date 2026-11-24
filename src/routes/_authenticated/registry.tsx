import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { AppShell, LoadState } from "@/components/app/app-shell";
import { StatusBadge, toneVariants } from "@/components/app/decision-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rulesQuery, sourcesQuery } from "@/lib/queries";
import { saveRule, saveSource } from "@/lib/guardrail.functions";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/registry")({
  head: () => ({ meta: [{ title: "Rule & Source Registry — ABA Guardrail Studio" }, { name: "description", content: "Managed rule and source records." }, { property: "og:title", content: "Rule & Source Registry — ABA Guardrail Studio" }, { property: "og:description", content: "Managed rule and source records." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RegistryPage,
});

const TYPE_TONE: Record<string, "primary" | "success" | "neutral" | "warning"> = { law: "primary", payer_requirement: "success", internal_policy: "neutral", proposed_safeguard: "warning" };
const TYPE_LABEL: Record<string, string> = { law: "Law", payer_requirement: "Payer requirement", internal_policy: "Internal policy", proposed_safeguard: "Proposed safeguard" };

function RegistryPage() {
  const rules = useQuery(rulesQuery);
  const sources = useQuery(sourcesQuery);
  const { isAdmin } = useAuth();
  const [rule, setRule] = useState<Partial<Tables<"rules">> | null>(null);
  const [source, setSource] = useState<Partial<Tables<"sources">> | null>(null);
  const srcType = (id: string | null) => sources.data?.find((s) => s.source_id === id)?.source_type;

  return (
    <AppShell title="Rule & Source Registry" description="Only approved, applicable sources may support a release decision. Unknown applicability yields ABSTAIN or REVIEW_REQUIRED — never an automatic compliance failure.">
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(TYPE_LABEL).map(([k, v]) => <span key={k} className={toneVariants({ tone: TYPE_TONE[k] })}>{v}</span>)}
      </div>
      <Tabs defaultValue="rules">
        <TabsList><TabsTrigger value="rules">Rules</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger></TabsList>
        <TabsContent value="rules" className="space-y-3">
          {isAdmin && <Button onClick={() => setRule({ status: "draft", check_type: "evidence_span", severity: "medium" })}><Plus className="size-4" /> New rule</Button>}
          <LoadState isLoading={rules.isLoading} error={rules.error} />
          <div className="surface overflow-x-auto">
            <Table>
              <TableHeader><TableRow>{["rule_id", "title", "category", "check_type", "severity", "applicability", "source", "effective", "status", "approved_by", "v", ""].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {rules.data?.map((r) => (
                  <TableRow key={r.rule_id}>
                    <TableCell className="font-mono text-xs">{r.rule_id}</TableCell>
                    <TableCell className="max-w-[220px]">{r.title}</TableCell>
                    <TableCell className="text-xs">{r.category}</TableCell>
                    <TableCell className="text-xs">{r.check_type.replace("_", " ")}</TableCell>
                    <TableCell className="text-xs capitalize">{r.severity}</TableCell>
                    <TableCell className="max-w-[180px] font-mono text-[11px]">{r.applicability ? JSON.stringify(r.applicability) : <span className={toneVariants({ tone: "warning" })}>unknown</span>}</TableCell>
                    <TableCell className="text-xs"><div className="font-mono">{r.source_id}</div>{srcType(r.source_id) && <span className={toneVariants({ tone: TYPE_TONE[(srcType(r.source_id) ?? "internal_policy")] })}>{TYPE_LABEL[(srcType(r.source_id) ?? "internal_policy")]}</span>}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{r.effective_from ?? "—"} → {r.effective_to ?? "open"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs">{r.approved_by}</TableCell>
                    <TableCell className="text-xs">{r.version}</TableCell>
                    <TableCell>{isAdmin && <Button size="icon" variant="ghost" aria-label="Edit rule" onClick={() => setRule(r)}><Pencil className="size-4" /></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="sources" className="space-y-3">
          {isAdmin && <Button onClick={() => setSource({ approval_status: "pending", source_type: "internal_policy", document_version: "1" })}><Plus className="size-4" /> New source</Button>}
          <LoadState isLoading={sources.isLoading} error={sources.error} />
          <div className="surface overflow-x-auto">
            <Table>
              <TableHeader><TableRow>{["source_id", "title", "type", "issuer", "jurisdiction", "payer", "service", "effective", "retrieved", "hash", "approval", "doc v", ""].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {sources.data?.map((s) => (
                  <TableRow key={s.source_id}>
                    <TableCell className="font-mono text-xs">{s.source_id}</TableCell>
                    <TableCell className="max-w-[240px]">{s.verified_url ? <a className="text-primary hover:underline" href={s.verified_url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</TableCell>
                    <TableCell><span className={toneVariants({ tone: TYPE_TONE[s.source_type] })}>{TYPE_LABEL[s.source_type]}</span></TableCell>
                    <TableCell className="text-xs">{s.issuing_organization}</TableCell>
                    <TableCell className="text-xs">{s.jurisdiction ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.payer ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.service_type ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.effective_date ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.retrieved_date ?? "—"}</TableCell>
                    <TableCell className="max-w-48 break-all font-mono text-[11px]">{s.passage_hash ?? s.content_hash}</TableCell>
                    <TableCell><StatusBadge status={s.approval_status} /></TableCell>
                    <TableCell className="text-xs">{s.document_version}</TableCell>
                    <TableCell>{isAdmin && <Button size="icon" variant="ghost" aria-label="Edit source" onClick={() => setSource(s)}><Pencil className="size-4" /></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      {rule && <RuleDialog initial={rule} sources={sources.data ?? []} onClose={() => setRule(null)} />}
      {source && <SourceDialog initial={source} onClose={() => setSource(null)} />}
    </AppShell>
  );
}

function TextField({ label, value, onChange, type = "text", disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} /></div>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1"><Label className="text-xs">{label}</Label>
      <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
const n = (v: string) => (v.trim() ? v.trim() : null);

function RuleDialog({ initial, sources, onClose }: { initial: Partial<Tables<"rules">>; sources: Tables<"sources">[]; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveRule);
  const isNew = !initial.rule_id;
  const a = initial.applicability as { payers?: string[]; service_types?: string[] } | null | undefined;
  const [f, setF] = useState({
    rule_id: initial.rule_id ?? "", title: initial.title ?? "", category: initial.category ?? "", check_type: initial.check_type ?? "evidence_span",
    severity: initial.severity ?? "medium", payers: a?.payers?.join(", ") ?? "", service_types: a?.service_types?.join(", ") ?? "",
    required_pattern: initial.required_pattern ?? "", source_id: initial.source_id ?? sources[0]?.source_id ?? "",
    effective_from: initial.effective_from ?? "", effective_to: initial.effective_to ?? "", status: initial.status ?? "draft", approved_by: initial.approved_by ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "New rule" : `Edit ${initial.rule_id}`}</DialogTitle><DialogDescription>Saving increments the version. Leave payers or service types empty to mark applicability as unknown.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="rule_id" value={f.rule_id} onChange={set("rule_id")} disabled={!isNew} />
          <TextField label="title" value={f.title} onChange={set("title")} />
          <TextField label="category" value={f.category} onChange={set("category")} />
          <SelectField label="check_type" value={f.check_type} onChange={set("check_type")} options={["evidence_span", "required_element", "judgment"]} />
          <SelectField label="severity" value={f.severity} onChange={set("severity")} options={["low", "medium", "high", "critical"]} />
          <SelectField label="source_id" value={f.source_id} onChange={set("source_id")} options={sources.map((s) => s.source_id)} />
          <TextField label="applicable payers (comma, * = all)" value={f.payers} onChange={set("payers")} />
          <TextField label="applicable service types (comma, * = all)" value={f.service_types} onChange={set("service_types")} />
          <TextField label="required_pattern (regex, required elements)" value={f.required_pattern} onChange={set("required_pattern")} />
          <SelectField label="status" value={f.status} onChange={set("status")} options={["draft", "active", "retired"]} />
          <TextField label="effective_from" type="date" value={f.effective_from} onChange={set("effective_from")} />
          <TextField label="effective_to" type="date" value={f.effective_to} onChange={set("effective_to")} />
          <TextField label="approved_by" value={f.approved_by} onChange={set("approved_by")} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const payers = list(f.payers), st = list(f.service_types);
            try {
              await save({ data: {
                rule_id: f.rule_id.trim(), title: f.title, category: f.category, check_type: f.check_type as "judgment", severity: f.severity as "low",
                applicability: payers.length && st.length ? { payers, service_types: st } : null, required_pattern: n(f.required_pattern),
                source_id: f.source_id, effective_from: n(f.effective_from), effective_to: n(f.effective_to), status: f.status as "draft", approved_by: n(f.approved_by),
              } });
              toast.success("Rule saved"); qc.invalidateQueries({ queryKey: ["rules"] }); onClose();
            } catch (e) { toast.error(friendly(e)); }
          }}>Save rule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function friendly(e: unknown) {
  const m = (e as Error).message;
  try { const j = JSON.parse(m); if (Array.isArray(j)) return j.map((i: { path?: string[]; message: string }) => `${i.path?.join(".")}: ${i.message}`).join("; "); } catch { /* not zod */ }
  return m;
}

function SourceDialog({ initial, onClose }: { initial: Partial<Tables<"sources">>; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveSource);
  const isNew = !initial.source_id;
  const keys = ["source_id", "title", "issuing_organization", "jurisdiction", "payer", "service_type", "verified_url", "effective_date", "retrieved_date", "content_hash", "document_version"] as const;
  const [f, setF] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = { source_type: initial.source_type ?? "internal_policy", approval_status: initial.approval_status ?? "pending", approved_passage: initial.approved_passage ?? "" };
    for (const k of keys) o[k] = (initial[k] as string | null | undefined) ?? "";
    return o;
  });
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "New source" : `Edit ${initial.source_id}`}</DialogTitle><DialogDescription>Use fictional or publicly verifiable references only.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {keys.map((k) => <TextField key={k} label={k} type={k.endsWith("_date") ? "date" : "text"} value={f[k] ?? ""} onChange={set(k)} disabled={k === "source_id" && !isNew} />)}
          <SelectField label="source_type" value={(f["source_type"] ?? "")} onChange={set("source_type")} options={["law", "payer_requirement", "internal_policy", "proposed_safeguard"]} />
          <SelectField label="approval_status" value={(f["approval_status"] ?? "")} onChange={set("approval_status")} options={["pending", "approved", "rejected"]} />
        </div>
        <div className="space-y-1"><Label className="text-xs">approved_passage</Label><Textarea value={f["approved_passage"]} onChange={(e) => set("approved_passage")(e.target.value)} /></div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            try {
              await save({ data: {
                source_id: (f["source_id"] ?? "").trim(), title: (f["title"] ?? ""), issuing_organization: (f["issuing_organization"] ?? ""), source_type: f["source_type"] as "law",
                jurisdiction: n((f["jurisdiction"] ?? "")), payer: n((f["payer"] ?? "")), service_type: n((f["service_type"] ?? "")), verified_url: n((f["verified_url"] ?? "")),
                effective_date: n((f["effective_date"] ?? "")), retrieved_date: n((f["retrieved_date"] ?? "")), content_hash: n((f["content_hash"] ?? "")),
                approval_status: f["approval_status"] as "pending", document_version: f["document_version"] || "1", approved_passage: n((f["approved_passage"] ?? "")),
              } });
              toast.success("Source saved"); qc.invalidateQueries({ queryKey: ["sources"] }); onClose();
            } catch (e) { toast.error(friendly(e)); }
          }}>Save source</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
