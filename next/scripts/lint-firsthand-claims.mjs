// lint-firsthand-claims.mjs
//
// Build-blocking guard against unsupported first-hand assertions.
//
// WHY THIS EXISTS
// ---------------
// The editorial method is research plus a formed, accountable view. It is not
// "an editor stood in every room". Copy that claims the stronger method is a
// trust liability, and it has now come back twice:
//
//   - 13 Aug 2026: a manual sweep was run and recorded as complete. It touched
//     seven files, all under src/pages/ and src/layouts/. It never entered
//     src/content/.
//   - Two flagship best-of pages kept an absolute first-hand claim for another
//     sixteen days, removed on 29 Aug 2026 by unrelated work.
//   - Two reusable blocks in src/content/editorial_blocks/ still carried the
//     claim on 13 Sep 2026, a month after the sweep was marked done.
//
// The defect is not new claims accreting. A sweep of 260 commits since 13 Aug
// found none. The defect is old claims surviving where a manual sweep did not
// reach. So this guard's single most important property is that it reads
// src/content/ as well as the template directories. A pages-only check is the
// exact failure that let this recur.
//
// WHAT IT FLAGS
// -------------
// Five rules, all scoped to one sentence so that unrelated words on the same
// line cannot combine into a phantom claim:
//
//   universal-visit   a universal quantifier over the list ("every entry",
//                     "all of which") asserted with a physical-presence verb
//                     ("has been visited", "have been eaten at"). This is the
//                     actual defect both recurrences were made of.
//   editorial-visit   the publication's own voice asserting presence
//                     ("we visited", "our editors have eaten at").
//   method-claim      fixed idioms that are a method claim wherever they sit
//                     ("personally visited", "visited every", "drunk at the
//                     source", "no entry appears here without a visit").
//   firsthand         "first-hand" / "firsthand" qualifying the method
//                     (first-hand research, verified first-hand).
//   in-person         a verification or visit verb tied to "in person".
//
// WHAT IT DELIBERATELY DOES NOT FLAG
// ----------------------------------
// A lint nobody trusts gets disabled, so every rule was calibrated against the
// real corpus before it was wired into the build. Left out on purpose:
//
//   - Bare "visited" with no assertive auxiliary. The corpus is full of
//     "less visited", "best visited mid-week", "the most visited attraction",
//     "a resort you could have visited anywhere". None of these are claims.
//   - Bare "drunk". "best drunk fresh", "drunk at the correct temperature",
//     "slightly drunk" are all legitimate wine copy.
//   - Bare "on the ground". "the ground floor", "twenty-six hours on the
//     ground", "the founders are still on the ground" are not method claims.
//     Only "boots on the ground" is.
//   - Bare "in person". "the winemaker is often there in person" describes a
//     venue, not our method.
//   - Hedged or research-scoped language, which is what the workflow actually
//     supports and what corrected copy already says: "independently
//     researched", "researched and reviewed", "verified against the operator's
//     current product", "every pick earns its place".
//   - Second-person and reader-directed narration ("you have never been to the
//     Peninsula", "the cellar door you visited that morning").
//
// One class could not be separated cleanly and is handled by the escape hatch
// rather than by a pattern: a genuine, dated article in which someone really
// did go. Grammatically that is identical to the false claim. Rather than
// guess, this guard flags it and asks the author to record the evidence in the
// allow comment. The corpus contains zero first-person presence claims today,
// so this costs nothing until someone writes a real one.
//
// ESCAPE HATCH
// ------------
// A genuine, evidenced first-hand claim is allowed. Mark it with
//
//     pi-claim-lint-allow: <reason>
//
// on the same line as the claim or on the line immediately above it, inside
// whatever comment syntax the file uses:
//
//     <!-- pi-claim-lint-allow: editor attended the 2026 vintage lunch, 4 May 2026 -->
//     // pi-claim-lint-allow: quoting the claim language this sweep removed
//
// The reason is mandatory and must be at least 12 characters of real text. A
// bare marker is itself a violation: the point of the hatch is that the
// evidence gets written down next to the claim, not that the claim gets waved
// through.
//
// Usage:
//   node scripts/lint-firsthand-claims.mjs              lint (exit 1 on violations)
//   node scripts/lint-firsthand-claims.mjs --json       machine-readable report
//   node scripts/lint-firsthand-claims.mjs --stats      corpus scan totals, exit 0
//   node scripts/lint-firsthand-claims.mjs --root DIR   scan DIR instead of src
//                                                       (test-harness fixtures only)

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const getArg = (flag) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const JSON_OUT = argv.includes('--json');
const STATS_ONLY = argv.includes('--stats');
const ROOT_OVERRIDE = getArg('--root');

