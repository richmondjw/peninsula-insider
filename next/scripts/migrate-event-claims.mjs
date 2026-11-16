#!/usr/bin/env node
/**
 * migrate-event-claims.mjs  -  PI-005 Stage 2, the second pilot.
 *
 * The first pilot evidenced one subject by hand and cost 43 minutes. That
 * tells us what a claim costs to research. It does not tell us what the
 * programme costs, because the programme is not one subject: it is a corpus
 * in which most records already carry a source URL and a checked date that
 * nothing has ever read.
 *
 * This script answers the other half. It emits claims and evidence for the
 * published events collection from fields ALREADY on disk, so the human cost
 * per record drops from research to confirmation. It is the same act as
 * scripts/seed-claim-registry.mjs and deliberately does not duplicate it: the
 * seed already emits `event-status` for every event carrying a source URL.
 * This emits the four classes the seed could not reach, because the fields
 * that assert them are not the fields that carry a URL:
 *
 *   event-schedule   startDate, endDate, startTime, endTime   (dates are the
 *                    core content of an event listing, so the listing the
 *                    record already cites is evidence for them)
 *   booking          bookingRequired, bookingUrl
 *   rate-change      freePaid, as a BASIS only. This site publishes no
 *                    figures, so `priceTier` and `priceRange` are never read
 *                    here and never emitted.
 *   accessibility    accessibilityNotes, and deliberately with NO evidence
 *                    attached. See ACCESSIBILITY IS DIFFERENT below.
 *
 * ACCESSIBILITY IS DIFFERENT. Forty published records publish an access note
 * and not one of them cites a source for it. An event listing is evidence for
 * the event's dates by construction; it is not evidence that somebody read an
 * access statement on it. Attaching the listing anyway would manufacture
 * support, which is the one thing a registry must never do. So the claim is
 * written and left `unsupported`, which is the honest answer and is what makes
 * the gap countable. Pilot 1 established that a claim with no evidence is a
 * deliberate act, not an omission.
 *
 * WHAT IT REFUSES, AND WHY THAT IS THE POINT
 *
 * A bulk migration over this corpus is dangerous in a specific way: thirteen
 * published records carry their verification state as free text with no enum
 * behind it, and two of those express a cancellation through that prose. One
 * of the two is not caught by the repo's own shared cancellation reader,
 * because `isCancelledRecord` tests /cancelled/i and the prose says
 * "cancellation". A migration that emitted "runs on <date>" for that record
 * would quietly assert a cancelled market is running, with a citation
 * attached to make it look checked.
 *
 * So this script holds records back rather than guessing, and reports every
 * one. Holding back is not a failure mode here; it is the deliverable. The
 * held-back list is what a human should look at, and it is short.
 *
 * TWO RULES CARRIED OVER FROM THE SEED, UNCHANGED
 *
 *   1. expiresAt is computed from the date the record ALREADY carried
 *      (lastCheckedDate, else discoveredAt, else publishedAt), never from the
 *      run date. A migration cannot make the corpus fresher than it was.
 *   2. Every emitted row carries a legacy block naming the field, its value
 *      and the file, so the migration is reversible and nothing is lost.
 *
 * Idempotent by construction: every value is derived from disk and from
 * src/data/source-precedence.json. Nothing reads the wall clock except the
 * already-expired count in the console summary, which is overridable with
 * --today. Re-running changes nothing.
 *
 * It also refuses to overwrite a hand-authored row. A file already on disk
 * whose `origin` is `authored` is a human's work; a migration that clobbered
 * it would delete the confirmation this pilot exists to produce.
 *
 * Usage:
 *   node scripts/migrate-event-claims.mjs             plan only, writes nothing
 *   node scripts/migrate-event-claims.mjs --apply     write the plan
 *   node scripts/migrate-event-claims.mjs --json out.json
 *
 * Test-harness overrides (production callers pass none of these):
 *   --content-dir --data-dir --claims-dir --evidence-dir --precedence --today
 *
 * Exit: 0 planned or applied cleanly; 1 an id collided, a class had no expiry,
 * or a write would have overwritten an authored row.
 */

import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeExpiresAt, toIsoDay } from '../src/lib/claim-state.mjs';
import { classifyUrl, houseStyle, hostOf } from './seed-claim-registry.mjs';

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
const TODAY = getArg('--today', new Date().toISOString().slice(0, 10));

