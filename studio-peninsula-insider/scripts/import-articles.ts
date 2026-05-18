/**
 * Peninsula Insider — articles + authors importer (Phase 3).
 *
 * Reads .md and .mdx articles from next/src/content/articles, parses
 * YAML frontmatter, converts the body to Portable Text:
 *
 *   - .md  → marked → HTML → htmlToBlocks (standard PT)
 *   - .mdx → extract custom JSX components into PT custom block types,
 *            convert the surrounding markdown the same way as .md, then
 *            splice the embeds back at the right positions.
 *
 *   Usage:
 *     npx tsx scripts/import-articles.ts                   # all
 *     npx tsx scripts/import-articles.ts <slug> …          # named only
 *     npx tsx scripts/import-articles.ts --md-only         # skip MDX
 *
 * Idempotent. Author imported first as `author-editorial` (sole entry).
 */
import {createClient} from '@sanity/client'
import {htmlToBlocks} from '@sanity/block-tools'
// @ts-expect-error — @sanity/schema doesn't ship full types
import {Schema} from '@sanity/schema'
import {JSDOM} from 'jsdom'
import {marked} from 'marked'
import {readFile, readdir} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const articlesDir = join(repoRoot, 'next', 'src', 'content', 'articles')
const authorsDir = join(repoRoot, 'next', 'src', 'content', 'authors')
const imagesRoot = join(repoRoot, 'next', 'public')

const SUPABASE_URL = 'https://tjjhpvslpysfklwpqmgz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_JlZuo95QvNZi2ZNrFyK-Cw_2y0U7HLp'

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_AUTH_TOKEN,
  useCdn: false,
})

// ── Frontmatter parser (lightweight YAML subset) ─────────────────────────
//
// Avoids adding a YAML dep for content where the schema is well-known.
// Handles: scalar key: value, arrays in [a, b] form, nested objects via
// indentation, ISO date scalars. For deeper nesting we fall back to JSON
// in the value.

function parseFrontmatter(text: string): {fm: Record<string, any>; body: string} {
  // Normalise CRLF → LF so the regex (and the indented-block detection
  // below) works on Windows checkouts.
  const norm = text.replace(/\r\n/g, '\n')
  const m = norm.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return {fm: {}, body: norm}
  const fmText = m[1]
  const body = (m[2] ?? '')
  const fm: Record<string, any> = {}

  const lines = fmText.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) {
      i++
      continue
    }
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0
    if (indent > 0) {
      i++
      continue
    }
    const colon = line.indexOf(':')
    if (colon === -1) {
      i++
      continue
    }
    const key = line.slice(0, colon).trim()
    let rest = line.slice(colon + 1).trim()

    if (rest === '') {
      // Block scalar — collect indented sub-lines as object or array
      const subLines: string[] = []
      i++
      while (i < lines.length && /^\s+/.test(lines[i])) {
        subLines.push(lines[i])
        i++
      }
      // Try to interpret as array of strings or array of objects.
      const dashedLines = subLines.filter((s) => s.trim().startsWith('- '))
      if (dashedLines.length > 0) {
        // Heuristic: if every dashed item is a bare scalar (no colon
        // after the dash), it's a string array. Otherwise it's an
        // array of objects with `key: value` pairs.
        const allScalar = dashedLines.every((s) => {
          const inner = s.trim().slice(2)
          // Inline key:value? Only if there's a colon NOT inside quotes
          // and not in `https://`. Cheap check: presence of `: ` separator.
          return !/^[a-zA-Z][\w-]*:\s/.test(inner)
        })
        if (allScalar) {
          fm[key] = dashedLines.map((s) => unquote(s.trim().slice(2).trim()))
        } else {
          const items: Array<Record<string, any>> = []
          let cur: Record<string, any> | null = null
          for (const sl of subLines) {
            const t = sl.trim()
            if (t.startsWith('- ')) {
              if (cur) items.push(cur)
              cur = {}
              const inner = t.slice(2)
              const ic = inner.indexOf(':')
              if (ic !== -1) cur[inner.slice(0, ic).trim()] = unquote(inner.slice(ic + 1).trim())
            } else if (cur) {
              const ic = t.indexOf(':')
              if (ic !== -1) cur[t.slice(0, ic).trim()] = unquote(t.slice(ic + 1).trim())
            }
          }
          if (cur) items.push(cur)
          fm[key] = items
        }
      } else {
        // Plain object
        const obj: Record<string, any> = {}
        for (const sl of subLines) {
          const t = sl.trim()
          const ic = t.indexOf(':')
          if (ic !== -1) obj[t.slice(0, ic).trim()] = unquote(t.slice(ic + 1).trim())
        }
        fm[key] = obj
      }
      continue
    }

    fm[key] = parseScalar(rest)
    i++
  }

  return {fm, body}
}

