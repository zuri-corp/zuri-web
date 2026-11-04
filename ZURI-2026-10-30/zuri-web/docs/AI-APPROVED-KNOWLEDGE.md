# ZURI AI public knowledge — first edition

## What is included

The curated source catalogue is in `src/lib/ai/knowledge/catalog.ts`. It includes Corporate, Tech, Select, Pamoja/Spaces, individual participation, memberships, Invites, Developer Studio, independent tool guidance, enquiry handoff and AI boundaries. Service descriptions and offer prices/inclusions are derived from the website's canonical service and commerce records. Proposed offers remain explicitly proposed. No independent product sale, refund, SLA, entitlement or delivery is inferred from an enquiry.

`/ai-knowledge` is a public, read-only catalogue and question-matching explorer. It does not call OpenAI or spend credits. Its search question is in the URL; it must contain public questions only. There is no upload, approval dashboard or publishing API in this edition.

## Meaning of approval

`existing-public-catalogue` means a deliberately allowlisted, already published ZURI source. It is not a new human policy signoff. These entries follow edits to the canonical public catalogue and should be reviewed with the website's commercial copy. There is no invented reviewer identity or approval date.

New policy records should use `approvalBasis: 'manual-review'`. Prepare the record as a draft; obtain the owner's approval for its exact text, source link, surface and availability; record that review in version control. Set `approvedRevision` to the generated revision and `state` to `included` only after approval. A changed body produces a different revision and fails eligibility until reviewed again. Drafts, retired records, stale approval revisions, expired records and wrong-surface records are excluded. To withdraw immediately, retire the record. There is no UI that authenticates an approver, so code review and deployment access are the approval boundary.

The version hash identifies the selected catalogue contents. It is not a cryptographic signature or legal certification. Source revisions link an answer to the text used for that request; this implementation does not maintain a historical source archive. Preserve prior releases in version control for audit.

## Decisions still needed from ZURI

- Deposit and payment milestones: do not assume a standard percentage.
- Refund/cancellation terms: no universal period or refund promise is confirmed.
- Staff response targets and office hours: no guaranteed SLA is confirmed.

Agree these in the written project scope until a reviewed public policy exists. The explorer lists these gaps and the model is explicitly instructed to acknowledge them. Missing-policy detection is conservative and does not perform legal interpretation; update it when adding an approved policy.

## How answers are grounded

After request validation, configuration and verified authentication, local lexical matching selects at most five eligible public records and 7,800 UTF-8 bytes of complete source bodies. Short followups may reuse the previous user statement; assistant text cannot choose sources or approve facts. There is no crawler, embedding service or provider-hosted knowledge store. Catalogue text is provided as reference data, not instructions. Cost reservation includes the added context before OpenAI is called.

Conversation replies use a structured `sourceIds` field restricted to that request's selected IDs. The server validates IDs and resolves titles, safe internal links and revisions itself. The website and Viola display these sources separately; source metadata is stripped from the next reviewed conversation payload. Citations are optional for general conversation and do not themselves prove semantic faithfulness. Prompt injection can influence matching, but cannot include an unallowlisted record, unlock a private account or grant action permission.

There is no retrieval from private chats, Motion, Lore, photos, Wallet, client documents or Space records. Fictional directory entries and preview articles are not ingested as business evidence. Vendor prices and current external news require separate verified research; this catalogue supplies neither.

## Launch and evaluation

Automated tests cover canonical price limits, proposed status, relevant retrieval, missing policies, whole-record bounds, unapproved/expired source exclusion, user-only followup evidence, source validation and grounding inside the existing authenticated spending gateway. Provider responses are mocked; these tests do not measure the chosen live model's answer accuracy.

Before live activation, review the public catalogue, configure a fresh server-side provider key and model/rates, apply the existing gateway migration and provision allowances. Then evaluate real answers against the catalogue, especially plan comparisons, quote exclusions, ambiguous questions and attempts to invent policies. Do not use the previously exposed key. Live connection, billing and private account retrieval are not enabled by this knowledge change.
