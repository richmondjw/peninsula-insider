/**
 * Weekly venue re-check.
 *
 * Reads each open venue's own website and compares it with what our record
 * says. It never edits a record and never publishes anything: it writes a
 * report for an editor. A venue's website is the venue speaking for itself,
 * so a disagreement is a reason to look, not proof that we are wrong.
 *
 * What it looks for:
 *   - the website or booking link no longer loads;
 *   - the website says the place has closed;
 *   - our phone number or street address is not found on their home page.
 *
 * Pages are read through Firecrawl when FIRECRAWL_API_KEY is set (it renders
 * pages that need a browser) and by a plain request otherwise. The report
 * says which was used.
 *
 *   node scripts/venue-recheck.mjs [--only slug,slug] [--limit 20] [--out reports/venue-recheck]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const option = (name) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : null; };
const VENUES = resolve('src/content/venues');
const OUT = resolve(option('--out') || 'reports/venue-recheck');
const ONLY = (option('--only') || '').split(',').filter(Boolean);
const LIMIT = Number(option('--limit')) || Infinity;
const KEY = process.env.FIRECRAWL_API_KEY || '';
const JOBS = 3;
const WAIT_MS = 25000;
const AGENT = 'PeninsulaInsider-VenueCheck/1.0 (+https://peninsulainsider.com.au/contact/)';

export const CLOSED = /\b(?:permanently closed|closed permanently|(?:we have|we've|has|have) (?:now )?closed (?:our|its|the) doors|ceased trading|closed until further notice|(?:is|are) now closed for good|final (?:day of )?(?:service|trading))\b/i;
const digits = (value) => String(value || '').replace(/\D/g, '');

/** Our phone number, as the last eight digits, appears somewhere in their page. */
export function phoneFound(ours, text) {
  const tail = digits(ours).slice(-8);
  return tail.length < 8 || digits(text).includes(tail);
}

/** Our street number and street name appear together in their page. */
export function addressFound(ours, text) {
  const street = String(ours || '').match(/(\d+[A-Za-z]?)\s+([A-Za-z][A-Za-z'’-]+(?:\s+[A-Za-z][A-Za-z'’-]+)?)/);
  if (!street) return true;
  const [, number, name] = street;
  const first = name.split(/\s+/)[0].toLowerCase();
  return new RegExp(`\\b${number}\\b[^\\n]{0,40}${first.replace(/[^a-z]/g, '.')}`, 'i').test(text);
}

export function findings(venue, page) {
  const out = [];
  // A refused status is their site answering. No answer at all may be our network, so it is kept apart.
  if (!page.ok) { out.push(page.status ? { level: 'high', what: `Website answered with an error (${page.why}).` } : { level: 'unread', what: `Could not be reached (${page.why}).` }); return out; }
  const text = page.text;
  const closed = text.match(CLOSED);
  if (closed) {
    const at = Math.max(0, closed.index - 80);
    out.push({ level: 'high', what: `Their site may say it has closed: "…${text.slice(at, closed.index + closed[0].length + 80).replace(/\s+/g, ' ').trim()}…"` });
  }
  if (text.length < 200) { out.push({ level: 'low', what: 'Their home page gave almost no text to compare (it may need a browser to read).' }); return out; }
  if (venue.phone && !phoneFound(venue.phone, text)) out.push({ level: 'low', what: `Our phone number (${venue.phone}) is not on their home page.` });
  if (venue.address && !addressFound(venue.address, text)) out.push({ level: 'low', what: `Our street address (${venue.address}) is not on their home page.` });
  return out;
}

async function plainRead(url) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(WAIT_MS), headers: { 'User-Agent': AGENT, Accept: 'text/html,*/*;q=0.8' } });
  if (!response.ok) return { ok: false, status: response.status, why: `status ${response.status}` };
  const html = await response.text();
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ');
  return { ok: true, text, via: 'request' };
}

