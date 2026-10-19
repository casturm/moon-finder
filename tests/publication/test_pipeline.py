import copy
import importlib.util
import json
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
    def simulate(self, review):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            source = {'url': URL, 'text': 'The Moon travels around Earth. ' * 30, 'sha256': 'fixture'}
            replies = [{'topic': 'Phases', 'source_urls': [URL]}, copy.deepcopy(ARTICLE), review]
            with patch.object(p, 'fetch', return_value=source), patch.object(p.Model, 'ask', side_effect=replies):
                if review['passed']:
                    p.run('2026-10-19', out)
                    self.assertTrue((out / 'article.json').exists())
                else:
                    with self.assertRaises(ValueError): p.run('2026-10-19', out)
                    self.assertFalse((out / 'article.json').exists())
                return json.loads((out / 'run.json').read_text())
    def test_approved_draft(self):
        report = self.simulate({'passed': True, 'issues': [], 'claims': [
            {'claim': 'Orbit', 'source_url': URL, 'evidence_quote': 'The Moon travels around Earth.'}]})
        self.assertEqual(report['status'], 'awaiting-human-review')
    def test_rejected_draft(self):
        self.assertEqual(self.simulate({'passed': False, 'issues': ['Unsupported claim'], 'claims': []})['status'], 'failed')

if __name__ == '__main__': unittest.main()
