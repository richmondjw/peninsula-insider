/**
 * media-rights.test.mjs - the rules of PI-013, not today's numbers.
 *
 * WHY NOT A SINGLE COUNT IS ASSERTED HERE
 * ---------------------------------------
 * Four tests have been removed from this repository for wiring something
 * time-driven into the build, and a test that asserts "176 records are covered"
 * is the same mistake in a different costume: it fails the moment somebody
 * writes an article, which is a content change rather than a defect, and the
 * team learns to update the number without reading why it moved. The counts
 * live in the committed report and the ratchets live in
 * audit-media-provenance.mjs, which is built for exactly that job.
 *
 * What is asserted here is behaviour that must hold on any corpus:
 *
 *   the parser reports what it cannot read rather than dropping it
 *   a licence is never matched loosely, by substring or across hosts
 *   a record confessing that it does not know is not a record disputing
 *   `credit` never counts as provenance
 *   the planner refuses every case where a value would be guessed
 *   an occupied field is never overwritten
 *   the rights date is the one the caller supplied, and nothing reads a clock
 *   the dry run does not write, and the confirmed run does
 *   the planner cannot write, structurally, whatever the driver does
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

import { parseLicences, bucketFor, hostOf, srcForFilename } from './media-rights/licences.mjs';
import { compareField, reconcileRecord, reconcileCorpus, sharedHeroes } from './media-rights/reconcile.mjs';
import { planFields, planRecord, writeIntoFrontmatter, writeIntoJson, yamlScalar } from './media-rights/plan.mjs';
import { licenceId, compareLicence, compareCreator, commonsTitle, readCommonsResponse, plainText } from './media-rights/sources.mjs';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* The parser reports rather than repairs                              */
/* ------------------------------------------------------------------ */

const GOOD = [
  '# heading prose the parser ignores',
  '',
  '## place-example-01.webp',
  '- **Source:** A pier at dawn',
  '- **Photographer:** A Person',
  '- **Licence:** CC-BY-SA-4.0',
  '- **Original:** https://commons.wikimedia.org/wiki/File:Example.jpg',
  '- **Used on:** /places/example/',
  '',
].join('\n');

test('an entry is read into every field it states', () => {
  const { entries, anomalies } = parseLicences(GOOD);
  assert.equal(entries.length, 1);
  assert.deepEqual(
    {
      filename: entries[0].filename,
      src: entries[0].src,
      depicts: entries[0].depicts,
      creator: entries[0].creator,
      permission: entries[0].permission,
      sourceUrl: entries[0].sourceUrl,
      usageNote: entries[0].usageNote,
      bucket: entries[0].bucket,
    },
    {
      filename: 'place-example-01.webp',
      src: '/images/sourced/place-example-01.webp',
      depicts: 'A pier at dawn',
      creator: 'A Person',
      permission: 'CC-BY-SA-4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
      usageNote: '/places/example/',
      bucket: 'wikimedia-cc-by-sa',
    }
  );
  assert.deepEqual(anomalies, []);
});

test('a bullet the parser cannot read becomes an anomaly and is never dropped in silence', () => {
  const { anomalies } = parseLicences(`${GOOD}- Licence: CC-BY-4.0\n`);
  assert.ok(anomalies.some((a) => a.kind === 'unreadable-line'));
});

test('a label the parser does not know is reported rather than guessed at', () => {
  const { entries, anomalies } = parseLicences(
    ['## a.webp', '- **Rights holder:** Someone', '- **Licence:** CC0 (Public Domain)'].join('\n')
  );
  assert.ok(anomalies.some((a) => a.kind === 'unknown-label' && a.text === 'Rights holder'));
  assert.equal(entries[0].rightsHolder, undefined);
});

test('an entry missing a photographer, a licence or an original is reported as missing', () => {
  const { anomalies } = parseLicences(['## a.webp', '- **Source:** Something'].join('\n'));
  const missing = anomalies.filter((a) => a.kind === 'missing-field').map((a) => a.text).sort();
  assert.deepEqual(missing, ['creator', 'permission', 'sourceUrl']);
});

test('the same filename twice is reported, and neither entry is discarded', () => {
  const { entries, anomalies } = parseLicences(
    ['## a.webp', '- **Licence:** CC0 (Public Domain)', '## a.webp', '- **Licence:** CC-BY-4.0'].join('\n')
  );
  assert.equal(entries.length, 2);
  assert.ok(anomalies.some((a) => a.kind === 'duplicate-heading'));
});

