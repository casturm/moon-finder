# Moon Journal: review-first 30-day experiment

## Architecture

GitHub Actions → retrieve NASA seed pages → bounded editor decisions (choose topic, research, draft, revise, check, submit or escalate) → deterministic citation/evidence/duplicate gates → article or escalation draft PR → human editorial review → existing GitHub Pages hosting after an approved article merge.

The app remains at `/moon-finder/`; the publication is `/moon-finder/journal/` and links to the app. No app files or existing hosting settings change. An app-to-journal navigation link can be reviewed separately. No backend, database, framework, paid search service or automatic merge. This first version researches a bounded evergreen source library, not live news. Add reviewed NASA/ESA sources and feed discovery after evaluating quality. The editor chooses its own angle and next action; there is no 30-topic calendar or fixed sequence of model stages.

## Experiment and acceptance criteria

- Days 1–3: manually run, inspect evidence and approve the first articles. Resolve source availability and model compatibility.
- Days 4–10: enable daily proposals; record review minutes, unsupported claims, duplication, failures and token usage.
- Days 11–20: adjust prompts/source library if topics repeat. Add news discovery only with date verification and attribution checks.
- Days 21–30: assess usefulness and whether the archive earns repeat visits. Curate categories. Decide whether to continue with human approval.

Target: up to 30 approved original articles, zero known unsupported claims, useful variety, under five minutes of review per article. New generation pauses while an article PR is awaiting review; there is no review backlog. One proposal per UTC date, not a guarantee of one published article: fail closed on poor sources or failed checks. Stop after 30 merged articles. Pause by setting `MOON_JOURNAL_ENABLED=false`. Scheduled Actions can be delayed or disabled by GitHub; this is best effort. There is no catch-up burst.

## Approval and activation

Implementation is proposed in draft PR #1 on `codex/moon-journal`. Requirements, tests, diff, integration and deployment remain separate approval gates per AGENTS.md. The user approved the review branch and PR; nothing has been merged or deployed.

After reviewing and approving public changes:

1. Push the review branch and open an implementation PR; review the diff and test report.
2. Approve integration/deployment explicitly before merging. Verify the existing Pages branch/source configuration actually serves `/journal/`.
3. Configure a dedicated low-spend OpenAI project key as secret `MOON_OPENAI_API_KEY`. Set `MOON_MODEL` to an available inexpensive model supporting Responses JSON mode. Model is explicit to avoid silently choosing a paid model; it must also exist in the reviewed pricing map in publication/spending.json.
4. Initialize the durable ledger using the Moon Journal spending report workflow (action: initialize). Review publication/spending.json and provider spending controls/alerts. Default pipeline limits are $5 total, $0.20/day and $0.20/run. Costs are estimates at the reviewed model rates, not an invoice guarantee. The code limits to 12 model calls per day and run, eight editor decisions, two revisions, two topic choices, three additional approved research fetches, 8,000 output tokens/call, and 30 merged articles. Editorial revisions are bounded; failed or uncertain API requests are never automatically retried. Failed/unmerged days can still cost money; token caps are not a dollar spending limit.
5. Allow Actions to create pull requests, then set repository variable `MOON_JOURNAL_ENABLED=true`. Run manually first. Cron is 14:23 UTC daily.
6. Download the evidence artifact, read the preview and citations, then mark the draft ready. Require human review and disable auto-merge using repository rules. Merging the article PR publishes through existing Pages; approve this explicitly. No workflow auto-merges or directly deploys.

