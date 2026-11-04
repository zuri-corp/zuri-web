# ZURI Intent Engine — 0.1.0

Turn an explicitly stated goal into a proposed path through ZURI. This is a
dependency-free deterministic planner, not general language understanding,
an AI provider, an authority service or a background executor.

```js
import {resolveIntent} from '@zuri/intent-engine';
const plan=resolveIntent({
  text:'I want to set up appointments for my salon',
  surface:'website',
  details:{audience:'business'},
});
// Inspect plan.status, plan.question, plan.steps and plan.actions.
```

The supported-goal catalogue covers software, automation, business software
setup, security, business presence, invitations, connected Tool development,
bookings, personal plans, discovery, sharing, Chapters and technology learning.
Matching is rule-based, with explicit choice and clarification for unsupported or
ambiguous requests. Match labels are not calibrated probabilities.

## Boundaries

- No private data lookup, location access, provider call or Tool invocation.
- Caller-provided role, permissions, execution flags and destinations are ignored.
- Navigation targets are resolved from the built-in catalogue, not generated URLs.
- Booking paths still need reviewed details, an approved installation, scoped
  permissions and the receiving system's own confirmation.
- A Planner proposal needs a separate exact-payload review in its host adapter.
- Plans are not proof of availability, approval, successful delivery or a result.
- Model-generated suggestions must never bypass the host's CORE checks.

`validateIntentRequest` normalizes only supported fields. Known secret patterns,
overlong goals and invalid calendar dates are rejected; this is not a general
PII detector. Avoid putting secrets in any goal.

`taskReview` binds the current engine version, normalized request and exact task
payload. The app adapter additionally binds a saved goal's revision/status before
writing one personal task. It revalidates on execution and prevents duplicate
tasks for the same saved goal. This package itself contains no write transport.

The stateless website endpoint is `/api/intents/resolve`. The Tool SDK's
`zuri.intents.resolve` method calls that endpoint without runtime credentials;
explicitly review the supplied text before transmitting it. Local UI use of
this package makes no network request.

The website owns the canonical package source. The app consumes the versioned
local npm tarball in its vendor directory so its source package remains portable.
Update and test both packages together when changing the engine contract.