test('a second bullet with the same label does not overwrite the first statement of a right', () => {
  const { entries } = parseLicences(
    ['## a.webp', '- **Licence:** CC-BY-4.0', '- **Licence:** CC-BY-SA-4.0'].join('\n')
  );
  assert.equal(entries[0].permission, 'CC-BY-4.0');
});

test('a bullet before any heading is an orphan, not an entry', () => {
  const { entries, anomalies } = parseLicences('- **Licence:** CC-BY-4.0\n');
  assert.equal(entries.length, 0);
  assert.equal(anomalies[0].kind, 'orphan-line');
});

/* ------------------------------------------------------------------ */
/* A licence is never matched loosely                                  */
/* ------------------------------------------------------------------ */

test('a licence bucket needs the exact string and the matching host', () => {
  const commons = 'https://commons.wikimedia.org/wiki/File:X.jpg';
  assert.equal(bucketFor('CC-BY-SA-4.0', commons), 'wikimedia-cc-by-sa');
  assert.equal(bucketFor('CC-BY-SA-4.0', 'https://example.com/photo'), null, 'wrong host must not match');
  assert.equal(bucketFor('CC-BY-SA-4.0 or later', commons), null, 'a longer string is a different claim');
  assert.equal(bucketFor('cc-by-sa-4.0', commons), null, 'the match is exact, not case-folded');
  assert.equal(bucketFor('', commons), null);
  assert.equal(bucketFor('CC-BY-SA-4.0', null), null, 'no source URL establishes no host');
});

test('no bucket in the table asserts a grant made to this publication', () => {
  const forbidden = new Set(['venue-media-kit', 'visit-victoria', 'original-commissioned']);
  const commons = 'https://commons.wikimedia.org/wiki/File:X.jpg';
  for (const text of ['CC0 (Public Domain)', 'CC-BY-2.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0']) {
    assert.ok(!forbidden.has(bucketFor(text, commons)));
  }
});

test('a source URL that is not a URL has no host and no bucket', () => {
  assert.equal(hostOf('not a url'), null);
  assert.equal(srcForFilename('a.webp', '/images/sourced/'), '/images/sourced/a.webp');
});

/* ------------------------------------------------------------------ */
/* Reconciliation                                                      */
/* ------------------------------------------------------------------ */

const entryFor = (over = {}) => ({
  filename: 'a.webp',
  src: '/images/sourced/a.webp',
  depicts: 'A pier',
  creator: 'A Person',
  permission: 'CC-BY-SA-4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  usageNote: null,
  bucket: 'wikimedia-cc-by-sa',
  line: 1,
  ...over,
});

const recordFor = (image, over = {}) => ({
  file: 'venues/a.json',
  collection: 'venues',
  field: 'heroImage',
  image: { src: '/images/sourced/a.webp', alt: 'alt', credit: 'Peninsula Insider', ...image },
  ...over,
});

test('the file knowing something the record does not is file-only', () => {
  const row = reconcileRecord(recordFor({}), entryFor());
  assert.equal(row.verdict, 'file-only');
});

test('two different specific grants is a conflict', () => {
  const row = reconcileRecord(recordFor({ license: 'venue-media-kit' }), entryFor());
  assert.equal(row.verdict, 'conflict');
});

test('a record holding a licence that asserts no grant is confessing, not disputing', () => {
  for (const held of ['unknown', 'other-licensed', 'tmp-wikimedia', 'tmp-unsplash', 'tmp-pexels']) {
    const row = reconcileRecord(recordFor({ license: held }), entryFor());
    assert.equal(row.verdict, 'placeholder', `${held} must not be read as a competing grant`);
  }
});

test('a non-asserting licence with no entry is nobody knowing, not the record knowing', () => {
  assert.equal(compareField('license', null, 'tmp-wikimedia').verdict, 'neither');
  assert.equal(compareField('license', null, 'venue-media-kit').verdict, 'record-only');
});

test('a credit is never provenance, however confident it sounds', () => {
  const row = reconcileRecord(recordFor({ credit: 'Peninsula Insider' }), null);
  assert.equal(row.verdict, 'neither');
  assert.ok(!row.fields.some((f) => f.field === 'credit'));
});

