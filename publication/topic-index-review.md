# Proposal topic index — review report

## Change

Topic selection now checks a compact title index before requesting a writer draft.
Potential duplicates become bounded editor feedback with an explicit matched article.
Draft slug/title/body checks remain blocking. The feature TODO list records future ideas
and defers semantic matching until audit examples justify it.

Each generated run produces an index snapshot, append-only rejection events, run JSON
and a readable status summary. Actions persists a create-only run bundle on the separate
`moon-journal-audit` branch, including failed and escalated runs, before uploading artifacts.
Read or write errors fail visibly; no existing audit record is overwritten. First-use
branch creation shares the existing serialized workflow concurrency group.

## Validation

- 94 offline publication tests passed, including early rejection without a writer call,
  replacement topics, invalidation of an earlier passing draft, draft/body duplicate
  attribution, case/punctuation/word-order matching, and end-to-end rejection → escalation
  with consistent run ID/count/status.
- Audit tests cover bundle contents, first-use branch creation, existing-branch preservation,
  fail-closed read errors, invalid run paths, and no writes for skipped generation.
- Index matches all three committed articles. Rebuilding pages leaves `journal/` unchanged.
- Workflow shell syntax and diff whitespace checks passed.

## Limits and approvals

Title matching is heuristic: it can miss paraphrases and reject useful follow-ups. Topic
angles do not override a title match. Reviewer-reported semantic duplication remains in
normal factual review evidence; only deterministic duplicate gates produce matched-article
rejection events. A human can inspect those events before adjusting the policy.

No paid model calls, production changes, deployment, live audit branch writes or automatic
merge were performed. Hosted audit writes/first-use branch creation need verification after
reviewed integration; network/API behavior is mocked in local tests. Durable audit storage
uses repository history rather than artifact retention. A persistence failure stops proposal
PR creation; preserve its artifact and resolve that failure before a paid rerun.

Code review, test-report approval, integration approval and deployment approval are pending.
