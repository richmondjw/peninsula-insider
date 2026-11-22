import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {collectRows, sample, toCsv, parseCsv, score} from '../scripts/export-calibration.mjs';

function runs(build) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pi-geo-calibration-'));
  const put = (runId, changes) => {
    mkdirSync(path.join(dir, runId));
    writeFileSync(path.join(dir, runId, 'summary.json'), JSON.stringify({runId, changes}));
  };
  build(put);
  return dir;
}
const verdict = (containsNewClaim, confidence) => ({provider: 'jev', value: {containsNewClaim}, confidence});
const assessed = (beforeEdit, afterEdit) => ({action: 'rewrite_title', beforeEdit, afterEdit});

test('calibration sheet gathers judged patches once, with the gate outcome and blank human columns', () => {
  const dir = runs((put) => {
    put('2026-11-20-0530-incremental', {applied: [], deferred: [
      {urlPath: '/eat/', reason: 'exact patch assessment not accepted', verdict: verdict(true, 0.97), assessed: assessed('  title="Eat"', '  title="Eat, open till 9pm"')},
      {urlPath: '/stay/', reason: 'live/source mismatch'},
    ]});
    put('2026-11-21-0530-incremental', {applied: [
      {urlPath: '/weddings/', verdict: verdict(false, 0.95), assessed: assessed('title="A, B"', 'title="A"')},
    ], deferred: [
      {urlPath: '/eat/', reason: 'exact patch assessment not accepted', verdict: verdict(true, 0.97), assessed: assessed('  title="Eat"', '  title="Eat, open till 9pm"')},
      {urlPath: '/old/', reason: 'exact patch assessment not accepted', verdict: verdict(true, 0.9)},
    ]});
    put('not-a-run', {});
  });
  try {
    const rows = collectRows(dir);
    assert.equal(rows.length, 2, 'the repeated /eat/ patch is one judgement; entries without judged text are skipped');
    const eat = rows.find((r) => r.url === '/eat/');
    assert.equal(eat.gate_outcome, 'rejected');
    assert.equal(eat.jev_contains_new_claim, 'true');
    assert.equal(eat.before, 'title="Eat"');
    assert.equal(eat.human_contains_new_claim, '');
    assert.equal(rows.find((r) => r.url === '/weddings/').gate_outcome, 'accepted');
    assert.deepEqual(parseCsv(toCsv(rows)), rows, 'commas and quotes survive the CSV round trip');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('sampling keeps both accepted and rejected verdicts', () => {
  const row = (gate_outcome, url) => ({gate_outcome, url});
  const picked = sample([...Array(40).fill(0).map((_, i) => row('rejected', `/r${i}/`)), row('accepted', '/a/')], 10);
  assert.equal(picked.length, 10);
  assert.ok(picked.some((r) => r.gate_outcome === 'accepted'));
});

test('scoring reports agreement and names any shipped patch a person says added a claim', () => {
  const base = {jev_confidence: '0.95', notes: ''};
  const result = score([
    {...base, url: '/a/', gate_outcome: 'accepted', jev_contains_new_claim: 'false', human_contains_new_claim: 'no', human_would_ship: 'yes'},
    {...base, url: '/b/', gate_outcome: 'accepted', jev_contains_new_claim: 'false', human_contains_new_claim: 'yes', human_would_ship: 'no'},
    {...base, url: '/c/', gate_outcome: 'rejected', jev_contains_new_claim: 'true', human_contains_new_claim: 'no', human_would_ship: 'yes'},
    {...base, url: '/d/', gate_outcome: 'rejected', jev_contains_new_claim: 'true', human_contains_new_claim: '', human_would_ship: ''},
  ]);
  assert.equal(result.labelled, 3);
  assert.equal(result.unlabelled, 1);
  assert.equal(result.agreementRate, 0.333);
  assert.deepEqual(result.unsafeAccepts, ['/b/']);
  assert.equal(result.needlessRejections, 1);
});
