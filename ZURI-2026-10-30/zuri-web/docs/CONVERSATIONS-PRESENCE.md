# Easier conversations and digital presence — 16 October 2026

## The customer journey

Tech now invites visitors to explain what they want to build, fix, improve or secure. Its main action opens the on-page ZURI guide. The floating site shortcut opens the same destination. The guide gathers context before handing off: a visitor explicitly prepares a brief, reviews editable text, adds a reply contact and chooses to send it through the existing private enquiry workflow. Only visitor statements go into the handoff; model-supplied prices or promises are not copied as agreements. The brief uses browser session storage rather than a URL query string.

## Live AI status

The implementation supports OpenAI Responses and Gemini `generateContent` on the server. Set `ZURI_AI_PROVIDER` plus the matching private provider key, model and metering rates. No key is included in the local workspace, so AI remains disabled until configured. Never put the API key in a `NEXT_PUBLIC_` setting or paste it into the public UI.

The integration sends bounded user/assistant message history, owned ZURI context, `store: false` and a bounded response length. No browser execution, publishing, orders, external tools or autonomous enquiry submission are available to the model. Provider response storage is disabled through `store: false`; this is not a claim of zero provider retention. The interface discloses the provider and that a human confirms scope and price.

The chat route uses same-origin checks, signed HTTP-only session cookies, input validation, timeouts, and per-session and global process limits. These limits are per process, not a shared production quota. Configure provider spending controls and shared edge rate limits before public high-volume use. Conversation messages remain in component memory; only an explicitly prepared brief is carried to the review form.

Official references:
- https://developers.openai.com/api/docs/guides/conversation-state
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://ai.google.dev/gemini-api/docs/structured-output

## Pamoja setup

Three short steps collect the public name, what they do, what they sell and offer, optional location, up to three photos, and website/social links. The visitor reviews a real profile preview before supplying a private reply email and confirming authority and consent. There is no product catalogue, inventory, cart or account prerequisite. Sending creates a private profile-setup enquiry, not a public profile. Existing management editing now supports social links directly and removes technical fields from the main form.

The intake endpoint uses the existing `enquiries` table. Photos require a connected Supabase server configuration and a PRIVATE staging bucket. `database/proposals/004-pamoja-intake-photos.sql` is an unapplied bucket proposal; no cloud bucket or database was changed in this task. The application refuses uploads into a public bucket. Files are limited by body size, count, per-file size and JPEG/PNG/WebP signatures. Failed enquiry saves remove already-uploaded staging objects. Administrator-only photo links use short-lived signed access; photos are never automatically made public. Configure the existing Supabase settings and the private bucket to enable live delivery. Uploaded-photo publishing remains part of consented profile review; staging URLs are not public assets.

The proposed commercial offer has two scopes: Presence (setup, photos, chosen links and a clear discoverable profile) and Presence + Care (the same presence plus agreed updates and marketing help). Custom websites remain a separate offer. No final prices or payment flow were invented; quote the smaller package before the customer commits.

## Discovery and Select

Pamoja search now normalizes natural-language filler and punctuation, matches common skill synonyms and small typos, indexes descriptions, biographies and public link titles, and ranks name matches first. New searches clear stale type/category filters and move the visible results into view. Explicitly chosen filters still apply afterward. Fictional-photo disclaimer wording is excluded from biography matching so a model portrait does not turn a designer into a photography result.

Select now has working subject filters, title/summary search and separate groups: the AI at Work series in reading order, followed by the wider products, policy, technology and history collection. Empty searches can reset to all stories. Its red photographic identity remains intact.

Homepage Tech and Select portals now include animated binary columns and a robot outline, and red waves with an outlined Select wordmark and light. Decorative motion respects reduced-motion settings.

## Verification

All 160 automated tests pass, including mocked chat and private-photo delivery flows. ESLint passes. Browser checks cover conversation-to-enquiry transfer, directory queries with stale filters, photo and link previews, Select filters, and phone layouts. No live AI calls or cloud submissions were made.

The final production build passes, including TypeScript. Select and homepage phone views have no horizontal overflow at 375px.
