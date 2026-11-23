import { createFileRoute } from "@tanstack/react-router";
import { SignInConsole } from "@/components/app/sign-in-console";
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ABA Guardrail Studio" },
      { name: "description", content: "Sign in to the ABA Guardrail Studio safeguard verification console." },
      { property: "og:title", content: "Sign in — ABA Guardrail Studio" },
      { property: "og:description", content: "Reviewer and admin access to the safeguard console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignInConsole,
});

