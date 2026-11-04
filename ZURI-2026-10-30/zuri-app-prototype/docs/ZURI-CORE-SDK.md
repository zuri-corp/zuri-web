# ZURI Core SDK v1 foundation

## Product home
Tools live in a compact Lounge widget and a searchable library. They do not add a fifth app or restore a Tools tab. The same library can open with an owned Space, accessible Society, Chapter, event or Ping context. Planner has a personal-tools entry point.

Pocket notes and Checklists retain independent content per tool and context. Checklist completion persists. Next Step creates a canonical Planner task with a source reference. Space tools appear in the owner workspace, not as a third-party customer installation.

## Contract
Entry: `src/core/index.ts`. `ToolManifest` declares id, name, description, version, apiVersion and capabilities. The registry is first-party and allowlisted. No remote script evaluation or dynamic external installation is implemented.

`ToolContext` identifies a personal workspace or a canonical shared object. `contextTitle` resolves current availability and checks owned Space scope. All tool data remains private to this user's device, including data attached to public objects. Scope is not a shared permission grant to Society members.

The host provides `read()` and a functional `write(change)` adapter. `createLocalCore(host, toolId, context)` exposes only namespaced storage and the declared Planner action. Every API call checks the current record, context and grant. The host adapter must return current data when calls run.

```ts
import {createLocalCore} from './src/core';
const core = createLocalCore(host, 'notes', {kind:'chapter', id:chapterId});
const current = core.storage.get('content');
core.storage.set('content', 'A note for this chapter');
```

`grantTool` is called after the user presses Enable here & open. `revokeTool` removes the grant; stored content stays in the backup. Older tool notes remain readable after the user grants the new explicit permissions. Storage keys are validated and payloads bounded. Tool code cannot ask the SDK for chats, Wallet data, arbitrary shared records or other tools' namespaces.

## Integration and deployment limits
This adapter is a first-party in-process SDK foundation, not an isolation boundary against hostile JavaScript. Do not load third-party code into it. A production external integration needs a sandboxed frame/worker, versioned RPC messages, trusted host authorization, origin validation, server roles and consent, network allowlists, signed/reviewed manifests, quotas, OAuth secret storage, audit events and authoritative background jobs. Cloud sync, external providers, app publication and background automations are pending; none is simulated.

No plugin marketplace claims or generated activity counts are presented. Future extensions should use the same canonical object references and reviewed action surface rather than create parallel tasks, profiles or conversations.

## Validation
Automated coverage checks grants, revocation, tool/context isolation, source-linked tasks, invalid dates and backup restoration. Browser visual verification remains pending because browser tools were unavailable in this turn.
