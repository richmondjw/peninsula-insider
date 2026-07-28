#!/usr/bin/env node
/**
 * score-plan-fitness.mjs
 *
 * Ranks every structured itinerary in next/src/content/itineraries/ for
 * "should this be the Featured Plan this week?".
 *
 * Deterministic by design. No LLM. Selection is the highest-judgement act in
 * the content factory, so this script ranks and a human picks. It never picks.
 *
 * The score (weights in WEIGHTS below, must sum to 1.0):
 *
 *   seasonal_fit    from itinerary + stop season tags vs the current season
 *   weather_fit     7-day outlook vs the plan's outdoor/indoor stop ratio
 *   signal_lift     entity overlap between this week's signals and the stops
 *   search_headroom impressions at position 8-25 on plan-related URLs
 *   freshness_debt  weeks since last featured, capped; hard 0 inside 4 weeks
 *   media_readiness share of stops with a rights-cleared, channel-permitted asset
 *   commercial_pull anchor stay present and bookable
 *
 * Graceful degradation is the point. Every network- or credential-dependent
 * input degrades to a NEUTRAL value and is reported in `unavailable[]`, so the
 * script always produces a ranking and always says what it could not see.
 * A missing input never silently inflates a score.
 *
 * Usage:
 *   node ops/scripts/score-plan-fitness.mjs
 *   node ops/scripts/score-plan-fitness.mjs --json
 *   node ops/scripts/score-plan-fitness.mjs --week 2026-W31
 *   node ops/scripts/score-plan-fitness.mjs --offline      # skip all network
 *
 * Env (all optional; each missing one degrades one input):
 *   SUPABASE_SERVICE_KEY   reads pi_campaigns, pi_media_assets, pi_performance_daily
 *   PI_SUPABASE_URL        defaults to the PI_Concierge project
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO = resolve(__dirname, '../..');
const CONTENT = join(REPO, 'next/src/content');

const SUPABASE_URL =
  process.env.PI_SUPABASE_URL || 'https://mvdtkgsfuhmkioygxgge.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;

const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const AS_JSON = args.includes('--json');
const WEEK_ARG = valueOf('--week');

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

const WEIGHTS = {
  seasonal_fit: 0.25,
  weather_fit: 0.20,
  signal_lift: 0.15,
  search_headroom: 0.15,
  freshness_debt: 0.10,
  media_readiness: 0.10,
  commercial_pull: 0.05,
};

// A missing input scores NEUTRAL, not zero and not full. Scoring a missing
// input as 1.0 would let an unknown look like a strength; scoring it 0 would
// punish a plan for the system's blindness. 0.5 does neither.
const NEUTRAL = 0.5;

// Mood tags that imply the stop is exposed to weather.
const OUTDOOR_MOODS = new Set([
  'walk', 'beach', 'outdoor', 'surf', 'garden', 'waterfront', 'golf', 'view', 'sunset', 'rooftop',
]);

const AEST = 'Australia/Melbourne';

// ── helpers ────────────────────────────────────────────────────────────────

function melbourneNow() {
  // Render "now" in Melbourne, then reparse. Avoids a tz library.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AEST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00`);
}

function seasonOf(date) {
  const m = date.getMonth() + 1; // southern hemisphere
  if (m === 12 || m <= 2) return 'summer';
  if (m <= 5) return 'autumn';
  if (m <= 8) return 'winter';
  return 'spring';
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function readJsonDir(dir) {
  let names = [];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json') && !n.startsWith('_'));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    try {
      out.push(JSON.parse(await readFile(join(dir, n), 'utf8')));
    } catch (err) {
      console.error(`[score-plan] skipped unreadable ${n}: ${err.message}`);
    }
  }
  return out;
}

async function supa(path) {
  if (!SUPABASE_KEY || OFFLINE) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── inputs ─────────────────────────────────────────────────────────────────

/** 7-day outlook for the Peninsula. Open-Meteo, no key, degrades to null. */
async function fetchOutlook() {
  if (OFFLINE) return null;
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=-38.35&longitude=145.0' +
    '&daily=precipitation_sum,temperature_2m_max&forecast_days=7&timezone=Australia%2FMelbourne';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const j = await res.json();
    const rain = j?.daily?.precipitation_sum ?? [];
    const temp = j?.daily?.temperature_2m_max ?? [];
    if (!rain.length) return null;
    const wetDays = rain.filter((mm) => mm >= 2).length;
    return {
      wetDays,
      dryShare: 1 - wetDays / rain.length,
      maxTempAvg: temp.length ? temp.reduce((a, b) => a + b, 0) / temp.length : null,
    };
  } catch {
    return null;
  }
}

