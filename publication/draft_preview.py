"""Readable, self-contained artifact for drafts that have not passed review."""
import html
from urllib.parse import urlsplit


def render_draft(article, sources):
    escape = lambda value: html.escape(str(value), quote=True)
    allowed = {s['url'] for s in sources if urlsplit(s['url']).scheme == 'https'}
    paragraphs = article.get('paragraphs', [])
    body = []
    if isinstance(paragraphs, list):
        for paragraph in paragraphs:
            if not isinstance(paragraph, dict):
                continue
            body.append('<p>' + escape(paragraph.get('text', '')) + '</p>')
            urls = paragraph.get('sources', [])
            if isinstance(urls, list):
                links = [f'<a href="{escape(url)}">{escape(url)}</a>'
                         for url in urls if isinstance(url, str) and url in allowed]
                if links:
                    body.append('<p class="sources">Sources: ' + ' · '.join(links) + '</p>')
    title = escape(article.get('title', 'Untitled draft'))
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta name="robots" content="noindex,nofollow">'
            f'<title>Unapproved draft — {title}</title><style>'
            'body{font:18px/1.65 system-ui,sans-serif;max-width:740px;margin:40px auto;'
            'padding:0 22px;color:#202530;background:#faf9f5}'
            'h1{line-height:1.2}.notice{padding:16px;background:#fff0c4;border:1px solid #b78823}'
            '.sources{font-size:14px;overflow-wrap:anywhere}a{color:#174c83}'
            '</style></head><body><main><p class="notice"><strong>Unapproved draft</strong><br>'
            'This saved draft may contain factual or citation errors. It has not been approved '
            'for publication. Read review.json and escalation.json, when present, for review results '
            'and why the run stopped.</p>'
            f'<h1>{title}</h1><p>{escape(article.get("date", ""))}</p>'
            + ''.join(body) + '</main></body></html>')
