// Peninsula Insider — static-asset cache-busting integration.
//
// THE PROBLEM IT SOLVES
// Static images under public/images/* are referenced by fixed string paths
// (e.g. /images/sourced/explore-cape-schanck-lighthouse-01.webp) across MDX
// frontmatter, JSON content, inline background-image styles, <img> tags, OG
// meta tags, and JSON-LD. When an editor swaps the *bytes* of one of those
// files but keeps the filename, the URL is byte-for-byte identical, so
// GitHub Pages' `Cache-Control: max-age=600` and every downstream browser /
// proxy cache happily serve the stale copy. That is exactly the "other
// people see the old hero image" bug.
//
// THE FIX (industrial-strength, webpack/vite-style contenthash)
// After the static build finishes, walk every emitted .html file and append
// `?v=<short-content-hash>` to each /images/* reference. The hash is derived
// from the file's actual bytes, so a URL changes IF AND ONLY IF its content
// changes:
//   • change the bytes  -> new hash -> new URL -> caches miss -> fresh image
//   • leave bytes alone -> same hash -> same URL -> caches hit -> fast repeat
//
// This is deliberately scoped to /images/* only:
//   • Astro-pipeline assets in /_astro/* are ALREADY contenthash-named — skip.
//   • Supabase / Cloudflare CMS uploads are absolute URLs that are ALREADY
//     content-addressed (timestamped immutable filenames, Cache-Control:
//     no-cache) — they never match the /images/ pattern, so they pass through
//     untouched. No double-busting, no churn.
//
// Why post-process HTML instead of a versionedAsset() helper in 26 components:
// one file, zero per-component churn, and it covers EVERY reference shape
// (inline styles, srcset, OG tags, JSON-LD, MDX-rendered markdown) in one
// pass — including the ones a helper would never reach.

import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Extensions we version. Anything else (.css, .js, .json, .pdf, .xml) is left
// alone — those either carry their own hashing or change-detection, or are not
// hero-image surfaces.
const IMAGE_EXT = 'webp|jpg|jpeg|png|svg|avif|gif';

// Match a root-relative /images/... path ending in an image extension, but
// NOT one that already carries a query string (idempotent on re-runs). The
// path character class is conservative so we stop cleanly at the closing
// quote, paren, comma (srcset), or whitespace.
const IMG_RE = new RegExp(
  `/images/[A-Za-z0-9._/\\-@]+\\.(?:${IMAGE_EXT})(?!\\?)`,
  'g'
);

async function walkHtml(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkHtml(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

export default function cacheBustImages() {
  return {
    name: 'pi-cache-bust-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distRoot = fileURLToPath(dir);
        // hash cache: path-on-disk -> 8-char content hash (or '' when missing)
        const hashes = new Map();

        const hashFor = async (urlPath) => {
          if (hashes.has(urlPath)) return hashes.get(urlPath);
          // urlPath is like "/images/sourced/foo.webp"; strip the query if the
          // path appeared inside an absolute URL fragment we matched.
          const rel = urlPath.replace(/^\//, '');
          const filePath = path.join(distRoot, rel);
          let hash = '';
          if (existsSync(filePath)) {
            try {
              const buf = await readFile(filePath);
              hash = createHash('sha1').update(buf).digest('hex').slice(0, 8);
            } catch {
              hash = '';
            }
          }
          hashes.set(urlPath, hash);
          return hash;
        };

        const htmlFiles = await walkHtml(distRoot, []);
        let filesTouched = 0;
        let refsStamped = 0;

        for (const file of htmlFiles) {
          const html = await readFile(file, 'utf8');

          // Collect the distinct image paths in this file first so we can
          // resolve their hashes (async) before doing the synchronous replace.
          const matches = html.match(IMG_RE);
          if (!matches) continue;
          const unique = [...new Set(matches)];
          await Promise.all(unique.map((p) => hashFor(p)));

          let changed = false;
          const next = html.replace(IMG_RE, (match) => {
            const hash = hashes.get(match);
            if (!hash) return match; // file not found in dist — leave as-is
            changed = true;
            refsStamped += 1;
            return `${match}?v=${hash}`;
          });

          if (changed) {
            await writeFile(file, next, 'utf8');
            filesTouched += 1;
          }
        }

        const log = logger ?? console;
        log.info(
          `pi-cache-bust-images: stamped ${refsStamped} reference(s) across ${filesTouched} page(s) ` +
            `(${hashes.size} distinct image(s) hashed).`
        );
      },
    },
  };
}
