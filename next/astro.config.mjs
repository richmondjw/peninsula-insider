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
  // Redirects are handled by custom src/pages/*.astro files using the
  // Redirect component (src/components/Redirect.astro). This gives flash-free
  // JS redirects instead of Astro's meta-refresh HTML which flashes body content.
  // Do not add redirect entries here — create a page file instead.
});
