#!/usr/bin/env node
/**
 * audit-media-provenance.mjs - the illustrative-image disclosure gate.
 *
 * Evidence item A28, confirmed: named venues are illustrated with
 * representative third-party photographs, and the reader sees no disclosure.
 * The example found was a bistro whose lead image is a photograph of bathing
 * boxes; its alt text says so, accurately, and a sighted reader never
 * receives alt text. Alt text serves screen-reader users. It is not a
 * disclosure, and this script exists partly to stop the two being confused.
 *
 * Evidence item A29 is the companion discipline: credits and source filenames
 * do not establish a licence. `credit` is display text. On 2026-07-28 the
 * media debt report listed dozens of records crediting "Peninsula Insider" on
 * images licensed `other-licensed`. So no metric here treats a credit, a
 * filename or an alt string as provenance, and two of the gated metrics exist
 * specifically to stop a rights claim being asserted from nothing.
 *
 * What is measured, and what each metric is for:
 *
 *   illustrativeWithoutDisclosure   An image explicitly marked illustrative,
 *                                   on a collection whose reader-facing
 *                                   surfaces do not render
 *                                   MediaProvenanceNote. This is the headline
 *                                   gate: a marked image that discloses
 *                                   nothing to a sighted reader is the exact
 *                                   A28 failure, now in machine-checkable
 *                                   form. Zero today because nothing is
 *                                   marked yet - armed empty, deliberately,
 *                                   the same shape as the disclosure tripwire
 *                                   in audit-commercial-firewall.mjs.
 *
 *   actualWithoutProvenance         A record asserting `depictionStatus:
 *                                   "actual"` - a positive claim that the
 *                                   photograph shows the entity - while
 *                                   recording no creator, source or
 *                                   permission. An assertion with nothing
 *                                   behind it.
 *
 *   permittedUseWithoutPermission   A record listing permitted channels while
 *                                   recording no permission they could come
 *                                   from. A29 in one line.
 *
 *   invalidDepictionStatus          A status string outside the three the
 *                                   schema allows. lib/media-provenance.ts
 *                                   reads anything unrecognised as
 *                                   `unverified`, which is the safe direction
 *                                   but silent, so a typo would quietly
 *                                   disarm a disclosure. Caught here instead.
 *
 *   undisclosedRepresentativeAlt    An image whose own alt text already says
 *                                   "representative" while carrying no
 *                                   depictionStatus. This is the inherited
 *                                   A28 debt, and the ratchet is seeded at
 *                                   today's real count so it can shrink but
 *                                   never grow. Adding another undisclosed
 *                                   representative image fails the build; the
 *                                   fix is to record the status, which turns
 *                                   the disclosure on.
 *
 *   unrecordedDepiction             Report-only. Named-entity images with no
 *                                   depictionStatus at all. This is most of
 *                                   the corpus and it is not a defect an
 *                                   author introduced, it is work nobody has
 *                                   done yet. Gating it would block every
 *                                   deploy over inherited debt.
 *
 * NOTHING HERE IS TIME-DRIVEN, and that is deliberate. audit-event-safeguards
 * .mjs documents why: its `staleVerificationDate` metric climbs with the
 * calendar, so asserting on it would have wired the passage of time into
 * `npm run build` and blocked every deploy from a fixed date onward without a
 * single content change. Every metric in this script is a count of records
 * that are wrong right now and can be made right by editing a record. No
 * metric moves because a day passed.
 *
 * The gate reads records as they sit ON DISK, not as the schema parses them.
 * That matters: `depictionStatus` has a schema default of `unverified`, so a
 * parsed record can never report "unrecorded". On disk, absent means absent,
 * which is the distinction the whole audit turns on.
 *
 * Report-only by default. `--assert` compares against the ratchet baseline in
 * ops/reports/media/media-provenance-baseline.json and exits 1 on regression,
 * matching the contract audit-event-safeguards.mjs, audit-link-graph.mjs and
 * audit-content-schema-drift.mjs use. Seeded from the real corpus, so it can
 * never be satisfied by making the corpus worse and never blocks a deploy
 * over debt it inherited. Tighten the baseline as images are reviewed.
 *
 * Usage:
 *   node scripts/audit-media-provenance.mjs [--json out.json] [--assert]
 *                                           [--baseline path]
 *                                           [--update-baseline]
 *                                           [--project-root path] [--verbose]
 *
 * --project-root points at the Astro project whose src/content and src/
 * surfaces are audited. Only a test harness passes it; production callers
 * audit the real corpus.
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');
const DEFAULT_BASELINE = path.join(REPO, 'ops', 'reports', 'media', 'media-provenance-baseline.json');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const BASELINE = path.resolve(getArg('--baseline', DEFAULT_BASELINE));
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');
const VERBOSE = args.includes('--verbose');
const PROJECT_ROOT = path.resolve(getArg('--project-root', NEXT));

const CONTENT_DIR = path.join(PROJECT_ROOT, 'src', 'content');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

/** The component whose presence on a surface counts as a rendered disclosure. */
const DISCLOSURE_COMPONENT = 'MediaProvenanceNote';

