import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleHelp, LocateFixed, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { guideForPath } from "@/lib/page-guides";

const PREFERENCE_KEY = "aba-page-guides-auto-v1";
const HIGHLIGHT_CLASSES = ["ring-4", "ring-primary", "ring-offset-4", "ring-offset-background"];

export function PageGuide({ path, isAdmin = false }: { path: string; isAdmin?: boolean }) {
  const guide = guideForPath(path);
  const routeReady = useRouterState({ select: (state) => state.status === "idle" && !state.isLoading });
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [autoShow, setAutoShow] = useState(true);
  const pendingFocus = useRef<HTMLElement | null>(null);
  const highlighted = useRef<HTMLElement | null>(null);
  const highlightTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!routeReady) return;
    const seenKey = `aba-page-guide-seen-v1:${path === "/" ? "/auth" : path}`;
    try {
      const enabled = localStorage.getItem(PREFERENCE_KEY) !== "off";
      setAutoShow(enabled);
      if (enabled && !sessionStorage.getItem(seenKey)) {
        setOpen(true);
        sessionStorage.setItem(seenKey, "seen");
      }
    } catch {
      // Help remains available manually when browser storage is blocked.
    }
    return () => {
      window.clearTimeout(highlightTimer.current);
      highlighted.current?.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [path, routeReady]);

  if (!guide) return null;
  const step = guide.steps[stepIndex];
  if (!step) return null;
  const control = step.control;
  const last = stepIndex === guide.steps.length - 1;

  function showControl() {
    if (!control) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>(control.selector)).find((element) =>
      element.getClientRects().length > 0 && (!control.text || element.textContent?.trim() === control.text),
    );
    if (!target) {
      toast.info("That control is not visible in this view. Follow the step to select the relevant tab or case first.");
      return;
    }
    pendingFocus.current = target;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0"><CircleHelp className="size-4" /> Page guide</Button>
      </DialogTrigger>
      <DialogContent
        className="grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg p-0"
        onCloseAutoFocus={(event) => {
          const target = pendingFocus.current;
          if (!target) return;
          event.preventDefault();
          pendingFocus.current = null;
          highlighted.current?.classList.remove(...HIGHLIGHT_CLASSES);
          window.clearTimeout(highlightTimer.current);
          target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          target.focus({ preventScroll: true });
          target.classList.add(...HIGHLIGHT_CLASSES);
          highlighted.current = target;
          highlightTimer.current = window.setTimeout(() => target.classList.remove(...HIGHLIGHT_CLASSES), 5000);
          toast.info("Control highlighted. Reopen Page guide to continue.");
        }}
      >
        <DialogHeader className="border-b bg-secondary/60 px-6 py-5 pr-12 text-left">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-primary"><BookOpen className="size-4" /> Workspace guide</div>
          <DialogTitle className="leading-snug">{guide.title}</DialogTitle>
          <DialogDescription>What would you like to do?</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <nav aria-label="Guide steps" className="mb-6 grid gap-1 sm:grid-cols-2">
            {guide.steps.map((item, index) => (
              <Button key={item.title} variant={index === stepIndex ? "secondary" : "ghost"} className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left text-xs" aria-current={index === stepIndex ? "step" : undefined} onClick={() => setStepIndex(index)}>
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-current/25 text-[11px] tabular-nums">{index + 1}</span>
                <span>{item.title}</span>
              </Button>
            ))}
          </nav>
          <div className="space-y-4">
            <p aria-live="polite" aria-atomic="true" className="text-xs font-medium text-primary">Step {stepIndex + 1} of {guide.steps.length} · {step.title}</p>
            <h3 className="text-lg font-semibold leading-snug">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed marker:text-primary">
              {step.instructions.map((instruction) => <li key={instruction} className="pl-1">{instruction}</li>)}
            </ol>
            {step.caution && <p className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs leading-relaxed text-foreground">{step.caution}</p>}
            <div className="flex flex-wrap gap-2">
              {control && (!control.adminOnly || isAdmin) && <Button variant="outline" size="sm" onClick={showControl}><LocateFixed className="size-4" /> Show me where</Button>}
              {control?.adminOnly && !isAdmin && <p className="text-xs text-muted-foreground">An administrator is required for this action.</p>}
              {step.destination && <Button variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal text-left" asChild><Link to={step.destination} onClick={() => setOpen(false)}>{step.destinationLabel}<ArrowRight className="size-4 shrink-0" /></Link></Button>}
            </div>
          </div>
          <div className="mt-6 border-t pt-3">
            {guide.questions.map((item) => <details key={item.question} className="border-b py-3 text-sm"><summary className="cursor-pointer font-medium focus-visible:outline-ring">{item.question}</summary><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p></details>)}
          </div>
        </div>
        <div className="space-y-3 border-t bg-muted/30 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => index - 1)}><ArrowLeft className="size-4" /> Back</Button>
            <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Not now</Button><Button size="sm" onClick={() => last ? setOpen(false) : setStepIndex((index) => index + 1)}>{last ? <><Check className="size-4" /> Done</> : <>Next step<ArrowRight className="size-4" /></>}</Button></div>
          </div>
          <div className="flex items-center gap-2"><Switch id={`auto-guide-${path.replaceAll("/", "-")}`} checked={autoShow} onCheckedChange={(enabled) => { setAutoShow(enabled); try { localStorage.setItem(PREFERENCE_KEY, enabled ? "on" : "off"); } catch { /* Session-only preference when storage is blocked. */ } }} /><label htmlFor={`auto-guide-${path.replaceAll("/", "-")}`} className="text-xs text-muted-foreground">Open guides on first page visit</label></div>
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Synthetic data only · Research prototype · Not clinically validated</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}