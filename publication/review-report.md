# PR #1 review and fixes

## Fixed findings

- Broken sources: phases and lunar-eclipses URLs returned 404. Replaced with NASA's current moon-phases and eclipses pages; fetched all five successfully using the production retrieval function.
- Incomplete fact checks could pass: one supported claim was enough for an entire article. Require indexed evidence for every paragraph and ensure the review cites a source linked in that paragraph. Human review still must assess every claim; paragraph coverage is not proof of completeness.
- Stale local draft after failure: remove prior draft/evidence outputs before a run; only write article.json after validation and preview generation succeed.
- Daily workflow recovery: a pushed branch with failed PR creation previously caused future runs to silently skip. Recover the PR without regenerating or spending again. Do not retry a closed/rejected daily PR.
- Pending drafts were invisible to the archive: pause new paid generation while an article PR is open, keeping topic selection aligned with the reviewed archive.
- Preflight GitHub errors previously looked like absent branches. Fail on API errors and capture one date for generation, filenames and branch naming, including runs crossing UTC midnight.
- Rendering relied on generation-time validation. Validate archive dates/slugs/citations before writing files, and use relative stylesheet links so local previews work.
- No automatic PR validation: add secret-free CI for regression tests and consistency between article data and generated pages.

## Validation

16 tests passed, covering the original gates plus paragraph coverage, invented evidence, date traversal, stylesheet links, stale output cleanup, pending review, authentication failure and branch recovery. Both workflow YAML files parsed, all embedded shell scripts passed syntax checks, and diff whitespace checks passed. All five live NASA source fetches succeeded. No paid model calls, merge, deployment or daily activation occurred.

## Remaining limits

Hosted Actions execution and Pages configuration remain unverified. Workflow-created PR CI may need manual approval. Run one paid draft before enabling the schedule. Model fact checking is fallible and requires human editorial review. The source collection supports evergreen articles, not live news. Budget controls must be configured at the API provider; per-run token caps are not a dollar spending ceiling. Standard action major-version tags remain mutable; pin reviewed full commit hashes if stronger supply-chain controls become necessary.