test('a different description of the same photograph is not a conflict about a right', () => {
  const row = reconcileRecord(
    recordFor({ license: 'wikimedia-cc-by-sa', depicts: 'a timber pier at low tide' }),
    entryFor()
  );
  assert.notEqual(row.verdict, 'conflict');
  assert.equal(row.depicts.verdict, 'conflict', 'the difference is still reported, just not as a right');
});

test('the state of a record is the worst thing found on it', () => {
  const row = reconcileRecord(recordFor({ license: 'venue-media-kit', creator: 'A Person' }), entryFor());
  assert.equal(row.verdict, 'conflict');
});

test('the file disagreeing with itself about one URL is reported', () => {
  const { fileSelfConflicts } = reconcileCorpus({
    records: [],
    entries: [entryFor({ filename: 'a.webp' }), entryFor({ filename: 'b.webp', creator: 'Someone Else' })],
  });
  assert.equal(fileSelfConflicts.length, 1);
  assert.equal(fileSelfConflicts[0].field, 'creator');
});

test('an entry no record uses is counted separately from an entry that covers records', () => {
  const { totals } = reconcileCorpus({
    records: [recordFor({})],
    entries: [entryFor(), entryFor({ filename: 'unused.webp', src: '/images/sourced/unused.webp' })],
  });
  assert.equal(totals.licenceEntries, 2);
  assert.equal(totals.entriesMatchingNoRecord, 1);
  assert.equal(totals.recordsTheFileCanSpeakTo, 1);
});

test('a shared hero is one image counted once and the entities counted each', () => {
  const records = [
    recordFor({}, { file: 'venues/one.json' }),
    recordFor({}, { file: 'venues/two.json' }),
    recordFor({ src: '/images/sourced/solo.webp' }, { file: 'venues/three.json' }),
  ];
  const { totals } = sharedHeroes({ records, entries: [entryFor()], collections: ['venues'] });
  assert.equal(totals.distinctImages, 2);
  assert.equal(totals.sharedImages, 1);
  assert.equal(totals.entitiesOnSharedImages, 2);
  assert.equal(totals.sharedImagesCovered, 1);
});

/* ------------------------------------------------------------------ */
/* What the source said                                                */
/* ------------------------------------------------------------------ */

test('two spellings of one licence are one licence, and two licences are not', () => {
  assert.equal(compareLicence('CC-BY-SA-4.0', 'CC BY-SA 4.0'), 'matches');
  assert.equal(compareLicence('CC-BY-SA-3.0', 'CC BY-SA 4.0'), 'differs');
  assert.equal(compareLicence('CC-BY-4.0', 'CC BY-SA 4.0'), 'differs', 'share-alike is a different grant');
  assert.equal(licenceId('CC BY-SA 4.0'), 'cc-by-sa-4.0');
  assert.equal(licenceId('CC BY 4.0'), 'cc-by-4.0');
});

test('nothing is comparable when either side named no licence', () => {
  assert.equal(compareLicence('CC-BY-4.0', null), 'not-comparable');
  assert.equal(compareLicence(null, 'CC BY 4.0'), 'not-comparable');
  assert.equal(compareLicence('Some bespoke grant', 'CC BY 4.0'), 'not-comparable');
});

test('a photographer is only corroborated positively, never contradicted by this comparison', () => {
  assert.equal(compareCreator('Simon Yeo', 'Simon Yeo'), 'exact');
  assert.equal(compareCreator('Sarah Stierch (Missvain)', 'Sarah Stierch'), 'contains');
  assert.equal(compareCreator('Prateek.agarwal44', 'Slyronit'), 'not-established');
  assert.equal(compareCreator('A Person', null), 'not-established');
});

test('a Commons file page is recognised and anything else is not', () => {
  assert.equal(
    commonsTitle('https://commons.wikimedia.org/wiki/File:Portsea_beaches.jpg'),
    'File:Portsea beaches.jpg'
  );
  assert.equal(commonsTitle('https://unsplash.com/photos/abc'), null);
  assert.equal(commonsTitle('https://commons.wikimedia.org/wiki/Main_Page'), null);
});

