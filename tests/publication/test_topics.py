import base64
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from publication import audit, pipeline
from publication.topics import DuplicateTopic, match_title, title_index
import test_editor as fixtures
from test_editor import TOPIC, ARTICLE, SOURCE

OLD = dict(ARTICLE, date='2026-10-20')


class TitleTests(unittest.TestCase):
    def test_index_contains_only_stable_article_identity(self):
        index = title_index([OLD])
        self.assertEqual(set(index[0]), {'title', 'slug', 'date', 'path'})
        self.assertEqual(index[0]['path'], 'publication/articles/2026-10-20.json')
        self.assertNotIn('paragraphs', index[0])

    def test_case_punctuation_and_word_order(self):
        for title in ['HOW THE MOON TRAVELS AROUND EARTH!', 'Around Earth: how the Moon travels']:
            self.assertEqual(match_title(title, title_index([OLD]))['reason'], 'same-title-words')

    def test_related_title_and_slug_match(self):
        self.assertIsNotNone(match_title('How the Moon travels around our Earth', title_index([OLD])))
        self.assertEqual(match_title('Unrelated water question', title_index([OLD]), OLD['slug'])['reason'], 'same-slug')

    def test_distinct_topic_allowed_and_empty_index(self):
        self.assertIsNone(match_title('Finding frozen water in polar craters', title_index([OLD])))
        self.assertIsNone(match_title(OLD['title'], []))

    def test_body_duplicate_preserves_match(self):
        article = dict(OLD, title='Finding frozen water in polar craters', slug='polar-ice')
        with self.assertRaises(DuplicateTopic) as caught:
            pipeline.validate(article, [SOURCE], [OLD])
        self.assertEqual(caught.exception.match['reason'], 'body-word-overlap')
        self.assertEqual(caught.exception.match['matched_article']['slug'], OLD['slug'])


