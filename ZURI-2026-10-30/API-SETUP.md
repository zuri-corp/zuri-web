# API and deployment checklist

## Choose a first test

Run the website and embedded app together on localhost:3015. Complete a real user sign-in yourself, create a private task, reload, sign out, and confirm another account cannot read it. Do not use seeded identities as authentication. Test a consented Space draft, review/publication rules, invitation acceptance and private files. A successful health check alone does not certify these flows.

## Integration status and settings

| Integration | Included | Required before activation |
| --- | --- | --- |
| Supabase | Existing schema, Auth/RLS domain operations, private media, three deployed functions | Public project URL/key; actual verified account; OTP email template/delivery; exact origins and redirects |
| Website administration | Existing reviewed publishing and enquiries | Server-only `SUPABASE_SECRET_KEY`, `SUPABASE_URL`, explicit real admin role; no admin auto-grant |
| X opportunity discovery | Bounded shared recent-search worker, deduplication, budgets, review queue | Server `X_BEARER_TOKEN`; approved reviewed sources; source permissions and actual provider prices; database policy budgets; authenticated scheduler |
| Google Maps | Admin-only metered geocoding reduced to Place ID | Restricted server `GOOGLE_MAPS_SERVER_KEY`; `ZURI_MAPS_PERMITTED=true`; `ZURI_MAPS_REQUEST_MICROS`; approved cost policy and attribution |
| Quicket | Disabled registry entry and external links | Permitted API access/coverage, credentials and an implemented/tested connector; a key alone does not enable it |
| OpenAI / Viola | Canonical metered gateway, reviewed input, knowledge, strict intent contracts | Fresh server-only provider key, approved model names/current prices, verified account allowance and explicit execution activation |
| Studio Tools | SDK, contracts, approval/install/budget schema | Real accounts/admin review and separately enabled permitted tools; no arbitrary Tool execution |
| Payments / native push | Not activated | Provider choice, implementation, credentials and verified webhook/permission flows |

Never put provider keys, worker secrets or Supabase service secrets in `NEXT_PUBLIC_*`, `VITE_*`, source files, mobile bundles or the ZIP. Public Supabase publishable keys are designed for clients; database authorization must still enforce access. Full settings are in `zuri-web/.env.example`. Standalone app public configuration is described by the app export-status record.

The standalone app's public project URL and publishable key are in `zuri-app-prototype/src/data/publicBackend.json`. These are public connection settings, not secret credentials. Change them and rebuild if using a different inspected Supabase project. The embedded edition uses the website's same-origin account routes. `VITE_ZURI_API_BASE` is a public URL setting, never a place for a secret; cross-origin cookie sessions require deliberate CORS and CSRF configuration and are not automatically supplied by a new address.

Marketplace tool cards (including QuickBooks and other vendors) are official product links and ZURI setup offers. They do not imply accounting OAuth, vendor resale permission or connected access to customer accounts. Those would require separate integrations.

## Supabase and functions

Existing project: `https://eghtvbqzytyxsdgvwkge.supabase.co`. Migrations 001–010 were applied manually; preserve the audit ledger and existing budget rows. Do not reset usage or manufacture verified users. Proposal 011 adds the shared onboarding fields and has not been applied; review it against the live schema before applying it manually.

Set `ZURI_ALLOWED_ORIGINS` in Supabase function secrets to a comma-separated exact allowlist of your website/app origins, including localhost ports used for testing. A new Vercel address will otherwise be rejected. This is a function environment setting, distinct from Auth redirect URLs. Configure the actual website Site URL and needed redirect URLs in Supabase Auth, and the supplied email template/SMTP. Keep private buckets private.

Website email sign-in uses an eight-digit one-time code. In Supabase Auth → Email Templates, configure the Magic Link template to include `{{ .Token }}`; the prepared template is `zuri-web/supabase/email-templates/magic-link.html`. The configured SMTP provider must deliver the message to the user's inbox.

Source functions perform mandatory verified-user checks for private operations. Dashboard legacy JWT settings were left unchanged; existing public-key health and denial checks passed. If a real signed-in request exposes an incompatibility, investigate it before changing authentication settings. Do not change them simply because a sample CLI config differs.

