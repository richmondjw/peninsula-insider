#!/usr/bin/env node
/**
 * audit-commercial-firewall.mjs - the commercial/editorial firewall gate (PI-021).
 *
 * Peninsula Insider's published stance is that commerce never buys position:
 * "Advertising, partner content, and Pass marketing are part of how the
 * publication is funded. The firewall is enforced by labelling, not absence"
 * (src/pages/editorial-approach.astro). The schema draws the same line in the
 * comment beside the two flags, at src/content.config.ts lines 195-204. Quoted
 * here, with the house-style dash substitution, so the next author can see
 * where the line is without opening that file:
 *
 *     "Editorial pick flag. Set true on venues that are surfaced as curated
 *     highlights on hub pages (Plans hub stay highlights, Wine hub benchmarks).
 *     Distinct from featuredPartner (commercial): this is a purely editorial
 *     signal. Hubs filter by type + editorPick to build their curated rails."
 *
 * That line was prose enforced by nothing. As of the PI-021 audit, no lint,
 * test or build assertion anywhere in the 20-step build chain referenced
 * featuredPartner, affiliateNote, sponsorship, disclosure or ranking. The
 * firewall held only because nobody had yet written the two lines of code that
 * would breach it, and a breach would have been indistinguishable from an
 * editorial decision in review. That is what this gate changes.
 *
 * WHAT THIS GATE ASSERTS
 *
 *   commercialReads          No commercial field may be READ anywhere in
 *                            reader-facing source, except at a site on the
 *                            declared allowlist below. This is the strong
 *                            assertion: it does not care whether the read sits
 *                            in a sort, a filter, a score or a helper three
 *                            calls away, because it fires on the read itself.
 *                            Indirection cannot get around it.
 *   commercialSortKeys       No sort comparator on a reader-facing surface may
 *                            name a commercial field. Redundant with the above
 *                            by construction, kept separate so the failure
 *                            reads "ranking breach", not "unexpected read".
 *   unclassifiedSortKeys     Every ordering key a comparator reads must appear
 *                            on the declared allowlist. A NEW ordering key
 *                            fails the gate until a human classifies it as
 *                            editorial or commercial. This is the tripwire on
 *                            ranking code nobody has looked at yet.
 *   orderArrayCommercial     No hardcoded slug-order array driving a comparator
 *                            may contain a record carrying a commercial
 *                            relationship.
 *   sponsoredMarkersUndeclared
 *                            Every rel="...sponsored" must be gated on a
 *                            commercial field with no fallback to a
 *                            non-commercial one.
 *   commercialRelationships  Count of records with a commercial relationship in
 *                            effect. Gated so the first paid placement is a
 *                            deliberate, visible diff (baseline re-seed) rather
 *                            than a silent content edit.
 *   commercialFieldsNonDefault
 *                            Wider count: any commercial field away from its
 *                            schema default.
 *   disclosureGap            A record with a commercial relationship in effect
 *                            must render a disclosure somewhere. Today this
 *                            passes vacuously, because no record carries one.
 *                            That is the point: arm the tripwire BEFORE the
 *                            first paid placement, not after it.
 *
 * WHAT THIS GATE CANNOT CATCH. Read this before trusting it.
 *
 *   - Data, not code. A commercial decision encoded purely in content - a paid
 *     venue given an early publishedAt, a hand-ordered slug list whose records
 *     carry no commercial flag, an editorPick set because someone paid - is
 *     invisible here. orderArrayCommercial only sees it once the record is
 *     flagged as commercial. Nothing can distinguish a paid slot from a genuine
 *     editorial pick when neither is recorded as paid. This gate raises the
 *     cost of hiding a sale in code; it cannot raise the cost of hiding one in
 *     a JSON field.
 *   - Ordering that never sorts. Document order, an array assembled in a chosen
 *     sequence, a .filter() that admits only the paid record, an early
 *     .slice(0, 1): none of those call .sort, so the sort checks never see
 *     them. commercialReads still fires if a commercial field is read to do it.
 *   - Renamed or derived fields. If a commercial value is copied into a
 *     neutrally-named field by a script or a content edit, every check here
 *     passes. The field list is a list of NAMES, not a taint analysis.
 *   - Runtime data. Client-side ordering fed by Supabase, or by any response
 *     this repo does not author, is out of scope.
 *   - The built output. This reads source, not dist/. A marker injected at
 *     build time by an integration would not be seen.
 *   - Anything outside SRC_ROOTS, which deliberately excludes pi-admin staff
 *     tooling and _archive.
 *   - Wording. disclosureGap asks whether a disclosure is rendered at all. It
 *     does not grade prominence, placement or honesty of the label.
 *
 * The lexical scanner below is not a parser. Where it guesses wrong (a regex
 * literal mistaken for division, a bare "//" in JSX text) the failure mode is a
 * blanked region and therefore a MISSED read, never an invented one. The gate
 * is built to under-report rather than cry wolf, because a check that fires on
 * legitimate editorial ranking gets switched off within a week.
 *
 * Report-only by default. --assert compares against the ratchet baseline at
 * ops/reports/governance/commercial-firewall-baseline.json and exits 1 on
 * regression, matching the contract audit-event-safeguards.mjs uses. Seeding
 * from today's real numbers means the gate can never be satisfied by making
 * things worse, but never blocks a deploy over debt it inherited. Unlike the
 * event safeguards there is no time-driven metric here: nothing in this report
 * climbs with the calendar, so every number is asserted safely.
 *
 * Usage:
 *   node scripts/audit-commercial-firewall.mjs [--json out.json] [--assert]
 *          [--baseline path] [--update-baseline] [--verbose]
 *          [--src-dir path] [--content-dir path]
 *
 * --src-dir / --content-dir exist for the test harness. Production callers
 * audit the real tree.
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DEFAULT_SRC = path.join(REPO, 'next', 'src');
const DEFAULT_CONTENT = path.join(REPO, 'next', 'src', 'content');
const DEFAULT_BASELINE = path.join(
  REPO, 'ops', 'reports', 'governance', 'commercial-firewall-baseline.json'
);

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
const SRC_DIR = path.resolve(getArg('--src-dir', DEFAULT_SRC));
const CONTENT_DIR = path.resolve(getArg('--content-dir', DEFAULT_CONTENT));

/* ── the field lists ─────────────────────────────────────────────────────── */