function parseScalar(v: string): any {
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => unquote(s.trim()))
      .filter((s) => s !== '')
  }
  return unquote(v)
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

// ── MDX embed extraction ────────────────────────────────────────────────

const EMBED_NAMES = [
  'AlertBlock', 'PracticalCallout', 'CellarDoorList',
  'DogPolicyTable', 'SubregionGrid', 'VarietyGuide',
] as const

type EmbedName = (typeof EMBED_NAMES)[number]

function ptTypeFor(name: EmbedName): string {
  switch (name) {
    case 'AlertBlock': return 'alertBlock'
    case 'PracticalCallout': return 'practicalCallout'
    case 'CellarDoorList': return 'cellarDoorList'
    case 'DogPolicyTable': return 'dogPolicyTable'
    case 'SubregionGrid': return 'subregionGrid'
    case 'VarietyGuide': return 'varietyGuide'
  }
}

/**
 * Find balanced JSX components in MDX body. Returns each component's start,
 * end indices, name, and raw attribute string + inner content. We don't
 * try to be a full JSX parser — we look for `<Name …>…</Name>` and
 * `<Name … />`. The 6 known components in PI articles are well-behaved.
 */
function extractEmbeds(body: string): Array<{
  start: number
  end: number
  name: EmbedName
  attrs: string
  inner: string
  selfClose: boolean
}> {
  const out: Array<{
    start: number; end: number; name: EmbedName;
    attrs: string; inner: string; selfClose: boolean
  }> = []
  const namePattern = EMBED_NAMES.join('|')
  // Self-closing: <Name attrs />
  const selfRe = new RegExp(`<(${namePattern})([^>]*?)/>`, 'g')
  let m: RegExpExecArray | null
  while ((m = selfRe.exec(body))) {
    out.push({
      start: m.index, end: m.index + m[0].length,
      name: m[1] as EmbedName, attrs: m[2], inner: '', selfClose: true,
    })
  }
  // Open/close pair: <Name attrs>inner</Name>. Greedy in attrs but cap
  // inner at the next </Name>.
  const pairRe = new RegExp(`<(${namePattern})([^>]*)>([\\s\\S]*?)</\\1>`, 'g')
  while ((m = pairRe.exec(body))) {
    // Skip if this overlaps a self-close already collected.
    if (out.some((o) => o.start === m!.index)) continue
    out.push({
      start: m.index, end: m.index + m[0].length,
      name: m[1] as EmbedName, attrs: m[2], inner: m[3], selfClose: false,
    })
  }
  return out.sort((a, b) => a.start - b.start)
}

