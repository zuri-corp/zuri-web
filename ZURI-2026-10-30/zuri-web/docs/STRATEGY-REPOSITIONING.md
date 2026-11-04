# ZURI strategy repositioning — 14 October 2026

Current direction comes from the newly uploaded Strategy Handoff. The reference is copied unchanged into docs/references/ZURI-Strategy-Handoff.txt. This document records implementation and unresolved authority questions; it does not replace the Product Director's mandate.

## Judgment

The earlier website leaned toward a development agency: ambition, projects and building software. The handoff describes a broader and more useful position: the trusted layer between people and technology. Start with the outcome, consider what already exists, and build only where that is the right answer.

The parent still has a broader job than selling technology services. Corporate is orientation and handoff. Tech helps people use the right technology. Select helps them understand what deserves attention. Pamoja makes people, businesses, places and capabilities discoverable. The website should demonstrate these distinctions without narrating the entire future ecosystem.

## Current implementation

| Surface | Change |
| --- | --- |
| Corporate | Concise orientation; immediate links into three destinations; a guided scroll through Tech, Select and Pamoja; a human finale rather than a long manifesto |
| Navigation | Each destination has its own navigation, wordmark treatment, primary action and local experience. A subtle ZURI parent link and destination switcher connect the worlds. Admin/corporate routes retain shared corporate orientation |
| Tech | Calm blue positioning: “Good technology, without the headache.” Serves individuals, small teams and larger organizations. Services, Marketplace and ZURI Products are separate, linked destinations |
| Guidance | “What are you trying to do?” goal/audience helper. Deterministic, visible starting points; no simulated AI conversation, third-party endorsements or automatic expert diagnosis. Goal context carries into the existing enquiry flow |
| Services | Build, choose, set up, integrate, protect, train and support. Existing service URLs and Invites journeys remain available |
| Marketplace | A curated shelf with category controls, selection principles and a useful route to human help. No actual third-party providers have been vetted or supplied, so the shelf is explicitly unfilled; no products, partnerships, reseller rights, prices or commissions are fabricated |
| Products | ZURI-owned technology is distinct from the third-party shelf, with Invites as the actual first product |
| Select | Technology, products and people shaping what comes next. An editorial cover and lead/secondary hierarchy; independent judgment over content volume. Preview stories now demonstrate the new lens and remain labelled as illustrative |
| Pamoja | Warm monochrome/neutral discovery, quiet identity cards, human language and a “proper home on the internet” proposition. No customer or search-ranking guarantees |
| Space pages | Clean /business-name addresses, with reserved system namespaces; optional public contact, opening information, website and approved imagery. Existing nested Space URLs redirect after resolving a valid public Space |
| Participation | A dedicated private Pamoja intake without a Tech service dropdown. It does not create accounts, claim Spaces, publish needs or imply fulfillment. General corporate contact is also distinct from Tech intake |

## Preserved foundation

Next.js, TypeScript, Tailwind, Supabase, Cache Components and partialPrefetching remain in place. Original brand asset bytes are unchanged. No framework/runtime migration, production database change or deployment occurred. Public reads still use only published snapshots; private draft/consent records stay private. Admin publishing, enquiry review, statuses, notes and sign-out remain wired.

Optional public contact/image fields extend the existing website-profile JSON data; they are explicitly labelled public in the admin form and visible in its preview. They are never copied from private enquiry information. Recorded subject consent still applies before publication. Direct website links require HTTPS without credentials; passive images stay on the approved existing host/local assets.

Reserved root namespaces are enforced when creating/updating Space drafts and before publication, and mirrored in the unapplied database proposal. A test checks the actual app's root route directories against the reservation list. These addresses are aliases for curated Space representations, not a new canonical identity or domain-ownership system. No owned zuri.com domain is asserted.

Previous illustrative Select URLs resolve to the revised examples only in preview mode. Live records with those slugs are not rewritten or redirected by this example mapping.

Private intake retains the evidenced enquiries table shape and producer source. An allowlisted, server-labelled contact intent distinguishes technology, general ZURI and Pamoja participation in message content/admin presentation. No missing production column or enum is assumed. A shared form serializer handles the absent service field in general/Pamoja forms; real-handler tests cover the entire serialized submission path.

## Classification of the handoff

- Foundational principles adopted: trust over commission; useful technology over more technology; editorial independence; warmth; human responsibility; discoverable value.
- Architectural considerations preserved: one shared foundation, distinct experiences; curated representations are separate from claimed identities; future product work can emerge from repeated service needs.
- Current website requirements implemented: new positioning/navigation, three Tech pillars, individuals and organizations, goal-led guidance, Select territory, warm discovery, useful Spaces and clean URL paths.
- Future/dependent concepts: sophisticated AI recommendations, service-production automation, actual reseller/referral agreements, custom domains, public requests, automatic claiming, broad social feeds and advanced Moments media. Manual verification and moderation foundations now exist as described in the next milestone; none are represented as live integrations.

## Authority decision — approved A

Historical context: the previous approved policy was administrator-curated profiles with consent and no visitor-owned accounts. The handoff now introduces claiming, verified owners and business-controlled Moments. That changes who can act and how contributions become public.

DECISION 2 — Business claiming and Moments authority

Option A: ZURI manually verifies each claim before management rights are granted; verified owners opt into Moments, with moderation before public visibility.

Option B: automatic business-contact/domain verification grants management rights; Moments publish first and are moderated afterward.

Recommendation: A for the first release. Many small businesses lack a useful custom domain or dedicated business email; control of a contact channel is not sufficient evidence of full management authority. Early manual review supports trust without pushing businesses into technical verification before value is demonstrated.

Product Director approved A. The subsequent implementation is documented in VERIFIED-MANAGEMENT-MILESTONE.md. Manual claims use private enquiries; verified management requires a recorded administrator grant. The Product Director subsequently approved basic accounts with email for now. BASIC-ACCOUNTS-MOMENTS-MILESTONE.md documents the implemented text contribution path and its verification limits. Consent remains mandatory; no Moments are harvested or automatically converted to Select stories.

## Verification and practical limits

Production build/TypeScript and ESLint pass. 91 tests pass, including all prior enquiry/publishing behaviors, goal/audience handoffs, intent validation, reserved routes, explicit public contact validation, profile image rules, legacy example mapping and serialized general/Pamoja submissions. Supabase dependencies are controlled doubles in these tests, not live production verification.

This managed runtime has no control-browser capability. No visual/browser QA, substitute browser, preview server or PC access was used. Responsive/focus/reduced-motion work is implemented but visually unverified. The four secure Supabase variables and a local secure environment file are still absent; actual schema/RLS evidence is still missing. Proposed SQL is unapplied. Live activation, provider selections and browser QA remain external follow-up work.