For future function updates, install both projects, then run `node scripts/build-edge-functions.mjs` inside `zuri-web`. It generates three standalone bundles under `supabase/deploy` from canonical code. For shared profile saves, apply reviewed proposal 011 first, then deploy the updated `zuri-api` bundle; deployment is not performed automatically by a website build. Platform-provided service credentials remain in Supabase. Never copy a deployed server secret into the app.

## Opportunity engine activation sequence

1. Configure a real website admin and the server-only Supabase settings.
2. Review source accounts against their official organizations. Add approved sources through `/admin/opportunities`; do not guess handles or seed fake opportunities.
3. Confirm the X account's endpoint entitlement, terms, deletion/compliance process and cost. Configure `X_BEARER_TOKEN`, an independently generated worker secret of at least 32 characters, and bounded request/cost reservations through the admin policy.
4. Set `ZURI_OPPORTUNITIES_ENABLED=true` only after the preceding checks. The database policy/source switches are separate gates. They begin disabled/limited; environment variables alone do not activate them.
5. Have a trusted scheduler POST `/api/workers/opportunities` with `Authorization: Bearer <worker secret>`. Never expose this credential in a URL or browser. No scheduler is installed by this archive. Cadence must fit the provider and configured caps.
6. Review collected evidence, links, freshness and geographic relevance. Publish through moderation; the worker does not automatically publish. Confirm `/api/opportunities` and the app show genuine, fresh results with source attribution. Keep useful empty/error states where there is no coverage.
7. Configure Google venue lookup only if needed; it enriches reviewed venues and does not supply a directory or create a claimed Space. Quicket remains disabled pending a separate implementation.

Optional AI extraction has a separate `ZURI_OPPORTUNITY_AI_ENABLED` gate and metered model/rate settings. Leave it false initially. Keep cleanup scheduling operational if ingestion is later paused, per the opportunity-engine retention documentation.

## OpenAI activation follows real sources

Leave `ZURI_AI_ENABLED=false`. The key previously exposed in chat must not be reused. Later, store a fresh provider key and verified model/rate settings in the trusted execution environment where inference runs (Supabase Edge for forwarded gateway requests). A Vercel key does not automatically reach Edge functions. Prices are explicit micro-USD per million tokens; do not invent them. The chosen pilot allowance is USD3/month and fleet USD5/day; these are provider-cost caps, not retail subscriptions or payment collection. No automatic admin role or other-account trial is granted. AI retrieval currently covers approved public ZURI knowledge; arbitrary private workspace access, external search and Tool execution are not implied by supplying a key.

## Vercel website deployment

Import the extracted source into your own repository, then create a Next.js Vercel project with Root Directory `zuri-web`. Use its locked dependencies, Build Command `npm run build -- --webpack`, and the default Next.js output. The ZIP already contains the embedded app assets; this build does not require Vercel to read the sibling app. After changing the app later, rebuild the embedded edition from the full bundle and commit its generated public assets before deploying, or intentionally configure a monorepo build that installs both projects.

Copy public/testing settings and the necessary server-only settings into the appropriate Vercel environment. Set `NEXT_PUBLIC_SITE_URL` to your real HTTPS address. Environment changes require a new deployment; public build-time values must be set before building. Register that exact origin in function CORS settings and Supabase Auth. Never upload `.env.local` to the repository. Use a server-capable Next.js deployment: static-file hosting cannot run these API routes.

A standalone app deployment is separate: build `zuri-app-prototype` and serve its `dist` directory through HTTP/HTTPS, with deliberate public configuration and permitted function origins. The embedded `/app` edition is the recommended first external test. This is a web app/PWA source handoff, not an Android APK or iOS IPA.

## References

- Vercel monorepo roots: https://vercel.com/docs/monorepos/monorepo-faq
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Supabase function CORS: https://supabase.com/docs/guides/functions/cors
- Supabase function authentication: https://supabase.com/docs/guides/functions/auth
- Source-specific permissions and technical links: `zuri-web/docs/OPPORTUNITY-ENGINE.md`