/* ------------------------------------------------------------------ */
/* Hold-back detection                                                 */
/* ------------------------------------------------------------------ */

/**
 * Cancellation, read WIDER than the site reads it.
 *
 * src/lib/event-occurrence.mjs `isCancelledRecord` is the site's reader and it
 * is correct for the site: it decides what to delist, and delisting on a loose
 * regex would hide live events. This is the opposite decision. Here a false
 * positive costs one held-back record and a line in a report; a false negative
 * writes a sourced claim that a cancelled event is running. So this matches
 * the stem 'cancel', and on any hit the record is held back rather than
 * classified.
 *
 * The record this exists for is mornington-racecourse-market, whose
 * verificationStatus reads "Updated after organiser cancellation notice".
 * 'cancellation' does not match /cancelled/, so the site treats it as running.
 * That is reported, not changed: whether it is cancelled is an editorial
 * question and this script does not answer editorial questions.
 */
const CANCEL_SIGNAL = /cancel/i;

/** Prose that says the record is not settled. Hedged facts are not migrated. */
const HEDGE_SIGNAL = /\btentative\b|\bunconfirmed\b|\bestimated\b|\bnot yet\b|\bto be confirmed\b|\btbc\b|\bconfirm\b|\bverify\b|\bprovisional\b/i;

/** A record that names us as its own source is not evidence for itself. */
const SELF_HOST = 'peninsulainsider.com.au';

/** Fields that can carry a URL a reader would call the record's source. */
const URL_FIELDS = ['primarySourceUrl', 'secondarySourceUrl', 'officialEventUrl', 'bookingUrl', 'ticketingUrl', 'sourceUrl'];

/** A clock time, for finding hours that live only in prose. */
const CLOCK = /\b\d{1,2}([.:]\d{2})?\s?(am|pm)\b/i;

/**
 * Split a source field into URLs. One record carries three URLs in one string
 * separated by pipes, so this is not paranoia.
 */
export function urlsIn(value) {
  if (typeof value !== 'string') return [];
  return value
    .split('|')
    .map((part) => part.trim())
    .filter((part) => hostOf(part));
}

/** Word-overlap of two titles, 0 to 1. Structural, no stemming, no guessing. */
export function titleOverlap(a, b) {
  const words = (v) => new Set(String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean));
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  const shared = [...A].filter((w) => B.has(w)).length;
  return shared / (A.size + B.size - shared);
}

/** Published peers citing the same primary source under a near-identical title. */
export function nearDuplicates(data, peers, threshold = 0.6) {
  const primary = urlsIn(data.primarySourceUrl)[0] ?? null;
  if (!primary) return [];
  return peers
    .filter((p) => p.slug !== data.slug
      && urlsIn(p.primarySourceUrl)[0] === primary
      && titleOverlap(p.title, data.title) >= threshold)
    .map((p) => p.slug)
    .sort();
}

/**
 * Groups of published records resting on one identical primary source. A
 * finding, not a fault: it says how much of the corpus a single third-party
 * page is holding up, which is the number that matters when that page moves.
 */
export function sharedCitations(peers) {
  const byUrl = new Map();
  for (const peer of peers) {
    const primary = urlsIn(peer.primarySourceUrl)[0];
    if (!primary) continue;
    if (!byUrl.has(primary)) byUrl.set(primary, []);
    byUrl.get(primary).push(peer.slug);
  }
  return [...byUrl.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([url, slugs]) => ({ url, slugs: slugs.sort() }))
    .sort((a, b) => b.slugs.length - a.slugs.length || (a.url < b.url ? -1 : 1));
}

/**
 * Every reason this record must not be migrated, or an empty array.
 * `peers` is every other published record, for the near-duplicate test.
 */
