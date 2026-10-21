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
