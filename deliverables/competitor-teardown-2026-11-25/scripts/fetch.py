#!/usr/bin/env python3
"""Polite fetcher. Usage: fetch.py <urls.txt> <outdir> [concurrency] [delay]
Writes <outdir>/raw/<sha1>.html and appends to <outdir>/index.jsonl. Skips URLs already in index."""
import sys, os, json, hashlib, time, threading
from concurrent.futures import ThreadPoolExecutor
import requests

urls_file, outdir = sys.argv[1], sys.argv[2]
conc = int(sys.argv[3]) if len(sys.argv) > 3 else 3
delay = float(sys.argv[4]) if len(sys.argv) > 4 else 0.4
os.makedirs(os.path.join(outdir, 'raw'), exist_ok=True)
idx_path = os.path.join(outdir, 'index.jsonl')
done = set()
if os.path.exists(idx_path):
    for line in open(idx_path):
        try:
            done.add(json.loads(line)['url'])
        except Exception:
            pass
urls = [u.strip() for u in open(urls_file) if u.strip() and u.strip() not in done]
urls = list(dict.fromkeys(urls))
lock = threading.Lock()
UA = 'Mozilla/5.0 (compatible; site-research-fetch/1.0)'
KEEP = ['content-type', 'cache-control', 'cf-cache-status', 'age', 'last-modified', 'etag', 'x-robots-tag',
        'content-encoding', 'server-timing', 'location', 'x-redirect-reason', 'link', 'content-length', 'server',
        'strict-transport-security', 'content-security-policy', 'x-powered-by', 'x-aspnet-version', 'vary']
tl = threading.local()

def sess():
    if not hasattr(tl, 's'):
        tl.s = requests.Session()
        tl.s.headers.update({'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                             'Accept-Language': 'en-AU,en;q=0.9'})
    return tl.s

def fetch(u):
    rec = {'url': u}
    t0 = time.time()
    try:
        r = sess().get(u, timeout=45, allow_redirects=True)
        rec['status'] = r.status_code
        rec['final'] = r.url
        rec['hist'] = [(h.status_code, h.headers.get('location')) for h in r.history]
        rec['elapsed'] = round(r.elapsed.total_seconds(), 3)
        rec['total'] = round(time.time() - t0, 3)
        rec['bytes'] = len(r.content)
        rec['hdr'] = {k: r.headers.get(k) for k in KEEP if r.headers.get(k)}
        h = hashlib.sha1(u.encode()).hexdigest()
        rec['file'] = h + '.html'
        with open(os.path.join(outdir, 'raw', rec['file']), 'wb') as f:
            f.write(r.content)
    except Exception as e:
        rec['error'] = repr(e)[:300]
    with lock:
        with open(idx_path, 'a') as f:
            f.write(json.dumps(rec) + '\n')
    time.sleep(delay)
    return rec

with ThreadPoolExecutor(conc) as ex:
    n = 0
    for rec in ex.map(fetch, urls):
        n += 1
        if n % 25 == 0:
            print(n, '/', len(urls), flush=True)
print('done', len(urls))
