# Discoverability and request refinement — 15 October 2026

## Implemented
- Corporate world cards: blue Tech, red Select, white Pamoja. Existing logo sheet and upright Tech T retained; blending removes black logo backplates on coloured cards.
- Tech starts with a plain-language request, name and reply email. Phone and service choice are optional. Existing wedding enquiry requirements are unchanged.
- Guided mode remains available: choose an outcome and audience, see practical advice, then send the contextual request on the same page. Direct text survives switching modes. On phones, the direct form precedes explanatory content.
- Requests continue through the existing validated /api/enquiries route and protected /admin/enquiries inbox. No new account, customer invitation or separate dashboard is needed. Administrators can use statuses and notes; external replies use the displayed contact links. Existing administrator authorization is unchanged.
- Pamoja now explains permission-first, low-effort discoverability for people, search and AI systems.
- Published real profiles automatically emit structured public information as Schema.org ProfilePage with Person/Organization, offerings and explicitly public contact data. Fictional examples emit no entity markup. Script serialization escapes markup.
- Added public canonical URLs and /sitemap.xml, using NEXT_PUBLIC_SITE_URL. Set that to the real HTTPS public domain at deployment. No fictional production domain is assumed. Private routes and fictional profile URLs are excluded. Sitemap currently follows the existing public listing limits (500 profiles / 100 stories).

## Boundaries
This adds the publication/discovery foundation. It does not claim guaranteed inclusion in AI answers or implement autonomous profile scraping, automatic consent, a new AI matching engine or automatic profile publication. Public listing permissions remain unchanged.

## Validation
Production compilation, TypeScript and lint pass. All 138 tests pass, including new coverage of optional Tech phone, private-data projection, sample exclusion and safe structured-data serialization. Browser checks cover destination colours, direct/guided request paths and responsive layout. Live database writes were not performed.

Schema references: https://schema.org/Person and https://schema.org/LocalBusiness (Organization properties).
