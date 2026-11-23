import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';

const out = 'review/ray-tour-withdrawal';
await fs.mkdir(out, { recursive: true });
const dist = path.resolve('dist');
const withdrawn = [
  '/tour/bunyip-hot-springs-day-tour/',
  '/tour/bunyip-mornington-peninsula-wine-tour/',
  '/tour/global-ballooning-peninsula-sunrise/',
  '/tour/operators/bunyip-tours/',
  '/tour/operators/global-ballooning/',
];
const forbidden = /bunyip|global-ballooning|Global Ballooning/i;
const report = { head: process.env.REVIEW_HEAD_SHA, pages: [], retired: [], searches: [], requests: [], browserErrors: [], searchHttp: [], searchConsole: [], workers: [],
  cmsScope: 'Built overrides plus deterministic empty runtime CMS response. Live CMS is not certified by this test.', passed: false };
assert.match(report.head ?? '', /^[a-f0-9]{40}$/);
report.checkout = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
report.tree = execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
assert.equal(report.checkout,report.head,'Evidence must use the requested exact head');
const mime = {'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.wasm':'application/wasm','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
// Serve real generated Pagefind and Ask files, never the journey harness stubs.
const server = http.createServer(async (req,res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(dist, '.' + pathname);
    if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return; }
    if (!path.extname(file)) file = path.join(file,'index.html');
    const bytes = await fs.readFile(file);
    if (pathname.startsWith('/pagefind/')) report.searchHttp.push({path:pathname,status:200,bytes:bytes.length});
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] ?? 'application/octet-stream'}); res.end(bytes);
  } catch (error) {
    if (pathname?.startsWith('/pagefind/')) report.searchHttp.push({path:pathname,status:404,error:error.code});
    res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found');
  }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const sitemap = await fs.readFile(path.join(dist,'sitemap.xml'),'utf8');
  const ask = await fs.readFile(path.join(dist,'ask/index.json'),'utf8');
  const askIndex = JSON.parse(ask);
  assert.ok(Array.isArray(askIndex.records) && askIndex.records.length > 0,'Nonempty generated Ask corpus');
  assert.doesNotMatch(ask,forbidden,'Generated Ask stale claims');
  assert.ok(ask.includes('/tour/local-way-wine-cheese-tour/'),'Retained Local Way in generated Ask');
  for (const route of withdrawn) { assert.ok(!sitemap.includes(route), `Sitemap ${route}`); assert.ok(!ask.includes(route), `Ask ${route}`); }
  report.indexes = { sitemap: true, generatedAsk: true };
  browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const routes = ['/tour/','/tour/small-group-tours/','/tour/wine-tours/','/tour/hot-springs-tours/','/tour/full-day-tours/','/tour/for-couples/','/tour/for-families/','/tour/private-tours/','/tour/operators/','/tour-packages/','/tour-packages/thermal-springs-wine-weekend/','/tour-packages/anniversary-long-weekend/','/tour/plunge-hot-springs-wine-tour/'];
  for (const width of [390,1440]) {
    const page = await browser.newPage();
    await page.setViewport({width,height:900});
    page.on('pageerror', error => report.browserErrors.push({width,error:error.message}));
    page.on('console', message => { if (['warn','warning','error'].includes(message.type())) report.searchConsole.push({width,type:message.type(),text:message.text()}); });
    page.on('workercreated', worker => report.workers.push({width,url:worker.url()}));
    page.on('requestfailed', req => report.requests.push({width,url:req.url(),failure:req.failure()?.errorText}));
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().startsWith(origin + '/') || req.url().startsWith('data:')) return req.continue();
      // No form submission or real CMS mutation; deterministic runtime boundary.
      if (req.url().includes('.supabase.co/')) return req.respond({status:200,contentType:'application/json',body:'[]'});
      return req.abort();
    });
    for (const route of withdrawn) {
      const response = await page.goto(origin+route,{waitUntil:'networkidle0'});
      assert.equal(response.status(),404,route);
      assert.equal(await page.$('a,script[type="application/ld+json"]'),null);
      report.retired.push({route,width,status:response.status()});
    }
    for (const route of routes) {
      const response = await page.goto(origin+route,{waitUntil:'networkidle0'});
      assert.equal(response.status(),200,route);
      const observed = await page.evaluate(() => ({
        title:document.title, text:document.body.innerText,
        links:[...document.querySelectorAll('a[href]')].map(a=>a.href),
        schema:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),
        overflow:document.documentElement.scrollWidth>innerWidth,
      }));
      assert.doesNotMatch(observed.text,forbidden,route+' visible copy');
      assert.doesNotMatch(JSON.stringify(observed.links),forbidden,route+' cards/booking links');
      assert.doesNotMatch(JSON.stringify(observed.schema),forbidden,route+' JSON-LD/subTrip');
      assert.equal(observed.overflow,false,route+' overflow');
      const file = route.slice(1,-1).replaceAll('/','-')+'-'+width+'.png';
      await page.screenshot({path:path.join(out,file),fullPage:true});
      report.pages.push({route,width,...observed,screenshot:file});
    }
    // Control: an unrelated existing tour remains reachable and bookable.
    const control = '/tour/local-way-wine-cheese-tour/';
    assert.equal((await page.goto(origin+control,{waitUntil:'networkidle0'})).status(),200);
    assert.ok(await page.$('a[data-pi-book="booking"]'));
    report.pages.push({route:control,width,retained:true});
    report.phase = {width,step:'real-pagefind-search'};
    const searches = await page.evaluate(async () => {
      const bounded = (promise,label) => {
        let timer;
        return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' did not complete within 30 seconds')),30000);})]).finally(()=>clearTimeout(timer));
      };
      const pf=await bounded(import('/pagefind/pagefind.js'),'Pagefind import');
      const results=[];
      for (const query of ['Bunyip','Global Ballooning','Local Way']) {
        const found=await bounded(pf.search(query),'Pagefind query '+query);
        results.push({query,hits:await bounded(Promise.all(found.results.map(async r=>{const d=await r.data();return {url:d.url,title:d.meta?.title,content:d.content};})),'Pagefind result data '+query)});
      }
      return results;
    });
    for (const result of searches) for (const hit of result.hits) {
      assert.ok(!withdrawn.some(route=>new URL(hit.url,origin).pathname===route),`Pagefind ${hit.url}`);
      assert.doesNotMatch(JSON.stringify(hit),forbidden,'Pagefind stale content');
    }
    assert.ok(searches.find(r=>r.query==='Local Way').hits.some(h=>new URL(h.url,origin).pathname===control),'Real Pagefind retained-tour positive control');
    report.searches.push({width,results:searches});
    await page.close();
  }
  report.passed=true;
} catch (error) { report.error=error.stack; throw error; }
finally {
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({head:report.head,passed:report.passed,phase:report.phase,pages:report.pages.map(p=>({route:p.route,width:p.width})),searches:report.searches,error:report.error,browserErrors:report.browserErrors,searchHttp:report.searchHttp,searchConsole:report.searchConsole,workers:report.workers,localRequestFailures:report.requests.filter(r=>r.url.startsWith(origin+'/'))}));
  if (browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