// Content is scanned alongside the template directories on purpose. See the
// header: covering only pages/ is the failure this guard exists to prevent.
const ROOTS = ['src/content', 'src/data', 'src/pages', 'src/layouts', 'src/components'];
const EXTS = new Set(['.md', '.mdx', '.json', '.astro', '.ts', '.tsx', '.js', '.mjs']);

// Underscore-prefixed directories are excluded from Astro's file-based router,
// so nothing under src/pages/_archive/ is ever served. Verified against a real
// build: no _archive route appears in dist/. They are kept for history and are
// out of scope for a guard about what readers are told.
const SKIP_DIR = /(^|[\\/])(_archive|__pycache__|node_modules|dist|\.astro)([\\/]|$)/;

// This script and its test necessarily contain the claim strings they exist to
// catch. Excluding them by name is cheaper and clearer than salting every
// fixture.
const SKIP_FILE = new Set(['lint-firsthand-claims.mjs', 'lint-firsthand-claims.test.mjs']);

const ALLOW_MARKER = /pi-claim-lint-allow:\s*(.*)$/i;
const ALLOW_MIN_REASON = 12;

// -- pattern set ------------------------------------------------------------

// Physical presence. Every one of these needs an assertive auxiliary in front
// of it before it counts (see ASSERTED_PRESENCE) precisely because the bare
// participles are ordinary travel-writing vocabulary.
const PRESENCE = String.raw`(?:visited|revisited|inspected|toured|eaten\s+(?:at|in)|dined\s+(?:at|in)|drunk|drank|tasted|stayed\s+(?:at|in)|slept\s+(?:at|in)|walked|swum|been\s+to|been\s+there|seen\s+in\s+person|checked\s+in\s+person|verified\s+in\s+person)`;

// "has been visited", "have all personally eaten at", "were individually
// inspected". A modal ("can be walked", "should be visited") deliberately
// breaks the chain: capability is not a claim.
const ASSERTED_PRESENCE = new RegExp(
  String.raw`\b(?:has|have|had|is|are|was|were)\s+(?:all\s+|each\s+|both\s+|now\s+|already\s+)?(?:been\s+)?(?:personally\s+|physically\s+|actually\s+|genuinely\s+|independently\s+|individually\s+|each\s+|all\s+)?${PRESENCE}\b`,
  'i'
);

// A universal quantifier applied to the things on the list. "every pick earns
// its place" and "every property is independently researched" match here and
// are then cleared by ASSERTED_PRESENCE finding no presence verb.
const UNIVERSAL = new RegExp(
  String.raw`\b(?:every|each|all)\s+(?:single\s+)?(?:entry|entries|venue|venues|property|properties|listing|listings|restaurant|restaurants|place|places|pick|picks|recommendation|recommendations|producer|producers|room|rooms|cellar\s+doors?|stay|stays|walk|walks|beach|beaches|name|names|business|businesses|address|addresses|table|tables|bar|bars|cafe|cafes|hotel|hotels|winery|wineries|item|items|one)\b` +
    String.raw`|\ball\s+of\s+(?:which|them)\b` +
    String.raw`|\bevery\s+single\s+one\b` +
    String.raw`|\bwithout\s+exception\b`,
  'i'
);

