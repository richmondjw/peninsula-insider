/**
 * how-we-check.test.mjs - the rules behind /how-we-check/.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO. It does not snapshot the page, and
 * it pins no count. Every number that page publishes moves on its own: a
 * source lapses by the calendar turning over, and a snapshot would fail on a
 * day nobody chose and then be re-baselined without being read. A pinned
 * count would be worse, because passing it would mean the corpus had not
 * moved, which is not the property anyone wants.
 *
 * What it asserts instead are the rules that make the page trustworthy:
 *
 *   1. every kind of fact the source table defines reaches the page, so a new
 *      one cannot be added and silently left off the public account
 *   2. every source kind reaches a reader in English, so a machine token
 *      cannot ship as reader copy
 *   3. the order the page prints IS the order the table defines, checked
 *      against the table rather than against a copy of it
 *   4. the worked example is true of the data at the moment it is printed
 *   5. the interval words are the table's own intervals
 *   6. the standing figures come out of claim-state.mjs and move with the
 *      calendar in the only direction they can
 *   7. no part of the record vanishes from the coverage table unnoticed
 *   8. the page's reader copy contains none of the vocabulary that belongs
 *      to us rather than to a reader
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AREA_LABELS,
  COLLECTION_DIRECTORIES,
  INTERNAL_TYPES,
  NON_PAGE_TYPES,
  PUBLISHER_LABELS,
  areaLabel,
  coverageByArea,
  factKinds,
  intervalInWords,
  labelFor,
  listSentence,
  plural,
  precedenceExample,
  recordStanding,
  sourceKinds,
} from './how-we-check.mjs';
import { deriveClaimState, indexEvidenceByClaim, publisherRank } from './claim-state.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(HERE, '..', '..');
const PAGE = path.join(NEXT, 'src', 'pages', 'how-we-check.astro');
const CONTENT = path.join(NEXT, 'src', 'content');

const precedence = JSON.parse(
  readFileSync(path.join(NEXT, 'src', 'data', 'source-precedence.json'), 'utf8')
);

/** Read the live corpus. The page reads it too; nothing here is a fixture. */
function readCorpus(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json')) out.push(JSON.parse(readFileSync(full, 'utf8')));
    }
  };
  walk(path.join(CONTENT, dir));
  return out;
}

const claims = readCorpus('claims');
const evidence = readCorpus('evidence');

/** Entry counts the way the page gets them: by the declared directories. */
function entryCounts() {
  const counts = {};
  const walk = (at) => {
    let n = 0;
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (entry.isDirectory()) n += walk(path.join(at, entry.name));
      else n += 1;
    }
    return n;
  };
  for (const directory of Object.values(COLLECTION_DIRECTORIES)) {
    counts[directory] = walk(path.join(CONTENT, directory));
  }
  return counts;
}

/** Every directory src/content.config.ts actually loads a collection from. */
function declaredDirectories() {
  const config = readFileSync(path.join(NEXT, 'src', 'content.config.ts'), 'utf8');
  return [...config.matchAll(/base:\s*'\.\/src\/content\/([^']+)'/g)].map((m) => m[1]);
}

/** The template half of the page: everything after the frontmatter fence. */
function readerCopy() {
  const source = readFileSync(PAGE, 'utf8');
  const end = source.indexOf('\n---', source.indexOf('---') + 3);
  assert.ok(end > 0, 'the page must have a frontmatter fence');
  return source.slice(end + 4);
}

/**
 * Drop every expression, braces balanced. A naive regex leaves the outer
 * fragments of a nested expression behind, and those fragments are code: the
 * '0' in `count > 0 && ...` is not a number a reader is shown.
 */
function stripExpressions(text) {
  let out = '';
  let depth = 0;
  for (const ch of text) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out;
}

// -- 1. every kind of fact reaches the page ---------------------------------

