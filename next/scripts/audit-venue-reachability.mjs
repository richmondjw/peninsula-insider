#!/usr/bin/env node
/**
 * audit-venue-reachability.mjs - can we actually reach the operator? (A27)
 *
 * The corrections workflow, the partner enquiry form and the operator update
 * form all end in the same place: somebody has to contact a venue. Register
 * item A27 records that the four intake tables behind those forms do not exist
 * in production, so the question of whether we could reach the operator at all
 * has never been asked of the corpus itself. This script asks it.
 *
 * IT IS AN INVENTORY, NOT A GATE.
 *
 * It reports. It exits 0 whatever it finds, it writes nothing into
 * src/content, and it corrects nothing: a wrong website on a venue record is
 * an editorial act with a person's name on it, not something a survey script
 * decides at 3am. Nothing here is wired into the build.
 *
 * NO NETWORK, EVER.
 *
 * Reachability is read from the committed link-health probe record
 * (ops/records/link-health/probe-ledger.json), which is written only by
 * `probe-link-health.mjs` and reviewed in a diff. A verdict here is
 * therefore what a probe saw and a human committed, never what this script
 * guessed. That also makes the output a property of the files on disk: same
 * tree, same numbers, any machine, any date. Nothing expires, and no remote
 * server having a bad night changes a single figure.
 *
 * WHAT COUNTS AS A CONTACT ROUTE
 *
 * The difference between the declared routes and the discarded ones is the
 * whole point:
 *
 *   website, bookingUrl, phone   declared in src/content.config.ts. The build
 *                                reads them and a template can render them.
 *   liveStatusUrl                declared; a link to the operator's live
 *                                profile, which is a way to reach them.
 *   email, sameAs.*              written into the JSON and NOT declared, so
 *                                Zod strips them silently. The file holds an
 *                                address; every surface behaves as if it does
 *                                not exist. Recorded here as `discarded`,
 *                                which is worse than absent, because somebody
 *                                believes we have it.
 *
 * HOW A URL ROUTE IS SCORED
 *
 *   reachable      ledger verdict ok
 *   unverifiable   ledger verdict blocked or unknown. The host refuses
 *                  automation; a person with a browser very likely gets
 *                  through. Never counted as broken - the council is this
 *                  site's most-cited publisher and refuses most robots.
 *   broken         ledger verdict dead, parked or tls-fault. Nothing a reader
 *                  can use.
 *   misdirected    ledger verdict moved: dead at the URL we publish, alive
 *                  somewhere the record does not point. Broken as written.
 *   unledgered     no row in the ledger. An unknown, reported as one.
 *
 * THE HEADLINE
 *
 * A venue is UNREACHABLE when the build can see no route anyone could act on.
 * Three shapes roll up into it:
 *
 *   no-route         nothing on file at all.
 *   all-broken       routes exist and every one of them is broken or
 *                    misdirected. We believe we can reach them and cannot.
 *   discarded-only   the only contact detail on the record sits in a field
 *                    the schema does not declare, so nothing downstream ever
 *                    receives it. The file looks answered and the site is as
 *                    mute as if it were blank.
 *
 * A phone number counts as a route. It cannot be probed from a repository, so
 * it is scored `unverifiable` rather than `reachable`, and a venue carrying
 * one is never counted unreachable on this evidence.
 *
 * THE THIRD QUESTION: a URL that resolves and is not the business
 *
 * A 200 is not proof of life. arthursseat.com.au/book/ answered 200 from a
 * domain-for-sale lander for as long as anyone had been checking status codes.
 * Two signals are available offline and both are read from the ledger:
 *
 *   lander   the recorded pageTitle carries a parked / for-sale / expired /
 *            coming-soon marker. Evidence, not inference.
 *   offsite  the probe's effectiveUrl left the registrable domain that was
 *            requested. Often innocent (an operator moved to a group site);
 *            sometimes a lapsed domain pointed at a broker. Reported as a
 *            candidate for a human read, never as a verdict.
 *
 * Usage:
 *   node scripts/audit-venue-reachability.mjs [--json out.json] [--venues dir]
 *                                             [--ledger path] [--quiet]
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const QUIET = args.includes('--quiet');
const VENUES_DIR = path.resolve(getArg('--venues', path.join(NEXT, 'src', 'content', 'venues')));
// The probe record moved to ops/records/ when the source-link gate stopped
// writing the evidence it is judged against (#438). Same file, same `links`
// shape, new home, and this script was still opening the old path: the two
// changes landed hours apart and CI on main has been red on an ENOENT ever
// since. `--ledger` is kept as an alias for `--record` so an in-flight branch
// passing the old flag still works.
const LEDGER = path.resolve(
  getArg('--record', getArg('--ledger', path.join(REPO, 'ops', 'records', 'link-health', 'probe-ledger.json')))
);

/* ------------------------------------------------------------------ */
/* Route scoring                                                       */
/* ------------------------------------------------------------------ */