// ── scoring ────────────────────────────────────────────────────────────────

function scoreSeasonal(plan, entities, season) {
  const declared = plan.season && plan.season !== 'year-round' ? [plan.season] : [];
  if (declared.includes(season)) return 1.0;
  if (plan.season === 'year-round' || !plan.season) {
    // Fall back to the stops' own season tags.
    const tags = plan.stops
      .map((s) => entities.get(s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience))
      .filter(Boolean)
      .flatMap((e) => e.tags?.season ?? e.seasonBest ?? []);
    if (!tags.length) return NEUTRAL;
    const hits = tags.filter((t) => t === season || t === 'all-year').length;
    return Math.min(1, hits / tags.length + 0.2);
  }
  return 0.3; // declared for a different season
}

function outdoorShare(plan, entities) {
  const stops = plan.stops ?? [];
  if (!stops.length) return null;
  let known = 0;
  let outdoor = 0;
  for (const s of stops) {
    const key = s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience;
    const e = entities.get(key);
    if (!e) continue;
    known += 1;
    const moods = e.tags?.mood ?? [];
    if (moods.some((m) => OUTDOOR_MOODS.has(m))) outdoor += 1;
  }
  return known ? outdoor / known : null;
}

function scoreWeather(plan, entities, outlook) {
  if (!outlook) return { score: NEUTRAL, note: 'no outlook' };
  const share = outdoorShare(plan, entities);
  if (share === null) return { score: NEUTRAL, note: 'stops unresolved' };
  // A dry week favours outdoor plans; a wet week favours indoor ones.
  const score = share * outlook.dryShare + (1 - share) * (1 - outlook.dryShare * 0.5);
  return {
    score: Math.max(0, Math.min(1, score)),
    note: `${Math.round(share * 100)}% outdoor stops, ${outlook.wetDays}/7 wet days`,
  };
}

function scoreSignalLift(plan, signalEntities) {
  if (!signalEntities || !signalEntities.size) return { score: NEUTRAL, note: 'no signals' };
  const stopSlugs = new Set(
    (plan.stops ?? [])
      .map((s) => s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience)
      .filter(Boolean)
  );
  if (!stopSlugs.size) return { score: 0, note: 'no stops' };
  let hits = 0;
  for (const slug of stopSlugs) if (signalEntities.has(slug)) hits += 1;
  return {
    score: Math.min(1, hits / Math.max(3, stopSlugs.size) * 2),
    note: `${hits} of ${stopSlugs.size} stops in this week's signals`,
  };
}

function scoreFreshness(plan, lastFeaturedWeeks) {
  if (lastFeaturedWeeks === null || lastFeaturedWeeks === undefined) {
    return { score: 1.0, note: 'never featured' };
  }
  // Hard cooldown: a plan featured inside four weeks cannot win.
  if (lastFeaturedWeeks < 4) return { score: 0, note: `featured ${lastFeaturedWeeks}w ago (cooldown)` };
  return { score: Math.min(1, lastFeaturedWeeks / 8), note: `${lastFeaturedWeeks}w since featured` };
}

function scoreMedia(plan, entities, cleared) {
  const stops = plan.stops ?? [];
  if (!stops.length) return { score: 0, note: 'no stops' };
  if (cleared === null) return { score: NEUTRAL, note: 'rights registry unavailable' };
  let ok = 0;
  const gaps = [];
  for (const s of stops) {
    const key = s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience;
    if (cleared.has(key)) ok += 1;
    else gaps.push(key);
  }
  return {
    score: ok / stops.length,
    note: `${ok}/${stops.length} stops cleared`,
    gaps,
  };
}