export function holdBackReasons(data, peers = []) {
  const reasons = [];
  const prose = [data.verificationStatus, data.internalNotes, data.summary, data.recurrenceNote]
    .filter((v) => typeof v === 'string')
    .join(' • ');

  if (data.cancelled === true) reasons.push('cancelled flag is set');
  if (data.skipThis === true) reasons.push('editor set skipThis');
  if (CANCEL_SIGNAL.test(prose)) {
    reasons.push('free-text prose carries a cancellation signal, which no enum on this record records');
  }
  if (HEDGE_SIGNAL.test(String(data.verificationStatus ?? '')) || HEDGE_SIGNAL.test(String(data.internalNotes ?? ''))) {
    reasons.push('free-text prose hedges the record, so its fields are not settled facts');
  }
  if (/duplicate/i.test(String(data.internalNotes ?? ''))) {
    reasons.push('record flags itself as a possible duplicate');
  }

  const cited = URL_FIELDS.flatMap((f) => urlsIn(data[f]));
  if (cited.some((u) => hostOf(u) === SELF_HOST)) {
    reasons.push('record cites peninsulainsider.com.au as its own source');
  }

  // Two published records citing the identical primary source AND carrying
  // near-identical titles are probably one event listed twice. Which one is
  // an editorial question, so neither is migrated.
  //
  // Sharing a primary source alone is NOT a hold-back. Four market records
  // cite the same third-party aggregator page, which makes them thinly
  // sourced, not duplicated. That is reported by sharedCitations() instead:
  // holding them back would cost a quarter of the pilot's volume to describe
  // a different defect.
  for (const twin of nearDuplicates(data, peers)) {
    reasons.push(`near-duplicate of ${twin}: same primary source, near-identical title`);
  }

  if (!cited.length) reasons.push('cites no source at all');
  if (!data.lastCheckedDate && !data.discoveredAt && !data.publishedAt) reasons.push('carries no date to anchor expiry to');
  return reasons;
}

/**
 * Classes this record must not have migrated even when the record itself is
 * fine. Today that is one case: hours that exist only inside prose. Migrating
 * a schedule claim from startDate alone would publish a claim that silently
 * drops the times a reader can actually see on the page.
 */
export function holdBackClasses(data) {
  const held = {};
  if (!data.startTime) {
    const prose = [data.summary, data.editorNote, data.description].filter((v) => typeof v === 'string').join(' ');
    if (CLOCK.test(prose)) {
      held['event-schedule'] = 'the only opening hours on this record live in free text, not in startTime';
    }
  }
  return held;
}

/* ------------------------------------------------------------------ */
/* Statements. One plain sentence each, no figures, no em-dashes.      */
/* ------------------------------------------------------------------ */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** ISO day to '14 June 2026'. Deterministic, and never the run date. */
export function longDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** '09:00' to '9am', '14:30' to '2.30pm'. The house form for times. */
export function clockLabel(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  const h24 = Number(m[1]);
  const suffix = h24 >= 12 ? 'pm' : 'am';
  const h = h24 % 12 || 12;
  return m[2] === '00' ? `${h}${suffix}` : `${h}.${m[2]}${suffix}`;
}

export function scheduleStatement(data) {
  const title = houseStyle(data.title ?? data.slug);
  const start = longDay(toIsoDay(data.startDate));
  const end = longDay(toIsoDay(data.endDate));
  if (!start) return null;
  const when = !end || end === start ? `on ${start}` : `from ${start} to ${end}`;
  const from = clockLabel(data.startTime);
  const to = clockLabel(data.endTime);
  const times = from ? (to ? `, ${from} to ${to}` : `, from ${from}`) : '';
  return `${title} runs ${when}${times}.`;
}

export function bookingStatement(data) {
  const title = houseStyle(data.title ?? data.slug);
  const raw = String(data.bookingRequired ?? '').trim();
  if (/^y/i.test(raw)) return `Booking is required for ${title}.`;
  if (/^n/i.test(raw)) return `Booking is not required for ${title}.`;
  return null;
}

/**
 * The rate BASIS, never an amount. `priceTier` and `priceRange` are not read
 * by this script at all, so there is no path by which a figure can reach the
 * registry through it.
 */
export function rateStatement(data) {
  const title = houseStyle(data.title ?? data.slug);
  const raw = String(data.freePaid ?? '').trim();
  if (/^free/i.test(raw)) return `Entry to ${title} is free.`;
  if (/^paid/i.test(raw)) return `Entry to ${title} is ticketed.`;
  return null;
}

export function accessibilityStatement(data) {
  const title = houseStyle(data.title ?? data.slug);
  const notes = houseStyle(data.accessibilityNotes ?? '');
  if (!notes) return null;
  return `Access at ${title}: ${notes.replace(/\.$/, '')}.`;
}

