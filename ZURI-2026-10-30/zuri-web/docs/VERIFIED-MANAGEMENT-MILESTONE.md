# Verified management and Moments foundation

Product Director approved DECISION 2 Option A: manual claim verification; verified managers opt into Moments; moderation before publication.

## Implemented

- Private `/pamoja/claim` with contextual live-profile handoff, existing enquiry persistence, validation and success/failure behavior. A request changes no public content or rights. Claim requests are server-labelled within the existing enquiry message shape; historical `zuri-tech` source compatibility is retained rather than inventing a database enum.
- `/admin/pamoja` reviews the claim and records a grant or revocation with private verification evidence. Inputs suggest known profile/account/claim record IDs; recent suggestions and grant history are bounded to 100. Existing enquiries and notes provide the private review context. The database function requires a genuine claim enquiry, a confirmed active account and a consented eligible profile before granting rights.
- `/pamoja/login` initially reused existing Supabase email/password authentication; the latest milestone replaces it with email codes while leaving administrator password login intact. At this milestone there was no self-sign-up. The subsequent approved basic-account email-code flow now creates/verifies ordinary accounts, as documented in BASIC-ACCOUNTS-MOMENTS-MILESTONE.md. Account creation still grants no management rights; no passwords or keys enter enquiry/chat.
- `/pamoja/manage` lists only non-archived delegated presences. Managers can edit public profile fields and preview/save a private draft, without changing slug, consent evidence, publication or canonical ownership. ZURI continues publication review. Stale revisions fail with conflict; public snapshots are retained until republished.
- Managers may enable/pause their Space's Moments. Disabled by default. Pausing hides contributions while preserving records. Revoking the last management grant pauses Moments. Managers cannot approve contributions or grant other users access.
- Private moderation supports approve/reject/withdraw, consent evidence and recorded actor/reason. Approval requires a published, consented Space with Moments enabled. Public read projection includes only approved notes and their explicit display credit; no claimant/account/evidence metadata is exposed.
- Mutation actors come from verified sessions. Review uses existing `admin_users` authorization. RPCs are service-role only, with their own database authorization checks. All rights/settings/review writes lock the profile row, serializing revocation with manager edits and moderation. The public RPC is read-only and explicitly filters publication, consent, opt-in and approval.
- Browser roles have no private-table or management-function privileges. An append-only application audit records grants, revocations, draft submissions, opt-in settings and moderation. Application routes expose private/no-store responses and session refresh covers the new authenticated routes. Noindex/robots protections cover management/login/claim pages.

## Contributor identity — resolved by subsequent decisions

Moments are a visitor guestbook, not owner-authored updates. Approval of manual claiming does not resolve whether a visitor needs an account or how anonymous contributions are attributed. The Product Director subsequently chose basic accounts with email for now, retained only in authentication. The completed current contribution path is documented in BASIC-ACCOUNTS-MOMENTS-MILESTONE.md; the options below are decision history. No demonstration contributions are seeded.

A: verified-email accounts for contributors; an intentional public display name, with email kept private. Recommended for accountable permission and later withdrawal.

B: guest contributions with privately collected contact details and an intentional public display name; ZURI checks permission during moderation. Less initial friction; identity and withdrawal need manual verification, and the website must store additional private contributor contact data.

Either retains opt-in and pre-publication moderation. This is an authority/identity/privacy gate, not a screen approval. Photography/uploads are a later slice after the text contribution path and its identity/permission policy are settled.

## New proposal, not existing schema

`database/proposals/002_verified_management_and_moments.sql` is newly authored and UNAPPLIED. It depends on reconciled `zuri_website_content`, `admin_users`, `enquiries` and Supabase auth schema, and introduces delegated managers, opt-in settings, moderated Moments, an audit and transactional functions. It must be reconciled with the actual schema/grants before use. It is not proof of production access or a migration executed by this task. No live accounts or grants were created.

## Verification and limits

- Production Next.js build/TypeScript and ESLint pass; Cache Components and partialPrefetching remain enabled.
- 106 tests pass. New checks exercise actual API/form validation and boundaries: no-session/unverified denial, non-admin denial, server-controlled actor, origin rejection, stripped consent/publication injection, required claim evidence, rejected owner moderation, conflict/permission/storage errors and private cache headers. Supabase/RPC responses are controlled doubles; database SQL and its concurrency/RLS behavior are NOT executed by these tests.
- `verify:integration` now includes private-table and private-function denial checks and the public Moments projection contract, all read-only and without returning customer records. It currently exits 2 because all four secure Supabase variables remain absent. Actual login, refresh, account provisioning, data persistence, RLS, locking and moderation transitions require an authorized staging integration.
- An incremental build encountered corrupt generated Turbopack cache; deleting only `.next` and rebuilding cleanly passed. No framework flag changes.
- No supported browser QA capability is present in this managed runtime; no preview server, substitute browser or PC access was used. Visual/accessibility interaction behavior remains browser-unverified.
- Original brand assets and uploaded strategy reference are byte-preserved. No deployment, emails, payments, fabricated business records, Select harvesting or future social ecosystem were performed.