// The publication's own voice. "we rate", "we track", "we note" are judgement
// verbs and are not here; only presence verbs are.
const EDITORIAL_VOICE = new RegExp(
  String.raw`\b(?:we|we've|our\s+editors?|our\s+team|our\s+writers?|the\s+editorial\s+(?:desk|team))\b` +
    String.raw`(?:\s+(?:have|has|had|'ve|all|personally|physically|actually|genuinely|each|both|already|since|only|also))*` +
    String.raw`\s+(?:visited|revisited|went\s+to|ate\s+at|eaten\s+at|dined\s+at|drank\s+at|drunk\s+at|tasted\s+at|stayed\s+at|slept\s+at|walked\s+every|walked\s+each|walked\s+all|toured|inspected|been\s+to|been\s+there|sat\s+at)\b`,
  'i'
);

// Idioms that are a method claim wherever they appear.
const METHOD_IDIOMS = [
  /\bpersonally\s+(?:visited|revisited|inspected|eaten|dined|stayed|tasted|checked|verified|reviewed|been)\b/i,
  /\b(?:visited|revisited|inspected|toured|eaten\s+at|dined\s+at|stayed\s+at|tasted)\s+(?:every|each|all\s+of\s+them|them\s+all)\b/i,
  /\bdrunk\s+at\s+the\s+source\b/i,
  /\bboots\s+on\s+the\s+ground\b/i,
  /\bno\s+(?:entry|venue|property|listing|restaurant|place|pick|name)\b[^.!?]{0,60}\bwithout\s+(?:a\s+|being\s+|first\s+)?(?:visit|visiting|visited)\b/i,
];

// "first-hand" / "firsthand" only when it qualifies the method.
const FIRSTHAND = [
  /\bfirst-?hand\b[\s,]*(?:visit|visits|visited|experience|knowledge|research|reporting|report|account|accounts|review|reviews|verification|check|checks|testing|tasting)\b/i,
  /\b(?:visited|verified|checked|reviewed|researched|assessed|experienced|seen|known|tested|tasted)\b[^.!?]{0,20}\bfirst-?hand\b/i,
];

// "in person" only when tied to a verification or visit verb. "the winemaker
// is often there in person" is a fact about a venue, not about us.
const IN_PERSON = [
  /\b(?:visit|visits|visited|visiting|verif\w+|check\w+|review\w+|inspect\w+|assess\w+|test\w+|tast\w+|see|seen|saw)\b[^.!?]{0,25}\bin\s+person\b/i,
  /\bin\s+person\b[^.!?]{0,25}\b(?:visit|visits|visited|verif\w+|check\w+|inspect\w+|review\w+)\b/i,
];

const RULES = [
  {
    id: 'universal-visit',
    why: 'Universal claim that every item on the list was physically visited.',
    test: (s) => UNIVERSAL.test(s) && ASSERTED_PRESENCE.test(s),
  },
  {
    id: 'editorial-visit',
    why: 'The publication asserts it was physically present.',
    test: (s) => EDITORIAL_VOICE.test(s),
  },
  {
    id: 'method-claim',
    why: 'Fixed first-hand method idiom.',
    test: (s) => METHOD_IDIOMS.some((r) => r.test(s)),
  },
  {
    id: 'firsthand',
    why: '"first-hand" used to describe how the recommendation was formed.',
    test: (s) => FIRSTHAND.some((r) => r.test(s)),
  },
  {
    id: 'in-person',
    why: 'Verification or visit claimed to have happened in person.',
    test: (s) => IN_PERSON.some((r) => r.test(s)),
  },
];

// -- scan -------------------------------------------------------------------

