import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SYDNEY_TZ = 'Australia/Sydney';
const DEFAULT_BASE = 'https://peninsulainsider.com.au';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value) {
  if (!ISO_DATE.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function sydneyDate(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function validateLivePayloads(payloads, { expectedDate, expectedSha } = {}) {
  const failures = [];
  const feed = payloads.feed;
  const events = Array.isArray(feed?.events) ? feed.events : [];
  const weekendEvents = events.filter((event) => event?.thisWeekend === true);

  if (feed?.generated !== expectedDate) {
    failures.push(`feed generated ${JSON.stringify(feed?.generated)}; expected ${expectedDate}`);
  }
  if (!Number.isInteger(feed?.count) || feed.count !== events.length) {
    failures.push(`feed count ${JSON.stringify(feed?.count)} does not match ${events.length} events`);
  }
  if (feed?.numberOfItems !== events.length || feed?.itemListElement?.length !== events.length) {
    failures.push('schema.org ItemList counts do not match the stable events payload');
  }
  for (const [index, event] of events.entries()) {
    const listItem = feed?.itemListElement?.[index];
    if (
      listItem?.['@type'] !== 'ListItem' ||
      listItem?.position !== index + 1 ||
      listItem?.item?.['@type'] !== 'Event' ||
      listItem?.item?.url !== event?.url ||
      listItem?.item?.startDate !== event?.startDate ||
      listItem?.item?.endDate !== event?.endDate
    ) {
      failures.push(`schema.org ItemList entry ${index + 1} disagrees with the stable events payload`);
    }
  }
  if (!Number.isInteger(feed?.thisWeekend?.count) || feed.thisWeekend.count !== weekendEvents.length) {
    failures.push(
      `weekend count ${JSON.stringify(feed?.thisWeekend?.count)} does not match ${weekendEvents.length} flagged events`,
    );
  }

  const weekendStart = feed?.thisWeekend?.start;
  const weekendEnd = feed?.thisWeekend?.end;
  if (!isIsoDate(weekendStart) || !isIsoDate(weekendEnd) || weekendStart > weekendEnd) {
    failures.push('weekend window is missing, malformed, or reversed');
  }

  for (const event of events) {
    const startDate = event?.startDate;
    const lastDate = event?.endDate || event?.startDate;
    if (!isIsoDate(startDate) || !isIsoDate(lastDate) || startDate > lastDate) {
      failures.push(`${event?.url || event?.title || 'event'} has malformed or reversed dates`);
    } else if (lastDate < expectedDate) {
      failures.push(`${event?.url || event?.title || 'event'} has expired or invalid date ${JSON.stringify(lastDate)}`);
    }
    if (typeof event?.url !== 'string' || !event.url.startsWith(`${DEFAULT_BASE}/`)) {
      failures.push(`${event?.title || 'event'} has a missing or non-canonical URL`);
    }
    if (event?.thisWeekend === true && (lastDate < weekendStart || startDate > weekendEnd)) {
      failures.push(`${event.url || event.title || 'event'} is flagged this weekend but falls outside the weekend window`);
    }
  }

  if (!/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']https:\/\/peninsulainsider\.com\.au\/["'])[^>]*>/i.test(payloads.root)) {
    failures.push('homepage canonical URL is missing or unexpected');
  }
  if (!payloads.weekend.includes(feed?.thisWeekend?.label || '__missing_weekend_label__')) {
    failures.push('weekend page does not expose the feed weekend label');
  }
  if (!payloads.llms.includes('https://peninsulainsider.com.au/whats-on/')) {
    failures.push('llms.txt does not link to the What’s On surface');
  }
  if (!payloads.llmsFull.includes('https://peninsulainsider.com.au/')) {
    failures.push('llms-full.txt does not identify the canonical site');
  }
  if (!payloads.sitemap.includes('<loc>https://peninsulainsider.com.au/')) {
    failures.push('sitemap does not contain canonical Peninsula Insider URLs');
  }
  for (const excluded of ['/explore/best-walks/', '/eat/port-phillip-estate-restaurant/']) {
    if (payloads.sitemap.includes(excluded)) failures.push(`sitemap contains redirect/noindex URL ${excluded}`);
  }
  if (expectedSha && payloads.deployment?.sourceSha !== expectedSha) {
    failures.push(
      `live deployment source ${JSON.stringify(payloads.deployment?.sourceSha)}; expected ${expectedSha}`,
    );
  }

  return failures;
}

function parseArgs(argv) {
  const args = {
    base: DEFAULT_BASE,
    expectedDate: sydneyDate(),
    expectedSha: process.env.EXPECTED_SHA || '',
    attempts: 12,
    delayMs: 15_000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index + 1];
    if (argv[index] === '--base') args.base = value;
    if (argv[index] === '--expected-date') args.expectedDate = value;
    if (argv[index] === '--expected-sha') args.expectedSha = value;
    if (argv[index] === '--attempts') args.attempts = Number.parseInt(value, 10);
    if (argv[index] === '--delay-ms') args.delayMs = Number.parseInt(value, 10);
  }
  args.base = args.base.replace(/\/$/, '');
  if (!isIsoDate(args.expectedDate)) throw new Error('expected date must be a valid YYYY-MM-DD date');
  if (!Number.isInteger(args.attempts) || args.attempts < 1) throw new Error('attempts must be a positive integer');
  if (!Number.isInteger(args.delayMs) || args.delayMs < 0) throw new Error('delay-ms must be non-negative');
  return args;
}

