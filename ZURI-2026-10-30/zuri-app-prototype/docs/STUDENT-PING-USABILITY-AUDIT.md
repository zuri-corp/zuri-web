# ZURI: student-to-real-circle usability audit

Date: 19 October 2026. Method: hands-on expert walkthrough of the current app, using an isolated local preview and fresh device data. This is one persona walkthrough, not research with recruited users. No real followers were contacted, external posts published, or payments made. The main app's data and application code were left unchanged.

## Persona and desired outcome

A 21-year-old single AI/ML student at ISBAT University. Rugby training Tuesday and Thursday evenings; matches Saturday. Interested in quantum physics and conversation. Has modest Twitter, Snapchat and TikTok audiences but no deliberate posting rhythm. Wants a recognisable digital presence, closer relationships with followers and occasional real meetups. Being single was not treated as consent to turn the journey into dating.

The success condition is not merely creating a Ping: bring a relevant person from an existing audience into a closer circle, choose a suitable time, secure an RSVP, meet, and maintain the relationship afterwards.

## Verdict

The app supports a credible local demonstration of connected content. It does not yet complete this person's social journey. The main gaps are audience entry, relevant discovery, time-aware planning and real participation across accounts. More screens or visual polish alone will not close them.

## Tasks attempted

| Task | Observed outcome |
| --- | --- |
| Express identity and interests | Saved a shared display name and bio. School, course, interests, availability and social accounts have no structured fields in the profile editor examined. |
| Protect the rugby week | Added training and Saturday's match as Planner tasks. Both were dated Monday 19 October, the creation date, regardless of the days and times typed. No scheduling or recurrence control was available in this task form. |
| Find relevant peers | ISBAT and quantum returned no connections. AI returned Adonai Plaza, The Keep Restaurant and Pairs among other results, indicating inappropriate substring matches. |
| Create a suitable meetup | Created “AI + quantum coffee — ISBAT student circle”, Wednesday 21 October at 17:30, eight places, with a manually entered public venue to confirm. This time was chosen manually, not recommended or checked by ZURI. |
| Bring followers into the meetup | Blocked. The invitation section offered seven fixed sample people. No audience search, external invitation link or QR route was visible in the flow examined. Invitations were explicitly local. |
| See participation and discuss plans | Detail showed time, venue, one joined participant, zero invited and eight total places. Saved a welcome message inside the Ping conversation. Delivery is explicitly not connected. |
| Make the meetup recurring | “Schedule & recurrence” produced no visible panel or navigation when clicked. A subsequent complete accessibility snapshot still showed the same Ping detail. Recorded as an observed failure; underlying cause not diagnosed. |
| Build a closer broadcast loop | Created “Alex’s lab & rugby loop” and a local update. Management offered name, description, Space context and archive; no visible audience acquisition, membership controls or invitation link. |
| Connect a social post to real activity | Created a Rizz post, searched for the new Ping, tagged it, and opened the correct Ping from the resulting Feed chip. This worked. No content scheduling, platform destinations or audience preview was present in the composer examined. |

## Prioritised findings

### P1 — There is no complete follower-to-attendee path

Reproduce: create Ping → expand Invite people. Only sample people are offered. Create a channel → Manage: no invitation or follower entry flow appears.

Impact: the existing Twitter/Snapchat/TikTok following cannot become the first real circle through the tested UI. This blocks the central goal even with a well-written Ping.

Fix: provide a shareable invitation with an understandable landing page, preview, join/RSVP, and return to the same Ping after sign-in. Start with a copyable invitation link and native sharing; automatic social account imports are not required. Persistent links, membership and delivery require real backend support and must not be simulated as live.

### P1 — Planner stores labels rather than the student's week

Reproduce: add “Rugby training — Tuesdays and Thursdays, 18:00–20:00” and “Rugby match — Saturday, 15:00”. Both display 2026-10-19.

Impact: the interface appears to accept the routine, but cannot represent or protect those commitments. The student must remember conflicts manually.

Fix: distinguish tasks from scheduled commitments; support weekday, start/end, timezone and recurrence. Show the week and conflicts when choosing a Ping time. Natural-language interpretation should expose editable parsed values before saving.

Evidence: [Planner](../verification/student-planner.png).

### P1 — Discovery does not establish relevance

