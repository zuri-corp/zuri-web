# ZURI AI conversation engine

## Purpose

ZURI AI turns a person’s own words and explicitly chosen ZURI context into a useful next step. It helps people explore, create, organise, discover and grow without taking action on their behalf.

The engine serves two assistants through one contract:

| Assistant | Primary job | Typical context |
| --- | --- | --- |
| Viola | Personal discovery, learning, planning and life on ZURI | Planner, Pings, Events, LORe, public Aura discovery |
| Sanyu | Practical business growth | A selected Space, offerings, customers, channels, operational plans |

## Core rules

1. **A conversation is private by default.** It is not a Rizz chat, public post, Space update or model-training source.
2. **Context is explicit.** The engine may receive the active Space, event, Ping, chapter, channel or Planner item only when the person selects it or is already working inside it.
3. **The model proposes; ZURI validates.** The model may suggest a draft or action. The app and server validate all fields and the person reviews any creation, publication, invitation, payment, deletion or transfer.
4. **Raw knowledge and ZURI knowledge stay distinct.** Public ZURI search results and approved product knowledge are labelled sources. Personal records are never quietly used as general knowledge.
5. **Least context and least cost.** Send the active thread’s latest useful turns, a compact workspace summary, and only relevant tool results. Do not resend an entire account history.
6. **An answer may be an answer.** Viola and Sanyu should not force every conversation into an intake or workflow.

## Conversation workspace

Each private AI workspace has:

- `id`, assistant (`viola` or `sanyu`), title and timestamps;
- a bounded transcript of user and assistant turns;
- optional selected contexts: Space, society, channel, event, Ping, chapter, moment or Planner task;
- an optional pending action draft, never an executed action;
- source references returned with an answer;
- a topic reset that clears working context without deleting an intentionally saved workspace.

The app keeps an active workspace locally while the first database migration is being introduced. The server-side version will use an owner-only thread and message store, with summaries rather than unlimited transcripts.

## Request lifecycle

1. The person writes or speaks a message.
2. The app validates size, removes unapproved context, and creates an idempotent request ID.
3. The gateway attaches a compact workspace summary and relevant permitted context.
4. The chosen model returns structured output: reply, optional intent/action proposal, references and follow-up need.
5. ZURI validates the response against the action contract.
6. The UI presents a lightweight suggested action, not a large blocking card.
7. A separate explicit approval executes a server-validated operation.

## Tool boundary

Tools are narrow commands, never arbitrary model access:

- discover a public Space, person, event, Ping or channel;
- retrieve the signed-in person’s permitted objects;
- prepare a draft for an offering, event, Ping, chapter, moment, channel update or Planner task;
- create an image draft;
- distribute a reviewed item to selected channels;
- surface a Space report or approved Echo summary.

Every tool declares required fields, allowed context, whether it creates a draft or a side effect, and its review screen. Only server code performs the side effect.

## Model routing

- Use a lower-cost structured model for intent extraction, field completion and action routing.
- Use a stronger conversation model only for richer explanations, strategy, writing, learning and ambiguous multi-step requests.
- Use an image model only when someone requests an image.
- Keep provider keys, model names, rate cards, reservations and settlement inside the gateway. The client receives no provider secret.
- Fall back to local deterministic drafting only when the AI gateway is unavailable; do not pretend it is model output.

## Safety, privacy and moderation

- Enforce account and allowance controls before a provider call.
- Treat uploaded text, retrieved posts and model output as untrusted.
- Never grant access, invite people, move money, publish media, transfer a Space or delete an object without a confirmed user action.
- Do not expose private Society, conversation, LORe or team content outside its permission boundary.
- Route reports of child safety, fraud, credible threats and repeated harassment to moderation rather than conversational persuasion.
- Record minimal audit data for privileged tool actions; keep private chat contents out of general analytics.

## Delivery order

1. **Foundation:** workspace contract, bounded transcript, assistant roles, topic reset, gateway source cleanup.
2. **Context:** selected-object chips and permission-aware compact context retrieval.
3. **Drafting:** one shared creation-draft protocol for all ZURI objects.
4. **Tools:** discovery, Planner, LORe, Space/Offering and Rizz distribution tools.
5. **Persistence:** encrypted-at-rest server-side AI threads, resumable workspaces and user-controlled deletion.
6. **Quality:** evaluation conversations, model routing, cost dashboards and failure fallbacks.

### Current context and continuity slice

The composer attaches up to four selected Spaces, Societies, Channels, ZURI Events, Pings, Chapters, Moments or Planner tasks as removable references. It checks that the signed-in user can still access each reference before making a model request; the gateway independently fetches a bounded summary using the user's permissions. An unavailable context blocks the request and leaves the message ready to retry. Opening the assistant from an object can attach that object, while simply browsing other pages does not accumulate context. New topic clears it.

Viola and Sanyu have separate bounded workspaces in the current browser session. Switching assistants restores their text turns and selected contexts; account changes clear both session workspaces. Cloud thread writes remain best-effort and are not presented as confirmed cross-device history. Imported Events, people, offerings and collections do not yet have this attachment contract and must not be presented as attached context. Media attached in the chat is not model vision.

## Acceptance checks

- Changing topic removes previous pending actions and context from the active request.
- Viola can answer normally without proposing a workflow.
- Sanyu can work on a selected Space without claiming data she was not given.
- An offering or event starts as a reviewable draft, with missing fields asked conversationally.
- A source card opens the exact ZURI object it describes.
- Repeated send attempts do not generate duplicate paid provider calls or duplicate creations.
