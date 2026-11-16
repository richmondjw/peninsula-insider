import test from 'node:test';
import assert from 'node:assert/strict';
import { extractOfficialHtml, paginationLinks, collectOfficialPages } from './html-adapters.mjs';
const libraryUrl = 'https://library.mornpen.vic.gov.au/Whats-On/Events/Sensory-Storytime-Mornington-Library';
const galleryUrl = 'https://mprg.mornpen.vic.gov.au/Exhibitions/Current-exhibitions/National-Works-On-Paper-2026';
const evidence = (body, { url = libraryUrl, sourceId = 'libraries' } = {}) => ({id:'captured-fixture', sourceId, url, body, authority:'official', retrievedAt:'2026-10-04T00:00:00Z'});
// These class names, date attributes and text come from the captured official
// library detail. Wrapping the excerpts is synthetic; dates are never prose-parsed.
const capturedDate = `<li class="multi-date-item" data-start-year='2026' data-start-month='01' data-start-day='27' data-end-year='2026' data-end-month='01' data-end-day='27' data-start-hour='11' data-start-mins='00' data-end-hour='11' data-end-mins='30'>Tuesday, 27 January 2026 | 11:00 AM - 11:30 AM</li>`;
const capturedTitle = `<h1 class='oc-page-title '>Sensory Storytime - Mornington Library</h1>`;
const capturedVenue = `<div class="gmap-info"><h2>Mornington Library</h2></div>`;
const detail = content => `<meta property="og:url" content="${libraryUrl}">${capturedTitle}${content}${capturedVenue}`;
test('captured library DOM parts yield exact dated but unverified occurrence proofs', () => {
  const source = evidence(detail(capturedDate));
  const result = extractOfficialHtml(source);
  assert.equal(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.equal(candidate.fields.startDate, '2026-01-27T11:00:00+11:00');
  assert.equal(candidate.fields.endDate, '2026-01-27T11:30:00+11:00');
  assert.equal(candidate.fields.venueName, 'Mornington Library');
  assert.equal(candidate.extractionOnly, true);
  assert.equal(candidate.reviewStatus, 'review');
  assert.equal(candidate.geography.shireConfirmed, false);
  assert.equal(candidate.fields.status, undefined);
  for (const proof of Object.values(candidate.proofs)) {
    assert.equal(proof.evidenceId, source.id);
    assert.equal(proof.verified, false);
    assert.ok(proof.path);
    assert.ok(source.body.includes(proof.quote));
  }
});
test('machine date parts use existing zone helper across DST and reject invalid calendars', () => {
  const winter = capturedDate.replaceAll("'01'", "'07'");
  assert.equal(extractOfficialHtml(evidence(detail(winter))).candidates[0].fields.startDate, '2026-07-27T11:00:00+10:00');
  const impossible = capturedDate.replaceAll("'01'", "'02'").replaceAll("'27'", "'31'");
  const result = extractOfficialHtml(evidence(detail(impossible)));
  assert.equal(result.candidates[0].fields.startDate, undefined);
  assert.ok(result.warnings.includes('invalid-or-incomplete-machine-date-parts'));
});
test('gallery supports explicit semantic datetime metadata but does not guess exhibition prose', () => {
  const title = `<h1 class='oc-page-title '>National Works On Paper 2026</h1>`;
  const result = extractOfficialHtml(evidence(`${title}<meta itemprop="startDate" content="2026-09-05"><meta itemprop="endDate" content="2026-11-22">`, {url:galleryUrl, sourceId:'mprg'}));
  assert.equal(result.candidates[0].fields.startDate, '2026-09-05');
  assert.equal(result.candidates[0].fields.endDate, '2026-11-22');
  const prose = extractOfficialHtml(evidence(`${title}<p>5 September – 22 November 2026</p>`, {url:galleryUrl, sourceId:'mprg'}));
  assert.equal(prose.candidates[0].fields.startDate, undefined);
  assert.ok(prose.warnings.includes('date-needs-manual-evidence-no-prose-parsing'));
});
test('ambiguous date metadata and title layout drift remain review tasks', () => {
  const ambiguous = extractOfficialHtml(evidence(detail('<time itemprop="startDate" datetime="2026-10-06"></time><time itemprop="startDate" datetime="2027-10-06"></time>')));
  assert.equal(ambiguous.candidates[0].fields.startDate, undefined);
  assert.ok(ambiguous.warnings.includes('ambiguous-machine-date-metadata'));
  const drift = extractOfficialHtml(evidence('<h1 class="renamed-title">Changed layout</h1>'+capturedDate));
  assert.equal(drift.candidates.length, 0);
  assert.ok(drift.warnings.includes('detail-layout-drift-or-ambiguous-title'));
  const duplicate = extractOfficialHtml(evidence(detail(capturedDate)+capturedTitle));
  assert.equal(duplicate.candidates.length, 0);
});
test('source-specific listing discovery excludes gallery archives and outside hosts', () => {
  const result = extractOfficialHtml(evidence(`<a href="${galleryUrl}"><h2>National Works On Paper 2026</h2></a><a href="https://mprg.mornpen.vic.gov.au/Exhibitions/Past-exhibitions/Old">Old edition</a><a href="https://outside.example/Events/Other">Other</a>`, {url:'https://mprg.mornpen.vic.gov.au/Home',sourceId:'mprg'}));
  assert.equal(result.leads.length, 1);
  assert.equal(result.leads[0].url, galleryUrl);
  assert.equal(result.candidates.length, 0);
  assert.throws(() => extractOfficialHtml(evidence('',{url:'https://outside.example/test'})), /Unregistered host/);
});
test('safe pagination exposes links while rejecting external, credential and script targets', () => {
  const source = evidence('<link rel="next" href="?page=2"><a rel="next" href="https://evil.example/page">Next</a><a rel="next" href="javascript:alert(1)">Next</a><a rel="next" href="https://user:pass@library.mornpen.vic.gov.au/page">Next</a>');
  const result = paginationLinks(source);
  assert.deepEqual(result.next, [libraryUrl+'?page=2']);
  assert.equal(result.complete, false);
  assert.ok(result.warnings.includes('unsafe-or-external-pagination-rejected'));
});
test('captured ASP.NET form-only library pager is explicitly incomplete', () => {
  const pager = `<div class="seamless-pagination"><span class="button-next"><input type="submit" name="ctl09$ctl00$ctl09" value="Next" title="Next page" class="btn_scPagingNonJS_enabled" /></span><div class="seamless-pagination-info">Page 1 of 7</div></div>`;
  const result = paginationLinks(evidence(pager));
  assert.equal(result.complete, false);
  assert.deepEqual(result.next, []);
  assert.ok(result.warnings.includes('form-pagination-needs-permitted-browser-review'));
});
test('bounded pagination records cap, failures and loops instead of silent truncation', async () => {
  const source = {id:'libraries',url:'https://library.mornpen.vic.gov.au/Whats-On/Events',authority:'official'};
  let visits = 0;
  const fetcher = async input => {visits++;return evidence('<a rel="next" href="?page='+String(visits+1)+'">Next</a>',{url:input.url});};
  const bounded = await collectOfficialPages(source,{maxPages:2,evidenceFetcher:fetcher});
  assert.equal(visits,2);
  assert.equal(bounded.complete,false);
  assert.ok(bounded.warnings.includes('pagination-page-cap-reached'));
  assert.equal(bounded.remaining.length,1);
  const failed = await collectOfficialPages(source,{evidenceFetcher:async()=>{throw new Error('HTTP 403');}});
  assert.equal(failed.complete,false);
  assert.match(failed.warnings[0],/page-retrieval-failed/);
  const loop = await collectOfficialPages(source,{evidenceFetcher:async input=>evidence('<a rel="next" href="'+source.url+'">Next</a>',{url:input.url})});
  assert.equal(loop.complete,false);
});
test('nested pagination link and terminal page preserve traversal completeness', async () => {
  const source={id:'libraries',url:'https://library.mornpen.vic.gov.au/Whats-On/Events',authority:'official'};
  const first=paginationLinks(evidence('<nav class="pagination"><ul><li><a href="?page=2" aria-label="Next page">Next</a></li></ul></nav>',{url:source.url}));
  assert.equal(first.next.length,1);
  const result=await collectOfficialPages(source,{evidenceFetcher:async input=>evidence(input.url===source.url?'<link rel="next" href="?page=2">':'<div class="seamless-pagination"><input value="Next" disabled></div>',{url:input.url})});
  assert.equal(result.pages.length,2);
  assert.equal(result.complete,true);
});

test('declared remaining pages with missing controls cannot appear complete', () => {
  const result=paginationLinks(evidence('<div class="seamless-pagination-info">Page 1 of 7</div>'));
  assert.equal(result.complete,false);
  assert.equal(result.currentPage,1);
  assert.equal(result.totalPages,7);
  assert.ok(result.warnings.includes('pagination-more-pages-without-safe-next-link'));
});
test('known event-date datetime and repeated DOM order retain explicit dates and identities', () => {
  const result=extractOfficialHtml(evidence(detail('<p class="event-date"><time datetime="2026-10-06T11:00:00+11:00">Next date</time></p>')));
  assert.equal(result.candidates[0].fields.startDate,'2026-10-06T11:00:00+11:00');
  const second=capturedDate.replaceAll("'27'", "'28'");
  const forward=extractOfficialHtml(evidence(detail(capturedDate+second)));
  const reverse=extractOfficialHtml(evidence(detail(second+capturedDate)));
  assert.deepEqual(forward.candidates.map(c=>c.id).sort(),reverse.candidates.map(c=>c.id).sort());
});

test('nonexistent or ambiguous local machine clocks need review instead of guessed offsets', () => {
  for (const [month,day] of [['10','04'],['04','05']]) {
    const tag=capturedDate.replaceAll("'01'",`'${month}'`).replaceAll("'27'",`'${day}'`).replaceAll("data-start-hour='11'", "data-start-hour='02'").replaceAll("data-start-mins='00'", "data-start-mins='30'");
    const result=extractOfficialHtml(evidence(detail(tag)));
    assert.equal(result.candidates[0].fields.startDate,undefined);
    assert.ok(result.warnings.includes('invalid-or-incomplete-machine-date-parts'));
  }
});

test('official Shire machine sessions share strict extraction without prose guessing',()=>{
 const url='https://www.mornpen.vic.gov.au/Things-to-do/Events/Whats-on/Rye-Foreshore-Market-1';
 const source=evidence(`<h1 class="oc-page-title">Rye Foreshore Market</h1>${capturedDate}<div class="gmap-info"><h2>Rye Foreshore Market</h2></div>`,{sourceId:'shire',url});
 const result=extractOfficialHtml(source);assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].fields.startDate,'2026-01-27T11:00:00+11:00');assert.equal(result.candidates[0].geography.shireConfirmed,false);assert.equal(result.candidates[0].proofs.startDate.verified,false);
 assert.throws(()=>extractOfficialHtml({...source,url:url.replace('www.mornpen.vic.gov.au','other.example.org')}),/Unregistered host/);
});
