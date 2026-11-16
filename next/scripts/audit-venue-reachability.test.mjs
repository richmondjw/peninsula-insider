/**
 * Tests for audit-venue-reachability.mjs.
 *
 * Every assertion here is about the RULE, never about today's corpus. No test
 * names a venue count, a date, or a number that an editor changes by adding a
 * phone number to a record: a suite that pins the answer stops being a test of
 * the classifier the first time the classifier is right about something new.
 *
 * Nothing reads the clock, on either side. The script under test never
 * constructs a Date and one of the tests below asserts that from its source,
 * because a survey whose numbers move overnight is not a survey.
 *
 * The decisive test is the last one: run the whole CLI over the real corpus
 * and assert every content file is byte-identical afterwards. An inventory
 * that quietly corrected something would be the worst possible outcome here -
 * a wrong website is an editorial act with a person's name on it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  BROKEN_VERDICTS,
  MISDIRECTED_VERDICTS,
  UNVERIFIABLE_VERDICTS,
  decodeTitle,
  indexLedger,
  inventoryVenue,
  landerMarkerIn,
  landerRows,
  offsiteRows,
  registrableDomain,
  scoreVerdict,
  summarise,
  urlKey,
} from './audit-venue-reachability.mjs';

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(HERE, '..');
const REPO = path.resolve(NEXT, '..');
const SCRIPT = path.join(HERE, 'audit-venue-reachability.mjs');

/** A ledger index built from rows, the way the CLI builds it. */
const ledgerOf = (...rows) => indexLedger(rows);

/* ------------------------------------------------------------------ */
/* Scoring a verdict                                                   */
/* ------------------------------------------------------------------ */

test('ok is the only verdict that means reachable', () => {
  assert.equal(scoreVerdict('ok'), 'reachable');
  for (const v of [...BROKEN_VERDICTS, ...MISDIRECTED_VERDICTS, ...UNVERIFIABLE_VERDICTS]) {
    assert.notEqual(scoreVerdict(v), 'reachable', `${v} must not score reachable`);
  }
});

test('dead, parked and tls-fault are broken; moved is misdirected, not broken', () => {
  assert.equal(scoreVerdict('dead'), 'broken');
  assert.equal(scoreVerdict('parked'), 'broken');
  assert.equal(scoreVerdict('tls-fault'), 'broken');
  assert.equal(scoreVerdict('moved'), 'misdirected');
});

test('blocked is never broken - the most-cited publisher on this site refuses robots', () => {
  assert.equal(scoreVerdict('blocked'), 'unverifiable');
  assert.equal(scoreVerdict('unknown'), 'unverifiable');
});

test('a URL with no ledger row is unledgered, which is an unknown and not a fault', () => {
  assert.equal(scoreVerdict(undefined), 'unledgered');
  assert.equal(scoreVerdict(null), 'unledgered');
  assert.equal(scoreVerdict('something-nobody-has-defined'), 'unledgered');
});

/* ------------------------------------------------------------------ */
/* URL identity                                                        */
/* ------------------------------------------------------------------ */

test('www and a trailing slash are not a different URL to a reader', () => {
  assert.equal(urlKey('https://www.example.com.au/'), urlKey('https://example.com.au'));
  assert.equal(urlKey('https://example.com/book/'), urlKey('https://example.com/book'));
});

test('a different path is a different URL', () => {
  assert.notEqual(urlKey('https://example.com/book'), urlKey('https://example.com/tickets'));
});

test('registrableDomain takes three labels under a .com.au style suffix and two otherwise', () => {
  assert.equal(registrableDomain('www.scorpowines.com.au'), 'scorpowines.com.au');
  assert.equal(registrableDomain('cellar.door.example.com.au'), 'example.com.au');
  assert.equal(registrableDomain('www.scorpowines.com'), 'scorpowines.com');
  assert.equal(registrableDomain('shop.example.org'), 'example.org');
});

/* ------------------------------------------------------------------ */
/* Classifying one venue                                               */
/* ------------------------------------------------------------------ */

test('a record with nothing on it is no-route, and unreachable', () => {
  const v = inventoryVenue({ slug: 'a', name: 'A' }, 'venues/a.json', ledgerOf());
  assert.equal(v.classification, 'no-route');
  assert.equal(v.unreachable, true);
  assert.equal(v.routes.length, 0);
});

test('a dead website with no phone is all-broken: we believe we can reach them and cannot', () => {
  const v = inventoryVenue(
    { slug: 'a', website: 'https://gone.example.com' },
    'venues/a.json',
    ledgerOf({ url: 'https://gone.example.com', verdict: 'dead' })
  );
  assert.equal(v.classification, 'all-broken');
  assert.equal(v.unreachable, true);
  assert.equal(v.counts.broken, 1);
});

