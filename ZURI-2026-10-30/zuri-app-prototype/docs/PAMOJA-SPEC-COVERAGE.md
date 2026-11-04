# Pamoja specification alignment in the ZURI app

Source: `../audit-2026-10-12/evidence/Pamoja_PJ_001-018_Complete_Specifications.txt`, PJ-001–PJ-018 version 1.0, proposed engineering baseline. The original reference is unchanged. This implementation adds **50 canonical, addressable screen routes** plus contextual entry points and enhancements to the established app.

## Reconciliation with the current product

The human's later decisions take precedence over older navigation proposals: ZURI remains the public app; Pamoja describes its foundation. Lounge is Home. Its dock has Aura, Motion, Rizz and Lore and disappears in experiences. Aura uses Feed/Spaces/Societies/Find; Motion uses Planner/Events/Pings; Rizz uses Feed/Create/Channels/Chats; Lore uses Moments/Discover/Chapters/Profile. Pings and Society conversations stay contextual, with private DMs in Rizz. Trips are reached after joining a plan. Reels, standalone Browser/Tools tabs and a fifth dock destination are not restored.

Browser semantics live in Aura Find. Members/Wallet/commerce are reached from Your world, Profile, Find and Space offerings. Useful additions and games are contextual capabilities, with publisher, scope and revocation interfaces. This avoids creating disconnected top-level homes.

## Coverage

| Specification | Screens and interaction delivered | Authoritative services still required |
|---|---|---|
| PJ-001 Constitution/architecture | Your world guide, shared identity, canonical route registry, contextual ownership/actions, local owner role labels | Authenticated roles, institutional delegation, audited policy enforcement |
| PJ-002 Lounge/navigation | Atmosphere choices and lock preference; widget visibility/reordering; existing search/filter/scroll return state; contextual menus and no dock in detail experiences | Automatic session wallpaper rotation, push reminders and server widget permissions |
| PJ-003 Aura/Spaces/Pings | Space creation/consent/private draft, local listing preview, scoped Space Wall, identity settings, tagged association removal, Ping schedule editor with weekly Kampala occurrences and excluded dates | Real Space verification, public publishing, geospatial search and recurring notifications |
| PJ-004 Motion | Event drafting/editable stored drafts, existing ticket review/attendance preview, gated trip creation, Share/Hosted/Split modes, trip room/conversation and Host Wall with local lifecycle controls | Real event publication, paid/free entitlements, live seats, transport reservation, cancellations/refunds and notifications |
| PJ-005 Lore | Chapter evidence by experience type, collaborators/request drafts, experience overview, unverified evidence history, Expert/Business and Elite application drafts; existing rich journal/task/event/moment editor | Evidence validation, auditable XP awards/reversal, application submission and human tier review |
| PJ-006 Rizz | Existing camera composer extended with Chapter tags; source media stays canonical; local capture, channel and conversation flows retained | Cloud upload, scanning/moderation, transcoding, live video consent and delivery |
| PJ-007 Members | Commerce catalog by offering type, offering detail, option/quantity/request review, private Wallet/payment-method/refund views, request list and detail with separate order/payment/fulfilment states | Provider balances and transactions, merchant inventory, payment setup, real checkout, refunds/disputes and fulfilment |
| PJ-008 Societies | Public/private Society creation with open/approval/invite policy choice, owned private preview, topics/chats, shared Lore grouped by object, Gallery, Members, owner pin/settings interface | Real membership applications/approval/invitations, authorized directories and moderator role enforcement |
| PJ-009 Viola | Context permission/preferences, personal/business separation, own Space workspaces; explicit unconnected state retained | Authorized context retrieval, tool proposal/confirmation/execution receipts, model service and audit records |
| PJ-010 Browser | Unified typed network search in Find; categories, Saved, canonical links, explicit Jinja browsing mode and no inferred ranking; protected catalog Society entries excluded | Permission-aware search index, real approximate location and ranking |
| PJ-011 Tools | First-party additions catalog/details, publisher/version disclosure, explicit scoped grants/revocation, functioning Pocket notes and Packing list; own Space scopes only | Third-party review/signatures, sandbox runtime, billing, quotas and server grants |
| PJ-012 Graph/feed | Follow/unfollow on people, interests, block/mute/hide/restore controls; discovery/feed eligibility filters before rendering; transparent absence of inferred personalization | Cross-account graph enforcement, real recommendations, policy/ranking version history and analytics |
| PJ-013 Echo | Space subscription categories/unsubscribe, availability enquiry drafts, owner update drafting and local draft history without sent/delivered claims | Consent-backed recipient lists, verified senders, messaging delivery, notification limits and stock systems |
| PJ-014 Objects/tags | Chapter tags and shared media projections, source ownership/actions, scoped Space association removal, canonical search links and source-preserving Chapter unlinking | Versioned server relationship moderation/promotion, provenance events and cross-account visibility enforcement |
| PJ-015 Economy | UGX prices and reviewed totals, no invented Wallet balances, distinct payment/fulfilment stages, no automatic recurring subscription or XP-to-money conversion | Versioned fees/taxes, settlement/reconciliation, merchant agreements, chargebacks and payouts |
| PJ-016 Safety | Privacy/contact/city preferences; block/mute/restore, private report drafts, follow-up/appeal draft interfaces; protected views guarded locally | Verified age/guardian policy, multi-user enforcement, moderation staff, case assignment, appeals and retention |
| PJ-017 Games | Curated first-party Pairs listing and functioning solo memory game; opt-in launch, no chat, telemetry, purchase or XP | Reviewed third-party integrations, age-aware multiplayer and paid entitlement service |
| PJ-018 Readiness | Workspace status screen distinguishes working local capabilities and pending services; migration-safe optional data and backup merge; executable domain checks and this coverage map | Production capability gating, CI/observability, rollout approvals and migration/rollback operations |

