import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/app-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { group2RulesQuery, group2InterfaceQuery, group2DecisionsQuery, group2AcceptanceQuery } from "@/lib/queries";
import { PROVISIONAL } from "@/lib/group2/import";

export const Route = createFileRoute("/_authenticated/group2")({
  head: () => ({ meta: [{ title: "Group 2 Reference Models — ABA Guardrail Studio" }, { name: "description", content: "Original Group 2 rule map, interface contract, decision mapping and proposed acceptance criteria." }, { property: "og:title", content: "Group 2 Reference Models — ABA Guardrail Studio" }, { property: "og:description", content: "Preserved workbook mappings and provisional acceptance criteria for synthetic verification." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(group2RulesQuery), context.queryClient.ensureQueryData(group2InterfaceQuery), context.queryClient.ensureQueryData(group2DecisionsQuery), context.queryClient.ensureQueryData(group2AcceptanceQuery)]); },
  component: Group2Models,
});

function Grid({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto border bg-card"><Table><TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className={j === 0 ? "align-top font-mono text-xs" : "min-w-40 whitespace-normal align-top text-sm"}>{cell}</TableCell>)}</TableRow>)}{!rows.length && <TableRow><TableCell colSpan={headers.length}>No workbook records imported.</TableCell></TableRow>}</TableBody></Table></div>;
}
function Group2Models() {
  const rules = useSuspenseQuery(group2RulesQuery).data;
  const fields = useSuspenseQuery(group2InterfaceQuery).data;
  const decisions = useSuspenseQuery(group2DecisionsQuery).data;
  const acceptance = useSuspenseQuery(group2AcceptanceQuery).data;
  return <AppShell title="Group 2 Reference Models" description={PROVISIONAL}>
    <Tabs defaultValue="rules"><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="rules">Rule map · {rules.length}</TabsTrigger><TabsTrigger value="interface">Group 1 interface · {fields.length}</TabsTrigger><TabsTrigger value="decisions">Decision map · {decisions.length}</TabsTrigger><TabsTrigger value="acceptance">Acceptance tests · {acceptance.length}</TabsTrigger></TabsList>
      <TabsContent value="rules"><Grid headers={["Rule ID", "Original Group 1 wording", "Method", "Priority", "Validation boundary"]} rows={rules.map((r) => [r.rule_id, r.original_wording, r.method, r.default_priority, r.validation_boundary])} /></TabsContent>
      <TabsContent value="interface"><Grid headers={["Layer", "Field", "Type / values", "Group 2 use"]} rows={fields.map((r) => [r.layer, r.field_name, r.type_values, r.group2_use])} /></TabsContent>
      <TabsContent value="decisions"><Grid headers={["Decision", "Display label", "Explanation visibility", "Next action", "Group 3 processing"]} rows={decisions.map((r) => [r.decision, r.ui_label, r.show_explanation, r.next_action, r.group3_processing])} /></TabsContent>
      <TabsContent value="acceptance"><Grid headers={["Test ID", "Criterion", "Expected", "Owner", "Review", "Execution"]} rows={acceptance.map((r) => [r.test_id, r.criterion, r.expected, r.owner, r.review_status, "Not Run"])} /></TabsContent>
    </Tabs>
  </AppShell>;
}