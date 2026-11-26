#!/usr/bin/env python3
"""show.py <outdir> <url-or-path-suffix> [maxchars] [--links] : print readable text of a fetched page."""
import sys, json, os, re
from bs4 import BeautifulSoup, Comment

outdir, key = sys.argv[1], sys.argv[2]
maxc = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 6000
links = '--links' in sys.argv
rec = None
for line in open(os.path.join(outdir, 'index.jsonl')):
    r = json.loads(line)
    if r['url'] == key or r['url'].endswith(key):
        rec = r
if not rec:
    sys.exit('not found')
html = open(os.path.join(outdir, 'raw', rec['file']), 'rb').read().decode('utf-8', 'replace')
soup = BeautifulSoup(html, 'lxml')
print('URL', rec['url'], rec.get('status'), rec.get('bytes'))
print('TITLES', [t.get_text(strip=True) for t in soup.find_all('title')])
for m in soup.find_all('meta'):
    n = m.get('name') or m.get('property')
    if n and n.lower() in ('description', 'robots', 'og:title', 'og:image', 'og:type', 'keywords'):
        print('META', n, '=', (m.get('content') or '')[:300].replace('\n', ' '))
for l in soup.find_all('link', rel=True):
    if 'canonical' in l.get('rel') or 'alternate' in l.get('rel'):
        print('LINK', l.get('rel'), l.get('href'))
for s in soup.find_all('script', type='application/ld+json'):
    print('JSONLD', (s.string or '')[:1500].replace('\n', ' '))
for t in soup(['script', 'style', 'noscript', 'svg']):
    t.decompose()
body = soup.body or soup
out = []
for el in body.descendants:
    if getattr(el, 'name', None) in ('h1', 'h2', 'h3', 'h4'):
        out.append('\n[' + el.name.upper() + '] ' + el.get_text(' ', strip=True))
    elif getattr(el, 'name', None) == 'a' and links:
        t = el.get_text(' ', strip=True)
        out.append(' <A %s | %s>' % (el.get('href'), t[:60]))
    elif getattr(el, 'name', None) == 'img' and links:
        out.append(' <IMG alt=%r src=%s>' % (el.get('alt'), (el.get('src') or el.get('data-src') or '')[:90]))
    elif isinstance(el, Comment):
        continue
    elif isinstance(el, str):
        if el.parent.name in ('h1', 'h2', 'h3', 'h4'):
            continue
        if links and el.find_parent('a'):
            continue
        t = el.strip()
        if t:
            out.append(t)
txt = re.sub(r'\n{3,}', '\n\n', ' '.join(out))
print(txt[:maxc])
print('... total chars', len(txt))
