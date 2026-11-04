# ZURI CORE Opportunity Engine V1

## Inspection and integration boundaries — 28 October 2026

The inspected working trees are `zuri-web` (Next.js 16.4, React, TypeScript, Tailwind, Supabase backend) and `zuri-app-prototype` (active React/Vite mobile Experience). The app is packaged into the website by the existing `build:app` script. The older `src/apps` screens are inactive and were preserved.

Existing canonical account sessions use `createServerSupabaseClient`; administration independently checks `admin_users`. Existing AI uses the metered server gateway. Existing app Motion tasks, Aura discovery, Viola consent and local backups were preserved. Select remains the editorial system; ingestion does not publish to Select or write to private Lore. Existing published, consented website Space slugs are checked before Space linking. App seed Space IDs are not live website identities.

Only `.env.example` was present in the website directory. No live Supabase schema, deployed permissions, credentials, provider entitlements, production data, billing or scheduler was inspected or changed. Database findings refer to source migrations and isolated PostgreSQL tests, not production verification. Files under `sources/` remain read-only.

## Built

- Connector registry limited to X, Google Maps and disabled Quicket. One scheduled X page serves all users; browsing never fetches a user's raw X data.
- Admin-approved trusted account monitoring through `from:` recent-search queries. Narrow location/keyword searches accept only reviewed grammar. Requests fetch 10 posts with sparse fields, exclude replies/reposts, and carry `since_id` and pagination cursors.
- Durable source lease, atomic checkpoint/evidence/draft commit, deduplication, backoff, conservative daily request and USD-micro cost reservations. An unfinished pagination chain retains its original `since_id` and first-page newest ID. Reservations survive ambiguous failures. Cadence and indexed published results act as the shared discovery cache.
- Candidate filtering before optional AI; persistent fingerprint checks before metered extraction. At most one AI extraction per shared tick. Reuses the existing OpenAI provider transport, sends only the bounded public source excerpt, sets `store:false`, reserves an input/output upper bound first and accepts only exact evidence excerpts. Unknown dates, eligibility and official verification remain unset. AI cannot publish.
- Canonical opportunities for event/job/scholarship/grant/offer/service/collaboration/community, provenance/evidence records and graph edges to Spaces, venues, organizations, Societies and other opportunities. Confidence describes review confidence, not a statistical probability. Candidate classification is heuristic and needs review.
- Opportunity moderation and explicit human official-link checking. A related URL alone is never marked verified. Publication requires an admin evidence review; freshness is bounded to the original 24-hour candidate window. Duplicate sightings do not silently renew publication. Changed source content withdraws the old published version into review.
- Explicit-interest/location ranking over shared indexed rows. No inferred private interests, GPS or Lore. Optional signed-in preferences and saves use owner RLS. Current discovery view filters remain in memory. The API returns at most 100 recently reviewed matches; it is not exhaustive coverage.
- Motion Planner/Events and Aura Find entry points, source attribution, refreshed/expiry timestamps, confidence, reviewed Space links, Google Maps venue links and external source/registration links. App save creates an idempotent device-local follow-up task; website save writes the account opportunity collection. Neither books, pays, applies or sends messages. Device tasks are not Supabase Planner synchronization.
- Admin source controls, review queue, venue lookup, graph linking, cost/quality summaries and audit records. Cost totals are conservative reservations, not provider invoices. Google responses are reduced to a Place ID; formatted addresses, coordinates and raw geocoding responses are not retained or indexed.
- Additive migration `database/proposals/007_opportunity_engine.sql`, RLS, server-only functions, scheduled worker endpoint, isolated database and connector/security tests. No existing schema is replaced.

## Not activated / blocked

- Migration 007 is NOT applied to a live database. RLS and authorization need staging verification against the deployed schema.
- X needs server credentials, the app's confirmed endpoint/operator entitlement, provider unit pricing, approved source permissions and applicable retention/deletion obligations. No live retrieval was performed. No fixed provider price is assumed.
- Google Maps requires restricted server credentials, confirmed billing, a licensed use review and a configured per-call cost. The implemented lookup is an explicit admin venue action, not bulk enrichment. No Google coordinates are copied into a competing venue database or displayed on a non-Google map.
- Quicket has an official developer portal, but that does not establish ZURI's permitted discovery use or Ugandan coverage. Its adapter deliberately throws a disabled reason. No scraping, ticket inventory, embedded checkout or ticket sales are implemented.
- Optional user X OAuth is not enabled: there is no connect button, token storage or claimed home-timeline access. A conservative verified-scope contract exists, but a real PKCE/state flow, secure token vault, revocation handling and the app's exact permitted endpoints require a separate reviewed activation. Shared public discovery does not depend on user OAuth.
- Optional extraction needs the existing provider key, an approved model and verified token rates; off by default. Output acceptance establishes literal source support, not truth or complete semantic understanding. Human moderation remains required.
- Official-source checking is human review through explicit source links. Automatic arbitrary-URL fetching is intentionally absent to avoid unbounded crawling and SSRF. There is no claim to exhaustive web coverage, guaranteed opportunities, real-time availability or verified credentials.
- A hosted scheduler, provider deletion-event/compliance integration, automatic official-link revalidation, live Supabase Planner sync and production browser/account acceptance are not deployed. Daily retention cleanup must remain scheduled even if ingestion is paused.

## Activation and scheduling

