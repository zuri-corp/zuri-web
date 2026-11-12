# Deploying ZURI

Open `ZURI.code-workspace` in VS Code. GitHub holds the two frontends in this repository, while Supabase hosts the shared accounts, records, storage, and Edge Functions for project `eghtvbqzytyxsdgvwkge`.

| Vercel project | Root directory | Framework | Build |
| --- | --- | --- | --- |
| `zuri-preview-2026-10-30` | `ZURI-2026-10-30/zuri-web` | Next.js | `npm run build` |
| `zuri-app-prototype` | `ZURI-2026-10-30/zuri-app-prototype` | Vite | `npm run build:standalone` → `dist` |

Connect both Vercel projects to `zuri-corp/zuri-web`. Enable **Include source files outside of the Root Directory** for the website. The website builds its `/app` experience from the sibling app source, so both deployments use the same app code. The standalone deployment signs in against Supabase and calls the authenticated ZURI Edge Functions. It does not require a browser request to the website’s private API.

For the website, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` for the intended environment. Set server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the website project when enabling server features that require them. Use `zuri-web/.env.example` for optional feature flags and gateway settings. Configure hosted AI credentials in the server environment or Supabase Edge Function secrets, depending on the configured gateway.

For the standalone app, the repo includes the current public Supabase connection. Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` together when overriding it. Keep `VITE_ZURI_API_BASE` unset for the standalone Vercel project. Never expose Supabase server credentials or AI provider keys as `VITE_*` values. Keep Edge CORS origins and Supabase Auth redirect URLs limited to the app and website hosts you actually use.

Keep database SQL and Edge Function source under `zuri-web/database` and `zuri-web/supabase`. Deploy schema and Edge Functions separately from frontend releases. Apply only unapplied migrations, in order. The current shared project already has migrations 019–021 applied.