test('every kind of fact in the source order gets a row', () => {
  const rows = factKinds(precedence);
  const defined = Object.keys(precedence.classes);
  assert.equal(rows.length, defined.length);
  assert.deepEqual(new Set(rows.map((r) => r.id)), new Set(defined));
});

test('rows are ordered most perishable first', () => {
  const rows = factKinds(precedence);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i - 1].recheckDays <= rows[i].recheckDays,
      `${rows[i - 1].id} (${rows[i - 1].recheckDays}d) sorted before ${rows[i].id} (${rows[i].recheckDays}d)`
    );
  }
});

// -- 2. nothing reaches a reader as a machine token -------------------------

test('every source kind the table names has reader words', () => {
  for (const kind of precedence.publisherKinds) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(PUBLISHER_LABELS, kind),
      `publisher kind '${kind}' has no reader label; add one to PUBLISHER_LABELS`
    );
  }
});

test('every source kind used inside a class is one the table declares', () => {
  const declared = new Set(precedence.publisherKinds);
  for (const [id, entry] of Object.entries(precedence.classes)) {
    for (const kind of entry.precedence) {
      assert.ok(declared.has(kind), `${id} orders '${kind}', which publisherKinds does not declare`);
    }
  }
});

test('no label a reader sees is a machine token', () => {
  const tokenish = /[_]|-[a-z]/; // 'regional-body', 'venue-site', 'data-facts'
  for (const [kind, label] of Object.entries(PUBLISHER_LABELS)) {
    assert.ok(!tokenish.test(label), `the label for '${kind}' still reads as a token: ${label}`);
  }
  for (const row of factKinds(precedence)) {
    assert.ok(!tokenish.test(row.label), `the label for '${row.id}' reads as a token: ${row.label}`);
    for (const source of row.leadSources) {
      assert.ok(!tokenish.test(source), `a lead source on '${row.id}' reads as a token: ${source}`);
    }
  }
});

test('labelFor never returns the raw kind, even for one nobody declared', () => {
  const label = labelFor('some-kind-invented-later');
  assert.equal(label, PUBLISHER_LABELS.unknown);
  assert.ok(!/-/.test(label));
});

// -- 3. the printed order IS the table's order ------------------------------

test('the sources named first are the table\'s own first sources, in order', () => {
  for (const row of factKinds(precedence)) {
    const order = precedence.classes[row.id].precedence;
    for (let i = 0; i < row.leadSources.length; i++) {
      assert.equal(
        row.leadSources[i],
        labelFor(order[i]),
        `${row.id} names '${row.leadSources[i]}' at position ${i}, the table says '${order[i]}'`
      );
    }
    // And the property a reader is actually being told: each named source
    // outranks the one after it for this kind of fact.
    for (let i = 1; i < row.sourceOrder.length; i++) {
      assert.ok(
        publisherRank(row.sourceOrder[i - 1], row.id, precedence) <
          publisherRank(row.sourceOrder[i], row.id, precedence),
        `${row.id}: '${row.sourceOrder[i - 1]}' does not outrank '${row.sourceOrder[i]}'`
      );
    }
  }
});

test('the source-kind list covers every kind and puts the absent one last', () => {
  const list = sourceKinds(precedence);
  assert.deepEqual(
    new Set(list.map((s) => s.kind)),
    new Set(precedence.publisherKinds)
  );
  assert.equal(list[list.length - 1].kind, 'unknown');
  assert.equal(list.length, new Set(list.map((s) => s.kind)).size, 'no kind is listed twice');
});

// -- 4. the worked example is true of the data ------------------------------

test('the worked example says something the table actually says', () => {
  const example = precedenceExample(precedence);
  assert.ok(example, 'the page prints a worked example, so one must be derivable');
  assert.ok(
    publisherRank(example.winner, example.claimClass, precedence) <
      publisherRank(example.loser, example.claimClass, precedence),
    'the example claims an ordering the table does not have'
  );
  assert.equal(example.winnerLabel, labelFor(example.winner));
  assert.equal(example.loserLabel, labelFor(example.loser));
});

