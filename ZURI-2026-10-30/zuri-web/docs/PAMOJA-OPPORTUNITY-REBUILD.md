# Pamoja opportunity network — implementation handoff

Edition: 20 October 2026. The cloud-only clause was explicitly overridden by the user, who authorized rebuilding the existing local source.

## Delivered

- Monochrome Pamoja landing page with the positioning “Your presence. Your opportunities. Your terms.”
- Spaces as a flagship, with a representative interactive Space at `/pamoja/space-preview`.
- Six guided journeys: offering, private Motion intention, Space, Lore organization, external opportunities and Rizz distribution.
- Final review and separate explicit consent controls for offering, request and distribution previews. Preparing an application pack never sends it.
- Shared ZURI navigation, existing identity/account routes and existing public profile delivery retained. Homepage Pamoja copy reflects the new positioning.
- Existing searchable directory and reviewed profile intake reused. No duplicate database, identity service, API or account store created.
- Public opportunity-source links: UNICEF Careers internships and Erasmus Mundus Joint Masters, checked against the providers on 20 October 2026. No scraped vacancy feed, ranking, matching claim or eligibility decision.
- Existing licensed local photographs and approved founder portrait reused. Paper & Pine is a fictional demonstration, with no real contact details, event dates or bookings.

## Working versus illustrative

Directory search/filtering and existing profile routes remain functional. `loadProfiles` retains its existing preview/live switch. The real intake form posts to `/api/pamoja/intake` only on an explicit final submission; backend delivery depends on existing Supabase configuration and private photo storage.

New journey entries use React page memory only. They are not written to browser storage, Supabase or an account. They are not sent to AI, an employer, a public directory or a social platform. Leaving/reloading the page or clearing the demo discards them. This is not a private cloud vault and should not be used for sensitive records. Each UI labels its preview status; the safe-haven language describes the product commitment, not an operational security certification.

The Space's offerings, Channel, request draft and community tabs are demonstrations. Its setup links use the existing reviewed intake. No publishing, application submission or account creation is simulated as real success.

Viola guidance in the new journeys is fixed, not generated AI. The existing `/experience` workspace and `/api/viola` integration remain available without changes; live Viola requires server-only `OPENAI_API_KEY` and `ZURI_CHAT_MODEL`. No secrets were requested or embedded.

## Activation sequence

1. Connect the canonical ZURI CORE identity and membership model to the existing Supabase account flows. Define owner/manager/member relationships; do not introduce parallel identity tables.
2. Add owner-scoped Lore and Motion records with database row-level security, negative cross-account access tests, consent/provenance records, revocation, retention and deletion. Keep private fields out of public views and search indexes.
3. Add separate permission-checked publish endpoints for offerings and requests. Re-check actor, owner, scope and current consent server-side at every mutation. Public offerings must not grant access to private records.
4. Add Rizz media rights, context membership checks, authorized distribution and audit trails; labeling for commercial promotion.
5. Connect opt-in opportunity sourcing with provenance, expiry and abuse review. Review the exact evidence and destination before every external submission. Matching is not permission to disclose.
6. Give Viola purpose-limited, consent-checked tools only after these controls exist. Keep review as a separate human action.
7. Implement basic participation without a mandatory paid plan. Add professional Space tools, agreed integrations and authorized commercial services separately. The current setup form is an enquiry, not a payment or subscription.

No migrations, access policies, external publishing or production credentials were modified in this pass.

## Verification

Production build and TypeScript passed, generating 74 pages. All 28 existing discovery/request, conversation/intake and repositioning tests passed. Browser checks covered:

- Offering confirmation disabled until consent; explicit demo-only status after confirmation.
- Motion intention starts private; discoverable request requires a separate review and approval.
- Application pack disabled with no evidence; only the selected sample record appears in review.
- Rizz confirmation disabled until rights/destination approval; no delivery claimed.
- Lore defaults private; Space name preview updates from visitor input.
- Representative Space offering-to-enquiry prefill, private draft review, Channel and Community tabs.
- Directory photography search returns three matches.
- Phone landing and Space layouts stack in one column with no horizontal document overflow.

No real profile requests, external applications, messages or posts were submitted during validation.

## Visual refinement — 21 October 2026

Larger Segoe UI/system sans-serif text with retained serif display accents; higher-contrast secondary text, input labels and placeholders; defined rounded cards, more consistent spacing and selected controls; subtle hover depth and visible focus outlines. Glass surfaces are limited to the header, portrait card, orbit badge and demo panel, with opaque fallbacks and reduced-transparency support. Reduced-motion preferences disable card lifts.

Static colour-pair checks: body 7.35:1, hero secondary 12.85:1, demo notice 6.95:1, metadata 6.20:1 and input placeholder 5.29:1. These are sampled pair checks, not a complete accessibility certification. No workflow, account, consent or publishing behavior changed.
