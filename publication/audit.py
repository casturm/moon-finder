"""Persist one immutable proposal run bundle on a separate, non-publishing branch."""
import base64
import json
import os
from pathlib import Path
import re
import subprocess

BRANCH = 'moon-journal-audit'


def api(method, route, body=None):
    args = ['gh', 'api', '--method', method, route]
    if body is not None:
        args += ['--input', '-']
    result = subprocess.run(args, input=None if body is None else json.dumps(body),
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def persist(out, repo, sha, request=api):
    out = Path(out)
    if not (out / 'run.json').exists():
        return None  # Preflight skipped generation; there is no proposal run.
    report = json.loads((out / 'run.json').read_text())
    run_id = report['run_id']
    if not re.fullmatch(r'[A-Za-z0-9-]+', run_id):
        raise ValueError('Invalid audit run identifier')
    bundle = {'run': report,
              'title_index': json.loads((out / 'title-index.json').read_text()) if (out / 'title-index.json').exists() else [],
              'rejections': [json.loads(line) for line in (out / 'rejections.jsonl').read_text().splitlines()]}
    # List refs instead of interpreting authentication/network failures as a missing branch.
    refs = request('GET', f'repos/{repo}/git/matching-refs/heads/{BRANCH}')
    if not any(ref['ref'] == 'refs/heads/' + BRANCH for ref in refs):
        request('POST', f'repos/{repo}/git/refs', {'ref': 'refs/heads/' + BRANCH, 'sha': sha})
    content = base64.b64encode((json.dumps(bundle, indent=2) + '\n').encode()).decode()
    # No SHA supplied: an existing run file cannot be overwritten by this operation.
    result = request('PUT', f'repos/{repo}/contents/publication/proposal-runs/{run_id}.json',
                     {'branch': BRANCH, 'message': 'Audit Moon Journal run ' + run_id, 'content': content})
    return result['content']['html_url']


if __name__ == '__main__':
    try:
        url = persist('.publication-run', os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_SHA'])
    except Exception:
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('\nProposal audit persistence FAILED. Inspect the workflow artifact before rerunning.\n')
        raise
    if url:
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('\nPersistent proposal audit: ' + url + '\n')
