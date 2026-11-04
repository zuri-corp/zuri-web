# Data inventory and retention decisions

The executable prototype inventory is `src/core/privacy.ts`; the user-facing view is Lore → Profile → Data & privacy. This document distinguishes intended production decisions from current storage.

| Class | Current implementation | Production decision / acceptance criterion |
|---|---|---|
| Identity, recovery | Name/bio/photo in localStorage; no live account | Public alias separate from recovery/KYC; minimal required fields; audited restricted recovery access |
| Private Lore, tools, conversations | Readable localStorage; no application E2EE | User-held keys, encrypted sync/attachments/backups; server cannot search plaintext |
| Public profile/updates/offerings | Device-local preview | Explicit publish action; public object field allowlist; caches/index expiry tested; copy limits explained |
| Private membership/location | Seed/local records; no GPS requested | Restricted participant metadata, coarse discovery defaults; no public membership directory by default |
| Form drafts | Opt-in sessionStorage; no encryption | Device-only retention choice, expiry and clear control; browser restore caveat |
| Navigation/context/search | sessionStorage/history | Avoid sensitive terms in URLs and server logs; minimise retained query history; device clear controls |
| AI text | Up to 12 reviewed conversation messages if service configured | Named processor, purpose, retention/training disclosures; no passive record ingestion |
| Speech | Optional browser speech recognition | Disclose external browser/provider processing before sensitive voice use; evaluate local transcription |
| Image delivery | External host requests; browser caches possible | Self-host/proxy deliberately public media; strip EXIF on publication; do not leak private attachment URLs |
| Reports | Local unsubmitted report drafts | Submitted-evidence store with reviewer roles, access audit, proportional retention and appeals |
| Payments | No live settlement; local requests | Processor/controller map, exact required records and country-specific retention; segregated access |
| Security logs | Deployment/tooling dependent, not audited | No bodies/secrets in logs; bounded purpose-specific IP/token retention; rate-limit state separate from analytics |
| Exports | Unencrypted JSON downloaded by user | Encrypted export option, keys separate; deletion in ZURI does not erase downloaded copies |
| Backups/holds | No cloud lifecycle | Bounded backup expiry; verified restore/deletion process; narrowly scoped preservation controls |

Do not invent numerical retention periods before identifying purposes and applicable law. For each production collection record an owner, fields, purpose, legal basis, readers, processors, retention trigger, duration, deletion job, backup delay, hold exception and proof-of-deletion test. No indefinite “just in case” collection.

A delete action must explain what disappears immediately, what remains under a valid legal requirement, the backup expiry window and what other recipients/providers control. Apply lawful holds narrowly; do not secretly promise to destroy data after a preservation demand.
