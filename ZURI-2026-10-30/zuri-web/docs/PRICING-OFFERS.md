> Updated 23 October 2026: standalone AI subscription framing below is superseded. ZURI memberships are for individuals, businesses and teams, with Viola assistance inside the app. See PAMOJA-AUDIENCE-POSITIONING.md and the canonical offer catalog for the current model. Earlier figures are proposed, not active paid entitlements.
# Pricing and offers — 22 October 2026

The user authorized putting the recommended UGX prices and inclusions onto the website.

- `/pricing`: shared comparison of Basic, planned ZURI AI plans, Space setup/care, Invites and Tech services; scope details, allowances, project terms and exclusions.
- Homepage: three choices for participation, assistance and human work.
- Tech, Invites and Pamoja: relevant offer cards, styled within each destination.
- Header/footer discovery and sitemap include pricing. The root address is reserved against Space names.
- Shared offer data: `src/lib/commerce/offers.ts`. Unknown offer IDs do not become customer-visible enquiry text.
- Tech, contact and Invites enquiries carry allowlisted offer names and guide prices into editable messages. Presence setup shows the selected package and live price while switching package choices.
- All prices are guide/starting prices. AI billing/trials and RSVP are marked planned or preview and accept enquiries only. No checkout, subscription or payment API was added.
- Human setup, care and AI are explained separately. The public page includes revision scope, third-party charges and quote-before-commitment language.

The website continues to depend on existing Supabase configuration for real enquiry delivery. This update does not activate backend integrations, private Lore, paid AI entitlements or guest-response storage.

Verification: final production build and TypeScript pass (75 pages); 17 existing content/navigation tests pass. Browser checks confirm tool, Invites and AI offer context, live setup/care price switching, 12 pricing cards and a one-column phone layout without horizontal overflow. No requests or payments were submitted.


Value explanation update: pricing now introduces concrete individual and business AI scenarios with illustrative outputs before the plan cards. Spaces have a sample business presence, practical benefits and an explicit distinction between current presence formats and planned workflows. Pamoja also explains these outcomes beside its AI and Space offers.