test('a batched Commons answer is matched back to the title that was asked for', () => {
  const body = {
    query: {
      normalized: [{ from: 'File:A b.jpg', to: 'File:A b.jpg' }],
      pages: [
        {
          title: 'File:A b.jpg',
          imageinfo: [
            {
              extmetadata: {
                LicenseShortName: { value: 'CC BY-SA 4.0' },
                Artist: { value: '<a href="/wiki/User:X">X</a>' },
              },
            },
          ],
        },
      ],
    },
  };
  const read = readCommonsResponse(body, ['File:A b.jpg', 'File:Never asked.jpg']);
  assert.equal(read.get('File:A b.jpg').licence, 'CC BY-SA 4.0');
  assert.equal(read.get('File:A b.jpg').artist, 'X');
  assert.equal(read.has('File:Never asked.jpg'), false, 'silence is not an answer about a file');
  assert.equal(plainText('<b>a</b>&nbsp;b'), 'a b');
});

test('a file the API says is missing is not the same as a file the API did not mention', () => {
  const missing = readCommonsResponse({ query: { pages: [{ title: 'File:A.jpg', missing: true }] } }, ['File:A.jpg']);
  assert.equal(missing.get('File:A.jpg').found, false);
  const silent = readCommonsResponse({ query: { pages: [] } }, ['File:A.jpg']);
  assert.equal(silent.has('File:A.jpg'), false);
});

/* ------------------------------------------------------------------ */
/* The planner refuses everything it would have to guess               */
/* ------------------------------------------------------------------ */

const OK_LEDGER = {
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  verdict: 'ok',
  sourceLicence: 'CC BY-SA 4.0',
  sourceCreator: 'A Person',
  licenceAgrees: 'matches',
  creatorAgrees: 'exact',
};

const plan = (over = {}) =>
  planFields({
    image: { src: '/images/sourced/a.webp', alt: 'alt', credit: 'Peninsula Insider' },
    entry: entryFor(),
    ledgerRow: OK_LEDGER,
    checkedOn: '2026-09-14',
    ...over,
  });

test('a plan without a check date is refused, and there is no default', () => {
  assert.equal(plan({ checkedOn: null }).code, 'no-check-date');
  assert.equal(plan({ checkedOn: '14 September 2026' }).code, 'no-check-date');
  assert.equal(plan({ checkedOn: '' }).code, 'no-check-date');
});

test('a source nobody has fetched is refused', () => {
  assert.equal(plan({ ledgerRow: null }).code, 'unprobed-source');
});

test('a source the ledger could not reach is refused', () => {
  for (const verdict of ['dead', 'blocked', 'moved', 'unknown']) {
    assert.equal(plan({ ledgerRow: { ...OK_LEDGER, verdict } }).code, 'source-unreachable');
  }
});

test('a source that names a different grant from the file is refused, and never resolved by the machine', () => {
  const refusal = plan({
    ledgerRow: { ...OK_LEDGER, licenceAgrees: 'differs', sourceLicence: 'CC BY-SA 4.0' },
  });
  assert.equal(refusal.code, 'source-contradicts-file');
});

test('a source that named no readable licence establishes nothing and is refused', () => {
  assert.equal(plan({ ledgerRow: { ...OK_LEDGER, licenceAgrees: 'not-comparable' } }).code, 'licence-not-established');
});

test('a photographer the source does not corroborate is refused', () => {
  assert.equal(plan({ ledgerRow: { ...OK_LEDGER, creatorAgrees: 'not-established' } }).code, 'creator-not-corroborated');
});

test('a licence line that maps to no schema bucket is refused', () => {
  assert.equal(plan({ entry: entryFor({ bucket: null }) }).code, 'no-bucket');
});

test('a record already naming a different specific grant is refused for a person', () => {
  const refusal = plan({
    image: { src: '/images/sourced/a.webp', license: 'venue-media-kit' },
  });
  assert.equal(refusal.code, 'record-holds-another-grant');
});

test('a record that already says its rights are recorded is never overwritten by a batch', () => {
  const refusal = plan({
    image: { src: '/images/sourced/a.webp', rightsStatus: 'recorded', creator: 'Someone' },
  });
  assert.equal(refusal.code, 'rights-already-recorded');
});

test('a placeholder licence may be replaced by a grant, a real one may not', () => {
  for (const held of ['unknown', 'other-licensed', 'tmp-wikimedia', 'tmp-unsplash', 'tmp-pexels']) {
    const result = plan({ image: { src: '/images/sourced/a.webp', license: held } });
    assert.equal(result.ok, true, `${held} should be replaceable`);
    assert.ok(result.writes.some((w) => w.field === 'license' && w.to === 'wikimedia-cc-by-sa'));
  }
  assert.equal(plan({ image: { src: '/images/sourced/a.webp', license: 'wikimedia-cc-by' } }).code, 'record-holds-another-grant');
});