/** The three statuses the schema allows. Anything else is a typo. */
const VALID_STATUS = new Set(['actual', 'illustrative', 'unverified']);

/**
 * Collections whose pages name a specific real place or business. An
 * illustrative image matters most here: a reader on a page titled with a
 * venue's name reasonably reads the photograph as being of that venue.
 * Regions and articles carry images too, but they do not make that promise
 * in the same way.
 */
const NAMED_ENTITY_COLLECTIONS = new Set([
  'venues',
  'places',
  'experiences',
  'tour-operators',
  'tours',
  'tour-packages',
]);

/** Alt text that is already admitting the image is a stand-in. */
const REPRESENTATIVE_RE = /\brepresentative\b/i;

/**
 * Which metrics --assert may fail on.
 *
 * `unrecordedDepiction`, `imageRecords` and `namedEntityImages` are excluded:
 * the first is inherited debt nobody introduced, the other two are corpus
 * size, and a gate that fires when the site grows is a gate nobody keeps.
 */
const ASSERTED_METRICS = new Set([
  'illustrativeWithoutDisclosure',
  'actualWithoutProvenance',
  'permittedUseWithoutPermission',
  'invalidDepictionStatus',
  'brokenDisclosureSurface',
  'undisclosedRepresentativeAlt',
]);

// -- reading the corpus ----------------------------------------------------

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__' || entry.name === 'node_modules') continue;
      await walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * Pull the YAML frontmatter block out of a Markdown file.
 *
 * Parsed with a deliberately small hand-rolled reader rather than a YAML
 * dependency: all this audit needs is nested scalar blocks one level deep,
 * which is the shape every imageRef in the corpus takes.
 */
function frontmatterBlocks(text) {
  if (!text.startsWith('---')) return [];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [];
  const lines = text.slice(3, end).split(/\r?\n/);

  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i].match(/^(\s*)([A-Za-z0-9_]+):\s*$/);
    if (!header) continue;
    const indent = header[1].length;
    const block = {};
    for (let j = i + 1; j < lines.length; j += 1) {
      const field = lines[j].match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
      if (!field || field[1].length <= indent) break;
      block[field[2]] = field[3].trim().replace(/^['"]|['"]$/g, '');
    }
    if (typeof block.src === 'string') blocks.push({ field: header[2], image: block });
  }
  return blocks;
}

/** Recursively collect imageRef-shaped objects out of a parsed JSON record. */
function jsonBlocks(node, keyPath, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => jsonBlocks(item, `${keyPath}[${i}]`, out));
    return out;
  }
  if (!node || typeof node !== 'object') return out;

  const looksLikeImage =
    typeof node.src === 'string' &&
    (typeof node.alt === 'string' || typeof node.credit === 'string');
  if (looksLikeImage) out.push({ field: keyPath || '(root)', image: node });

  for (const [key, value] of Object.entries(node)) {
    jsonBlocks(value, keyPath ? `${keyPath}.${key}` : key, out);
  }
  return out;
}

async function readImageRecords() {
  const records = [];
  const files = await walk(CONTENT_DIR);

  for (const file of files) {
    const rel = path.relative(CONTENT_DIR, file).split(path.sep).join('/');
    const collection = rel.split('/')[0];
    const ext = path.extname(file);
    let blocks = [];

    if (ext === '.json') {
      let parsed;
      try {
        parsed = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        continue; // not a content record; validate-content.mjs owns malformed JSON
      }
      blocks = jsonBlocks(parsed, '', []);
    } else if (ext === '.md' || ext === '.mdx') {
      blocks = frontmatterBlocks(await readFile(file, 'utf8'));
    } else {
      continue;
    }

    for (const { field, image } of blocks) {
      records.push({ file: rel, collection, field, image });
    }
  }

  return records.sort((a, b) => a.file.localeCompare(b.file) || a.field.localeCompare(b.field));
}

