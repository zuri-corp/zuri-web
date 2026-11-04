# ZURI wedding-couple usability audit

20 October 2026 · Hands-on expert persona walkthrough.

## Verdict: 4/10 for this journey

ZURI can hold a personal wedding notebook and connect it to tasks, sample venues and a gathering. It cannot yet serve as the couple's dependable shared planning system. The score is an expert judgement of current task support, not a SUS score, user-study result or production accessibility certification.

Scenario: an engaged couple planning an 80-guest wedding in June 2027. Both partners need to edit, divide tasks, compare venue quotations, manage spending and coordinate guests. These are audit assumptions, not personal facts about the user.

Testing used an isolated preview on port 8447. No real partner, guest or vendor was contacted, no booking or payment was made, and the main workspace's data and app code were unchanged.

## Ratings

| Area | Score | Basis |
| --- | ---: | --- |
| Personal chapter organisation | 6/10 | Created a wedding chapter and saved its brief and a linked task. Media controls exist; uploading a wedding album was not tested. |
| Planning together | 2/10 | Collaborators offers sample people; saved request explicitly says not sent and no access granted. |
| Tasks and deadlines | 4/10 | Chapter task appears in Lounge Planner. Assignee and deadline remain prose, with creation date shown as the task date. |
| Venue discovery and enquiry | 4/10 | Realistic sample venue description, capacity and price; wedding search misses it, enquiry goes to self, alternate booking route is a draft. |
| Guest coordination | 3/10 | Ping supports time, place, capacity and counts, but not the couple's real guest list or RSVP requirements. |
| Budget and deposits | 1/10 | Wallet is disconnected. No wedding budget, committed-versus-paid totals, deposit schedule or supplier expense ledger was available in the examined flows. |
| Wayfinding and continuity | 7/10 | Contextual headers, chapter-to-Planner connection and Ping-to-Lounge connection help. Commercial tools are unexpectedly hidden under Profile → Members. |

Equal-weight mean: 3.9/10, rounded to 4/10. These scores concern this particular wedding journey, not every potential use of ZURI.

## What I actually tried

1. Created **Our wedding — June 2027** in Lore Chapters. Saved a brief for 80 guests.
2. Added **Ask three venues for quotes — partner to do by 30 October**. It became a checkbox in the chapter and appeared in Lounge Planner, dated **2026-10-20**. There was no separate assignee or due-date field in that editor.
3. Opened Collaborators. The picker contained seven sample people. Saved an audit collaboration request; the result explicitly said **Not sent · no access granted**. This did not establish partner collaboration.
4. Searched Aura Spaces for **wedding**. No matches. Then searched a visible hospitality name, **Jinja Nile**, opened Jinja Nile Resort and selected Offerings. Its catalog contained **Riverside Wedding Venue**, described as seating 200 with evening lighting, with a sample price. These are sample catalog claims, not verified venue information.
5. Chose **Ask in Rizz** on that wedding offering. The destination was a conversation with **Alex Kato**, the current identity (`chat&id=me`), without the selected venue or offering. I did not send a message.
6. Created **Wedding planning lunch — audit**, dated 12 June 2027 at 13:00, with 12 places. The invite picker only contained sample people. The detail showed one joined, zero invited, and the venue; adding it to Planner worked. The displayed date omitted the year.
7. Followed Profile → Members, Wallet & orders. This separate catalog also contained Riverside Wedding Venue. **Select & review** offered fixed sample dates (20 September, 27 September, 4 October), quantity and a free-text request. It clearly disclosed that saving is not a reservation or payment. I did not save an order or book anything.
8. Opened Wallet. It showed **Not connected**, no supplied balance and no authoritative transactions.

## Highest-priority issues

**P1 — There is no usable two-person planning loop.** A couple needs one shared chapter with invitations, accepted access, both partners' edits and visible ownership of tasks. A local collaboration request is an honest placeholder, but does not accomplish that job. Requires authenticated accounts and server-enforced permissions, not just a new button.

**P1 — The vendor enquiry opens the wrong conversation.** Selecting a wedding offering should carry the offering and venue into the correct merchant enquiry. If no verified recipient exists, show an unavailable state. Never silently route a supplier enquiry to the current user. This is a routing/context defect, separate from disconnected message delivery.

**P1 — Wedding search fails to discover existing wedding content.** Space search should include relevant offering names/categories, or clearly guide the couple to service search. Today the couple needs to already know which resort to inspect.

**P1 — Guests are not a managed audience.** The Ping form lacks real guest entry/import or a shareable invitation route, household/plus-one handling, accept/decline/pending states, meal preferences and a clear private audience setting. A generic joined count is insufficient for an 80-person wedding.

**P2 — Planning dates are unreliable for long-range work.** The task editor saves the deadline as text rather than a scheduled date. Wedding Ping details omit the year. Booking options use fixed sample dates with no year or availability confirmation. These should become explicit dates and states, with draft-versus-confirmed clearly distinguished.

**P2 — Money tools do not support budgeting.** Budget tracking should work independently of payment integrations: category limits, estimates, quotations, committed amounts, payments recorded by the couple and remaining balances. Real payments can remain unavailable while that useful planning layer works.

**P2 — The same venue has disconnected paths.** Space Offerings routes to chat, while the catalog under Profile → Members routes to a review form. Consolidate the offering detail, enquiry and saved shortlist so the couple understands one service consistently. Allow attaching a shortlisted offering to the wedding chapter.

## What should be retained

- A Chapter is a good starting object for a life event; notes and linked tasks work locally.
- Ping time, place, capacity and participation counts provide a useful foundation for smaller wedding-related gatherings.
- Planner and Lounge reuse the newly created objects rather than requiring duplicate entry.
- Sample pricing, local requests and disconnected money services are disclosed. Do not replace these disclosures with simulated confirmations.

## Next complete experience to build

Keep the existing app structure. Let the wedding Chapter collect a shared checklist, a venue/supplier shortlist, a budget and linked Pings. Partners should co-own the plan; the planning committee and guests should have narrower access. A supplier enquiry should include the selected offering, desired date and guest count. A private Ping should collect guest responses and feed the agreed plan back into the chapter. After the event, the same chapter can hold the couple's selected moments.

Success criterion: a second real account can accept a partner invitation, edit an assigned dated task, shortlist a vendor and see a guest's response in the same plan. That end-to-end capability matters more than adding wedding-specific screens.

## Evidence and limits

[Partner request with no access granted](../verification/wedding-collaboration.png) · [Venue enquiry routed to self](../verification/wedding-venue-enquiry.png) · [Sample booking options and draft disclosure](../verification/wedding-booking.png).

Single expert walkthrough, not a test with two recruited people. Real-time sync, supplier responses, payments, actual guest RSVPs, photo upload, moderation, transport fulfilment and full accessibility were not verified. No fixes were implemented during this audit.
