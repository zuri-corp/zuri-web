# ZURI Experience V2

Implemented 16 October 2026 in the existing `zuri-web` Next.js application. Open `/experience` after starting the application. This is a functional device workspace, not a live social network. The corporate website, Pamoja authentication, publishing and Supabase services remain intact. The source prototype remains available separately and was not rewritten.

## Run

Use the existing package lock and Node installation. From `zuri-web`, run `npm ci` if dependencies are missing, then `npm run dev`. Visit `/experience`. For production: `npm run build`, then `npm start`. No database migration or machine settings changes are required for this preview.

## Delivered behavior

| Destination | Sections and behavior |
|---|---|
| Lounge | One scrollable workspace, shared focus tasks and saved objects, configurable widgets, an idempotent daily focus helper, floating expandable Viola. No news, Browser or Tools sections. |
| Aura | Home, Spaces, Societies, Find. Search, filters, saved objects, local Society membership, Space details and related events. |
| Motion | Planner, Events, Trips, Pings. Personal tasks, completion and removal; add/remove sample objects from Planner. Planning never claims a booking. |
| Rizz | Feed, Create, Channels, Chats. Local posts, small photograph attachments, Space tags, reactions, contextual channels and conversation drafts. The sole messaging home. |
| Lore | Moments, Discover, Chapters, Profile. Moments contains the current person's own photo posts; Discover contains the earlier prototype's sample people. Create collections, select their photographs, delete collections while retaining moments, edit the shared local identity. |

The visual system extends the prototype's dark surfaces, vivid world colors, shared identity and Jinja-based sample objects. Lore inherits the prototype's blue destination color. Desktop sidebar, mobile dock, responsive grids, keyboard focus indicators, native modal focus containment, reduced-motion support, image fallbacks, route loading/error boundaries, empty states and storage errors are included. Navigation retains search, filters, scroll positions and identifiable focused cards by browser history entry; in-progress form text survives navigation within the session. Deep links identify the same objects across destinations.

## Data and integrations

- Personal changes persist in this browser's local storage, under `zuri-experience-v2`. They are not synchronized with Supabase or sent to other people. The profile screen exports these records as JSON. Export is a backup artifact; importing it is not implemented.
- Invalid stored data is not automatically overwritten. A visible recovery banner allows export of the in-memory workspace or an explicit local reset. Browser quota failures are visible. Photos are limited to JPG, PNG or WebP below 900 KB to fit device storage. Clearing browser data removes local records.
- Listings, people, prices and dates come from the existing prototype's `mockData.ts`, copied to `src/lib/experience/seed.ts`. They are illustrative, not confirmed availability or real memberships. External sample image URLs are retained with a local visual fallback on failure. No external integration is implied by these images.
- The focus helper runs on application opening when enabled and once per Kampala calendar day, or on explicit Run now. It is not a server scheduler. It does not duplicate an existing daily focus task or reset its completion.
- Viola quick actions work locally without AI. Optional live replies use `/api/viola`, adapted from the existing guarded server-side chat endpoint, with a separate signed session cookie and workspace-specific instructions. The endpoint uses the existing `OPENAI_API_KEY` and `ZURI_CHAT_MODEL` environment variables. Never put the API key in a public environment variable. Live replies have no tool access, do not receive workspace records, and cannot execute actions. Missing configuration and connection failures are visible. Signed cookies, same-origin enforcement, body limits, conversation validation, request timeout and process-local rate limits are preserved. Distributed rate limiting is still a production requirement for multiple server instances.
- Existing Supabase authentication and APIs continue to serve the website; this preview does not silently impersonate an authenticated user or bind the seeded Alex Kato identity to a real account.

## Pending production work

1. Define and apply the app's authenticated Supabase tables and row-level policies for shared identities, objects, memberships, plans, messages, posts and collections. Map existing Pamoja accounts deliberately rather than creating a second account system.
2. Add realtime message delivery, unread state, recipient authorization, moderation/reporting and retention controls. Current messages are explicitly local records.
3. Connect authenticated media storage and processing for photos and videos. Current creation supports small local photographs; video is not implemented.
4. Implement booking, ticketing, availability, trip coordination and any payment service only after selecting actual providers and business rules. Current Planner records interest.
5. Add authorized server scheduling, permission controls and execution logs for unattended automations. Current helper runs only while opening or using the app.
6. Configure a model and API key to exercise real Viola responses; automated endpoint tests use a mocked provider and no paid request was made.
7. Production deployment, device/account synchronization, offline conflict resolution and an independent assistive-technology accessibility audit remain pending.

## Verification

- TypeScript check passed.
- Production Next.js build passed, including `/experience` and `/api/viola`.
- All 165 tests passed: the 160 existing regressions plus 5 V2 tests covering navigation contracts/deep links, data validation, daily focus idempotency and the isolated Viola endpoint.
- Browser checks at the default mobile viewport (450 px) and a 1440 px desktop viewport confirmed the Lounge composition, shared focus tasks, Aura filtering, search/focused-card restoration after Back, Rizz local post creation, Lore chapter creation, event-to-Planner flow and event-to-Rizz conversation routing. Viola correctly showed its unconfigured state. Desktop DOM checks found one main landmark and no horizontal page overflow.
- Real AI responses, real messaging, cloud persistence, video processing and booking integrations were not tested because those services are not connected.

The Windows sandbox initially prevented Next.js from resolving its own project directory; the same build completed with execution approval. No operating-system settings or files outside the project were changed. No synced `sources/` files were modified.
