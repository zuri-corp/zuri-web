# Connected worlds implementation

## Main gaps and the fixes

1. Discovery ended at object details. Shared Connected actions now offer Save to Chapter, Plan a next step and Prepare an update on Spaces, Societies, offerings, people, Chapters, saved requests/enquiries, events and Pings. Empty choices link to creating the required Chapter/channel.
2. Moving between worlds lost context. Chapter links, Planner tasks and channel updates retain typed source references. Chapters show Connected here; sources show the private Chapters where they were saved; tasks and updates link back to their sources. Repeated saving of a Chapter link is idempotent.
3. Plans had no reflection flow. Event and Ping details now offer Collect a recap, creating a private Chapter with an optional reflection and a link to the original gathering. Existing Chapter Add Moment, notes and shared task controls complete the flow. Attendance is not inferred.
4. Linking and publishing were ambiguous. Forms explicitly distinguish saving a reference from making a task or a separate channel update. No source ownership, private Chapter body or permissions are copied into channel text; users write the actual caption. Live delivery is not claimed.
5. Return-state was inconsistent. Requests uses shared route search/filter state. Session form memory keeps text/choices for creation and handoff forms; connection panels remember the open action; context tags restore per route. File inputs and photo payloads are excluded and must be reselected after closing a composer.
6. Statistics were decorative or absent. Lounge now calculates open tasks, active owned channels, Chapter count and active request/enquiry drafts from actual records. Every statistic opens the relevant destination. No reach, revenue, conversion or follower metrics are invented.

## Validation and limits

86 automated tests cover the existing suite plus source-link idempotency, shared task identity, due dates, private-content separation, recap creation and malformed references. Production build checked. Browser verified Lounge counts, Connected actions and source-aware forms; a draft restoration defect and duplicate React key were found and fixed. Final browser recheck was interrupted by a stopped server and browser policy blocking its error page; the preview server was restarted on the existing address. Final draft restoration after those corrections still needs a fresh browser check.

This remains a device-local prototype. Sending invitations, actual attendance tracking, public publishing/delivery, bookings and merchant replies still require live services. No such integration was fabricated.
