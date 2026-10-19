# Spending ledger and dashboard

## What you can see

The dashboard shows estimated spend, held reservations, total budget remaining, calls, input/cached/output tokens, model pricing, daily and cumulative spending, model filters and a per-call ledger. CSV export supports external analysis. This is a snapshot, not a live account billing dashboard. Prices are saved with each call so changing a model or its configured price never reprices history.

Initial limits: $5 for the whole experiment, $0.20 per UTC day, $0.20 per run, three calls per day and run, 400,000 tokens per day, 128,000 input tokens and 3,500 output tokens per call. Zero spending limits stop all new paid calls. Limits apply to this publication, not unrelated API use, hosting or taxes. These are guards based on conservative reservations and recorded prices, not a provider billing guarantee. Standard text service is explicitly requested; price changes and invoice adjustments require reconciliation.

Rates checked October 18, 2026 against [official OpenAI pricing](https://developers.openai.com/api/docs/pricing): GPT-6 Luna $0.10 input / $0.01 cached input / $0.50 output per million tokens; GPT-6.1 Sol $2.00 / $0.10 / $10.00. Input reservation rates also cover the listed cache-write rates. These entries are pricing options, not an assertion that either model has been tested for article quality or is accessible to this account. Select the model explicitly with MOON_MODEL. Add reviewed prices for another model before it can run. Recheck rates before activation. Large input requests for a more expensive model may be blocked by the daily budget.

## Storage and failure handling

Actions reads and writes usage.json on the separate moon-journal-ledger branch through GitHub's Contents API. SHA checks reject concurrent writes. Paid article work never modifies main for accounting. Missing state is an error, never an automatic reset. Daily and spending-report workflows share one concurrency group. Ledger metadata has the repository's visibility (currently public); it includes model, usage, prices, stage, time, run and response IDs, but no API keys or source content. Never delete/reset this branch to resume a budget.

Before a request, the pipeline persists its maximum estimated liability using the prompt's UTF-8 bytes plus 1,024 overhead tokens and the output cap. This deliberately overestimates normal text input. The input byte bound must fit the configured cap. Successful usage replaces the reservation immediately, even if model output is incomplete, refused or later fails article validation. A timeout, missing usage or failed ledger write leaves the reservation held and blocks all further paid calls until reconciliation. If settlement fails, the run report preserves known response IDs and usage for recovery. This favors stopping over undercounting. The local JSON store uses a lock and atomic replacement. No retries send duplicate paid requests.

## Activate after code/integration approval

1. Merge/deploy only after the existing separate approval gates.
2. Run **Moon Journal spending report** from Actions, choosing **initialize** once. It creates the ledger branch and empty history. Repeating initialization refuses to reset history. If initialization is interrupted between branch and file creation, repair the missing file explicitly before using the ledger.
3. Run it with **export** whenever you want a fresh snapshot. Download and extract the workflow artifact; open dashboard.html beside dashboard.js and dashboard.css. No web server or API key is required to view it. The daily workflow exports the same dashboard even after most failures.
4. Set the API key and approved model; run the first article manually before enabling daily publishing. An unresolved reservation must be reconciled before resuming. The exporter writes a spending summary in the Actions run summary.

## Change limits

Use the dashboard's budget form and **Download settings for review**. Replace publication/spending.json through a reviewed PR and merge it after approval. The dashboard clearly reports that an export does not change live settings. Its snapshot remains unchanged until you generate a new report.

For quick USD changes, use repository Actions variables MOON_TOTAL_USD, MOON_DAILY_USD and MOON_RUN_USD. Nonempty values override the file; an unset/empty variable uses the file. Setting MOON_TOTAL_USD to 0 stops new calls. Other token/call limits use the reviewed file. A run snapshots settings when it starts; changing variables does not interrupt an already in-flight API call. Keep provider budget alerts configured too.

## Local tests and reconciliation

For offline/local work, initialize once with `python3 publication/spending.py init`, then use `python3 publication/spending.py export`. The default local ledger is .publication-ledger.json, excluded from Git. Never delete it to reset spend. Local ledgers and the Actions ledger are separate: to include a local paid test in the same experiment ledger, set MOON_LEDGER_REMOTE=true, GITHUB_REPOSITORY and GH_TOKEN to use the same remote state. Do not run concurrent local/Actions paid experiments.

To reconcile a held request, first verify usage or zero billing with the provider. Supply a usage JSON file containing input_tokens, output_tokens and optional input_tokens_details.cached_tokens. Run:

```
python3 publication/spending.py reconcile --id RESERVATION_ID --usage verified-usage.json --note 'Verified against provider usage for this request'
```

Optional `--billed-usd AMOUNT` records a verified provider dollar charge instead of the saved-rate estimate. Use the same remote environment as above for the Actions ledger. This preserves an audit note, previous state/cost and timestamp. Do not release a timeout hold solely because the client did not receive a response. Reconciled charges can exceed a limit; the next request will then be blocked. This version supports manual billing reconciliation, not automatic access to account-wide invoices or admin billing credentials.