async function fetchResource(base, path, expectedStatus = 200) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${base}${path}${separator}pi_smoke=${Date.now()}`;
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'cache-control': 'no-cache', 'user-agent': 'PI-live-agent-readiness/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status !== expectedStatus) throw new Error(`${path} returned HTTP ${response.status}; expected ${expectedStatus}`);
  return response.text();
}

async function auditOnce(args) {
  const [root, feedText, weekend, llms, llmsFull, sitemap, deploymentText, admin404, unknown404] = await Promise.all([
    fetchResource(args.base, '/'),
    fetchResource(args.base, '/whats-on/upcoming.json'),
    fetchResource(args.base, '/whats-on/this-weekend/'),
    fetchResource(args.base, '/llms.txt'),
    fetchResource(args.base, '/llms-full.txt'),
    fetchResource(args.base, '/sitemap.xml'),
    fetchResource(args.base, '/deployment.json'),
    fetchResource(args.base, '/admin/', 404),
    fetchResource(args.base, '/__pi-agent-readiness-not-found__/', 404),
  ]);
  void admin404;
  void unknown404;

  let feed;
  let deployment;
  try {
    feed = JSON.parse(feedText);
  } catch (error) {
    throw new Error(`upcoming feed is not valid JSON: ${error.message}`);
  }
  try {
    deployment = JSON.parse(deploymentText);
  } catch (error) {
    throw new Error(`deployment provenance is not valid JSON: ${error.message}`);
  }

  // Use the build's Sydney date for the generated-freshness check so that a
  // build that started just before midnight Sydney time does not fail the
  // audit that runs after midnight (when sydneyDate() has already rolled over).
  const buildSydneyDate = deployment?.generatedAt
    ? sydneyDate(new Date(deployment.generatedAt))
    : args.expectedDate;

  const failures = validateLivePayloads(
    { root, feed, weekend, llms, llmsFull, sitemap, deployment },
    { expectedDate: buildSydneyDate, expectedSha: args.expectedSha },
  );

  // Staleness gate: a build from the previous calendar day is acceptable
  // (midnight-crossing case where the build started before midnight but the
  // audit runs after), but anything two or more days old is genuinely stale.
  if (buildSydneyDate < args.expectedDate) {
    const prev = new Date(`${args.expectedDate}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const dayBeforeExpected = prev.toISOString().slice(0, 10);
    if (buildSydneyDate < dayBeforeExpected) {
      failures.push(
        `deployment was built on ${buildSydneyDate}; Sydney date is ${args.expectedDate} (stale beyond one day)`,
      );
    }
  }

  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let failures = [];
  for (let attempt = 1; attempt <= args.attempts; attempt += 1) {
    try {
      failures = await auditOnce(args);
    } catch (error) {
      failures = [error.message];
    }
    if (failures.length === 0) {
      console.log(
        `Live agent-readiness passed for ${args.expectedDate}${args.expectedSha ? ` at ${args.expectedSha}` : ''}.`,
      );
      return;
    }
    console.error(`Live agent-readiness attempt ${attempt}/${args.attempts} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    if (attempt < args.attempts) await new Promise((resolve) => setTimeout(resolve, args.delayMs));
  }
  process.exitCode = 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
