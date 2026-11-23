import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FlaskConical, ScanSearch, BookLock, ClipboardCheck, ScrollText, GitCompare, Settings, LogOut, ShieldCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageGuide } from "@/components/app/page-guide";

const NAV = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Test Case Laboratory", url: "/tests", icon: FlaskConical },
  { title: "Evidence Verification", url: "/verify", icon: ScanSearch },
  { title: "Rule & Source Registry", url: "/registry", icon: BookLock },
  { title: "Group 2 Reference Models", url: "/group2", icon: BookLock },
  { title: "Human Review Queue", url: "/review", icon: ClipboardCheck },
  { title: "Revision Comparison", url: "/revisions", icon: GitCompare },
  { title: "Audit Trail", url: "/audit", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function PrototypeBanner() {
  return (
    <div role="note" className="border-b bg-secondary text-secondary-foreground text-center text-xs font-medium py-1.5 px-4">
      Research Prototype — Synthetic Data Only — Not Clinically Validated
    </div>
  );
}

export function AppShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const path = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).pathname });
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <div className="flex items-center gap-2">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-4" /></div>
              <div className="leading-tight group-data-[collapsible=icon]:hidden">
                <div className="text-sm font-semibold text-sidebar-accent-foreground">ABA Guardrail Studio</div>
                <div className="text-[11px] text-sidebar-foreground/70">Safeguard verification console</div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((n) => (
                    <SidebarMenuItem key={n.url}>
                      <SidebarMenuButton asChild isActive={path.startsWith(n.url)} tooltip={n.title}>
                        <Link to={n.url}><n.icon /><span>{n.title}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="group-data-[collapsible=icon]:hidden">
            <div className="rounded-lg bg-sidebar-accent p-3 text-xs">
              <div className="truncate text-sidebar-accent-foreground">{user?.email}</div>
              <div className="mt-0.5 text-sidebar-foreground/70">{isAdmin ? "Admin · Reviewer" : "Reviewer"}</div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <PrototypeBanner />
          <header className="flex h-14 items-center gap-3 border-b border-border/70 px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <PageGuide key={path} path={path} isAdmin={isAdmin} />
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </header>
          <main className="flex-1 px-4 py-8 md:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                  {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function Panel({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`surface p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadState({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (isLoading) return <div className="surface animate-pulse p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="surface border-critical/40 p-6 text-sm text-critical">Could not load data: {(error as Error).message}</div>;
  return null;
}
