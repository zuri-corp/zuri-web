# Requests and service forms

Implemented a unified Requests area under Lore Profile and contextual Space links. It combines enquiry notes and offering requests, supports search and active/type/cancelled filters, and keeps older enquiry formats readable.

Enquiry drafts can be edited, cancelled and restored. Offering drafts can be revised without changing their identity or creation time, cancelled and restored. Product forms retain item quantity and variants; rental, appointment, subscription and pass forms collect relevant preferred dates and requirements. Guest counts do not multiply venue prices. Service rates require a final merchant quote.

Space Overview includes quote-only services, direct access to Space requests and gathering dates. Space navigation has Overview, Offerings, Activity and More; Events, Societies and About sit under More. Following and update notification preferences are labelled separately.

Validation: 66 automated tests passed, including six request-specific tests for dates, guest counts, quantity, revisions, older enquiry formats and reload/cancellation/restoration. Production build checked separately. Fresh browser visual verification was unavailable because the browser URL policy denied access; no alternate browser route was used.

Pending live infrastructure: merchant submission and replies, verified availability, booking confirmation, payment, delivery and recurring billing. All current requests remain unsent drafts stored on this device.
