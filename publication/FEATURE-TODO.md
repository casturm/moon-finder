# Moon Journal feature TODO

Persistent idea list for proposal-pipeline improvements. Add ideas here before implementation;
check existing entries to avoid duplicate work. Record the review artifact when an item ships.
Code preparation does not imply approval to merge or deploy.
Current implementation: draft [PR #18](https://github.com/casturm/moon-finder/pull/18).

| Feature | State | Scope / acceptance |
| --- | --- | --- |
| Existing-article title index | Ready for code review | Small JSON index from committed article data; refreshed by `--build`, checked in CI, supplied to each proposal run. |
| Proposal-stage duplicate gate | Ready for code review | Check the chosen topic against titles before writing; preserve draft title/body checks and bounded topic changes. |
| Auditable duplicate rejections | Ready for code review | Record reason, proposed topic/draft, matched article, UTC time, decision step and run ID; preserve run bundles on a separate audit branch. |
| Clear run status | Ready for code review | Distinguish skipped/recovery, already published, awaiting review, needs human input and failure; show duplicate count and audit link. |
| Review duplicate false positives | TODO | Inspect audit history before tuning thresholds; record examples of useful follow-ups wrongly rejected and repeats missed. No automatic override. |
| Semantic topic matching | Deferred | Consider only if title matching demonstrably misses repeated angles; decide from audit examples before adding model calls or dependencies. |

For each new idea, add a distinct row with its purpose, acceptance criteria and state.
Use TODO → in progress → ready for review → approved/merged, with the actual PR link when available.
Keep rejected/deferred ideas with a short reason so they can be reconsidered without repeating discussion.
