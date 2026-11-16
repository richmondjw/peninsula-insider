/** Official HTML extraction. Every value remains a quarantined candidate. */
import { parse } from '../../next/node_modules/parse5/dist/index.js';
import { hash, safeUrl, fetchEvidence } from './data.mjs';
import { zonedInstant, isoOffsetFor, zonedParts } from '../../next/src/lib/event-occurrence.mjs';
const hosts = { libraries: 'library.mornpen.vic.gov.au', mprg: 'mprg.mornpen.vic.gov.au', shire: 'www.mornpen.vic.gov.au' };
const attributes = node => Object.fromEntries((node.attrs ?? []).map(item => [item.name, item.value]));
const hasClass = (node, value) => (attributes(node).class ?? '').split(/\s+/).includes(value);
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join(' ');
const cleanText = node => text(node).replace(/\s+/g, ' ').trim();
function nodes(root, predicate) {
  const found = [];
  const visit = node => { if (predicate(node)) found.push(node); for (const child of node.childNodes ?? []) visit(child); };
  visit(root); return found;
}
function locator(node) {
  const segments = [];
  for (let current = node; current?.tagName; current = current.parentNode) {
    const siblings = (current.parentNode?.childNodes ?? []).filter(item => item.tagName === current.tagName);
    segments.unshift(`${current.tagName}:nth-of-type(${siblings.indexOf(current) + 1})`);
  }
  return segments.join(' > ');
}
function rawNode(node, body) {
  const location = node?.sourceCodeLocation;
  if (!location) return '';
  return body.slice(location.startOffset, location.endOffset);
}
function withinPagination(node) {
  for (let current = node; current; current = current.parentNode) {
    if (['seamless-pagination', 'seamless-pagination-pages', 'pagination'].some(value => hasClass(current, value))) return true;
  }
  return false;
}
function sourceContext(evidence) {
  if (!hosts[evidence.sourceId]) throw new Error('Unsupported HTML source adapter');
  safeUrl(evidence.url, [hosts[evidence.sourceId]]);
  if (typeof evidence.body !== 'string') throw new Error('Captured HTML body required');
  return parse(evidence.body, { sourceCodeLocationInfo: true });
}
function isDetail(url, sourceId) {
  const pathname = new URL(url).pathname;
  return sourceId === 'shire' ? /^\/Things-to-do\/(?:Events|Explore-Mornington-Peninsula\/Upcoming-events)\/Whats-on\/[^/]+\/?$/i.test(pathname) : sourceId === 'libraries' ? /^\/Whats-On\/Events\/[^/]+\/?$/i.test(pathname) :
    /^\/(?:Exhibitions\/(?:Current-exhibitions|Upcoming-exhibitions)|Whats-On\/(?:Events|Programs)|Events)\/[^/]+\/?$/i.test(pathname);
}
function exactDay(year, month, day) {
  if (!/^\d{4}$/.test(year ?? '') || !/^\d{1,2}$/.test(month ?? '') || !/^\d{1,2}$/.test(day ?? '')) return null;
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const instant = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value ? value : null;
}
function exactMachineDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null;
  const parts = value.slice(0, 10).split('-');
  return exactDay(...parts) && Number.isFinite(new Date(value).getTime()) ? value : null;
}
function dateParts(node, prefix) {
  const attr = attributes(node);
  const day = exactDay(attr[`data-${prefix}-year`], attr[`data-${prefix}-month`], attr[`data-${prefix}-day`]);
  if (!day) return null;
  const hour = attr[`data-${prefix}-hour`], minute = attr[`data-${prefix}-mins`];
  if (hour == null && minute == null) return day;
  if (!/^\d{1,2}$/.test(hour ?? '') || !/^\d{1,2}$/.test(minute ?? '') || Number(hour) > 23 || Number(minute) > 59) return null;
  const clock = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  const instant = zonedInstant(day, clock);
  const actual = zonedParts(instant);
  const repeated = zonedParts(new Date(instant.getTime() + 3600000));
  const matches = parts => parts.year === Number(attr[`data-${prefix}-year`]) && parts.month === Number(attr[`data-${prefix}-month`]) && parts.day === Number(attr[`data-${prefix}-day`]) && parts.hour === Number(hour) && parts.minute === Number(minute);
  // A gap or repeated local clock needs explicit offset evidence. Do not
  // silently pick another instant for machine metadata that omitted it.
  if (!matches(actual) || matches(repeated)) return null;
  return `${day}T${clock}:00${isoOffsetFor(instant)}`;
}
function proof(evidence, node, value, method = 'html-selector') {
  return { evidenceId: evidence.id, path: locator(node), value, quote: rawNode(node, evidence.body), method, verified: false };
}

