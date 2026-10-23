import copy
import json
from pathlib import Path
import tempfile
import unittest

from publication.editor import Editor
from publication.spending import BudgetStop, config
from publication.pipeline import SOURCES, validate, validate_review

URL = SOURCES[0]
SOURCE = {'url': URL, 'text': 'The Moon travels around Earth.', 'sha256': 'fixture'}
ARTICLE = {'title': 'How the Moon travels around Earth', 'slug': 'lunar-orbit', 'category': 'science',
           'paragraphs': [{'text': 'The Moon travels around Earth. '*18, 'sources': [URL]} for _ in range(3)]}
REVIEW = {'passed': True, 'issues': [], 'claims': [
    {'paragraph': i, 'claim': 'Lunar orbit', 'source_url': URL,
     'evidence_quote': 'The Moon travels around Earth.'} for i in range(3)]}
TOPIC = {'action': 'choose_topic', 'topic': 'Lunar orbit', 'angle': 'Geometry', 'source_urls': [URL]}

class FakeModel:
    def __init__(self, replies, stop=None):
        self.replies = iter(copy.deepcopy(replies)); self.report = {'calls': []}
        self.settings = config(); self.inputs = []; self.stop = stop
    def ask(self, prompt, payload):
        if self.stop is not None and len(self.inputs) >= self.stop: raise BudgetStop('Test call budget exhausted')
        self.inputs.append(payload); self.report['calls'].append({'state':'settled'})
        return next(self.replies)