test('the worked example withdraws itself rather than lying', () => {
  const flipped = structuredClone(precedence);
  const order = flipped.classes['event-status'].precedence;
  // Put the reseller first and the example is no longer true. It must vanish.
  flipped.classes['event-status'].precedence = [
    'ticketing',
    ...order.filter((k) => k !== 'ticketing'),
  ];
  assert.equal(precedenceExample(flipped), null);
  // A kind of fact that does not exist cannot produce an example either.
  assert.equal(precedenceExample(precedence, { claimClass: 'not-a-fact-kind' }), null);
  // Nor can one whose order does not mention the source being compared.
  assert.equal(precedenceExample(precedence, { over: 'not-a-source' }), null);
});

// -- 5. the interval words are the table's intervals ------------------------

test('every kind of fact gets an interval in words, from its own entry', () => {
  for (const row of factKinds(precedence)) {
    const declared = precedence.classes[row.id].expiryDays ?? precedence.defaultExpiryDays;
    assert.equal(row.recheckDays, declared);
    assert.ok(row.recheck, `${row.id} has no interval in words`);
    assert.notEqual(row.recheck.trim(), '');
  }
});

test('an interval nobody anticipated still reads as something', () => {
  assert.equal(intervalInWords(90), 'three months');
  assert.equal(intervalInWords(47), '47 days');
  assert.equal(intervalInWords(0), null);
  assert.equal(intervalInWords(-5), null);
  assert.equal(intervalInWords('soon'), null);
});

// -- 6. the standing figures are derived, and add up ------------------------

test('every source is counted exactly once, as current, lapsed or replaced', () => {
  const s = recordStanding(claims, evidence, { precedence });
  assert.equal(s.sources, evidence.length);
  assert.equal(s.current + s.lapsed + s.replaced, s.sources);
  assert.equal(s.facts, claims.length);
});

test('the disputed figure is the one claim-state derives, not a second opinion', () => {
  const byClaim = indexEvidenceByClaim(evidence);
  const now = new Date();
  const expected = claims.filter(
    (c) => deriveClaimState(c, byClaim.get(c.claimId) ?? [], { now, precedence }) === 'disputed'
  ).length;
  assert.equal(recordStanding(claims, evidence, { now, precedence }).disputed, expected);
});

test('a source cannot become current again by the clock moving forward', () => {
  const early = recordStanding(claims, evidence, { now: '2026-01-01', precedence });
  const late = recordStanding(claims, evidence, { now: '2036-01-01', precedence });
  assert.ok(late.current <= early.current, 'time passing made sources fresher');
  assert.equal(late.current, 0, 'ten years on, nothing on file can still be inside its window');
});

test('a record with nothing on file reports nothing on file', () => {
  const s = recordStanding([], [], { precedence });
  assert.deepEqual(
    { facts: s.facts, sources: s.sources, current: s.current, areas: s.areas },
    { facts: 0, sources: 0, current: 0, areas: [] }
  );
});

// -- 7. no part of the record leaves the table unnoticed --------------------

test('every part of the site in the record is a page directory, or declared not to be', () => {
  const dirs = new Set(Object.values(COLLECTION_DIRECTORIES));
  for (const type of new Set(claims.map((c) => c.subject?.type).filter(Boolean))) {
    assert.ok(
      dirs.has(type) || NON_PAGE_TYPES.includes(type) || INTERNAL_TYPES.includes(type),
      `the record holds facts about '${type}', which is neither a directory nor in NON_PAGE_TYPES`
    );
  }
});

test('a part of the site cannot be added and left off the coverage table', () => {
  const mapped = new Set(Object.values(COLLECTION_DIRECTORIES));
  for (const directory of declaredDirectories()) {
    assert.ok(
      mapped.has(directory) || INTERNAL_TYPES.includes(directory),
      `src/content.config.ts loads '${directory}', which the coverage table neither counts nor declares internal`
    );
  }
  const declared = new Set(declaredDirectories());
  for (const directory of mapped) {
    assert.ok(declared.has(directory), `the coverage table counts '${directory}', which no collection loads`);
  }
});

