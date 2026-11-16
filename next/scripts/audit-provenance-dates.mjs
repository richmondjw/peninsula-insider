#!/usr/bin/env node
/**
 * audit-provenance-dates.mjs  -  the provenance-date gate (PI-004).
 *
 * One rule stands behind this whole script: a verification date may only ever
 * be written by something that actually verified. Until 2026-09-13 that rule
 * was prose. scripts/apply-event-editorial.py stamped `lastCheckedDate` to
 * today every time it applied a blurb, and nothing anywhere would have
 * noticed if a second script had done the same. Roughly forty pages published
 * a fact-verified date that was a string literal in the template, tracking no
 * record at all, so no edit to the corpus could move it and no staleness
 * check could see it.
 *
 * WHAT THIS GATE ASSERTS
 *
 *   publishPathStampsCheckDate
 *       No script may assign a verification-date field from the wall clock.
 *       This is the rule itself, checked structurally rather than by hoping
 *       nobody writes the line again. A script that genuinely performs a
 *       check is allowed to stamp one, and says so with an allow marker (see
 *       ESCAPE HATCH); this metric counts the UNDECLARED ones.
 *
 *   visitWithoutVisitRecord
 *       No record may claim a visit it cannot evidence. `method: 'visited'`
 *       requires an `editorialProvenance.visit` block, and the legacy
 *       `editorVisited` flag requires the same. Today this passes vacuously:
 *       the correct number of records claiming a visit is zero and that is
 *       what the corpus holds. That is the point. Arm the tripwire before the
 *       first visit claim is written, not after a reader has read one.
 *
 *   checkedOnWithoutSource
 *       A check date with nothing behind it is not a check. A record
 *       carrying `editorialProvenance.checkedOn` must name a source, or have
 *       an evidence row in the PI-005 registry. Also vacuous today.
 *
 *   hardcodedVerificationDate
 *       A date literal sitting next to verification wording in a template.
 *       This one is not vacuous: it starts at the residue this ticket could
 *       not convert, and ratchets down as those pages get records to read.
 *
 * WHAT IT CANNOT CATCH
 *
 *   A human, or an agent, editing a record's date field by hand without
 *   performing the check. Nothing static can see that. The registry is the
 *   answer there: a check date derived from an evidence row has a source
 *   attached to it, and `src/lib/provenance.mjs` will only publish the word
 *   "fact-verified" for a date that came from one.
 *
 *   A script that computes today's date several statements away from the
 *   assignment, or through a helper. The scan is line-scoped, deliberately:
 *   a whole-program dataflow analysis that nobody can read is a gate people
 *   route around, and the line-scoped form is what the actual defect looked
 *   like.
 *
 * NOTHING HERE IS TIME-DRIVEN. Every metric counts a property of the files on
 * disk. audit-event-safeguards.mjs learned this the hard way: its first
 * revision asserted on verification AGE, which climbs with the calendar, so
 * it would have blocked every deploy four days after it shipped without a
 * single content change. No metric in this file moves unless someone edits
 * something.
 *
 * ESCAPE HATCH
 *
 * A script that really does read a source may stamp the date it read it.
 * Mark the assignment with
 *
 *     pi-check-stamp-allow: <reason>
 *
 * on the same line or the line immediately above, inside whatever comment
 * syntax the file uses. The reason is mandatory and must be at least twelve
 * characters of real text: the point of the hatch is that the justification
 * gets written down next to the stamp, not that the stamp gets waved through.
 * The same shape as `pi-claim-lint-allow` in lint-firsthand-claims.mjs.
 *
 * Report-only by default. `--assert` compares against the ratchet baseline in
 * ops/baselines/provenance-dates-baseline.json and exits 1 on
 * regression, matching audit-link-graph.mjs and audit-event-safeguards.mjs.
 *
 * Usage:
 *   node scripts/audit-provenance-dates.mjs [--json out.json] [--assert]
 *                                           [--baseline path] [--update-baseline]
 *                                           [--content-dir path] [--pages-dir path]
 *                                           [--script-dir path]
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const BASELINE = path.resolve(
  getArg('--baseline', path.join(REPO, 'ops', 'baselines', 'provenance-dates-baseline.json'))
);
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');

// Fixture overrides. Only the test harness passes these; production callers
// audit the real tree. Repeatable, so a test can point at one directory and
// production can scan several.
const multi = (flag, fallback) => {
  const found = [];
  args.forEach((a, i) => {
    if (a === flag && args[i + 1] && !args[i + 1].startsWith('--')) found.push(path.resolve(args[i + 1]));
  });
  return found.length ? found : fallback;
};
const CONTENT_DIRS = multi('--content-dir', [path.join(NEXT, 'src', 'content')]);
const PAGES_DIRS = multi('--pages-dir', [
  path.join(NEXT, 'src', 'pages'),
  path.join(NEXT, 'src', 'components'),
  path.join(NEXT, 'src', 'layouts'),
]);
const SCRIPT_DIRS = multi('--script-dir', [
  path.join(NEXT, 'scripts'),
  path.join(REPO, 'ops', 'scripts'),
]);

/** Which metrics --assert may fail on. All four: none of them drifts on its own. */
const ASSERTED_METRICS = new Set([
  'publishPathStampsCheckDate',
  'visitWithoutVisitRecord',
  'checkedOnWithoutSource',
  'hardcodedVerificationDate',
]);

