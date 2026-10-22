import copy
import importlib.util
import json
import os
import subprocess
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('pipeline', Path(__file__).resolve().parents[2] / 'publication/pipeline.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
URL = p.SOURCES[0]
ARTICLE = {'slug': 'why-the-moon-changes', 'title': 'Why the Moon changes shape', 'category': 'science',
           'date': '2026-10-19', 'paragraphs': [{'text': 'Moon facts explained clearly. ' * 25, 'sources': [URL]} for _ in range(3)]}

class Gates(unittest.TestCase):
    def test_valid(self): p.validate(ARTICLE, [{'url': URL}], [])
    def test_missing_citation(self):
        a = copy.deepcopy(ARTICLE); a['paragraphs'][0]['sources'] = []
        with self.assertRaises(ValueError): p.validate(a, [{'url': URL}], [])
    def test_fabricated_url(self):
        with self.assertRaises(ValueError): p.validate(ARTICLE, [{'url': 'https://example.com'}], [])
    def test_duplicate(self):
        with self.assertRaises(ValueError): p.validate(ARTICLE, [{'url': URL}], [ARTICLE])
    def test_path_traversal(self):
        a = copy.deepcopy(ARTICLE); a['slug'] = '../../index'
        with self.assertRaises(ValueError): p.validate(a, [{'url': URL}], [])
    def test_host_restriction(self):
        for url in ['http://science.nasa.gov/', 'https://science.nasa.gov.evil.test/', 'https://127.0.0.1/']:
            with self.assertRaises(ValueError): p.fetch(url)
    def test_escaped_output(self):
        a = copy.deepcopy(ARTICLE); a['title'] = '<script>alert(1)</script>'
        with tempfile.TemporaryDirectory() as d:
            p.render([a], Path(d))
            self.assertNotIn('<script>', (Path(d) / 'index.html').read_text())
    def test_review_must_cover_every_paragraph(self):
        review = {'passed': True, 'issues': [], 'claims': [
            {'paragraph': 0, 'source_url': URL, 'evidence_quote': 'The Moon travels around Earth.'}]}
        with self.assertRaisesRegex(ValueError, 'skipped paragraphs'):
            p.validate_review(review, ARTICLE, [{'url': URL, 'text': 'The Moon travels around Earth.'}])
    def test_invented_evidence(self):
        review = {'passed': True, 'issues': [], 'claims': [
            {'paragraph': 0, 'source_url': URL, 'evidence_quote': 'Invented supporting evidence.'}]}
        with self.assertRaisesRegex(ValueError, 'quote not found'):
            p.validate_review(review, ARTICLE, [{'url': URL, 'text': 'The Moon travels around Earth.'}])
    def test_render_rejects_unsafe_date(self):
        a = copy.deepcopy(ARTICLE); a['date'] = '../../escape'
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError): p.render([a], Path(d))
    def test_article_stylesheet_is_relative(self):
        with tempfile.TemporaryDirectory() as d:
            p.render([ARTICLE], Path(d))
            article = next((Path(d) / 'articles').glob('*.html')).read_text()
            self.assertIn('href="../journal.css"', article)
    def simulate(self, review):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            (out / 'article.json').write_text('stale draft')
            source = {'url': URL, 'text': 'The Moon travels around Earth. ' * 30, 'sha256': 'fixture'}
            replies = [
                {'action':'choose_topic','reason':'Useful explainer','topic':'Phases','angle':'Orbit geometry','source_urls':[URL]},
                {'action':'draft'}, copy.deepcopy(ARTICLE), {'action':'check'}, review,
                {'action':'submit'} if review['passed'] else {'action':'escalate','question':'Review found unsupported claims; please advise.'}]
            with patch.object(p, 'fetch', return_value=source), patch.object(p.Model, 'ask', side_effect=replies), patch.object(p, 'store_from_env', return_value=object()), patch.object(p.Model, 'budget_snapshot', return_value={}):
                if review['passed']:
                    p.run('2026-10-19', out)
                    self.assertTrue((out / 'article.json').exists())
                else:
                    p.run('2026-10-19', out)
                    self.assertFalse((out / 'article.json').exists())
                return json.loads((out / 'run.json').read_text())
    def test_approved_draft(self):
        report = self.simulate({'passed': True, 'issues': [], 'claims': [
            {'paragraph': i, 'claim': 'Orbit', 'source_url': URL, 'evidence_quote': 'The Moon travels around Earth.'} for i in range(3)]})
        self.assertEqual(report['status'], 'awaiting-human-review')
    def test_rejected_draft(self):
        self.assertEqual(self.simulate({'passed': False, 'issues': ['Unsupported claim'], 'claims': []})['status'], 'needs-human-input')

class WorkflowPreflight(unittest.TestCase):
    def preflight(self, pending='0', branch='', failure=False):
        workflow = (p.ROOT / '.github/workflows/moon-journal.yml').read_text()
        section = workflow.split('      - name: Check review queue and existing daily branch')[1].split('      - name: Generate reviewed proposal')[0]
        script = section.split('        run: |\n')[1]
        script = '\n'.join(line[10:] for line in script.splitlines())
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            gh = folder / 'gh'
            gh.write_text('#!/bin/sh\n' + ('exit 1\n' if failure else
                'if test "$1" = pr; then echo "$TEST_PENDING"; else echo "$TEST_BRANCH"; fi\n'))
            gh.chmod(0o755)
            output = folder / 'output'
            env = dict(os.environ, PATH=d + ':' + os.environ['PATH'], GITHUB_OUTPUT=str(output),
                       GITHUB_REPOSITORY='test/repo', TEST_PENDING=pending, TEST_BRANCH=branch)
            result = subprocess.run(['bash', '-c', script], env=env, capture_output=True)
            return result.returncode, output.read_text() if output.exists() else ''
    def test_pending_review_skips_spending(self):
        code, output = self.preflight(pending='1')
        self.assertEqual(code, 0); self.assertIn('exists=true', output)
    def test_authentication_failure_stops_workflow(self):
        code, output = self.preflight(failure=True)
        self.assertNotEqual(code, 0); self.assertNotIn('recover=true', output)
    def test_existing_branch_recovers_pr(self):
        code, output = self.preflight(branch='codex/moon-journal-today')
        self.assertEqual(code, 0); self.assertIn('recover=true', output)

if __name__ == '__main__': unittest.main()