test('an occupied field is never overwritten, only an empty one is filled', () => {
  const result = plan({
    image: {
      src: '/images/sourced/a.webp',
      creator: 'Somebody Corrected This By Hand',
      depicts: 'a description somebody wrote',
    },
  });
  assert.equal(result.ok, true);
  assert.ok(!result.writes.some((w) => w.field === 'creator'));
  assert.ok(!result.writes.some((w) => w.field === 'depicts'));
  assert.ok(result.writes.some((w) => w.field === 'sourceUrl'));
});

test('a record with nothing left to fill is refused rather than stamped as recorded', () => {
  const result = plan({
    image: {
      src: '/images/sourced/a.webp',
      creator: 'A Person',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
      permission: 'CC-BY-SA-4.0',
      depicts: 'A pier',
      license: 'wikimedia-cc-by-sa',
    },
  });
  assert.equal(result.code, 'nothing-to-write');
});

test('the rights date is the date the caller supplied and never any other date', () => {
  // Two runs differing only in the supplied date must differ only in the stamp.
  // That is the rule: the date is an input, not something the planner sources.
  const stampFor = (checkedOn) =>
    plan({ checkedOn }).writes.find((w) => w.field === 'rightsEstablishedOn').to;
  assert.equal(stampFor('2025-01-02'), '2025-01-02');
  assert.equal(stampFor('2031-12-31'), '2031-12-31');

  // And nothing else in the writes carries a date at all, so neither the file's
  // own 11 April 2026 heading nor anything else can arrive by another route.
  const dated = plan({ checkedOn: '2025-01-02' }).writes.filter(
    (w) => w.field !== 'rightsEstablishedOn' && /\d{4}-\d{2}-\d{2}/.test(String(w.to))
  );
  assert.deepEqual(dated, []);
});

test('the planner never writes a permitted use or a depiction status', () => {
  const result = plan();
  assert.ok(!result.writes.some((w) => w.field === 'permittedUses'));
  assert.ok(!result.writes.some((w) => w.field === 'depictionStatus'));
  assert.ok(!result.writes.some((w) => w.field === 'credit'));
  assert.ok(!result.writes.some((w) => w.field === 'alt'));
});

/* ------------------------------------------------------------------ */
/* Turning a plan into text                                            */
/* ------------------------------------------------------------------ */

const MD = [
  '---',
  'title: "A place"',
  'heroImage:',
  '  src: "/images/sourced/a.webp"',
  '  alt: "alt"',
  '  license: "tmp-wikimedia"',
  'tags: [one, two]',
  '---',
  '',
  'Body text stays exactly as it is.',
  '',
].join('\n');

test('frontmatter gains the new keys inside its own block and nothing else moves', () => {
  const after = writeIntoFrontmatter(MD, 'heroImage', [
    { field: 'license', to: 'wikimedia-cc-by-sa' },
    { field: 'creator', to: 'A Person' },
  ]);
  assert.match(after, /\n {2}license: "wikimedia-cc-by-sa"\n/);
  assert.match(after, /\n {2}creator: "A Person"\n/);
  assert.ok(!after.includes('tmp-wikimedia'));
  assert.match(after, /\ntags: \[one, two\]\n/, 'the sibling key keeps its place');
  assert.ok(after.endsWith('Body text stays exactly as it is.\n'), 'the body is untouched');
});

test('a block the record does not have is a refusal, not an invention', () => {
  assert.equal(writeIntoFrontmatter(MD, 'ogImage', [{ field: 'creator', to: 'X' }]), null);
  assert.equal(writeIntoFrontmatter('no frontmatter here', 'heroImage', []), null);
});

test('a quote or a backslash in a value is escaped rather than breaking the record', () => {
  assert.equal(yamlScalar('a "quoted" name'), '"a \\"quoted\\" name"');
  assert.equal(yamlScalar('back\\slash'), '"back\\\\slash"');
  const after = writeIntoFrontmatter(MD, 'heroImage', [{ field: 'creator', to: 'A "Nickname" Person' }]);
  assert.match(after, /creator: "A \\"Nickname\\" Person"/);
});

