/**
 * Builds /ask/index.json, the only thing Ask PI answers from.
 *
 * It runs after the build and after generate-agent-formats.mjs, and reads the
 * published text of each page (dist/<path>/index.md, itself extracted from the
 * page's <main>) rather than the content records. That is the point: every
 * string Ask PI can show a reader is a string that is on the page it links to,
 * by construction. A field that is not on the page cannot reach an answer.
 *
 * Ask PI was paused on 20 November 2026 because generated answers added
 * decision-critical details the linked pages did not support. Nothing here is
 * generated. Selection (which pages match a question) uses words from the same
 * page text, and dates come from /whats-on/upcoming.json, the feed the What's
 * On pages are built from.
 *
 * Deliberately left out: prices, opening hours, live status, booking links and
 * anything else a reader should check at the source. Those stay on the page.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tokens } from '../src/lib/ask-guide.mjs';

export const SITE = 'https://peninsulainsider.com.au';
export const ASK_INDEX_VERSION = '1.0';

/** Which published paths become answerable records, and as what. */
export function kindFor(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const [section, second] = parts;
  if (parts.length === 2) {
    if (section === 'eat' || section === 'wine' || section === 'stay') return section;
    if (section === 'explore') return 'do';
    if (section === 'whats-on') return 'event';
    if (section === 'tour' || section === 'tour-packages') return 'tour';
    if (section === 'journal') return 'story';
  }
  if (parts.length === 3) {
    if (section === 'explore' && second === 'places') return 'place';
    if (section === 'explore' && second === 'plans') return 'plan';
    if (section === 'fishing' && (second === 'locations' || second === 'charters')) return 'fishing';
    if (section === 'boating' && (second === 'ramps' || second === 'hire')) return 'boating';
  }
  return null;
}

