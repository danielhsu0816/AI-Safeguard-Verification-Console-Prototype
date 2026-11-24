import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, CloudOff } from "lucide-react";
import type { CheckResult } from "@/lib/guardrail/types";

const ICON = {
  pass: <CheckCircle2 className="size-4 text-success" />,
  fail: <XCircle className="size-4 text-critical" />,
  warn: <AlertTriangle className="size-4 text-warning" />,
  skipped: <MinusCircle className="size-4 text-muted-foreground" />,
  unavailable: <CloudOff className="size-4 text-warning" />,
};

export function ChecksList({ checks }: { checks: CheckResult[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((c) => (
        <li key={c.key} className="flex gap-2.5 rounded-lg border border-border/70 bg-background/40 p-2.5">
          <span className="mt-0.5 shrink-0">{ICON[c.status]}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium">{c.label}</div>
            <div className="text-xs text-muted-foreground">{c.detail}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
