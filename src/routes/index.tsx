import { createFileRoute } from "@tanstack/react-router";
import { SignInConsole } from "@/components/app/sign-in-console";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ABA Guardrail Studio — AI Safeguard Verification Console" },
      { name: "description", content: "Verify AI findings on synthetic ABA session notes: evidence grounding, rule applicability, citations and human review." },
      { property: "og:title", content: "ABA Guardrail Studio" },
      { property: "og:description", content: "Independent safeguard console that treats every AI finding as untrusted until verified." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignInConsole,
});

