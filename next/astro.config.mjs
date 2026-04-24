// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Peninsula Insider — Astro config (Phase 1 scaffold).
// Decisions locked in roadmap-2026-04-09.md § 4 and § 9:
//   • Astro + JSON content collections as the source of truth
//   • Static output — no SSR in Phase 1
//   • Content-first: zero-JS by default on content pages
//   • Islands will be added later for map, search, wizard
//
// Do not add integrations (Tailwind, MDX, etc.) until they earn their place.
// Intentionally minimal so a human dev can pick this up and see the bones.

// Preview builds to /V2/ on GitHub Pages set ASTRO_BASE=/V2/.
// Production (root-served) builds leave it unset.
const base = process.env.ASTRO_BASE || undefined;

export default defineConfig({
  site: 'https://peninsulainsider.com.au',
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    mdx(), // hub-guide, trail-guide, venue-guide articles use AlertBlock + ClusterLinks components
  ],
  // Output: pure static. Vercel/Netlify adapters come in the cutover week.
  output: 'static',
  redirects: {
    // PI-EXP-044 — merge duplicate bushrangers-bay entity
    '/explore/bushrangers-bay/': '/explore/bushrangers-bay-walk/',

    // PI-EXP-007 — rename /explore/best-walks to /explore/walks; top-level /walks stub
    '/explore/best-walks/': '/explore/walks/',
    '/explore/mornington-peninsula-walk/': '/explore/walks/',
    '/walks/': '/explore/walks/',

    // PI-EXP-006 — consolidate journal things-to-do article into hub
    '/journal/things-to-do-mornington-peninsula/': '/explore/things-to-do/',

    // PI-EXP-011 — beaches hub (absorbs journal beach guide)
    '/journal/mornington-peninsula-beach-guide/': '/explore/beaches/',

    // PI-EXP-012 — hot-springs hub (absorbs journal guide)
    '/journal/mornington-peninsula-hot-springs-guide/': '/explore/hot-springs/',

    // PI-EXP-013 — golf hub (absorbs two journal guide URLs)
    '/journal/mornington-peninsula-golf-guide/': '/explore/golf/',
    '/journal/best-golf-courses-mornington-peninsula/': '/explore/golf/',

    // PI-EXP-014 — spas hub (absorbs /spa top-level and journal URL)
    '/spa/': '/explore/spas-and-wellness/',
    '/journal/best-spas-mornington-peninsula/': '/explore/spas-and-wellness/',

    // PI-EXP-009 — consolidate duplicate journal pillar pairs
    '/journal/the-peninsula-beach-swimming-guide/': '/journal/mornington-peninsula-beach-guide/',
    '/journal/the-peninsula-with-kids/': '/journal/mornington-peninsula-with-kids/',
    '/journal/the-dog-friendly-peninsula/': '/journal/dog-friendly-mornington-peninsula/',
    '/journal/the-rainy-day-peninsula-without-a-booking/': '/journal/rainy-day-peninsula/',
    '/journal/the-family-day-out/': '/escape/the-family-day-out/',

    // PI-EXP-022 — where-to-base-yourself hub (absorbs journal stay guide)
    '/journal/where-to-stay-mornington-peninsula/': '/explore/where-to-base-yourself/',
  },
});
