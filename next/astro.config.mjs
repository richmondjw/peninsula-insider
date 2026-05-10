// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Peninsula Insider — Astro config.
// Decisions locked in roadmap-2026-04-09.md § 4 and § 9:
//   • Astro + JSON content collections as the source of truth
//   • Static output by default — the public site is fully prerendered
//   • Content-first: zero-JS by default on content pages
//   • Islands are added per-need (map, search, wizard, admin)
//
// Admin hybrid cutover (see next/docs/pi-cms-hybrid-cutover-2026-05-10.md):
// when PI_ADMIN_HYBRID=1, switch to server output and load a Vercel adapter so
// `src/middleware.ts` runs at request time and `/admin/api/*` becomes real
// serverless. Without that env var, behaviour is unchanged. The adapter is
// loaded dynamically so the static build does not need it installed.

// Preview builds to /V2/ on GitHub Pages set ASTRO_BASE=/V2/.
// Production (root-served) builds leave it unset.
const base = process.env.ASTRO_BASE || undefined;

const adminHybrid = process.env.PI_ADMIN_HYBRID === '1';

let adapter;
if (adminHybrid) {
  try {
    const mod = await import('@astrojs/vercel');
    adapter = mod.default({});
  } catch (err) {
    // The adapter is intentionally optional. If hybrid mode is requested but
    // the adapter is not installed, fail loud rather than silently producing a
    // static build that cannot run middleware or admin endpoints.
    throw new Error(
      'PI_ADMIN_HYBRID=1 but @astrojs/vercel is not installed. Run `npm install @astrojs/vercel` in next/ and retry.'
    );
  }
}

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
  output: adminHybrid ? 'server' : 'static',
  adapter,
  // Redirects are handled by custom src/pages/*.astro files using the
  // Redirect component (src/components/Redirect.astro). This gives flash-free
  // JS redirects instead of Astro's meta-refresh HTML which flashes body content.
  // Do not add redirect entries here — create a page file instead.
});
