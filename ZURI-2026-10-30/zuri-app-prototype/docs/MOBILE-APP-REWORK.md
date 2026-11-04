# Mobile app rework — 19 October 2026

The user's correction is the current UX direction: preserve the connected system and planner, restore the character and depth of the older mobile app.

- Lounge is Home. The bottom app bar has only Aura, Motion, Rizz and Lore. The header home control returns from apps; detail pages have Back. The desktop sidebar and large Viola hero have been removed from the active shell.
- Home has a compact Viola composer with identity, text field, browser speech-input control and expandable details. Speech recognition is browser-dependent and begins only on the person's microphone action; no microphone access was requested during verification. Live AI remains a separate unconfigured service.
- The existing Planner widget is retained. Ping invitations and a Lore collector are added to existing local workspaces without replacing tasks, saves or moments. The collector selects the person's photo posts and adds them to an existing or newly named chapter, with duplicate protection.
- Spaces have photo covers, follow/save actions, a Pulse of connected Pings, events and posts, and Events / Societies / Offerings / About sections. The original offerings are restored as sample catalog details with contextual questions through Rizz.
- Societies have covers, member/topic information and Topics / Events / Pings / Spaces / About sections. Public topics open actual sample discussion threads, allow local replies, and link authors into Rizz private conversations. Private Society content stays locked; local join requests do not invent approvals.
- Events use photo posters with date, time, admission and attendee context. Details include an organizer profile, overview, people, connected Pings, venue and related trips. Add to Planner remains planning, not a booking.
- Channels use a broadcast header, connected Space pin, dated archive posts and follow control. Archived video covers are identified as covers without playback. Chats use an avatar inbox, a conversation header, message wallpaper, outgoing bubbles, local timestamps, composer and removable local drafts. No incoming message or online status is simulated.
- Unsent chat/topic drafts remain in the app's session draft store, and list filters use the existing navigation state. The floating Viola orb is hidden in full-screen chat/channel views so it cannot cover their controls.

The source in `C:/Users/L23/Downloads/eco_1_updated (6)/eco_1_extract/` was inspected read-only, particularly the existing Aura Space, Society and topic screens. No files in that reference directory were changed.

Verification: strict TypeScript/Vite build and 27 automated tests pass. Tests include old-widget migration preserving completed tasks, adding only valid own photo moments to chapters without duplication, and topic/reply persistence through backups. Interactive checks covered Home and its four-app navigation, Society/topic routing, Space activity, local chat creation/deletion and broadcast channels. Phone-width layout was inspected through the preview; browser zoom affects the preview's reported viewport. Physical microphone input and real AI/delivery/booking services were not tested or claimed.

The running app is still at http://127.0.0.1:8443/. The prior source ZIPs are historical snapshots; the current workspace is authoritative.
