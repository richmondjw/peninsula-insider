import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

import { agentRoutes, agentResources, SITE } from '../src/lib/agent-guide.mjs';
const args = process.argv.slice(2);
const base = args.includes('--base') ? args[args.indexOf('--base') + 1].replace(/\/$/, '') : null;
const dist = resolve(args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist');
const failures = [];
let checks = 0;
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
async function read(path) {
  if (base) {
    const response = await fetch(`${base}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'PI-agent-welcome-audit/1.0' } });
    if (response.status !== 200) throw new Error(`${path}: expected 200, got ${response.status}`);
    return response.text();
  }
  const pathname = new URL(path, SITE).pathname;
  return readFileSync(join(dist, pathname, pathname.endsWith('/') ? 'index.html' : ''), 'utf8');
}
const llms = await read('/llms.txt');
check(Buffer.byteLength(llms) < 6500, 'Agent entry point exceeds the 6.5KB budget');
check(!/Peninsula Radar|reviewed on a daily\/weekly|—/.test(llms), 'Outdated branding, unearned cadence claim or house-style violation');
for (const route of [...agentRoutes, ...agentResources]) {
  check(llms.includes(`${SITE}${route.href}`), `Missing route in index: ${route.href}`);
  const content = await read(route.href);
  if (new URL(route.href, SITE).pathname.endsWith('/')) {
    check(/<main\b/i.test(content) && /<h1\b/i.test(content), `Route lacks real page content: ${route.href}`);
    check(!/<meta[^>]+http-equiv=["']refresh/i.test(content), `Advertised redirect stub: ${route.href}`);
  }
}
const catalog = JSON.parse(await read('/agents/catalog.json'));
check(catalog.schemaVersion === '1.0' && catalog.count === 20 && catalog.records.length === 20, 'Pilot catalogue count or schema incorrect');
check(new Set(catalog.records.map((r) => r.id)).size === 20, 'Duplicate pilot identities');
for (const record of catalog.records) {
  const path = new URL(record.canonicalUrl).pathname;
  check(/^\/(agents|wine|eat|stay|explore|journal|whats-on)\//.test(path), `Unapproved export route: ${path}`);
  const html = await read(path);
  const md = await read(new URL(record.markdownUrl).pathname);
  check(html.includes(`href="${record.markdownUrl}"`), `Missing alternate link: ${path}`);
  check(html.includes('rel="describedby"'), `Missing agent discovery: ${path}`);
  check(md.includes(`Canonical: ${record.canonicalUrl}`), `Missing canonical citation: ${path}`);
  check(createHash('sha256').update(md).digest('hex') === record.contentSha256, `Incorrect content hash: ${path}`);
  check(Buffer.byteLength(md) === record.markdownBytes, `Incorrect Markdown byte count: ${path}`);
  check(!/<script\b|<form\b/.test(md), `Executable/form content in export: ${path}`);
  check(record.markdownBytes < record.htmlBytes, `Compact output is larger: ${path}`);
}
const feed = JSON.parse(await read('/whats-on/upcoming.json'));
check(feed.timezone === 'Australia/Sydney' && feed.schemaVersion === '1.1', 'Event timezone/schema missing');
check(feed.window?.start && feed.window?.end && feed.generatedAt, 'Event date contract missing');
check(feed.events.every((event) => Object.hasOwn(event, 'factCheckedOn') && Object.hasOwn(event, 'sourceUrl')), 'Event source/unknown check fields missing');
const savings = catalog.records.map((r) => 1 - r.markdownBytes / r.htmlBytes).sort((a,b) => a-b);
const report = { schemaVersion: '1.0', observedAt: new Date().toISOString(), target: base || dist, scope: 'Agent welcome, advertised routes, 20-page text pilot and event date contract', checks, passed: checks - failures.length, failures, metrics: { indexBytes: Buffer.byteLength(llms), compactPages: catalog.count, medianByteReduction: (savings[9] + savings[10]) / 2 }, fullRubricScore: null, unmeasured: ['Independent factual accuracy of the corpus', '30-task evaluation across three agent stacks and unseen questions', 'Production cache and rate-limit behaviour', 'Search visibility and repeat retrieval outcomes'] };
if (args.includes('--report')) { const output = resolve(args[args.indexOf('--report') + 1]); mkdirSync(dirname(output), {recursive:true}); writeFileSync(output, JSON.stringify(report,null,2)+'\n'); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Agent welcome acceptance passed: ${agentRoutes.length + agentResources.length} direct routes, ${catalog.count} compact pages, source hashes and event date semantics. This is a scoped deterministic gate, not a 99/100 site score.`);
