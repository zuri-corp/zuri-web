# Viola workbox — interaction design

Lounge input and the floating Viola control now open an expandable workbox instead of routing ordinary input to the standalone goal screen. Saved active goals resume inside the workbox; the existing goal screen remains available for compatible deep links and lifecycle management. The shared canonical intent engine is reused; no competing matcher was created.

## Behaviour
- Quiet introduction → user goal → local clarification or proposal → editable artifact → explicit review → confirmed local task. The same goal/task validation and stale-review protection enforce writes. No artificial typing delay, fabricated search activity or automatic external action.
- Plan here is explicitly deterministic on-device matching. Talk with AI uses existing connection status, account allowance and exact-conversation review. It never substitutes a scripted AI answer for a disconnected service.
- Responses lead with the answer or question. Ask only for missing context. Use compact action cards for editable work; long explanation should not precede every action. No broad capability menu in the opening conversation.
- Minimise keeps the component and conversation state mounted; expand creates more working room. Escape/close hides the workbox without deleting the existing conversation. Refresh does not persist unsaved workbox state.
- Enter in textarea inserts a newline; the labelled send control submits. Non-modal native dialog keeps the underlying app usable and restores focus on close; named controls and polite status/error semantics support keyboard and screen-reader use. Reduced-motion preference disables entrance/working animations.
- One composer and continuous conversation, without mode tabs or a source picker. When live AI is unavailable, supported goal matching is honestly labelled on-device assistance. Pamoja retrieval, open-web search and hybrid routing remain unimplemented; no search results are simulated. Browser voice input is available through the mic where supported and may use the browser’s speech provider.
- The study-plan walkthrough invokes the actual local engine; it is not a generated live-AI exchange. Nothing is saved until review and confirmation.

## Transitions and states
Workbox entrance 350ms; artifact entrance 350ms; no deliberate reply delay. Working animation reflects a real pending AI request only. Minimise shows working/saved/paused context. Disconnected, clarification, blocked, validation error, review, success and empty states stay distinct. No success state claims a booking, message delivery or publication.

## Future AI presentation contract
The model may propose answer, clarification, sources and typed artifacts. The host validates proposed objects, permissions and action-specific review. Model text is never execution authority. Private context and web queries need the existing disclosure boundaries. A source preference is not consent to send private data to the web.

Fading is a future presentation policy: reduce prominence of neglected suggestions, never silently delete tasks, cancel bookings, unfollow people or change grants. Keep-close and bring-back controls need an explicit implementation before this behaviour is claimed.

Preview: `/?viola=preview#/lounge`. Live AI connection remains independent.

## Ambient presentation
The workbox is portalled above every app surface. Lounge composer and floating app launcher share its violet glass material. Expand supplies viewport-height working room; minimize preserves in-memory drafts. Viewport edge light is pointer-transparent. Standard backdrop-filter follows its WebKit declaration so Chromium keeps the blur. Reduced motion disables animation; reduced transparency supplies opaque surfaces. No private records are attached automatically and no provider or database activation is part of this design.
