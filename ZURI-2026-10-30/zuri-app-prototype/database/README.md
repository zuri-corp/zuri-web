# ZURI database schema and gateway deployment

## Current deployment — 29 October 2026

**001–010 are now applied** to `eghtvbqzytyxsdgvwkge` through the authenticated SQL Editor. Live verification returned 56 ZURI tables, all with row-level security, three private buckets, and the 010 intake reservation function. Do not replay these non-idempotent scripts. The original three enquiry/admin tables were inspected and hardened. See [the current backend readiness record](../docs/BACKEND-READINESS.md) for the deployed domains, account bootstrap, Edge authentication approval, and remaining activation work. The earlier gateway-only milestone below is retained as historical context; its “only 006 applied” and “credentials unconfigured” descriptions are superseded by this record. No CLI migration-history synchronization is claimed.

| Additional file | Purpose |
| --- | --- |
| 008 | Private app records, profiles, entities, membership, conversations, safety, media quotas and authenticated domain operations |
| 009 | Three private buckets, verified-account bootstrap and Realtime publication |
| 010 | Existing-table grant hardening, durable public intake caps, retry-safe private records and bootstrap scope correction |

## Earlier gateway-only milestone (superseded deployment scope)

ZURI targets Supabase PostgreSQL with Supabase Auth. SQL in `proposals/` is source-controlled schema, not evidence that it exists in a remote project. Project `eghtvbqzytyxsdgvwkge` was subsequently confirmed by the owner; gateway 006 was manually applied through its signed-in Supabase SQL Editor on 29 October 2026. The five new tables and three restricted RPCs were verified. The daily cap is USD 5 and automatic trials remain zero. The gateway policy remains disabled because the selected pilot email has no Supabase Auth app account yet. See `deployments/2026-10-29-zuri-ai-gateway.json` and the pending `operations/activate_zuri_owner_pilot.sql` configuration (USD 3 per month). Local runtime credentials are still unconfigured. Do not describe a migration as applied until the remote migration history and schema checks confirm it.

## Schema available in the source

| File | Purpose |
| --- | --- |
| 001 | Curated website content and reviewed publication |
| 002 | Verified Space managers, Moments and management audit |
| 003 | Basic accounts and contributions |
| 004 | Consented intake-photo records |
| 005 | Developer Studio, approved Tool versions/installations and developer budgets |
| 006 | Shared ZURI AI gateway allowances and usage accounting |
| 007 | Opportunity-engine source registry, runs, evidence, preferences and related records |

This is not a claim of a complete deployed app database. Earlier website code also expects `admin_users`, `enquiries` and `enquiry_notes`; their original deployed schema was not supplied with the source. Do not invent it or apply unrelated proposals as a prerequisite for AI. Gateway 006 is independent of Studio and the other proposals; it needs Supabase's existing `auth.users` identity table and `anon`, `authenticated`, `service_role` roles.

## Gateway 006

| Table | Stores |
| --- | --- |
| `zuri_ai_policy` | Global switch, default monthly trial limit and total UTC daily cost cap |
| `zuri_ai_accounts` | Explicit account limits and per-account enable/revoke switch |
| `zuri_ai_account_usage` | UTC monthly held and spent totals per account |
| `zuri_ai_daily_usage` | UTC daily held and spent totals across the service |
| `zuri_ai_requests` | Request IDs, keyed fingerprints, model/mode, reservations, usage and settlement |

The three RPCs are `zuri_ai_status`, `zuri_ai_reserve` and `zuri_ai_settle`. The gateway checks verified identity, bans/deletion, monthly and daily caps, duplicate IDs, rate limits and settlement costs. Tables have row-level security and deny direct anonymous/authenticated access. RPC execution is restricted to the trusted service role. No prompt/reply or private workspace content is stored in this ledger.

## Apply and provision

1. Connect the owner's chosen Supabase project using the Supabase integration or a trusted operator database session. Inspect existing AI tables/functions and migration history first. If the schema is already present, verify it rather than replay the non-idempotent create-table migration. Resolve partial or divergent state before changing anything.
2. Apply `proposals/006_zuri_ai_gateway.sql` as a tracked migration. Its transaction creates the five tables and RPCs and starts with AI disabled and all default limits zero. Verify table constraints, RLS and RPC grants in the actual project.
3. Resolve the explicitly chosen pilot account email to its actual verified Supabase Auth UUID. Device-local ZURI profiles are not authentication accounts. Do not create a fake identity or enable every account.
4. Fill the three explicit values in a deployment copy of `operations/enable_ai_pilot.sql`: verified account UUID, monthly micro-USD cap and fleet daily micro-USD cap. The unchanged template fails before writes. Review any existing explicit accounts because enabling the global policy also enables their existing eligible allowances. This operation preserves other account rows and all held/spent/request records, and gives new accounts no automatic trial budget. Run it as a trusted database operator, not through a public endpoint.
5. Verify `zuri_ai_status` for the chosen account; an unprovisioned account must have no available allowance, and anonymous/authenticated direct calls must fail. No provider call is needed for these checks. Re-running provisioning changes chosen caps but does not reset usage. Raising a cap is a spending-policy decision.
6. Store matching Supabase browser/server configuration in secure hosting environment settings. The Supabase server secret and provider key must remain server-only. Database provisioning alone does not activate the provider: fresh OpenAI key, approved models/rates and `ZURI_AI_ENABLED=true` are separate activation requirements.

Cost caps are USD provider-cost budgets, not UGX retail prices, a purchased membership, a promise of a specific number of messages or the proposed product credits. Leave the website's proposed offers labelled until real entitlements and checkout exist.

## Disable without destroying evidence

Set `public.zuri_ai_policy.enabled=false` to stop the gateway, or set the chosen `zuri_ai_accounts.enabled=false` to revoke that account. Also turn off the server AI switch if needed. Keep reservations and usage for reconciliation; do not delete or zero them to make a failing test pass. Requests already sent to the provider can still incur costs.

## Local verification

`node --test tests/ai-postgres.test.mjs tests/ai-provisioning.test.mjs` runs the migration and provisioning operation in isolated PGlite. These are real PostgreSQL-engine checks, not a remote deployment and not Supabase Auth integration certification. Verify the remote project after connection.
