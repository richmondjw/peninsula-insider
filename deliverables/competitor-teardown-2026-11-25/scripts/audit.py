#!/usr/bin/env python3
"""audit.py <outdir> <host> [main-selector] : per-page SEO/content facts -> <outdir>/audit.json"""
import sys, json, os, re, collections
from bs4 import BeautifulSoup, Comment

outdir, host = sys.argv[1], sys.argv[2]
main_sel = sys.argv[3] if len(sys.argv) > 3 else 'main'
rows = []
for line in open(os.path.join(outdir, 'index.jsonl')):
    r = json.loads(line)
    if 'file' not in r:
        continue
    raw = open(os.path.join(outdir, 'raw', r['file']), 'rb').read()
    html = raw.decode('utf-8', 'replace')
    ct = (r.get('hdr') or {}).get('content-type', '')
    row = {'url': r['url'], 'status': r.get('status'), 'bytes': r.get('bytes'), 'elapsed': r.get('elapsed'), 'final': r.get('final')}
    if 'html' not in ct:
        row['nonhtml'] = ct
        rows.append(row)
        continue
    soup = BeautifulSoup(html, 'lxml')
    row['doctype'] = (re.match(r'\s*<!DOCTYPE[^>]*>', html, re.I) or [''])[0] if re.match(r'\s*<!DOCTYPE[^>]*>', html, re.I) else ''
    row['doctype'] = re.match(r'\s*<!DOCTYPE[^>]*>', html, re.I).group(0).strip() if re.match(r'\s*<!DOCTYPE[^>]*>', html, re.I) else ''
    row['titles'] = [t.get_text(' ', strip=True) for t in soup.find_all('title')]
    metas = {}
    for m in soup.find_all('meta'):
        n = (m.get('name') or m.get('property') or '').lower()
        if n:
            metas.setdefault(n, m.get('content') or '')
    row['desc'] = metas.get('description', '')
    row['robots'] = metas.get('robots', '')
    row['keywords'] = bool(metas.get('keywords'))
    row['og'] = {k: v[:200] for k, v in metas.items() if k.startswith('og:') or k.startswith('twitter:')}
    row['viewport'] = metas.get('viewport', '')
    can = [l.get('href') for l in soup.find_all('link') if 'canonical' in (l.get('rel') or [])]
    row['canonical'] = can
    row['hreflang'] = len([l for l in soup.find_all('link') if l.get('hreflang')])
    ld = []
    for s in soup.find_all('script', type='application/ld+json'):
        txt = s.string or s.get_text() or ''
        types = re.findall(r'"@type"\s*:\s*"([^"]+)"', txt)
        ld.extend(types)
    row['jsonld'] = ld
    row['microdata'] = len(soup.find_all(attrs={'itemtype': True}))
    row['h1'] = [h.get_text(' ', strip=True) for h in soup.find_all('h1')]
    row['h2n'] = len(soup.find_all('h2'))
    row['h3n'] = len(soup.find_all('h3'))
    row['html_lang'] = (soup.html.get('lang') if soup.html else None)
    scripts = soup.find_all('script')
    row['scripts_ext'] = len([s for s in scripts if s.get('src')])
    row['scripts_inline_bytes'] = sum(len(s.get_text() or '') for s in scripts if not s.get('src'))
    row['css_ext'] = len([l for l in soup.find_all('link') if 'stylesheet' in (l.get('rel') or [])])
    imgs = soup.find_all('img')
    row['imgs'] = len(imgs)
    row['imgs_noalt'] = len([i for i in imgs if i.get('alt') is None])
    row['imgs_emptyalt'] = len([i for i in imgs if i.get('alt') is not None and not i.get('alt').strip()])
    row['imgs_lazy'] = len([i for i in imgs if (i.get('loading') or '').lower() == 'lazy' or i.get('data-src')])
    row['imgs_dims'] = len([i for i in imgs if i.get('width') and i.get('height')])
    row['picture'] = len(soup.find_all('picture'))
    row['srcset'] = len([i for i in imgs if i.get('srcset')])
    row['iframes'] = len(soup.find_all('iframe'))
    row['forms'] = len(soup.find_all('form'))
    row['placeholders'] = html.count('listing__placeholder')
    row['viewstate_bytes'] = sum(len(i.get('value') or '') for i in soup.find_all('input', attrs={'name': '__VIEWSTATE'}))
    # main content words
    for t in soup(['script', 'style', 'noscript', 'svg', 'template']):
        t.decompose()
    for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    main = soup.select_one(main_sel) if main_sel else None
    row['has_main'] = bool(main)
    scope = main or soup.body or soup
    # drop obvious chrome inside scope
    for sel in ['nav', 'header', 'footer', '.megamenu', '#Subscribe', '.modal']:
        for t in scope.select(sel):
            t.decompose()
    text = scope.get_text(' ', strip=True)
    row['main_words'] = len(re.findall(r"[A-Za-z0-9’'\-]+", text))
    paras = [p.get_text(' ', strip=True) for p in scope.find_all('p')]
    row['para_words'] = sum(len(re.findall(r"[A-Za-z0-9’'\-]+", p)) for p in paras)
    row['main_text_head'] = text[:400]
    a = scope.find_all('a', href=True)
    row['main_links'] = len(a)
    body_text = (soup.body.get_text(' ', strip=True) if soup.body else '')
    row['body_words'] = len(re.findall(r"[A-Za-z0-9’'\-]+", body_text))
    row['empty_msgs'] = len(re.findall(r'Sorry, there are no (?:items|list)', body_text))
    rows.append(row)
json.dump(rows, open(os.path.join(outdir, 'audit.json'), 'w'))
print('audited', len(rows))
