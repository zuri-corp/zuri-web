# ZURI web app — 26 October 2026

The current ZURI app now ships inside the website at `/app`, with `/experience` as a compatibility entry. Pamoja and the website navigation open this edition. `/pamoja/app-preview` redirects to `/app`, replacing the earlier handoff to port 8443.

## Source and packaging

The canonical app remains in the sibling `zuri-app-prototype` project. From `zuri-web`, run `npm run build:app` after app changes, then build the website normally. The script uses `vite.website.config.ts` to compile the same React components, state model and flows into `public/zuri-app`. These generated assets must ship with the website. A standalone website checkout/deployment needs only the committed package; it does not need to run Vite or access the sibling source. Regeneration requires the sibling source and its installed dependencies.

The website edition adds `web-materials.css` and `website-layout.css` at build time. At 900px and above, `DesktopWorkspace.tsx` provides a persistent left rail for Lounge/Aura/Motion/Rizz/Lore, workspace shortcuts, actual open-task and Chapter counts, recent local Chapters, profile and Viola access. App sections use horizontal tabs below the header. Bottom docks are hidden and desktop navigation remains visible while scrolling. Lounge has a four-world launchpad and two or three widget columns; Spaces and Chapters use wider grids. The enclosing website header is hidden on desktop so the app fills the viewport; website links remain in the rail. Mobile retains its existing contextual navigation. The standalone preview is unchanged by these website-only components and styles.

## Hosting and state

The website header stays available outside a full-height app frame. App routes are mirrored into the outer URL after validating message origin, source frame and route format. Refreshing a deep link preserves the world, tab and object context. Internal public assets are packaged under `/zuri-app/`; external sample media retain their original URLs. The website edition does not register the standalone app service worker.

Web records use `zuri-web-app-v1`, separate from the older embedded prototype's `zuri-experience-v2` records. Existing data is not overwritten or automatically migrated. Browser data is also separate from the app preview at port 8443. Sign-in, shared accounts and cross-device synchronisation have not been added.

Viola uses the existing same-origin `/api/viola` endpoint, with its existing server configuration, cookies and rate limits. No keys are bundled. If that service is unconfigured, the app retains its existing unavailable-AI state and local quick actions. Public publishing, merchant replies, payments and message delivery retain their current prototype limitations.

## Verification

Check the website `/app`, compatibility `/experience`, Pamoja links, static JS/CSS and brand assets, plus refresh on `/app#/motion/planner?kind=ping&id=sample`. Run the navigation/packaging tests before website deployment. UI actions should be tested on a separate browser origin when writing sample data.