/**
 * Commercial fields: money, or a declared money relationship, can reach these.
 * Read off src/content.config.ts - affiliateNote + featuredPartner on venues,
 * affiliateProgram + affiliateUrl on tourOperators, affiliateUrl on
 * fishingCharters and boatHire. Adding a commercial field to the schema means
 * adding it here in the same change.
 */
const COMMERCIAL_FIELDS = new Set([
  'featuredPartner',
  'affiliateNote',
  'affiliateProgram',
  'affiliateUrl',
]);

/**
 * Ordering keys a comparator may legitimately read: editorial judgement, a
 * third-party authority score, a date, a name, a structural field. Adding a key
 * here IS the act of classifying a new ordering signal as non-commercial, so do
 * it deliberately.
 *
 * Seeded from the real corpus on 2026-09-13 so that unclassifiedSortKeys starts
 * at zero and any genuinely new ordering key fails the gate.
 */
const ALLOWED_SORT_KEYS = new Set([
  /* editorial judgement. explicitly non-commercial per content.config.ts */
  'editorPick', 'venueTier', 'vetted', 'featured', 'priority', 'rank', 'weight',
  'tier', 'status', 'pinned', 'order', 'sortOrder', 'displayOrder', 'isPinned',
  'editorsPick', 'highlight', 'curated', 'verdict', 'stage', 'confidence',
  /* third-party authority. not ours to sell */
  'authority', 'hats', 'hallidayScore', 'awards', 'pressMentions', 'score',
  'rating', 'stars',
  /* time */
  'publishedAt', 'updatedAt', 'lastVerified', 'lastCheckedDate', 'startDate',
  'endDate', 'date', 'nextOccurrence', 'occurrence', 'start', 'end', 'time',
  'createdAt', 'modifiedTime', 'year', 'month', 'day', 'savedAt', 'addedAt',
  'timestamp', 'expiresAt', 'publishDate', 'eventDate', 'dateAdded', 'updated',
  'created', 'lastModified', 'validFrom', 'validTo', 'recordedAt', 'firstSeen',
  'lastSeen', '週', 'week', 'weekOf', 'sortDate', 'effectiveDate',
  /* identity and name */
  'name', 'title', 'slug', 'id', 'label', 'heading', 'displayName', 'key',
  'sortName', 'shortName', 'question', 'term', 'word', 'text', 'value',
  'headline', 'caption', 'summary', 'dek', 'excerpt', 'body', 'content',
  'author', 'byline', 'filename', 'file', 'src', 'alt',
  /* structural and taxonomy */
  'type', 'category', 'section', 'zone', 'place', 'region', 'collection',
  'subtype', 'group', 'kind', 'cluster', 'theme', 'season', 'mood', 'audience',
  'tags', 'data', 'count', 'total', 'length', 'index', 'depth', 'level',
  'distance', 'distanceKm', 'priceBand', 'duration', 'durationMinutes',
  'capacity', 'popularity', 'relevance', 'similarity', 'matches', 'coordinates',
  'lat', 'lng', 'href', 'url', 'path', 'pathname', 'items', 'children',
  'species', 'operatorType', 'bookingProvider', 'recurrence', 'frequency',
  'occurrences', 'availability', 'priceLow', 'priceHigh', 'price', 'minutes',
  'hours', 'position', 'offset', 'page', 'step', 'number', 'num', 'amount',
  'percentage', 'ratio', 'delta', 'diff', 'change', 'views', 'saves', 'clicks',
]);

