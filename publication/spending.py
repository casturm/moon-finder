"""Durable pre-call budget reservations. Costs are estimates, not provider invoices."""
import base64
import datetime as dt
from decimal import Decimal
import json
import os
from pathlib import Path
import urllib.request
import urllib.error
import uuid

class BudgetStop(ValueError):
    """A pre-call control blocked spending; do not retry automatically."""


CONFIG = Path(__file__).with_name('spending.json')
BRANCH = 'moon-journal-ledger'


def money(value):
    number = Decimal(str(value))
    if not number.is_finite() or number < 0: raise ValueError('Expected finite, nonnegative amount')
    return number


def config(path=CONFIG):
    data = json.loads(Path(path).read_text())
    for key in ('total_usd', 'daily_usd', 'run_usd'):
        if os.environ.get('MOON_' + key.upper()):
            data['limits'][key] = os.environ['MOON_' + key.upper()]
    if data['currency'] != 'USD': raise ValueError('Only USD supported')
    for key in ('total_usd', 'daily_usd', 'run_usd'): money(data['limits'][key])
    for key in ('daily_calls', 'run_calls', 'daily_tokens', 'max_input_tokens', 'max_output_tokens'):
        if type(data['limits'][key]) is not int or data['limits'][key] < 0:
            raise ValueError('Invalid integer limit')
    for rates in data['models'].values():
        for key in ('input', 'cached_input', 'output', 'reservation_input'): money(rates[key])
        money(rates.get('cache_write', rates['reservation_input']))
        if money(rates['reservation_input']) < max(money(rates['input']), money(rates['cached_input']),
                                                  money(rates.get('cache_write', rates['reservation_input']))):
            raise ValueError('Reservation rate must cover input rates')
    return data


def cost(usage, rates):
    incoming, outgoing = usage['input_tokens'], usage['output_tokens']
    details = usage.get('input_tokens_details', {})
    cached = details.get('cached_tokens', 0)
    writes = details.get('cache_write_tokens', 0)
    if any(type(n) is not int or n < 0 for n in (incoming, outgoing, cached, writes)) or cached + writes > incoming:
        raise ValueError('Invalid token usage')
    return ((incoming-cached-writes)*money(rates['input']) + cached*money(rates['cached_input'])
            + writes*money(rates.get('cache_write', rates['reservation_input']))
            + outgoing*money(rates['output'])) / 1000000


def charged(entry):
    return money(entry['cost_usd'] if entry['state'] == 'settled' else entry['reserved_usd'])


