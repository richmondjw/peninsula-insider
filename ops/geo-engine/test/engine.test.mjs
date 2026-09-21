import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parsePage, stripTags, anchors, jsonLd, metaRefresh, extractHead } from '../lib/html.mjs';
import { buildInventory, pageTypeFor, toPath } from '../lib/inventory.mjs';
import { auditAll } from '../lib/technical.mjs';
import { ChangeSet, DEFAULT_POLICY, gate, PLANE, validateChange } from '../lib/autofix.mjs';
import { Ledger } from '../lib/ledger.mjs';
import { computeHealth } from '../lib/report.mjs';
import { generateBenchmark } from '../lib/benchmark.mjs';

function tmpSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-geo-'));
  const write = (rel, html) => {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), html);
  };
  const page = (title, extra = '') => `<!DOCTYPE html><html lang="en-AU"><head><title>${title}</title>
<meta name="description" content="${'x'.repeat(100)}">
<link rel="canonical" href="https://peninsulainsider.com.au/good/">${extra}</head>
<body><main><h1>${title}</h1><h2>Section one</h2><p>${'word '.repeat(400)}</p>
<a href="/good/">good</a><a href="/missing/">missing</a>
<img src="/a.webp" alt="described"><img src="/b.webp"></main></body></html>`;
  write('good/index.html', page('A good page about Sorrento'));
  write('stub/index.html', `<!DOCTYPE html><html><head><title>Redirecting…</title>
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/good/">
<link rel="canonical" href="https://peninsulainsider.com.au/good/"></head><body></body></html>`);
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), `<?xml version="1.0"?><urlset>
<url><loc>https://peninsulainsider.com.au/good/</loc></url>
<url><loc>https://peninsulainsider.com.au/good/</loc></url>
<url><loc>https://peninsulainsider.com.au/stub/</loc></url>
<url><loc>https://peninsulainsider.com.au/gone/</loc></url></urlset>`);
  return dir;
}

test('HTML extraction ignores markup built inside inline scripts', () => {
  const html = `<body><a href="/real/">real</a><script>var s = '<a href="' + url + '">x</a>';</script></body>`;
  const found = anchors(html);
  assert.equal(found.length, 1);
  assert.equal(found[0].href, '/real/');
});

test('meta refresh stubs are recognised', () => {
  const head = extractHead('<html><head><meta http-equiv="refresh" content="0;url=/target/"></head></html>');
  assert.deepEqual(metaRefresh(head), { delay: 0, target: '/target/' });
});

test('invalid JSON-LD is reported rather than silently dropped', () => {
  const { blocks, invalid } = jsonLd('<script type="application/ld+json">{"@type":"Place"}</script><script type="application/ld+json">{oops}</script>');
  assert.equal(blocks.length, 1);
  assert.equal(invalid.length, 1);
});

test('stripTags removes script bodies and decodes entities', () => {
  assert.equal(stripTags('<p>Tea &amp; scones</p><script>var x=1;</script>'), 'Tea & scones');
});

test('URL normalisation keeps same-origin paths and rejects others', () => {
  assert.equal(toPath('https://peninsulainsider.com.au/eat'), '/eat/');
  assert.equal(toPath('/wine/'), '/wine/');
  assert.equal(toPath('https://example.com/x'), null);
});

test('page typing follows the site information architecture', () => {
  assert.equal(pageTypeFor('/'), 'home');
  assert.equal(pageTypeFor('/eat/'), 'hub');
  assert.equal(pageTypeFor('/whats-on/some-event/'), 'event');
  assert.equal(pageTypeFor('/about/'), 'utility');
});

