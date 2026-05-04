// Inspect a single page: top queries it ranks for, current indexation status.
// Usage: node inspect-page.mjs https://peninsulainsider.com.au/whats-on/mornington-cup-2026/

import fs from 'node:fs/promises';
import { google } from 'googleapis';
import { PATHS } from './config.mjs';

const target = process.argv[2];
if (!target) { console.error('Usage: node inspect-page.mjs <url>'); process.exit(1); }

const secret = JSON.parse(await fs.readFile(PATHS.clientSecret, 'utf8'));
const token = JSON.parse(await fs.readFile(PATHS.token, 'utf8'));
const property = JSON.parse(await fs.readFile(PATHS.property, 'utf8'));
const auth = new google.auth.OAuth2(secret.installed.client_id, secret.installed.client_secret);
auth.setCredentials(token);
const sc = google.searchconsole({ version: 'v1', auth });

const today = new Date();
const isoDate = (d) => d.toISOString().slice(0, 10);
const dateMinus = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() - n); return isoDate(d); };

const endDate = dateMinus(2);
const startDate = dateMinus(29);

console.log(`\nPage: ${target}`);
console.log(`Window: ${startDate} → ${endDate}\n`);

// Page-level totals
const totalsRes = await sc.searchanalytics.query({
  siteUrl: property.siteUrl,
  requestBody: {
    startDate, endDate,
    dimensions: ['page'],
    dimensionFilterGroups: [{ filters: [{ dimension: 'page', expression: target }] }],
    rowLimit: 1,
  },
});
const totals = totalsRes.data.rows?.[0];
console.log('Page totals (28d):');
console.log(`  clicks=${totals?.clicks ?? 0}  impr=${totals?.impressions ?? 0}  ctr=${((totals?.ctr ?? 0) * 100).toFixed(2)}%  pos=${(totals?.position ?? 0).toFixed(1)}\n`);

// Top queries for this page
const queriesRes = await sc.searchanalytics.query({
  siteUrl: property.siteUrl,
  requestBody: {
    startDate, endDate,
    dimensions: ['query'],
    dimensionFilterGroups: [{ filters: [{ dimension: 'page', expression: target }] }],
    rowLimit: 50,
  },
});
console.log('Top queries this page ranks for (28d):');
console.log('  clicks  impr  ctr     pos    query');
for (const r of queriesRes.data.rows || []) {
  const clicks = String(r.clicks).padStart(6);
  const impr = String(r.impressions).padStart(5);
  const ctr = `${(r.ctr * 100).toFixed(1)}%`.padStart(6);
  const pos = r.position.toFixed(1).padStart(5);
  console.log(`  ${clicks}  ${impr}  ${ctr}  ${pos}  ${r.keys[0]}`);
}

// Daily trend (last 28d)
const dailyRes = await sc.searchanalytics.query({
  siteUrl: property.siteUrl,
  requestBody: {
    startDate, endDate,
    dimensions: ['date'],
    dimensionFilterGroups: [{ filters: [{ dimension: 'page', expression: target }] }],
    rowLimit: 30,
  },
});
console.log('\nDaily trend (impressions / clicks):');
for (const r of dailyRes.data.rows || []) {
  console.log(`  ${r.keys[0]}  impr=${r.impressions}  clicks=${r.clicks}  pos=${r.position.toFixed(1)}`);
}