GitHub token-created PR checks may require a human to approve workflow runs. Token-created pushes do not trigger Pages builds; publishing depends on human-reviewed merges and the existing Pages configuration, which has not been changed or verified remotely. See [GitHub token behavior](https://docs.github.com/en/actions/concepts/security/github_token).

## Local checks

```
python3 -m unittest discover -s tests/publication -v
python3 publication/pipeline.py --build
```

To generate a paid proposal, provide `OPENAI_API_KEY` and `MOON_MODEL` in your environment, then run `python3 publication/pipeline.py`. Do not commit credentials. It writes only `.publication-run/`, ignored by Git. `--build` renders committed `publication/articles/*.json` into `journal/` without API access.

## Observability and limitations

Every run writes `run.json` with outcome, stage usage/model/response IDs, source hashes and errors. The artifact also contains fetched source text, a claim/evidence review, article JSON and preview. GitHub retains these for 30 days. Failed jobs stay visible in Actions; configure GitHub failure notifications in your account. No external monitoring subscription or visitor tracking.

Sixteen offline tests cover accepted/rejected drafts, citation failures, duplicate detection, unsafe source hosts, path traversal and escaped HTML. All five curated NASA sources were successfully retrieved with the actual fetcher during review. Live API/model behavior and hosted GitHub workflow/Pages integration remain unverified. A separate model call is not independent scientific verification; it can miss claims or agree with the writer. Human review is mandatory. Word-overlap deduplication is heuristic; the editor and checker also see archive summaries. The NASA-only seed collection limits topic breadth and independent corroboration. Do not label this a news service yet. No images or ads are included.

The API uses the official [Responses structured output guidance](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses); local validation rejects malformed/incomplete JSON and unsupported citations. Prompts and source pages never become shell commands. Source retrieval permits only the curated HTTPS NASA host, rejects redirects and bounds response size.

## Review fixes

See [review report](review-report.md) for defects fixed, regression coverage and remaining validation. Source pages are bounded to 2 MB each. The workflow captures one UTC date at preflight, fails on GitHub API read errors, pauses for open article reviews and recovers an existing daily branch if PR creation failed. CI checks article rendering and the offline suite without secrets.

## Spending dashboard and enforced limits

See [spending operations](spending-operations.md). Every paid call now requires a durable reservation before sending, followed by immediate usage settlement. Failed article validation still counts as spend. Limits include total/daily/run USD, daily/run calls, daily tokens and per-call token caps. A missing ledger, storage conflict, unknown model rate, unresolved request or insufficient budget blocks further API calls.

A fact-check response exhausted the old output limit. The cap is now 8,000 tokens, covering reasoning plus written output; incomplete responses still fail closed with no automatic retry. A validated draft is saved as draft.json for review if fact checking fails. Cache-write tokens are now costed separately from ordinary input; past ledger estimates are not silently rewritten. Reconcile historical entries only after checking provider billing.

## Editor agent

See [editor behavior and safeguards](editor-agent.md). The editor chooses the next action from the live draft, review feedback, available evidence, concise decision history and remaining budget. Revisions invalidate prior checks. A request for human input becomes a draft PR containing an escalation record, never an unchecked article. Closing an escalation unblocks a later daily attempt; PR comments are not automatically used as editor input.

## Feature list, title index and duplicate audit

Track pipeline ideas in [FEATURE-TODO.md](FEATURE-TODO.md). The minimal title index lives
in `publication/title-index.json`, with title, slug, date and article-data path. `--build`
refreshes it from committed `publication/articles/*.json`; CI checks it stays current.
Each proposal independently rebuilds its input index from article data, saving the exact
snapshot as `.publication-run/title-index.json`. A stale committed index cannot bypass a check.

Before writing, `choose_topic.topic` is compared to indexed titles. Matches use identical
normalized word sets, word-set overlap above 0.6, or text similarity above 0.85. Topic
choices rejected as duplicates consume the existing topic allowance. The editor can choose
a distinct topic or escalate; the topic angle alone does not override a match. Existing
slug/title/body draft gates still apply. These are potential-duplication heuristics, not
semantic proof: different wording can evade them, and legitimate follow-ups may be blocked.
Review examples before changing thresholds or adding semantic matching.

Every deterministic duplicate rejection appends to `.publication-run/rejections.jsonl`:
UTC time, date, run ID (`GITHUB_RUN_ID-GITHUB_RUN_ATTEMPT`, or a local UUID), step, stage,
proposal, reason code, and matched article identity. `editor.json` retains the match and
feedback. Factual reviewer issues remain in `review.json`; they are not reclassified as
deterministic title matches. `run.json` reports the same run ID, indexed article count,
duplicate rejection count and final outcome, including failures and escalations.

In Actions, an always-run audit step saves one immutable bundle per generated run at
`publication/proposal-runs/<run-id>.json` on the **moon-journal-audit** branch. The bundle
contains run status, the exact title index and rejection events. That branch is created
on first use from the workflow commit; it is never merged into production or used to publish.
The workflow summary links to each saved bundle. Inspect the branch's file list/history
to review older rejected topics even after the 30-day artifacts expire. Runs without
rejections still get a bundle, including already-published and failed runs. Queue skips
and branch recovery report their status in the summary and perform no generation.

Audit writes use the existing workflow token and concurrency group. Read/authentication
or persistence failures fail the job visibly; evidence artifacts still upload. Run records
are create-only, never silently replaced. If persistence fails, preserve the artifact and
resolve the failure before rerunning paid generation. Local runs only write the ignored
output directory; they do not write GitHub audit history. No new service, model call,
spending limit, automatic merge or deployment is introduced.
