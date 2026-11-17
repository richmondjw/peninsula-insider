// Synthetic HTTP only: this preload replaces fetch and never opens a socket.
import { createHash } from 'node:crypto';
import { agentRoutes, agentResources, agentDirectories, SITE } from '../../src/lib/agent-guide.mjs';
const mode = process.env.PI_AUDIT_FIXTURE;
if (!mode) throw new Error('Explicit synthetic fixture mode required');
const nativeTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _delay, ...args) => nativeTimeout(fn, 0, ...args);
const successor = process.argv.some(arg => arg.includes('attempt-2-'));
const deployment = { sourceSha: (successor ? 'b' : 'a').repeat(40), runId: successor ? '101' : '100', generatedAt: '2026-11-17T00:00:00Z' };
const paths = ['/', '/agents/', ...Array.from({ length: 18 }, (_, i) => `/eat/example-${i}/`)];
const directoryLinks = agentDirectories.flatMap(d => [SITE + d.href, SITE + d.htmlHref]).join('\n');
const bodies = {};
for (const route of [...agentRoutes, ...agentResources]) bodies[new URL(route.href, SITE).pathname] = '<main><h1>Fixture</h1></main>';
const records = paths.map(path => {
  const canonicalUrl = SITE + path;
  const md = `Canonical: ${canonicalUrl}\n${path === '/' || path === '/agents/' ? directoryLinks : 'Unknown details remain unknown.'}`;
  bodies[path] = `<link rel="canonical" href="${canonicalUrl}"><link rel="alternate" href="${canonicalUrl}index.md"><link rel="describedby" href="${SITE}/agents/"><main><h1>Fixture</h1></main>`;
  bodies[path + 'index.md'] = md;
  return { id: canonicalUrl, canonicalUrl, markdownUrl: canonicalUrl + 'index.md', title: 'Fixture', section: 'eat',
    contentSha256: createHash('sha256').update(md).digest('hex'), markdownBytes: Buffer.byteLength(md), htmlBytes: 10000,
    citation: { url: canonicalUrl, title: 'Fixture', publishedAt: null, modifiedAt: null } };
});
const snapshotId = createHash('sha256').update(JSON.stringify(records.map(r => [r.id, r.contentSha256]))).digest('hex');
const generatedAt = '2026-11-17T00:00:00Z';
bodies['/agents/catalog.json'] = JSON.stringify({ schemaVersion: '2.0', count: records.length, records, snapshotId, generatedAt });
bodies['/agents/changes.json'] = JSON.stringify({ count: 0, changes: [], baselineAvailable: false, fromSnapshot: null, toSnapshot: snapshotId });
bodies['/sitemap.xml'] = `<urlset>${paths.map(path => `<loc>${SITE}${path}</loc>`).join('')}</urlset>`;
bodies['/llms.txt'] = [...agentRoutes, ...agentResources].map(r => SITE + r.href).join('\n') + '\n' + directoryLinks;
bodies['/llms-full.txt'] = SITE + '/';
bodies['/whats-on/this-weekend/'] = 'Fixture weekend';
const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Australia/Sydney', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
bodies['/whats-on/upcoming.json'] = JSON.stringify({ schemaVersion: '1.2', timezone: 'Australia/Melbourne', generated: mode === 'stale' ? '2000-01-01' : today,
  generatedAt, count: 0, numberOfItems: 0, events: [], itemListElement: [], window: { start: today, end: today },
  thisWeekend: { start: today, end: today, count: 0, label: 'Fixture weekend' } });
const directories = agentDirectories.map(d => {
  const advertised = { section: d.section };
  for (const [format, href, urlKey, bytesKey, urlsKey] of [['markdown', d.href, 'url', 'bytes', 'distinctUrls'], ['html', d.htmlHref, 'htmlUrl', 'htmlBytes', 'htmlDistinctUrls']]) {
    const projected = records.filter(r => r.section === d.section).map(r => format === 'markdown' ? { title: r.title, markdownUrl: r.markdownUrl } : { title: r.title, canonicalUrl: r.canonicalUrl });
    const shard = { schemaVersion: mode === 'schema' ? 'broken' : '1.0', snapshotId, generatedAt: !successor && mode !== 'stable' && mode !== 'stale' ? '2026-11-17T00:01:00Z' : generatedAt,
      section: d.section, destinationFormat: format, count: projected.length, records: projected,
      semantics: 'not facts or recommendations; not a fact check; Missing details remain unknown' };
    const body = JSON.stringify(shard); bodies[href] = body;
    Object.assign(advertised, { [urlKey]: SITE + href, [bytesKey]: Buffer.byteLength(body), [urlsKey]: new Set(body.match(/https?:\/\/[^\s"<>]+/g) || []).size, count: projected.length });
  }
  return advertised;
});
bodies['/agents/manifest.json'] = JSON.stringify({ snapshotId, sections: [], directories });
let deploymentReads = 0;
globalThis.fetch = async (url, options = {}) => {
  const path = new URL(url).pathname;
  if (path === '/deployment.json') {
    deploymentReads++;
    const changed = (mode === 'preflight-change' || !process.argv.some(arg => arg.endsWith('audit-live-agent-readiness.mjs'))) && mode !== 'stable' && mode !== 'unchanged' && mode !== 'stale' && !successor && deploymentReads > 1;
    return new Response(JSON.stringify(changed ? { ...deployment, sourceSha: 'b'.repeat(40), runId: '101' } : deployment));
  }
  if (['/admin/', '/__pi-agent-readiness-not-found__/', '/admin/index.md', '/account/index.md', '/agents/not-a-real-record.json'].includes(path)) return new Response('missing', { status: 404 });
  if (!(path in bodies)) throw new Error(`Unplanned synthetic request: ${path}`);
  const conditional = options.headers?.['If-None-Match'];
  const headers = { etag: '"fixture"', 'cache-control': 'public, max-age=0', 'content-type': path.endsWith('.json') ? 'application/json' : path.endsWith('.md') ? 'text/markdown' : 'text/plain' };
  if (conditional && mode !== 'conditional') return new Response(null, { status: 304, headers });
  return new Response(bodies[path], { headers });
};
