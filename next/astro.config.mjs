// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

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
  site: 'https://peninsularinsider.com.au',
  base,
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  // No integrations yet — add Mapbox island, Pagefind, Sanity Studio mount
  // etc. in Phase 2 as they become necessary.
  integrations: [],
  // Output: pure static. Vercel/Netlify adapters come in the cutover week.
  output: 'hybrid',
  adapter: vercel(),
});
