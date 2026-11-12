"""Small, deterministic title index and inspectable overlap decisions."""
import difflib
import re


def title_index(archive):
    return sorted(({'title': a['title'], 'slug': a['slug'], 'date': a['date'],
                    'path': 'publication/articles/' + a['date'] + '.json'} for a in archive),
                  key=lambda a: (a['date'], a['slug']))


def words(text):
    return set(re.findall(r'[a-z0-9]+', text.lower()))


def overlap(a, b):
    a, b = words(a), words(b)
    return len(a & b) / max(1, len(a | b))


def match_title(title, index, slug=None):
    for old in index:
        reason = None
        if slug is not None and slug == old['slug']:
            reason = 'same-slug'
        elif words(title) == words(old['title']) and words(title):
            reason = 'same-title-words'
        elif overlap(title, old['title']) > .6:
            reason = 'title-word-overlap'
        elif difflib.SequenceMatcher(None, title.lower(), old['title'].lower()).ratio() > .85:
            reason = 'title-text-similarity'
        if reason:
            return {'reason': reason, 'matched_article': old}
    return None


class DuplicateTopic(ValueError):
    def __init__(self, match):
        self.match = match
        super().__init__('Possible duplicate (' + match['reason'] + '): ' +
                         match['matched_article']['title'] + '; human review required')
