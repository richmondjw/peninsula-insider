// Whole-sitemap crawl-age census.
//
//   node crawl-age-census.mjs [--sitemap PATH_OR_URL] [--limit N]
//
// URL-inspects every sitemap URL (within the ~2,000/day property quota) and
// reports how much of the site Google has re-fetched since the password gate
// came down on 3 August 2026. See crawl-age.mjs for why that is the question.
// Read-only against Search Console. Writes ops/data/seo/crawl-age-<date>.json
// (gitignored) and prints a summary to paste into the recovery tracker.

import fs from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { PATHS } from './config.mjs';
import { sitemapUrls, summarise } from './crawl-age.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};

const source = arg('--sitemap', 'https://peninsulainsider.com.au/sitemap.xml');
const limit = Number(arg('--limit', '1900')); // stay under the daily inspection quota

const xml = /^https?:/.test(source) ? await (await fetch(source)).text() : await fs.readFile(source, 'utf8');
const urls = sitemapUrls(xml).slice(0, limit);
if (!urls.length) throw new Error(`No URLs found in ${source}`);

const secret = JSON.parse(await fs.readFile(PATHS.clientSecret, 'utf8'));
const token = JSON.parse(await fs.readFile(PATHS.token, 'utf8'));
const property = JSON.parse(await fs.readFile(PATHS.property, 'utf8'));
const auth = new google.auth.OAuth2(secret.installed.client_id, secret.installed.client_secret);
auth.setCredentials(token);
const sc = google.searchconsole({ version: 'v1', auth });

const results = [];
const failures = [];
for (const [i, url] of urls.entries()) {
  try {
    const res = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl: property.siteUrl } });
    const s = res.data.inspectionResult?.indexStatusResult ?? {};
    results.push({ url, lastCrawlTime: s.lastCrawlTime ?? null, coverageState: s.coverageState ?? null,
      verdict: s.verdict ?? null, googleCanonical: s.googleCanonical ?? null, userCanonical: s.userCanonical ?? null });
  } catch (error) {
    // A failed inspection is recorded, never counted as "not crawled".
    failures.push({ url, error: String(error.message).slice(0, 200) });
    if (/quota|rate/i.test(String(error.message))) break;
  }
  if ((i + 1) % 50 === 0) process.stderr.write(`${i + 1}/${urls.length}\n`);
  await new Promise((resolve) => setTimeout(resolve, 150));
}

const summary = summarise(results);
const date = new Date().toISOString().slice(0, 10);
await fs.mkdir(PATHS.dataDir, { recursive: true });
const out = path.join(PATHS.dataDir, `crawl-age-${date}.json`);
await fs.writeFile(out, JSON.stringify({ date, source, requested: urls.length, failures, summary, results }, null, 2));

const { stuck, canonicalMismatch, ...headline } = summary;
console.log(JSON.stringify({ ...headline, inspected: results.length, failed: failures.length,
  canonicalMismatches: canonicalMismatch.length, stuckCount: stuck.length, written: out }, null, 2));
