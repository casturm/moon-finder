# Bounded Moon Journal editor

The editor receives a goal: prepare one worthwhile, original, well-supported evergreen Moon article for human review. After every result it chooses the next action. The application executes that action and returns feedback; it does not prescribe an obligatory sequence.

| Action | What happens | Code-enforced condition |
| --- | --- | --- |
| choose_topic | Editor selects an angle, or replaces a weak topic | At most two choices; citations must already be retrieved |
| research | Retrieve more evidence | Unvisited URLs only, drawn from seven approved NASA pages; at most three extra fetches |
| draft | Ask a writer to produce an article | A topic is required; all article/citation/duplicate checks apply |
| revise | Ask the writer to address explicit feedback | At most two revisions; prior check is invalidated |
| check | Make a fresh independent review call | Exact evidence quotes and every-paragraph coverage still required |
| submit | Prepare article.json for the existing human PR gate | Successful review of the exact current draft and evidence required |
| escalate | Ask a specific question requiring human input | Creates escalation.json; never produces article.json |

Editor decisions, writing and review are metered model calls. A normal first pass uses approximately six calls; a revise/recheck pass can use approximately ten. Not every action adds a model call beyond the editor decision: research retrieves a page without a second model call. Eight editor decisions, 12 model calls/day and run, two topic choices/revisions, three extra research fetches, 400,000 daily tokens and $0.20/day/run prevent open-ended loops. The total experiment limit remains $5. Existing calls in the UTC day still count. All limits are checked in code before paid requests; the model can see remaining calls and dollars but cannot change them.

Budget exhaustion or the decision ceiling triggers a deterministic escalation even if the model fails to ask. API errors with unresolved reservations and storage failures still stop the job, preserving accounting. There are no automatic retries of uncertain requests. An incomplete but accounted response can become feedback for a later editor decision, within the same limits.

A successful result creates the usual draft article PR. An escalation creates a draft PR containing publication/escalations/YYYY-MM-DD.json with the question, feedback and brief action history. The PR describes which kind of result it contains. No article is published from an escalation. Open article or escalation PRs pause future daily generation. For an escalation, inspect the artifact and resolve the question by updating reviewed sources/configuration or deciding what should change, then close the escalation PR before a later attempt. PR comments are not automatically ingested; resuming the same run from a human reply is not yet implemented.

Artifacts include the latest draft/review, draft versions, evidence, each decision's arguments, concise reasons/results, spending ledger and run outcome. These are action summaries, not private chain-of-thought. Every draft or evidence change invalidates its previous passing check. There is no path for the editor to waive fact checking or human approval. Rejection and quote mismatch remain feedback to fix, not permission to lower the gate.

This is a small application-owned agent loop using JSON action decisions and deterministic tool dispatch, without an agent framework. Research is bounded retrieval from a curated NASA catalog, not unrestricted web search or live news discovery. The independent checker is still a model and can miss errors; the human PR review remains essential.

Validation: 63 offline tests cover successful and revised submissions, stale-check rejection, unapproved research, malformed decisions, topic/research limits, budget stops and API-error behavior. Both new catalog pages were fetched through the real retrieval code. No paid editor run has been executed. Review and merge this change before authorizing a live test.