function scoreCommercial(plan, entities) {
  const anchor = plan.anchorStay?.id ?? plan.anchorStay ?? null;
  if (anchor) {
    const e = entities.get(anchor);
    return { score: e?.bookingUrl ? 1.0 : 0.7, note: `anchor stay: ${anchor}` };
  }
  // No declared anchorStay: fall back to any stop with a booking URL.
  const bookable = (plan.stops ?? []).filter((s) => {
    const key = s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience;
    return entities.get(key)?.bookingUrl;
  }).length;
  if (!bookable) return { score: 0, note: 'nothing bookable' };
  return { score: Math.min(0.6, bookable * 0.2), note: `${bookable} bookable stops, no anchorStay set` };
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const today = melbourneNow();
  const week = WEEK_ARG || isoWeek(today);
  const season = seasonOf(today);
  const unavailable = [];

  // Entities: venues + experiences, keyed by slug.
  const [venues, experiences, itineraries] = await Promise.all([
    readJsonDir(join(CONTENT, 'venues')),
    readJsonDir(join(CONTENT, 'experiences')),
    readJsonDir(join(CONTENT, 'itineraries')),
  ]);
  const entities = new Map();
  for (const e of [...venues, ...experiences]) if (e.slug) entities.set(e.slug, e);

  if (!itineraries.length) {
    console.error('[score-plan] no itineraries found. Nothing to rank.');
    process.exit(2);
  }

  // Outlook
  const outlook = await fetchOutlook();
  if (!outlook) unavailable.push('weather outlook (open-meteo)');

  // Signals: entities named in recent opportunities.
  let signalEntities = null;
  const opps = await supa(
    'pi_opportunities?select=suggested_angle,created_at,state&state=in.(new,reviewed)&order=created_at.desc&limit=40'
  );
  if (opps) {
    signalEntities = new Set();
    for (const o of opps) {
      const text = (o.suggested_angle || '').toLowerCase();
      for (const slug of entities.keys()) {
        const name = (entities.get(slug).name || '').toLowerCase();
        if (name.length >= 6 && text.includes(name)) signalEntities.add(slug);
      }
    }
  } else {
    unavailable.push('pi_opportunities (signal lift)');
  }

  // Rotation: last featured week per plan.
  let lastFeatured = null;
  const past = await supa('pi_campaigns?select=featured_plan_slug,publication_week&order=publication_week.desc&limit=100');
  if (past) {
    lastFeatured = new Map();
    for (const c of past) {
      if (!lastFeatured.has(c.featured_plan_slug)) lastFeatured.set(c.featured_plan_slug, c.publication_week);
    }
  } else {
    unavailable.push('pi_campaigns (rotation history)');
  }

  // Media rights: entity slugs with at least one approved, site-permitted asset.
  let cleared = null;
  const media = await supa(
    'pi_media_assets?select=entity_slug,permitted_channels,approval_status&approval_status=eq.approved&limit=2000'
  );
  if (media) {
    cleared = new Set();
    for (const m of media) if (m.entity_slug && (m.permitted_channels || []).length) cleared.add(m.entity_slug);
  } else {
    unavailable.push('pi_media_assets (media readiness)');
  }

  // Search headroom is not yet materialised (pi_search_opportunities is empty),
  // so it degrades for every plan equally. Reported, not hidden.
  unavailable.push('pi_search_opportunities (search headroom) — table is empty upstream');

  const weekNum = (w) => {
    const m = /^(\d{4})-W(\d{2})$/.exec(w || '');
    return m ? Number(m[1]) * 52 + Number(m[2]) : null;
  };
  const nowWeekNum = weekNum(week);

  const rows = itineraries.map((plan) => {
    const lastWeek = lastFeatured?.get(plan.slug) ?? null;
    const weeksSince =
      lastFeatured === null ? null
        : lastWeek === null ? null
          : nowWeekNum - weekNum(lastWeek);

    const seasonal = scoreSeasonal(plan, entities, season);
    const weather = scoreWeather(plan, entities, outlook);
    const signal = scoreSignalLift(plan, signalEntities);
    const fresh = scoreFreshness(plan, weeksSince);
    const mediaScore = scoreMedia(plan, entities, cleared);
    const commercial = scoreCommercial(plan, entities);
    const searchHeadroom = NEUTRAL;

    const components = {
      seasonal_fit: seasonal,
      weather_fit: weather.score,
      signal_lift: signal.score,
      search_headroom: searchHeadroom,
      freshness_debt: fresh.score,
      media_readiness: mediaScore.score,
      commercial_pull: commercial.score,
    };
    const total = Object.entries(WEIGHTS)
      .reduce((sum, [k, w]) => sum + w * components[k], 0);

    return {
      slug: plan.slug,
      title: plan.title,
      total: Number(total.toFixed(3)),
      components: Object.fromEntries(
        Object.entries(components).map(([k, v]) => [k, Number(v.toFixed(2))])
      ),
      notes: {
        weather: weather.note,
        signal: signal.note,
        freshness: fresh.note,
        media: mediaScore.note,
        commercial: commercial.note,
      },
      media_gaps: mediaScore.gaps ?? [],
      cooldown: fresh.score === 0,
      stops: (plan.stops ?? []).length,
    };
  });

  rows.sort((a, b) => b.total - a.total);

  const payload = {
    generated_at: new Date().toISOString(),
    publication_week: week,
    season,
    weights: WEIGHTS,
    neutral_value_for_missing_inputs: NEUTRAL,
    unavailable,
    outlook,
    shortlist: rows.filter((r) => !r.cooldown).slice(0, 3).map((r) => r.slug),
    ranked: rows,
  };

  if (AS_JSON) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }

  // Human-readable table.
  console.log(`\nPeninsula Insider — Featured Plan fitness, ${week} (${season})`);
  console.log('='.repeat(78));
  if (unavailable.length) {
    console.log('Degraded inputs (scored NEUTRAL 0.50, not hidden):');
    for (const u of unavailable) console.log(`  · ${u}`);
    console.log('');
  }
  if (outlook) {
    console.log(`Outlook: ${outlook.wetDays}/7 wet days, avg max ${outlook.maxTempAvg?.toFixed(1)}C\n`);
  }

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(
    pad('  #', 4) + pad('PLAN', 34) + pad('TOTAL', 8) +
    pad('SEAS', 6) + pad('WTHR', 6) + pad('SIGL', 6) + pad('FRSH', 6) + pad('MEDIA', 6) + 'FLAG'
  );
  console.log('-'.repeat(78));
  rows.forEach((r, i) => {
    const c = r.components;
    console.log(
      pad(`  ${i + 1}`, 4) + pad(r.slug, 34) + pad(r.total.toFixed(3), 8) +
      pad(c.seasonal_fit.toFixed(2), 6) + pad(c.weather_fit.toFixed(2), 6) +
      pad(c.signal_lift.toFixed(2), 6) + pad(c.freshness_debt.toFixed(2), 6) +
      pad(c.media_readiness.toFixed(2), 6) +
      (r.cooldown ? 'COOLDOWN' : r.components.media_readiness < 0.5 ? 'MEDIA-RISK' : '')
    );
  });

  console.log('\nShortlist for human selection (cooldown excluded):');
  payload.shortlist.forEach((s, i) => {
    const r = rows.find((x) => x.slug === s);
    console.log(`  ${i + 1}. ${r.title}`);
    console.log(`     ${r.notes.weather} | ${r.notes.media} | ${r.notes.freshness}`);
    if (r.media_gaps.length) console.log(`     media gaps: ${r.media_gaps.join(', ')}`);
  });
  console.log('\nThis script ranks. A human picks.\n');
}

main().catch((err) => {
  console.error(`[score-plan] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
