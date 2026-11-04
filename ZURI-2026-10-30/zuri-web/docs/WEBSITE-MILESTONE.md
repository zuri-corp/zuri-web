# ZURI website milestone — four destinations

This extends the enquiry repair milestone. Original uploads and public brand assets remain unchanged. The existing Next.js/Supabase architecture, Cache Components and partialPrefetching remain in place.

## Current website delivered in source

| Destination | Implemented journey |
| --- | --- |
| Corporate | Short introduction → Tech partnership/product → Select stories → Pamoja invitation → participation conversation; human About story; shared navigation, contact and footer |
| Tech | Partnership, software, business tools, AI/automation, security guidance, training and marketing detail pages → preselected service enquiry → existing secure enquiry API and admin queue |
| Invites | Existing product and wedding enquiry → interactive fictional wedding example with local-only response interaction |
| Select | Editorial cover, category anchors, lead/secondary stories → reading pages, image captions, explicit preview attribution, related stories and sharing |
| Pamoja | Search names/location/categories/offerings → combined category/type filters → Space/creator profiles → enquiry to ZURI about participation |
| Operations | Protected review queue, pagination, status management, internal notes, retry/error handling and sign-out retained |

General enquiries reuse the evidenced existing table columns. New type is validated (`tech`), source is server-controlled (`zuri-tech`), service is allowlisted, and structured context is included in message. No new database migration or schema assertion. Verify actual source constraints and nullable fields before activation. Contact requests do not create identities, promise membership, guarantee editorial publication or constitute a purchase.

## Visual and accessibility decisions

Shared parent ZURI wordmark in navigation; original destination logo assets remain on destination pages. Tech uses structured blue capability/product composition. Select uses warm paper, editorial hierarchy and angled divisions. Pamoja uses restrained monochrome, muted green and identity/discovery structure. The homepage ends with a participation invitation.

Keyboard skip link, labelled navigation/search/forms, active/pressed/expanded states, Escape menu dismissal, focus visibility, reduced motion and mobile layouts. Pamoja filter state is in the URL, allowing browser back/forward to restore the search context. No global scroll reset introduced; standard Next navigation remains.

## Honest content and boundaries

Existing fictional directory entries and illustrative story titles are retained and expanded only as explicitly labelled examples. There are no invented reporters, real accounts, publication dates, client testimonials, verified badges, availability or prices. Example profile/story/detail pages are noindex. Demo wedding responses remain on-page without collecting names or writing guest data.

The approved curated publishing CMS is now implemented in source; see PUBLISHING-MILESTONE.md. Self-service profile claiming, new visitor auth, memberships, payments and the full Pamoja application remain outside scope. Live storage still depends on actual database evidence.

## Verification

Production Next build and TypeScript: passed. ESLint: passed. 47 tests: passed using real handlers/validation/search/proxy code and controlled Supabase doubles. General tech routing, allowlisted services and required message tested; directory combined filtering and profile route boundaries tested.

No browser controller is available in this managed runtime, so no visual browser QA or preview server was run. External imagery still uses the pre-existing Unsplash URLs and may fail under network restrictions. Background colour provides a fallback; image performance and mobile presentation still require browser verification.

Secure Supabase variables and SQL/RLS evidence remain unavailable; no real login, live customer write/read, public-profile lookup or publication has been verified. No deployment was performed. Code-level and mock verification do not establish production readiness.

## Consequential next decision

The Product Director approved curated ZURI publishing (Option A). Authorized admins publish stories and consented public representations; there are no visitor-owned accounts or claiming yet. A curated public representation is not a claimed canonical user identity.

After that decision, inspect supplied/securely connected schema evidence before designing or applying public-content tables and policies. Use a Next-compatible deployment path to preserve the mandated framework; a Worker/Vinext port would be a separate architecture gate, not routine publication.


Later update: STRATEGY-REPOSITIONING.md records the new technology-partner positioning, three Tech pillars, separate navigation, richer Spaces and the pending ownership/contributions decision. Earlier sample content and positioning descriptions above are historical.