test('a moved route is broken as written - alive somewhere the record does not point', () => {
  const v = inventoryVenue(
    { slug: 'a', bookingUrl: 'https://old.example.com/book' },
    'venues/a.json',
    ledgerOf({
      url: 'https://old.example.com/book',
      verdict: 'moved',
      replacement: 'https://old.example.com/tickets',
    })
  );
  assert.equal(v.classification, 'all-broken');
  assert.equal(v.unreachable, true);
  assert.equal(v.routes[0].state, 'misdirected');
  assert.equal(v.routes[0].replacement, 'https://old.example.com/tickets');
});

test('a phone number is a route, so a dead website beside one is not unreachable', () => {
  const v = inventoryVenue(
    { slug: 'a', website: 'https://gone.example.com', phone: '+61 3 5555 5555' },
    'venues/a.json',
    ledgerOf({ url: 'https://gone.example.com', verdict: 'dead' })
  );
  assert.equal(v.unreachable, false);
  assert.equal(v.classification, 'reachable');
  // and it is honest about what it does not know: a phone cannot be probed.
  const phone = v.routes.find((r) => r.kind === 'phone');
  assert.equal(phone.state, 'unverifiable');
});

test('a blocked website alone is not unreachable, because a person with a browser gets through', () => {
  const v = inventoryVenue(
    { slug: 'a', website: 'https://walled.example.com' },
    'venues/a.json',
    ledgerOf({ url: 'https://walled.example.com', verdict: 'blocked', httpCode: '403' })
  );
  assert.equal(v.unreachable, false);
  assert.equal(v.counts.reachable, 0);
  assert.equal(v.counts.unverifiable, 1);
});

test('an undeclared email is the only contact detail: recorded, discarded, and unreachable', () => {
  const v = inventoryVenue(
    { slug: 'a', email: 'hello@example.com' },
    'venues/a.json',
    ledgerOf()
  );
  assert.equal(v.classification, 'discarded-only');
  assert.equal(v.unreachable, true, 'a route the schema strips reaches nobody');
  assert.equal(v.routes[0].declared, false);
  assert.equal(v.routes[0].state, 'discarded');
});

test('sameAs entries are unpacked one route per key, and all of them are discarded', () => {
  const v = inventoryVenue(
    {
      slug: 'a',
      phone: '+61 3 5555 5555',
      sameAs: { officialSite: 'https://example.com', halliday: 'https://winecompanion.example' },
    },
    'venues/a.json',
    ledgerOf()
  );
  const discarded = v.routes.filter((r) => !r.declared);
  assert.equal(discarded.length, 2);
  assert.deepEqual(
    discarded.map((r) => r.field).sort(),
    ['sameAs.halliday', 'sameAs.officialSite']
  );
  assert.equal(v.counts.discarded, 2);
  assert.equal(v.counts.declared, 1);
});

test('an empty string is not a contact route', () => {
  const v = inventoryVenue(
    { slug: 'a', website: '   ', phone: '', email: '' },
    'venues/a.json',
    ledgerOf()
  );
  assert.equal(v.routes.length, 0);
  assert.equal(v.classification, 'no-route');
});

test('a route with no ledger row at all is unledgered-only, reported as an unknown', () => {
  const v = inventoryVenue(
    { slug: 'a', website: 'https://never-probed.example.com' },
    'venues/a.json',
    ledgerOf()
  );
  assert.equal(v.classification, 'unledgered-only');
  assert.equal(v.unreachable, false, 'an unknown is not a finding');
  assert.equal(v.counts.unledgered, 1);
});

test('counts are internally consistent for any record', () => {
  const v = inventoryVenue(
    {
      slug: 'a',
      website: 'https://ok.example.com',
      bookingUrl: 'https://gone.example.com',
      phone: '+61 3 5555 5555',
      email: 'hello@example.com',
    },
    'venues/a.json',
    ledgerOf(
      { url: 'https://ok.example.com', verdict: 'ok' },
      { url: 'https://gone.example.com', verdict: 'dead' }
    )
  );
  const c = v.counts;
  assert.equal(c.routes, v.routes.length);
  assert.equal(c.declared + c.discarded, c.routes);
  assert.equal(c.reachable + c.unverifiable + c.broken + c.misdirected + c.unledgered, c.declared);
});

/* ------------------------------------------------------------------ */
/* A URL that resolves and is not the business                         */
/* ------------------------------------------------------------------ */

test('a for-sale lander is detected through the ledger HTML entities', () => {
  const title = 'arthursseat.com.au&nbsp;-&nbsp;This website is for sale!&nbsp;-&nbsp;arthurs seat Resources and Information.';
  assert.equal(decodeTitle(title).includes('This website is for sale!'), true);
  assert.equal(landerMarkerIn(title), 'this website is for sale');
});

test('an ordinary operator title is not a lander', () => {
  assert.equal(landerMarkerIn('Red Hill Brewery'), null);
  assert.equal(landerMarkerIn('Eagle Cable Car Tickets | Soar Above Arthurs Seat'), null);
  assert.equal(landerMarkerIn(null), null);
  assert.equal(landerMarkerIn(''), null);
});

