/** Contextual analysis for audit-link-graph: consumes its built-page inventory.
 * No requests, crawler, content writes or automatic publication.
 */
import { readFile, readdir } from 'node:fs/promises';
import { parse, parseFragment } from 'parse5';
import { venueHref, routeSlug, isListableVenue } from '../src/lib/editorial.ts';

export const SITE = 'https://peninsulainsider.com.au';
export const attr = (node, name) => node.attrs?.find(x => x.name === name)?.value;
export function descendants(node) {
  return [node, ...(node.childNodes ?? []).flatMap(descendants)];
}
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
export function destination(href, from = '/') {
  try { const u = new URL(href, SITE + from); return u.origin === SITE ? u.pathname.replace(/\/?$/, '/') + u.hash : null; } catch { return null; }
}
export function pageFacts(html, url) {
  const dom = parse(html); const nodes = descendants(dom);
  const canonical = nodes.find(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical');
  const robots = nodes.find(n => n.tagName === 'meta' && attr(n, 'name') === 'robots');
  return { dom, url, canonical: canonical ? destination(attr(canonical, 'href'), url) : null,
    noindex: /noindex/i.test(attr(robots ?? {}, 'content') ?? ''),
    stub: nodes.some(n => n.tagName === 'title' && /^Redirecting/i.test(text(n))),
    ids: nodes.map(n => attr(n, 'id')).filter(Boolean) };
}
export function targetState(entity, pages) {
  if (entity.hold) return entity.hold;
  if (!entity.href) return 'absent';
  const [route, hash] = entity.href.split('#'); const page = pages.get(route);
  if (!page) return 'absent';
  if (page.stub || page.canonical !== route) return 'redirect-or-noncanonical';
  if (page.noindex) return 'retired-or-noindex';
  if (hash && !page.ids.includes(decodeURIComponent(hash))) return 'missing-fragment';
  return 'eligible';
}
export async function catalogue(contentRoot, policy, now = new Date()) {
  const result = [];
  for (const [folder, kind, prefix] of [['venues','venue',null],['places','place','/explore/places/'],['experiences','experience','/explore/'],['events','event','/whats-on/']]) {
    for (const filename of (await readdir(new URL(folder + '/', contentRoot))).filter(x => x.endsWith('.json')).sort()) {
      const data = JSON.parse(await readFile(new URL(folder + '/' + filename, contentRoot), 'utf8'));
      const id = data.slug || filename.replace(/\.json$/, '');
      const name = data.name || data.title;
      if (!name) continue;
      let hold = null;
      if (kind === 'venue' && (!isListableVenue(data) || data.status === 'closed' || ['closed','temporarily-closed'].includes(data.operatingStatus))) hold = 'closed-or-paused';
      if (['draft','review','archived','retired'].includes(data.status)) hold = 'retired-or-noindex';
      if (kind === 'event') {
        const end = new Date(data.endDate || data.expiresAt || data.startDate);
        if (!Number.isFinite(+end) || data.status !== 'published') hold = 'event-needs-review';
        else if (+end < +now) hold = 'expired';
        // Recurrence, cancellations and event type still require the built page and editor.
        if (data.cancelled || data.eventStatus === 'cancelled') hold = 'expired';
      }
      result.push({ id: `${kind}:${id}`, slug: id, name, kind, status: data.status ?? null, hold,
        href: kind === 'venue' ? venueHref({ id, data }) : prefix + routeSlug({ id, data }) + '/',
        aliases: [...new Set([name, ...(policy.aliases[id] ?? [])])] });
    }
  }
  for (const name of policy.ambiguous) result.push({id:'ambiguous:'+name, name, aliases:[name], href:null, hold:'ambiguous', kind:'unresolved'});
  return result;
}
const BLOCKS = new Set(['p','li','td','th','h2','h3','h4','h5','h6']);
function runs(block) {
  let value = ''; const spans = [];
  const visit = (node, anchor = null) => {
    if (['script','style','code','pre'].includes(node.tagName) || (node !== block && BLOCKS.has(node.tagName))) return;
    if (node.tagName === 'a') anchor = attr(node, 'href');
    if (node.nodeName === '#text') { const start = value.length; value += node.value; spans.push({ start, end:value.length, anchor }); }
    else for (const child of node.childNodes ?? []) visit(child, anchor);
  };
  visit(block); return { value, spans };
}
/** Apply only the renderer's supplied overrides in memory; never write CMS/source. */
export function contextualMentions(page, entities, pages) {
  const nodes = descendants(page.dom);
  const root = nodes.find(n => attr(n, 'data-pi-prose-root') !== undefined);
  if (!root || page.stub || page.noindex || page.canonical !== page.url) return { excluded:true, reason:'no eligible rendered journal body', mentions:[] };
  let overrideCount = 0;
  const overrideNode = nodes.find(n => attr(n, 'id') === 'pi-block-overrides');
  if (overrideNode) {
    const overrides = JSON.parse(text(overrideNode));
    for (const n of descendants(root)) {
      const id = attr(n,'data-pi-block-id');
      if (id && typeof overrides[id] === 'string') {
        n.childNodes = parseFragment(overrides[id]).childNodes; overrideCount++;
      }
    }
  }
  const blocks = descendants(root).filter(n => BLOCKS.has(n.tagName));
  const mentions = []; const seen = new Set();
  for (const [index, block] of blocks.entries()) {
    const { value, spans } = runs(block); const matches = [];
    for (const entity of entities) for (const alias of entity.aliases) {
      let at = value.indexOf(alias);
      while (at !== -1) {
        const end = at + alias.length;
        const boundary = entity.kind === 'place' ? /[\p{L}\p{N}-]/u : /[\p{L}\p{N}]/u;
        if (!boundary.test(value[at-1] ?? '') && !boundary.test(value[end] ?? '')) matches.push({entity,alias,at,end});
        at = value.indexOf(alias, at + 1);
      }
    }
    // Longest exact names win over contained place names; same-name entities remain ambiguous.
    matches.sort((a,b) => a.at-b.at || b.alias.length-a.alias.length);
    const occupied = [];
    for (const m of matches) {
      if (occupied.some(o => m.at < o.end && m.end > o.at)) continue;
      occupied.push(m);
      const peers = matches.filter(o => o.at === m.at && o.end === m.end);
      const unique = [...new Set(peers.map(o => o.entity.id))];
      const links = [...new Set(spans.filter(s => s.end > m.at && s.start < m.end).map(s => s.anchor))];
      const href = links.length === 1 ? links[0] : null;
      const state = targetState(m.entity,pages);
      const resolved = href ? destination(href,page.url) : null;
      const status = unique.length > 1 || state === 'ambiguous' ? 'ambiguous' : state !== 'eligible' ? state : href && resolved === m.entity.href ? 'linked' : href ? (resolved ? 'wrong' : 'external-reference') : links.length > 1 ? 'partial-link' : 'missing';
      mentions.push({entityId:m.entity.id, name:m.alias, target:m.entity.href, status, href, first:!seen.has(m.entity.id), block:index, blockId:attr(block,'data-pi-block-id') ?? null, context:value, candidates:unique});
      seen.add(m.entity.id);
    }
  }
  return {excluded:false, overrideCount, mentions};
}
export async function auditJournalLinks(pageInventory, contentRoot, policy) {
  const entities = await catalogue(contentRoot,policy);
  const pages = new Map();
  for (const [url,p] of pageInventory) {
    const facts = pageFacts(p.html,url);
    delete facts.dom;
    pages.set(url,facts);
  }
  const articles = [];
  for (const [url,page] of pages) if (url.startsWith('/journal/')) {
    page.dom = parse(pageInventory.get(url).html);
    articles.push({url,...contextualMentions(page,entities,pages)});
    delete page.dom;
  }
  const totals = {};
  for (const a of articles) for (const m of a.mentions.filter(m => m.first)) totals[m.status] = (totals[m.status] ?? 0) + 1;
  return {version:1, mode:'audit-only', policy:'Exact names; first contextual occurrence; related cards excluded. Every change requires editorial review. No claim re-verification.', catalogue:entities.map(e => ({...e,targetState:targetState(e,pages)})), totals, articles};
}