/** Verdicts that leave a reader with nothing. See audit-link-health.mjs. */
export const BROKEN_VERDICTS = new Set(['dead', 'parked', 'tls-fault']);
/** Dead where we publish it, alive somewhere we do not point. */
export const MISDIRECTED_VERDICTS = new Set(['moved']);
/** The host dislikes robots. An honest unknown, never a fault. */
export const UNVERIFIABLE_VERDICTS = new Set(['blocked', 'unknown']);

/**
 * Declared on the venue schema, so the build keeps them and a template may
 * render them. Order is the order a reader would try.
 */
export const DECLARED_URL_ROUTES = ['website', 'bookingUrl', 'liveStatusUrl'];

/**
 * Written into venue JSON and absent from the venue schema, so Zod strips
 * them before any surface sees them.
 */
export const DISCARDED_ROUTE_KEYS = ['email', 'sameAs'];

export function scoreVerdict(verdict) {
  if (verdict === 'ok') return 'reachable';
  if (BROKEN_VERDICTS.has(verdict)) return 'broken';
  if (MISDIRECTED_VERDICTS.has(verdict)) return 'misdirected';
  if (UNVERIFIABLE_VERDICTS.has(verdict)) return 'unverifiable';
  return 'unledgered';
}

/** Trailing-slash and www differences are not different URLs to a reader. */
export function urlKey(raw) {
  try {
    const u = new URL(String(raw).trim());
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, '');
    return `${host}${pathname}${u.search}`;
  } catch {
    return String(raw).trim().toLowerCase();
  }
}

/**
 * The last two labels, which is right for .com and wrong for .com.au unless
 * we take three there, so we take three on a known second-level suffix.
 */
export function registrableDomain(hostname) {
  const labels = String(hostname).toLowerCase().replace(/^www\./, '').split('.');
  if (labels.length <= 2) return labels.join('.');
  const SECOND_LEVEL = new Set(['com', 'net', 'org', 'gov', 'edu', 'co', 'id', 'asn']);
  const take = SECOND_LEVEL.has(labels[labels.length - 2]) ? 3 : 2;
  return labels.slice(-take).join('.');
}

/**
 * Titles a registrar, a broker or an expired site builder serves with a 200.
 * Shared vocabulary with audit-link-health.mjs PARKED_MARKERS, widened with
 * the brokers whose landers are the common shape of this defect.
 */
export const LANDER_MARKERS = [
  'this website is for sale',
  'this domain is for sale',
  'domain is for sale',
  'buy this domain',
  'domain is parked',
  'parked domain',
  'domain for sale',
  'hugedomains',
  'afternic',
  'website expired',
  'squarespace - website expired',
  'connectyourdomain',
  'website coming soon',
  'coming soon',
  'under construction',
  'default web site page',
  'future home of something quite cool',
  'account suspended',
  'site not found',
];

