"""Reproducible live internal-link discovery. Standard library only."""
import concurrent.futures as cf
import json, pathlib, time, urllib.request, urllib.error, urllib.parse, xml.etree.ElementTree as ET, sys, re
from html.parser import HTMLParser
SITE = 'https://peninsulainsider.com.au'
OUT = pathlib.Path(__file__).resolve().parents[1] / 'reports/seo/internal-linking'
OUT.mkdir(parents=True, exist_ok=True)
class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.links=[]; self.stack=[]; self.anchor=None; self.canonical=None; self.noindex=False; self.ids=set(); self.title=''; self.redirect=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.add(a['id'])
        if tag in ('header','footer','nav','script','style','title'): self.stack.append(tag)
        if tag=='link' and a.get('rel')=='canonical': self.canonical=a.get('href')
        if tag=='meta' and a.get('name','').lower()=='robots': self.noindex='noindex' in a.get('content','').lower()
        if tag=='meta' and a.get('http-equiv','').lower()=='refresh': self.redirect=a.get('content','').split('url=')[-1]
        if tag=='a': self.anchor={'href':a.get('href'),'text':'','aria':a.get('aria-label',''),'title':a.get('title',''),'rel':a.get('rel',''),'chrome':any(t in self.stack for t in ('header','footer','nav'))}
        if tag=='img' and self.anchor: self.anchor['text']+=' '+(a.get('alt') or '')
    def handle_endtag(self, tag):
        if tag=='a' and self.anchor: self.anchor['text']=' '.join(self.anchor['text'].split()); self.links.append(self.anchor); self.anchor=None
        if tag in self.stack: self.stack.remove(tag)
    def handle_data(self, text):
        if 'title' in self.stack: self.title+=text
        if self.anchor and not any(t in self.stack for t in ('script','style')): self.anchor['text']+=text+' '
def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; PIInternalLinkAudit/1.0)'}),timeout=25) as r:
                raw=r.read(); content=r.headers.get('Content-Type',''); final=r.url; status=r.status
            p=Page()
            if 'html' in content:
                html=raw.decode('utf-8',errors='replace'); p.feed(html)
                route=urllib.parse.urlsplit(url).path.strip('/')
                if '..' not in route.split('/'):
                    file=OUT/'live-html'/route/'index.html'; file.parent.mkdir(parents=True,exist_ok=True); file.write_text(html,encoding='utf-8')
            return {'url':url,'final':final,'status':status,'contentType':content,'canonical':p.canonical,'noindex':p.noindex,'title':p.title,'redirect':p.redirect,'links':p.links,'ids':sorted(p.ids)}
        except urllib.error.HTTPError as e:
            if e.code>=500 and attempt<2: time.sleep(attempt+1); continue
            return {'url':url,'status':e.code,'links':[],'ids':[]}
        except Exception as e:
            if attempt==2: return {'url':url,'status':None,'error':str(e),'links':[],'ids':[]}
            time.sleep(attempt+1)
def run():
    sitemap=urllib.request.urlopen(urllib.request.Request(SITE+'/sitemap.xml',headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read()
    seeds={e.text for e in ET.fromstring(sitemap).iter() if e.tag.endswith('}loc')}; seeds.add(SITE+'/')
    if '--source-score' in sys.argv:
        initial=json.loads(pathlib.Path(sys.argv[sys.argv.index('--source-score')+1]).read_text(encoding='utf-8'))
        for key in ('orphans','unreachable','noBody'):
            for route in initial[key]: seeds.add(SITE+route)
    print(f'Seeding {len(seeds)} sitemap and source-known public pages',flush=True)
    pages={}; pending=seeds.copy()
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        while pending:
            batch=sorted(pending); pending=set()
            for p in pool.map(fetch,batch):
                pages[p['url']]=p
                for a in p['links']:
                    h=a['href']
                    if not h or h.startswith(('#','mailto:','tel:','javascript:','data:')): continue
                    u=urllib.parse.urlsplit(urllib.parse.urljoin(p['url'],h))
                    if u.netloc!=urllib.parse.urlsplit(SITE).netloc: continue
                    target=urllib.parse.urlunsplit((u.scheme,u.netloc,u.path,'',''))
                    a['target']=target; a['fragment']=u.fragment
                    if not pathlib.PurePosixPath(u.path).suffix and not u.path.startswith(('/admin/','/api/','/account/','/me/','/preview/','/dev/')) and target not in pages: pending.add(target)
            pending-=pages.keys()
            print(f'Discovered {len(pages)} URLs; next {len(pending)}',flush=True)
    report={'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'site':SITE,'sitemap':sorted(seeds),'pages':pages}
    (OUT/'live-discovery.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(f'Saved {len(pages)} pages to {OUT}',flush=True)
if __name__=='__main__': run()
