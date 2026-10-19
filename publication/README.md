# Moon Journal: review-first 30-day experiment

## Architecture

GitHub Actions → retrieve curated NASA pages → topic selector → writer → independent fact-check prompt → deterministic citation, evidence and duplicate gates → artifact + draft PR → human editorial review and merge → existing GitHub Pages hosting.

The app remains at `/moon-finder/`; the publication is `/moon-finder/journal/` and links to the app. No app files or existing hosting settings change. An app-to-journal navigation link can be reviewed separately. No backend, database, framework, paid search service or automatic merge. This first version researches a bounded evergreen source library, not live news. Add reviewed NASA/ESA sources and feed discovery after evaluating quality. The selector chooses its own angle; there is no 30-topic calendar.

## Experiment and acceptance criteria

- Days 1–3: manually run, inspect evidence and approve the first articles. Resolve source availability and model compatibility.
- Days 4–10: enable daily proposals; record review minutes, unsupported claims, duplication, failures and token usage.
- Days 11–20: adjust prompts/source library if topics repeat. Add news discovery only with date verification and attribution checks.
- Days 21–30: assess usefulness and whether the archive earns repeat visits. Curate categories. Decide whether to continue with human approval.

Target: up to 30 approved original articles, zero known unsupported claims, useful variety, under five minutes of review per article. One proposal per UTC date, not a guarantee of one published article: fail closed on poor sources or failed checks. Stop after 30 merged articles. Pause by setting `MOON_JOURNAL_ENABLED=false`. Scheduled Actions can be delayed or disabled by GitHub; this is best effort. There is no catch-up burst.

## Approval and activation

Implementation is local on `codex/moon-journal`. Requirements, tests, diff, integration and deployment remain separate approval gates per AGENTS.md. Nothing has been pushed or deployed.

After reviewing and approving public changes:

1. Push the review branch and open an implementation PR; review the diff and test report.
2. Approve integration/deployment explicitly before merging. Verify the existing Pages branch/source configuration actually serves `/journal/`.
3. Configure a dedicated low-spend OpenAI project key as secret `MOON_OPENAI_API_KEY`. Set `MOON_MODEL` to an available inexpensive model supporting Responses JSON mode. Model is explicit to avoid silently choosing a paid model.
4. Set provider spending controls/alerts. Use a target budget of $5 for the experiment, not a promise: no price assumptions are embedded here. The code limits to 3 calls/run, 3,500 output tokens/call, five bounded source fetches, no retries, and 30 merged articles. Failed/unmerged days can still cost money; token caps are not a dollar spending limit.
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

Nine offline tests cover accepted/rejected drafts, citation failures, duplicate detection, unsafe source hosts, path traversal and escaped HTML. Live API/model behavior, source accessibility and GitHub workflow/Pages integration remain unverified. A separate model call is not independent scientific verification; it can miss claims or agree with the writer. Human review is mandatory. Word-overlap deduplication is heuristic; the topic selector and checker also see the archive. The NASA-only seed collection limits topic breadth and independent corroboration. Do not label this a news service yet. No images or ads are included.

The API uses the official [Responses structured output guidance](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses); local validation rejects malformed/incomplete JSON and unsupported citations. Prompts and source pages never become shell commands. Source retrieval permits only the curated HTTPS NASA host, rejects redirects and bounds response size.