test('every part of the site a reader can open has reader words', () => {
  for (const directory of Object.values(COLLECTION_DIRECTORIES)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(AREA_LABELS, directory),
      `'${directory}' has no reader label; add one to AREA_LABELS`
    );
    assert.notEqual(areaLabel(directory), directory);
  }
});

test('the coverage table includes the parts with nothing on file', () => {
  const standing = recordStanding(claims, evidence, { precedence });
  const sizes = entryCounts();
  const rows = coverageByArea(standing, sizes);
  for (const [type, count] of Object.entries(sizes)) {
    if (!count || INTERNAL_TYPES.includes(type)) continue;
    assert.ok(rows.some((r) => r.type === type), `'${type}' is missing from the coverage table`);
  }
  for (const row of rows) {
    assert.ok(row.withSources <= row.records, `${row.type} claims more covered than it has`);
    assert.ok(!INTERNAL_TYPES.includes(row.type));
  }
});

test('coverage never reports more than is on file', () => {
  const standing = { areas: [{ type: 'venues', label: 'Places', facts: 9, subjects: 3 }] };
  const rows = coverageByArea(standing, { venues: 141, articles: 221, claims: 500 });
  assert.deepEqual(
    rows.map((r) => [r.type, r.records, r.withSources]),
    [['articles', 221, 0], ['venues', 141, 3]]
  );
});

// -- 8. the page speaks English ---------------------------------------------

test('the page carries none of our vocabulary into reader copy', () => {
  // These are words for the people who build this, not for the people who
  // read it. James's standing note on inherited developer jargon is the
  // reason, and a page about being trusted is the worst place to break it.
  const OURS = ['schema', 'lint', 'gate', 'ratchet', 'collection', 'registry'];
  const copy = readerCopy();
  const prose = copy
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .toLowerCase();
  for (const word of OURS) {
    const at = new RegExp(`\\b${word}\\w*`).exec(prose);
    assert.equal(at, null, `reader copy on /how-we-check/ uses '${at?.[0]}'`);
  }
});

test('the page states no fixed count of its own', () => {
  // Any figure about the record has to come from the derivation, never from
  // a number typed into the template, because a typed number is exactly the
  // claim that goes quietly stale. Ordinals and years are not counts.
  const prose = stripExpressions(
    readerCopy()
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
  );
  const digits = prose.match(/\b\d[\d,]*\b/g) ?? [];
  assert.deepEqual(digits, [], `a count is typed into the page: ${digits.join(', ')}`);
});

test('the page links the reader somewhere they can act', () => {
  const copy = readerCopy();
  assert.match(copy, /href="\/corrections\/"/, 'the corrections route must be reachable from here');
  assert.match(copy, /href="\/editorial-approach\/"/, 'the judgement half must be reachable too');
});

// -- small helpers ----------------------------------------------------------

test('a derived list still reads as a sentence', () => {
  assert.equal(listSentence([]), '');
  assert.equal(listSentence(['one thing']), 'one thing');
  assert.equal(listSentence(['one', 'two']), 'one and two');
  assert.equal(listSentence(['one', 'two', 'three']), 'one, two and three');
  assert.equal(listSentence(['one', null, 'two']), 'one and two');
  assert.equal(listSentence(undefined), '');
});

test('plural reads as a sentence', () => {
  assert.equal(plural(1, 'fact'), 'fact');
  assert.equal(plural(0, 'fact'), 'facts');
  assert.equal(plural(2, 'fact'), 'facts');
  assert.equal(plural(1, 'has', 'have'), 'has');
  assert.equal(plural(3, 'has', 'have'), 'have');
});