export function extractOfficialHtml(evidence) {
  const document = sourceContext(evidence);
  const warnings = [];
  const discovered = new Map();
  for (const anchor of nodes(document, node => node.tagName === 'a' && attributes(node).href)) {
    try {
      const resolved = safeUrl(new URL(attributes(anchor).href, evidence.url).href, [hosts[evidence.sourceId]]);
      resolved.hash = '';
      const url = resolved.href;
      if (!isDetail(url, evidence.sourceId)) continue;
      const heading = nodes(anchor, node => ['h2', 'h3'].includes(node.tagName))[0];
      const title = cleanText(heading ?? anchor);
      if (title && !discovered.has(url)) discovered.set(url, { url, title, sourceId: evidence.sourceId, evidenceId: evidence.id, path: locator(anchor), extractionOnly: true });
    } catch { /* Navigation links outside this source are not detail leads. */ }
  }
  const leads = [...discovered.values()];
  if (!isDetail(evidence.url, evidence.sourceId)) return { adapter: evidence.sourceId, candidates: [], leads, warnings, pagination: paginationLinks(evidence, document) };
  const titleNodes = nodes(document, node => node.tagName === 'h1' && hasClass(node, 'oc-page-title'));
  if (titleNodes.length !== 1 || !cleanText(titleNodes[0])) {
    warnings.push('detail-layout-drift-or-ambiguous-title');
    return { adapter: evidence.sourceId, candidates: [], leads, warnings, pagination: paginationLinks(evidence, document) };
  }
  const title = cleanText(titleNodes[0]);
  const locations = nodes(document, node => hasClass(node, 'gmap-info')).flatMap(node => nodes(node, item => item.tagName === 'h2'));
  const locationNode = locations.length === 1 ? locations[0] : null;
  const metaUrl = nodes(document, node => node.tagName === 'meta' && attributes(node).property === 'og:url' && attributes(node).content === evidence.url)[0];
  const common = { title, officialEventUrl: evidence.url, ...(locationNode ? { venueName: cleanText(locationNode) } : {}) };
  const commonProofs = { title: proof(evidence, titleNodes[0], title), officialEventUrl: metaUrl ? proof(evidence, metaUrl, evidence.url) : { evidenceId: evidence.id, path: 'retrieval/url', value: evidence.url, quote: '', verified: false } };
  if (locationNode) commonProofs.venueName = proof(evidence, locationNode, common.venueName);
  const occurrences = [];
  for (const node of nodes(document, item => hasClass(item, 'multi-date-item'))) {
    const startDate = dateParts(node, 'start');
    const endDate = dateParts(node, 'end');
    if (!startDate || (Object.keys(attributes(node)).some(key => key.startsWith('data-end-')) && !endDate)) { warnings.push('invalid-or-incomplete-machine-date-parts'); continue; }
    if (endDate && new Date(endDate) < new Date(startDate)) { warnings.push('inverted-machine-date-range'); continue; }
    occurrences.push({ node, startDate, endDate });
  }
  if (!occurrences.length) {
    const semantic = key => nodes(document, node => {
      const attr = attributes(node);
      return attr.itemprop === key && (attr.content || attr.datetime) || node.tagName === 'meta' && attr.property === (key === 'startDate' ? 'event:start_time' : 'event:end_time') ||
        key === 'startDate' && node.tagName === 'time' && attr.datetime && hasClass(node.parentNode ?? {}, 'event-date');
    });
    const starts = semantic('startDate'), ends = semantic('endDate');
    if (starts.length === 1 && ends.length <= 1) {
      const startDate = exactMachineDate(attributes(starts[0]).content ?? attributes(starts[0]).datetime);
      const endDate = ends[0] ? exactMachineDate(attributes(ends[0]).content ?? attributes(ends[0]).datetime) : undefined;
      if (startDate && (!ends.length || endDate) && (!endDate || new Date(endDate) >= new Date(startDate))) occurrences.push({ node: starts[0], endNode: ends[0], startDate, endDate });
      else warnings.push('invalid-machine-date-metadata');
    } else if (starts.length > 1 || ends.length > 1) warnings.push('ambiguous-machine-date-metadata');
  }
  if (!occurrences.length) warnings.push('date-needs-manual-evidence-no-prose-parsing');
  if (!locationNode) warnings.push('location-needs-manual-evidence');
  const values = occurrences.length ? occurrences : [{ node: titleNodes[0] }];
  const candidates = values.map((occurrence) => {
    const fields = { ...common, ...(occurrence.startDate ? { startDate: occurrence.startDate } : {}), ...(occurrence.endDate ? { endDate: occurrence.endDate } : {}) };
    const proofs = { ...commonProofs };
    if (occurrence.startDate) proofs.startDate = proof(evidence, occurrence.node, occurrence.startDate, 'html-machine-metadata');
    if (occurrence.endDate) proofs.endDate = proof(evidence, occurrence.endNode ?? occurrence.node, occurrence.endDate, 'html-machine-metadata');
    return { id: hash(`${evidence.sourceId}:${evidence.url}:html:${attributes(occurrence.node).id ?? (occurrence.startDate ?? 'undated')}:${occurrence.endDate ?? ''}`).slice(0, 24), kind: 'event', fields, proofs,
      sourceIdentity: `${evidence.sourceId}:${evidence.url}`, extractionOccurrenceKey: occurrence.startDate ?? null,
      geography: { shireConfirmed: false, evidenceId: null }, category: null, summary: null, assets: [], reviewStatus: 'review', extractionOnly: true,
      extraction: { adapter: evidence.sourceId, evidenceId: evidence.id, sourceUrl: evidence.url, warnings: [...new Set(warnings)], dateMeaning: occurrence.startDate ? 'explicit-machine-metadata' : 'unknown' } };
  });
  return { adapter: evidence.sourceId, candidates, leads, warnings: [...new Set(warnings)], pagination: paginationLinks(evidence, document) };
}