/**
 * Declared, reviewed reads of a commercial field in reader-facing source.
 * Paths are posix, relative to SRC_DIR. Any read not listed here fails the gate.
 *
 * These are link-construction reads, not ordering reads: the field decides
 * where a booking button points, never what position a record occupies. Both
 * are flagged by sponsoredMarkersUndeclared for a separate defect (the
 * non-commercial fallback), which is tracked in the baseline.
 */
const COMMERCIAL_READ_ALLOWLIST = [
  {
    file: 'pages/boating/hire/[slug].astro',
    field: 'affiliateUrl',
    reason: 'Booking CTA destination. Does not affect listing order on any surface.',
  },
  {
    file: 'pages/fishing/charters/[slug].astro',
    field: 'affiliateUrl',
    reason: 'Booking CTA destination. Does not affect listing order on any surface.',
  },
];

/**
 * Which metrics --assert may fail on: everything an author can introduce.
 * sponsoredMarkers (the raw count), featuredPartnerRecords, sortSites and the
 * scanned-file counts are report-only, because they move for entirely
 * legitimate reasons and gating them would block unrelated work.
 */
const ASSERTED_METRICS = new Set([
  'commercialReads',
  'commercialSortKeys',
  'unclassifiedSortKeys',
  'orderArrayCommercial',
  'sponsoredMarkersUndeclared',
  'commercialRelationships',
  'commercialFieldsNonDefault',
  'disclosureGap',
]);

/** Markers that tell a reader, or a crawler, that a link was paid for. */
const PAID_MARKER_RE = /\bsponsored\b/i;

/** Words that count as a visible disclosure in rendered copy. */
const DISCLOSURE_RE =
  /\b(sponsored|partner content|paid partnership|advertisement|affiliate|in partnership with)\b/i;

/**
 * Property names belonging to JS, the DOM or Astro rather than to the content
 * model. Excluded from ordering-key classification so ALLOWED_SORT_KEYS stays a
 * list of domain fields and does not fill up with plumbing.
 */
