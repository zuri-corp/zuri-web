# ZURI assistant experiences

Updated 28 October 2026. The website assistant and Viola share the AI gateway, but have different user experiences.

## Website: a conversation until the visitor chooses a person

The website chat answers questions and helps visitors explore ZURI and technology. It does not open goal cards, task forms or the app planner. The guide response schema requires `intent:null`, and the server rejects a planning proposal in this mode. Direct questions should receive direct answers; the assistant must not force an intake questionnaire or claim an employee is online.

**Talk to a person** opens an optional handoff in the chat. The visitor reviews or edits a brief containing their own statements, chooses to continue, and enters contact details in the existing enquiry form. Only submitting that form sends the request to ZURI. This is an enquiry and follow-up flow; a live employee messaging service is not connected. The visitor can close the handoff and keep chatting.

When live AI is unavailable, clearly labelled preview guidance answers common questions with fixed responses. It makes no provider request. The standalone `/intent` planner remains available separately; it is not the website chatbot's required journey.

## App: one floating Viola conversation

Viola is a non-modal glass layer above the current app, with animated perimeter light, a soft illuminated border and actual backdrop blur. The app remains visible and usable behind her. There are no local/AI mode tabs or source-picker screens. Recent goals, privacy settings, minimize, expand and close remain available in the compact header.

Replies and helpful information appear within the same conversation. With live AI available, the existing exact-conversation disclosure review precedes provider transmission. With AI unavailable, typed supported goals receive clearly labelled on-device guidance. Local guidance is bounded matching, not a general AI model.

An AI-suggested goal is optional and editable. The person reviews it inside Viola; contextual details, clarifications and task drafts appear as glass artifacts in the same surface. The full path is expandable. Creating a Planner task still requires reviewing and confirming the exact task. Changes clear prior approval. A goal already linked to a task opens that task rather than pretending to create a replacement.

The overlay can be minimized without losing the current in-memory conversation or draft. Escape/close restores focus. Reduced-motion and reduced-transparency treatments are included. Glass blur uses the standard property after the vendor-prefixed form so the CSS build preserves a property supported by Chromium.

## Conversation evidence and authority

Viola's provider response has `reply` and an optional `intent:{goal,sourceIndices}`. It uses one provider call and spending reservation. Evidence must be exact current user statements, never assistant claims. Indices are chronological, unique, bounded and include the current user turn; at most four complete messages and 1,500 combined characters. No silent source truncation or invented structured location/budget/date/audience fields.

The shared `@zuri/intent-engine` package is version 0.2.0; the existing goal-plan contract remains `zuri-intent-0.1`. Its conversation helpers remain available, including the temporary conversation handoff helpers for compatible clients. The website chatbot no longer invokes that goal handoff. The app installs the local vendor package, with engine parity verified during website packaging.

Neither chat surface scans Rizz, Lore, Planner or private business records. AI prose grants no authority and performs no external action. Existing CORE/Tool authorization, account verification, spending reservations and exact task approval boundaries remain intact.

## Activation and validation

Live AI still requires a fresh server key, verified-account service, staged gateway database setup, model/rate configuration and allowances. No real OpenAI call, live database migration or employee enquiry was performed during this update. Provider retention and compliance prerequisites remain as documented in `ZURI-AI-GATEWAY.md`.

Validation: 227 website tests and 107 app tests pass (334 total); both TypeScript checks pass. The rebuilt website app bundle and the webpack production build succeed. The installed Next.js version still reports a security advisory; upgrade before production deployment.

Browser checks verified ordinary website chat, explicit human-handoff review and prefilled contact-form delivery without submitting the enquiry. App checks verified a non-modal glass overlay, supported-goal guidance in the conversation, and computed `backdrop-filter: blur(34px) saturate(1.5)`. Exact task approval remains covered by app tests. Live-provider UI acceptance awaits activation.

Visual evidence in the project root: `previews/viola-glass-welcome.png` and `previews/website-chat-handoff.png`.
