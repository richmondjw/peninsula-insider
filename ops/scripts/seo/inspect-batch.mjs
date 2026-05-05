// Inspect a batch of URLs to see indexation status. Used to estimate
// site-wide indexation coverage when GSC UI macro number seems off.
//
// Usage: node inspect-batch.mjs (reads from ../../data/seo/<latest>.json)

import fs from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { PATHS } from './config.mjs';

const secret = JSON.parse(await fs.readFile(PATHS.clientSecret, 'utf8'));
const token = JSON.parse(await fs.readFile(PATHS.token, 'utf8'));
const property = JSON.parse(await fs.readFile(PATHS.property, 'utf8'));
const auth = new google.auth.OAuth2(secret.installed.client_id, secret.installed.client_secret);
auth.setCredentials(token);
const sc = google.searchconsole({ version: 'v1', auth });

// Get latest snapshot to find URLs to inspect
const files = (await fs.readdir(PATHS.dataDir)).filter(f => f.endsWith('.json')).sort();
const latest = JSON.parse(await fs.readFile(path.join(PATHS.dataDir, files[files.length - 1]), 'utf8'));

// Pick top 30 https:// URLs by impressions that are NOT in the priority inspection list
const inspectedUrls = new Set(Object.keys(latest.inspections));
const candidates = latest.pages
  .filter(p => p.keys[0].startsWith('https://') && !inspectedUrls.has(p.keys[0]))
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 30);

console.log(`Inspecting ${candidates.length} non-priority URLs (highest-impression first)...\n`);

let pass = 0, fail = 0, error = 0;
const results = [];
for (const c of candidates) {
  const url = c.keys[0];
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: { siteUrl: property.siteUrl, inspectionUrl: url },
    });
    const r = res.data.inspectionResult;
    const verdict = r?.indexStatusResult?.verdict || 'UNKNOWN';
    const cov = r?.indexStatusResult?.coverageState || '';
    if (verdict === 'PASS') pass++;
    else fail++;
    const path = url.replace('https://peninsulainsider.com.au', '');
    console.log(`  ${verdict.padEnd(8)} ${cov.padEnd(45)} impr=${String(c.impressions).padStart(4)}  ${path}`);
    results.push({ url, verdict, cov, impressions: c.impressions });
  } catch (e) {
    error++;
    console.log(`  ERROR    ${e.message.slice(0, 50).padEnd(45)} impr=${c.impressions}  ${url}`);
  }
  await new Promise(r => setTimeout(r, 250));
}

console.log(`\nResults: ${pass} PASS, ${fail} not-indexed, ${error} errors (out of ${candidates.length})`);
console.log(`Sample-based PASS rate: ${((pass / (pass + fail)) * 100).toFixed(0)}%`);
