# ZURI website

One project, four experiences: Corporate, Tech, Select and Pamoja. Built from the supplied ZURI source archive with its original branding assets preserved.

Next.js 16.4, React 19.3, TypeScript, Tailwind and Supabase. Cache Components and partialPrefetching remain enabled. The current source includes enquiries, protected admin review, curated publishing, goal-led technology guidance, private manual-claim intake, delegated management controls, basic email accounts, moderated text Moments, contributor withdrawal and public discovery/reading interfaces.

## Checks

Validated in cloud Work with Node 24:

- `npm ci`
- `npm run build`
- `npm run lint`
- `npm test`

Use secure runtime environment controls for the existing Supabase variables listed in `.env.example`. Never commit secret environment files or share keys in chat. `npm run verify:integration` performs read-only integration-contract/privacy checks after configuration.

The website defaults to clearly labelled preview content. `ZURI_CONTENT_MODE=live` must be enabled only after actual publishing storage, grants and RLS are verified. The SQL under `database/proposals` is unapplied, newly authored additive DDL; it is not proof of an existing production schema.

## Current direction and evidence

- `docs/STRATEGY-REPOSITIONING.md`: current positioning and implemented redesign.
- `docs/BASIC-ACCOUNTS-MOMENTS-MILESTONE.md`: approved email-only basic accounts, contribution/withdrawal journey and email integration requirements.
- `docs/VERIFIED-MANAGEMENT-MILESTONE.md`: approved manual-verification policy and management implementation.
- `docs/PUBLISHING-MILESTONE.md`: draft/snapshot lifecycle and publication permissions.
- `docs/ENQUIRY-MILESTONE.md`: original routing/auth/render repair and integration evidence.
- `docs/WEBSITE-MILESTONE.md`: initial four-destination website slice.
- `docs/SOURCE-CHANGES.json`: changes compared with the original upload.
- `docs/references/ZURI-Strategy-Handoff.txt`: unchanged source reference.

Browser QA, live Supabase enforcement and deployment remain unverified. Manual claim/management and basic-account contribution code depend on reconciled, unapplied proposals 001–003. Email OTP delivery requires the Auth template/provider configuration documented in the latest milestone. No live grants, public request feed, payments or actual third-party resale agreements are implied by this source.
