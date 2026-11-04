# ZURI connected Tool SDK — pilot 0.2.0

Build useful things. Reach real people. Powered by ZURI.

This Node.js server-side SDK connects an approved externally hosted Tool to an
explicitly consented Pamoja Space installation. It is distinct from the ZURI
app's existing first-party, device-local CORE adapter. It uses the same canonical
ZURI account and Space authority on the server; it does not create another login.

## Start

```sh
npm install ./zuri-tool-sdk-0.2.0.tgz
npx zuri-tool init my-tool
npx zuri-tool check my-tool/zuri.tool.json
```

Replace the example endpoint. Validation is not approval or endpoint testing.
Register in ZURI Tech → Developer Studio, create a Tool and submit its immutable
version. An independent admin verifies the developer and reviews the version.
The developer publishes an approved release; a verified Space manager reviews
its permissions and installs it. Changed permissions require a newly reviewed
version and new installation consent.

```js
import {createZuriToolClient} from '@zuri/tool-sdk';
const zuri=createZuriToolClient({
  baseUrl:process.env.ZURI_ORIGIN,
  toolKey:process.env.ZURI_TOOL_KEY,
  installationToken:process.env.ZURI_INSTALLATION_TOKEN,
});
const space=await zuri.space.get();
// Run only after your own authenticated customer explicitly submits a request.
const booking=await zuri.bookings.create({
  name:'Customer display name',
  startsAt:'2027-01-08T09:00:00Z',
  endsAt:'2027-01-08T09:30:00Z',
}, {idempotencyKey:persistedRequestId});
```

Keep both credentials in a trusted server secret store. Never bundle them in a
frontend, expose an unrestricted proxy or publish installation tokens. A Tool key
alone grants no Space access. An installation token is scoped to one Tool,
reviewed version and Space. Only hashed credentials are stored by Studio.

## Intent planning

`await zuri.intents.resolve({text:'I want to set up bookings for my salon',
details:{audience:'business'}})` returns a proposed path from ZURI's shared
deterministic goal catalogue. This sends the explicitly supplied goal to ZURI's
stateless planner; review the data with the person first. It does not contact an
AI provider, invoke a Tool, consume member credits or grant permissions. The
response is advisory; do not treat a matched intent as installation consent.
The app/website interfaces use the same engine locally without this request.

## Capabilities

- `space.read`: selected approved public Space information.
- `bookings.create`: explicit appointment requests, initially `requested`.
- `bookings.read`: this installation's requests (includes customer notes).
- `bookings.manage`: confirm/cancel a pending request in this installation.
- `ai.space-answer`: approved Space questions with a developer-funded cap.

No implicit grants for private Lore, conversations, personal plans, member AI
credits or unrelated Tools. Each capability needs a purpose in the manifest.

## Request behaviour

The SDK creates an idempotency key for each call unless supplied. For a write,
persist your own UUID first and reuse it if an outcome is uncertain. Different
input with the same key is rejected. There are no automatic mutation retries.
Provide an AbortSignal when needed. `ZuriToolError` carries `status` and `code`.

Revoked keys, revoked installation consent, lost canonical manager authority or
admin suspension block later runtime operations. Existing installations remain
pinned when a developer publishes a newer version.

## AI and costs

ZURI AI access is for reviewed, installed Tools only. Configure the provider,
model and token prices on ZURI's server, never in this SDK. The pilot reserves a
maximum estimated cost against the developer's cumulative cap, then reconciles
reported usage. A provider timeout or unknown settlement keeps the reservation
held for operator review. Do not retry such a request with a new idempotency key.
No member credits, payments, commissions or payouts are charged by this pilot.

## Webhook helper

`verifyZuriWebhook({rawBody,signature,timestamp,eventId,secret})` checks
HMAC-SHA256 of `timestamp.eventId.rawBody`, with a five-minute tolerance and
constant-time signature comparison. Persist accepted event IDs atomically before
acting to stop replay. ZURI webhook delivery is not implemented in this pilot;
the helper is not proof of live event delivery.

## Deployment

The server migration and auth/tenant policies must be reviewed and exercised in
staging before enabling `ZURI_STUDIO_ENABLED`. Connected Tool hosting is yours.
ZURI-managed arbitrary code deployment is unavailable. Browser sandbox data and
review decisions are simulations, not real installations or approvals.
