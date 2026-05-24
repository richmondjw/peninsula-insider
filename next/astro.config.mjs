// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkBlockIds from './src/lib/inline-edit/remark-block-ids.mjs';

// Peninsula Insider — Astro config.
// Decisions locked in roadmap-2026-04-09.md § 4 and § 9:
//   • Astro + JSON content collections as the source of truth
//   • Static output by default — the public site is fully prerendered
//   • Content-first: zero-JS by default on content pages
//   • Islands are added per-need (map, search, wizard, admin)
//
// Phase 3 (2026-05-21): always output: 'static' + Vercel adapter.
// Previously output switched between 'server' (PI_ADMIN_HYBRID=1) and 'static'.
// Static (with adapter) gives us the best of both: pages prerender at build
// time (baking Sanity data in), while /api/admin/* and /api/preview/* remain
// serverless SSR functions via `export const prerender = false`. PI_ADMIN_HYBRID
// is no longer needed and has been removed from Vercel env.
// Note: output: 'hybrid' was removed in Astro 5 — 'static' now has the same
// hybrid behaviour (opt-out of prerendering per-route with prerender=false).
// See next/docs/HANDOVER-SANITY-STATIC-MIGRATION.md Phase 3.

// Preview builds to /V2/ on GitHub Pages set ASTRO_BASE=/V2/.
// Production (root-served) builds leave it unset.
const base = process.env.ASTRO_BASE || undefined;

let adapter;
try {
  const mod = await import('@astrojs/vercel');
  adapter = mod.default({});
} catch (err) {
  throw new Error(
    '@astrojs/vercel is not installed. Run `npm install @astrojs/vercel` in next/ and retry.'
  );
}



export default defineConfig({
  site: 'https://peninsulainsider.com.au',
  base,
  trailingSlash: 'always',
  // Move content-layer cache out of node_modules so Vercel's build cache
  // doesn't serve stale data-store.json between deploys.
  cacheDir: './.astro-build-cache',
  build: {
    format: 'directory',
  },
  markdown: {
    // Tag every top-level paragraph, heading, list, blockquote in rendered
    // markdown with a stable data-pi-block-id attribute. The inline editor
    // uses these IDs as the key when an editor click-edits a block.
    remarkPlugins: [remarkBlockIds],
  },
  integrations: [
    mdx({
      // MDX uses the same remark pipeline as plain markdown, but plugins
      // declared at the top level don't carry through — they have to be
      // re-declared on the integration.
      remarkPlugins: [remarkBlockIds],
    }),
    react(), // scoped React islands for motion polish (ScrollReveal etc); not used on content pages
  ],
  vite: {
    plugins: [tailwindcss()], // Tailwind v4 via Vite. Preflight is disabled in
                              // styles/tailwind.css so it never resets the
                              // global design system. Used only inside files
                              // that explicitly @import 'tailwind.css'.
  },
  output: 'static',
  adapter,
  // Redirects are handled by custom src/pages/*.astro files using the
  // Redirect component (src/components/Redirect.astro). This gives flash-free
  // JS redirects instead of Astro's meta-refresh HTML which flashes body content.
  // Do not add redirect entries here — create a page file instead.
});
