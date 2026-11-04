# ZURI Core privacy architecture — decision baseline

Status: proposed production architecture; prototype safeguards implemented separately. No production privacy certification, legal immunity, anonymous-payment guarantee or end-to-end encryption claim is made.

## Product commitments
Privacy is a universal default, not a label for sensitive industries. Do not collect a “grey industry” attribute or infer one from behaviour. Separate unconventional lawful activity from actual harmful conduct; make policies explicit and appealable. Decide market-specific eligibility and licensing requirements with local counsel. Protect people whose expression or identity exposes them to discrimination without promising exemption from law.

Support a pseudonymous public identity with optional context-specific personas. Account recovery and payment/KYC identities must be separate from public profiles and ordinary discovery services. Do not require identity documents for ordinary social exploration unless a specific assessed obligation applies. A verified attribute must state its narrow meaning, not become a general trust score.

## Data zones and key ownership
1. Public publication: explicitly selected profile fields, channel updates, public Space offerings and public Society topics. Search/index only this zone; content can be copied and indexed outside ZURI. Publication and de-publication cannot recall copies.
2. Private vault: private Lore, notes and draft content. Encrypt on device before upload; user-held keys, independent encrypted backup and documented recovery trade-offs. No automatic linkage from private activity to hiring, advertising or public recommendations.
3. Private communications: use an independently reviewed E2EE protocol and implementation for direct/group messages, attachments and supported private shared objects. TLS and database-at-rest encryption are not substitutes. Document supported devices, membership/rekey behaviour, forward secrecy, attachment key handling and key verification. Never invent a custom cipher.
4. Transaction/compliance records: restricted service/provider with purpose-specific statutory retention determined by counsel. Tell users which identity/payment records exist elsewhere. Never advertise these as anonymous.
5. Abuse reports: evidence deliberately submitted by a reporter, with provenance, limited access, defined retention, appeal and malicious-report protections. Reports of encrypted messages intentionally disclose selected plaintext, not the whole conversation.
6. Operational metadata: minimise IP logs, tokens, delivery metadata and object-access traces. Log action category and outcome rather than message bodies or global behavioural profiles. Separate abuse prevention identifiers from public identity.

Recovery must not introduce an undisclosed master key. A provider-assisted recovery mode that makes plaintext accessible must be separately disclosed and cannot be called provider-blind E2EE. Lost keys may mean lost content. Encryption does not hide all metadata or prevent screenshots, compromised devices, social engineering or a recipient's voluntary disclosure.

## Discovery and AI boundaries
Keep search on device for private vault contents. Server discovery uses deliberately public fields and chosen coarse location. Exact location, private memberships and contact lists do not enter global search. Do not infer protected/sensitive traits. Personal interests are chosen and removable.

Viola receives only a reviewed, purpose-bound payload. Show destination, provider/subprocessors, retention, training use and transferred fields before approval. No blanket checkbox grants access to private conversations or all Lore. Consent expires with the action; changing the payload requires another review. Treat third-party content as untrusted instructions. Server credentials stay server-side. Providers must meet contractual processing requirements; if disclosure information is missing, do not launch sensitive-data workflows.

## Tools and SDK
The current in-process SDK is first-party only. It checks context availability and current grants for each storage/action call and namespaces data by tool/context. Public context association does not share private tool notes with other members.

External tools require an isolated execution surface, a strict message/RPC schema, trusted-host permission enforcement, origin validation and network controls. Never expose LocalData, raw database clients, credentials, a global event bus or unrestricted object traversal. Each public capability needs a purpose, field allowlist, context, expiry and revocation semantics. Publication, messaging, payments and external transfer are separately reviewed actions.

## Protection from malicious users without routine surveillance
Use message requests, contact/invitation quotas, user blocks, private membership controls, account recovery safeguards and device/session management. Apply narrowly scoped rate limits and bounded security logs instead of reading everyone's private content. Public-content moderation and user-submitted evidence remain available. No silent staff join into encrypted rooms.

Reports get triage, evidence checks, proportional restrictions and appeals; a report count alone is not a guilt score. Separate reporter confidentiality from accused-user access. Log staff evidence access and restrict exports. Define emergency handling with legal/human-rights review rather than unconditional monitoring.

## Legal and operational boundaries
Use LEGAL-REQUEST-RUNBOOK.md. Possessing less data reduces disclosure exposure; it does not remove valid obligations or guarantee resistance to compelled future changes. Assess jurisdictions for the entity, hosting, staff, users and processors. Encryption design must be reviewed with counsel and independent security experts before promises are made.

## Launch gates
- Named privacy/security owners; data controller/processor mapping; applicable registration and legal review.
- Data-flow inventory and DPIA/threat model approved for each sensitive feature.
- Server identity, object and membership authorization tested against IDOR/cross-tenant access.
- Reviewed E2EE implementation and recovery/backup UX; independent audit and incident plan.
- Purpose-specific retention jobs, backup expiry and verified deletion, with lawful preservation exceptions.
- Provider/subprocessor contracts, access audit and legal request playbook rehearsed.
- Abuse report queue, human review, appeal and contact protections operational.
- Privacy claims checked against runtime behaviour; no sensitive real-user pilot before these gates.

## Current implementation
Privacy overview displays actual storage limitations. Unsaved form persistence is opt-in. Clear-form-drafts and bulk tool revocation are explicit user actions. Viola requires an exact-payload review before POST; no local records are attached automatically. Referrer metadata is suppressed by the document policy. These do not implement encryption, server enforcement, provider retention control or a legal-compliance service.
