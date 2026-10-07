import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPage } from './generate-agent-formats.mjs';
const url = 'https://peninsulainsider.com.au/eat/example/';
const page = (main, head = '') => `<html><head><link rel="canonical" href="${url}">${head}</head><body><nav>Navigation noise</nav><main>${main}</main><footer>Footer noise</footer></body></html>`;
test('compact output retains caveats, uncertainty, dates and citation links without navigation or executable content', () => {
  const result = extractPage(page('<h1>A place &amp; a purpose</h1><p>Dog access is unknown. Confirm with the operator.</p><p>Fact checked <time>2026-09-20</time></p><a href="../operator/?a=1&amp;b=2">Source</a><script>privateRuntime()</script><form>private form value</form>'), url);
  assert.match(result.markdown, /Dog access is unknown\. Confirm with the operator\./);
  assert.match(result.markdown, /Fact checked 2026-09-20/);
  assert.match(result.markdown, /https:\/\/peninsulainsider.com.au\/eat\/operator\/\?a=1&b=2/);
  assert.doesNotMatch(result.markdown, /Navigation noise|Footer noise|privateRuntime|private form value/);
  assert.equal(result.title, 'A place & a purpose');
});
test('rejects redirects, non-indexable pages, absent main content and canonical mismatches', () => {
  assert.throws(() => extractPage(page('<h1>Private</h1>', '<meta name="robots" content="noindex, nofollow">'), url), /non-public/);
  assert.throws(() => extractPage(page('<h1>Moved</h1>', '<meta http-equiv="refresh" content="0;url=/about/">'), url), /redirect/);
  assert.throws(() => extractPage('<h1>No main</h1>', url), /no public main/);
  assert.throws(() => extractPage(page('<h1>Wrong</h1>'), url + 'other/'), /canonical mismatch/);
});
test('does not turn hostile text into Markdown structure or executable links', () => {
  const result = extractPage(page('<h1>Example</h1><p>[Fake](https://evil.test) &lt;script&gt; x_y</p><a href="javascript:alert(1)">Bad link</a>'), url);
  assert.match(result.markdown, /\\\[Fake\\\]/);
  assert.doesNotMatch(result.markdown, /javascript:/);
});
test('content hashes ignore surrounding chrome but change when facts or caveats change', () => {
  const first = extractPage(page('<h1>Example</h1><p>Hours unknown.</p>'), url);
  const chrome = extractPage(page('<h1>Example</h1><p>Hours unknown.</p>').replace('Navigation noise', 'New menu'), url);
  const edited = extractPage(page('<h1>Example</h1><p>Closed permanently.</p>'), url);
  assert.equal(first.contentSha256, chrome.contentSha256);
  assert.notEqual(first.contentSha256, edited.contentSha256);
});
test('line breaks and adjacent labels remain separate words', () => {
  const result = extractPage(page('<h1>A good day<br>starts here</h1><p><span>Sculpture Park</span><span>Laura Restaurant</span></p>'), url);
  assert.equal(result.title, 'A good day starts here');
  assert.match(result.markdown, /Sculpture Park\s+Laura Restaurant/);
});
test('hidden decorative separators do not join facts; price indicators and empty controls stay out', () => {
  const result = extractPage(page('<h1>Example</h1><p>Park<span aria-hidden="true"> · </span>Restaurant</p><span class="venue-detail__price-band">$$$</span><ul><li><button>Next</button></li></ul>'), url);
  assert.match(result.markdown, /Park\s+Restaurant/);
  assert.doesNotMatch(result.markdown, /\$\$\$|\n-\s*\n/);
});
test('named anchors without href never invent destination URLs', () => {
  const result = extractPage(page('<h1>Example</h1><a id="sources">Sources</a>'), url);
  assert.doesNotMatch(result.markdown, /undefined/);
  assert.match(result.markdown, /Sources/);
});