test('a JSON record keeps its own indentation and gains only the planned fields', () => {
  const before = `{\n  "slug": "a",\n  "heroImage": {\n    "src": "/images/sourced/a.webp",\n    "alt": "alt"\n  }\n}\n`;
  const after = writeIntoJson(before, 'heroImage', [{ field: 'creator', to: 'A Person' }]);
  assert.match(after, /\n {4}"creator": "A Person"\n/);
  assert.match(after, /"slug": "a"/);
  assert.ok(after.endsWith('}\n'));
});

test('a plan produces a diff that only contains the change', () => {
  const result = planRecord({
    record: { field: 'heroImage', image: { src: '/images/sourced/a.webp', license: 'tmp-wikimedia' }, text: MD },
    entry: entryFor(),
    ledgerRow: OK_LEDGER,
    checkedOn: '2026-09-14',
    recordPath: 'next/src/content/articles/a.md',
  });
  assert.equal(result.ok, true);
  const added = result.diff.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++'));
  assert.ok(added.every((line) => /^\+ {2}\w+: /.test(line)), 'only image fields are added');
  assert.ok(!result.diff.includes('Body text'), 'the body is not in the patch');
});

/* ------------------------------------------------------------------ */
/* The apply path cannot write by accident                             */
/* ------------------------------------------------------------------ */

test('the planner imports no filesystem and reads no clock, asserted from its own source', async () => {
  const source = await readFile(path.join(HERE, 'media-rights', 'plan.mjs'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/from '(node:)?fs/.test(code), 'plan.mjs must not import a filesystem');
  assert.ok(!/require\(\s*['"](node:)?fs/.test(code));
  assert.ok(!/writeFile|createWriteStream|appendFile/.test(code));
  assert.ok(!/Date\.now|new Date\(/.test(code), 'plan.mjs must not read a clock');
});

test('the reconciler and the parser read no clock either', async () => {
  for (const file of ['media-rights/licences.mjs', 'media-rights/reconcile.mjs']) {
    const source = await readFile(path.join(HERE, file), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/Date\.now|new Date\(/.test(code), `${file} must not read a clock`);
    assert.ok(!/from '(node:)?fs/.test(code), `${file} must not import a filesystem`);
  }
});

/**
 * The behavioural half of the same rule. A structural assertion proves the
 * planner cannot write; only running the command proves the driver does not
 * write until it is told twice.
 */
test('the dry run changes nothing on disk, and the confirmed run changes exactly the planned fields', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pi013-'));
  const content = path.join(root, 'content');
  await mkdir(path.join(content, 'articles'), { recursive: true });
  const record = path.join(content, 'articles', 'a.md');
  await writeFile(record, MD, 'utf8');

  const licences = path.join(root, 'LICENSES.md');
  await writeFile(
    licences,
    [
      '## a.webp',
      '- **Source:** A pier',
      '- **Photographer:** A Person',
      '- **Licence:** CC-BY-SA-4.0',
      '- **Original:** https://commons.wikimedia.org/wiki/File:X.jpg',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = path.join(root, 'ledger.json');
  await writeFile(ledger, JSON.stringify({ probedOn: '2026-09-14', rows: [OK_LEDGER] }), 'utf8');

  const patch = path.join(root, 'out.patch');
  const base = [
    path.join(HERE, 'apply-image-rights.mjs'),
    '--licences', licences,
    '--content-dir', content,
    '--ledger', ledger,
    '--patch', patch,
    '--checked-on', '2025-03-04',
    '--checked-by', 'a test',
  ];

  await run(process.execPath, base);
  assert.equal(await readFile(record, 'utf8'), MD, 'a dry run must leave the record byte for byte');
  assert.match(await readFile(patch, 'utf8'), /^# PI-013 image rights backfill/, 'and must still produce a patch');

  await run(process.execPath, [...base, '--confirm']);
  const after = await readFile(record, 'utf8');
  assert.notEqual(after, MD);
  assert.match(after, /rightsEstablishedOn: "2025-03-04"/, 'the supplied date, not today');
  assert.match(after, /rightsStatus: "recorded"/);
  assert.match(after, /creator: "A Person"/);
  assert.ok(after.endsWith('Body text stays exactly as it is.\n'));
});

test('the apply path refuses to run at all without a date and a name on it', async () => {
  const result = await run(process.execPath, [path.join(HERE, 'apply-image-rights.mjs')]).catch((error) => error);
  assert.equal(result.code, 2);
  assert.match(result.stdout, /Refusing to run/);
});
