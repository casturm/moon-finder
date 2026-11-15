# Evidence validation investigation: PR #21

PR #21 (`publication/escalations/2026-11-14.json`) records three checks, each
followed by the same generic quote failure. The editor revised twice despite
reporting that the reviewer passed the facts. No blocking factual issues were
listed. The durable run bundle on `moon-journal-audit`,
`publication/proposal-runs/43630979875-1.json`, records completed, settled calls
and five retrieved source hashes. The workflow artifact listing identifies
`moon-journal-review-43630979875` (artifact 14128286668). Its download returned
HTTP 401 in this session, so the historical quotes and source snapshots could
not be compared. Formatting is a supported failure mode of the old code, not
an established explanation for those particular historical quotations.

The deterministic validator used raw `quote in evidence`, stopped at the first
failure, and provided no claim, quote or passage. The editor treated that review
citation failure like article feedback; the check request did not receive the
feedback at all. Rewriting the article therefore could not reliably repair the
reviewer's quotation. The persisted review was overwritten at each check.

The fix separates factual verdict/issues from quote, citation, coverage and
review-format diagnostics. Quotes use NFC, collapsed Unicode whitespace, curly
quote folding and Unicode hyphen/nonbreaking-hyphen folding. Words, numbers,
case, negation, dashes and other punctuation remain significant. There is no
fuzzy acceptance, ellipsis expansion, word deletion or semantic auto-approval.
The nearest sentence is diagnostic only and explicitly labeled as such.

Every mismatch includes zero-based paragraph and claim indexes, claim, URL,
expected quote and source passage. All mismatches are collected even when the
reviewer also reports factual problems. The editor receives full diagnostics;
the next check receives feedback and instructions to repair review quotations
against the unchanged draft. Review and validation snapshots are versioned in
the existing workflow artifact. Structured diagnostics also survive in decision
history and escalation records. Escalations distinguish the model's factual
verdict from deterministic evidence validation; neither alone permits submission.

Validation: 99 offline publication tests pass, including harmless formatting,
changed words/numbers/negation, stitched quotations, wrong/missing sources,
simultaneous factual and quote failures, and repair by rechecking the unchanged
draft without consuming an article revision. Diff whitespace validation passes.
No paid model calls, ledger mutation, article changes, merge or deployment.
Code review, test-report approval, integration and deployment approval remain
separate and pending.