class LocalStore:
    """Explicit local ledger. Lock held across read/modify/write; never recreated silently."""
    def __init__(self, path): self.path = Path(path)
    def change(self, action):
        import fcntl
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.with_suffix('.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            data = json.loads(self.path.read_text())
            result = action(data)
            temp = self.path.with_suffix('.tmp')
            temp.write_text(json.dumps(data, indent=2) + '\n'); temp.replace(self.path)
            return result
    def read(self): return json.loads(self.path.read_text())


class GitHubStore:
    """Contents API SHA compare-and-swap; missing history/errors stop paid work."""
    def __init__(self):
        self.repo = os.environ['GITHUB_REPOSITORY']; self.token = os.environ['GH_TOKEN']
        self.route = f'/repos/{self.repo}/contents/usage.json'
        self.trace_path = Path('.publication-run/ledger-diagnostics.jsonl')
        self.session_id = str(uuid.uuid4())
        self.last_write = self.last_read = None

    def trace(self, event, **fields):
        # Allowlisted metadata only: never log tokens, headers wholesale, or ledger contents.
        record = {'time': dt.datetime.now(dt.timezone.utc).isoformat(),
                  'session_id': self.session_id, 'run_id': os.environ.get('GITHUB_RUN_ID'),
                  'run_attempt': os.environ.get('GITHUB_RUN_ATTEMPT'), 'event': event, **fields}
        self.trace_path.parent.mkdir(parents=True, exist_ok=True)
        with self.trace_path.open('a') as stream:
            stream.write(json.dumps(record) + '\n')

    def api(self, path, body=None, method=None):
        request = urllib.request.Request('https://api.github.com' + path,
            data=None if body is None else json.dumps(body).encode(), method=method,
            headers={'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json',
                     'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28'})
        started = dt.datetime.now(dt.timezone.utc).isoformat()
        metadata = {'started': started, 'method': request.get_method(), 'path': path}
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                metadata.update(status=response.status,
                    request_id=response.headers.get('X-GitHub-Request-Id'),
                    etag=response.headers.get('ETag'), server_date=response.headers.get('Date'))
                data = json.load(response)
        except Exception as error:
            # Error text/bodies may contain sensitive data; record only type and safe headers.
            if isinstance(error, urllib.error.HTTPError):
                metadata.update(status=error.code,
                    request_id=error.headers.get('X-GitHub-Request-Id'))
            self.trace('api_error', **metadata, error_type=type(error).__name__)
            raise
        if path.startswith(self.route):
            if request.get_method() == 'GET':
                self.last_read = {'file_sha': data.get('sha'), **metadata}
                self.trace('ledger_read', **self.last_read, last_acknowledged_write=self.last_write)
            else:
                self.last_write = {'file_sha': (data.get('content') or {}).get('sha'),
                    'commit_sha': (data.get('commit') or {}).get('sha'), **metadata}
                self.trace('ledger_write_acknowledged', **self.last_write,
                           previous_file_sha=(body or {}).get('sha'))
        else:
            self.trace('api_response', **metadata)
        return data
    def read_file(self):
        obj = self.api(self.route + '?ref=' + BRANCH)
        return json.loads(base64.b64decode(obj['content'])), obj['sha']
    def read(self): return self.read_file()[0]
    def change(self, action):
        data, sha = self.read_file(); result = action(data)
        self.api(self.route, {'branch': BRANCH, 'sha': sha, 'message': 'Record Moon Journal API budget activity',
            'content': base64.b64encode((json.dumps(data, indent=2)+'\n').encode()).decode()}, 'PUT')
        return result
    def initialize(self):
        # Explicit initialization only. An existing branch is never reset.
        repo = self.api(f'/repos/{self.repo}')
        head = self.api(f'/repos/{self.repo}/git/ref/heads/' + repo['default_branch'])
        self.api(f'/repos/{self.repo}/git/refs', {'ref': 'refs/heads/' + BRANCH, 'sha': head['object']['sha']}, 'POST')
        self.api(self.route, {'branch': BRANCH, 'message': 'Initialize Moon Journal spending ledger',
            'content': base64.b64encode(b'{"version":1,"entries":[]}\n').decode()}, 'PUT')


class Budget:
    def __init__(self, store, settings, run_id):
        self.store, self.settings, self.run_id = store, settings, run_id
    def reserve(self, model, stage, input_bound, output_bound):
        if type(input_bound) is not int or input_bound < 0 or type(output_bound) is not int or output_bound <= 0:
            raise BudgetStop('Invalid request token bounds')
        if model not in self.settings['models']: raise BudgetStop('Model has no reviewed pricing')
        rates = self.settings['models'][model]; limits = self.settings['limits']
        if input_bound > limits['max_input_tokens'] or output_bound > limits['max_output_tokens']:
            raise BudgetStop('Per-call token limit exceeded')
        amount = (input_bound*money(rates['reservation_input']) + output_bound*money(rates['output']))/1000000
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        entry = {'id': str(uuid.uuid4()), 'run_id': self.run_id, 'time': now, 'stage': stage,
                 'model': model, 'rates': rates.copy(), 'pricing_checked': self.settings['pricing_checked'],
                 'input_bound': input_bound, 'output_bound': output_bound,
                 'reserved_usd': str(amount), 'state': 'reserved'}
        def add(data):
            if data.get('version') != 1: raise BudgetStop('Unknown ledger version')
            entries = data['entries']
            unresolved = [e for e in entries if e['state'] != 'settled']
            if unresolved:
                if isinstance(self.store, GitHubStore):
                    self.store.trace('reservation_blocked', stage=stage,
                        blocking_reservations=[{'id': e['id'], 'state': e['state'],
                                                'run_id': e.get('run_id')} for e in unresolved],
                        ledger_read=self.store.last_read,
                        last_acknowledged_write=self.store.last_write)
                raise BudgetStop('Unresolved API reservation; reconcile before spending again')
            daily = [e for e in entries if e['time'][:10] == now[:10]]
            run = [e for e in entries if e['run_id'] == self.run_id]
            for scope, items in (('total', entries), ('daily', daily), ('run', run)):
                if sum((charged(e) for e in items), Decimal(0)) + amount > money(limits[scope+'_usd']):
                    raise BudgetStop(scope + ' spending limit reached')
            if len(daily) >= limits['daily_calls'] or len(run) >= limits['run_calls']:
                raise BudgetStop('Call count limit reached')
            tokens = sum(e['usage']['input_tokens'] + e['usage']['output_tokens'] for e in daily)
            if tokens + input_bound + output_bound > limits['daily_tokens']:
                raise BudgetStop('Daily token limit reached')
            entries.append(entry)
        self.store.change(add)  # Must durably succeed BEFORE sending to OpenAI.
        return entry['id']
    def settle(self, reservation, response):
        def update(data):
            entry = next(e for e in data['entries'] if e['id'] == reservation)
            if entry['state'] != 'reserved': raise ValueError('Reservation already settled')
            usage = response['usage']; amount = cost(usage, entry['rates'])
            if usage['input_tokens'] > entry['input_bound'] or usage['output_tokens'] > entry['output_bound']:
                raise ValueError('Usage exceeded reservation; reconcile manually')
            if amount > money(entry['reserved_usd']): raise ValueError('Cost exceeded reservation')
            entry.update(state='settled', usage=usage, cost_usd=str(amount), response_id=response.get('id'),
                         response_model=response.get('model'), response_status=response.get('status'),
                         incomplete_details=response.get('incomplete_details'))
        self.store.change(update)
    def reconcile(self, reservation, usage, note, billed_usd=None):
        if len(note.strip()) < 10: raise ValueError('Reconciliation requires an audit note')
        def update(data):
            entry = next(e for e in data['entries'] if e['id'] == reservation)
            estimated = cost(usage, entry['rates'])
            amount = estimated if billed_usd is None else money(billed_usd)
            entry.setdefault('reconciliations', []).append({'previous_state': entry['state'],
                'previous_cost_usd': entry.get('cost_usd'), 'note': note,
                'time': dt.datetime.now(dt.timezone.utc).isoformat()})
            entry.update(state='settled', usage=usage, cost_usd=str(amount),
                         cost_basis='token-estimate' if billed_usd is None else 'provider-reconciled')
        self.store.change(update)


def store_from_env():
    if os.environ.get('GITHUB_ACTIONS') == 'true' or os.environ.get('MOON_LEDGER_REMOTE') == 'true': return GitHubStore()
    return LocalStore(os.environ.get('MOON_LEDGER_PATH', str(Path(__file__).resolve().parents[1] / '.publication-ledger.json')))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(); parser.add_argument('action', choices=['init', 'export', 'reconcile'])
    parser.add_argument('--out', type=Path, default=Path('.publication-run'))
    parser.add_argument('--billed-usd'); parser.add_argument('--id'); parser.add_argument('--usage', type=Path); parser.add_argument('--note')
    args = parser.parse_args(); store = store_from_env()
    if args.action == 'init':
        if isinstance(store, GitHubStore): store.initialize()
        else:
            with store.path.open('x') as f: f.write('{"version":1,"entries":[]}\n')
    elif args.action == 'reconcile':
        Budget(store, config(), 'reconciliation').reconcile(args.id, json.loads(args.usage.read_text()), args.note or '', args.billed_usd)
    else:
        args.out.mkdir(parents=True, exist_ok=True)
        snapshot_ledger = store.read()
        (args.out / 'ledger.json').write_text(json.dumps(snapshot_ledger, indent=2))
        (args.out / 'spending.json').write_text(json.dumps(config(), indent=2))
        import shutil
        for name in ('dashboard.html', 'dashboard.js', 'dashboard.css'):
            shutil.copyfile(Path(__file__).with_name(name), args.out / name)
        snapshot = json.dumps({'ledger': snapshot_ledger, 'settings': config(),
            'generated': dt.datetime.now(dt.timezone.utc).isoformat()}).replace('<', '\\u003c')
        target = args.out / 'dashboard.html'
        target.write_text(target.read_text().replace('<script id="bootstrap" type="application/json">{}</script>',
            '<script id="bootstrap" type="application/json">' + snapshot + '</script>'))

        entries = snapshot_ledger['entries']
        spent = sum((charged(e) for e in entries if e['state'] == 'settled'), Decimal(0))
        held = sum((charged(e) for e in entries if e['state'] != 'settled'), Decimal(0))
        tokens = sum(e.get('usage', {}).get('input_tokens', 0) + e.get('usage', {}).get('output_tokens', 0) for e in entries)
        (args.out / 'spending-summary.md').write_text(
            f"### Moon Journal API spending\n\nEstimated spend: ${spent:.6f} · Held: ${held:.6f}\n\n"
            f"Calls: {len(entries)} · Reported tokens: {tokens:,} · Total limit: ${config()['limits']['total_usd']}\n\n"
            "Download the workflow artifact and open dashboard.html for daily/model charts and settings. "
            "Estimates exclude taxes and unrelated account usage; provider billing is authoritative.\n")