/**
 * Which of the record's cited URLs count as evidence for a class, in
 * precedence-neutral field order. The mapping is the whole editorial content
 * of this script and it is deliberately short and conservative.
 */
const CLASS_SOURCES = {
  'event-schedule': ['primarySourceUrl', 'officialEventUrl', 'secondarySourceUrl', 'sourceUrl'],
  booking: ['bookingUrl', 'ticketingUrl', 'officialEventUrl', 'primarySourceUrl'],
  'rate-change': ['officialEventUrl', 'primarySourceUrl', 'bookingUrl', 'ticketingUrl'],
  // Nothing. See ACCESSIBILITY IS DIFFERENT at the top of this file.
  accessibility: [],
};

const CLASS_FIELDS = {
  'event-schedule': ['startDate', 'endDate', 'startTime', 'endTime'],
  booking: ['bookingRequired'],
  'rate-change': ['freePaid'],
  accessibility: ['accessibilityNotes'],
};

const STATEMENT = {
  'event-schedule': scheduleStatement,
  booking: bookingStatement,
  'rate-change': rateStatement,
  accessibility: accessibilityStatement,
};

/* ------------------------------------------------------------------ */
/* Disk helpers                                                        */
/* ------------------------------------------------------------------ */

const exists = async (p) => {
  try { await stat(p); return true; } catch { return false; }
};

