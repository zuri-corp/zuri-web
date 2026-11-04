# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

## Current app target — 17 October 2026

This is the primary ZURI application workspace. `src/App.tsx` mounts the standalone Experience V2 at `/`. Active app code lives under `src/experience/`, with the established shared seed objects in `src/data/mockData.ts`. Styling is imported through `src/main.tsx` after the existing Tailwind entry point.

`src/LegacyApp.tsx`, the old `src/apps/` screens and their state logic are retained for reference and incremental domain reuse. They are not the active app shell. Do not accidentally restore the old Tools/Browser Lounge, XP destination or multiple messaging homes. New messaging flows belong in Rizz Chats.

The sibling `zuri-web` directory is the corporate website and existing backend reference. Do not package it as the ZURI app. Future app edits and previews should run in this directory. See the project-root `ZURI-APP.md` and this directory's `README.md`.

## Mobile app direction — 19 October 2026

Lounge is Home, not a destination in the bottom app bar. The bottom app bar contains only Aura, Motion, Rizz and Lore, at all viewport sizes. A home control in the header returns to Lounge. Keep the app as a focused mobile canvas; do not restore the desktop sidebar or large Viola marketing hero.

The home composer is compact: Viola identity, text input, browser microphone control and an expandable details panel. Preserve Planner widgets and the Ping and Lore collection widgets. The Lore widget selects the person's photo moments and adds them to an existing or new chapter.

The richer active destination views are in `src/experience/MobileWorlds.tsx`, with mobile composition in `src/experience/mobile.css`. Preserve photo-led Spaces, Society details and topic discussions, connected event details, broadcast-style channels and actual inbox/chat bubble layouts. Topic discussions belong to their Society; private conversations still have their single home in Rizz. Keep sample activity and device-local actions honestly labeled. The older source supplied in Downloads was inspected read-only as a visual/product reference.

## Contextual experience rules — latest 19 October update

The latest user direction overrides earlier messaging and dock rules: the four-app bottom dock appears ONLY in Lounge. Tapping an app/context title or the upper-left home control returns to Lounge. Inside an app, keep its section tabs; inside an object, conversation, checkout or editor, hide those tabs and use only a contextual header and back control. Society rooms show Society and conversation names; Ping conversations remain in that Ping. Private direct messages remain in Rizz.

Aura starts with Feed (tagged Space/Society photo and video media), not Home or a Space directory. Motion has Planner, Events and Pings; trips are contextual and gated by Ping participation or event attendance. Pings support creation, local invitations, joining, clear location and participation details. Do not invent invitation counts missing from seed data.

`ExperienceFlows.tsx`, `activity.ts` and `flows.css` implement the current contextual flows: searchable multi-kind post tags, camera media picker, full-screen rooms, local attendance review/swipe demo, owned broadcast channels and journal-style Chapters with shared Planner tasks. Payments, notifications, public publishing and message delivery require live services; the app must label local preview actions honestly.

## Visual polish

`src/experience/polish.css` is the final visual layer imported by `src/main.tsx`: warm graphite surfaces, restrained app accents, system-oriented typography, floating translucent navigation, consistent control sizing and reduced-motion/high-contrast preferences. `AppGlyph.tsx` provides the original SVG navigation icons. Preserve context-only rooms and existing accessibility names when refining visuals. No external icon or animation dependency is required.

## Pamoja PJ-001–PJ-018 alignment

The reference baseline is mapped in `docs/PAMOJA-SPEC-COVERAGE.md`. Keep the latest user navigation and ZURI branding when reconciling old PJ proposals. New contextual interfaces live in `PamojaScreens.tsx`, their route registry in `pamojaRoutes.ts`, validated optional local data/helpers in `pamojaModel.ts` and styling in `pamoja.css`. These integrate with the existing Experience shell, backup model and canonical objects; do not switch to the corporate website.

Wallet/XP must never acquire fabricated monetary balances or awards. Event/commerce/report/Echo/tier flows remain draft/preview states until the relevant authoritative service is connected. Catalog identities cannot be replaced by imported local entities. Local ownership checks are preview safeguards, not multi-user authorization. Keep private catalog Society content out of global discovery and feed eligibility. QA writes use a separate origin from the user's active app workspace.