/* ------------------------------------------------------------------ */
/* Patterns                                                            */
/* ------------------------------------------------------------------ */

/** Fields that carry a verification or review date anywhere in this corpus. */
const DATE_FIELDS = [
  'lastVerified', 'lastCheckedDate', 'lastReviewed', 'checkedOn', 'reviewedOn',
  'verifiedAt', 'checkedAt', 'retrievedAt',
  // Declared on venues 2026-09-14 (PI-010). Until then Zod stripped it, so no
  // rule could reach it; now that the value survives, the same rule governs it
  // as every other verification date. Its 21 records share one bulk-stamped
  // value and it is deliberately unrendered - but the field is real now, and
  // the way it would go wrong is a script stamping it from the clock. That is
  // exactly what this list forbids.
  'lastFactVerified',
];

/** Ways a script asks the operating system what day it is. */
const WALL_CLOCK = [
  'date.today(', 'datetime.now(', 'datetime.today(', 'datetime.utcnow(',
  'time.time(', 'new Date(', 'Date.now(',
];

// The field name, then whatever closing quote or bracket the language uses,
// then an assignment. One pattern covers data['lastCheckedDate'] = ...,
// record.lastVerified = ... and "lastVerified": ... . A comparison (==, ===)
// is excluded: reading a date is not writing one.
const ASSIGNS_DATE_FIELD = new RegExp(
  String.raw`(?:\b|['"\[])(${DATE_FIELDS.join('|')})['"\]\s]*[:=](?!=)`
);

const ALLOW_MARKER = /pi-check-stamp-allow:\s*(.+)$/;

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const DATE_LITERAL = new RegExp(
  String.raw`(['"\`]\d{4}-\d{2}-\d{2}|\b\d{1,2}\s+(?:${MONTHS})\s+\d{4}\b)`
);
const VERIFICATION_WORD = /verif|reviewed|fact[-\s]?check/i;
/** The one expression a template is allowed to put the strong word next to. */
const DERIVED_STAMP = /stampLabel|provenance\.|ProvenanceLine|verificationSentence|formatVerifiedStamp\(/;

const SCRIPT_EXT = new Set(['.py', '.mjs', '.cjs', '.js', '.ts', '.sh']);
const TEMPLATE_EXT = new Set(['.astro', '.ts', '.tsx', '.jsx']);

/* ------------------------------------------------------------------ */
/* Walking                                                             */
/* ------------------------------------------------------------------ */

async function walk(dir, exts) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') continue;
      out.push(...(await walk(abs, exts)));
    } else if (exts.has(path.extname(entry.name))) {
      out.push(abs);
    }
  }
  return out;
}

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

