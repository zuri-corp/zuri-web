# Curated publishing milestone

## Product Director decision

Option A was approved: authorized ZURI administrators publish Select stories and curate Pamoja profiles with subjects’ consent. No visitor-owned accounts, profile claiming, automatic Member status or paid editorial coverage. The new content records are website editorial representations, not canonical Pamoja identities.

## Built in source

- Three protected workspaces: /admin/publishing/story, /admin/publishing/space and /admin/publishing/person.
- Private draft creation/editing, a public presentation preview, explicit publication, withdrawal, reversible archiving and restoration.
- Paginated admin collections (50 per page); search and status filters are page-local. Lists distinguish loading, empty, failed and successful states.
- Published snapshots are independent of draft text. Draft changes do not alter the public website until the administrator reviews and republishes them.
- Revision comparison before and during the update prevents stale or racing editors from overwriting changes. Duplicate slugs return a conflict; a public slug cannot change until the item is withdrawn.
- All admin API operations authenticate with getUser and authorize through the existing admin_users check before content access. Mutations check origin, JSON type, size, kind, ID, revision, action and allowlisted content fields. Actor IDs come from the verified session.
- Profile publication requires confirmed consent plus a private reference. Removing confirmation and saving immediately withdraws the public snapshot. Reference text and admin actor IDs are excluded from public delivery.
- Story publication requires a title, category, introduction, public byline and article text. An image requires a caption. Plain paragraphs are rendered as text, without HTML execution. Images are restricted to existing local brand assets and the previously used Unsplash host, including in the private preview.
- Homepage, Select list/story pages and Pamoja list/profile pages now use the public delivery layer. Live reads use the publishable-key client, explicit published filters and an allowlisted snapshot projection. Public pages never receive draft fields or consent evidence.
- Preview/live modes are distinct. Preview keeps the original clearly labelled examples. Live empty/failure states never substitute examples. Real story pages use recorded publication time and actual bylines; sample pages remain noindex.
- Public delivery is request-dependent behind Suspense; publication and withdrawal do not depend on stale static output. Cache Components and partialPrefetching remain enabled. The header's pathname-dependent UI now has its own Suspense boundary for unknown dynamic routes.

## Database and integration evidence

No actual Supabase schema or credentials have been supplied. No production database access, schema mutation, live publication or live login occurred.

`database/proposals/001_curated_website_content.sql` is newly authored, unapplied, additive DDL implementing the approved website publishing capability. It is **not** a claim about the existing database and is intentionally kept outside an automatic migration directory. It proposes one namespaced table (`zuri_website_content`) with typed lifecycle metadata and separately validated draft/published JSON snapshots. It neither modifies the existing enquiries/admin tables nor establishes canonical user ownership.

Before applying any DDL, compare it to the actual database schema and staging grants, including table-name collisions, auth.users foreign keys and default privileges. The proposal fails if the named table already exists rather than masking a mismatch. It provides RLS, profile-consent constraints and column-level public read grants. Browser roles cannot mutate the table or select private draft/reference/actor columns; the service role writes only behind the existing admin authorization path. SQL was not executed against PostgreSQL here, so database enforcement remains unverified.

`npm run verify:integration` now checks the new admin column contract, public snapshot projection and denial of private-column reads using a browser key. It is read-only and prints no record contents or credentials. It currently exits with missing configuration, as expected. These checks do not by themselves prove all RLS behaviors; staging must test anonymous draft exclusion, consent withdrawal, snapshot visibility and publish/withdraw persistence.

The non-secret environment switch `ZURI_CONTENT_MODE` defaults to preview; use `live` only after actual storage/RLS checks. Changing this switch requires secure runtime configuration, not keys in chat. The four existing Supabase variables remain unchanged. Publication responses explain when the public website is still in preview mode.

## Verification

- Production Next build/TypeScript: passed, preserving both framework flags.
- ESLint: passed.
- 78 tests: passed. Runs actual handlers, model validation and public adapters with controlled Supabase doubles. Added full draft/publish/edit/republish/withdraw and profile consent journeys; revision conflicts, archive/restore, duplicate slugs, kind separation, unauthorized access, JSON/origin/size rejection, storage failures, private projections and pagination.
- Original public assets: byte-for-byte unchanged from the upload.
- Browser/visual QA unavailable because this managed runtime has no control-browser capability. No preview server, substitute browser or PC access was used.
- Live Supabase, SQL/RLS execution and deployment remain unverified.

## Practical limits and next work

Public lists currently show the latest 100 stories and 500 profiles. Exact published-slug lookups keep older detail URLs reachable. This is bounded first-website discovery, not the future Pamoja search engine. Media upload/storage, complete revision history, scheduled publication and self-service contributions were not inferred into scope.

Next is read-only reconciliation with the actual schema and secure connection, followed by staging publication/withdrawal and browser QA. No new consequential decision is required for this approved publishing workflow. A hosting-runtime migration or introduction of self-service ownership would still be separate gates.


Later update: STRATEGY-REPOSITIONING.md documents additional optional public profile fields and reserved clean Space addresses, with consent/allowlisting preserved. The claiming/Moments authority model is a new pending decision.