class EditorTests(unittest.TestCase):
    def make(self, replies, limits=None, fetch=None, stop=None):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        model = FakeModel(replies, stop)
        editor = Editor(model, '2026-10-22', Path(temp.name), [], [SOURCE], SOURCES,
            fetch or (lambda url: dict(SOURCE,url=url)), validate, validate_review,
            limits or config()['editor'])
        return editor
    def test_successful_article_requires_check_then_submit(self):
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'check'},REVIEW,{'action':'submit'}])
        self.assertEqual(e.run()['slug'],'lunar-orbit')
        self.assertEqual([x['action'] for x in e.history],['choose_topic','draft','check','submit'])
    def test_reject_revise_recheck_submit(self):
        bad={'passed':False,'issues':['Remove unsupported rain claim'],'claims':[]}
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'check'},bad,
            {'action':'revise','instructions':'Remove rain claim'},ARTICLE,
            {'action':'check'},REVIEW,{'action':'submit'}])
        self.assertIsNotNone(e.run());self.assertEqual(e.revisions,1)
        self.assertIn('Remove unsupported rain claim',e.model.inputs[6]['feedback'])
    def test_style_only_at_revision_limit_submits_with_notes(self):
        style = dict(REVIEW, style_suggestions=['Paragraph 4 repeats an explanation.'])
        e = self.make([TOPIC, {'action':'draft'}, ARTICLE, {'action':'check'}, style,
            {'action':'revise'}, ARTICLE, {'action':'check'}, style],
            limits=dict(config()['editor'], max_revisions=1))
        result = e.run()
        self.assertEqual(result['editorial_notes'], style['style_suggestions'])
        self.assertEqual(e.revisions, 1)
        self.assertFalse((e.out/'escalation.json').exists())

    def test_factual_failure_at_revision_limit_still_blocks(self):
        bad = {'passed':False, 'issues':['Unsupported claim'], 'claims':[],
               'style_suggestions':['Shorten introduction']}
        e = self.make([TOPIC, {'action':'draft'}, ARTICLE, {'action':'check'}, bad,
            {'action':'escalate','question':'Unsupported claim remains'}],
            limits=dict(config()['editor'], max_revisions=0))
        self.assertIsNone(e.run())

    def test_repeated_revision_requires_fresh_check(self):
        e = self.make([TOPIC, {'action':'draft'}, ARTICLE, {'action':'revise'},
            {'action':'escalate','question':'Need a check'}])
        self.assertIsNone(e.run())
        self.assertEqual(e.revisions, 0)
        self.assertIn('Check the current draft', e.history[2]['feedback'][0])

    def test_style_only_cannot_bypass_bad_evidence(self):
        bad = copy.deepcopy(REVIEW)
        bad['style_suggestions'] = ['Use shorter sentences']
        bad['claims'][0]['evidence_quote'] = 'Invented supporting quote'
        e = self.make([TOPIC, {'action':'draft'}, ARTICLE, {'action':'check'}, bad,
            {'action':'escalate','question':'Evidence invalid'}],
            limits=dict(config()['editor'], max_revisions=0))
        self.assertIsNone(e.run())

    def test_decision_limit_preserves_fact_checked_style_draft(self):
        style = dict(REVIEW, style_suggestions=['Shorten introduction'])
        e = self.make([TOPIC, {'action':'draft'}, ARTICLE, {'action':'check'}, style],
            limits=dict(config()['editor'], max_decisions=3))
        self.assertEqual(e.run()['editorial_notes'], style['style_suggestions'])

    def test_cannot_submit_unchecked_draft(self):
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'submit'},
            {'action':'escalate','question':'Need an independent check.'}])
        self.assertIsNone(e.run());self.assertIn('passing check',e.history[2]['feedback'][0])
    def test_revision_invalidates_passing_check(self):
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'check'},REVIEW,
            {'action':'revise','instructions':'Change wording'},ARTICLE,{'action':'submit'},
            {'action':'escalate','question':'New draft needs rechecking.'}])
        self.assertIsNone(e.run());self.assertIn('passing check',e.history[4]['feedback'][0])
    def test_research_invalidates_passing_check(self):
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'check'},REVIEW,
            {'action':'research','source_urls':[SOURCES[5]]},{'action':'submit'},
            {'action':'escalate','question':'Please check new evidence.'}])
        self.assertIsNone(e.run());self.assertIn('passing check',e.history[4]['feedback'][0])
    def test_unapproved_research_url_never_fetched(self):
        fetched=[]
        e=self.make([{'action':'research','source_urls':['https://evil.example/']},
            {'action':'escalate','question':'No approved source.'}],fetch=lambda u:fetched.append(u))
        self.assertIsNone(e.run());self.assertEqual(fetched,[])
    def test_research_then_topic_choice(self):
        e=self.make([{'action':'research','source_urls':[SOURCES[5]]},
            dict(TOPIC,source_urls=[SOURCES[5]]),{'action':'escalate','question':'Sources conflict on the chosen topic.'}])
        self.assertIsNone(e.run());self.assertEqual(e.topic['source_urls'],[SOURCES[5]])
    def test_decision_limit_escalates(self):
        e=self.make([{'action':'submit'}]*2,limits=dict(config()['editor'],max_decisions=2))
        self.assertIsNone(e.run());self.assertEqual(len(e.model.inputs),2)
        self.assertTrue((e.out/'escalation.json').exists())
    def test_budget_stop_creates_escalation_without_extra_calls(self):
        e=self.make([TOPIC],stop=1)
        self.assertIsNone(e.run());self.assertEqual(len(e.model.inputs),1)
        self.assertIn('Budget',json.loads((e.out/'escalation.json').read_text())['question'])
    def test_editor_can_escalate_directly(self):
        e=self.make([{'action':'escalate','question':'Which audience should this serve?'}])
        self.assertIsNone(e.run());self.assertEqual(len(e.model.inputs),1)
    def test_bad_quote_prevents_submission(self):
        review=copy.deepcopy(REVIEW);review['claims'][0]['evidence_quote']='Fabricated evidence passage.'
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'check'},review,
            {'action':'submit'},{'action':'escalate','question':'Evidence quote failed.'}])
        self.assertIsNone(e.run());self.assertIn('quote not found',e.history[2]['feedback'][0])
    def test_model_cannot_edit_decision_limits(self):
        e=self.make([{'action':'set_budget','daily_usd':100},{'action':'escalate','question':'Need budget guidance.'}])
        self.assertIsNone(e.run());self.assertIn('Unknown',e.history[0]['feedback'][0])
    def test_malformed_decision_is_bounded_feedback(self):
        e=self.make(['not a decision',{'action':'escalate','question':'Cannot prepare a valid plan.'}])
        self.assertIsNone(e.run());self.assertEqual(len(e.history),2)

    def test_topic_change_requires_new_draft_and_check(self):
        e=self.make([TOPIC,{'action':'draft'},ARTICLE,{'action':'check'},REVIEW,
            dict(TOPIC,topic='A different lunar question'),{'action':'submit'},
            {'action':'escalate','question':'New topic needs drafting.'}])
        self.assertIsNone(e.run());self.assertIsNone(e.draft)
    def test_budget_stop_during_writing_is_escalated(self):
        e=self.make([TOPIC,{'action':'draft'}],stop=2)
        self.assertIsNone(e.run());self.assertEqual(len(e.model.inputs),2)
        self.assertIsNone(e.draft)
    def test_research_limit_prevents_fetch(self):
        fetched=[]
        e=self.make([{'action':'research','source_urls':[SOURCES[5]]},
            {'action':'escalate','question':'Research quota is zero.'}],
            limits=dict(config()['editor'],max_research_fetches=0),fetch=lambda u:fetched.append(u))
        self.assertIsNone(e.run());self.assertEqual(fetched,[])
    def test_unsettled_api_error_is_not_retried(self):
        e=self.make([TOPIC,{'action':'draft'}])
        original=e.model.ask
        def request(prompt,payload):
            if prompt.startswith('Write or revise'):
                e.model.report['calls'].append({'state':'reserved'})
                raise ValueError('OpenAI HTTP 400: rejected')
            return original(prompt,payload)
        e.model.ask=request
        with self.assertRaisesRegex(ValueError,'HTTP 400'):e.run()
        self.assertEqual(len(e.model.inputs),2)

