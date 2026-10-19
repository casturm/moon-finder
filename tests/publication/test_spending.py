import copy
from decimal import Decimal
import importlib.util
import json
import io
import urllib.error
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from publication.spending import Budget, LocalStore, GitHubStore, config, cost

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('metered_pipeline', ROOT / 'publication/pipeline.py')
pipeline = importlib.util.module_from_spec(spec); spec.loader.exec_module(pipeline)

class Spending(unittest.TestCase):
    def setUp(self):
        environment = patch.dict(os.environ, {'GITHUB_ACTIONS':'false','MOON_LEDGER_REMOTE':'false',
            'MOON_TOTAL_USD':'','MOON_DAILY_USD':'','MOON_RUN_USD':''})
        environment.start(); self.addCleanup(environment.stop)
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'ledger.json'
        self.path.write_text('{"version":1,"entries":[]}')
        self.store = LocalStore(self.path); self.settings = config()
        self.budget = Budget(self.store, self.settings, 'test-run'); self.model = 'gpt-6-luna'
    def reserve(self): return self.budget.reserve(self.model, 'write', 10000, 3500)
    def response(self): return {'usage': {'input_tokens':1000,'output_tokens':200,
        'input_tokens_details':{'cached_tokens':500}}, 'id':'response-test', 'model':self.model, 'status':'completed'}
    def test_cached_tokens_billed_once(self):
        self.assertEqual(cost(self.response()['usage'], self.settings['models'][self.model]), Decimal('0.000155'))
    def test_reserve_persisted_and_settled(self):
        key = self.reserve(); self.assertEqual(self.store.read()['entries'][0]['state'], 'reserved')
        self.budget.settle(key,self.response()); e=self.store.read()['entries'][0]
        self.assertEqual(e['state'],'settled');self.assertEqual(Decimal(e['cost_usd']),Decimal('0.000155'))
    def test_uncertain_request_blocks_next_run(self):
        self.reserve()
        with self.assertRaisesRegex(ValueError,'Unresolved'): Budget(LocalStore(self.path),self.settings,'new-run').reserve(self.model,'select',100,100)
    def test_total_limit(self):
        self.settings['limits']['total_usd']='0'
        with self.assertRaisesRegex(ValueError,'total spending'): self.reserve()
        self.assertEqual(self.store.read()['entries'],[])
    def test_daily_limit(self):
        self.settings['limits']['daily_usd']='0'
        with self.assertRaisesRegex(ValueError,'daily spending'):self.reserve()
    def test_run_limit(self):
        self.settings['limits']['run_usd']='0'
        with self.assertRaisesRegex(ValueError,'run spending'):self.reserve()
    def test_call_count_across_runs(self):
        self.budget.settle(self.reserve(),self.response());self.settings['limits']['daily_calls']=1
        with self.assertRaisesRegex(ValueError,'Call count'): Budget(self.store,self.settings,'next-run').reserve(self.model,'select',100,100)
    def test_token_limit(self):
        self.settings['limits']['daily_tokens']=100
        with self.assertRaisesRegex(ValueError,'Daily token'):self.reserve()
    def test_unpriced_model(self):
        with self.assertRaisesRegex(ValueError,'pricing'):self.budget.reserve('expensive-unknown','select',100,100)
    def test_reconcile_keeps_audit(self):
        key=self.reserve();self.budget.reconcile(key,self.response()['usage'],'Verified provider response usage')
        self.assertTrue(self.store.read()['entries'][0]['reconciliations'])
    def test_missing_history_does_not_reset(self):
        self.path.unlink()
        with self.assertRaises(FileNotFoundError):self.reserve()
    def test_missing_usage_keeps_reservation(self):
        key=self.reserve()
        with self.assertRaises(KeyError):self.budget.settle(key,{'id':'no-usage'})
        self.assertEqual(self.store.read()['entries'][0]['state'],'reserved')
    def test_invalid_usage(self):
        with self.assertRaises(ValueError):cost({'input_tokens':1,'output_tokens':-1},self.settings['models'][self.model])
    def test_git_conflict_is_not_retried(self):
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'test/repo','GH_TOKEN':'fake'}): store=GitHubStore()
        with patch.object(store,'read_file',return_value=({'version':1,'entries':[]},'old-sha')),patch.object(store,'api',side_effect=RuntimeError('conflict')) as api:
            with self.assertRaisesRegex(RuntimeError,'conflict'):Budget(store,self.settings,'run').reserve(self.model,'select',100,100)
            self.assertEqual(api.call_count,1)
    def test_api_not_called_if_reservation_fails(self):
        report={'calls':[]}
        with patch.dict(os.environ,{'MOON_MODEL':self.model,'OPENAI_API_KEY':'fake','MOON_LEDGER_PATH':str(self.path),'MOON_TOTAL_USD':'0'}):
            model=pipeline.Model(report)
            with patch.object(pipeline.urllib.request,'urlopen') as http:
                with self.assertRaisesRegex(ValueError,'total spending'):model.ask('Select.',{})
                http.assert_not_called()
    def test_network_timeout_leaves_durable_hold(self):
        report={'calls':[]}
        with patch.dict(os.environ,{'MOON_MODEL':self.model,'OPENAI_API_KEY':'fake','MOON_LEDGER_PATH':str(self.path)}):
            model=pipeline.Model(report)
            with patch.object(pipeline.urllib.request,'urlopen',side_effect=TimeoutError):
                with self.assertRaises(TimeoutError):model.ask('Select.',{})
        self.assertEqual(self.store.read()['entries'][0]['state'],'reserved')

    def test_incomplete_model_response_is_still_accounted(self):
        response=self.response();response.update(status='incomplete',output=[])
        report={'calls':[]}
        with patch.dict(os.environ,{'MOON_MODEL':self.model,'OPENAI_API_KEY':'fake','MOON_LEDGER_PATH':str(self.path)}):
            model=pipeline.Model(report)
            with patch.object(pipeline.urllib.request,'urlopen',return_value=io.BytesIO(json.dumps(response).encode())):
                with self.assertRaisesRegex(ValueError,'Incomplete'):model.ask('Select.',{})
        self.assertEqual(self.store.read()['entries'][0]['state'],'settled')
    def test_settlement_failure_keeps_response_usage_for_reconciliation(self):
        response=self.response();report={'calls':[]}
        with patch.dict(os.environ,{'MOON_MODEL':self.model,'OPENAI_API_KEY':'fake','MOON_LEDGER_PATH':str(self.path)}):
            model=pipeline.Model(report)
            with patch.object(model.budget,'settle',side_effect=RuntimeError('storage failure')):
                with patch.object(pipeline.urllib.request,'urlopen',return_value=io.BytesIO(json.dumps(response).encode())):
                    with self.assertRaises(RuntimeError):model.ask('Select.',{})
        self.assertEqual(report['calls'][0]['usage'],response['usage'])
        self.assertEqual(self.store.read()['entries'][0]['state'],'reserved')
    def test_empty_workflow_overrides_preserve_file(self):
        with patch.dict(os.environ,{'MOON_TOTAL_USD':'','MOON_DAILY_USD':'','MOON_RUN_USD':''}):
            self.assertEqual(config()['limits']['total_usd'],'5.00')
    def test_invalid_limit_rejected(self):
        with patch.dict(os.environ,{'MOON_TOTAL_USD':'NaN'}):
            with self.assertRaises(ValueError):config()
    def test_daily_limit_resets_but_total_does_not(self):
        self.budget.settle(self.reserve(),self.response())
        self.store.change(lambda d:d['entries'][0].update(time='2000-01-01T00:00:00+00:00'))
        self.settings['limits']['daily_calls']=1
        self.reserve()
    def test_run_call_limit(self):
        self.budget.settle(self.reserve(),self.response());self.settings['limits']['run_calls']=1
        with self.assertRaisesRegex(ValueError,'Call count'):self.reserve()

    def test_http_error_reports_parameter_and_redacts_secret(self):
        report={'calls':[]};secret='sk-fake-secret-do-not-log'
        error=urllib.error.HTTPError('https://api.openai.com/v1/responses',400,'Bad Request',{},
            io.BytesIO(json.dumps({'error':{'message':'Unsupported parameter example '+secret,
                'code':'unsupported_parameter','param':'example','type':'invalid_request_error'}}).encode()))
        with patch.dict(os.environ,{'MOON_MODEL':self.model,'OPENAI_API_KEY':secret,'MOON_LEDGER_PATH':str(self.path)}):
            model=pipeline.Model(report)
            with patch.object(pipeline.urllib.request,'urlopen',side_effect=error):
                with self.assertRaisesRegex(ValueError,'Unsupported parameter'):model.ask('Select.',{})
        diagnostic=report['calls'][0]['api_error']
        self.assertEqual(diagnostic['param'],'example');self.assertNotIn(secret,json.dumps(report))
        self.assertEqual(self.store.read()['entries'][0]['state'],'reserved')
    def test_non_json_error_does_not_dump_html(self):
        report={'calls':[]}
        error=urllib.error.HTTPError('https://api.openai.com/v1/responses',502,'Gateway',{},io.BytesIO(b'<html>private proxy details</html>'))
        with patch.dict(os.environ,{'MOON_MODEL':self.model,'OPENAI_API_KEY':'fake','MOON_LEDGER_PATH':str(self.path)}):
            model=pipeline.Model(report)
            with patch.object(pipeline.urllib.request,'urlopen',side_effect=error):
                with self.assertRaisesRegex(ValueError,'OpenAI HTTP 502'):model.ask('Select.',{})
        self.assertNotIn('private proxy details',json.dumps(report))
