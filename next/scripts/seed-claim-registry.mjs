#!/usr/bin/env node
/**
 * seed-claim-registry.mjs  -  PI-005 Stage 1, the mechanical seed.
 *
 * Emits claim and evidence records from provenance that is ALREADY on disk.
 * There is no editorial judgement in this script and there must never be: it
 * does not decide whether a fact is true, only that someone once wrote down
 * where they got it. Seven such places exist in this corpus, and until now
 * five of them were write-only fields nothing ever read:
 *
 *   quick-note sources[]            196 rows, the only place in the corpus
 *                                   where a source is attached to a claim
 *   event primarySourceUrl           91
 *   event secondarySourceUrl         49
 *   event importer provenance triple 12 (provenance + source + sourceUrl,
 *                                   declared in the schema only recently;
 *                                   before that Zod silently dropped them)
 *   species vfaCitationUrl           12
 *   signature-event officialUrl      10
 *   src/data/facts/ source keys      59 (orphaned layer, no collection, no
 *                                   page. Harvested here; retiring it is a
 *                                   separate decision and NOT this script's.)
 *
 * Two rules keep the seed honest:
 *
 *   1. expiresAt is computed from the date the record ALREADY carried, never
 *      from the migration date. A migration cannot make the corpus fresher
 *      than it was, so a large share of these rows seed already expired. That
 *      is the correct result, not a defect: an expired row is unsupported,
 *      not deleted.
 *   2. publisher.kind is inferred only from structural signals: the gov.au
 *      suffix, an explicit list of ticketing and regional-body hosts, and a
 *      host that matches the record's own name. Anything else is 'unknown'.
 *      The migration does not guess which publications count as press.
 *
 * Every emitted row carries a legacy block naming the field, its value and
 * the file, so the seed is reversible and nothing is lost.
 *
 * Idempotent by construction: every value is derived from disk and from
 * src/data/source-precedence.json, and nothing reads the wall clock except
 * the report's `asAt`, which is day-resolution and overridable with --today.
 * Re-running changes nothing.
 *
 * Usage:
 *   node scripts/seed-claim-registry.mjs             plan only, writes nothing
 *   node scripts/seed-claim-registry.mjs --apply     write the plan
 *   node scripts/seed-claim-registry.mjs --json out.json
 *   node scripts/seed-claim-registry.mjs --md out.md
 *
 * Test-harness overrides (production callers pass none of these):
 *   --content-dir --data-dir --claims-dir --evidence-dir --precedence --today
 *
 * Exit: 0 planned or applied cleanly; 1 a source could not be read, a subject
 * did not resolve against disk, or an id collided.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { computeExpiresAt, toIsoDay } from '../src/lib/claim-state.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const APPLY = args.includes('--apply');
const CONTENT_DIR = path.resolve(getArg('--content-dir', path.join(NEXT, 'src', 'content')));
const DATA_DIR = path.resolve(getArg('--data-dir', path.join(NEXT, 'src', 'data')));
const CLAIMS_DIR = path.resolve(getArg('--claims-dir', path.join(CONTENT_DIR, 'claims')));
const EVIDENCE_DIR = path.resolve(getArg('--evidence-dir', path.join(CONTENT_DIR, 'evidence')));
const PRECEDENCE = path.resolve(getArg('--precedence', path.join(DATA_DIR, 'source-precedence.json')));
const JSON_OUT = getArg('--json', null);
const MD_OUT = getArg('--md', null);
const TODAY = getArg('--today', new Date().toISOString().slice(0, 10));

/* ------------------------------------------------------------------ */
/* House style. These run over every string the seed emits.            */
/* ------------------------------------------------------------------ */

/**
 * BRAND-PI hard rules: no em-dashes and no figures in anything that lands
 * under src/content or src/data. Both are build-blocking (scripts/
 * lint-house-style.mjs and scripts/lint-no-pricing.mjs), and both scan JSON,
 * so a harvested value carrying either would fail the build on the file this
 * script wrote. Applied to legacy.value as well: the original is still in git
 * at legacy.file, which is what makes the seed reversible, so normalising the
 * copy loses nothing.
 *
 * The test forms are deliberately non-global. A /g regex carries lastIndex
 * between .test() calls, and this function is called a few thousand times.
 */
