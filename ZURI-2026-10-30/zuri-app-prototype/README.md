p# ZURI app — primary development project

This is the standalone ZURI application we build and preview in this chat. It opens directly at `/` into Lounge. The current source of truth is `src/App.tsx` → `src/experience/Experience.tsx`. The old directory name `zuri-app-prototype` is retained to preserve project continuity.

The sibling `zuri-web/` is the corporate website and existing Supabase/backend reference. It is not this app. Future app milestones should update this project and its running preview here.

## Run

Use the existing Node.js environment and installed dependencies. If dependencies are absent, install from the existing package lock.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 8443
npm test
npm run build
```

The app preview is `http://127.0.0.1:8443/`. `npm run preview -- --host 127.0.0.1 --port 8443` serves the compiled production build instead. Production output is `dist/`, an app shell that can be served by static hosting with an index fallback. No corporate Next.js server is needed to run it.

## Experience V2

- **Lounge:** one scrollable workspace, shared focus tasks, saved objects, configurable widgets, daily focus helper, floating expandable Viola. No news, Browser or Tools tabs.
- **Aura:** Feed, Spaces, Societies, Find.
- **Motion:** Planner, Events, Pings. Trips open from joined plans.
- **Rizz:** Feed, Create, Channels, Chats. Every person-to-person conversation enters Rizz.
- **Lore:** Moments, Discover, Chapters, Profile. Your own photo moments belong in Moments; other sample people are in Discover.

The app retains ZURI's branding, shared identity, vivid destination colors and established Jinja sample objects. It uses a focused mobile canvas at every viewport size, with the app dock on Lounge. Shared saves, plans, local posts, photo collections, reactions and profile edits work across destinations. Back navigation restores search, filters, scroll and identifiable focused cards. Missing records, image failures, loading, unavailable AI, empty results and storage failures have visible states.

## App capabilities and persistence

Personal app data is currently device-local under `zuri-experience-v2`. The profile exports JSON backups and merges imported backups without deleting local records or replacing the current identity. A malformed backup does not replace the workspace. Same-ID records already on this device take precedence.

If the earlier `zuri.prototype.v1` storage exists on the same origin, the app brings forward authored local text/photo posts, joined Society interests and planned event/Ping identifiers when V2 data is absent. It excludes built-in sample posts and does not convert demo wallet activity into real bookings. The earlier storage remains untouched. Earlier custom entities and transaction records remain in that legacy snapshot; there is no fabricated server migration.

The production build includes a standalone-app manifest and an offline service worker. It caches the shell and same-origin static assets after a successful online visit. It excludes API responses and external resources. Remote sample photographs that were not cached may show an image fallback offline. The service worker is disabled during development so edits remain immediately visible. Browser installation support varies; native app-store packaging is not included.

The daily focus helper runs once per Kampala calendar day when the app opens and the helper is enabled, or on Run now. It preserves existing completion and does not run while the app is closed.

## Genuine services still to connect

Cloud object persistence, realtime message delivery, media/video processing, real memberships, event bookings, payments and background automations are pending app backend work. The current preview labels its device-local actions and sample content. Writing a local conversation does not deliver it to a recipient. Adding an event to Planner does not buy a ticket or reserve a seat.

Viola connects to the configured Supabase `zuri-ai` Edge Function using the signed-in, verified user's session and the public project settings in `src/data/publicBackend.json`. The function must be deployed, configured with the provider key, model and positive per-mode token rates, and enabled under the existing AI account and cost policies. The app never contains or receives a provider key. A cross-origin deployment also requires the app's exact origin in `ZURI_ALLOWED_ORIGINS`. If those server-side prerequisites are missing, Viola reports that live AI is unavailable; it does not invent an on-device conversational answer.

An alternate same-origin service can be selected with the public build-time setting `VITE_ZURI_API_BASE`, for example `/api` when a deployment reverse proxy serves the account API. This is an API base, not an API key. The app then calls `GET <base>/viola` and `POST <base>/viola`; provider keys remain server-side.

## Source layout

- `src/experience/Experience.tsx`: active app shell and current functional screens.
- `src/experience/model.ts`: V2 routes, persisted record schema, validation and daily focus.
- `src/experience/backup.ts`: non-destructive backup merge and legacy migration.
- `src/experience/services.ts`: explicit optional app API adapter.
- `src/experience/experience.css`: responsive world styles.
- `src/data/mockData.ts`: established shared sample catalog.
- `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`: app installation and offline shell.
- `src/LegacyApp.tsx`, `src/apps/`, `src/state/`: retained prior implementation and domain logic; not imported by the active shell.

`npm test` covers V2 plus the preserved prior domain regressions. The optional current browser suite is `tests/browser-smoke.cjs`; its legacy counterpart is retained as `tests/browser-legacy.cjs` and is not a test of V2. See `docs/APP-V2-MILESTONE.md` for the verified milestone.

## Contextual app update — 19 October 2026

The current navigation is Aura **Feed, Spaces, Societies, Find**; Motion **Planner, Events, Pings**; Rizz **Feed, Create, Channels, Chats**; Lore **Moments, Discover, Chapters, Profile**. The app dock appears only on Lounge. App names and the upper-left home button return to Lounge. Object details, editors and rooms collapse the app tabs and use contextual headers.

Implemented locally: Society topic/group-chat creation and full-screen conversations; Ping creation, invitations, join/leave, location, participation and contextual conversations; attendance ticket review and accessible swipe confirmation; gated contextual trips; searchable Space/Society/Event/Ping post tags; small camera picker with photo and short video support; owned channel creation, publishing, management and archive/restore; journal Chapters with moments, editable notes, linked events and tasks shared with Planner. New records are validated and included in JSON backups. Existing authored data is preserved.

Attendance is an explicit local demo: no charge, admission ticket or transport booking is created. Delivery, cloud media, live membership/approvals, payments, actual reservations and background notifications remain unconnected. The sample catalog is finite; context search searches that catalog plus locally created Pings. Preview records created during browser verification are clearly named App preview.

## Pamoja specification screens

The current app includes 50 addressable interfaces aligned with the recovered PJ-001–PJ-018 baseline, reconciled with the latest four-app navigation. Start with **Lounge → Your world** or **Lore → Profile**. Space, Society, Chapter and joined-plan screens link to their own operational interfaces. See [the coverage and pending-service matrix](docs/PAMOJA-SPEC-COVERAGE.md).

Commerce requests, event/report/application drafts, owner workspaces, consent controls, trip coordination and first-party additions work locally. Wallet money, real ticket issuance, public publishing, actual moderation/verification, message delivery and live membership still require their authoritative services. A local UI permission does not replace server authorization.
