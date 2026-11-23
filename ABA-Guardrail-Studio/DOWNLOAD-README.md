# ABA Guardrail Studio — Download Package

This archive contains the current application source, UI assets, tests, dependency lockfile, database migration history, and the preserved Group 2 fixture and workbook models in src/lib/group2/source.json.

## Local development
1. Extract the archive.
2. Install Node.js and Bun.
3. Run `bun install` in the extracted application folder.
4. Configure the environment for your own hosting and backend before starting the app.
5. Run `bun run dev`; tests are available with `bun run test`.

## Important limits
- This is a source export, not a self-contained offline installer.
- Installed dependencies, generated build output, repository history, private credentials, and environment files are intentionally excluded.
- Live database rows, user accounts, sessions, and managed hosting configuration are not exported. The migration files describe database setup; they are not a backup of current data.
- The preserved Group 2 content is included as application data; original uploaded PDF/XLSX files are not bundled here.
- External-model execution remains unavailable. Synthetic research only; not clinically validated.
- Pending security findings remain pending. Packaging makes no changes to application access or security status.
- Review database setup and access policies before deploying outside Lovable. Configure backend and authentication separately; this archive does not provision them automatically.

For GitHub, copy these source files into a local checkout of your chosen repository. Do not commit private environment files or credentials.