const HAS_EM_DASH = /—/;
const HAS_FIGURE = /\$\s?\d/;
const EM_DASH_ALL = /\s*—\s*/g;
const FIGURE_ALL = /\$\s?\d[\d,.]*/g;

let scrubbedFigures = 0;
let scrubbedDashes = 0;

export function houseStyle(value) {
  let text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (HAS_EM_DASH.test(text)) scrubbedDashes += 1;
  text = text.replace(EM_DASH_ALL, ' - ');
  if (HAS_FIGURE.test(text)) scrubbedFigures += 1;
  text = text.replace(FIGURE_ALL, '[figure withheld]');
  return text;
}

/* ------------------------------------------------------------------ */
/* Publisher classification. Structural signals only.                  */
/* ------------------------------------------------------------------ */

/** Ticket resellers. A reseller is evidence a thing is on sale, not that
 *  the organiser says it is running, so it ranks below the organiser. */
const TICKETING_HOSTS = new Set([
  'humanitix.com', 'events.humanitix.com', 'eventbrite.com.au', 'eventbrite.com',
  'trybooking.com', 'simpletix.com', 'moshtix.com.au', 'oztix.com.au',
  'ticketek.com.au', 'stickytickets.com.au', 'tickettailor.com',
]);

/** Tourism boards and industry associations for this region. */
const REGIONAL_BODY_HOSTS = new Set([
  'visitmorningtonpeninsula.org', 'morningtonpeninsulawine.com.au',
  'visitvictoria.com', 'atdw.com.au', 'visitmelbourne.com',
]);