const NON_DOMAIN_PROPS = new Set([
  'localeCompare', 'getTime', 'toLowerCase', 'toUpperCase', 'indexOf', 'slice',
  'map', 'filter', 'includes', 'valueOf', 'replace', 'replaceAll', 'trim',
  'split', 'join', 'padStart', 'padEnd', 'normalize', 'charCodeAt', 'charAt',
  'test', 'match', 'toISOString', 'toString', 'sort', 'toSorted', 'reverse',
  'find', 'findIndex', 'some', 'every', 'reduce', 'concat', 'push', 'get',
  'has', 'set', 'keys', 'values', 'flat', 'flatMap', 'at', 'startsWith',
  'endsWith', 'repeat', 'substring', 'substr', 'toFixed', 'parse', 'stringify',
  'abs', 'min', 'max', 'floor', 'ceil', 'round', 'random', 'sign', 'from',
  'isArray', 'entries', 'getFullYear', 'getMonth', 'getDate', 'getDay',
  'getHours', 'getMinutes', 'getUTCFullYear', 'now', 'size', 'prototype',
  'call', 'apply', 'bind', 'toSpliced', 'splice', 'lastIndexOf', 'trimStart',
  'trimEnd', 'codePointAt', 'search', 'exec', 'toLocaleDateString',
  'toLocaleString', 'toDateString', 'toLocaleUpperCase', 'toLocaleLowerCase',
]);

/* ── source scanning ─────────────────────────────────────────────────────── */

const SRC_ROOTS = ['pages', 'components', 'layouts', 'lib'];
const SRC_EXTS = new Set(['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SRC_SKIP = /(^|[\\/])(_archive|pi-admin|node_modules|__pycache__)([\\/]|$)/;
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

/**
 * Blank out comments, and optionally string and regex literals, preserving
 * length and newlines so offsets and line numbers survive.
 *
 * Code inside a template literal's ${...} is deliberately left visible: in
 * .astro and JSX that is where a great deal of real logic lives, and hiding it
 * would hide reads.
 *
 * A "//" preceded by ":" is not treated as a comment, so "https://..." sitting
 * in bare JSX text does not swallow the rest of its line.
 */
function maskNonCode(src, { strings = true } = {}) {
  const out = src.split('');
  const blank = (i) => { if (out[i] !== '\n') out[i] = ' '; };
  let i = 0;
  const n = src.length;
  let prev = '';
  const stack = [];
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    const top = stack[stack.length - 1];

    if (top && top.kind === 'template') {
      if (c === '\\') { if (strings) { blank(i); blank(i + 1); } i += 2; continue; }
      if (c === '$' && d === '{') {
        if (strings) { blank(i); blank(i + 1); }
        stack.push({ kind: 'interp', depth: 0 });
        i += 2;
        continue;
      }
      if (c === '`') { if (strings) blank(i); stack.pop(); i += 1; prev = '`'; continue; }
      if (strings) blank(i);
      i += 1;
      continue;
    }
    if (top && (top.kind === 'single' || top.kind === 'double')) {
      if (c === '\\') { if (strings) { blank(i); blank(i + 1); } i += 2; continue; }
      const close = top.kind === 'single' ? "'" : '"';
      if (c === close) { if (strings) blank(i); stack.pop(); i += 1; prev = close; continue; }
      if (strings) blank(i);
      i += 1;
      continue;
    }

    /* in code: top level, or inside a ${...} interpolation */
    if (c === '/' && d === '/' && prev !== ':') {
      while (i < n && src[i] !== '\n') { blank(i); i += 1; }
      continue;
    }
    if (c === '/' && d === '*') {
      blank(i); blank(i + 1); i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { blank(i); i += 1; }
      if (i < n) { blank(i); blank(i + 1); i += 2; }
      continue;
    }
    if (c === '`') { if (strings) blank(i); stack.push({ kind: 'template' }); i += 1; continue; }
    if (c === "'") { if (strings) blank(i); stack.push({ kind: 'single' }); i += 1; continue; }
    if (c === '"') { if (strings) blank(i); stack.push({ kind: 'double' }); i += 1; continue; }
    if (c === '/' && '([{,=:;!&|?+-*%~^<>'.includes(prev)) {
      let j = i + 1;
      let ok = false;
      let cls = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) { ok = true; break; }
        j += 1;
      }
      if (ok) { for (let k = i; k <= j; k += 1) blank(k); i = j + 1; prev = '/'; continue; }
    }
    if (top && top.kind === 'interp') {
      if (c === '{') top.depth += 1;
      else if (c === '}') {
        if (top.depth === 0) { if (strings) blank(i); stack.pop(); i += 1; prev = '}'; continue; }
        top.depth -= 1;
      }
    }
    if (!/\s/.test(c)) prev = c;
    i += 1;
  }
  return out.join('');
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** Balanced (...) span starting at the index of the opening paren. */
function balanced(masked, open) {
  let depth = 0;
  for (let i = open; i < masked.length; i += 1) {
    const c = masked[i];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) return { start: open + 1, end: i };
    }
  }
  return null;
}

