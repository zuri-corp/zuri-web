# App export status — 30 October 2026

Status: STABLE FOR EXPORT — a tested partial backend integration, with remaining capabilities explicitly listed below. No app source edits or .next builds are currently in progress. The standalone app, website edition and production Next build all passed; the website preview is restored on port3015.

## Connected source
- Active app shell now defaults to `CloudWorld` rather than the prototype catalogue. Lounge, Planner, private Moments/Chapters/post drafts, profile, owned communities, chat invitations/conversations, account notifications and private files call the canonical backend. Directory searches use actual `zuri_discover` results, including the `entity_kind` envelope.
- Website edition uses authenticated cookie API routes. Standalone browser/WebView supports explicit email-code sign-in and server-verified Bearer sessions against deployed Edge Functions. No login email is sent without the person submitting the form. No fake Auth identity, verified email or administrator is created.
- `src/data/publicBackend.json` contains only the Supabase public URL and `sb_publishable_` key. No server secret/provider credential belongs in app configuration. Browser session tokens live in sessionStorage, not in app backups. A native non-WebView client still needs its platform secure-storage/auth adapter.
- Revisions are supplied on private-record edits. Failed writes show errors and keep form text; create/message request IDs survive uncertain retries in memory. Account changes invalidate in-flight results and clear private screen state. Sign-out clears direct session and in-memory private data. No automatic cross-account upload.
- Actual upload response IDs can attach private media to records and entity drafts. Attachments remain private; this is not public media publishing. Private files open only through owner-authorised short-lived signed URLs.

## Removed and preserved
- Runtime `catalog.ts` has no fake people, Spaces, Societies, posts, events, Pings, products, trips, wallet balance or transactions. Historical fixtures are under tests/fixtures and loaded only by the Node test loader. Fresh fictional Society conversations and default seeded channels are removed from live runtime.
- New workspaces use a neutral device label and empty bio/automations. Old sample automation schedules are not automatically run on startup. Live headers do not reuse old local identity/badges as authenticated identity.
- Device data is NOT deleted, reclassified or automatically uploaded. The explicit device-review entry preserves existing text, user uploads and local edits. Uncertain legacy records remain local and visibly separated from cloud. Device task import is still the explicit selected-task CloudAccount flow; never bulk import private work implicitly.
- Fictional website directory profiles no longer appear in default profile delivery. Owner-supplied Dawdy/ZURI profiles and photographs remain. Illustrative tours and notification design preview remain clearly separate and labelled, never live activity.

## Real-source status
The existing opportunity reader remains connected where its API base is configured and validates provenance/freshness through the shared contract. Inspected local flags: ZURI_OPPORTUNITIES_ENABLED=false and ZURI_AI_ENABLED=false; approved public/AI Edge forwarding flags remain true. External collection was not activated and no paid API was enabled. No actual opportunity inventory has been verified. Google Maps is venue matching only; Quicket is permission/credential gated. Cold start is NOT claimed solved.

## Material limitations
- Verified-user end-to-end Auth/data writes still require a real user to sign in and verify their email; no test email was sent. Two-real-account isolation, remote conversation delivery and remote edit conflict behavior remain pending verification. Transport tests use controlled response doubles.
- Connected interfaces intentionally cover the operations exposed by migrations001–010. Rich public social/media feeds, public channel updates, Society topic/group-chat backend workflows, rich chapter blocks, entity editing/offer management and public profile photos still need additional authorised API contracts. Those views do not pretend sample data is live. Legacy richer editors remain accessible only in the explicitly device-local workspace.
- Account notifications currently support actual list/mark-read and context conversation links. Snooze/archive/quiet-hours design remains device-local, not synced server policy. Push/email delivery is not connected.
- Community creation saves a private draft; public listing requires separate review. Membership state is server confirmed. No payments, attendance purchase, paid memberships or fabricated availability are claimed. No remote migrations replayed and no remote records deleted.
- Default record APIs return at most100 rows; pagination/full account export remains a backend prerequisite. Unsaved connected form drafts survive request failure while the screen stays open, but offline edits are not automatically queued/synced or durably stored. Do not claim a full offline sync engine.
- Existing static bundle-size warning remains.

## Verification
- App TypeScript + Vite production build: passed.
- App regression suite: 123 passed. Additional final focused check: 9 passed (5 transport/account-epoch/media checks plus 4 runtime/data-contract checks).
- Website publishing + repositioning regression suite: 41 passed. The obsolete fictional-story alias assertion was corrected to require null while preserving genuine published records.
- Embedded website edition rebuilt with existing `npm run build:app`: passed.
- Standalone browser inspected: signed-out Lounge/account prompt, neutral identity, public Find; actual no-match search returned the zero-results UI with no fallback catalogue. No sign-in email or private mutation was performed.
- Final Next16.4.3 webpack production build: passed, including100 generated pages. An initial restricted-runner EPERM on a generated folder was resolved by rerunning the build outside the restricted runner. No source workaround weakened permissions. Production preview on port3015 restored (session4883).
- Embedded browser verified after final bundle refresh: real-account screens load inside the app iframe; signed-out public Find has no seeded catalogue; Lore Profile offers the website cookie-session sign-in link. Desktop rail uses a neutral placeholder and hides local counters outside explicit device mode. No login email/private write was performed.
- Existing build-app cleanup replaces only the known generated public/zuri-app tree after successful build; current assets contain only the latest JS/CSS. Final .next build is complete; no build race remains.