function attrToValue(raw: string): any {
  const t = raw.trim()
  if (t.startsWith('{') && t.endsWith('}')) {
    // JSX expression — try to coerce simple values
    const inner = t.slice(1, -1).trim()
    if (inner === 'true') return true
    if (inner === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(inner)) return Number(inner)
    if ((inner.startsWith('"') && inner.endsWith('"')) || (inner.startsWith("'") && inner.endsWith("'"))) {
      return inner.slice(1, -1)
    }
    // JSON-y array/object — try parse, fall back to raw
    try {
      // Replace single quotes with double for JSON-compat
      return JSON.parse(inner.replace(/'/g, '"'))
    } catch {
      return inner
    }
  }
  return unquote(t)
}

function parseAttrs(attrs: string): Record<string, any> {
  const out: Record<string, any> = {}
  // attr="value" or attr={…} or attr='value'
  const re = /([a-zA-Z][\w-]*)\s*=\s*(\{[\s\S]*?\}|"[^"]*"|'[^']*'|[^\s>]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrs))) {
    out[m[1]] = attrToValue(m[2])
  }
  return out
}

function embedToPtBlock(e: ReturnType<typeof extractEmbeds>[number], i: number) {
  const attrs = parseAttrs(e.attrs)
  const _type = ptTypeFor(e.name)
  const _key = `e${i}`

  if (e.name === 'AlertBlock') {
    return {
      _type, _key,
      level: attrs.type ?? 'info',
      heading: attrs.heading ?? '',
      body: e.inner.trim() || (attrs.body ?? ''),
    }
  }
  if (e.name === 'PracticalCallout') {
    return {
      _type, _key,
      variant: attrs.variant,
      eyebrow: attrs.eyebrow,
      heading: attrs.heading ?? '',
      body: e.inner.trim() || (attrs.body ?? ''),
    }
  }
  // Items-array embeds: stash the raw items prop as JSON for later refinement.
  const itemsRaw = attrs.items ?? attrs.rows ?? null
  return {
    _type, _key,
    [_type === 'dogPolicyTable' ? 'rowsJson' : 'itemsJson']: itemsRaw
      ? JSON.stringify(itemsRaw, null, 2)
      : e.attrs.trim(),
  }
}

// ── Body → Portable Text ────────────────────────────────────────────────

// Compiled Sanity schema used by @sanity/block-tools to know what marks /
// styles / list types are allowed when converting HTML → PT.
const compiledSchema = Schema.compile({
  name: 'pt-converter',
  types: [
    {
      type: 'object',
      name: 'tmpDoc',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'},
                {title: 'H2', value: 'h2'},
                {title: 'H3', value: 'h3'},
                {title: 'Quote', value: 'blockquote'},
              ],
              lists: [
                {title: 'Bullet', value: 'bullet'},
                {title: 'Number', value: 'number'},
              ],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'},
                ],
                annotations: [
                  {
                    name: 'link',
                    type: 'object',
                    fields: [{name: 'href', type: 'string'}],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
})
const blockContentType = compiledSchema.get('tmpDoc').fields.find((f: any) => f.name === 'body').type

function markdownChunkToBlocks(md: string, keyPrefix: string): any[] {
  const html = marked.parse(md, {async: false}) as string
  const blocks = htmlToBlocks(html, blockContentType, {
    parseHtml: (h: string) => new JSDOM(h).window.document,
  } as any) as any[]
  // Sanity needs unique _key on every node. htmlToBlocks emits them, but
  // assign defensively in case of regression.
  return blocks.map((b, i) => ({...b, _key: b._key ?? `${keyPrefix}_${i}`}))
}

function bodyToPortableText(body: string, slug: string): any[] {
  const embeds = extractEmbeds(body)
  if (embeds.length === 0) {
    return markdownChunkToBlocks(body, `b_${slug}`)
  }

  const out: any[] = []
  let cursor = 0
  let embedIndex = 0
  for (const e of embeds) {
    const before = body.slice(cursor, e.start).trim()
    if (before) out.push(...markdownChunkToBlocks(before, `b_${slug}_${embedIndex}`))
    out.push(embedToPtBlock(e, embedIndex))
    cursor = e.end
    embedIndex++
  }
  const tail = body.slice(cursor).trim()
  if (tail) out.push(...markdownChunkToBlocks(tail, `b_${slug}_t`))
  return out
}

// ── Image upload ────────────────────────────────────────────────────────

async function uploadImage(src: string): Promise<string | null> {
  try {
    let buf: Buffer
    let filename: string
    if (src.startsWith('http')) {
      const r = await fetch(src)
      if (!r.ok) throw new Error(`fetch ${r.status}`)
      buf = Buffer.from(await r.arrayBuffer())
      filename = basename(new URL(src).pathname)
    } else {
      buf = await readFile(join(imagesRoot, src.replace(/^\/+/, '')))
      filename = basename(src)
    }
    const a = await client.assets.upload('image', buf, {filename})
    return a._id
  } catch (err) {
    console.error(`  ! upload failed ${src}: ${(err as Error).message}`)
    return null
  }
}

interface Override {
  entity_slug: string
  field_path: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
  credit: string | null
}

async function fetchOverrides(): Promise<Map<string, Override>> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/cms_image_slots?select=entity_slug,field_path,public_url,alt_text,caption,credit&entity_type=eq.article&status=eq.published&limit=500`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'pi',
      },
    },
  )
  if (!r.ok) return new Map()
  const rows = (await r.json()) as Override[]
  const m = new Map<string, Override>()
  for (const row of rows) if (row.field_path === 'hero') m.set(row.entity_slug, row)
  return m
}

// ── Author ──────────────────────────────────────────────────────────────

async function importAuthor(slug: string) {
  const raw = JSON.parse(await readFile(join(authorsDir, `${slug}.json`), 'utf8'))
  const doc: Record<string, any> = {
    _id: `author-${slug}`,
    _type: 'author',
    name: raw.name ?? raw.displayName ?? slug,
    slug: {_type: 'slug', current: slug},
    bio: raw.bio,
    byline: raw.byline,
  }
  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]
  await client.createOrReplace(doc)
  console.log(`  ✓ author/${slug}`)
}

// ── Article ─────────────────────────────────────────────────────────────

async function importArticle(file: string, overrides: Map<string, Override>) {
  const slug = file.replace(/\.(md|mdx)$/, '')
  const path = join(articlesDir, file)
  const text = await readFile(path, 'utf8')
  const {fm, body} = parseFrontmatter(text)

  const override = overrides.get(slug)
  let heroAssetId: string | null = null
  let heroKind: 'cms' | 'astro' | 'failed' = 'failed'

  if (override?.public_url) {
    heroAssetId = await uploadImage(override.public_url)
    if (heroAssetId) heroKind = 'cms'
    else if (fm.heroImage?.src) {
      heroAssetId = await uploadImage(fm.heroImage.src)
      if (heroAssetId) heroKind = 'astro'
    }
  } else if (fm.heroImage?.src) {
    heroAssetId = await uploadImage(fm.heroImage.src)
    if (heroAssetId) heroKind = 'astro'
  }

  // Strip MDX `import` lines from body before converting — they're not
  // content, they wire components that we've already mapped.
  const cleanedBody = body.replace(/^\s*import\s+.*$/gm, '').trim()

  const ptBlocks = bodyToPortableText(cleanedBody, slug)
  const embedCount = ptBlocks.filter((b) => b._type !== 'block').length

  const authorSlug = fm.author ?? 'editorial'
  const refsArray = (list: string[] | undefined, type: string, idPrefix: string) =>
    (list ?? []).map((s, i) => ({
      _type: 'reference',
      _key: `${type[0]}${i}`,
      _ref: `${idPrefix}-${s}`,
      _weak: true,
    }))

  const doc: Record<string, any> = {
    _id: `article-${slug}`,
    _type: 'article',
    title: fm.title,
    slug: {_type: 'slug', current: slug},
    dek: fm.dek,
    author: {_type: 'reference', _ref: `author-${authorSlug}`, _weak: true},
    houseByline: !!fm.houseByline,
    format: fm.format,
    tags: fm.tags ?? [],
    featured: !!fm.featured,
    readingTimeMinutes: fm.readingTimeMinutes,
    status: fm.status ?? 'published',
    publishedAt: fm.publishedAt ? new Date(fm.publishedAt).toISOString() : new Date().toISOString(),
    updatedAt: fm.updatedAt ? new Date(fm.updatedAt).toISOString() : undefined,
    lastVerified: fm.lastVerified,
    sitemapExclude: !!fm.sitemapExclude,
    body: ptBlocks,
    aiSummary: fm.aiSummary,
    faq: (fm.faq ?? []).map((f: any, i: number) => ({
      _key: `f${i}`, question: f.question, answer: f.answer,
    })),
    clusterLinks: (fm.clusterLinks ?? []).map((c: any, i: number) => ({
      _key: `c${i}`, label: c.label, href: c.href,
    })),
    relatedVenues: refsArray(fm.relatedVenues, 'venue', 'venue'),
    relatedExperiences: refsArray(fm.relatedExperiences, 'experience', 'experience'),
    relatedPlaces: refsArray(fm.relatedPlaces, 'place', 'place'),
    relatedItineraries: refsArray(fm.relatedItineraries, 'itinerary', 'itinerary'),
    relatedArticles: refsArray(fm.relatedArticles, 'article', 'article'),
  }

  if (heroAssetId) {
    doc.heroImage = {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: heroAssetId},
      alt: override?.alt_text ?? fm.heroImage?.alt ?? fm.title,
      credit: override?.credit ?? fm.heroImage?.credit ?? 'venue-media-kit',
      license: fm.heroImage?.license ?? 'venue-media-kit',
      caption: override?.caption ?? fm.heroImage?.caption,
    }
  }

  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]

  await client.createOrReplace(doc)
  const kind = file.endsWith('.mdx') ? 'mdx' : 'md'
  console.log(`  ✓ ${kind}/${slug}${embedCount ? ` (embeds: ${embedCount})` : ''} (hero: ${heroKind})`)
}

// ── Runner ──────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set.')
    process.exit(1)
  }

  // Authors first (1 doc).
  const authorFiles = await readdir(authorsDir)
  for (const f of authorFiles) {
    if (!f.endsWith('.json')) continue
    try { await importAuthor(f.replace(/\.json$/, '')) } catch (err) { console.error('  ✗ author:', (err as Error).message) }
  }

  const args = process.argv.slice(2)
  const mdOnly = args.includes('--md-only')
  const slugArgs = args.filter((a) => !a.startsWith('--'))

  const all = (await readdir(articlesDir)).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  let queue = all
  if (mdOnly) queue = queue.filter((f) => f.endsWith('.md'))
  if (slugArgs.length > 0)
    queue = queue.filter((f) => slugArgs.includes(f.replace(/\.(md|mdx)$/, '')))

  console.log(`\n=== articles (${queue.length}) ===`)
  const overrides = await fetchOverrides()

  let ok = 0
  let failed = 0
  for (const file of queue) {
    try {
      await importArticle(file, overrides)
      ok++
    } catch (err) {
      console.error(`  ✗ ${file}:`, (err as Error).message)
      failed++
    }
  }

  console.log(`\nDone: ${ok} imported, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

void main()
