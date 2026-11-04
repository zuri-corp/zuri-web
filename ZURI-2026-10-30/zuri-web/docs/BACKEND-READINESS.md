# ZURI backend — deployment and remaining activation

Updated 29 October 2026. Target: `eghtvbqzytyxsdgvwkge`.

## Verified remote state

Migrations 001–010 are applied through the signed-in Supabase SQL Editor. This is a manual deployment, not a claim of CLI migration-history tracking. Migration 006 was already present and was not replayed. These scripts contain non-idempotent table creation: do not run them again against this project. Proposal 011, `database/proposals/011_shared_profile_onboarding.sql`, is a new local proposal and has **not** been applied remotely.

The live verification returned **56 ZURI tables, zero ZURI tables without row-level security, and three private buckets**. The original enquiries/admin tables were inspected and their direct browser grants were revoked in 010. Anonymous calls to private records and account operations were denied. Public health returned the schema marker `zuri-backend-009`; this marker identifies the bootstrap release, not the highest applied migration. The presence of `zuri_intake_reserve(text,integer)` separately verifies 010.

Three Edge Functions exist: `zuri-api`, `zuri-media`, and `zuri-ai`. The latest API bundle includes bounded, consented public intake with durable database limits. Generated deployment sources and their input hashes are in `supabase/deploy/`. Deployment through the dashboard does not itself prove a live request succeeds.

The owner explicitly approved local backend forwarding after the initial automatic-review rejection. `ZURI_PUBLIC_EDGE_ENABLED=true` and `ZURI_AI_EDGE_ENABLED=true` are now set locally; `ZURI_AI_ENABLED=false` remains set. A local invalid enquiry reached the deployed validator and was rejected with HTTP 400, account access without sign-in returned 401, and AI status returned execution:false. No customer record or provider request was created by these checks. A real verified-account flow remains pending. See `database/deployments/2026-10-29-zuri-backend.json` for the deployment receipt.

The dashboard's legacy JWT switch remains enabled and was not changed. Live calls with the project's public publishable key nevertheless reached the handlers: health returned 200, private POST requests returned the handlers' 401 responses, malformed public intake returned 400, and an unapproved origin returned 403. This supersedes the earlier assumption that the switch necessarily blocked every request. A real verified-user token still needs an end-to-end check; if a legacy-filter incompatibility appears, changing the switch requires explicit approval. Mandatory `auth.getUser` verification inside the functions, verified-account database checks and RLS remain in place.

## Implemented domains

| Domain | Backend behavior |
| --- | --- |
| Accounts and profiles | Supabase Auth identities; private by default; explicit public-profile consent; safe HTTPS links; shared onboarding fields for location and private cloud avatar proposed in 011 |
| Personal workspace | Owner-only task, Moment, chapter, preference, automation, saved, intent and draft records; bounded content; revision checks; retry-safe creates |
| Spaces and communities | Consented drafts for Spaces, societies, channels, events and pings; review before public listing; capacity and membership controls |
| Offerings | Entity-owner managed descriptions and links; no fabricated payment entitlement |
| Conversations | Recipient invitation and acceptance, membership-controlled reads, blocks, bounded messages, retry deduplication |
| Safety and privacy | Reports, consent evidence, private notifications, data requests, database audit, verified/banned-account checks |
| Media | Private uploads, actual file-header validation, reservations, quotas, owner-only short-lived attachment links |
| Website | Curated Select/content publication, enquiries and consented Pamoja intake; existing admin review model preserved |
| Studio | Tool versions, approval, installations and developer budget schema |
| Opportunities | Source registry, evidence and preference schema; external collection remains disabled |
| AI gateway | Shared account and fleet cost reservations/settlement, rate controls and strict request contracts; provider remains disabled |

`zuri_backend(action,payload)` derives the actor from Auth; callers cannot choose another account. Direct browser writes to the private domain tables are denied. Public discoverability exposes only approved public entities and profiles whose owners opted in.

## Interfaces

- Website `/api/backend`: verified cookie-session account and domain operations.
- Website `/api/backend/discover`: public approved directory search.
- Website `/api/backend/media`: authenticated forwarding to the private media function.
- Website `/api/backend/logout`: same-origin sign-out.
- Edge `zuri-api`: health, authenticated domain actions, and validated public enquiry/intake operations.
- Edge `zuri-media`: authenticated upload, signed owner download and deletion.
- Edge `zuri-ai`: authenticated canonical gateway adapter; no arbitrary tools or private-workspace retrieval.

