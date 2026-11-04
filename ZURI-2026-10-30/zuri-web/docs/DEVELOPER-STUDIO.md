# ZURI Developer Studio — connected Tool pilot

## Ownership and entry points

Studio belongs to Tech: `/tech/studio`. SDK docs are at `/tech/studio/docs`, the
approved distribution catalogue at `/pamoja/tools`, and admin review at
`/admin/studio`. Tech's page and navigation advertise Studio; the website app's
existing Tool library links to the connected catalogue. There is no fourth world.

Existing app `src/core/sdk.ts` remains the first-party device-local adapter.
The connected server SDK does not execute third-party code inside that adapter.
Canonical principals are existing Supabase `auth.users`; installations use the
existing `zuri_website_content` Space and `zuri_pamoja_managers` authority. No
parallel identity provider, ORM or Space directory was added.

## Built

- Responsive blue Studio: profile setup, JSON manifest builder, validation,
  projects, immutable versions, submission and review feedback, permissions,
  publish/install/revoke, credentials and team role controls, usage, spending
  caps, explicit unavailable earnings, reference bookings and SDK docs.
- Browser-only sandbox simulates developer/reviewer/Space roles with labelled,
  device-local records. It never issues real credentials, sends AI requests,
  changes public distribution or charges money.
- Additive PostgreSQL migration with closed table privileges, RLS, verified
  account checks, tenant membership, independent admin reviews, exact-version
  consent, hashed Tool/install credentials, revocation, operation records,
  idempotency and developer budget reservations.
- Cookie-authenticated Studio API reuses existing Supabase server clients;
  server SDK runtime requires both credentials and checks the canonical Space
  manager grant on every operation. No caller-supplied actor or provider key.
- Space Booking reference: create requested appointments, reject overlap while
  locking the canonical Space, read one installation's requests, and explicitly
  confirm/cancel. Private customer notes are not included in developer analytics.
- Bounded Space Assistant gateway: approved public fields only, no arbitrary
  prompts/models/actions, input/output bounds, per-installation request limits,
  explicit configured token rates and cumulative developer caps. Unknown provider
  outcomes retain the reservation rather than silently retrying or refunding.
- Dependency-free server Node SDK, TypeScript declarations, manifest validator,
  starter CLI, example and HMAC signature helper. Downloadable npm tarball under
  `public/developers/`; this has not been published to the public npm registry.

## Configuration and staging

No live Supabase credentials were available in this checkout. The migration is
NOT applied to the user's database. Existing proposal 001/002 and actual auth,
admin and publication schema must be reconciled in staging first.

Server variables (configure in the host's secure environment, never in chat):

```
ZURI_STUDIO_ENABLED=false
NEXT_PUBLIC_SUPABASE_URL=<existing public configuration>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<existing public configuration>
SUPABASE_URL=<existing server configuration>
SUPABASE_SECRET_KEY=<existing secret configuration>
# Optional approved Tool AI, disabled unless every value is configured:
OPENAI_API_KEY=<existing server secret>
ZURI_STUDIO_AI_MODEL=<approved model>
ZURI_STUDIO_AI_INPUT_MICROS_PER_MILLION=<approved positive integer rate>
ZURI_STUDIO_AI_OUTPUT_MICROS_PER_MILLION=<approved positive integer rate>
```

Rates are micro-USD per million tokens; no default commercial rate is invented.
Allocate a developer cap through admin review after authority and billing
responsibility are approved. The pilot always meters the developer. Member and
Space billing require a later explicit commercial implementation, not an implicit
fallback to their allowances. Caps are cumulative pilot limits, not monthly plans.

Review and apply proposal 005 in staging. Provision a verified developer account,
a different verified admin account and a verified Space manager with an existing
canonical management grant. Enable Studio only after staging passes. An admin who
belongs to the developer organization cannot verify or approve its own release.

## Tests and practical limits

`node --test tests/studio-*.test.mjs` executes the actual SQL migration against
test-only embedded PostgreSQL (PGlite), a fixture of the existing canonical
tables, SDK transport/signature tests and the local sandbox lifecycle. It does
not touch a production database. This verifies SQL behaviour and permissions in
that fixture; it is not a hosted Supabase deployment, multi-session concurrency,
OAuth/email delivery, real provider billing or browser acceptance test.

Before enabling production: test the exact deployed schemas/RLS grants, concurrent
separate connections, authentication/session refresh, manager loss, team role
loss, token rotation, revocation during an AI request, unavailable provider,
ambiguous writes, quotas, and mobile/desktop flows. Add operational monitoring,
PII retention/deletion policy and backup/restore procedures. Studio request records
can contain customer inputs; restrict operator access and approve retention before
live traffic. Database snapshots currently return bounded recent usage/audit
records; larger projects need cursor pagination.

## Not connected

Payment collection, commissions, payout ledgers, paid subscriptions, automatic
webhook delivery, arbitrary hosted Tool deployment and Invites guest coordination
are not live. Their unavailable states are explicit. No fabricated money or live
installation totals are seeded into the public catalogue. The webhook helper
verifies signatures, but consumers must persist event IDs to prevent replay.

## Release operations

Validate a manifest before submission. Review the external endpoint and its own
customer authentication; Studio deliberately does not fetch arbitrary endpoints
or run submitted code. Publish an approved version. The Space manager consents,
stores the one-time installation secret on the trusted service, and pairs it with
the developer-issued Tool key. Preserve idempotency keys across uncertain writes.

For a new version, publish only after independent review. Existing installations
remain pinned. Revoke and reinstall to consent to expanded permissions; publishing
an older approved version is the initial rollback path for new installations.
Admin suspension blocks all subsequent runtime calls.

For an AI timeout, keep the request reservation held. A trusted operator must
reconcile the provider's actual outcome before refunding or completing it. No
automatic reconciliation worker or refund endpoint is exposed in this pilot.

SDK packaging: `npm run pack:sdk`. App-link packaging: `npm run build:app`.
The website builds normally after both generated artifacts are current.
