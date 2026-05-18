/**
 * Phase −1.1 — bulk-add `export const prerender = true` to every public
 * Astro page that doesn't need SSR.
 *
 * Why: when Astro runs in `output: 'server'` mode (required for Vercel
 * functions), every page is SSR by default. We want most pages to keep
 * their static-build characteristics — same TTFB as today, no function
 * invocations on cache miss. The `prerender = true` export tells Astro
 * to bake the page at build time.
 *
 * SSR-required routes (we DON'T add the export):
 *   - Anything under `admin/` (needs middleware + auth)
 *   - Anything under `api/` (handlers must run server-side)
 *
 * Everything else gets the export added at the top of its frontmatter
 * (right after the opening `---`). Idempotent — pages that already
 * have a `prerender` export are left untouched.
 *
 *   Usage: node ops/vercel-hybrid-cutover/add-prerender-export.mjs [--dry-run]
 */
import {readFile, writeFile, readdir} from 'node:fs/promises'
import {join, relative, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pagesDir = join(__dirname, '..', '..', 'next', 'src', 'pages')

const DRY = process.argv.includes('--dry-run')

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path, out)
    else if (/\.(astro|md|mdx|ts|js)$/.test(entry.name)) out.push(path)
  }
  return out
}

function needsSSR(rel) {
  // Routes that must run server-side:
  if (rel.startsWith('admin/')) return true
  if (rel.startsWith('api/')) return true
  return false
}

function alreadyHasExport(text) {
  return /export\s+const\s+prerender\s*=/.test(text)
}

function isAstroPage(path) {
  return path.endsWith('.astro')
}

function isMdPage(path) {
  return path.endsWith('.md') || path.endsWith('.mdx')
}

function addExportToAstro(text) {
  // Astro pages have `---\n<frontmatter>\n---\n<html>`. Insert the export
  // at the END of the existing frontmatter, just before the closing `---`.
  // If no frontmatter, prepend one.
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) {
    // No frontmatter — page is just HTML. Add one.
    return `---\nexport const prerender = true;\n---\n${text}`
  }
  const fm = m[1]
  const after = text.slice(m.index + m[0].length) // everything after closing `---`
  const newFm = fm.trimEnd() + '\nexport const prerender = true;'
  return `---\n${newFm}\n---${after}`
}

function addExportToMd(text) {
  // .md/.mdx use YAML frontmatter. We can't add JS exports there. Instead,
  // these need to be wrapped in a layout that opts into prerender, OR we
  // need a different mechanism. For Astro 6, .md files are static by
  // default UNLESS the layout opts out, so we don't need to do anything.
  return text
}

const files = await walk(pagesDir)

let added = 0
let skipped = {ssr: 0, alreadyHas: 0, md: 0, other: 0}

for (const file of files) {
  const rel = relative(pagesDir, file).replace(/\\/g, '/')

  if (needsSSR(rel)) {
    skipped.ssr++
    continue
  }

  const text = await readFile(file, 'utf8')

  if (alreadyHasExport(text)) {
    skipped.alreadyHas++
    continue
  }

  if (isMdPage(file)) {
    // Astro auto-detects .md/.mdx as static; no export needed
    skipped.md++
    continue
  }

  if (!isAstroPage(file)) {
    skipped.other++
    continue
  }

  const updated = addExportToAstro(text)
  if (updated === text) {
    skipped.other++
    continue
  }

  if (!DRY) await writeFile(file, updated, 'utf8')
  added++
  if (added <= 10) console.log(`  ${DRY ? '(dry)' : '✓'} ${rel}`)
}

console.log()
console.log(`Added prerender export to ${added} files${DRY ? ' (dry-run)' : ''}`)
console.log(`Skipped: ${skipped.ssr} SSR-required, ${skipped.alreadyHas} already had export, ${skipped.md} .md/.mdx (auto-static), ${skipped.other} non-page files`)
