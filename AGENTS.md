<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Keep content screens in the authenticated TanStack route subtree; public index and auth pages share a sign-in console so the application opens directly.
- Use the pure typed guardrail engine for all verification, invoked only through authenticated server functions; audited predicates release findings, unrestricted prose requires human review.
- Store application roles in protected user_roles rows; browser clients have read-only access to application records and verified server actions own privileged writes to prevent forged safety decisions.
- Append evaluation, review and note-version records; database triggers enforce immutability and atomically audit evaluation/review inserts without note text.
- Snapshot the registry with evaluations and verify SHA-256 passage integrity; historical evidence screens read the captured registry rather than current edits.
- Use a replaceable evaluator contract with no live model implementation; dry-run requests must match a persisted note version and registered profile before verification.
- Derive dashboard measurements from stored evaluations and paginate reads so repeated runs never silently truncate metrics.
- Preserve Group 2 original records in idempotent conflict-rejecting imports and four separate workbook models; mappings and expectations are not executions or approved payer sources.
- Keep Group 2 fixture inputs independent of expected decisions; persist execution provenance and exclude unavailable executions from pass rates to prevent imported expectations becoming results.
- Keep page walkthroughs in the shared PageGuide with route-specific content; links and control highlighting never execute writes so guidance cannot change test or review outcomes.