/** Domain property names a snippet of code can read. */
function propertyNames(maskedSnippet, commentFreeSnippet) {
  const names = new Set();
  for (const m of maskedSnippet.matchAll(/\.\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  /* bracket-string access survives only where string bodies are intact */
  for (const m of commentFreeSnippet.matchAll(/\[\s*['"`]([A-Za-z_$][\w$]*)['"`]\s*\]/g)) {
    names.add(m[1]);
  }
  const out = new Set();
  for (const name of names) if (!NON_DOMAIN_PROPS.has(name)) out.add(name);
  return out;
}

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (SRC_SKIP.test(full)) continue;
    if (e.isDirectory()) await walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/* ── content scanning ────────────────────────────────────────────────────── */

const CONTENT_EXTS = new Set(['.json', '.md', '.mdx']);

async function loadContentRecords(dir) {
  const files = await walk(dir);
  const records = [];
  for (const file of files) {
    if (!CONTENT_EXTS.has(path.extname(file))) continue;
    const raw = await readFile(file, 'utf8');
    let data = null;
    try {
      if (file.endsWith('.json')) data = JSON.parse(raw);
      else {
        const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (m) data = YAML.parse(m[1]);
      }
    } catch {
      data = null;
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      records.push({ file: path.relative(dir, file).split(path.sep).join('/'), data, raw });
    }
  }
  return records;
}

const present = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * A commercial RELATIONSHIP in effect, as distinct from a commercial field
 * merely carrying a non-default value.
 *
 * affiliateProgram: "yes" records that an operator RUNS an affiliate programme.
 * It does not say Peninsula Insider is in it, and on its own it buys nothing
 * and earns nothing. A relationship needs a partner flag, a live affiliate
 * link, or a written affiliate note. Keeping these two ideas apart is what
 * lets disclosureGap be meaningful rather than noisy.
 */
const hasRelationship = (d) =>
  d.featuredPartner === true || present(d.affiliateUrl) || present(d.affiliateNote);

/** Any commercial field away from its schema default. Wider, weaker signal. */
function nonDefaultCommercialFields(d) {
  const hits = [];
  if (d.featuredPartner === true) hits.push('featuredPartner');
  if (present(d.affiliateNote)) hits.push('affiliateNote');
  if (present(d.affiliateUrl)) hits.push('affiliateUrl');
  if (typeof d.affiliateProgram === 'string' && d.affiliateProgram !== 'unknown') {
    hits.push(`affiliateProgram=${d.affiliateProgram}`);
  }
  return hits;
}

/**
 * Is this paid marker actually attached to a declared commercial relationship?
 *
 * Declared means the href expression reaches a commercial field and does not
 * fall back to a non-commercial one. `data.affiliateUrl` is declared;
 * `data.affiliateUrl ?? data.operatorWebsite` is NOT, because the marker then
 * also renders over an ordinary editorial link, telling Google a link was paid
 * for when it was not. Resolution follows const initialisers up to four hops
 * within the same file; it does not cross module boundaries.
 */
function classifyHref(hrefExpr, masked) {
  if (!hrefExpr) return { declared: false, why: 'no resolvable href expression' };
  const fields = [...COMMERCIAL_FIELDS];
  const mentions = (text) => fields.some((f) => new RegExp(`\\b${f}\\b`).test(text));

  const chain = [hrefExpr];
  const seen = new Set();
  let cursor = hrefExpr;
  for (let hop = 0; hop < 4; hop += 1) {
    const idMatch = cursor.match(/^\s*([A-Za-z_$][\w$]*)\s*$/);
    const id = idMatch ? idMatch[1] : null;
    if (!id || seen.has(id)) break;
    seen.add(id);
    const decl = new RegExp(
      `(?:const|let|var)\\s+${id}\\s*(?::[^=\\n]*)?=\\s*([\\s\\S]{0,600}?);[ \\t]*\\r?\\n`
    ).exec(masked);
    if (!decl) break;
    cursor = decl[1];
    chain.push(cursor);
    const inner = cursor.match(/destination\s*:\s*([A-Za-z_$][\w$]*)/);
    if (inner) cursor = inner[1];
  }
  const joined = chain.join('\n');
  if (!mentions(joined)) return { declared: false, why: 'href never reaches a commercial field' };
  if (/\?\?|\|\|/.test(joined)) {
    return {
      declared: false,
      why: 'commercial field has a non-commercial fallback, so the marker also covers unpaid links',
    };
  }
  return { declared: true, why: 'href is gated on a commercial field' };
}

/* ── main ────────────────────────────────────────────────────────────────── */

async function main() {
  const srcFiles = [];
  for (const root of SRC_ROOTS) srcFiles.push(...(await walk(path.join(SRC_DIR, root))));

  const scanned = srcFiles
    .filter((f) => SRC_EXTS.has(path.extname(f)))
    .filter((f) => !TEST_FILE.test(f))
    .sort();

  const rel = (f) => path.relative(SRC_DIR, f).split(path.sep).join('/');

  const commercialReads = [];
  const commercialSortKeys = [];
  const unclassifiedSortKeys = [];
  const sortSites = [];
  const sponsoredMarkers = [];
  const orderArrayRefs = [];
  const keyTally = new Map();
  const filesWithDisclosure = [];

  const allowed = new Set(COMMERCIAL_READ_ALLOWLIST.map((a) => `${a.file}::${a.field}`));
  const fieldAlt = [...COMMERCIAL_FIELDS].join('|');
  const readRe = new RegExp(`(?:\\.|\\?\\.)\\s*(${fieldAlt})\\b`, 'g');
  const bracketReadRe = new RegExp(`\\[\\s*['"\`](${fieldAlt})['"\`]\\s*\\]`, 'g');

  for (const file of scanned) {
    const raw = await readFile(file, 'utf8');
    const masked = maskNonCode(raw);
    const commentFree = maskNonCode(raw, { strings: false });
    const r = rel(file);

    if (DISCLOSURE_RE.test(raw)) filesWithDisclosure.push(r);

    /* commercial field reads anywhere in reader-facing code */
    for (const m of masked.matchAll(readRe)) {
      if (allowed.has(`${r}::${m[1]}`)) continue;
      commercialReads.push({ file: r, line: lineAt(raw, m.index), field: m[1] });
    }
    for (const m of commentFree.matchAll(bracketReadRe)) {
      if (allowed.has(`${r}::${m[1]}`)) continue;
      commercialReads.push({ file: r, line: lineAt(raw, m.index), field: m[1] });
    }

    /* sort comparators */
    for (const m of masked.matchAll(/\.\s*(sort|toSorted)\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      const span = balanced(masked, open);
      if (!span) continue;
      const maskedArg = masked.slice(span.start, span.end);
      const line = lineAt(raw, m.index);
      const keys = propertyNames(maskedArg, commentFree.slice(span.start, span.end));
      sortSites.push({ file: r, line, keys: [...keys].sort() });
      for (const k of keys) {
        keyTally.set(k, (keyTally.get(k) ?? 0) + 1);
        if (COMMERCIAL_FIELDS.has(k)) commercialSortKeys.push({ file: r, line, key: k });
        else if (!ALLOWED_SORT_KEYS.has(k)) unclassifiedSortKeys.push({ file: r, line, key: k });
      }
      /* hardcoded order arrays reached through indexOf inside the comparator */
      for (const im of maskedArg.matchAll(/([A-Za-z_$][\w$]*)\s*\.\s*indexOf\s*\(/g)) {
        orderArrayRefs.push({ file: r, line, identifier: im[1], raw });
      }
    }

    /* paid-placement markers */
    if (path.extname(file) === '.astro' || path.extname(file) === '.tsx') {
      const relAttr = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{\s*['"]([^'"]*)['"]\s*\})/g;
      for (const m of raw.matchAll(relAttr)) {
        const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
        if (!PAID_MARKER_RE.test(value)) continue;
        const elementStart = raw.lastIndexOf('<', m.index);
        const element = raw.slice(elementStart, m.index + 400);
        const hrefMatch = element.match(/href\s*=\s*\{([^}]*)\}/);
        const hrefExpr = hrefMatch ? hrefMatch[1].trim() : null;
        sponsoredMarkers.push({
          file: r,
          line: lineAt(raw, m.index),
          rel: value,
          href: hrefExpr,
          ...classifyHref(hrefExpr, masked),
        });
      }
    }
  }

  const records = await loadContentRecords(CONTENT_DIR);
  const relationshipSlugs = new Set(
    records.filter((rec) => hasRelationship(rec.data)).map((rec) => rec.data.slug).filter(Boolean)
  );

  const orderArrays = [];
  const orderArrayCommercial = [];
  for (const ref of orderArrayRefs) {
    const decl = new RegExp(
      `(?:const|let|var)\\s+${ref.identifier}\\s*(?::[^=\\n]*)?=\\s*\\[([^\\]]*)\\]`
    ).exec(ref.raw);
    const members = decl ? [...decl[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [];
    orderArrays.push({ file: ref.file, line: ref.line, identifier: ref.identifier, members });
    for (const slug of members) {
      if (relationshipSlugs.has(slug)) {
        orderArrayCommercial.push({
          file: ref.file, line: ref.line, identifier: ref.identifier, slug,
        });
      }
    }
  }

  const withRelationship = records.filter((rec) => hasRelationship(rec.data));
  const withNonDefault = records
    .map((rec) => ({ file: rec.file, fields: nonDefaultCommercialFields(rec.data) }))
    .filter((rec) => rec.fields.length > 0);
  const featuredPartnerRecords = records.filter((rec) => 'featuredPartner' in rec.data);

  /**
   * Disclosure tripwire. A record with a commercial relationship in effect must
   * render a disclosure: either in its own body, or on a reader-facing template
   * for its collection. Generous by design - the tripwire catches a paid record
   * going live with no disclosure anywhere, it does not grade the wording.
   */
  const disclosureGap = [];
  for (const rec of withRelationship) {
    const collection = rec.file.split('/')[0];
    const surfaceDiscloses = filesWithDisclosure.some((f) => f.includes(collection));
    if (!present(rec.data.affiliateNote) && !DISCLOSURE_RE.test(rec.raw) && !surfaceDiscloses) {
      disclosureGap.push({ file: rec.file, slug: rec.data.slug ?? null, collection });
    }
  }

  const markersUndeclared = sponsoredMarkers.filter((s) => !s.declared);

  const totals = {
    scannedSourceFiles: scanned.length,
    sortSites: sortSites.length,
    distinctSortKeys: keyTally.size,
    contentRecords: records.length,
    featuredPartnerRecords: featuredPartnerRecords.length,
    commercialReads: commercialReads.length,
    commercialSortKeys: commercialSortKeys.length,
    unclassifiedSortKeys: unclassifiedSortKeys.length,
    orderArrayCommercial: orderArrayCommercial.length,
    sponsoredMarkers: sponsoredMarkers.length,
    sponsoredMarkersUndeclared: markersUndeclared.length,
    commercialRelationships: withRelationship.length,
    commercialFieldsNonDefault: withNonDefault.length,
    disclosureGap: disclosureGap.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    commercialFields: [...COMMERCIAL_FIELDS],
    assertedMetrics: [...ASSERTED_METRICS],
    totals,
    commercialReads,
    commercialSortKeys,
    unclassifiedSortKeys,
    orderArrayCommercial,
    orderArrays,
    sponsoredMarkers,
    commercialRelationships: withRelationship.map((rec) => rec.file),
    commercialFieldsNonDefault: withNonDefault,
    disclosureGap,
    sortKeyTally: Object.fromEntries([...keyTally].sort((a, b) => b[1] - a[1])),
  };

  const t = totals;
  console.log(
    `Commercial firewall audit - ${t.scannedSourceFiles} reader-facing files, ` +
    `${t.sortSites} sort sites, ${t.contentRecords} content records`
  );
  console.log('');
  console.log('  Code');
  console.log(`    commercial field reads ........ ${t.commercialReads}   [gated]`);
  console.log(`    commercial keys in a sort ..... ${t.commercialSortKeys}   [gated]`);
  console.log(`    unclassified ordering keys .... ${t.unclassifiedSortKeys}   [gated]`);
  console.log(`    order arrays w/ paid record ... ${t.orderArrayCommercial}   [gated]`);
  console.log('  Disclosure');
  console.log(`    paid markers, total ........... ${t.sponsoredMarkers}   [report-only]`);
  console.log(`    paid markers, undeclared ...... ${t.sponsoredMarkersUndeclared}   [gated]`);
  console.log(`    relationships w/o disclosure .. ${t.disclosureGap}   [gated]`);
  console.log('  Content');
  console.log(`    records with featuredPartner .. ${t.featuredPartnerRecords}   [report-only]`);
  console.log(`    commercial relationships ...... ${t.commercialRelationships}   [gated]`);
  console.log(`    commercial fields non-default . ${t.commercialFieldsNonDefault}   [gated]`);
  console.log('');

  for (const c of commercialReads) {
    console.log(`    COMMERCIAL READ  ${c.file}:${c.line} reads ${c.field}`);
  }
  for (const c of commercialSortKeys) {
    console.log(`    RANKING BREACH   ${c.file}:${c.line} sorts on ${c.key}`);
  }
  for (const u of unclassifiedSortKeys) {
    console.log(`    UNCLASSIFIED KEY ${u.file}:${u.line} orders by "${u.key}"`);
  }
  for (const o of orderArrayCommercial) {
    console.log(`    PAID IN ORDER    ${o.file}:${o.line} ${o.identifier} contains ${o.slug}`);
  }
  for (const s of markersUndeclared) {
    console.log(`    UNDECLARED PAID  ${s.file}:${s.line} rel="${s.rel}" href=${s.href} (${s.why})`);
  }
  for (const d of disclosureGap) {
    console.log(`    NO DISCLOSURE    ${d.file} has a commercial relationship and renders none`);
  }
  if (VERBOSE) {
    console.log('');
    console.log('  Ordering keys in use:');
    for (const [k, n] of [...keyTally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      const tag = COMMERCIAL_FIELDS.has(k)
        ? 'COMMERCIAL'
        : ALLOWED_SORT_KEYS.has(k)
          ? 'allowed'
          : 'UNCLASSIFIED';
      console.log(`    ${String(n).padStart(4)}  ${k}  [${tag}]`);
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
          commercialFields: [...COMMERCIAL_FIELDS],
          assertedMetrics: [...ASSERTED_METRICS],
          ceilings: totals,
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
    /* Fail closed. A missing or corrupt baseline must never read as "no regression". */
    console.error(`\n  FAIL: cannot read baseline ${path.relative(REPO, BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:commercial-firewall -- --update-baseline');
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
    console.error('\n  FAIL: commercial firewall regression against the ratchet baseline');
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  A commercial field must never reach a reader-facing ordering decision.');
    console.error('  If this change is deliberate and disclosed, say so in code: add the read');
    console.error('  to COMMERCIAL_READ_ALLOWLIST, or the key to ALLOWED_SORT_KEYS, in');
    console.error('  scripts/audit-commercial-firewall.mjs with a reason, then re-seed the');
    console.error('  baseline with --update-baseline. The re-seed is the audit trail.');
    process.exit(1);
  }
  console.log('  PASS: no regression against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
