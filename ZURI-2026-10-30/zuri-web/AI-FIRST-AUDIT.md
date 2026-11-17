# AI-first evolution audit — 17 November 2026

## Current slice
- Full AI Mode expands the existing conversation over the app and collapses back to the previous route.
- Closing chat preserves in-memory conversation and drafts. New topic clears them. Account changes clear the conversation.
- Explicit questions about today's Planner invoke the existing user-authenticated records service. Only dated task titles and completion flags enter model context.
- General explanation, learning and collaborative writing guidance is added to Viola.
- Existing structured drafts, user-reviewed publication, verified event/Ping retrieval and opted-in Channel excerpts remain available.
- Existing provider adapters and cost reservations remain in use. No model or spending cap was changed.

## Boundaries
The Next.js website, Vite app, Supabase edge gateway and database remain the implementation boundaries. No parallel action backend was added. Planner reads use the same database entry point as the manual UI.

Developer Studio already contains manifest, sandbox and gateway foundations. Arbitrary external Tool execution, a production execution registry, scheduled jobs and provider installations remain incomplete. This release uses the established native Planner operation, not a new general Tool Gateway.

## Gaps and order
1. Verify this slice in a signed-in mobile/desktop session, including account switch, expanded/compact chat, today's tasks and a reviewed Ping draft.
2. Add account-owned conversation history and explicit memory controls, including deletion and expiry. Current continuity ends on page reload.
3. Add consented document/reference retrieval and grounded context selection. Upload and voice capabilities must be implemented through the same allowance system before advertising them.
4. Evaluate model alternatives on representative questions under the existing cost caps. Current model access is unchanged.
5. Integrate existing Studio contracts with a narrowly scoped native execution registry and durable receipts. Add authorization, replay and failure tests before external connectors.
6. Add permissioned regional knowledge, opportunity ranking and outcome feedback.
7. Validate launch copy against working capabilities and update the corporate website.

## Existing limits
Interest selections currently stay on the device. No persistent memory, document reasoning, speech synthesis, external calendar write, social publishing or autonomous monitoring is introduced by this slice.
No migration is needed for this slice. The default provider-cost trial remains $0.25 monthly per verified account with the existing $5 daily service cap. Credit-unit conversion is still undecided.
