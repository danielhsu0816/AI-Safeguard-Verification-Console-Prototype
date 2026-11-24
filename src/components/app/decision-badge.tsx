import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DECISION_INFO, type Decision } from "@/lib/guardrail/types";

export const toneVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    tone: {
      success: "bg-success/12 text-success border-success/30",
      warning: "bg-warning/15 text-warning-foreground border-warning/40",
      critical: "bg-critical/12 text-critical border-critical/30",
      primary: "bg-primary/10 text-primary border-primary/30",
      neutral: "bg-muted text-muted-foreground border-border",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function DecisionBadge({ decision, className }: { decision: string | null | undefined; className?: string }) {
  if (!decision) return <span className={cn(toneVariants({ tone: "neutral" }), className)}>—</span>;
  const info = DECISION_INFO[decision as Decision];
  return (
    <span title={info?.description} className={cn(toneVariants({ tone: info?.tone ?? "neutral" }), "font-mono", className)}>
      {decision}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const tone = status === "pass" || status === "approved" || status === "active" || status === "reviewed" ? "success"
    : status === "fail" || status === "rejected" || status === "retired" ? "critical"
    : status === "needs_review" || status === "pending" || status === "draft" ? "warning" : "neutral";
  const label = status === "not_executed" ? "Not Run" : status === "pass" ? "Expected match" : status === "fail" ? "Expected mismatch" : status === "unavailable" ? "Not assessable" : (status ?? "—").replace(/_/g, " ");
  return <span className={toneVariants({ tone })}>{label}</span>;
}
