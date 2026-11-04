# ZURI app checkpoint — 17 October 2026

This chat and the standalone app project are the primary environment for building the ZURI application. The active root now opens Experience V2 directly. The earlier delivery inside `zuri-web` was a website-hosted implementation; it is not the app's primary entry point.

## Delivered in the app

Lounge is one scrollable workspace with widgets, focus tasks, shared saved objects, a daily focus helper and expandable Viola. Aura has Home / Spaces / Societies / Find; Motion has Planner / Events / Trips / Pings; Rizz has Feed / Create / Channels / Chats; Lore has Moments / Discover / Chapters / Profile. Shared objects retain the existing sample IDs and data. All conversation details resolve into Rizz, including malformed cross-world object links. Established detail links have V2 redirects.

The app includes responsive desktop and mobile navigation, contextual object links, back-state restoration, local post creation, photographs, reactions, local conversations, personal collections, profile editing, local persistence, JSON export and non-destructive backup merge. Legacy authored content and local interests can migrate from the earlier same-origin storage without deleting that snapshot or presenting demo funds as real bookings.

An app manifest and production-only service worker support a standalone display and cached app shell. On installation the worker caches the HTML and the compiled entry scripts/styles, rather than assuming a second online visit. API responses and third-party resources are excluded. A visible offline state explains image and service limitations. Browser installation availability varies. Native app-store packages have not been created.

The API adapter has no invented default service. Without a deliberately configured app API, Viola shows an honest disconnected state while local quick actions remain usable. API keys do not belong in client configuration.

## Verification

- The app's own strict TypeScript and Vite production build passed.
- All 24 automated tests passed: 13 retained domain regressions and 11 tests for the V2 app, canonical object routing, legacy links, backup preservation, migration, data validation, focus idempotency, API configuration and offline-shell behavior.
- Interactive browser checks confirmed the standalone app root, all sixteen destination sections, Lounge-to-Planner shared tasks, Aura search and focused-card restoration, local Rizz creation, Rizz conversation routing, Lore chapter creation, profile backup controls and Viola's unconfigured state.
- Mobile layout was inspected at 390 × 844. The default desktop preview was also exercised. Browser inspection was performed against this app's Vite server, not the Next.js website.
- `tests/browser-smoke.cjs` is updated for V2 and syntax-checked. It is an optional repeatable Playwright suite; the recorded browser verification above was performed through the connected browser, not by claiming this standalone suite was run.
- Offline behavior was verified in service-worker unit tests. A full physical-device installation/offline audit remains pending.

## Still pending

Real shared account identity and Supabase persistence, recipient-authorized message delivery, cloud media/video processing, verified memberships, bookings, payment providers, unattended scheduling and live Viola configuration are not connected. The UI labels device-local and sample behavior. No real message, booking, purchase or background job is claimed.

The website source was not modified during this app correction. The original app shell remains in `src/LegacyApp.tsx` with its prior domain modules for incremental reuse. The active app does not import that shell or depend on `zuri-web` to run.

The corrected handoff is `ZURI-App-V2-source.zip`, containing app source, app tests and the compiled app. It contains no corporate website project. The ZIP is a portable backup; future development continues in this workspace and its app preview.
