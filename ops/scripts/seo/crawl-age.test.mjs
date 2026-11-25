import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCrawl, sitemapUrls, summarise } from './crawl-age.mjs';

test('a crawl is placed against the two gate windows', () => {
  assert.equal(classifyCrawl('2026-05-10T00:00:00Z'), 'stale_pre_removal', 'before the gate');
  assert.equal(classifyCrawl('2026-06-01T00:00:00Z'), 'during_gate');
  assert.equal(classifyCrawl('2026-06-18T00:00:00Z'), 'stale_pre_removal', 'the open fortnight between the windows');
  assert.equal(classifyCrawl('2026-06-28T05:03:01Z'), 'during_gate', 'the 28 June crawl behind the odd canonicals');
  assert.equal(classifyCrawl('2026-08-03T01:22:00Z'), 'during_gate', 'the removal instant is not yet a clean fetch');
  assert.equal(classifyCrawl('2026-09-19T00:00:00Z'), 'after_gate_removed');
  assert.equal(classifyCrawl(null), 'never_crawled');
  assert.equal(classifyCrawl('not a date'), 'never_crawled');
});

test('the summary reports how much of the site is still judged on a gate-era fetch', () => {
  const s = summarise([
    { url: 'https://x/a/', lastCrawlTime: '2026-10-01T00:00:00Z', verdict: 'PASS', coverageState: 'Submitted and indexed', googleCanonical: 'https://x/a/', userCanonical: 'https://x/a' },
    { url: 'https://x/b/', lastCrawlTime: '2026-06-28T05:03:01Z', verdict: 'NEUTRAL', coverageState: 'Duplicate', googleCanonical: 'https://x/rosebud/', userCanonical: 'https://x/b/' },
    { url: 'https://x/c/', lastCrawlTime: '2026-05-02T00:00:00Z', verdict: 'PASS', coverageState: 'Submitted and indexed' },
    { url: 'https://x/d/', lastCrawlTime: null, verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' },
  ]);
  assert.deepEqual(s.byCrawl, { after_gate_removed: 1, during_gate: 1, stale_pre_removal: 1, never_crawled: 1 });
  assert.equal(s.recrawledSinceGateRemovedPct, 25);
  assert.equal(s.stillOnGateEraFetchPct, 25);
  assert.equal(s.indexed, 2);
  assert.deepEqual(s.canonicalMismatch.map((c) => c.url), ['https://x/b/'], 'a trailing slash alone is not a mismatch');
  assert.equal(s.stuck.length, 3);
});

test('sitemap URLs are read from loc elements', () => {
  assert.deepEqual(sitemapUrls('<urlset><url><loc> https://x/a/ </loc></url><url><loc>https://x/b/</loc></url></urlset>'),
    ['https://x/a/', 'https://x/b/']);
});