// -- which collections actually render the disclosure ----------------------

/**
 * Which collection's reader-facing surface renders the disclosure, declared
 * rather than inferred.
 *
 * An earlier draft of this script inferred coverage by following imports and
 * reading every `getCollection(...)` call on a disclosing surface. That was
 * far too generous to be useful: the venue detail page also loads articles,
 * events, experiences and itineraries to build its related rails, so four
 * collections that render no disclosure anywhere were reported as covered. A
 * gate whose coverage test says yes when the answer is no is worse than no
 * gate, because it reads as reassurance.
 *
 * So coverage is declared here and then VERIFIED against the file: a surface
 * counts only if it still contains the component. Wiring a new collection
 * means adding the component to its template and adding the entry here, in
 * the same change. Removing the component from a declared surface un-covers
 * the collection, which is what `brokenDisclosureSurface` catches.
 */
const DISCLOSURE_SURFACES = {
  venues: ['src/components/VenueDetailTemplate.astro'],
  places: ['src/components/PlaceDetailTemplate.astro'],
  // Added when the 152 inherited representative-alt records were marked. All
  // three collections carry stand-in heroes; wiring only the two that already
  // had the component would have meant marking an experience or an article
  // illustrative and rendering nothing to the reader, which is the A28
  // failure with an extra field in it.
  experiences: ['src/pages/explore/[slug].astro'],
  articles: ['src/pages/journal/[slug].astro'],
};

/**
 * Confirm each declared surface still renders the component, and report the
 * collections that are genuinely covered.
 */
async function disclosureCoverage() {
  const covered = new Set();
  const broken = [];
  const surfaces = {};

  for (const [collection, files] of Object.entries(DISCLOSURE_SURFACES)) {
    let allPresent = files.length > 0;
    for (const rel of files) {
      let body = null;
      try {
        body = await readFile(path.join(PROJECT_ROOT, rel), 'utf8');
      } catch {
        body = null;
      }
      const renders = body !== null && body.includes(`<${DISCLOSURE_COMPONENT}`);
      (surfaces[collection] ??= []).push({ file: rel, renders });
      if (!renders) {
        allPresent = false;
        broken.push({ collection, file: rel, reason: body === null ? 'missing file' : 'component not rendered' });
      }
    }
    if (allPresent) covered.add(collection);
  }

  return { covered, surfaces, broken };
}

// -- the audit -------------------------------------------------------------

const filled = (value) => typeof value === 'string' && value.trim().length > 0;