/** Split a line into sentences so unrelated clauses cannot combine. */
function sentences(line) {
  return line
    .replace(/\\n/g, ' . ') // JSON string bodies carry their paragraphs escaped
    .split(/(?<=[.!?;])[\s"'”’)\]]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A comment-only line. In markdown a leading * is a list item, not a comment. */
function isCommentLine(line, isProse) {
  return isProse ? /^\s*<!--/.test(line) : /^\s*(?:\/\/|\*|<!--|\/\*)/.test(line);
}

function allowReasonAt(lines, i) {
  for (const candidate of [lines[i], i > 0 ? lines[i - 1] : '']) {
    const m = candidate ? ALLOW_MARKER.exec(candidate) : null;
    if (!m) continue;
    const reason = m[1].replace(/(?:-->|\*\/\}|\*\/|"|'|,)\s*$/, '').trim();
    return { reason, ok: reason.length >= ALLOW_MIN_REASON };
  }
  return null;
}

const violations = [];
const allowed = [];
let filesScanned = 0;
let linesScanned = 0;

function scanFile(full, rel) {
  if (SKIP_FILE.has(path.basename(full))) return;
  const ext = path.extname(full);
  if (!EXTS.has(ext)) return;
  const isProse = ext === '.md' || ext === '.mdx';

  filesScanned += 1;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  linesScanned += lines.length;

  lines.forEach((line, i) => {
    if (isCommentLine(line, isProse)) return;
    const hits = new Set();
    for (const sentence of sentences(line)) {
      for (const rule of RULES) if (rule.test(sentence)) hits.add(rule);
    }
    if (hits.size === 0) return;

    const allow = allowReasonAt(lines, i);
    for (const rule of hits) {
      const record = {
        file: rel,
        line: i + 1,
        rule: rule.id,
        why: rule.why,
        text: line.trim().slice(0, 160),
      };
      if (allow?.ok) {
        allowed.push({ ...record, reason: allow.reason });
      } else if (allow) {
        violations.push({
          ...record,
          rule: 'allow-without-reason',
          why: `pi-claim-lint-allow needs a reason of at least ${ALLOW_MIN_REASON} characters.`,
        });
      } else {
        violations.push(record);
      }
    }
  });
}

function walk(dir, base) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP_DIR.test(full)) continue;
    if (entry.isDirectory()) walk(full, base);
    else scanFile(full, path.relative(base, full).replace(/\\/g, '/'));
  }
}

const scanRoots = ROOT_OVERRIDE ? [ROOT_OVERRIDE] : ROOTS;
const base = ROOT_OVERRIDE ? path.resolve(ROOT_OVERRIDE, '..') : process.cwd();
for (const root of scanRoots) {
  const abs = path.resolve(root);
  if (fs.existsSync(abs)) walk(abs, base);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ filesScanned, linesScanned, violations, allowed }, null, 2));
  process.exit(violations.length ? 1 : 0);
}

if (STATS_ONLY) {
  console.log(`Scanned ${filesScanned} files / ${linesScanned} lines.`);
  console.log(`  flagged ........ ${violations.length}`);
  console.log(`  allowed ........ ${allowed.length}`);
  for (const v of violations) console.log(`    ${v.file}:${v.line}  [${v.rule}]  ${v.text}`);
  for (const a of allowed) console.log(`    ALLOWED ${a.file}:${a.line}  [${a.rule}]  reason: ${a.reason}`);
  process.exit(0);
}

if (violations.length === 0) {
  const note = allowed.length ? ` (${allowed.length} evidenced claim(s) allowed)` : '';
  console.log(`✓ No unsupported first-hand claims in ${filesScanned} files${note}.`);
  process.exit(0);
}

console.error(`✗ Unsupported first-hand claims: ${violations.length}\n`);
console.error('The editorial method is research and a formed view, not a visit to every venue.');
console.error('Copy must not claim more than the workflow supports.\n');
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
  console.error(`    ${v.why}`);
  console.error(`    ${v.text}`);
}
console.error('\nTo fix:');
console.error('  1. Rewrite to what the workflow supports: "independently researched",');
console.error('     "researched and reviewed", "researched and ranked on editorial judgement".');
console.error('  2. If the claim is genuine and evidenced, add on the line or the line above:');
console.error('       pi-claim-lint-allow: <who was there, where, and when>');
process.exit(1);