/** Decode just enough HTML for the entity-escaped titles the ledger stores. */
export function decodeTitle(title) {
  return String(title ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&mdash;/gi, '-')
    .replace(/&#8211;/gi, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function landerMarkerIn(title) {
  const t = decodeTitle(title).toLowerCase();
  if (!t) return null;
  return LANDER_MARKERS.find((m) => t.includes(m)) ?? null;
}

/**
 * Rows that are not the business, on the evidence in the row itself. `moved`
 * rows are included on purpose: the arthursseat lander was recorded as moved
 * with httpCode 200, and a reader following the URL we publish still lands on
 * the advertisement.
 */
export function landerRows(rows) {
  const out = [];
  for (const row of rows) {
    const marker = landerMarkerIn(row.pageTitle);
    if (!marker) continue;
    out.push({
      url: row.url,
      verdict: row.verdict,
      httpCode: row.httpCode ?? null,
      pageTitle: decodeTitle(row.pageTitle),
      marker,
      probedOn: row.probedOn ?? null,
    });
  }
  return out;
}

/** Rows whose probe ended on a different registrable domain than requested. */
export function offsiteRows(rows) {
  const out = [];
  for (const row of rows) {
    if (!row.effectiveUrl) continue;
    let from;
    let to;
    try {
      from = registrableDomain(new URL(row.url).hostname);
      to = registrableDomain(new URL(row.effectiveUrl).hostname);
    } catch {
      continue;
    }
    if (from === to) continue;
    out.push({
      url: row.url,
      effectiveUrl: row.effectiveUrl,
      from,
      to,
      verdict: row.verdict,
      httpCode: row.httpCode ?? null,
      pageTitle: decodeTitle(row.pageTitle),
      probedOn: row.probedOn ?? null,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The inventory                                                       */
/* ------------------------------------------------------------------ */

/**
 * One venue record in, one reachability verdict out. Pure: the ledger arrives
 * as a Map, so a test can hand it three rows and no filesystem.
 */
export function inventoryVenue(record, file, ledgerByKey) {
  const routes = [];

  for (const field of DECLARED_URL_ROUTES) {
    const value = record[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const row = ledgerByKey.get(urlKey(value)) ?? null;
    routes.push({
      kind: 'url',
      field,
      value: value.trim(),
      declared: true,
      verdict: row?.verdict ?? null,
      state: scoreVerdict(row?.verdict),
      replacement: row?.replacement ?? null,
      pageTitle: row ? decodeTitle(row.pageTitle) : null,
    });
  }

  if (typeof record.phone === 'string' && record.phone.trim()) {
    routes.push({
      kind: 'phone',
      field: 'phone',
      value: record.phone.trim(),
      declared: true,
      verdict: null,
      // A phone number cannot be probed from a repository. It is a route the
      // build can render; whether it rings is outside this evidence.
      state: 'unverifiable',
      replacement: null,
      pageTitle: null,
    });
  }

  for (const key of DISCARDED_ROUTE_KEYS) {
    const value = record[key];
    if (!value) continue;
    if (typeof value === 'string') {
      routes.push({
        kind: key === 'email' ? 'email' : 'profile',
        field: key,
        value,
        declared: false,
        verdict: null,
        state: 'discarded',
        replacement: null,
        pageTitle: null,
      });
    } else if (typeof value === 'object') {
      for (const [sub, subValue] of Object.entries(value)) {
        if (typeof subValue !== 'string' || !subValue.trim()) continue;
        routes.push({
          kind: sub === 'officialSite' ? 'profile-official' : 'profile',
          field: `${key}.${sub}`,
          value: subValue.trim(),
          declared: false,
          verdict: null,
          state: 'discarded',
          replacement: null,
          pageTitle: null,
        });
      }
    }
  }

  const declared = routes.filter((r) => r.declared);
  const usable = declared.filter((r) => r.state === 'reachable' || r.state === 'unverifiable');
  const brokenOrMisdirected = declared.filter(
    (r) => r.state === 'broken' || r.state === 'misdirected'
  );

  let classification;
  if (routes.length === 0) classification = 'no-route';
  else if (declared.length === 0) classification = 'discarded-only';
  else if (usable.length === 0 && brokenOrMisdirected.length > 0) classification = 'all-broken';
  else if (usable.length === 0) classification = 'unledgered-only';
  else classification = 'reachable';

  return {
    slug: record.slug ?? path.basename(file, '.json'),
    name: record.name ?? null,
    type: record.type ?? null,
    file,
    classification,
    // The headline. Two shapes, one meaning: nobody at this publication can
    // reach this operator using what the build can see.
    unreachable:
      classification === 'no-route' ||
      classification === 'all-broken' ||
      classification === 'discarded-only',
    routes,
    counts: {
      routes: routes.length,
      declared: declared.length,
      discarded: routes.length - declared.length,
      reachable: declared.filter((r) => r.state === 'reachable').length,
      unverifiable: declared.filter((r) => r.state === 'unverifiable').length,
      broken: declared.filter((r) => r.state === 'broken').length,
      misdirected: declared.filter((r) => r.state === 'misdirected').length,
      unledgered: declared.filter((r) => r.state === 'unledgered').length,
    },
  };
}

export function summarise(venues) {
  const byClassification = {};
  const byRouteState = {};
  let withoutPhone = 0;
  let withoutWebsite = 0;
  let withAnyBrokenRoute = 0;
  for (const v of venues) {
    byClassification[v.classification] = (byClassification[v.classification] ?? 0) + 1;
    for (const r of v.routes) byRouteState[r.state] = (byRouteState[r.state] ?? 0) + 1;
    if (!v.routes.some((r) => r.kind === 'phone')) withoutPhone += 1;
    if (!v.routes.some((r) => r.field === 'website')) withoutWebsite += 1;
    if (v.counts.broken + v.counts.misdirected > 0) withAnyBrokenRoute += 1;
  }
  return {
    venues: venues.length,
    unreachable: venues.filter((v) => v.unreachable).length,
    byClassification,
    byRouteState,
    withoutPhone,
    withoutWebsite,
    withAnyBrokenRoute,
  };
}

export function indexLedger(links) {
  const byKey = new Map();
  for (const row of links) {
    const key = urlKey(row.url);
    // First row wins, so an exact URL is never shadowed by a normalised twin.
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return byKey;
}

async function readVenues(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const abs = path.join(dir, entry.name);
    const text = await readFile(abs, 'utf8');
    out.push({
      record: JSON.parse(text),
      file: path.relative(REPO, abs).split(path.sep).join('/'),
    });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

async function main() {
  const ledger = JSON.parse(await readFile(LEDGER, 'utf8'));
  const rows = Array.isArray(ledger.links) ? ledger.links : [];
  const byKey = indexLedger(rows);

  const venues = (await readVenues(VENUES_DIR)).map(({ record, file }) =>
    inventoryVenue(record, file, byKey)
  );

  const summary = summarise(venues);
  const landers = landerRows(rows);
  const offsite = offsiteRows(rows);

  // Which venues cite a URL a ledger row shows as a lander.
  const landerByKey = new Map(landers.map((l) => [urlKey(l.url), l]));
  const venuesCitingLanders = [];
  for (const v of venues) {
    for (const r of v.routes) {
      const hit = landerByKey.get(urlKey(r.value));
      if (hit) venuesCitingLanders.push({ slug: v.slug, field: r.field, ...hit });
    }
  }

  // Which venues publish a route the probe followed off its own domain. Most
  // are an operator who changed domain and redirects properly; the one that
  // matters is a route that lands on somebody else's page.
  const offsiteByKey = new Map(offsite.map((o) => [urlKey(o.url), o]));
  const venuesCitingOffsite = [];
  for (const v of venues) {
    for (const r of v.routes) {
      const hit = offsiteByKey.get(urlKey(r.value));
      if (hit) venuesCitingOffsite.push({ slug: v.slug, name: v.name, field: r.field, ...hit });
    }
  }

  const report = {
    generatedBy: 'scripts/audit-venue-reachability.mjs',
    ledger: path.relative(REPO, LEDGER).split(path.sep).join('/'),
    ledgerUpdatedAt: ledger.updatedAt ?? null,
    summary,
    unreachable: venues.filter((v) => v.unreachable),
    landers,
    venuesCitingLanders,
    offsite,
    venuesCitingOffsite,
    venues,
  };

  if (JSON_OUT) {
    await writeFile(path.resolve(JSON_OUT), `${JSON.stringify(report, null, 2)}\n`);
  }

  if (!QUIET) {
    const s = summary;
    console.log(`Venue contact reachability - ${s.venues} venues, ledger ${report.ledgerUpdatedAt}`);
    console.log('');
    console.log(`  UNREACHABLE ................. ${s.unreachable}`);
    for (const [k, n] of Object.entries(s.byClassification).sort()) {
      console.log(`    ${k.padEnd(24, '.')} ${n}`);
    }
    console.log('');
    console.log('  routes by state');
    for (const [k, n] of Object.entries(s.byRouteState).sort()) {
      console.log(`    ${k.padEnd(24, '.')} ${n}`);
    }
    console.log('');
    console.log(`  venues with no phone ........ ${s.withoutPhone}`);
    console.log(`  venues with no website ...... ${s.withoutWebsite}`);
    console.log(`  venues with a broken route .. ${s.withAnyBrokenRoute}`);
    console.log('');
    console.log(`  ledger rows titled like a lander .. ${landers.length}`);
    console.log(`  of those, cited by a venue ........ ${venuesCitingLanders.length}`);
    console.log(`  probes that left the domain ....... ${offsite.length}`);
    console.log(`  of those, on a live venue route ... ${venuesCitingOffsite.length}`);
    for (const o of venuesCitingOffsite) {
      console.log(`    ${o.slug.padEnd(26)} ${o.field.padEnd(18)} ${o.from} -> ${o.to}  "${o.pageTitle}"`);
    }
    if (report.unreachable.length) {
      console.log('');
      console.log('  unreachable venues');
      for (const v of report.unreachable) {
        const detail = v.routes.length
          ? v.routes.map((r) => `${r.field}=${r.state}`).join(' ')
          : 'nothing on file';
        console.log(`    ${v.slug.padEnd(34)} ${v.classification.padEnd(12)} ${detail}`);
      }
    }
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