test('inventory and audit find real issues and exempt redirect stubs', () => {
  const dir = tmpSite();
  const { pages, stats, sitemap } = buildInventory({ root: dir, previous: {} });
  assert.equal(stats.total, 2);
  assert.equal(pages['/stub/'].pageType, 'redirect-stub');
  assert.equal(pages['/stub/'].redirectTarget, '/good/');
  assert.equal(pages['/good/'].wordCount > 300, true);

  const findings = auditAll(pages, { sitemapAvailable: true, sitemap });
  const rules = findings.map((f) => f.rule);
  assert.ok(rules.includes('broken_internal_link'), 'the link to /missing/ must be caught');
  assert.ok(rules.includes('missing_alt'), 'the image without alt must be caught');
  assert.ok(rules.includes('noindex_in_sitemap'), 'the stub listed in the sitemap must be caught');
  assert.ok(rules.includes('sitemap_duplicate_entry'), 'the duplicated loc must be caught');
  assert.ok(rules.includes('sitemap_url_missing_page'), '/gone/ has no page');
  // The stub must not attract content-quality findings.
  const stubFindings = findings.filter((f) => f.urlPath === '/stub/').map((f) => f.rule);
  assert.ok(!stubFindings.includes('missing_h1'));
  assert.ok(!stubFindings.includes('thin_content'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('inventory reuses unchanged pages and preserves their history', () => {
  const dir = tmpSite();
  const first = buildInventory({ root: dir, previous: {} });
  first.pages['/good/'].interventions = [{ action: 'rewrite_title' }];
  first.pages['/good/'].scores = { geoScore: 0.5 };
  const second = buildInventory({ root: dir, previous: first.pages });
  assert.equal(second.stats.reused, 2);
  assert.deepEqual(second.pages['/good/'].interventions, [{ action: 'rewrite_title' }]);
  assert.equal(second.pages['/good/'].scores.geoScore, 0.5);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the safety gate is closed by default and refuses build-output edits', () => {
  const opp = { proposedAction: 'fix_broken_internal_link', safety: 'auto_safe', confidence: 0.99, reversible: true };
  assert.equal(gate(opp, DEFAULT_POLICY, { plane: PLANE.SOURCE }).allowed, false, 'disabled by default');

  const enabled = { ...DEFAULT_POLICY, enabled: true };
  assert.equal(gate(opp, enabled, { plane: PLANE.SOURCE }).allowed, true);
  assert.equal(gate(opp, enabled, { plane: PLANE.BUILD_OUTPUT }).allowed, false, 'build output must be refused');
  assert.equal(gate({ ...opp, confidence: 0.8 }, enabled, { plane: PLANE.SOURCE }).allowed, false, 'below threshold');
  assert.equal(gate({ ...opp, safety: 'human_only' }, enabled, { plane: PLANE.SOURCE }).allowed, false);
  assert.equal(gate({ ...opp, proposedAction: 'rewrite_title' }, enabled, { plane: PLANE.SOURCE }).allowed, false, 'not on the allowlist');
});

test('a change can always be reverted, and build output is never written', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-cs-'));
  const file = path.join(dir, 'data.json');
  fs.writeFileSync(file, '{"a":1}');
  const cs = new ChangeSet({ runId: 'test-run', root: dir, backupDir: path.join(dir, '.rollback') });

  assert.throws(() => cs.applyTextChange({ file, transform: (s) => s, plane: PLANE.BUILD_OUTPUT }), /build output/);

  const res = cs.applyTextChange({ file, transform: () => '{"a":2}', plane: PLANE.SOURCE, opportunity: { id: 'x', proposedAction: 'fix_malformed_jsonld' } });
  assert.equal(res.changed, true);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"a":2}');
  assert.equal(validateChange({ file }).ok, true);

  cs.revertAll();
  assert.equal(fs.readFileSync(file, 'utf8'), '{"a":1}', 'rollback must restore the original');
  assert.ok(cs.manifest().rollbackHint);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('validation catches a write that breaks the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-v-'));
  const file = path.join(dir, 'broken.json');
  fs.writeFileSync(file, '{not json');
  assert.equal(validateChange({ file }).ok, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the ledger remembers issues instead of re-reporting them as new', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-l-'));
  const ledger = new Ledger(path.join(dir, 'ledger.json'));
  const opps = [{ id: 'a', urlPath: '/x/', rule: 'missing_alt' }, { id: 'b', urlPath: '/y/', rule: 'thin_content' }];

  const first = ledger.reconcileIssues(opps, 'run1', '2026-09-01');
  assert.equal(first.isNew.length, 2);

  const second = ledger.reconcileIssues(opps, 'run2', '2026-09-02');
  assert.equal(second.isNew.length, 0, 'the same issue must not be reported as new twice');
  assert.equal(second.recurring.length, 2);

  const third = ledger.reconcileIssues([opps[0]], 'run3', '2026-09-03');
  assert.equal(third.resolved.length, 1, 'a disappeared issue must be marked resolved');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('interventions are measured only after their observation window', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-m-'));
  const ledger = new Ledger(path.join(dir, 'ledger.json'));
  ledger.recordIntervention({ runId: 'r1', date: '2026-08-01', urlPath: '/x/', action: 'rewrite_title', mode: 'applied', measurementWindowDays: 28, searchBefore: { clicks: 100, impressions: 5000 } });

  assert.equal(ledger.dueForMeasurement('2026-08-10').length, 0, 'not due yet');
  const due = ledger.dueForMeasurement('2026-09-05');
  assert.equal(due.length, 1);

  ledger.measure(due[0].id, { searchAfter: { clicks: 130, impressions: 5200 } });
  assert.equal(ledger.data.interventions[0].result, 'improved');

  // Sparse data must be recorded as inconclusive, never talked up.
  ledger.recordIntervention({ runId: 'r2', date: '2026-08-01', urlPath: '/z/', action: 'add_internal_link', mode: 'applied', searchBefore: { clicks: 0, impressions: 3 } });
  const due2 = ledger.dueForMeasurement('2026-09-05').filter((i) => i.urlPath === '/z/');
  ledger.measure(due2[0].id, { searchAfter: { clicks: 1, impressions: 5 } });
  assert.equal(ledger.data.interventions[1].result, 'inconclusive');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('health score stays informative on a large site', () => {
  const many = Array.from({ length: 800 }, () => ({ severity: 'minor' }));
  const health = computeHealth(many, 900);
  assert.ok(health.score > 0 && health.score < 100, `expected an informative score, got ${health.score}`);
  assert.equal(computeHealth([], 900).score, 100);
});

test('the GEO benchmark meets its floor and carries no duplicate questions', () => {
  const bm = generateBenchmark({ target: 250 });
  assert.ok(bm.total >= 250, `expected at least 250 questions, got ${bm.total}`);
  assert.equal(bm.meetsTarget, true);
  assert.equal(new Set(bm.questions.map((q) => q.query)).size, bm.total, 'questions must be unique');
  assert.ok(bm.questions.every((q) => q.measurement === 'not_yet_measurable'), 'no question may claim an unobserved measurement');
});
