# Work board

- PR #1: reviewed, approved and merged by user; GitHub Pages deployment succeeded.
- Artifact upload: user manually fixed and merged; export confirmed successful.
- Ledger initialized; first daily test retrieved all sources but OpenAI returned HTTP 400 before topic generation. The request has an unresolved reservation, not confirmed spend.
- API diagnostics: add redacted provider error fields and an explicit, audited reconciliation action. 40 local tests passed; code review and merge approval pending.
- Exact cause of HTTP 400: unknown because original code discarded provider response details. No speculative model/parameter changes.
- Billing reconciliation and any further paid call require operator verification; no hold released, no new paid calls made by this fix.
- Daily generation: asked user to disable while debugging; current setting not verified.

- Diagnostics/reconciliation fix: merged by user. Second test exposed provider validation requiring JSON in the input message, not only separate instructions.
- JSON input fix: add explicit JSON-output instruction to input for all three stages; 41 local tests pass including provider-style request validation. Review/merge pending. No additional API calls or ledger reconciliation performed.

- JSON input fix merged; live topic selection and article drafting now succeeded. Fact check used all 3,500 output tokens and ended incomplete. Run used three API calls, all settled, with no unresolved hold.
- Review-capacity fix: propose 8,000 output tokens/call; USD limits and call counts unchanged. Preserve validated draft.json and incomplete reason. Correct cache-write token pricing for future estimates; historical costs remain unchanged pending audited reconciliation.
- 44 offline tests pass; live rerun, review, merge and further spending remain pending. Current UTC day's three-call allowance is used; do not rerun until reset or explicit limit change.

- Editor agent requested by user: model chooses choose_topic/research/draft/revise/check/submit/escalate with eight decisions, two revisions/topics and three extra catalog fetches. Proposed call allowance: 12/day and run, with existing USD/token limits unchanged.
- Submission requires a passing check for the exact current draft and selected evidence. Topic changes, revisions and research invalidate prior approval. Model cannot alter limits, fetch arbitrary URLs or publish directly.
- Escalations create a draft PR with question, feedback and decision history; no article is copied or rendered. Technical API/storage failures still stop without automatic retry.
- Validation: 63 offline tests passed (including a rejected→revised→rechecked article), workflow YAML/shell checks passed, both added NASA sources fetched successfully. No live model calls or ledger changes made. Code review, merge and activation pending.

- User approved advisory style handling: distinguish blocking factual/unsupported/archived-duplicate concerns from style suggestions; submit a freshly fact-checked article PR when revisions run out, retaining editorial notes.
- Require a fresh review between revisions to prevent repeated editing against stale feedback. Decision/call exhaustion can also preserve a current passing draft as an article proposal; unchecked or failed drafts still escalate.
- Validation: 68 offline tests pass, including style-limit submission, factual/quote blocking and stale-feedback prevention. No paid calls, ledger changes, production merge or deployment. Code review and merge approval pending.

- User requested diagnostics before recovery changes for the Oct 28 ledger stop. Historical cause remains unproven; revision and settlement succeeded, then a reservation check stopped work.
- Add artifact ledger-diagnostics.jsonl with read/write version SHAs, last acknowledged write, blocking reservations, UTC timestamps, session/run IDs and safe GitHub response metadata. No retry/recovery, spending-limit or ledger-format changes.
- Validation: 71 offline tests pass, including simulated older-read evidence capture, unchanged reservation stop, request count checks and secret/body exclusion. No paid calls or live ledger writes. Review branch/PR pending user code review and merge approval.
