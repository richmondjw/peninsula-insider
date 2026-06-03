// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkBlockIds from './src/lib/inline-edit/remark-block-ids.mjs';
import cacheBustImages from './src/lib/cache-bust-integration.mjs';
import keystatic from '@keystatic/astro';

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
    // Keystatic CMS — spike/keystatic branch only. Requires hybrid output.
    // Remove or gate behind env var before merging to main.
    ...(process.env.KEYSTATIC !== '0' ? [keystatic()] : []),
    cacheBustImages(), // append ?v=<contenthash> to /images/* refs in built HTML
                       // so editor byte-swaps invalidate stale CDN/browser caches.
                       // Build-only (astro:build:done); no effect on dev.
  ],
  vite: {
    plugins: [tailwindcss()], // Tailwind v4 via Vite. Preflight is disabled in
                              // styles/tailwind.css so it never resets the
                              // global design system. Used only inside files
                              // that explicitly @import 'tailwind.css'.
  },
  // Note: Astro 6 removed 'hybrid' mode — it merged into 'static'.
  // For local Keystatic dev, 'server' mode is required so the injected
  // /keystatic/* and /api/keystatic/* routes (prerender:false) can render.
  // In CI/production builds, set KEYSTATIC=0 to skip the integration and
  // keep the default static output with the existing adapter logic.
  output: adminHybrid ? 'server' : (process.env.KEYSTATIC !== '0' ? 'server' : 'static'),
  adapter,
  // Redirects are handled by custom src/pages/*.astro files using the
  // Redirect component (src/components/Redirect.astro). This gives flash-free
  // JS redirects instead of Astro's meta-refresh HTML which flashes body content.
  // Do not add redirect entries here — create a page file instead.
});
