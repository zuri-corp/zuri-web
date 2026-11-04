# Basic email accounts and moderated Moments

## Current Product Director direction

DECISION 2 A remains enforced: manual Space-management verification; managers opt into Moments; moderation precedes publication.

DECISIONS 3/4 resolved: a basic contributor account uses email for now, with possible phone sign-in later. Email remains in Supabase Auth. The account/contribution domain stores no email or phone, and public Moments contain neither. A basic account is not an automatic public person profile, a Member designation or a management grant.

## Built journey

1. An enabled, published, consented real Space offers **Share a Moment from here**. Example Spaces cannot accept real contributions.
2. `/pamoja/login` requests an email verification code through the existing Supabase browser client. The same flow starts a new Auth account or signs in an existing one; no application profile or contribution can be persisted before email verification. Code request is not treated as a session. Resend waits, invalid/expired-code states and safe local return paths are implemented. Admin password login is unchanged.
3. A verified visitor sees the shared ZURI profile setup: display name, about, optional photo, handle, links and location. The profile is private unless the visitor separately opts into public discovery. Photos are stored in private cloud media and are not exposed by public profiles. The website and app profile editors share `zuri_profiles`; schema/function proposal 011 is pending review and is not applied. The separate Pamoja Moments account/history remains dependent on proposal 003 and may be unavailable until that contribution backend is enabled.
4. `/pamoja/moments/[slug]` accepts a plain-text note up to 1,200 characters, shows its proposed public name/note, and requires affirmative permission to publish. Session changes/error states retain the draft. Optional browser session storage preserves only unsent note text and retry ID across email sign-in; permission, email and auth tokens are never placed in that draft.
5. `/api/pamoja/moments` derives the author from a verified session, validates the fixed permission version and forwards an allowlisted payload to the transactional function. Submissions are always pending. Managers and visitors cannot self-approve or spoof authority/consent metadata. An idempotent per-account request ID avoids duplicates on unchanged retries. Proposal 003 serializes rate checks on the account row and limits submissions to five per hour; retries of an already stored request do not consume another slot.
6. ZURI reviews actual contributions and the captured permission evidence in `/admin/pamoja`, using existing admin authorization. Publication requires the Space still be opted in, consented and published. Rejection and withdrawal are explicit states. All notes are rendered as text, with no HTML execution, ratings, comments, likes, ranking or automatic Select reuse.
7. `/pamoja/account` shows the chosen name and paginated private contribution history. Contributors may withdraw their own pending, approved or rejected note. Withdrawal hides it from public projection and prevents subsequent approval; the private submission/moderation record is retained, as disclosed in the UI. Another account cannot withdraw it. Manager opt-out, profile consent withdrawal or archive also hides the public guestbook. The public projection excludes author IDs and permission/auth metadata.

## Architecture and authorization

- `zuri_pamoja_accounts` is a minimal account reference + chosen name + update time for the Moments contribution domain. The shared ZURI identity is stored separately in `zuri_profiles`; onboarding does not claim that Moments history is available when proposal 003 is unapplied. Canonical authentication stays in existing Supabase Auth; there is no parallel identity provider or email table.
- Proposal 003 adds private author/retry/permission-version fields to the moderated Moments table and a service-role-only `zuri_pamoja_contribute` function. Private account and contribution data are not browser-selectable; application handlers authenticate before invoking privileged RPCs, and SQL independently checks active verified-email identity.
- Account creation never changes `admin_users` or delegated management grants. Existing administrator publishing/snapshot rules and the manual verification path remain intact. Multiple manually authorized managers are delegations, not a transfer of canonical ownership.
- Submit, pause, moderation and withdrawal serialize on the same Space row. Withdrawal also uses a contributor-owned account lock and an author-scoped record lookup. Moderation cannot race a withdrawn note into publication. Account history exposes only that contributor's rows and publicly available Space labels/addresses, never unpublished profile draft data.
- New session-refresh matchers cover account, login and contribution routes. Private handlers are no-store; safe return paths exclude external destinations and administrator routes. Account/claim/sign-in/contribution-form pages are noindex. Cache Components and partialPrefetching remain enabled with request-specific server work behind Suspense.

## New storage proposals — not applied

`database/proposals/003_basic_accounts_and_contributions.sql` is newly authored and UNAPPLIED. It follows reconciled proposals 001/002 and the actual Supabase/Auth schema. No production schema, account, contribution, email or grant was created by this task. The proposals are not evidence of an existing database, and do not resolve unknown legacy triggers or RLS.

`database/proposals/011_shared_profile_onboarding.sql` is also UNAPPLIED. Review it against the live 008–010 schema before applying. It adds shared location/private-avatar fields, visibility-consent enforcement and profile save/discovery behavior; it does not provision Moments contributions.

## Email activation dependencies

Basic accounts support password sign-in and password-based account creation through Supabase Auth. New passwords require at least 12 characters and are never stored by application code. If email confirmation is enabled, its redirect allowlist must include the application's `/auth/callback` URL. Password resets use the same callback with the recovery flow.

Existing accounts created through the former passwordless-email flow can continue to sign in with a one-time email code, or use password reset to set a password. The code flow uses `signInWithOtp`, followed by `verifyOtp` with type `email`; it does not create new accounts. For the code flow, the project must use a code-bearing email template (`{{ .Token }}`) rather than only the default link. The prepared branded template is `supabase/email-templates/magic-link.html`. Inspect the project's actual Auth email settings and templates before changing them; do not overwrite unknown existing templates without retaining/reconciling them. An authorized email sender/SMTP configuration and working Auth rate limits are external dependencies, not assumed live resources.

Source checked: https://supabase.com/docs/guides/auth/auth-email-passwordless (accessed 2026-10-14). No live sign-in or email request was sent.

All four secure Supabase environment variables are still absent. `.env.example` lists names without values. No keys, account passwords or SMTP secrets are requested in chat. Actual project configuration must be supplied through secure runtime controls or an authorized integration connection.

## Verification

132 tests pass, including the existing enquiry, publishing, claim-management and repositioning suites. New tests exercise email-code API calls/errors, confirmed-session requirements, return-path safety, minimal account/permission payloads, session-controlled authors, contribution-history/public-output projections, preview exclusion, CSRF/content/size guards, required permission, malformed input, withdrawal scoping, retry identity and conflict/rate/storage errors.

Supabase/Auth/RPC responses in these tests are controlled doubles. These tests do not execute PostgreSQL functions, deliver email, prove RLS or exercise browser interactions. Production build/TypeScript and ESLint pass. The read-only integration probe now includes account/private-function contracts and fails early with exit 2 because secure configuration is absent.

Before activation, staging must verify first sign-up and existing-user codes, invalid/expired/resend behavior, cookie refresh, two-account history/withdrawal separation, actual pending→approve→public→withdraw transitions, manager pause/consent/archive behavior, idempotency/concurrent submissions and revoked-manager denial. Confirm no email/phone columns or Auth metadata reach domain/public projections. Schema constraints, RPC grants, audit records and SMTP/provider settings must be reconciled with actual evidence.

No supported browser QA capability is exposed in this managed environment. No preview server, substitute browser or PC access was used. Visual/responsive/focus behavior is implemented but browser-unverified. Branding assets and the original uploaded strategy reference are byte-preserved. Photography/uploads and phone authentication are future slices; no speculative storage bucket or phone provider was added.
