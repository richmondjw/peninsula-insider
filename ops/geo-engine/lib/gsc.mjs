// Search Console intelligence.
//
// The repository already carries a GSC client (ops/scripts/gsc_client.py) and a
// documented credential path. This adapter reads whatever that pipeline has
// already written to disk and reports honestly when nothing is available.
//
// It never estimates impressions, clicks or positions. Absent data is absent.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, clamp, readJson, round } from './util.mjs';

const CANDIDATE_FILES = [
  'ops/data/gsc-search-analytics.json',
  'ops/data/gsc-queries.json',
  'ops/data/search-analytics.json',
  'ops/reports/seo/ledger/gsc-latest.json',
];

/**
 * @returns {{available: boolean, reason: string, rows: array, source: string|null}}
 */
export function loadSearchData({ root = REPO_ROOT, env = process.env } = {}) {
  if (env.GSC_ROWS_JSON) {
    const parsed = safeParse(env.GSC_ROWS_JSON);
    if (Array.isArray(parsed)) {
      return { available: true, reason: 'rows supplied via GSC_ROWS_JSON', rows: parsed, source: 'env:GSC_ROWS_JSON' };
    }
  }
  for (const rel of CANDIDATE_FILES) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    const rows = Array.isArray(data) ? data : data?.rows;
    if (Array.isArray(rows) && rows.length) {
      return { available: true, reason: `read from ${rel}`, rows, source: rel };
    }
  }
  const credentialed = Boolean(env.GSC_TOKEN_JSON || fs.existsSync(path.join(root, 'ops', 'tokens', 'gsc-token.json')));
  return {
    available: false,
    rows: [],
    source: null,
    reason: credentialed
      ? 'GSC credentials present but no exported rows found; run ops/scripts/gsc-search-analytics.py first'
      : 'No Search Console credentials or exported rows in this environment (see ops/gsc-auth/README.md)',
  };
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** Normalise one row from either the API shape or a flat export. */
function normalise(row) {
  const keys = Array.isArray(row.keys) ? row.keys : [];
  return {
    query: row.query ?? keys[0] ?? null,
    page: row.page ?? keys[1] ?? null,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  };
}

/**
 * Classify real search demand and surface the recognised opportunity shapes:
 * high impressions with low CTR, positions 4-20, and queries with no good page.
 */
export async function analyseSearch(searchData, pages, service, { topQueries = 300 } = {}) {
  if (!searchData.available) {
    return {
      available: false,
      reason: searchData.reason,
      opportunities: { highImpressionLowCtr: [], striking: [], queriesWithoutGoodPage: [] },
      byTerm: null,
      totals: null,
    };
  }

  const rows = searchData.rows.map(normalise).filter((r) => r.query);
  const totals = rows.reduce((acc, r) => {
    acc.impressions += r.impressions; acc.clicks += r.clicks; return acc;
  }, { impressions: 0, clicks: 0, queries: rows.length });
  totals.ctr = totals.impressions ? round(totals.clicks / totals.impressions, 4) : 0;

  const ranked = [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, topQueries);

  const classifications = await service.decideBatch(
    'query.classification',
    ranked.map((r) => ({ query: r.query })),
  );

  const enriched = ranked.map((r, i) => ({ ...r, ...(classifications[i].value ?? {}), classifierProvider: classifications[i].provider }));

  const siteMedianCtr = totals.ctr || 0.02;
  const highImpressionLowCtr = enriched
    .filter((r) => r.impressions >= 100 && r.ctr < siteMedianCtr * 0.5)
    .sort((a, b) => b.impressions - a.impressions).slice(0, 25);

  const striking = enriched
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions).slice(0, 25);

  // Queries with demand where the best-matching page is a poor answer.
  const candidates = Object.values(pages).filter((p) => p.indexable && p.wordCount > 150);
  const noPageInputs = enriched.filter((r) => r.impressions >= 50).slice(0, 100).map((r) => {
    const best = bestPage(r.query, candidates);
    return {
      row: r,
      input: {
        query: r.query,
        pageTitle: best?.title ?? null,
        pageH1: best?.h1 ?? null,
        pageHeadings: (best?.headings ?? []).slice(0, 12).map((h) => h.text).join(' '),
      },
      best,
    };
  });
  const fits = noPageInputs.length
    ? await service.decideBatch('query.page_fit', noPageInputs.map((x) => x.input))
    : [];
  const queriesWithoutGoodPage = noPageInputs
    .map((x, i) => ({
      query: x.row.query,
      impressions: x.row.impressions,
      clicks: x.row.clicks,
      position: x.row.position,
      bestPage: x.best?.urlPath ?? null,
      fit: fits[i]?.value?.score ?? 0,
      fitLabel: fits[i]?.value?.fit ?? 'none',
      supportingEntities: (x.best?.towns?.length ?? 0) + (x.best?.venues?.length ?? 0),
    }))
    .filter((r) => ['poor', 'none'].includes(r.fitLabel))
    .sort((a, b) => b.impressions - a.impressions).slice(0, 25);

  const byTerm = {};
  for (const r of rows) {
    for (const t of r.query.toLowerCase().split(/\s+/)) byTerm[t] = (byTerm[t] ?? 0) + r.impressions;
  }

  return {
    available: true,
    source: searchData.source,
    totals,
    byIntent: countBy(enriched, 'intent'),
    byLocalScope: countBy(enriched, 'local_scope'),
    byCommercialValue: countBy(enriched, 'commercial_value'),
    opportunities: { highImpressionLowCtr, striking, queriesWithoutGoodPage },
    byTerm,
  };
}

function countBy(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] ?? 0) + 1;
  return out;
}

function bestPage(query, candidates) {
  const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 3);
  let best = null; let score = 0;
  for (const p of candidates) {
    const hay = `${p.title ?? ''} ${p.h1 ?? ''} ${p.urlPath}`.toLowerCase();
    let s = 0;
    for (const t of terms) if (hay.includes(t)) s += 1;
    if (s > score) { score = s; best = p; }
  }
  return score > 0 ? best : null;
}

/** Attach per-page search metrics to inventory records, where data exists. */
export function attachToInventory(pages, searchData) {
  if (!searchData.available) return { attached: 0 };
  const byPage = new Map();
  for (const raw of searchData.rows) {
    const r = normalise(raw);
    if (!r.page) continue;
    let p;
    try { p = new URL(r.page).pathname; } catch { continue; }
    if (!p.endsWith('/')) p = `${p}/`;
    const prev = byPage.get(p) ?? { impressions: 0, clicks: 0, positionSum: 0, n: 0 };
    prev.impressions += r.impressions; prev.clicks += r.clicks;
    prev.positionSum += r.position * Math.max(r.impressions, 1); prev.n += Math.max(r.impressions, 1);
    byPage.set(p, prev);
  }
  let attached = 0;
  for (const [urlPath, agg] of byPage) {
    const page = pages[urlPath];
    if (!page) continue;
    page.search = {
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions ? round(agg.clicks / agg.impressions, 4) : 0,
      avgPosition: agg.n ? round(agg.positionSum / agg.n, 2) : null,
      updatedAt: new Date().toISOString(),
    };
    attached += 1;
  }
  return { attached, pagesWithData: byPage.size };
}