The web app has an explicit **Your ZURI account** panel with cloud profile, tasks, reviewed Space submission, discovery, message invitations and private media. Existing prototype screens still include device-local records. They have not all been converted to cloud persistence. Importing device tasks requires an explicit selection; seeded identities and private workspace data are not automatically uploaded.

The shared onboarding form and app profile editors use `zuri_profile_save` for display name, about, handle, links, location, explicit profile visibility, and an owner-bound private photo. Those fields require reviewed proposal 011 before saves can succeed. After reviewing it against the live schema, apply it manually through the authorized Supabase SQL Editor, then rebuild and deploy the `zuri-api` bundle for standalone app profile saves. Do not apply proposal 011 automatically. The photo remains private even when the text profile is public; public profile discovery does not expose a photo reference.

## Limits and operational defaults

- AI pilot: only the exact verified `zuri.incorp@gmail.com` account may claim the configured USD 3 monthly provider-cost allowance. Fleet cap: USD 5 per UTC day. Other accounts get no automatic trial budget. No administrator role is assigned by this bootstrap.
- The owner has not yet completed a real app Auth sign-in. The bootstrap does not create an Auth user or mark an email verified. Provider calls remain off, independent of database allowance activation.
- App operations: 60 requests per account per minute; private record limit 2,000; bounded record bodies.
- Media: 10 MB maximum file, 50 MB per account and 500 MB fleet by default. Private intake images: 2 MB each, maximum three.
- Public intake: 100 requests per day, five per client digest per hour, 100 MB cumulative staging reservation cap. Where the gateway cannot establish a reliable client address, requests share a conservative fallback allowance. Quota reservations are retained on uncertain results. Staging review/cleanup needs an operator; it is not an unlimited rotating upload allowance.
- Realtime publication includes messages and notifications where supported. Current account UI also supports manual refresh.
- Maintenance RPC exists for expired rate windows; no external scheduler has been configured.

## Before calling this production-ready

1. Complete a real verified-account flow. Health, unauthorized denial, CORS denial and malformed public intake checks already pass remotely. Do not fabricate a verified identity for a test. Review the legacy-filter setting only if an actual verified-user request demonstrates incompatibility.
2. Configure the Supabase Magic Link email template with the eight-digit `{{ .Token }}` value and set up SMTP delivery. The template is supplied in `supabase/email-templates/magic-link.html`.
3. Provision a real administrator explicitly if requested. Existing website admin routes still require a server-only Supabase secret in the hosting environment; the public publishable key does not grant admin access.
4. Add exact public website origins to function CORS settings and hosting Auth redirects. Local origins are the current default.
5. Add a fresh provider key securely, approve model access and current prices, then separately enable AI. Never reuse the key previously exposed in chat. No provider request has been made during this backend deployment.
6. Connect billing and paid entitlements, backups/restore practice, operational monitoring, storage review and moderation processes before charging customers. Schema availability is not completed payment integration.

## Verification

Website suite: 274 tests passed after the framework security update. App type checking and all 114 app tests passed again in the final verification. Dedicated PostgreSQL-engine tests execute the complete schema and verify RLS, consent/review, conversation access, quotas, allowance bootstrap and retry behavior. Edge tests run standalone bundles with controlled Auth/database doubles. These complement, and do not substitute for, the remaining real-account Supabase checks.

Next.js and eslint-config-next were upgraded to 16.4.3. Installation reported zero known dependency vulnerabilities. The optimized production build passed, and the local preview was restored after stopping a stale ZURI process that occupied the same port. The cloud account sign-in panel renders at `/app#/lore/profile?kind=cloud-account&id=home`. No verification email was sent during the checks.

Final forwarding activation: the owner approved both local forwarding flags. Both localhost and 127.0.0.1 return the deployed validator's 400 response for empty enquiries. The shared same-origin guard now uses the actual request Host and rejects cross-site requests for both public intake routes. All 63 focused forwarding/intake regression tests and the subsequent production build passed. AI status still reports execution:false. No valid customer submission or AI provider call was made.