const squash = (value) => value.replace(/\s+/g, ' ').trim();
/** Markdown from generate-agent-formats back to the words a reader sees. */
export function plain(markdown) {
  return squash(markdown
    .replace(/\[([^\]]*)\]\(<[^>]*>\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\\([\\`*_{}\[\]<>])/g, '$1'));
}

const NOT_PROSE = /^(?:[-#[*]|\d+\s*(?:of|\/)\s*\d+|Known for\b|Filed under\b|Photo\b)|Photo\s*[·:]|Courtesy of/i;

/** First whole sentences of a paragraph, never cut mid-sentence. */
export function leadSentences(paragraph, limit = 230) {
  const text = squash(paragraph);
  if (text.length <= limit) return text;
  // Split only where a sentence really ends, so "2.4 km" stays whole.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"'(])/);
  let out = '';
  for (const sentence of sentences) {
    const next = out ? out + ' ' + sentence : sentence;
    if (next.length > limit) break;
    out = next;
  }
  // One long opening sentence is still the page's own words: keep it whole.
  return out || (sentences[0].length <= 340 ? sentences[0] : null);
}

const SHOWN_LABELS = ['Type', 'Place', 'Where', 'When', 'Time', 'Recurrence', 'Best for', 'Best in', 'Best season', 'Difficulty'];
// Only a single-line label value is taken: longer values are prose with caveats.
const MAX_FACT = 120;

export function parsePage(markdown) {
  const body = markdown.split('\n').slice(6).join('\n');
  const h1 = body.match(/^# (.+)$/m);
  if (!h1) return null;
  const before = body.slice(0, h1.index);
  const after = body.slice(h1.index + h1[0].length);
  const blocks = after.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  // The page's own town: its breadcrumb, or its Place / Where row. Never a
  // link further down, which is usually a neighbouring venue's town.
  const PLACE_LINK = /\[([^\]]+)\]\(<https:\/\/peninsulainsider\.com\.au\/explore\/places\/([a-z0-9-]+)\/>\)/;
  const placeRow = blocks.findIndex((block) => /^\*\*(?:Place|Where)\*\*$/.test(block));
  const placeLink = before.match(PLACE_LINK) || (placeRow >= 0 ? (blocks[placeRow + 1] || '').match(PLACE_LINK) : null);
  const crumbLine = before.split('\n').map((line) => line.trim()).filter(Boolean).pop() || '';
  const crumbs = crumbLine.split(/\s{3,}/).map(plain).filter(Boolean);

  // The page's own opening words: the first real paragraph before any
  // sub-heading, so text about neighbouring venues further down is never used.
  let summary = null;
  for (const block of blocks) {
    if (/^#{2,}\s/.test(block)) break;
    if (/^\*\*[^*]+\*\*$/.test(block)) break;
    if (NOT_PROSE.test(block)) continue;
    const text = plain(block);
    if (text.length < 50 || text.split(' ').length < 8 || !/[.!?]$/.test(text)) continue;
    summary = leadSentences(text);
    if (summary) break;
  }

  const facts = {};
  for (let i = 0; i < blocks.length - 1; i += 1) {
    const label = blocks[i].match(/^\*\*([^*\n]{2,30})\*\*$/)?.[1];
    if (!label || !SHOWN_LABELS.includes(label) || facts[label]) continue;
    const value = plain(blocks[i + 1]);
    if (value && value.length <= MAX_FACT && !/^\*\*/.test(blocks[i + 1])) facts[label] = value;
  }

  const known = blocks.find((block) => /^Known for\b/.test(block));
  const filed = blocks.findIndex((block) => /^Filed under\b/.test(block));
  let filedText = '';
  if (filed >= 0) {
    filedText = blocks[filed].replace(/^Filed under/, '');
    for (let i = filed + 1; i < blocks.length && /^- /.test(blocks[i]); i += 1) filedText += ' ' + blocks[i].slice(2);
  }

  return {
    title: plain(h1[1]),
    crumbs,
    place: placeLink ? { slug: placeLink[2], name: plain(placeLink[1]) } : null,
    summary,
    facts,
    known: known ? plain(known.replace(/^Known for/, '')) : '',
    filed: plain(filedText),
  };
}

const ENTITIES = { '&amp;': '&', '&#39;': '’', '&#x27;': '’', '&quot;': '"', '&nbsp;': ' ' };
/**
 * The page's own picture: the image it names as its share image, and only when
 * that same file is shown to the reader inside <main>. A page with no picture
 * of its own (a venue we hold no verified photograph of, a guide that borrows
 * a generic one for sharing) gets none, so a tile never shows a photograph
 * the page itself does not. The credit is the "Photo · ..." line the page
 * prints with that picture, when it prints one.
 */
export function pageImage(html) {
  const src = html.match(/<meta property="og:image" content="https:\/\/peninsulainsider\.com\.au(\/images\/[^"?]+)/)?.[1];
  const from = html.indexOf('<main');
  if (!src || from < 0) return null;
  const main = html.slice(from);
  const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const at = main.search(new RegExp(`(?:src="|url\\(['"]?|data-pi-image-original-src=")${escaped}`));
  if (at < 0) return null;
  // The credit belongs to this picture: look no further than the next one.
  const after = main.slice(at, at + 3000);
  const next = after.slice(8).search(/<img\b/);
  const near = next > 0 ? after.slice(0, next + 8) : after;
  const credit = near.match(/Photo\s*·\s*([^<]{3,140})</)?.[1].replace(/&[#\w]+;/g, (entity) => ENTITIES[entity] ?? ' ');
  return { src, credit: credit ? squash(credit) : null };
}

/**
 * Small copies of those pictures for the chat's tiles, written to
 * dist/ask/img/. A page's own image is often several hundred kilobytes; five
 * of them in a phone chat is not acceptable. A file that cannot be read or
 * resized simply leaves its record without a picture.
 */
export async function writeThumbnails(index, dist) {
  const { default: sharp } = await import('sharp');
  mkdirSync(join(dist, 'ask/img'), { recursive: true });
  const made = new Map();
  let bytes = 0;
  for (const record of index.records) {
    if (!record.im) continue;
    const source = record.im.s;
    if (!made.has(source)) {
      let out = null;
      try {
        const input = readFileSync(join(dist, decodeURIComponent(source)));
        const data = await sharp(input, { limitInputPixels: 50000000 }).rotate().resize({ width: 640, height: 480, fit: 'cover', position: 'attention', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
        out = `/ask/img/${createHash('sha256').update(data).digest('hex').slice(0, 16)}.webp`;
        writeFileSync(join(dist, out), data);
        bytes += data.length;
      } catch { out = null; }
      made.set(source, out);
    }
    if (made.get(source)) record.im.s = made.get(source);
    else delete record.im;
  }
  return { images: [...made.values()].filter(Boolean).length, bytes };
}

const STATUS = {
  'https://schema.org/EventScheduled': 'scheduled',
  'https://schema.org/EventCancelled': 'cancelled',
  'https://schema.org/EventPostponed': 'postponed',
  'https://schema.org/EventRescheduled': 'rescheduled',
  'https://schema.org/EventMovedOnline': 'moved-online',
};
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Every string a card can show must be on the page. Returns the ones that are not. */
export function unsupported(record, pageText) {
  const shown = [record.t, record.s, record.ty, record.pn, ...(record.f || []).map(([, value]) => value)].filter(Boolean);
  return shown.filter((value) => !pageText.includes(squash(value)));
}

export function buildIndex(dist) {
  const catalogue = JSON.parse(readFileSync(join(dist, 'agents/catalog.json'), 'utf8'));
  const feed = JSON.parse(readFileSync(join(dist, 'whats-on/upcoming.json'), 'utf8'));
  const upcoming = new Map(feed.events.map((event) => [new URL(event.url).pathname, event]));
  const records = [];
  const skipped = [];
  // Town names as their own guide pages title them.
  const placeNames = new Map();
  for (const entry of catalogue.records) {
    const slug = new URL(entry.canonicalUrl).pathname.match(/^\/explore\/places\/([a-z0-9-]+)\/$/)?.[1];
    if (slug) placeNames.set(slug, entry.title);
  }

  for (const entry of catalogue.records) {
    const pathname = new URL(entry.canonicalUrl).pathname;
    const kind = kindFor(pathname);
    if (!kind) continue;
    // A What's On page that is not in the forward feed is past or withdrawn.
    const event = kind === 'event' ? upcoming.get(pathname) : null;
    if (kind === 'event' && !event) continue;

    const markdown = readFileSync(join(dist, pathname, 'index.md'), 'utf8');
    const page = parsePage(markdown);
    if (!page) { skipped.push(pathname); continue; }
    // Fact-sheet pages (ramps, piers, golf courses) open with a table, not a
    // paragraph. They are still answerable by name; the card shows no summary.
    if (!page.summary) {
      if (kind === 'story' || kind === 'event') { skipped.push(pathname); continue; }
      skipped.push(pathname + ' (listed without a summary)');
    }
    const pageText = plain(markdown);

    const type = page.facts.Type || (kind === 'event' ? page.crumbs.find((crumb) => crumb !== page.place?.name && crumb.length <= 30) : null) || null;
    const shownFacts = ['When', 'Time', 'Recurrence', 'Best for', 'Best in', 'Best season', 'Difficulty']
      .filter((label) => page.facts[label])
      .map((label) => [label, page.facts[label]]);

    // A page in a venue section with no Type row is a guide to several
    // places ("Where to stay in Flinders"), not a place itself.
    const guide = ['eat', 'wine', 'stay', 'do'].includes(kind) && !page.facts.Type;
    if (guide && !page.place) {
      const slug = pathname.split('/').filter(Boolean).pop();
      const town = placeNames.get(slug);
      if (town && page.title.includes(town)) page.place = { slug, name: town };
    }
    const record = {
      u: pathname,
      k: kind,
      ...(guide ? { g: 1 } : {}),
      t: page.title,
      ...(page.summary ? { s: page.summary } : {}),
      ...(type ? { ty: type } : {}),
      ...(page.place ? { p: page.place.slug, pn: page.place.name } : {}),
      ...(shownFacts.length ? { f: shownFacts } : {}),
      h: entry.contentSha256.slice(0, 12),
    };
    const htmlFile = join(dist, pathname, 'index.html');
    const image = existsSync(htmlFile) ? pageImage(readFileSync(htmlFile, 'utf8')) : null;
    if (image) record.im = { s: image.src, ...(image.credit ? { c: image.credit } : {}) };

    if (event) {
      const occurrence = event.dateMeaning === 'occurrence';
      if (!ISO_DAY.test(event.startDate) || !ISO_DAY.test(event.endDate)) { skipped.push(pathname); continue; }
      record.d = {
        // Dated only when the page gives a real occurrence. "Availability"
        // windows (book a session with the organiser) never match a day.
        dated: occurrence,
        s: event.startDate,
        e: event.endDate,
        w: (event.weekendOccurrences || []).map((item) => item.date).filter((day) => ISO_DAY.test(day)),
        ...(event.eventStatus && STATUS[event.eventStatus] ? { st: STATUS[event.eventStatus] } : {}),
      };
      // Most event pages have no town link, but give the venue's address under
      // "Hosted at" ("40 Collins Road, Dromana VIC"). That town is the page's.
      if (!record.p) {
        const hosted = markdown.match(/\nHosted at\n([\s\S]*?)\nAt a glance\n/)?.[1] || '';
        const town = hosted.split('\n').map((line) => plain(line).match(/^(?:.*,\s*)?([A-Z][A-Za-z' ]+?)\s+VIC\b/)?.[1]).find(Boolean);
        const slug = town && [...placeNames.entries()].find(([, name]) => name === town)?.[0];
        if (slug) { record.p = slug; record.pn = town; }
      }
    }

    // A status other than "scheduled" is decision-critical: only carry it when
    // the page itself says so.
    if (record.d?.st && record.d.st !== 'scheduled' && !/cancel|postpon|reschedul|online/i.test(pageText)) {
      throw new Error(`${pathname}: feed status "${record.d.st}" is not stated on the published page`);
    }
    const missing = unsupported(record, pageText);
    if (missing.length) throw new Error(`${pathname}: text not on the published page: ${missing.join(' | ')}`);

    // Words used to match a question. All from this page's own opening fields.
    record.kw = [...new Set(tokens([page.title, page.summary, type, page.place?.name, page.known, page.filed,
      page.facts['Best for'], page.facts['Best in'], page.facts.Difficulty, page.crumbs.join(' ')].filter(Boolean).join(' ')))].join(' ');
    records.push(record);
  }

  const used = new Set(records.map((record) => record.p).filter(Boolean));
  const places = [...placeNames.entries()].filter(([slug]) => used.has(slug))
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Topics Ask PI hands to a guide page rather than filtering on.
  const topics = {};
  const dogs = catalogue.records.find((entry) => new URL(entry.canonicalUrl).pathname === '/dog-friendly/');
  if (dogs) topics.dogs = { u: '/dog-friendly/', t: dogs.title };

  const snapshotId = createHash('sha256').update(JSON.stringify(records.map((record) => [record.u, record.h]))).digest('hex');
  return {
    index: {
      schemaVersion: ASK_INDEX_VERSION,
      generatedAt: feed.generatedAt,
      catalogueSnapshot: catalogue.snapshotId,
      snapshotId,
      timezone: 'Australia/Melbourne',
      semantics: 'Every title, summary and fact is copied from the published page at its url. A picture (im) is a small copy of the one that page shows, with the credit that page prints. Nothing is generated. generatedAt is build time, not a fact check.',
      count: records.length,
      places,
      topics,
      records,
    },
    skipped,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dist = resolve(process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
  if (!existsSync(join(dist, 'agents/catalog.json'))) throw new Error('Run after generate-agent-formats.mjs: agents/catalog.json is missing');
  const { index, skipped } = buildIndex(dist);
  const byKind = index.records.reduce((all, record) => ({ ...all, [record.k]: (all[record.k] || 0) + 1 }), {});
  for (const kind of ['eat', 'wine', 'stay', 'do', 'event']) {
    if (!byKind[kind]) throw new Error(`Ask index has no "${kind}" records; refusing to publish a partial index`);
  }
  mkdirSync(join(dist, 'ask'), { recursive: true });
  const thumbs = await writeThumbnails(index, dist);
  console.log(`Ask index pictures: ${index.records.filter((record) => record.im).length} records share ${thumbs.images} thumbnails, ${thumbs.bytes} bytes.`);
  const body = JSON.stringify(index);
  writeFileSync(join(dist, 'ask/index.json'), body + '\n');
  console.log(`Ask index: ${index.count} records ${JSON.stringify(byKind)}, ${Buffer.byteLength(body)} bytes, ${skipped.length} pages without a usable opening paragraph.`);
  if (process.argv.includes('--report')) console.log(skipped.join('\n'));
}
