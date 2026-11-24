import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { PrototypeBanner } from "@/components/app/app-shell";
import { PageGuide } from "@/components/app/page-guide";

function GoogleG() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

export function SignInConsole() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset email sent.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) { toast.error(String(r.error.message ?? r.error)); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen">
      <PrototypeBanner />
      <div className="flex justify-end px-6 pt-4"><PageGuide path="/auth" /></div>
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="flex items-center gap-3 text-primary"><ShieldCheck className="size-9 shrink-0" /><h1 className="text-2xl font-semibold">ABA Guardrail Studio</h1></div>
        <div className="surface mt-6 p-8">
          <h2 className="text-xl font-semibold">{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">The first account becomes Admin; later accounts are Reviewers.</p>
          {mode !== "forgot" && (
            <div className="mt-6 grid gap-2">
              <Button type="button" variant="google" onClick={() => oauth("google")}><GoogleG /> Continue with Google</Button>
              <Button type="button" variant="outline" onClick={() => oauth("lovable")}><LovableMark /> Continue with Lovable</Button>
              <div className="my-2 text-center text-xs text-muted-foreground">or with email</div>
            </div>
          )}
          <form onSubmit={submit} className="mt-2 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {mode !== "forgot" && (
              <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <Button variant="link" size="sm" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Have an account? Sign in" : "Create an account"}</Button>
            {mode === "signin" && <Button variant="link" size="sm" onClick={() => setMode("forgot")}>Forgot password?</Button>}
            {mode === "forgot" && <Button variant="link" size="sm" onClick={() => setMode("signin")}>Back</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