Reproduce: Find → search ISBAT; search quantum; search AI. The first two are empty. AI produces unrelated place/tool results.

Impact: the student cannot tell whether peers are absent or the app misunderstands the query. The fixed Jinja context and generic sample catalog do not establish relevance to the supplied campus and interests.

Fix: collect optional campus, interests and preferred area; use appropriate word/token matching and explicit categories. An empty result should offer to start a relevant circle, invite classmates, or save the interest. Lack of real campus members is a data/population limitation; misleading matches and dead-end empty states are UX issues.

Evidence: [empty discovery](../verification/student-discovery.png), [AI matches](../verification/student-ai-search.png).

### P1 — A visible scheduling action did not respond

Reproduce: open the newly created Ping → Schedule & recurrence. No visible result occurred in this walkthrough.

Impact: the student cannot turn a one-off coffee into a dependable weekly habit and receives no explanation.

Fix: repair the action, show the first occurrence plus recurrence in human language, and expose a clear saved/error state. Verify this specific interaction with an end-to-end check.

### P2 — The closer circle is split across several product concepts

The tested route asked the student to understand a Channel for broadcasting, a Rizz post for visibility, and a Ping conversation for organising. The post-to-Ping connection works, but channel creation only accepts Space context, and no path in channel management explained how its audience becomes a meetup group.

Fix: make the personal circle the stable audience, with updates and Pings inside it. Preserve contextual conversations. Explain who receives each update and who may join each meetup rather than making the student infer the differences between product areas.

### P2 — Digital presence has publishing, but little planning

The Rizz composer supports a story, media and searchable context; the channel supports local text updates. The examined flows have no posting calendar, scheduling, reusable weekly rhythm, audience selection or cross-platform destination controls.

Fix: offer a small weekly plan: one learning update, one question/conversation and an occasional meetup. Support drafts and reminders before considering external publishing integrations. Do not imply that Twitter, Snapchat or TikTok are connected.

### P2 — First-meetup audience and privacy choices are not clear

The Ping form examined contains title, description, time, capacity, venue, context and sample invitations. It does not ask who can discover the Ping or who sees its meeting place. Capacity and joined/invited counts are good foundations, but do not explain RSVP certainty or host expectations.

Fix: show public/circle/invite-only visibility, a preview of what invitees see, venue visibility, host identity and clear participation states. Keep these decisions compact and understandable.

## What worked and should be preserved

- One shared identity appeared across the local post, Ping participant and conversation.
- The new Ping surfaced on Lounge automatically with its date and location.
- The Ping detail makes time, location, capacity and participation counts legible.
- Ping conversation remains inside the meetup; its contextual header replaces the broader navigation.
- A searchable context picker found the newly created Ping and produced a working Feed-to-Ping link.
- Returning to Rizz from Lounge retained the Channels section during the walkthrough.
- Device-only storage and disconnected delivery were explicitly disclosed. These are honest preview boundaries, not successful live services.

Evidence: [Ping detail](../verification/student-ping.png), [contextual conversation](../verification/student-conversation.png), [connected post](../verification/student-connected-post.png), [invitation form](../verification/student-invite.png), [channel management](../verification/student-channel-manage.png).

## Recommended next complete journey

1. Set a few optional identity/interests fields and the rugby availability once.
2. Create a small personal circle with a clear audience and a shareable invitation.
3. Share that invitation manually on existing social accounts; newcomers see a useful preview and return to the circle after joining.
4. Create Wednesday coffee from that circle, choosing a time against the student's actual weekly commitments.
5. Invite members, collect RSVP states, show venue and hold the conversation inside the Ping.
6. After the meetup, add a shared moment and offer the next occurrence; retain the same audience.
7. Use a simple weekly content plan to keep that audience warm between meetups.

Acceptance should be measured by whether a second real account can complete this whole journey, not by the number of screens available. Authentication, persistent access rules, invitations, notifications and cross-account messages must be verified separately when connected. Attendance, follower growth and actual meetings were not tested here. Mobile touch, screen-reader, contrast and network-resilience certification were outside this persona walkthrough.

## Scope of changes

Only this report and audit screenshots were added. Test identity, tasks, Ping, conversation, channel and post were created in an isolated preview origin. No application functionality was changed or fixed as part of the audit.