const SOCIAL_HOSTS = new Set(['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'tiktok.com']);

/** Our own domain. An event citing us as its source is not evidence. */
const SELF_HOSTS = new Set(['peninsulainsider.com.au']);

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Does this host look like the named thing's own site? Compares the host's
 * first label against the name with everything but letters and digits
 * removed, in both directions. Structural, deterministic, and conservative:
 * a four-character floor keeps 'the' and 'mre' from matching everything.
 */
export function looksLikeOwnSite(name, host) {
  if (!name || !host) return false;
  const flat = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const label = flat(host.split('.')[0]);
  const subject = flat(name);
  if (label.length < 4 || subject.length < 4) return false;
  return label.includes(subject) || subject.includes(label);
}

/**
 * Infer publisher.kind from a URL. Returns 'unknown' unless a structural
 * signal is present. `owners` are names whose own site would be authoritative
 * here, most specific first, each paired with the kind to use on a match.
 */
export function classifyUrl(url, owners = []) {
  const host = hostOf(url);
  if (!host) return 'unknown';
  if (SELF_HOSTS.has(host)) return 'unknown';
  if (/(^|\.)gov\.au$/.test(host)) return 'gov';
  if (TICKETING_HOSTS.has(host)) return 'ticketing';
  if (REGIONAL_BODY_HOSTS.has(host)) return 'regional-body';
  if (SOCIAL_HOSTS.has(host)) return 'social';
  for (const [name, kind] of owners) {
    if (looksLikeOwnSite(name, host)) return kind;
  }
  return 'unknown';
}

/**
 * Some harvested "source" values are a URL with an aside after it, and some
 * are not URLs at all. Split rather than discard: nothing is lost either way,
 * because the raw value goes into legacy.value regardless.
 */
export function splitSourceValue(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { url: null, method: null };
  const [first, ...rest] = text.split(/\s+/);
  if (hostOf(first)) {
    return { url: first, method: rest.length ? houseStyle(rest.join(' ').replace(/^\(|\)$/g, '')) : null };
  }
  return { url: null, method: houseStyle(text) };
}

/* ------------------------------------------------------------------ */
/* Claim-class maps. Explicit tables, not inference.                   */
/* ------------------------------------------------------------------ */

/** quick-note tag -> claim class. The tag is already the editor's own
 *  statement of what kind of fact the note carries. */
const QUICK_NOTE_TAG_CLASS = {
  'opening-window': 'booking',
  'menu-change': 'offering',
  closure: 'trading-status',
  event: 'event-schedule',
  weather: 'conditions',
  'editor-note': 'editorial',
  pricing: 'rate-change',
  safety: 'access-restriction',
};

/**
 * Fact-layer file and section -> claim class. The fact layer has no schema,
 * so this table is the only thing that gives its 59 source keys a meaning.
 */
const FACTS_CLASS = {
  'beaches:activeAlerts': 'access-restriction',
  'beaches:entities': 'access-restriction',
  'food:activeAlerts': 'trading-status',
  'food:entities': 'trading-status',
  'things-to-do:entities': 'trading-status',
  'wine:region': 'regional-count',
  'wine:wineries': 'trading-status',
  'accommodation:entities': 'trading-status',
};

/* ------------------------------------------------------------------ */
/* Disk helpers                                                        */
/* ------------------------------------------------------------------ */

const exists = async (p) => {
  try { await stat(p); return true; } catch { return false; }
};

async function listEntries(dir, exts) {
  if (!(await exists(dir))) return [];
  const names = await readdir(dir, { recursive: true });
  return names
    .filter((name) => exts.some((ext) => name.endsWith(ext)))
    .map((name) => ({
      file: path.join(dir, name),
      rel: name.split(path.sep).join('/'),
      id: name.split(path.sep).join('/').replace(/\.[^.]+$/, ''),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readFrontmatter(file) {
  const raw = await readFile(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`no frontmatter: ${file}`);
  return YAML.parse(m[1]);
}

/** Repo-relative path, forward slashes, for legacy.file. */
const relToRepo = (file) => path.relative(REPO, file).split(path.sep).join('/');

/* ------------------------------------------------------------------ */
/* Harvest                                                             */
/* ------------------------------------------------------------------ */

/**
 * One harvested row. Rows become claims (grouped by subject and class) and
 * evidence (one per row).
 */
function row(fields) {
  return {
    stance: 'supports',
    url: null,
    method: null,
    note: null,
    publisherName: null,
    assertedBy: [],
    ...fields,
  };
}

export async function harvest({ contentDir, dataDir }) {
  const rows = [];
  const warnings = [];
  const counts = {};
  const bump = (key) => { counts[key] = (counts[key] ?? 0) + 1; };

  /* --- collection ids on disk, for subject validation ---------------- */
  const idsByType = new Map();
  for (const type of ['venues', 'experiences', 'places', 'quick-notes', 'events', 'species', 'signature-events']) {
    const exts = ['.json', '.md', '.mdx'];
    const entries = await listEntries(path.join(contentDir, type), exts);
    idsByType.set(type, new Set(entries.map((e) => e.id)));
  }
  const resolveRelated = (slug) => {
    for (const type of ['venues', 'experiences', 'places']) {
      if (idsByType.get(type).has(slug)) return { type, slug };
    }
    return null;
  };

  /* --- 1. quick-note sources[] --------------------------------------- */
  for (const entry of await listEntries(path.join(contentDir, 'quick-notes'), ['.md', '.mdx'])) {
    const data = await readFrontmatter(entry.file);
    const sources = Array.isArray(data.sources) ? data.sources : [];
    if (!sources.length) continue;
    const claimClass = QUICK_NOTE_TAG_CLASS[data.tag];
    if (!claimClass) {
      warnings.push(`quick-note ${entry.id}: unmapped tag '${data.tag}', skipped ${sources.length} source(s)`);
      continue;
    }
    const subject = { type: 'quick-notes', slug: entry.id, field: 'sources' };
    const assertedBy = [subject];
    if (data.relatedVenue) {
      const related = resolveRelated(data.relatedVenue);
      if (related) { assertedBy.push(related); bump('quickNotes.relatedResolved'); }
      else { warnings.push(`quick-note ${entry.id}: relatedVenue '${data.relatedVenue}' resolves to no record on disk`); bump('quickNotes.relatedUnresolved'); }
    }
    sources.forEach((source, i) => {
      const dateField = source.checkedAt ? `sources[${i}].checkedAt` : data.verifiedAt ? 'verifiedAt' : 'publishedAt';
      const retrievedAt = toIsoDay(source.checkedAt ?? data.verifiedAt ?? data.publishedAt);
      if (!retrievedAt) { warnings.push(`quick-note ${entry.id}: sources[${i}] has no usable date, skipped`); return; }
      rows.push(row({
        origin: 'quickNotes.sources',
        subject,
        assertedBy,
        claimClass,
        statement: houseStyle(data.headline),
        publisherKind: source.kind ?? 'unknown',
        url: source.url ?? null,
        note: source.note ? houseStyle(source.note) : null,
        retrievedAt,
        legacy: {
          file: relToRepo(entry.file),
          field: `sources[${i}]`,
          value: houseStyle(JSON.stringify(source)),
          dateField,
        },
      }));
      bump('quickNotes.sources');
    });
  }

  /* --- 2, 3, 4. events ------------------------------------------------ */
  for (const entry of await listEntries(path.join(contentDir, 'events'), ['.json'])) {
    const data = await readJson(entry.file);
    const subject = { type: 'events', slug: entry.id };
    const cancelled = data.cancelled === true;
    const claimClass = 'event-status';
    const statement = cancelled
      ? `${houseStyle(data.title ?? entry.id)} is cancelled.`
      : `${houseStyle(data.title ?? entry.id)} is running as published.`;
    const owners = [
      [data.organiser?.name, 'organiser'],
      [data.venueName, 'venue-site'],
      [data.title, 'organiser'],
    ].filter(([name]) => name);

    const push = (field, url, extra) => {
      const dateField = data.lastCheckedDate ? 'lastCheckedDate'
        : data.discoveredAt ? 'discoveredAt'
        : data.publishedAt ? 'publishedAt' : null;
      const retrievedAt = toIsoDay(data.lastCheckedDate ?? data.discoveredAt ?? data.publishedAt);
      if (!retrievedAt) { warnings.push(`event ${entry.id}: ${field} has no usable date, skipped`); return; }
      rows.push(row({
        subject,
        assertedBy: [subject],
        claimClass,
        statement,
        retrievedAt,
        legacy: { file: relToRepo(entry.file), field, value: houseStyle(url), dateField },
        ...extra,
        url,
      }));
    };

    if (data.primarySourceUrl) {
      const kind = classifyUrl(data.primarySourceUrl, owners);
      push('primarySourceUrl', data.primarySourceUrl, {
        origin: 'events.primarySourceUrl',
        publisherKind: kind,
        // Only name the publisher when the host is actually theirs. A council
        // listing of a winery event is published by the council, and naming
        // the winery on it would read as a claim the winery never made.
        publisherName: kind === 'organiser' || kind === 'venue-site'
          ? houseStyle(data.organiser?.name ?? data.venueName ?? '')
          : null,
      });
      bump('events.primarySourceUrl');
      if (SELF_HOSTS.has(hostOf(data.primarySourceUrl) ?? '')) {
        warnings.push(`event ${entry.id}: primarySourceUrl cites peninsulainsider.com.au, which is not evidence`);
        bump('events.selfCited');
      }
    }
    if (data.secondarySourceUrl) {
      push('secondarySourceUrl', data.secondarySourceUrl, {
        origin: 'events.secondarySourceUrl',
        publisherKind: classifyUrl(data.secondarySourceUrl, owners),
      });
      bump('events.secondarySourceUrl');
    }
    // The importer triple. Its own date (discoveredAt) is the right one here:
    // it records when the pipeline looked, not when an editor checked.
    if (data.provenance && data.source && data.sourceUrl) {
      const retrievedAt = toIsoDay(data.discoveredAt ?? data.lastCheckedDate ?? data.publishedAt);
      const dateField = data.discoveredAt ? 'discoveredAt' : data.lastCheckedDate ? 'lastCheckedDate' : 'publishedAt';
      if (!retrievedAt) {
        warnings.push(`event ${entry.id}: importer provenance has no usable date, skipped`);
      } else {
        rows.push(row({
          origin: 'events.importerProvenance',
          subject,
          assertedBy: [subject],
          claimClass,
          statement,
          publisherKind: 'importer',
          publisherName: houseStyle(data.source),
          url: data.sourceUrl,
          note: houseStyle(data.provenance),
          retrievedAt,
          legacy: {
            file: relToRepo(entry.file),
            field: 'provenance+source+sourceUrl',
            value: houseStyle(JSON.stringify({ provenance: data.provenance, source: data.source, sourceUrl: data.sourceUrl })),
            dateField,
          },
        }));
        bump('events.importerProvenance');
      }
    }
  }

  /* --- 5. species vfaCitationUrl -------------------------------------- */
  for (const entry of await listEntries(path.join(contentDir, 'species'), ['.md', '.mdx'])) {
    const data = await readFrontmatter(entry.file);
    if (!data.vfaCitationUrl) continue;
    const retrievedAt = toIsoDay(data.lastVerified ?? data.publishedAt);
    if (!retrievedAt) { warnings.push(`species ${entry.id}: no usable date, skipped`); continue; }
    const subject = { type: 'species', slug: entry.id, field: 'vfaCitationUrl' };
    rows.push(row({
      origin: 'species.vfaCitationUrl',
      subject,
      assertedBy: [subject],
      claimClass: 'fishing-rule',
      statement: `Bag limit, size limit and season for ${houseStyle(data.commonName ?? entry.id)} are as published.`,
      publisherKind: classifyUrl(data.vfaCitationUrl, [['Victorian Fisheries Authority', 'gov']]),
      publisherName: 'Victorian Fisheries Authority',
      url: data.vfaCitationUrl,
      retrievedAt,
      legacy: {
        file: relToRepo(entry.file),
        field: 'vfaCitationUrl',
        value: houseStyle(data.vfaCitationUrl),
        dateField: data.lastVerified ? 'lastVerified' : 'publishedAt',
      },
    }));
    bump('species.vfaCitationUrl');
  }

  /* --- 6. signature-event officialUrl --------------------------------- */
  for (const entry of await listEntries(path.join(contentDir, 'signature-events'), ['.json'])) {
    const data = await readJson(entry.file);
    if (!data.officialUrl) continue;
    const retrievedAt = toIsoDay(data.lastReviewed);
    if (!retrievedAt) { warnings.push(`signature-event ${entry.id}: no lastReviewed, skipped`); continue; }
    const subject = { type: 'signature-events', slug: entry.id, field: 'officialUrl' };
    const name = houseStyle(data.name ?? entry.id);
    rows.push(row({
      origin: 'signatureEvents.officialUrl',
      subject,
      assertedBy: [subject],
      claimClass: 'event-status',
      statement: data.recurrence
        ? `${name} runs as published (${houseStyle(data.recurrence)}).`
        : `${name} runs as published.`,
      publisherKind: classifyUrl(data.officialUrl, [[data.name, 'organiser']]),
      retrievedAt,
      url: data.officialUrl,
      legacy: {
        file: relToRepo(entry.file),
        field: 'officialUrl',
        value: houseStyle(data.officialUrl),
        dateField: 'lastReviewed',
      },
    }));
    bump('signatureEvents.officialUrl');
  }

  /* --- 7. the orphaned fact layer ------------------------------------- */
  const factsDir = path.join(dataDir, 'facts');
  for (const name of (await exists(factsDir)) ? (await readdir(factsDir)).sort() : []) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(factsDir, name);
    const stem = name.replace(/\.json$/, '');
    const data = await readJson(file);
    const fileDate = toIsoDay(data.lastUpdated);

    /** Every {source: "..."} in the file, with the node that carries it. */
    const found = [];
    const walk = (node, trail, section, owner) => {
      if (Array.isArray(node)) {
        node.forEach((child, i) => walk(child, `${trail}[${i}]`, section, owner));
        return;
      }
      if (!node || typeof node !== 'object') return;
      const ownName = node.name ?? node.entity ?? owner?.name ?? null;
      // Carry the date's FIELD as well as its value. The fact layer nests, so
      // an entity with no date of its own inherits the file's lastUpdated,
      // and recording that as 'dateSince' would misdescribe where it came
      // from in the one block that exists to make the seed reversible.
      const ownDate = node.dateSince
        ? { value: node.dateSince, field: 'dateSince' }
        : node.lastUpdated
          ? { value: node.lastUpdated, field: 'lastUpdated' }
          : owner?.date ?? null;
      for (const [key, value] of Object.entries(node)) {
        const nextSection = trail === '' ? key : section;
        if (key === 'source' && typeof value === 'string') {
          found.push({ trail: `${trail}.source`, value, name: ownName, date: ownDate, section: nextSection ?? section });
        } else {
          walk(value, trail === '' ? `.${key}` : `${trail}.${key}`, nextSection ?? section, { name: ownName, date: ownDate });
        }
      }
    };
    walk(data, '', null, null);

    for (const hit of found) {
      const claimClass = FACTS_CLASS[`${stem}:${hit.section}`];
      if (!claimClass) {
        warnings.push(`facts ${stem}.json: no claim class for section '${hit.section}' at ${hit.trail}, skipped`);
        bump('facts.unmappedSection');
        continue;
      }
      // dateSince is a YYYY-MM stamp in this layer. Anchor it to the first of
      // the month rather than inventing a day.
      const rawDate = hit.date ? String(hit.date.value) : null;
      const anchored = rawDate && /^\d{4}-\d{2}$/.test(rawDate) ? `${rawDate}-01` : rawDate;
      const retrievedAt = toIsoDay(anchored) ?? fileDate;
      if (!retrievedAt) { warnings.push(`facts ${stem}.json: ${hit.trail} has no usable date, skipped`); continue; }
      const entityLabel = hit.name ? houseStyle(hit.name) : hit.trail.replace(/^\./, '');
      const entitySlug = (hit.name ? String(hit.name) : hit.trail)
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
      const subject = { type: 'data-facts', slug: `${stem}/${entitySlug}`, field: hit.trail.replace(/^\./, '') };
      const { url, method } = splitSourceValue(hit.value);
      rows.push(row({
        origin: 'dataFacts.source',
        subject,
        assertedBy: [subject],
        claimClass,
        statement: `${entityLabel}: ${claimClass.replace(/-/g, ' ')} as recorded in src/data/facts/${name}.`,
        publisherKind: classifyUrl(url, [[hit.name, 'venue-site']]),
        url,
        method,
        retrievedAt,
        legacy: {
          file: relToRepo(file),
          field: hit.trail.replace(/^\./, ''),
          value: houseStyle(hit.value),
          dateField: hit.date?.field ?? 'lastUpdated',
        },
      }));
      bump('dataFacts.source');
    }
  }

  return { rows, warnings, counts, idsByType };
}

/* ------------------------------------------------------------------ */
/* Build the registry                                                  */
/* ------------------------------------------------------------------ */

const slugSafe = (value) => String(value).replace(/[^a-zA-Z0-9/_-]/g, '-');

export function buildRegistry(rows, { precedence, today }) {
  const claims = new Map();
  const evidence = new Map();
  const problems = [];

  const ordered = [...rows].sort((a, b) => {
    const ka = `${a.subject.type}/${a.subject.slug}/${a.claimClass}/${a.legacy.file}/${a.legacy.field}`;
    const kb = `${b.subject.type}/${b.subject.slug}/${b.claimClass}/${b.legacy.file}/${b.legacy.field}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  for (const item of ordered) {
    const claimId = slugSafe(`${item.subject.type}/${item.subject.slug}/${item.claimClass}`);
    let claim = claims.get(claimId);
    if (!claim) {
      claim = {
        claimId,
        claimClass: item.claimClass,
        subject: item.subject,
        statement: item.statement,
        assertedBy: [],
        createdAt: item.retrievedAt,
        origin: 'migrated',
        note: 'Seeded by scripts/seed-claim-registry.mjs (PI-005 Stage 1) from provenance already on disk. No editorial judgement was applied.',
      };
      claims.set(claimId, claim);
    }
    // createdAt is the earliest date the corpus already carried, not the day
    // the migration ran. Using today would make re-runs non-idempotent and
    // would date the claim to the migration rather than to the evidence.
    if (item.retrievedAt < claim.createdAt) claim.createdAt = item.retrievedAt;
    for (const asserter of item.assertedBy) {
      const key = `${asserter.type}/${asserter.slug}/${asserter.field ?? ''}`;
      if (!claim.assertedBy.some((a) => `${a.type}/${a.slug}/${a.field ?? ''}` === key)) {
        claim.assertedBy.push(asserter);
      }
    }

    let expiresAt;
    try {
      expiresAt = toIsoDay(computeExpiresAt(item.retrievedAt, item.claimClass, precedence));
    } catch (error) {
      problems.push(`${claimId}: ${error.message}`);
      continue;
    }

    const fingerprint = createHash('sha1')
      .update([claimId, item.legacy.file, item.legacy.field, item.url ?? item.method ?? ''].join('|'))
      .digest('hex')
      .slice(0, 8);
    const evidenceId = `${slugSafe(`${item.subject.type}/${item.subject.slug}`)}/${item.claimClass}-${fingerprint}`;
    if (evidence.has(evidenceId)) {
      problems.push(`evidence id collision: ${evidenceId}`);
      continue;
    }

    const record = {
      evidenceId,
      claim: claimId,
      stance: item.stance,
      publisher: { kind: item.publisherKind },
      retrievedAt: item.retrievedAt,
      expiresAt,
      origin: 'migrated',
      legacy: item.legacy,
    };
    if (item.publisherName) record.publisher.name = item.publisherName;
    if (item.url) record.url = item.url;
    if (item.method) record.method = item.method;
    if (item.note) record.note = item.note;
    evidence.set(evidenceId, record);
  }

  const expired = [...evidence.values()].filter((e) => e.expiresAt < today);
  return { claims, evidence, problems, expired };
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

/** Every text file in this repo is CRLF with a trailing newline. */
const serialise = (value) => `${JSON.stringify(value, null, 2)}\n`.replace(/\r?\n/g, '\r\n');

async function planWrites(records, dir, key) {
  const plan = { create: [], update: [], unchanged: [], files: new Map() };
  for (const record of records.values()) {
    const file = path.join(dir, `${record[key]}.json`);
    const next = serialise(record);
    plan.files.set(file, next);
    let current = null;
    try { current = await readFile(file, 'utf8'); } catch { /* absent */ }
    if (current === null) plan.create.push(record[key]);
    else if (current === next) plan.unchanged.push(record[key]);
    else plan.update.push(record[key]);
  }
  // Files that a previous run wrote and this one does not produce. Never
  // deleted here: removing a claim is a decision, not a migration step.
  const existing = await listEntries(dir, ['.json']);
  plan.orphaned = existing.map((e) => e.id).filter((id) => !records.has(id));
  return plan;
}

async function applyPlan(plan) {
  for (const [file, body] of plan.files) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const SOURCE_LABELS = {
  'quickNotes.sources': 'Quick-note sources[] entries',
  'events.primarySourceUrl': 'Event primarySourceUrl',
  'events.secondarySourceUrl': 'Event secondarySourceUrl',
  'events.importerProvenance': 'Event importer provenance triple',
  'species.vfaCitationUrl': 'Species citation URLs',
  'signatureEvents.officialUrl': 'Signature-event official URLs',
  'dataFacts.source': 'Orphaned fact layer source keys',
};

function buildReport({ rows, warnings, claims, evidence, expired, today }) {
  const bySource = {};
  const byClass = {};
  const byKind = {};
  const expiredBySource = {};
  for (const item of rows) {
    bySource[item.origin] = (bySource[item.origin] ?? 0) + 1;
    byClass[item.claimClass] = (byClass[item.claimClass] ?? 0) + 1;
    byKind[item.publisherKind] = (byKind[item.publisherKind] ?? 0) + 1;
  }
  const originById = new Map(rows.map((item) => [
    `${slugSafe(`${item.subject.type}/${item.subject.slug}/${item.claimClass}`)}|${item.legacy.file}|${item.legacy.field}`,
    item.origin,
  ]));
  for (const record of expired) {
    const key = `${record.claim}|${record.legacy.file}|${record.legacy.field}`;
    const origin = originById.get(key) ?? 'unknown';
    expiredBySource[origin] = (expiredBySource[origin] ?? 0) + 1;
  }
  return {
    ticket: 'PI-005',
    stage: 1,
    asAt: today,
    generator: 'next/scripts/seed-claim-registry.mjs',
    totals: {
      harvestedRows: rows.length,
      claims: claims.size,
      evidence: evidence.size,
      expiredAtSeed: expired.length,
      liveAtSeed: evidence.size - expired.length,
    },
    bySource,
    expiredBySource,
    byClaimClass: byClass,
    byPublisherKind: byKind,
    houseStyleScrubs: { emDashes: scrubbedDashes, figures: scrubbedFigures },
    warnings,
  };
}

function renderMarkdown(report) {
  const lines = [];
  const pct = (n) => (report.totals.evidence ? `${Math.round((n / report.totals.evidence) * 100)}%` : '0%');
  lines.push('# PI-005 claim registry: Stage 1 seed report');
  lines.push('');
  lines.push(`Generated by \`${report.generator}\` as at ${report.asAt}. Every row below was read from`);
  lines.push('provenance already on disk. No editorial judgement was applied and no existing content');
  lines.push('record was changed.');
  lines.push('');
  lines.push('## Rows by source');
  lines.push('');
  lines.push('| Source | Seeded | Already expired |');
  lines.push('|---|---:|---:|');
  for (const [key, label] of Object.entries(SOURCE_LABELS)) {
    lines.push(`| ${label} | ${report.bySource[key] ?? 0} | ${report.expiredBySource[key] ?? 0} |`);
  }
  lines.push(`| **Total** | **${report.totals.harvestedRows}** | **${report.totals.expiredAtSeed}** |`);
  lines.push('');
  lines.push(`${report.totals.claims} claims, ${report.totals.evidence} evidence rows. ${report.totals.expiredAtSeed} rows (${pct(report.totals.expiredAtSeed)})`);
  lines.push('seeded already expired, because expiry is computed from the date the record already');
  lines.push('carried and not from the migration date. That is the correct result: an expired row is');
  lines.push('unsupported, not deleted, and the registry cannot claim more freshness than the corpus had.');
  lines.push('');
  lines.push('## Claim classes');
  lines.push('');
  lines.push('| Class | Rows |');
  lines.push('|---|---:|');
  for (const [k, v] of Object.entries(report.byClaimClass).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push('');
  lines.push('## Publisher kinds');
  lines.push('');
  lines.push('Inferred from structural signals only: the gov.au suffix, an explicit list of ticketing and');
  lines.push('regional-body hosts, and a host matching the record\'s own name. Everything else is');
  lines.push('`unknown`, which is the honest answer, and resolving it is the Stage 2 pilot.');
  lines.push('');
  lines.push('| Kind | Rows |');
  lines.push('|---|---:|');
  for (const [k, v] of Object.entries(report.byPublisherKind).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push('');
  if (report.warnings.length) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of report.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`.replace(/\r?\n/g, '\r\n');
}

/* ------------------------------------------------------------------ */

export async function run() {
  const precedence = await readJson(PRECEDENCE);
  const { rows, warnings } = await harvest({ contentDir: CONTENT_DIR, dataDir: DATA_DIR });
  const { claims, evidence, problems, expired } = buildRegistry(rows, { precedence, today: TODAY });

  const claimPlan = await planWrites(claims, CLAIMS_DIR, 'claimId');
  const evidencePlan = await planWrites(evidence, EVIDENCE_DIR, 'evidenceId');
  const report = buildReport({ rows, warnings, claims, evidence, expired, today: TODAY });

  // Say what it would do, before doing it. Always, apply or not.
  console.log('seed-claim-registry  -  PI-005 Stage 1');
  console.log(`  mode                ${APPLY ? 'APPLY' : 'PLAN ONLY (pass --apply to write)'}`);
  console.log(`  as at               ${TODAY}`);
  console.log(`  harvested rows      ${rows.length}`);
  console.log(`  claims              ${claims.size}  (create ${claimPlan.create.length}, update ${claimPlan.update.length}, unchanged ${claimPlan.unchanged.length})`);
  console.log(`  evidence            ${evidence.size}  (create ${evidencePlan.create.length}, update ${evidencePlan.update.length}, unchanged ${evidencePlan.unchanged.length})`);
  console.log(`  expired at seed     ${expired.length} of ${evidence.size}`);
  for (const [key, label] of Object.entries(SOURCE_LABELS)) {
    console.log(`    ${label.padEnd(34)} ${String(report.bySource[key] ?? 0).padStart(4)}  (expired ${report.expiredBySource[key] ?? 0})`);
  }
  if (claimPlan.orphaned.length || evidencePlan.orphaned.length) {
    console.log(`  on disk, not reproduced: ${claimPlan.orphaned.length} claim(s), ${evidencePlan.orphaned.length} evidence row(s).`);
    console.log('    Left in place. Removing a claim is a decision, not a migration step.');
  }
  for (const warning of warnings) console.log(`  warn: ${warning}`);
  for (const problem of problems) console.error(`  FAIL: ${problem}`);

  if (problems.length) {
    console.error('\n  Refusing to write: fix the problems above.');
    return 1;
  }

  if (APPLY) {
    await applyPlan(claimPlan);
    await applyPlan(evidencePlan);
    console.log(`\n  wrote ${claims.size} claim(s) to ${path.relative(REPO, CLAIMS_DIR)}`);
    console.log(`  wrote ${evidence.size} evidence row(s) to ${path.relative(REPO, EVIDENCE_DIR)}`);
  } else {
    console.log('\n  Nothing written. Re-run with --apply.');
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, serialise(report));
    console.log(`  report: ${path.relative(REPO, out)}`);
  }
  if (MD_OUT) {
    const out = path.resolve(MD_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, renderMarkdown(report));
    console.log(`  report: ${path.relative(REPO, out)}`);
  }
  return 0;
}

export { buildReport, renderMarkdown, planWrites, applyPlan, serialise, SOURCE_LABELS };

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
