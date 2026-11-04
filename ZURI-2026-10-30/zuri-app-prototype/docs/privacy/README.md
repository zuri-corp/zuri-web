# ZURI Core privacy design

Start with [Core privacy design](CORE-PRIVACY-DESIGN.md). Supporting documents: [Data lifecycle](DATA-LIFECYCLE.md), [Threat model](THREAT-MODEL.md), and [Legal-request runbook](LEGAL-REQUEST-RUNBOOK.md).

Implemented now: honest in-app storage inventory, opt-in unsaved form persistence, explicit form-draft clearing, bulk tool revocation, exact AI payload review and document referrer suppression. Local records and exported backups are not application-encrypted. Provider disclosure, retention guarantees, end-to-end encryption, server authorization and legal operations remain launch gates.

Validation: 101 tests pass, including payload allowlisting, changed-payload review rejection, draft-key isolation and preference validation. Browser visual/interaction verification is pending.