async function listJson(dir) {
  if (!(await exists(dir))) return [];
  const names = await readdir(dir, { recursive: true });
  return names
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      file: path.join(dir, name),
      id: name.split(path.sep).join('/').replace(/\.json$/, ''),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

const relToRepo = (file) => path.relative(REPO, file).split(path.sep).join('/');

/** Host as an id-safe label: 'www.mornpen.vic.gov.au' to 'mornpen-vic-gov-au'. */
export function hostLabel(url) {
  const host = hostOf(url);
  return host ? host.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'no-host';
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export async function collectEvents(contentDir) {
  const entries = await listJson(path.join(contentDir, 'events'));
  const all = [];
  for (const entry of entries) {
    const data = JSON.parse(await readFile(entry.file, 'utf8'));
    all.push({ id: entry.id, file: entry.file, data });
  }
  return all;
}

/**
 * Emit claims and evidence for the published events that pass the hold-back
 * rules. Pure: takes records and the precedence table, reads no clock.
 */
export function buildEventRegistry(events, { precedence }) {
  const claims = new Map();
  const evidence = new Map();
  const problems = [];
  const heldBack = [];
  const heldClasses = [];

  const published = events
    .filter((e) => (e.data.status ?? 'published') === 'published')
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const peers = published.map((e) => ({ slug: e.id, title: e.data.title, primarySourceUrl: e.data.primarySourceUrl }));
  const shared = sharedCitations(peers);

  for (const event of published) {
    const { data } = event;
    const reasons = holdBackReasons(data, peers);
    if (reasons.length) {
      heldBack.push({ slug: event.id, file: relToRepo(event.file), reasons });
      continue;
    }
    const classHolds = holdBackClasses(data);

    const dateField = data.lastCheckedDate ? 'lastCheckedDate'
      : data.discoveredAt ? 'discoveredAt' : 'publishedAt';
    const retrievedAt = toIsoDay(data[dateField]);
    if (!retrievedAt) {
      problems.push(`${event.id}: ${dateField} is not a date`);
      continue;
    }

    const owners = [
      [data.organiser?.name, 'organiser'],
      [data.venueName, 'venue-site'],
      [data.title, 'organiser'],
    ].filter(([name]) => name);

    for (const claimClass of Object.keys(CLASS_SOURCES)) {
      if (classHolds[claimClass]) {
        heldClasses.push({ slug: event.id, claimClass, reason: classHolds[claimClass] });
        continue;
      }
      const statement = STATEMENT[claimClass](data);
      if (!statement) continue;

      const subject = { type: 'events', slug: event.id, field: CLASS_FIELDS[claimClass][0] };
      const claimId = `events/${event.id}/${claimClass}`;
      claims.set(claimId, {
        claimId,
        claimClass,
        subject,
        statement,
        assertedBy: [subject],
        createdAt: retrievedAt,
        origin: 'migrated',
        note: `Migrated by scripts/migrate-event-claims.mjs (PI-005 Stage 2) from ${CLASS_FIELDS[claimClass].join(', ')} already on ${relToRepo(event.file)}. No editorial judgement was applied and no content record was changed.`,
      });

      const seen = new Set();
      const labels = new Map();
      for (const field of CLASS_SOURCES[claimClass]) {
        for (const url of urlsIn(data[field])) {
          if (seen.has(url)) continue;
          seen.add(url);
          const kind = classifyUrl(url, owners);
          const label = hostLabel(url);
          const nth = (labels.get(label) ?? 0) + 1;
          labels.set(label, nth);
          const evidenceId = `events/${event.id}/${claimClass}-${label}${nth > 1 ? `-${nth}` : ''}-${retrievedAt}`;
          if (evidence.has(evidenceId)) {
            problems.push(`evidence id collision: ${evidenceId}`);
            continue;
          }
          let expiresAt;
          try {
            expiresAt = toIsoDay(computeExpiresAt(retrievedAt, claimClass, precedence));
          } catch (error) {
            problems.push(`${claimId}: ${error.message}`);
            continue;
          }
          const record = {
            evidenceId,
            claim: claimId,
            stance: 'supports',
            publisher: { kind },
            url,
            retrievedAt,
            expiresAt,
            origin: 'migrated',
            legacy: {
              file: relToRepo(event.file),
              field,
              value: houseStyle(url),
              dateField,
            },
          };
          // Name the publisher only where the host is actually theirs. A
          // council listing of a winery event is published by the council.
          if (kind === 'organiser' || kind === 'venue-site') {
            const name = houseStyle(data.organiser?.name ?? data.venueName ?? '');
            if (name) record.publisher.name = name;
          }
          evidence.set(evidenceId, record);
        }
      }
    }
  }

  return { claims, evidence, problems, heldBack, heldClasses, shared, publishedCount: published.length };
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

/** Every text file in this repo is CRLF with a trailing newline. */
export const serialise = (value) => `${JSON.stringify(value, null, 2)}\n`.replace(/\r?\n/g, '\r\n');

/**
 * Plan the writes, standing down from any row a human has authored.
 *
 * A hand-authored row is the expensive half of this programme: somebody read
 * a source and wrote down what it said. A migration that overwrote one would
 * destroy the thing it exists to make cheap, and it would do so silently on
 * the next run. So an existing row whose `origin` is `authored` wins, the
 * migrated row is dropped, and the deferral is reported.
 *
 * This is not an error. It fired on the first run against the real corpus,
 * because the first pilot had already authored three of these ids by hand.
 * A migration that failed the whole run the moment anyone confirmed anything
 * would be a migration nobody could use twice.
 */
export async function planWrites(records, dir, key) {
  const plan = { create: [], update: [], unchanged: [], deferred: [], files: new Map() };
  for (const record of records.values()) {
    const file = path.join(dir, `${record[key]}.json`);
    const next = serialise(record);
    let current = null;
    try { current = await readFile(file, 'utf8'); } catch { /* absent */ }
    if (current === null) {
      plan.create.push(record[key]);
    } else if (current === next) {
      plan.unchanged.push(record[key]);
      continue;
    } else {
      let existing = null;
      try { existing = JSON.parse(current); } catch { /* unparseable, treat as a human's */ }
      if (!existing || existing.origin !== 'migrated') {
        plan.deferred.push(record[key]);
        continue;
      }
      plan.update.push(record[key]);
    }
    plan.files.set(file, next);
  }
  return plan;
}

export async function applyPlan(plan) {
  for (const [file, body] of plan.files) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
}

/* ------------------------------------------------------------------ */

export async function run() {
  const precedence = JSON.parse(await readFile(PRECEDENCE, 'utf8'));
  const events = await collectEvents(CONTENT_DIR);
  const built = buildEventRegistry(events, { precedence });

  const claimPlan = await planWrites(built.claims, CLAIMS_DIR, 'claimId');
  const evidencePlan = await planWrites(built.evidence, EVIDENCE_DIR, 'evidenceId');
  const expired = [...built.evidence.values()].filter((e) => e.expiresAt < TODAY);

  const byClass = {};
  for (const claim of built.claims.values()) byClass[claim.claimClass] = (byClass[claim.claimClass] ?? 0) + 1;
  const rowsByClass = {};
  for (const row of built.evidence.values()) {
    const cls = built.claims.get(row.claim)?.claimClass ?? 'unknown';
    rowsByClass[cls] = (rowsByClass[cls] ?? 0) + 1;
  }
  const byKind = {};
  for (const row of built.evidence.values()) byKind[row.publisher.kind] = (byKind[row.publisher.kind] ?? 0) + 1;

  console.log('migrate-event-claims  -  PI-005 Stage 2');
  console.log(`  mode                ${APPLY ? 'APPLY' : 'PLAN ONLY (pass --apply to write)'}`);
  console.log(`  as at               ${TODAY}`);
  console.log(`  events on disk      ${events.length}`);
  console.log(`  published           ${built.publishedCount}`);
  console.log(`  held back           ${built.heldBack.length} record(s), ${built.heldClasses.length} single class(es)`);
  console.log(`  claims              ${built.claims.size}  (create ${claimPlan.create.length}, update ${claimPlan.update.length}, unchanged ${claimPlan.unchanged.length}, deferred ${claimPlan.deferred.length})`);
  console.log(`  evidence            ${built.evidence.size}  (create ${evidencePlan.create.length}, update ${evidencePlan.update.length}, unchanged ${evidencePlan.unchanged.length}, deferred ${evidencePlan.deferred.length})`);
  console.log(`  expired at write    ${expired.length} of ${built.evidence.size}`);
  for (const cls of Object.keys(CLASS_SOURCES)) {
    console.log(`    ${cls.padEnd(16)} ${String(byClass[cls] ?? 0).padStart(3)} claim(s), ${String(rowsByClass[cls] ?? 0).padStart(3)} row(s)`);
  }
  console.log('  publisher kinds     ' + Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
  if (built.heldBack.length) {
    console.log('\n  Held back. Each of these needs a human, and none of them is a script bug:');
    for (const item of built.heldBack) console.log(`    ${item.slug}\n        ${item.reasons.join('\n        ')}`);
  }
  for (const item of built.heldClasses) console.log(`  held class: ${item.slug} / ${item.claimClass}: ${item.reason}`);
  if (built.shared.length) {
    console.log('\n  Published records resting on one identical primary source:');
    for (const group of built.shared) console.log(`    ${group.slugs.length}x  ${group.url}\n        ${group.slugs.join(', ')}`);
  }
  for (const id of [...claimPlan.deferred, ...evidencePlan.deferred]) {
    console.log(`  deferred to a hand-authored row: ${id}`);
  }
  for (const problem of built.problems) console.error(`  FAIL: ${problem}`);

  if (built.problems.length) {
    console.error('\n  Refusing to write: fix the problems above.');
    return 1;
  }

  if (APPLY) {
    await applyPlan(claimPlan);
    await applyPlan(evidencePlan);
    console.log(`\n  wrote ${built.claims.size} claim(s) to ${path.relative(REPO, CLAIMS_DIR)}`);
    console.log(`  wrote ${built.evidence.size} evidence row(s) to ${path.relative(REPO, EVIDENCE_DIR)}`);
  } else {
    console.log('\n  Nothing written. Re-run with --apply.');
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, serialise({
      ticket: 'PI-005',
      stage: 2,
      pilot: 'events',
      asAt: TODAY,
      generator: 'next/scripts/migrate-event-claims.mjs',
      totals: {
        eventsOnDisk: events.length,
        published: built.publishedCount,
        heldBackRecords: built.heldBack.length,
        heldBackClasses: built.heldClasses.length,
        claims: built.claims.size,
        evidence: built.evidence.size,
        expiredAtWrite: expired.length,
        deferredToAuthored: claimPlan.deferred.length + evidencePlan.deferred.length,
      },
      byClaimClass: byClass,
      evidenceByClaimClass: rowsByClass,
      byPublisherKind: byKind,
      heldBack: built.heldBack,
      heldClasses: built.heldClasses,
      sharedCitations: built.shared,
      deferredToAuthored: [...claimPlan.deferred, ...evidencePlan.deferred].sort(),
    }));
    console.log(`  report: ${path.relative(REPO, out)}`);
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