1. Back up and inspect the existing staging database; confirm `auth.users`, `admin_users` and `zuri_website_content` match the existing project. Apply 007 to staging and run the PostgreSQL tests. Confirm anonymous access only sees published, fresh, unexpired records; test two separate authenticated accounts.
2. Configure existing Supabase public/server environment variables in the deployment secret manager. Add the variables in `.env.example`; never place keys in source, a `VITE_` variable or chat. Keep all feature flags false initially.
3. Open `/admin/opportunities`. Set a verified request cost reservation covering a full 10-post page, a small daily cap and request cap. The default daily monetary cap is zero. Add sources with entitlement/permission references; independently review and enable only selected sources. Quicket cannot be enabled through this UI.
4. On the existing hosting scheduler, issue a **POST** to `/api/workers/opportunities` every 15 minutes with `Authorization: Bearer <worker secret>` supplied from the host's secret store. The worker processes at most one due source/page. Source cadence defaults to six hours. Never expose this endpoint to browser calls or replace it with a per-user automation. No scheduler deployment was created locally.
5. Enable `ZURI_OPPORTUNITIES_ENABLED` only after the migration, source permissions, budget and provider compliance review pass. A paused policy or missing X token skips retrieval. The authenticated worker still performs retention cleanup when the feature flag is false, provided Supabase server credentials remain configured.
6. Review drafts, follow official links where available, record the evidence note, eligibility and explicit deadline, and publish only supported current records. Link existing consented Spaces or verified Place IDs. An ambiguous Maps response is withheld. Review external destination safety as part of source approval.
7. Reconcile reservation totals with provider invoices; adjust the conservative price bound whenever provider pricing/entitlements change. Expired leases may spend again under a NEW reservation after recovery; stale workers cannot commit. Investigate reserved-but-unfinished runs before increasing limits.

Local app preview without `VITE_ZURI_API_BASE` honestly shows discovery disconnected. The existing website app build sets the API base to `/api`, keeping account mutations same-origin. For standalone signed-in integration, host/proxy `/api` on the same origin; no new wildcard CORS allowance was introduced.

## Uganda launch source plan

Start with small, independently reviewed account groups: Kampala universities and scholarship offices; Ugandan employer vacancy accounts; innovation hubs and grant issuers; event organizers and public community groups. Confirm each account on its official organization's site before approval. Do not seed guessed handles or fabricate current listings.

Example reviewable searches (not activated sources):

- `(Kampala OR Uganda) (jobs OR internship)`
- `(Uganda) (scholarship OR grants)`
- `(Kampala OR Jinja OR Entebbe) (workshop OR conference OR meetup)`

Track accepted drafts/fetched post, duplicates, failed/backoff runs, freshness, actual provider invoices and organizer corrections. Expand the reviewed list only after useful coverage is demonstrated within the cap.

## Retention, permissions and recovery

Published read policies hide records immediately at freshness/deadline expiry. Worker cleanup scrubs expired summaries, location, eligibility and Google Place IDs, deletes evidence after 30 days and run logs after 90 days. Saved account references remain owner-private. Admin withdrawal immediately removes public visibility. The 24-hour content window is a conservative product default, not a claim that all X licensing/deletion duties are satisfied; live X activation requires the applicable compliance mechanism. Provider deletion notices must cause immediate withdrawal/scrubbing under the reviewed policy.

RPCs are revoked from browser roles and granted only to `service_role`. Admin RPCs independently check the canonical `admin_users` entry; HTTP handlers independently authenticate first and reject cross-origin JSON writes. No user ID, admin status, credential, permissions or spend amount from a browser is accepted as ingestion authority. Service keys never enter the app bundle.

Rollback: disable paid policy/source flags, stop retrieval but retain cleanup scheduling, and unset the feature flag. Hide discovery entry points if needed. Leave the additive tables for audit/recovery; do not drop existing app tables. Fix a failed migration transaction in staging before retrying. Keep uncertain cost reservations until reconciled.

The shared client contract/component/CSS are maintained in `zuri-web` and copied with `node scripts/sync-opportunity-client.mjs`; app tests check contract parity. Rebuild the website's app package with `npm run build:app` after app changes.

## Verification — 29 October 2026

- Website test suite: 249 passed; mobile app suite: 114 passed. Includes real isolated PostgreSQL migration/RLS and budget/cursor tests, connector/evidence tests and HTTP authorization checks. These tests do not call live providers or a live Supabase project.
- Website TypeScript check passed. Mobile production build and website app packaging passed.
- Host-side website webpack build compiled successfully, passed TypeScript and generated all 96 pages, but exited with a `SecurityFatalError` advisory for the existing Next.js version. **Production build acceptance remains blocked until the dependency security update and a clean rebuild.** No security gate was disabled and no dependency versions were changed in this work. The restricted build also encountered generated-folder permissions; host access resolved that file-writing issue.
- Browser checked `/pamoja/opportunities` and the packaged app's Motion opportunities deep link on the existing local server at port 3015. Location input and inactive-state disclosure work. At the tested mobile breakpoint, controls stack without horizontal overflow. Browser viewport override was reset after verification. Screenshot: project-root `previews/opportunity-engine-mobile.png`.
- No credentials, live ingestion, hosted schedule, production migration, ticket purchase, application submission or account publication was performed. Optional OAuth remains unimplemented/disabled as described above.
- App bundling reports a large-chunk advisory and the existing website wallpaper asset is resolved at runtime; neither prevented app packaging.

## Primary integration references

- X recent search: https://docs.x.com/x-api/posts/search-recent-posts
- X rate limits: https://docs.x.com/x-api/fundamentals/rate-limits
- Google geocoding policies: https://developers.google.com/maps/documentation/geocoding/policies
- Google Place IDs: https://developers.google.com/maps/documentation/places/web-service/place-id
- Quicket developer portal: https://developer.quicket.co.za/