class EscalationWorkflowTests(unittest.TestCase):
    def test_escalation_pr_never_builds_or_stages_article_pages(self):
        import os
        import subprocess
        workflow=(Path(__file__).resolve().parents[2]/'.github/workflows/moon-journal.yml').read_text()
        section=workflow.split('      - name: Propose one article for human approval')[1]
        script=section.split('        run: |\n')[1]
        script='\n'.join(line[10:] for line in script.splitlines())
        script=script.replace('${{ steps.daily.outputs.date }}','2026-10-22').replace('${{ steps.daily.outputs.recover }}','false').replace('${{ github.event.repository.default_branch }}','main')
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'.publication-run').mkdir()
            (root/'.publication-run/escalation.json').write_text('{"question":"Sources disagree"}')
            log=root/'commands'
            for name, body in [('git','echo "git $*" >> "$TEST_LOG"\n'),
                               ('gh','echo "gh $*" >> "$TEST_LOG"\nif test "$2" = list; then echo 0; fi\n'),
                               ('python','echo "unexpected model/build command" >> "$TEST_LOG"\nexit 1\n')]:
                file=root/name;file.write_text('#!/bin/sh\n'+body);file.chmod(0o755)
            env=dict(os.environ,PATH=str(root)+':'+os.environ['PATH'],TEST_LOG=str(log))
            subprocess.run(['bash','-c',script],cwd=root,env=env,check=True,capture_output=True)
            self.assertTrue((root/'publication/escalations/2026-10-22.json').exists())
            trace=log.read_text();self.assertIn('gh pr create --draft',trace)
            self.assertNotIn('unexpected',trace);self.assertNotIn('git add publication/articles',trace)
    def test_editor_budget_settings_preserve_dollar_limits(self):
        settings=json.loads((Path(__file__).resolve().parents[2]/'publication/spending.json').read_text())
        self.assertEqual(settings['limits']['total_usd'],'5.00')
        self.assertEqual(settings['limits']['daily_usd'],'0.20')
        self.assertEqual(settings['limits']['run_usd'],'0.20')
        self.assertEqual(settings['editor']['max_decisions'],8)
