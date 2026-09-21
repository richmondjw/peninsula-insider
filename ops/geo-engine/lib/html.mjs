// Dependency-free extraction of the SEO/GEO-relevant surface of a rendered page.
// This is deliberately a tolerant scanner, not a spec-compliant HTML parser: it
// reads the shapes the Astro build emits and reports what it could not read
// rather than guessing.

const VOID_SCRIPTISH = /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAG = /<[^>]+>/g;

export function decodeEntities(text) {
  return String(text)
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
      if (body[0] === '#') {
        const code = body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
      return Object.hasOwn(named, body) ? named[body] : whole;
    });
}

export function stripTags(html) {
  return decodeEntities(String(html).replace(VOID_SCRIPTISH, ' ').replace(TAG, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse the attributes of a single start tag into a lowercase-keyed object. */
export function parseAttrs(tagText) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  // Skip the tag name itself.
  const body = tagText.replace(/^<\s*\/?\s*[a-zA-Z0-9-]+/, '');
  let m;
  while ((m = re.exec(body)) !== null) {
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    attrs[m[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
}

function firstMatch(html, re) {
  const m = re.exec(html);
  return m ? m : null;
}

export function extractHead(html) {
  const m = firstMatch(html, /<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html.slice(0, 40000);
}

export function extractBody(html) {
  const m = firstMatch(html, /<body\b[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

/** <main> when present — the editorial surface, excluding chrome. */
export function extractMain(html) {
  const m = firstMatch(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : extractBody(html);
}

export function metaTags(head) {
  const out = [];
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) out.push(parseAttrs(m[0]));
  return out;
}

export function metaContent(head, name) {
  const lower = name.toLowerCase();
  for (const attrs of metaTags(head)) {
    if ((attrs.name || '').toLowerCase() === lower) return attrs.content ?? '';
    if ((attrs.property || '').toLowerCase() === lower) return attrs.content ?? '';
  }
  return null;
}

export function linkRel(head, rel) {
  const lower = rel.toLowerCase();
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttrs(m[0]);
    if ((attrs.rel || '').toLowerCase().split(/\s+/).includes(lower)) return attrs.href ?? '';
  }
  return null;
}

export function headings(html) {
  const out = [];
  for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripTags(m[2]);
    if (text) out.push({ level: Number(m[1]), text });
  }
  return out;
}

export function images(html) {
  const out = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = parseAttrs(m[0]);
    out.push({
      src: attrs.src || attrs['data-src'] || '',
      alt: Object.hasOwn(attrs, 'alt') ? attrs.alt : null,
      loading: attrs.loading ?? null,
      width: attrs.width ?? null,
      height: attrs.height ?? null,
    });
  }
  return out;
}

export function anchors(html) {
  const out = [];
  // Inline scripts build anchor markup by string concatenation; those are not
  // links on the page and must not be read as such.
  const markup = String(html).replace(VOID_SCRIPTISH, ' ');
  for (const m of markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = parseAttrs(`<a${m[1]}>`);
    if (!attrs.href) continue;
    out.push({ href: attrs.href, text: stripTags(m[2]), rel: attrs.rel ?? null });
  }
  return out;
}

/** All parseable JSON-LD blocks, plus the ones that failed to parse. */
export function jsonLd(html) {
  const blocks = [];
  const invalid = [];
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch (err) {
      invalid.push({ raw: raw.slice(0, 200), error: String(err.message) });
    }
  }
  return { blocks, invalid };
}

/** Flatten @graph containers so schema types can be counted uniformly. */
export function schemaTypes(blocks) {
  const types = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    const t = node['@type'];
    if (typeof t === 'string') types.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x));
    if (Array.isArray(node['@graph'])) node['@graph'].forEach(visit);
  };
  blocks.forEach(visit);
  return [...types].sort();
}

export function wordCount(text) {
  const t = String(text).trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Sentences, used for answer-passage and extractability signals. */
export function sentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/** A client-side redirect stub: meta refresh with a zero/short delay. */
export function metaRefresh(head) {
  for (const attrs of metaTags(head)) {
    if ((attrs['http-equiv'] || '').toLowerCase() !== 'refresh') continue;
    const m = /^\s*(\d+)\s*;\s*url\s*=\s*(.+)$/i.exec(attrs.content ?? '');
    if (m) return { delay: Number(m[1]), target: m[2].trim().replace(/^['"]|['"]$/g, '') };
  }
  return null;
}

export function parsePage(html) {
  const head = extractHead(html);
  const main = extractMain(html);
  const body = extractBody(html);
  const { blocks, invalid } = jsonLd(html);
  const mainText = stripTags(main);
  const htmlAttrs = parseAttrs(firstMatch(html, /<html\b[^>]*>/i)?.[0] ?? '<html>');
  return {
    metaRefresh: metaRefresh(head),
    lang: htmlAttrs.lang ?? null,
    title: (firstMatch(head, /<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim() ? decodeEntities(firstMatch(head, /<title[^>]*>([\s\S]*?)<\/title>/i)[1]).replace(/\s+/g, ' ').trim() : null,
    metaDescription: metaContent(head, 'description'),
    robots: metaContent(head, 'robots'),
    canonical: linkRel(head, 'canonical'),
    ogTitle: metaContent(head, 'og:title'),
    ogDescription: metaContent(head, 'og:description'),
    ogImage: metaContent(head, 'og:image'),
    ogType: metaContent(head, 'og:type'),
    twitterCard: metaContent(head, 'twitter:card'),
    headings: headings(main),
    bodyHeadings: headings(body),
    images: images(main),
    anchors: anchors(body),
    mainAnchors: anchors(main),
    jsonLd: blocks,
    jsonLdInvalid: invalid,
    schemaTypes: schemaTypes(blocks),
    text: mainText,
    wordCount: wordCount(mainText),
    sentences: sentences(mainText),
  };
}
