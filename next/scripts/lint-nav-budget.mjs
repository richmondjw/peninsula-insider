#!/usr/bin/env node
/**
 * lint-nav-budget.mjs - enforce the V5 navigation choice budgets.
 *
 * future-ia.md section 3.1: total header choices <= 55 (was 115).
 * future-ia.md section 3.2: drawer <= 14 items (13 rows + Dispatch CTA).
 * Panel anatomy caps: <=5 curated links, 1-2 browse links, exactly
 * 1 rail pin per pillar; exactly 7 pillars.
 *
 * Counting model (what a reader can click in the header):
 *   1 logo + 7 pillar triggers + 3 utilities (launcher, Saved, menu)
 *   + per pillar: curated + browse + 1 rail pin.
 *
 * Usage: node scripts/lint-nav-budget.mjs   (from next/, or repo root
 * via node next/scripts/lint-nav-budget.mjs). Exits 1 on any breach.
 *
 * v5-nav.ts keeps flat interfaces and a single import so it can be read
 * without a TS toolchain. The stripping and the season stubs live in
 * scripts/nav-config-eval.mjs, shared with src/lib/v5-nav.test.mjs so the
 * two readers of the config cannot drift apart. This lint only counts
 * links, so the stubbed values never reach a count.
 */

import { evaluateNavConfig, NAV_CONFIG_PATH } from './nav-config-eval.mjs';

const HEADER_BUDGET = 55;
const DRAWER_BUDGET = 14;
const CURATED_CAP = 5;
const BROWSE_MIN = 1;
const BROWSE_MAX = 2;
const PILLAR_COUNT = 7;

// A rail that has expired resolves to its fallback, which is still exactly
// one rail, so the budget is the same either way. Pin the date anyway: a
// lint whose arithmetic depends on the day it runs is the failure mode this
// repo forbids.
let navExports;
try {
  navExports = evaluateNavConfig({ todayISO: '1970-01-01' });
} catch (err) {
  console.error(`lint-nav-budget: could not evaluate ${NAV_CONFIG_PATH}`);
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}

const { v5Pillars, v5Utilities, v5DrawerItems, v5DrawerCta } = navExports;

const failures = [];

if (!Array.isArray(v5Pillars)) {
  console.error('lint-nav-budget: v5Pillars not found in v5-nav.ts');
  process.exit(1);
}

// -- Structural caps ---------------------------------------------------
if (v5Pillars.length !== PILLAR_COUNT) {
  failures.push(`pillar count is ${v5Pillars.length}, must be exactly ${PILLAR_COUNT}`);
}
for (const p of v5Pillars) {
  if (!Array.isArray(p.curated) || p.curated.length > CURATED_CAP) {
    failures.push(`pillar "${p.key}" has ${p.curated?.length ?? 0} curated links (cap ${CURATED_CAP})`);
  }
  if (!Array.isArray(p.browse) || p.browse.length < BROWSE_MIN || p.browse.length > BROWSE_MAX) {
    failures.push(`pillar "${p.key}" has ${p.browse?.length ?? 0} browse links (must be ${BROWSE_MIN}-${BROWSE_MAX})`);
  }
  if (!p.rail || !p.rail.href) {
    failures.push(`pillar "${p.key}" is missing its rail pin`);
  }
}

// -- Header total ------------------------------------------------------
const utilityCount = v5Utilities ? Object.keys(v5Utilities).length : 0;
const panelChoices = v5Pillars.reduce(
  (sum, p) => sum + (p.curated?.length ?? 0) + (p.browse?.length ?? 0) + 1 /* rail */,
  0,
);
const headerTotal = 1 /* logo */ + v5Pillars.length /* triggers */ + utilityCount + panelChoices;

if (headerTotal > HEADER_BUDGET) {
  failures.push(`header choices ${headerTotal} exceed the budget of ${HEADER_BUDGET}`);
}

// -- Drawer total ------------------------------------------------------
const drawerRows = Array.isArray(v5DrawerItems) ? v5DrawerItems.length : 0;
const drawerTotal = drawerRows + (v5DrawerCta ? 1 : 0);
if (drawerTotal > DRAWER_BUDGET) {
  failures.push(`drawer items ${drawerTotal} (incl. CTA) exceed the budget of ${DRAWER_BUDGET}`);
}

// -- Report ------------------------------------------------------------
console.log('nav budget:');
console.log(`  header choices : ${headerTotal} / ${HEADER_BUDGET}  (logo 1 + triggers ${v5Pillars.length} + utilities ${utilityCount} + panel links ${panelChoices})`);
console.log(`  drawer items   : ${drawerTotal} / ${DRAWER_BUDGET}  (rows ${drawerRows} + CTA ${v5DrawerCta ? 1 : 0})`);

if (failures.length) {
  console.error('\nFAIL:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nOK: navigation within budget.');
