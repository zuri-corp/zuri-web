# ZURI enquiry milestone

## Scope and source

Built from the uploaded zuri-web.zip. Original uploads are unchanged. Retained Next.js 16.4.0, React 19.3.0, Supabase SSR 0.12.7, supabase-js 2.117.3, Tailwind, all four destinations and original brand assets. Retained Cache Components and partialPrefetching. Read repository AGENTS.md and the installed Next.js authentication, connection, proxy and route-handler documentation before changes.

## Implemented

- Public POST /api/enquiries validates the existing wedding form and inserts only allowed columns. Source is server-controlled (`zuri-invites`), status starts as `new`. Confirmation appears only after a successful database response. Database/configuration failure returns an honest 503; entered values remain available for retry.
- PATCH /api/admin/enquiries/[id] updates existing allowed statuses.
- GET/POST /api/admin/enquiries/[id]/notes reads and writes internal notes. A missing enquiry returns 404; note authors come from the verified session.
- Repaired route placement; removed the empty backtick-named route and duplicate status component.
- Shared authentication/authorization verifies the user with getUser and checks admin_users before any enquiry or note access. Errors fail closed.
- src/proxy.ts refreshes admin session cookies on the request and response, forwards SSR cache headers and makes admin responses private/no-store. It does not replace authorization at data access.
- Admin request-dependent reads are inside Suspense; connection() is awaited before Supabase initialization. No disabling of Cache Components, cache-sharing of private records or build-time authentication.
- Added admin failure UI, administrator sign-out, accessible labels, visible keyboard focus, corrected global CSS nesting and reduced-motion handling.
- Queue pages use a stable created_at/id order, exact total and 100-row pagination. Client search/status filters are explicitly page-local. Notes load only when expanded, avoiding 100 simultaneous requests. Empty and failed note reads are distinct, with retry.
- Fixed pre-existing lint errors and converted existing destination logos to Next Image without changing source assets.

## Validation

- npm run build: PASS; protected pages partially prerendered, three API routes dynamic.
- npm run lint: PASS.
- npm test: 41 passing tests. Executes actual API handlers, validation and proxy code with controlled Supabase doubles. Covers unauthorized/non-admin/authorization failure, origin/content checks, malformed input, missing records, allowlisted writes, verified note authors, database failure, pagination validation and cookie/cache propagation.
- No live Supabase writes, login or production access were performed.
- Browser QA was unavailable: this managed cloud runtime has no control-browser capability; no preview server or substitute browser was started. Responsive/accessibility changes passed code checks but are not visually certified.

## External dependencies: unresolved, not fabricated

The source archive contains no environment file, SQL schema/migrations, RLS policies, deployment identity or actual admin account. The cloud environment currently has none of the four required Supabase variables. Consequently live persistence and authentication cannot be claimed working yet.

Existing code establishes these application-side contracts, not proof of deployed schema:

| Table | Expected columns |
| --- | --- |
| admin_users | user_id |
| enquiries | id, name, email, phone, source, wedding_date, location, guest_count, package_interest, message, status, created_at |
| enquiry_notes | id, enquiry_id, content, author_id, created_at |

Verify actual column types, nullability, defaults for id/created_at, allowed source/status values, notes foreign keys, author identity and deletion behavior. Existing UUID validation is retained. New public insertion expects `source = zuri-invites`; confirm actual source constraints before activation. Inspect actual RLS/grants to ensure public browser keys cannot read enquiries/notes/admin_users or mutate private records directly. The privileged key bypasses RLS; server checks do not fix an independently permissive database policy.

Use secure environment controls for NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL and SUPABASE_SECRET_KEY; use the same Supabase project. Public variables are intentionally browser-visible; the secret remains server-only. Never put secrets in chat or commit .env files. npm run verify:integration runs read-only table/column checks and prints no credentials or customer records.

Once configuration and schema evidence are available, verify in staging: public insert → fresh admin queue read → status change → note save/read after reload; non-admin denial; expired session refresh; sign-out; mobile/keyboard journeys. No migration has been fabricated or applied. Public abuse controls need evaluation against the actual deployment before a public launch; origin validation is not bot protection.

## Current website versus future

Current: corporate/Tech/Select/Pamoja pages, Invites, enquiry handling and internal operations.
Foundation: shared identity/authority principles and existing Next.js/Supabase boundaries.
Future: full Pamoja network, publishing workflows, canonical profile ownership, subscriptions/payment mechanics. Not implemented by inference.

Follow-on implementation is recorded in WEBSITE-MILESTONE.md: the general service enquiry journey and public discovery/reading interfaces are now built. Authentic live Select stories and Pamoja identities still require content, publication authority and schema evidence. Do not reuse wedding-specific fields or fabricate published stories/directory identities. No hosting migration or publication was performed: moving this Next.js app to the Sites Worker/Vinext runtime would require an explicit infrastructure decision under gate 5.
