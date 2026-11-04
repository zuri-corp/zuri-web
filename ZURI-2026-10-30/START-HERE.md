# ZURI website + app — external testing bundle

30 October 2026. This is the current source and test build, not a claim that every paid API or product flow is activated.

## Run in VS Code

Install Node.js 24 LTS (minimum supported by this bundle: 22.12), extract the ZIP, and open the extracted folder in VS Code. Keep `zuri-web` and `zuri-app-prototype` beside one another: the website embeds the canonical app through the sibling build script.

From the folder containing this document:

```sh
npm run setup
npm run build
npm start
```

Open http://localhost:3015 for the website and http://localhost:3015/app for the app. Use `npm run dev` while editing. Stop a running server with Ctrl+C before rebuilding. `npm run app:dev` separately serves the standalone app at http://localhost:8443. Testing the embedded edition first avoids unnecessary cross-origin session differences.

`setup` installs the two locked dependency sets and creates `zuri-web/.env.local` only if it does not exist. That testing template contains the project's PUBLIC Supabase connection and safe feature switches. It contains no secret keys. No ChatGPT browser, plugin or account is needed to run ZURI itself. Dependencies must be downloaded on the first install.

`npm run check:apis` reports which settings are present without exposing them. `npm run check:live` checks deployed database health and private-access rejection only. It does not send sign-in emails, call a paid provider or create customer records. `npm test` runs both source test suites.

## What is in the ZIP

- `zuri-web`: Next.js website, protected backend routes, approved knowledge, opportunity engine, Studio SDK, Supabase SQL and function source.
- `zuri-app-prototype`: canonical React/Vite app, source, lockfile, local intent-engine package and tests. The folder name is retained so existing scripts resolve correctly.
- `zuri-web/public/zuri-app`: embedded web edition built from this app for this export.
- `API-SETUP.md`: activation matrix, deployment steps and manual acceptance checks.
- `RELEASE-MANIFEST.json`: exact packaged-file hashes and verification results.

Runtime secrets, `.env.local`, installed dependencies, framework caches, browser sessions, raw logs, old ZIPs and account/workspace exports are excluded. User-facing brand/client assets are included as part of the authorized project; treat the archive as project source, not a public stock-photo library.

## Readiness

The shared Supabase schema and three functions already exist in project `eghtvbqzytyxsdgvwkge`. Do NOT replay SQL migrations 001–010 against it. New projects need an inspected, ordered migration process and compatible base enquiry/admin schema; there is no automatic fresh-project database installer in this ZIP.

The test template forwards enquiries and authenticated AI requests to deployed handlers. Provider AI execution stays OFF. Real-account sign-in, email delivery, administrator provisioning and production domain setup still need manual verification. Read `zuri-web/docs/BACKEND-READINESS.md`, the app's `docs/EXPORT-STATUS.md`, and this release's verification report for exact limits.

Live opportunity inventory is not promised. X credentials, approved source accounts, reviewed permissions, database budgets, scheduling and moderation must be configured before ingestion is useful. OpenAI follows real-source activation. Quicket, payment collection, native app-store packaging and native push are not completed integrations.

Historical milestone documents are retained for development context; this document, API-SETUP.md and the release manifest describe this export.
