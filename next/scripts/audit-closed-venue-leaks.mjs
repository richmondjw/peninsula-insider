#!/usr/bin/env node
/**
 * audit-closed-venue-leaks.mjs - the closed-venue gate, over `dist`.
 *
 * The worst thing this site can do is send a reader to a business that no
 * longer exists. Only the eat hub and the eat routes ever filtered for it, and
 * they filtered on one field:
 *
 *     .filter((v) => v.data.status !== 'permanently_closed')
 *
 * Two things were wrong with that. The filter was not applied on the stay hub,
 * the wine hub, the explore directory, the sitemap, the partner forms, or any
 * of the five pages that serialise the whole venue corpus into a client-side
 * lookup table - so those surfaces published closed venues by default. And the
 * predicate read one of the two fields that record a closure: venues/
 * la-baracca-tgallant.json carries `operatingStatus: permanently-closed` with
 * an editor's dated confirmation from May 2026 and no `status` at all, so
 * `status` defaulted to `active` and a restaurant that had shut kept rendering
 * as live, with a booking link, on every one of those surfaces including the
 * eat hub that was supposedly filtered.
 *
 * Both halves are fixed in next/src/lib/editorial.ts (`isListableVenue`). This
 * script exists so the next listing surface cannot reintroduce either half
 * without someone deciding to.
 *
 * It audits the BUILT SITE, not the source. A source-level lint would have to
 * guess which `getCollection('venues')` call ends up as a link, and would miss
 * a leak arriving through a component, a lookup table or generated JSON-LD.
 * Reading dist asks the only question that matters: does a closed venue's slug
 * or name appear on a published page?
 *
 * What counts as a leak:
 *   - the venue's route slug inside an href, a JSON payload or a JSON-LD block
 *   - the venue's display name in the rendered page
 * on any built page outside the allowed set. Its own detail page is allowed by
 * construction - that page is expected to exist and to say the venue is closed
 * (VenueDetailTemplate renders the closure notice and suppresses the booking
 * bar), and deleting it would delete a live URL.
 *
 * Report-only by default. `--assert` compares against the ratchet baseline in
 * ops/reports/content/closed-venue-leak-baseline.json and exits 1 on
 * regression, matching the contract audit-content-schema-drift.mjs and
 * audit-link-graph.mjs use. The ratchet is per page path rather than per
 * total: a page already in the baseline may not grow the number of closed
 * venues it mentions, and a page NOT in the baseline fails on its first
 * appearance. That is the behaviour that matters here - the failure this gate
 * exists to prevent is a NEW listing surface enumerating the corpus without
 * the filter, and a new surface is exactly what produces a page with no
 * baseline entry.
 *
 * Seeded from the real build, so it can never be satisfied by making the site
 * worse and never blocks a deploy over debt it inherited. Tighten the baseline
 * as each remaining page is cleared.
 *
 * Nothing here is time-driven. The closed set comes from the content files and
 * the occurrences come from the build; run it on any date and on any machine
 * and the same build yields the same numbers.
 *
 * Usage:
 *   node scripts/audit-closed-venue-leaks.mjs [--dist dist] [--json out.json]
 *                                             [--assert] [--baseline path]
 *                                             [--update-baseline]
 *                                             [--content path]
 *
 * --content points at the venue collection directory to read closures from.
 * Only the test harness passes it; production callers audit the real corpus.
 */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');
const DEFAULT_BASELINE = path.join(
  REPO,
  'ops',
  'reports',
  'content',
  'closed-venue-leak-baseline.json'
);

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const DIST = path.resolve(getArg('--dist', path.join(NEXT, 'dist')));
const CONTENT = path.resolve(getArg('--content', path.join(NEXT, 'src', 'content', 'venues')));
const JSON_OUT = getArg('--json', null);
const BASELINE = path.resolve(getArg('--baseline', DEFAULT_BASELINE));
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');

/**
 * Built pages that are allowed to mention a closed venue.
 *
 * `detail` means the venue's own page under any section prefix. A closed venue
 * whose detail page still builds is the deliberate outcome: the URL stays
 * alive and the page says the venue has closed. Removing it would 404 an
 * address that is linked from elsewhere on the web.
 *
 * `/admin/media-registry.json` is the media provenance index. It is keyed by
 * source file and must stay complete, including for records that no longer
 * render, or the media audit loses its mapping.
 */
const ALLOWED_EXACT = new Set(['/admin/media-registry.json']);

/** Both fields that carry a permanent closure. Mirrors isListableVenue. */
function closureOf(record) {
  if (record?.status === 'permanently_closed') return 'status';
  if (record?.operatingStatus === 'permanently-closed') return 'operatingStatus';
  return null;
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(abs, out);
    else out.push(abs);
  }
  return out;
}

/** dist/eat/x/index.html -> /eat/x/ ; dist/sitemap.xml -> /sitemap.xml */
function routeFor(file) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  if (rel === 'index.html') return '/';
  return `/${rel}`;
}