async function main() {
  const records = await readImageRecords();
  const { covered, surfaces, broken } = await disclosureCoverage();

  const illustrativeWithoutDisclosure = [];
  const actualWithoutProvenance = [];
  const permittedUseWithoutPermission = [];
  const invalidDepictionStatus = [];
  const undisclosedRepresentativeAlt = [];
  const unrecordedDepiction = [];
  const illustrativeMarked = [];

  for (const rec of records) {
    const img = rec.image;
    const raw = img.depictionStatus;
    const recorded = filled(raw) ? raw.trim() : null;
    const named = NAMED_ENTITY_COLLECTIONS.has(rec.collection);
    const where = { file: rec.file, field: rec.field, src: img.src ?? null };

    if (recorded !== null && !VALID_STATUS.has(recorded)) {
      invalidDepictionStatus.push({ ...where, status: recorded });
    }

    if (recorded === 'illustrative') {
      illustrativeMarked.push(where);
      if (!covered.has(rec.collection)) {
        illustrativeWithoutDisclosure.push({ ...where, collection: rec.collection });
      }
    }

    if (recorded === 'actual' && !filled(img.creator) && !filled(img.sourceUrl) && !filled(img.permission)) {
      actualWithoutProvenance.push(where);
    }

    if (Array.isArray(img.permittedUses) && img.permittedUses.length > 0 && !filled(img.permission)) {
      permittedUseWithoutPermission.push({ ...where, permittedUses: img.permittedUses });
    }

    const admitsRepresentative =
      REPRESENTATIVE_RE.test(img.alt ?? '') || REPRESENTATIVE_RE.test(img.caption ?? '');
    if (admitsRepresentative && recorded === null) {
      undisclosedRepresentativeAlt.push({ ...where, alt: img.alt ?? null });
    }

    if (named && recorded === null) unrecordedDepiction.push(where);
  }

  const namedEntityImages = records.filter((r) => NAMED_ENTITY_COLLECTIONS.has(r.collection));

  const totals = {
    imageRecords: records.length,
    namedEntityImages: namedEntityImages.length,
    illustrativeMarked: illustrativeMarked.length,
    illustrativeWithoutDisclosure: illustrativeWithoutDisclosure.length,
    actualWithoutProvenance: actualWithoutProvenance.length,
    permittedUseWithoutPermission: permittedUseWithoutPermission.length,
    invalidDepictionStatus: invalidDepictionStatus.length,
    brokenDisclosureSurface: broken.length,
    undisclosedRepresentativeAlt: undisclosedRepresentativeAlt.length,
    unrecordedDepiction: unrecordedDepiction.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    disclosureComponent: DISCLOSURE_COMPONENT,
    namedEntityCollections: [...NAMED_ENTITY_COLLECTIONS],
    assertedMetrics: [...ASSERTED_METRICS],
    coveredCollections: [...covered].sort(),
    disclosureSurfaces: surfaces,
    brokenDisclosureSurface: broken,
    totals,
    illustrativeWithoutDisclosure,
    actualWithoutProvenance,
    permittedUseWithoutPermission,
    invalidDepictionStatus,
    undisclosedRepresentativeAlt,
  };

  const t = totals;
  console.log(
    `Media provenance audit - ${t.imageRecords} image records, ` +
    `${t.namedEntityImages} on named-entity pages`
  );
  console.log('');
  console.log('  Disclosure');
  console.log(`    marked illustrative ........... ${t.illustrativeMarked}   [report-only]`);
  console.log(`    illustrative, no disclosure ... ${t.illustrativeWithoutDisclosure}   [gated]`);
  console.log('  Rights discipline');
  console.log(`    "actual" w/o any provenance ... ${t.actualWithoutProvenance}   [gated]`);
  console.log(`    permitted use w/o permission .. ${t.permittedUseWithoutPermission}   [gated]`);
  console.log(`    invalid depiction status ...... ${t.invalidDepictionStatus}   [gated]`);
  console.log(`    disclosure surface broken ..... ${t.brokenDisclosureSurface}   [gated]`);
  console.log('  Inherited debt');
  console.log(`    alt says "representative" ..... ${t.undisclosedRepresentativeAlt}   [gated, ratchet]`);
  console.log(`    named entity, status unrecorded ${t.unrecordedDepiction}   [report-only]`);
  console.log('');
  console.log(`  Collections with a disclosure surface: ${[...covered].sort().join(', ') || '(none)'}`);
  console.log('');

  for (const d of illustrativeWithoutDisclosure) {
    console.log(`    NO DISCLOSURE  ${d.file} (${d.field}) is illustrative and ${d.collection} renders no disclosure`);
  }
  for (const a of actualWithoutProvenance) {
    console.log(`    UNSOURCED      ${a.file} (${a.field}) claims an actual depiction with no creator, source or permission`);
  }
  for (const p of permittedUseWithoutPermission) {
    console.log(`    NO GRANT       ${p.file} (${p.field}) lists ${p.permittedUses.join(', ')} with no recorded permission`);
  }
  for (const s of invalidDepictionStatus) {
    console.log(`    BAD STATUS     ${s.file} (${s.field}) has depictionStatus "${s.status}"`);
  }
  for (const b of broken) {
    console.log(`    UNWIRED        ${b.file} is the declared disclosure surface for ${b.collection} (${b.reason})`);
  }
  if (VERBOSE) {
    for (const r of undisclosedRepresentativeAlt) {
      console.log(`    UNDISCLOSED    ${r.file} (${r.field}) alt: ${r.alt}`);
    }
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${path.relative(REPO, out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          updatedAt: report.generatedAt,
          assertedMetrics: [...ASSERTED_METRICS],
          ceilings: t,
        },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${path.relative(REPO, BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing or corrupt baseline must not read as "no regression".
    console.error(`\n  FAIL: cannot read baseline ${path.relative(REPO, BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:media-provenance -- --update-baseline');
    process.exit(1);
  }

  const failures = [];
  for (const [metric, ceiling] of Object.entries(baseline.ceilings ?? {})) {
    if (!ASSERTED_METRICS.has(metric)) continue;
    const actual = t[metric];
    if (typeof actual === 'number' && actual > ceiling) {
      failures.push(`${metric}: ${actual} > baseline ${ceiling}`);
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: media provenance regression against the ratchet baseline');
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Record the image\'s depictionStatus, or re-seed deliberately with --update-baseline.');
    process.exit(1);
  }
  console.log('  PASS: no regression against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