import { publicPath, validateCatalog, compareCatalogs, generateFormats, citationDate, buildNameDirectories } from './generate-agent-formats.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const makeRecord = (slug, hash = 'a'.repeat(64)) => ({id:`https://peninsulainsider.com.au/eat/${slug}/`,canonicalUrl:`https://peninsulainsider.com.au/eat/${slug}/`,markdownUrl:`https://peninsulainsider.com.au/eat/${slug}/index.md`,contentSha256:hash});
const catalog = records => ({schemaVersion:'2.0',generatedAt:'2026-10-01T00:00:00.000Z',snapshotId:createHash('sha256').update(JSON.stringify(records.map(r=>[r.id,r.contentSha256]))).digest('hex'),count:records.length,records});
test('public route guard refuses private trees, path traversal and ambiguous paths even if included in sitemap', () => {
 for(const path of ['/admin/','/account/','/api/','/dev/','/me/','/saved/','/trips/','/partners/portal/','/eat/../admin/','/eat/%2e%2e/','//evil.test/','/eat/?x=1']) assert.equal(publicPath(path),false,path);
 for(const path of ['/','/agents/','/wine/pt-leo-estate/','/terms/']) assert.equal(publicPath(path),true,path);
});
test('snapshot comparison identifies representation changes and removal without asserting business closure', () => {
 const before=catalog([makeRecord('same'),makeRecord('changed'),makeRecord('removed')]);
 const after=catalog([makeRecord('same'),makeRecord('changed','b'.repeat(64)),makeRecord('added')]);
 const delta=compareCatalogs(before,after);
 assert.deepEqual(delta.changes.map(r=>r.kind),['representation-changed','representation-added','representation-removed']);
 assert.equal(delta.changes[2].markdownUrl,null);assert.match(delta.semantics,/removed is not confirmed closed/);
 assert.equal(compareCatalogs(null,after).baselineAvailable,false);assert.equal(compareCatalogs(null,after).count,0);
 assert.equal(compareCatalogs(after,after).count,0);
});
test('baseline catalogue rejects duplicate IDs, external/private targets and invalid hashes', () => {
 for(const records of [[makeRecord('same'),makeRecord('same')],[{...makeRecord('ok'),canonicalUrl:'https://evil.test/eat/ok/'}],[{...makeRecord('ok'),contentSha256:'not-a-hash'}],[{...makeRecord('ok'),canonicalUrl:'https://peninsulainsider.com.au/admin/'}]]) assert.throws(()=>validateCatalog(catalog(records)));
});
test('citation dates preserve declared metadata and unknowns; changed dates invalidate the compact hash', () => {
 const absent=extractPage(page('<h1>Example</h1>'),url);
 assert.equal(absent.citation.publishedAt,null);assert.equal(absent.citation.modifiedAt,null);
 const dated=extractPage(page('<h1>Example</h1>','<meta property="article:published_time" content="2026-09-20">'),url);
 assert.equal(dated.citation.publishedAt,'2026-09-20');assert.match(dated.markdown,/Published: 2026-09-20/);assert.notEqual(absent.contentSha256,dated.contentSha256);
});
test('complete sitemap export is deterministic and section indexes exactly partition the public catalogue', () => {
 const dir=mkdtempSync(join(tmpdir(),'pi-agent-formats-'));
 try {
  const paths=['/agents/',...Array.from({length:20},(_,i)=>`/eat/place-${i}/`)];
  writeFileSync(join(dir,'sitemap.xml'),`<urlset>${paths.map(p=>`<url><loc>https://peninsulainsider.com.au${p}</loc></url>`).join('')}</urlset>`);
  for(const path of paths){mkdirSync(join(dir,path),{recursive:true});writeFileSync(join(dir,path,'index.html'),page('<h1>Example</h1><p>Hours unknown.</p>').replace(url,`https://peninsulainsider.com.au${path}`));}
  const first=generateFormats(dir);const second=generateFormats(dir,{previous:first});
  assert.equal(first.count,21);assert.equal(first.snapshotId,second.snapshotId);
  assert.equal(JSON.parse(readFileSync(join(dir,'agents/changes.json'))).count,0);
  assert.equal(JSON.parse(readFileSync(join(dir,'agents/sections/eat.json'))).count,20);
  assert.equal((readFileSync(join(dir,'eat/place-0/index.html'),'utf8').match(/type="text\/markdown"/g)||[]).length,1);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('invalid calendar dates stay unknown and mixed-case noindex cannot enter exports', () => {
 for(const value of ['2026-02-30','tomorrow','2026-09-30T99:99:99Z','2026-09-30\n# Injected']) assert.equal(citationDate(value),null);
 assert.equal(citationDate('2024-02-29'),'2024-02-29');
 assert.throws(()=>extractPage(page('<h1>Hidden</h1>','<meta name="Robots" content="NOINDEX">'),url),/non-public/);
 const bad=extractPage(page('<h1>Example</h1>','<meta property="article:modified_time" content="2026-02-30">'),url);assert.equal(bad.citation.modifiedAt,null);
 assert.throws(()=>validateCatalog({...catalog([makeRecord('ok')]),snapshotId:'0'.repeat(64)}),/snapshot hash mismatch/);
});


const namedRecord = (slug, section = 'eat', title = 'Example') => ({ ...makeRecord(slug), title, section, id: `https://peninsulainsider.com.au/${section}/${slug}/`, canonicalUrl: `https://peninsulainsider.com.au/${section}/${slug}/`, markdownUrl: `https://peninsulainsider.com.au/${section}/${slug}/index.md` });
test('lean directories retain every section member and exact names/Markdown links without changing rich records', () => {
 const rich = catalog([namedRecord('one'), namedRecord('two'), namedRecord('one', 'wine')]);
 const before = JSON.stringify(rich); const directories = buildNameDirectories(rich);
 assert.deepEqual(directories.map(x => x.section), ['eat','wine','stay','explore','journal','whats-on']);
 for (const directory of directories) {
  const result = JSON.parse(directory.body); const selected = rich.records.filter(x => x.section === directory.section);
  assert.deepEqual(result.records, selected.map(({title, markdownUrl}) => ({title, markdownUrl})));
  assert.equal(result.count, selected.length); assert.equal(result.snapshotId, rich.snapshotId); assert.equal(result.generatedAt, rich.generatedAt);
  assert.match(result.scope, /Every canonical indexable page/); assert.match(result.semantics, /not a fact check/); assert.match(result.semantics, /Canonical citation/);
  assert(result.records.every(x => Object.keys(x).join(',') === 'title,markdownUrl'));
  assert.equal(directory.distinctUrls, selected.length); assert.equal(directory.bytes, Buffer.byteLength(directory.body));
  const html = JSON.parse(directory.htmlBody);
  assert.equal(result.destinationFormat, 'markdown'); assert.equal(html.destinationFormat, 'html');
  assert.deepEqual(html.records, selected.map(({title, canonicalUrl}) => ({title, canonicalUrl})));
  for (const key of ['generatedAt','snapshotId','section','count','scope']) assert.equal(html[key], result[key]);
  assert(html.records.every(x => Object.keys(x).join(',') === 'title,canonicalUrl'));
  assert.match(html.semantics, /facts, context and citation/); assert.match(html.semantics, /not a fact check/);
  assert.equal(directory.htmlDistinctUrls, selected.length); assert.equal(directory.htmlBytes, Buffer.byteLength(directory.htmlBody));
 }
 assert.equal(JSON.stringify(rich), before);
});
test('lean directory refuses foreign/private/misassigned or noncanonical membership, duplicate IDs and altered Markdown targets', () => {
 const original = namedRecord('one');
 for (const record of [
  {...original, section:'wine'},
  {...original, canonicalUrl:'https://evil.test/eat/one/'},
  {...original, id:'https://peninsulainsider.com.au/account/',canonicalUrl:'https://peninsulainsider.com.au/account/',markdownUrl:'https://peninsulainsider.com.au/account/index.md',section:'account'},
  {...original, id:'https://user@peninsulainsider.com.au/eat/one/',canonicalUrl:'https://user@peninsulainsider.com.au/eat/one/',markdownUrl:'https://user@peninsulainsider.com.au/eat/one/index.md'},
  {...original, markdownUrl:'https://peninsulainsider.com.au/eat/another/index.md'},
  {...original, title:'Look at https://example.com/'},
 ]) assert.throws(() => buildNameDirectories(catalog([record])));
 assert.throws(() => buildNameDirectories(catalog([original,original])));
});
test('directory limits apply to complete UTF-8 output and distinct URLs without truncation', () => {
 const atLimit = buildNameDirectories(catalog(Array.from({length:200},(_,i)=>namedRecord(`entry-${i}`)))).find(x=>x.section==='eat');
 assert.equal(atLimit.count,200); assert.equal(atLimit.distinctUrls,200); assert(atLimit.bytes<=80000);
 assert.equal(atLimit.htmlDistinctUrls,200); assert(atLimit.htmlBytes<=80000);
 assert.throws(()=>buildNameDirectories(catalog(Array.from({length:201},(_,i)=>namedRecord(`entry-${i}`)))),/201\/200 distinct absolute URLs/);
 assert.throws(()=>buildNameDirectories(catalog([namedRecord('long','eat','🌿'.repeat(21000))])),/80000 UTF-8 bytes/);
});
test('real export publishes additive manifest directory refs and fails build on an oversized directory', () => {
 const dir=mkdtempSync(join(tmpdir(),'pi-agent-name-directories-'));
 try {
  const paths=['/agents/',...Array.from({length:201},(_,i)=>`/eat/name-${i}/`)];
  const writeSitemap = selected => writeFileSync(join(dir,'sitemap.xml'),`<urlset>${selected.map(p=>`<url><loc>https://peninsulainsider.com.au${p}</loc></url>`).join('')}</urlset>`);
  for(const path of paths){mkdirSync(join(dir,path),{recursive:true});writeFileSync(join(dir,path,'index.html'),page('<h1>Example</h1><p>Access unknown.</p>').replace(url,`https://peninsulainsider.com.au${path}`));}
  writeSitemap(paths.slice(0,21));const rich=generateFormats(dir);const manifest=JSON.parse(readFileSync(join(dir,'agents/manifest.json')));
  assert.equal(rich.schemaVersion,'2.0');assert.equal(manifest.schemaVersion,'2.0');assert.equal(manifest.directories.length,6);
  const directory=manifest.directories.find(x=>x.section==='eat');const body=readFileSync(join(dir,'agents/directories/eat.json'));
  const htmlBody=readFileSync(join(dir,'agents/directories/eat-html.json'));
  assert.equal(directory.htmlUrl,'https://peninsulainsider.com.au/agents/directories/eat-html.json'); assert.equal(directory.htmlBytes,htmlBody.length); assert.equal(directory.htmlDistinctUrls,20);
  assert.deepEqual(JSON.parse(htmlBody).records,rich.records.filter(x=>x.section==='eat').map(({title,canonicalUrl})=>({title,canonicalUrl})));
  assert.equal(directory.url,'https://peninsulainsider.com.au/agents/directories/eat.json');assert.equal(directory.bytes,body.length);assert.equal(directory.count,20);
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'agents/sections/eat.json'))).records,rich.records.filter(x=>x.section==='eat'));
  const md=readFileSync(join(dir,'eat/name-0/index.md'),'utf8');assert.match(md,/Canonical: https:\/\/peninsulainsider.com.au\/eat\/name-0\//);assert.match(md,/Access unknown/);
  assert.match(readFileSync(join(dir,'eat/name-0/index.html'),'utf8'),/Text of this same page \(Markdown\)/);
  writeSitemap(paths);assert.throws(()=>generateFormats(dir),/201\/200 distinct absolute URLs/);
  assert.equal(readFileSync(join(dir,'agents/directories/eat.json')).toString(),body.toString(),'Oversized replacement is not silently truncated or written');
  assert.equal(readFileSync(join(dir,'agents/directories/eat-html.json')).toString(),htmlBody.toString(),'HTML companion remains intact on over-limit failure');
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('companion directories expose one destination per record and preserve duplicate names in canonical order', () => {
 const rich=catalog([namedRecord('first','explore','Shared name'),namedRecord('second','explore','Shared name')]);
 const d=buildNameDirectories(rich).find(x=>x.section==='explore');
 const md=JSON.parse(d.body),html=JSON.parse(d.htmlBody);
 assert.deepEqual(md.records.map(x=>x.title),html.records.map(x=>x.title));
 assert.deepEqual(html.records.map(x=>x.canonicalUrl),rich.records.map(x=>x.canonicalUrl));
 assert.equal(md.records.length,2);assert.equal(html.records.length,2);
 assert.equal((d.body.match(/https?:\/\//g)||[]).length,2);assert.equal((d.htmlBody.match(/https?:\/\//g)||[]).length,2);
 assert(!d.body.includes('canonicalUrl'));assert(!d.htmlBody.includes('markdownUrl'));
});
