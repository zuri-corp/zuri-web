# Deploying ZURI

ZURI is now a single standalone application. Open `ZURI.code-workspace` in VS Code and work only in `ZURI-2026-10-30/zuri-app-prototype`.

Supabase hosts the shared accounts, records, storage and Edge Functions for project `eghtvbqzytyxsdgvwkge`. The database migrations and Edge Function source live alongside the app so there is one tracked codebase.

| Vercel project | Root directory | Framework | Build |
| --- | --- | --- | --- |
| `zuri-app-prototype` | `ZURI-2026-10-30/zuri-app-prototype` | Vite | `npm run build` → `dist` |

Connect that one Vercel project to `zuri-corp/zuri-web`. Do not set a monorepo root or enable source files outside the root directory.

The public Supabase connection is already included for the app. If it must be overridden, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` together. Do not add server credentials, provider keys or Supabase secret keys as `VITE_*` values. Leave `VITE_ZURI_API_BASE` unset unless a trusted same-origin proxy is deliberately deployed.

Deploy schema and Edge Functions separately from frontend releases. Database SQL is under `zuri-app-prototype/database`; Edge Functions and their deployment source are under `zuri-app-prototype/supabase`. Apply only unapplied migrations, in order. Keep Supabase Auth redirect URLs and `ZURI_ALLOWED_ORIGINS` limited to the live app domain(s) you use.

The retired corporate website remains recoverable from Git history but is no longer part of the active codebase or release process.