test('a lander is caught whatever verdict the row carries, including a 200 filed as moved', () => {
  const rows = landerRows([
    { url: 'https://a.example', verdict: 'moved', httpCode: '200', pageTitle: 'This website is for sale!' },
    { url: 'https://b.example', verdict: 'dead', httpCode: '404', pageTitle: 'Squarespace - Website Expired' },
    { url: 'https://c.example', verdict: 'ok', httpCode: '200', pageTitle: 'Red Hill Brewery' },
  ]);
  assert.deepEqual(rows.map((r) => r.url), ['https://a.example', 'https://b.example']);
  assert.equal(rows[0].httpCode, '200', 'a healthy status code is exactly why this needs catching');
});

test('an off-domain redirect is reported, and a www-to-apex redirect is not', () => {
  const rows = offsiteRows([
    { url: 'https://www.kooyong.com', effectiveUrl: 'https://www.portphillipestate.com.au/', verdict: 'ok' },
    { url: 'https://www.example.com.au', effectiveUrl: 'https://example.com.au/', verdict: 'ok' },
    { url: 'https://example.com.au', effectiveUrl: 'https://example.com.au/cellar-door', verdict: 'ok' },
    { url: 'https://no-effective.example', verdict: 'ok' },
  ]);
  assert.deepEqual(rows.map((r) => r.url), ['https://www.kooyong.com']);
  assert.equal(rows[0].from, 'kooyong.com');
  assert.equal(rows[0].to, 'portphillipestate.com.au');
});

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

test('the headline counts exactly the venues flagged unreachable, whatever the corpus holds', () => {
  const venues = [
    inventoryVenue({ slug: 'a' }, 'venues/a.json', ledgerOf()),
    inventoryVenue({ slug: 'b', phone: '+61 3 5555 5555' }, 'venues/b.json', ledgerOf()),
    inventoryVenue(
      { slug: 'c', website: 'https://gone.example.com' },
      'venues/c.json',
      ledgerOf({ url: 'https://gone.example.com', verdict: 'dead' })
    ),
  ];
  const s = summarise(venues);
  assert.equal(s.venues, 3);
  assert.equal(s.unreachable, venues.filter((v) => v.unreachable).length);
  assert.equal(s.unreachable, 2);
  assert.equal(s.withoutWebsite, 2);
  assert.equal(s.withoutPhone, 2);
});

/* ------------------------------------------------------------------ */
/* The two structural rules                                            */
/* ------------------------------------------------------------------ */

test('the script never reads the clock, so its numbers cannot move overnight', async () => {
  const source = await readFile(SCRIPT, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['new Date', 'Date.now', 'Date.UTC', 'toISOString', 'getFullYear']) {
    assert.equal(
      code.includes(forbidden),
      false,
      `${forbidden} in an inventory makes the answer depend on the day it ran`
    );
  }
});

test('running the whole CLI over the real corpus changes not one byte of it', async () => {
  const contentDir = path.join(NEXT, 'src', 'content');

  const hashTree = async (dir) => {
    const out = new Map();
    const walk = async (current) => {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const abs = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__pycache__' || entry.name === 'node_modules') continue;
          await walk(abs);
        } else if (entry.isFile()) {
          const buf = await readFile(abs);
          out.set(path.relative(dir, abs), createHash('sha256').update(buf).digest('hex'));
        }
      }
    };
    await walk(dir);
    return out;
  };

  const before = await hashTree(contentDir);
  assert.ok(before.size > 0, 'the corpus must actually be there for this to prove anything');

  const { stdout } = await execFileAsync(process.execPath, [SCRIPT], { cwd: REPO });
  // Drive the tool the whole way: a run that produced nothing would pass a
  // byte-identical check as happily as a correct one.
  assert.match(stdout, /UNREACHABLE/);

  const after = await hashTree(contentDir);
  assert.equal(after.size, before.size, 'the inventory added or removed a content file');
  for (const [file, hash] of before) {
    assert.equal(after.get(file), hash, `the inventory rewrote ${file}`);
  }
});

test('every record in the real corpus lands in a known class', async () => {
  const ledger = JSON.parse(
    await readFile(path.join(REPO, 'ops', 'records', 'link-health', 'probe-ledger.json'), 'utf8')
  );
  const byKey = indexLedger(ledger.links ?? []);
  const dir = path.join(NEXT, 'src', 'content', 'venues');
  const known = new Set(['no-route', 'all-broken', 'discarded-only', 'unledgered-only', 'reachable']);

  let seen = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const record = JSON.parse(await readFile(path.join(dir, entry.name), 'utf8'));
    const v = inventoryVenue(record, `venues/${entry.name}`, byKey);
    assert.ok(known.has(v.classification), `${entry.name} produced ${v.classification}`);
    assert.equal(typeof v.unreachable, 'boolean');
    seen += 1;
  }
  assert.ok(seen > 0, 'the venue collection must actually be there');
});