/** Escape a literal for use inside a RegExp. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function readClosedVenues() {
  let files;
  try {
    files = await readdir(CONTENT);
  } catch (error) {
    // Fail closed. An unreadable corpus must never read as "nothing is closed".
    console.error(`  FAIL: cannot read ${path.relative(REPO, CONTENT)} - ${error.message}`);
    process.exit(1);
  }

  const closed = [];
  for (const name of files.sort()) {
    if (!name.toLowerCase().endsWith('.json')) continue;
    const abs = path.join(CONTENT, name);
    let record;
    try {
      record = JSON.parse(await readFile(abs, 'utf8'));
    } catch (error) {
      console.error(`  FAIL: cannot parse ${name} - ${error.message}`);
      process.exit(1);
    }
    const field = closureOf(record);
    if (!field) continue;
    const slug = record.slug ?? name.replace(/\.json$/i, '');
    closed.push({ slug, name: record.name ?? slug, field });
  }
  return closed;
}

async function main() {
  const closed = await readClosedVenues();

  const files = (await walk(DIST)).filter((f) => /\.(html|xml|json|txt)$/i.test(f));
  if (!files.length) {
    console.error(`  FAIL: nothing to audit under ${DIST}. Run \`astro build\` first.`);
    process.exit(1);
  }

  // One matcher per closed venue: the route slug as a whole path/JSON token, or
  // the display name as it would be rendered.
  const matchers = closed.map((v) => ({
    ...v,
    slugRe: new RegExp(`(?<![A-Za-z0-9-])${esc(v.slug)}(?![A-Za-z0-9-])`),
    nameRe: new RegExp(esc(v.name).replace(/'/g, "['’]"), 'i'),
  }));

  const byRoute = new Map();
  let pagesScanned = 0;

  for (const file of files) {
    const route = routeFor(file);
    let body;
    try {
      body = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    pagesScanned += 1;
    if (ALLOWED_EXACT.has(route)) continue;

    for (const m of matchers) {
      // A closed venue's own detail page is expected to exist and to name it.
      if (route.endsWith(`/${m.slug}/`)) continue;
      const bySlug = m.slugRe.test(body);
      const byName = m.nameRe.test(body);
      if (!bySlug && !byName) continue;
      if (!byRoute.has(route)) byRoute.set(route, []);
      byRoute.get(route).push({
        slug: m.slug,
        name: m.name,
        closureField: m.field,
        matched: bySlug && byName ? 'slug+name' : bySlug ? 'slug' : 'name',
      });
    }
  }

  const leaks = [...byRoute.entries()]
    .map(([route, venues]) => ({
      route,
      count: venues.length,
      venues: venues.sort((a, b) => a.slug.localeCompare(b.slug)),
    }))
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route));

  const ceilings = Object.fromEntries(leaks.map(({ route, count }) => [route, count]));

  const report = {
    generatedAt: new Date().toISOString(),
    dist: path.relative(REPO, DIST).split(path.sep).join('/'),
    totals: {
      closedVenues: closed.length,
      pagesScanned,
      leakingPages: leaks.length,
      leakInstances: leaks.reduce((sum, l) => sum + l.count, 0),
    },
    closedVenues: closed,
    leaks,
  };

  const t = report.totals;
  console.log(`Closed-venue leaks - ${t.pagesScanned} built files (${report.dist})`);
  console.log('');
  console.log(`  permanently closed venues in the corpus .... ${t.closedVenues}`);
  for (const v of closed) console.log(`    ${v.slug}  (via ${v.field})`);
  console.log('');
  console.log('  built pages that still name one');
  console.log(`    leaking pages .............. ${t.leakingPages}   [gated, per page]`);
  console.log(`    leak instances ............. ${t.leakInstances}`);
  console.log('');
  for (const l of leaks) {
    console.log(`    LEAK  ${l.route}  x${l.count}`);
    for (const v of l.venues) console.log(`          ${v.slug} (${v.matched})`);
  }
  console.log('');

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${path.relative(REPO, out).split(path.sep).join('/')}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          updatedAt: report.generatedAt,
          note:
            'Ratchet baseline, seeded from a real build. A route listed here may not name more closed venues than it already does; a route NOT listed here fails on first appearance. Tighten as each page is cleared. A closed venue own detail page is never counted - it is expected to exist and to say the venue has closed.',
          totals: t,
          ceilings,
        },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${path.relative(REPO, BASELINE).split(path.sep).join('/')}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing or corrupt baseline must not read as "no leaks".
    console.error(
      `\n  FAIL: cannot read baseline ${path
        .relative(REPO, BASELINE)
        .split(path.sep)
        .join('/')} - ${error.message}`
    );
    console.error('  Seed it with: npm run audit:closed-venues -- --update-baseline');
    process.exit(1);
  }

  const allowed = baseline.ceilings ?? {};
  const failures = [];
  for (const { route, count, venues } of leaks) {
    const ceiling = allowed[route] ?? 0;
    if (count > ceiling) {
      failures.push(
        ceiling === 0
          ? `${route}: names a permanently closed venue and is new to the baseline - ${venues
              .map((v) => v.slug)
              .join(', ')}`
          : `${route}: ${count} > baseline ${ceiling}`
      );
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: a built page recommends a business that has permanently closed');
    for (const f of failures) console.error(`    ${f}`);
    console.error('');
    console.error('  Filter the listing with isListableVenue from next/src/lib/editorial.ts.');
    console.error('  Do NOT fix this by narrowing a getStaticPaths - that deletes a live URL.');
    console.error('  Re-seed deliberately with: npm run audit:closed-venues -- --update-baseline');
    process.exit(1);
  }
  console.log('  PASS: no new closed-venue leaks against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