async function firecrawlRead(url) {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST', signal: AbortSignal.timeout(WAIT_MS * 2),
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: false }),
  });
  if (!response.ok) throw new Error(`Firecrawl status ${response.status}`);
  const body = await response.json();
  const status = body?.data?.metadata?.statusCode;
  if (typeof status === 'number' && status >= 400) return { ok: false, status, why: `status ${status}` };
  if (!body?.success || typeof body?.data?.markdown !== 'string') throw new Error('Firecrawl gave no page');
  return { ok: true, text: body.data.markdown, via: 'firecrawl' };
}

let firecrawlFailed = 0;
async function read(url) {
  if (KEY && firecrawlFailed < 5) {
    try { return await firecrawlRead(url); } catch { firecrawlFailed += 1; }
  }
  try { return await plainRead(url); } catch (error) { return { ok: false, why: String(error?.cause?.code || error?.name || error).slice(0, 60) }; }
}

async function bookingLoads(url) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(WAIT_MS), headers: { 'User-Agent': AGENT } });
    // Booking systems often refuse automated requests; only a missing page counts.
    return response.status === 404 || response.status === 410 ? `status ${response.status}` : null;
  } catch { return null; }
}

async function main() {
  const venues = readdirSync(VENUES).filter((file) => file.endsWith('.json')).map((file) => JSON.parse(readFileSync(join(VENUES, file), 'utf8')))
    .filter((venue) => venue.status !== 'closed' && venue.status !== 'paused' && typeof venue.website === 'string' && /^https?:\/\//.test(venue.website))
    .filter((venue) => !ONLY.length || ONLY.includes(venue.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug)).slice(0, LIMIT);

  const rows = [];
  const via = { firecrawl: 0, request: 0 };
  let next = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (next < venues.length) {
      const venue = venues[next++];
      const page = await read(venue.website);
      if (page.ok) via[page.via] += 1;
      const found = findings(venue, page);
      if (venue.bookingUrl && venue.bookingUrl !== venue.website) {
        const gone = await bookingLoads(venue.bookingUrl);
        if (gone) found.push({ level: 'high', what: `Booking link no longer loads (${gone}): ${venue.bookingUrl}` });
      }
      rows.push({ venue, found });
    }
  }));
  rows.sort((a, b) => a.venue.slug.localeCompare(b.venue.slug));

  const high = rows.filter((row) => row.found.some((item) => item.level === 'high'));
  const unread = rows.filter((row) => row.found.some((item) => item.level === 'unread'));
  const low = rows.filter((row) => row.found.length && !high.includes(row) && !unread.includes(row));
  const section = (title, list, level) => list.length
    ? [`## ${title} (${list.length})`, '', ...list.flatMap((row) => [`### ${row.venue.name}`, `Our record: ${row.venue.slug} · Their site: ${row.venue.website}`, '', ...row.found.filter((item) => !level || item.level === level || level === 'any').map((item) => `- ${item.what}`), '']), '']
    : [`## ${title} (0)`, '', 'None.', ''];
  const report = [
    '# Weekly venue re-check',
    '',
    `Checked ${rows.length} open venues against their own websites. Pages read through Firecrawl: ${via.firecrawl}. By plain request: ${via.request}.${KEY ? '' : ' No Firecrawl key was available to this run.'}`,
    '',
    'Nothing was changed. Each item is a reason for an editor to look, not a correction.',
    '',
    ...section('Look at these first', high, 'any'),
    ...section('Worth a glance', low, 'any'),
    ...(unread.length > rows.length / 2
      ? [`## Could not be read (${unread.length})`, '', 'More than half of the websites could not be reached, which points at this run’s network and not at the venues. Run it again before reading anything into it.', '']
      : section('Could not be read this run', unread, 'any')),
    `Nothing to report for ${rows.length - high.length - low.length - unread.length} venues.`,
    '',
  ].join('\n');

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'venue-recheck.md'), report);
  writeFileSync(join(OUT, 'venue-recheck.json'), JSON.stringify({ checked: rows.length, via, rows: rows.filter((row) => row.found.length).map((row) => ({ slug: row.venue.slug, found: row.found })) }, null, 2) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.slice(0, 60000));
  console.log(`Checked ${rows.length}. Look first: ${high.length}. Worth a glance: ${low.length}. Not read: ${unread.length}. Report: ${join(OUT, 'venue-recheck.md')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
