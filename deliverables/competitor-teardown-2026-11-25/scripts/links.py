#!/usr/bin/env python3
"""links.py <outdir> : aggregate internal link URL patterns across fetched pages."""
import sys, json, os, re, collections
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
outdir = sys.argv[1]
host = sys.argv[2]
allu = collections.Counter()
ext = collections.Counter()
src = {}
for line in open(os.path.join(outdir, 'index.jsonl')):
    r = json.loads(line)
    if r.get('status') != 200 or 'file' not in r: continue
    html = open(os.path.join(outdir, 'raw', r['file']), 'rb').read().decode('utf-8', 'replace')
    soup = BeautifulSoup(html, 'lxml')
    seen = set()
    for a in soup.find_all('a', href=True):
        h = a['href'].strip()
        if h.startswith(('#', 'javascript:', 'mailto:', 'tel:')): continue
        u = urljoin(r['url'], h)
        p = urlparse(u)
        if p.netloc.lower().replace('www.', '') == host:
            key = p.path.rstrip('/') or '/'
            if p.query: key += '?' + p.query
            if key not in seen:
                seen.add(key); allu[key] += 1; src.setdefault(key, r['url'])
        else:
            if p.netloc not in seen:
                seen.add(p.netloc); ext[p.netloc] += 1
json.dump({'internal': allu, 'external': ext, 'src': src}, open(os.path.join(outdir, 'links.json'), 'w'))
print('distinct internal', len(allu), 'external hosts', len(ext))