## What “working” means here

Authored records and preferences persist on this browser/device and are included in the existing JSON backup flow. The current identity and existing data are preserved. New backups reject malformed money-like states, invalid tool scopes, unsafe evidence links, duplicate IDs and attempts to replace seed identities. Removing an association never deletes the source moment. XP history has no fabricated awards.

A local interface guard is not production authorization. Every live service above remains explicitly pending: there is no money charge, issued ticket, live delivery, moderation submission, verified tier, new customer list or claimed inventory. Event/application/enquiry/report/update records are drafts. Historical sample media remains labelled as sample material.

## Validation

Automated checks cover canonical screen routes, old workspace compatibility, consent requirements, discovery privacy, feed block/mute/hide eligibility, uncharged request drafts, trip eligibility/capacity/idempotency, scope escalation, safe evidence URLs, backup merging, Chapter tag ownership and Kampala weekly exceptions. Existing regression checks remain in place.

Manual browser verification uses a separate origin (`127.0.0.1:8444`) so QA records cannot overwrite the user's working `8443` workspace. Verified journeys include Space draft/consent gating, owner offering creation, request review and distinct unpaid states, private Society creation/topic access, addition permission opt-in, local note persistence and immediate revoke/back-entry denial; joined-Ping Hosted trip creation with canonical plan context; and a successful pair match in the solo game. Build/test output is in `verification/pamoja-build.txt` and `verification/pamoja-tests.txt`.

## Primary source files

- `src/experience/pamojaRoutes.ts`: 50 screen destinations and titles.
- `src/experience/PamojaScreens.tsx`: connected consumer and owner interfaces.
- `src/experience/pamojaModel.ts`: validated optional records, eligibility, consent, permission and ownership helpers.
- `src/experience/pamoja.css`: mobile styling layered over the current material language.
- Existing `Experience`, `ExperienceFlows`, `MobileWorlds`, `activity`, `model` and `backup` preserve canonical integration.