/** An allow marker on this line or the one above, with a real reason. */
function allowed(lines, i) {
  for (const candidate of [lines[i], lines[i - 1]]) {
    const m = candidate ? ALLOW_MARKER.exec(candidate) : null;
    if (m && m[1].replace(/[^A-Za-z0-9]/g, '').length >= 12) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* 1. publish paths that stamp a check date                            */
/* ------------------------------------------------------------------ */

/**
 * A test's fixture is source code about the defect, not the defect. This gate
 * would otherwise fail on its own test file, which writes the forbidden line
 * into a temporary directory to prove the gate catches it.
 */
const isTestFile = (abs) => /(\.test\.[cm]?[jt]s|^test_.*\.py|\.test\.py)$/.test(path.basename(abs));

async function scanScripts() {
  const hits = [];
  for (const dir of SCRIPT_DIRS) {
    for (const abs of await walk(dir, SCRIPT_EXT)) {
      if (isTestFile(abs)) continue;
      const lines = (await readFile(abs, 'utf8')).split(/\r?\n/);
      lines.forEach((line, i) => {
        // A comment is allowed to name the thing it forbids, which is how the
        // fix to apply-event-editorial.py explains itself.
        const code = line.replace(/^\s*(#|\/\/|\*)\s?.*$/, '');
        if (!ASSIGNS_DATE_FIELD.test(code)) return;
        if (!WALL_CLOCK.some((w) => code.includes(w))) return;
        if (allowed(lines, i)) return;
        hits.push({ file: rel(abs), line: i + 1, code: line.trim().slice(0, 160) });
      });
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/* 2 + 3. record-level provenance defects                              */
/* ------------------------------------------------------------------ */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

async function readRecord(abs) {
  const text = await readFile(abs, 'utf8');
  if (path.extname(abs) === '.json') {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  const m = FRONTMATTER.exec(text);
  if (!m) return null;
  try {
    return YAML.parse(m[1]);
  } catch {
    return null;
  }
}

/** Evidence rows indexed by the record they were harvested from. */
async function evidenceSubjects(contentDir) {
  const subjects = new Set();
  for (const abs of await walk(path.join(contentDir, 'claims'), new Set(['.json']))) {
    const claim = await readRecord(abs);
    if (!claim) continue;
    for (const s of [claim.subject, ...(claim.assertedBy ?? [])]) {
      if (s?.type && s?.slug) subjects.add(`${s.type}::${s.slug}`);
    }
  }
  return subjects;
}

async function scanRecords() {
  const visits = [];
  const unsourced = [];
  for (const contentDir of CONTENT_DIRS) {
    const known = await evidenceSubjects(contentDir);
    for (const abs of await walk(contentDir, new Set(['.json', '.md', '.mdx']))) {
      const relPath = rel(abs);
      if (relPath.includes('/content/claims/') || relPath.includes('/content/evidence/')) continue;
      const data = await readRecord(abs);
      if (!data || typeof data !== 'object') continue;

      const block = data.editorialProvenance ?? null;
      const hasVisit = Boolean(block?.visit?.occurredOn);
      if (block?.method === 'visited' && !hasVisit) {
        visits.push({ file: relPath, reason: "method 'visited' with no visit record" });
      }
      if (data.editorVisited === true && !hasVisit) {
        visits.push({ file: relPath, reason: 'editorVisited with no visit record' });
      }

      if (block?.checkedOn && !block?.source) {
        const type = path.relative(contentDir, abs).split(path.sep)[0];
        const slug = data.slug ?? path.basename(abs).replace(/\.(json|mdx?|)$/, '');
        if (!known.has(`${type}::${slug}`)) {
          unsourced.push({ file: relPath, reason: 'checkedOn with neither a source nor a claim' });
        }
      }
    }
  }
  return { visits, unsourced };
}

/* ------------------------------------------------------------------ */
/* 4. hardcoded verification dates in templates                        */
/* ------------------------------------------------------------------ */

async function scanTemplates() {
  const hits = [];
  for (const dir of PAGES_DIRS) {
    for (const abs of await walk(dir, TEMPLATE_EXT)) {
      const lines = (await readFile(abs, 'utf8')).split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!DATE_LITERAL.test(line)) return;
        if (!VERIFICATION_WORD.test(line)) return;
        if (DERIVED_STAMP.test(line)) return;
        if (allowed(lines, i)) return;
        hits.push({ file: rel(abs), line: i + 1, code: line.trim().slice(0, 160) });
      });
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ */

async function main() {
  const [stamps, records, hardcoded] = await Promise.all([
    scanScripts(),
    scanRecords(),
    scanTemplates(),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    assertedMetrics: [...ASSERTED_METRICS],
    totals: {
      publishPathStampsCheckDate: stamps.length,
      visitWithoutVisitRecord: records.visits.length,
      checkedOnWithoutSource: records.unsourced.length,
      hardcodedVerificationDate: hardcoded.length,
    },
    publishPathStampsCheckDate: stamps,
    visitWithoutVisitRecord: records.visits,
    checkedOnWithoutSource: records.unsourced,
    hardcodedVerificationDate: hardcoded,
  };

  const t = report.totals;
  console.log('Provenance date audit');
  console.log('');
  console.log('  The rule: a verification date is written only by something that verified.');
  console.log(`    publish paths stamping a check date .. ${t.publishPathStampsCheckDate}   [gated]`);
  console.log(`    visit claimed with no visit record ... ${t.visitWithoutVisitRecord}   [gated]`);
  console.log(`    checkedOn with no source at all ...... ${t.checkedOnWithoutSource}   [gated]`);
  console.log(`    hardcoded date in a template ......... ${t.hardcodedVerificationDate}   [gated, ratchets down]`);
  console.log('');
  for (const h of stamps) console.log(`    STAMP      ${h.file}:${h.line}  ${h.code}`);
  for (const v of records.visits) console.log(`    VISIT      ${v.file}  ${v.reason}`);
  for (const u of records.unsourced) console.log(`    UNSOURCED  ${u.file}  ${u.reason}`);
  for (const h of hardcoded) console.log(`    HARDCODED  ${h.file}:${h.line}  ${h.code}`);
  if (hardcoded.length) console.log('');

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${rel(out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        { updatedAt: report.generatedAt, assertedMetrics: [...ASSERTED_METRICS], ceilings: t },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${rel(BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing baseline must not read as "no regression".
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:provenance-dates -- --update-baseline');
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
    console.error('\n  FAIL: provenance regression against the ratchet baseline');
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  A verification date must be earned by a check. Fix the source, or');
    console.error('  re-seed the baseline deliberately with --update-baseline.');
    process.exit(1);
  }
  console.log('  PASS: no regression against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
