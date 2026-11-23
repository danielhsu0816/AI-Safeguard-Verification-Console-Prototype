import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PageGuide } from "@/components/app/page-guide";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ABA Guardrail Studio" },
      { name: "description", content: "Choose a new password for ABA Guardrail Studio." },
      { property: "og:title", content: "Reset password — ABA Guardrail Studio" },
      { property: "og:description", content: "Choose a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="mb-4 flex justify-end"><PageGuide path="/reset-password" /></div>
      <form className="surface space-y-4 p-8" onSubmit={async (e) => {
        e.preventDefault();
        if (!recovery) return void toast.error("Open the password recovery link from your email.");
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) return void toast.error(error.message);
        toast.success("Password updated");
        navigate({ to: "/dashboard" });
      }}>
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        {!recovery && <p className="text-sm text-muted-foreground">Open the password recovery link sent to your email.</p>}
        <Button type="submit" className="w-full" disabled={!recovery}>Update password</Button>
      </form>
    </div>
  );
}
