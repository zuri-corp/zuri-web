# Privacy threat model and validation backlog

| Threat | Intended defence | Residual risk / required verification |
|---|---|---|
| Doxxing or malicious discovery | Pseudonyms, field-level publication, restricted membership, coarse location | Public content can be copied; test alias correlation and metadata leaks |
| Harassment/invite spam | Message requests, blocks, rate limits, invite quotas | Local blocks are not cross-account enforcement; test ban evasion without broad surveillance |
| Malicious reports | Evidence-based triage and appeals | Human decisions can be wrong; reviewer quality and abuse metrics required |
| Hostile third-party tool | Isolated transport, capability broker, context grants | Current in-process SDK is not a hostile-code sandbox; do not install external code |
| AI exfiltration/prompt injection | Explicit payload review, field allowlists, no passive private ingestion | Provider sees approved text; unknown retention must block sensitive launch workflows |
| Device theft or XSS | Encrypted vault, OS protection, CSP, secure session design | Current localStorage is readable; unlocked endpoint/key access defeats many controls |
| Insider data browsing | Segregated roles, minimal records, logged evidence access | Requires actual operational controls and audit, not UI role labels |
| Bulk server compromise | Minimal metadata, E2EE, separated keys/identities | Ciphertext and metadata still expose patterns; independent assessment required |
| Legal compulsion | Data minimisation and counsel-reviewed narrow response | No immunity guarantee; assess obligations and forced future changes |
| External media/voice providers | Referrer suppression, controlled hosting, disclosed processors | IP, audio and provider-side logs may remain; inventory processors |
| Backups and retention drift | Expiry jobs, restore/deletion tests, bounded holds | Browser/downloaded copies outside service control; never promise universal erasure |

Acceptance tests before a sensitive-data pilot: cross-account object authorization; private search isolation; rekey on group removal; backup-key recovery failure modes; EXIF stripping; invite/account abuse; limited report disclosure; permission revocation after tool open; AI exact-payload/changed-payload rejection; log/telemetry payload inspection; deletion including backups; legally reviewed demand tabletop.

Prototype test coverage is limited to payload allowlisting/review matching, form-draft key scoping, validated preferences and existing local access helpers. It does not substitute for penetration testing, cryptographic audit or legal review.