export function paginationLinks(evidence, suppliedDocument) {
  const document = suppliedDocument ?? sourceContext(evidence);
  const current = safeUrl(evidence.url, [hosts[evidence.sourceId]]);
  const next = new Set(), warnings = [];
  const nextAnchors = nodes(document, node => {
    const attr = attributes(node);
    return (node.tagName === 'a' || node.tagName === 'link') && (attr.rel ?? '').split(/\s+/).includes('next') ||
      node.tagName === 'a' && /^(?:next(?: page)?|next [›»]|[›»])$/i.test(attr['aria-label'] ?? attr.title ?? cleanText(node)) &&
      withinPagination(node);
  });
  for (const node of nextAnchors) {
    try {
      if (!attributes(node).href?.trim()) throw new Error('Missing pagination URL');
      const url = safeUrl(new URL(attributes(node).href, current).href, [current.hostname]);
      if (url.origin !== current.origin || url.hash || url.href === current.href) throw new Error('Invalid pagination destination');
      next.add(url.href);
    } catch { warnings.push('unsafe-or-external-pagination-rejected'); }
  }
  const pageInfo = nodes(document, node => hasClass(node, 'seamless-pagination-info')).map(cleanText).map(value => /Page\s+(\d+)\s+of\s+(\d+)/i.exec(value)).find(Boolean);
  const currentPage = pageInfo ? Number(pageInfo[1]) : null;
  const totalPages = pageInfo ? Number(pageInfo[2]) : null;
  const enabledNext = nodes(document, node => node.tagName === 'input' && /^next$/i.test(attributes(node).value ?? '') && !Object.hasOwn(attributes(node), 'disabled') && withinPagination(node));
  if (enabledNext.length) warnings.push('form-pagination-needs-permitted-browser-review');
  if (totalPages > currentPage && !next.size && !enabledNext.length) warnings.push('pagination-more-pages-without-safe-next-link');
  return { currentPage, totalPages, next: [...next], complete: next.size === 0 && warnings.length === 0, warnings };
}

export async function collectOfficialPages(source, { maxPages = 5, evidenceFetcher = fetchEvidence } = {}) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20) throw new Error('Page cap must be 1–20');
  const queue = [safeUrl(source.url, [hosts[source.id]]).href], visited = new Set(), pages = [], warnings = [];
  while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) { warnings.push('pagination-loop-detected'); continue; }
    visited.add(url);
    try {
      const evidence = await evidenceFetcher({ ...source, url, hosts: [hosts[source.id]] });
      if (evidence.url !== url || evidence.sourceId !== source.id) throw new Error('Pagination evidence source mismatch');
      const extracted = extractOfficialHtml(evidence);
      pages.push({ evidence, extracted });
      warnings.push(...extracted.pagination.warnings);
      for (const next of extracted.pagination.next) {
        if (visited.has(next)) warnings.push('pagination-loop-detected');
        else if (!queue.includes(next)) queue.push(next);
      }
    } catch (error) { warnings.push(`page-retrieval-failed:${error.message}`); }
  }
  if (queue.length) warnings.push('pagination-page-cap-reached');
  return { pages, visited: [...visited], remaining: queue, complete: queue.length === 0 && warnings.length === 0, warnings: [...new Set(warnings)] };
}
