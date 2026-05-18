/**
 * Phase −1.0 — Route audit for the Vercel hybrid cutover.
 *
 * Walks next/src/pages/, classifies each route by whether it currently
 * uses build-time content patterns, has dynamic params, etc., and
 * recommends a prerender mode (static vs SSR) for the hybrid migration.
 *
 *   Usage: node ops/vercel-hybrid-cutover/audit-routes.mjs
 */
import {readFile, readdir, stat} from 'node:fs/promises'
import {join, relative, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pagesDir = join(__dirname, '..', '..', 'next', 'src', 'pages')

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path, out)
    else if (/\.(astro|md|mdx|ts|js)$/.test(entry.name)) out.push(path)
  }
  return out
}

const files = await walk(pagesDir)

const summary = {
  total: 0,
  byKind: {},
  byMode: {staticPrerender: 0, ssr: 0, alreadyHasPrerender: 0},
  dynamic: 0,
  apiRoutes: 0,
  vStagingFreeze: 0,
  patterns: {
    hasGetStaticPaths: 0,
    hasGetCollection: 0,
    hasLoadOverrides: 0,
    hasFetchSanity: 0,
    hasFsRead: 0,
    hasPrerenderTrue: 0,
    hasPrerenderFalse: 0,
    hasExportConstPrerender: 0,
  },
}

const recommendations = []

for (const file of files) {
  const rel = relative(pagesDir, file).replace(/\\/g, '/')
  const ext = rel.match(/\.[a-z]+$/i)?.[0] ?? ''
  const text = await readFile(file, 'utf8')

  summary.total++
  summary.byKind[ext] = (summary.byKind[ext] ?? 0) + 1

  const isDynamic = /\[[^\]]+\]/.test(rel)
  const isApi = rel.startsWith('api/')
  const isVStaging = rel.startsWith('v2-staging/') || rel.startsWith('v3/') || rel.startsWith('v4/')

  if (isDynamic) summary.dynamic++
  if (isApi) summary.apiRoutes++
  if (isVStaging) summary.vStagingFreeze++

  const has = {
    getStaticPaths: /export\s+(?:async\s+)?function\s+getStaticPaths/.test(text),
    getCollection: /getCollection\s*\(/.test(text),
    loadOverrides: /loadOverrides\s*\(/.test(text),
    fetchSanity: /sanityClient|fetchVenueFromSanity|fetchPlaceFromSanity|fetchArticleFromSanity/.test(text),
    fsRead: /\b(readFileSync|readdir|writeFile)\b/.test(text),
    prerenderTrue: /export\s+const\s+prerender\s*=\s*true/.test(text),
    prerenderFalse: /export\s+const\s+prerender\s*=\s*false/.test(text),
  }
  for (const [k, v] of Object.entries(has)) if (v) summary.patterns[`has${k[0].toUpperCase()}${k.slice(1)}`]++

  let recommended = 'staticPrerender'
  let reason = 'no dynamic data, no editor surface'
  if (isApi) {
    recommended = 'ssr'
    reason = 'api route'
  } else if (has.fetchSanity) {
    recommended = 'ssr'
    reason = 'fetches from Sanity at request time'
  } else if (has.loadOverrides) {
    recommended = 'ssr-or-isr'
    reason = 'consumes Supabase overrides at build time today; ISR would let it pick up edits faster'
  } else if (isDynamic && has.getCollection && has.getStaticPaths) {
    recommended = 'staticPrerender'
    reason = 'classic Astro content-collection page; getStaticPaths emits all paths'
  } else if (rel === 'index.astro') {
    recommended = 'ssr-or-isr'
    reason = 'homepage cover changes frequently'
  }

  if (recommended === 'ssr') summary.byMode.ssr++
  else summary.byMode.staticPrerender++
  if (has.prerenderTrue || has.prerenderFalse) summary.byMode.alreadyHasPrerender++

  recommendations.push({rel, isDynamic, isApi, isVStaging, recommended, reason, has})
}

console.log('=== Peninsula Insider — Vercel hybrid route audit ===\n')
console.log(`Total page files: ${summary.total}`)
console.log(`  Dynamic routes:        ${summary.dynamic}`)
console.log(`  API routes:            ${summary.apiRoutes}`)
console.log(`  v2/v3/v4 staging:      ${summary.vStagingFreeze}`)
console.log()
console.log('Pattern usage across all pages:')
for (const [k, v] of Object.entries(summary.patterns)) console.log(`  ${k.padEnd(28)} ${v}`)
console.log()
console.log('Recommended mode distribution:')
console.log(`  staticPrerender (or ISR cached very long): ${summary.byMode.staticPrerender}`)
console.log(`  ssr (or ISR with revalidation):            ${summary.byMode.ssr}`)
console.log()
console.log('Detailed recommendations (only non-default = SSR shown):')
const ssrRoutes = recommendations.filter((r) => r.recommended !== 'staticPrerender')
for (const r of ssrRoutes) {
  console.log(`  ${r.recommended.padEnd(14)} ${r.rel}`)
  console.log(`    → ${r.reason}`)
}
console.log()
console.log('All static-prerender candidates (sample):')
const staticRoutes = recommendations.filter((r) => r.recommended === 'staticPrerender')
for (const r of staticRoutes.slice(0, 20)) console.log(`  ${r.rel}`)
if (staticRoutes.length > 20) console.log(`  … ${staticRoutes.length - 20} more`)
