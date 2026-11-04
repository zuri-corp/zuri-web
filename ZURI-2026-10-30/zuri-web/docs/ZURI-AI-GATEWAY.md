# ZURI AI gateway

Implemented 27 October 2026. Advisory pilot, disabled until configured. This is not a certification of legal compliance or an enabled paid subscription service.

## Connections

Assistant experiences: website chat returns a normal reply with intent:null until the visitor chooses an employee enquiry handoff. Viola can suggest a user-evidenced goal within her floating glass conversation surface. See `CONVERSATION-TO-INTENT.md` for current flows, evidence validation and package 0.2.0. Activation requirements below are unchanged.

- `GET /api/ai`: availability and the signed-in website account's monthly allowance. No prompt transmission.
- `POST /api/ai`: `{mode, requestId, consent:true, input}`; modes `intent`, `guide`, `viola`.
- `/api/chat` and `/api/viola` delegate to the same gateway and quota pool. Legacy bodies now need `consent:true` and a UUID v4 `requestId` alongside `messages`.
- Viola offers reviewed goal interpretation inside her conversation. The website chatbot stays conversational; a standalone goal planner remains separate. Saving app goals/tasks still uses existing review controls.
- Basic matching stays on-device. `/api/intents/resolve` remains provider-free.
- Developer Studio Tool AI retains its separate installation, permission and developer-funded budget controls. `/api/ai` does not accept Tool credentials, retrieve Space records or spend member funds on a developer's behalf.

## Request sequence

1. Require same-origin browser writes, bounded JSON, disclosure approval, UUID and permitted message roles. Narrow secret screening rejects recognizable keys and credential assignments; it is not general PII detection.
2. Authenticate using Supabase `auth.getUser()`. Request actors and prototype local profiles cannot establish identity. Verified email required; database checks bans/deletion too.
3. Select a configured server model by mode. Callers cannot choose a model, endpoint, system prompt, credentials or private context.
4. Atomically reserve estimated costs against the account's UTC monthly allowance and gateway's UTC daily cap. Enforce six requests per account per minute across modes. No in-memory spending limit.
5. Call the fixed OpenAI Responses endpoint with `store:false`, a 45-second timeout, bounded output, no Tools and no private retrieval. Intent mode uses a strict JSON schema.
6. Validate completion, refusal, usage and proposal. Rebuild proposed actions through the canonical engine. Preserve blocked outcomes, explicit choices and missing details. AI prose is not execution evidence.
7. Settle usage at stored rates and recheck account authority before returning a result. No mode executes actions.

## Setup

1. Revoke the key shared in conversation. Store a replacement in server hosting secrets as `OPENAI_API_KEY`. Never put provider/Supabase secret keys in client, Vite or NEXT_PUBLIC variables.
2. Configure existing Supabase public and server credentials, verified-account sign-in and matching site origin. The app's device identity is not a server account: sign in through the website. The proxy refreshes gateway-route sessions.
3. Stage and review `database/proposals/006_zuri_ai_gateway.sql`. It is independent of Studio proposal 005 and needs standard Supabase `auth.users` columns. Starts disabled; tables have RLS with no client policies; RPCs are service-role-only.
4. Set `ZURI_AI_INTENT_MODEL`, `ZURI_AI_CHAT_MODEL` and their `INPUT_MICROS_PER_MILLION` / `OUTPUT_MICROS_PER_MILLION` rates. See `.env.example`. Evaluation candidates: GPT-6 Luna for interpretation, GPT-6.1 Sol for conversation. Verify project access and standard prices. No fallback/escalation is automatic.
5. Provision allowances through trusted database operations. One USD is 1,000,000 micro-USD. `zuri_ai_policy` holds the daily gateway cap and default monthly trial allowance; `zuri_ai_accounts` provides per-account limits/revocation. Defaults are zero. Existing account limits do not automatically change when the default trial changes. These are internal cost limits, not retail prices or payment confirmation. Subscriptions are not synchronized yet.
6. Review purposes, provider agreement, overseas transfers, retention, privacy notice and registration requirements for launch jurisdictions. `store:false` does not eliminate abuse-monitoring retention or all caching. `/ai-privacy` explains this pilot, not a complete organization privacy policy.
7. Enable the database policy and `ZURI_AI_ENABLED=true` after staging acceptance. Begin with small allowances and the fresh key.

Implementation does not apply a live migration, configure a key or perform a real OpenAI request.

## Costs and retries

Each request uses a UUID v4. Reuse for the same account returns 409 without another provider call. No automatic provider retry or model switch. Clients retain an ID for unchanged retries in their current component/service session. Reload can generate a new ID; users should not repeatedly resubmit uncertain failures.

Reservations use UTF-8 payload bytes plus protocol margin as a conservative text-token bound and the configured output limit. Abnormal usage is withheld for review. Actual cost is recalculated from provider token totals at configured rates. Provider price changes, taxes, discounts and unrelated API traffic are outside these estimates.

Timeout, refusal, invalid output, missing usage and failed settlement keep the reservation held. Potentially billed work is never silently refunded. Operators must reconcile provider usage before adjusting ledger totals in a controlled transaction. No reconciliation dashboard or automatic release job exists yet. Disabling account/policy during a call withholds its result; incurred provider charges cannot be undone.

A singleton policy lock serializes short ledger transactions for this pilot. Scale it under measured load; never replace durable limits with per-process counters.

## Retention and remaining scope

No prompt, reply, private context or API key is written by gateway code to its database/logs. The ledger stores account ID, request UUID, keyed fingerprint, model, mode, dates, token totals, reservation and cost. Fingerprints use HMAC with the server provider key: key rotation changes fingerprints, but duplicate IDs still cannot spend again. These are pseudonymous operational records, not anonymous data.

No scheduled metadata purge exists yet. Records persist until controlled operator deletion or account deletion (FK cascade). Aggregate daily rows contain no account identity. Establish retention and user-rights workflows before broad launch. Local goals, exported backups, hosting logs and provider records have separate lifecycles.

Not added: business/private-data retrieval, live search, voice, customer messaging, external actions, autonomous agents, billing synchronization, high-stakes decisions or full moderation/reporting operations. Proposal validation does not eliminate hallucinations, prompt injection or regulatory responsibilities. Private business assistance needs separately authorized connectors.

## Verification

`tests/ai-gateway.test.mjs` exercises identity, approval, ignored authority fields, origin, bounds, provider payload, incomplete/refused/timeout results, settlement and legacy routes. `tests/ai-postgres.test.mjs` executes the migration in isolated PGlite: grants/RLS, verification, quotas, duplicate requests, rate limits, settlement, revocation, account deletion and fleet limits. No live provider/database is used by tests.

Official references: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/docs/guides/your-data

Final local checks: 219 website tests and 105 app tests pass; both TypeScript checks pass. The website edition of the app was rebuilt. A production build using Next's supported webpack mode compiled and generated 88 pages successfully. The restricted default compiler stalled; compilation required local filesystem access, and redundant runtime declarations were removed to match Cache Components. The installed Next version reports a security advisory: upgrade before production.

Served preview checks: GET /api/ai returns 200 with enabled:false/execution:false; POST /api/ai returns a safe 503 while disabled. /intent, /ai-privacy and /app respond 200. No real OpenAI request or live database migration was performed. Browser visual/click acceptance remains unverified.