class ProposalTests(unittest.TestCase):
    def make(self, replies):
        # Reuse the existing offline model fixture without inheriting its tests.
        fixture = fixtures.EditorTests()
        editor = fixture.make(replies)
        self.addCleanup(fixture.doCleanups)
        editor.archive = [copy.deepcopy(OLD)]
        editor.model.report['run_id'] = '12345-2'
        return editor

    def log(self, editor):
        return [json.loads(line) for line in (editor.out / 'rejections.jsonl').read_text().splitlines()]

    def test_topic_rejected_before_writer_call_with_auditable_match(self):
        e = self.make([dict(TOPIC, topic=OLD['title']),
                       {'action': 'escalate', 'question': 'Is a follow-up justified?'}])
        self.assertIsNone(e.run())
        self.assertEqual(len(e.model.inputs), 2)
        self.assertIsNone(e.topic)
        self.assertFalse((e.out / 'draft.json').exists())
        record = self.log(e)[0]
        self.assertEqual(record['run_id'], '12345-2')
        self.assertEqual(record['stage'], 'choose_topic')
        self.assertEqual(record['matched_article']['title'], OLD['title'])
        self.assertEqual(record['reason'], 'same-title-words')
        self.assertEqual(record['step'], 1)
        self.assertIn('time', record)
        self.assertEqual(e.history[0]['result'], 'needs-work')
        self.assertEqual(e.model.inputs[0]['existing_title_index'], title_index([OLD]))

    def test_rejected_topic_can_be_replaced_with_distinct_topic(self):
        e = self.make([dict(TOPIC, topic=OLD['title']),
                       dict(TOPIC, topic='Frozen water in polar craters'),
                       {'action':'escalate', 'question':'Need ice sources'}])
        self.assertIsNone(e.run())
        self.assertEqual(e.topic['topic'], 'Frozen water in polar craters')
        self.assertEqual(e.topics, 2)
        self.assertEqual(len(self.log(e)), 1)

    def test_duplicate_writer_title_is_logged_and_cannot_submit(self):
        e = self.make([TOPIC, {'action':'draft'}, ARTICLE, {'action':'submit'},
                       {'action':'escalate', 'question':'Duplicate needs review'}])
        self.assertIsNone(e.run())
        self.assertEqual(self.log(e)[0]['stage'], 'draft')
        self.assertFalse((e.out / 'article.json').exists())
        self.assertIsNone(e.checked)

    def test_duplicate_choice_invalidates_previous_passing_candidate(self):
        e = self.make([])
        e.topic = TOPIC
        e.draft = dict(ARTICLE, date='2026-10-22')
        e.checked = e.signature()
        with self.assertRaises(DuplicateTopic):
            e.execute(dict(TOPIC, topic=OLD['title']))
        self.assertIsNone(e.checked)
        self.assertIsNone(e.draft)

    def test_run_failure_reports_id_count_and_clears_previous_log(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            (out / 'rejections.jsonl').write_text('{"stale":true}\n')
            (out / 'article.json').write_text('stale')
            with patch.dict('os.environ', GITHUB_RUN_ID='55', GITHUB_RUN_ATTEMPT='3'), \
                 patch.object(pipeline, 'fetch', side_effect=ValueError('offline')):
                with self.assertRaisesRegex(ValueError, 'Fewer than two'):
                    pipeline.run('2027-01-01', out)
            report = json.loads((out / 'run.json').read_text())
            self.assertEqual(report['run_id'], '55-3')
            self.assertEqual(report['status'], 'failed')
            self.assertEqual(report['duplicate_rejections'], 0)
            self.assertFalse((out / 'article.json').exists())
            self.assertTrue((out / 'title-index.json').exists())


    def test_pipeline_duplicate_escalation_has_matching_run_status(self):
        replies = [dict(TOPIC, topic=OLD['title']),
                   {'action':'escalate', 'question':'Please review overlap'}]
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); (root/'publication/articles').mkdir(parents=True)
            (root/'publication/articles/2026-10-20.json').write_text(json.dumps(OLD))
            out = root/'out'
            with patch.object(pipeline, 'ROOT', root), \
                 patch.object(pipeline, 'fetch', return_value=SOURCE), \
                 patch.object(pipeline.Model, 'ask', side_effect=replies), \
                 patch.object(pipeline, 'store_from_env', return_value=object()), \
                 patch.object(pipeline.Model, 'budget_snapshot', return_value={}):
                pipeline.run('2026-10-22', out)
            report = json.loads((out/'run.json').read_text())
            rejection = json.loads((out/'rejections.jsonl').read_text())
            self.assertEqual(report['status'], 'needs-human-input')
            self.assertEqual(report['duplicate_rejections'], 1)
            self.assertEqual(report['indexed_articles'], 1)
            self.assertEqual(report['run_id'], rejection['run_id'])
            self.assertIn('Duplicate rejections: 1', (out/'summary.md').read_text())
            self.assertFalse((out/'article.json').exists())

    def test_committed_index_matches_article_archive(self):
        archive = [json.loads(p.read_text()) for p in (pipeline.ROOT/'publication/articles').glob('*.json')]
        self.assertEqual(json.loads((pipeline.ROOT/'publication/title-index.json').read_text()), title_index(archive))


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name)
        (self.out/'run.json').write_text(json.dumps({'run_id':'42-2', 'status':'needs-human-input'}))
        (self.out/'title-index.json').write_text(json.dumps(title_index([OLD])))
        (self.out/'rejections.jsonl').write_text(json.dumps({'reason':'same-slug', 'run_id':'42-2'})+'\n')

    def test_persist_creates_branch_and_immutable_bundle(self):
        calls = []
        def request(method, route, body=None):
            calls.append((method, route, body))
            if method == 'GET': return []
            return {'content': {'html_url': 'https://example.test/audit'}}
        self.assertEqual(audit.persist(self.out, 'test/repo', 'head', request), 'https://example.test/audit')
        self.assertEqual([c[0] for c in calls], ['GET', 'POST', 'PUT'])
        payload = calls[-1][2]
        self.assertEqual(payload['branch'], audit.BRANCH)
        self.assertNotIn('sha', payload)
        bundle = json.loads(base64.b64decode(payload['content']))
        self.assertEqual(bundle['rejections'][0]['reason'], 'same-slug')
        self.assertEqual(bundle['run']['status'], 'needs-human-input')
        self.assertEqual(bundle['title_index'], title_index([OLD]))
        self.assertTrue(calls[-1][1].endswith('/42-2.json'))

    def test_existing_branch_is_never_reset(self):
        calls=[]
        def request(method, route, body=None):
            calls.append(method)
            return [{'ref':'refs/heads/'+audit.BRANCH}] if method == 'GET' else {'content':{'html_url':'url'}}
        audit.persist(self.out, 'test/repo', 'head', request)
        self.assertEqual(calls, ['GET', 'PUT'])

    def test_auth_failure_never_creates_branch(self):
        calls=[]
        def request(method, route, body=None):
            calls.append(method)
            raise OSError('Read failed')
        with self.assertRaises(OSError): audit.persist(self.out, 'test/repo', 'head', request)
        self.assertEqual(calls, ['GET'])

    def test_skip_has_no_remote_writes(self):
        (self.out/'run.json').unlink()
        with patch.object(audit, 'api') as request:
            self.assertIsNone(audit.persist(self.out, 'test/repo', 'head', request))
            request.assert_not_called()

    def test_invalid_id_cannot_write_outside_run_path(self):
        (self.out/'run.json').write_text('{"run_id":"../../main"}')
        with patch.object(audit, 'api') as request:
            with self.assertRaises(ValueError): audit.persist(self.out, 'test/repo', 'head', request)
            request.assert_not_called()
