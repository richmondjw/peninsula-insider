import { readFile, writeFile, mkdir, open, rm, readdir, copyFile } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCrawl, serveBuild, validateOrigin } from './lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../..');
const policy = JSON.parse(await readFile(path.join(root, 'policy.json')));
const tools = JSON.parse(await readFile(path.join(root, 'tools.json')));
const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, '').split('='); return [key, value.join('=')]; }));
for (const key of Object.keys(args)) if (!['target', 'profile', 'output'].includes(key)) throw new Error(`Unknown option: ${key}`);
const target = args.target || 'local';
const profile = args.profile || 'daily';
if (!['local', 'live'].includes(target) || !['daily', 'weekly', 'ci'].includes(profile)) throw new Error('Invalid target/profile');
const state = path.join(root, '.runs');
// Resolve provenance before taking the lock, so a missing checkout cannot strand it.
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
await mkdir(state, { recursive: true });
const lockPath = path.join(state, 'audit.lock');
let lock;
try { lock = await open(lockPath, 'wx'); } catch { throw new Error('An audit is already running; inspect audit.lock before recovery'); }
await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + target + '-' + profile;
const output = path.resolve(args.output || path.join(state, id));
await mkdir(output, { recursive: true });
let server;
const result = { schemaVersion: 1, id, startedAt: new Date().toISOString(), target, profile, tools, policySha256: createHash('sha256').update(JSON.stringify(policy)).digest('hex'), status: 'running', sourceSha, stages: {}, artifacts: {} };
const run = (command, commandArgs, seconds, logName, cwd = root) => new Promise(async (resolve, reject) => {
  const log = await open(path.join(output, logName), 'w');
  const child = spawn(command, commandArgs, { cwd, env: process.env, stdio: ['ignore', log.fd, log.fd], detached: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGTERM'); } catch {} }, seconds * 1000);
  const killer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, (seconds + 10) * 1000);
  child.once('error', async error => { clearTimeout(timer); clearTimeout(killer); await log.close(); reject(error); });
  child.once('exit', async code => { clearTimeout(timer); clearTimeout(killer); await log.close(); resolve({ exitCode: code, timedOut, log: logName }); });
});
try {
  if (target === 'local') server = await serveBuild(path.join(repo, 'next/dist'));
  const origin = validateOrigin(server?.origin || policy.origin, policy.origin);
  result.origin = origin;
  if (target === 'live') {
    const response = await fetch(`${origin}/deployment.json`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Deployment provenance: HTTP ${response.status}`);
    result.deploymentBefore = await response.json();
    if (!/^[a-f0-9]{40}$/.test(result.deploymentBefore.sourceSha || '')) throw new Error('Invalid deployment SHA');
  }
  const expectedPaths = policy.pilotPaths;
  const crawler = path.join(root, '.tools/siteone-crawler');
  const crawlArgs = [`--url=${origin}/`, '--workers=2', `--max-reqs-per-sec=${target === 'local' ? 10 : policy.limits.requestsPerSecond}`, `--memory-limit=${policy.limits.memoryMB}M`, `--max-visited-urls=${policy.limits.maxUrls}`, '--timeout=15', '--disable-all-assets', '--output=json', `--output-json-file=${output}/siteone.json`, `--output-html-report=${output}/siteone.html`, '--output-text-file=', '--user-agent=PeninsulaInsider-SEO/1.0'];
  if (profile !== 'weekly') {
    const urlList = path.join(output, 'urls.txt');
    await writeFile(urlList, expectedPaths.map(route => origin + route).join('\n') + '\n');
    crawlArgs.push(`--url-list=${urlList}`, '--single-page');
  }
  result.stages.siteone = await run(crawler, crawlArgs, policy.limits.crawlTimeoutSeconds, 'siteone.log');
  if (result.stages.siteone.exitCode !== 0 || result.stages.siteone.timedOut) throw new Error('SiteOne execution failed; see siteone.log');
  const crawl = JSON.parse(await readFile(path.join(output, 'siteone.json')));
  result.crawl = evaluateCrawl(crawl, { expectedPaths, maxUrls: policy.limits.maxUrls });
  const lighthouseDir = path.join(output, 'lighthouse');
  await mkdir(lighthouseDir, { recursive: true });
  const lighthousePaths = profile === 'weekly' ? (policy.weeklyLighthousePaths ?? policy.lighthousePaths) : policy.lighthousePaths;
  const configuration = { ci: {
    collect: { url: lighthousePaths.map(route => origin + route), numberOfRuns: profile === 'ci' ? 3 : 1, settings: { chromeFlags: '--no-sandbox --disable-dev-shm-usage', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] } },
    assert: { assertions: policy.lighthouseAssertions },
    upload: { target: 'filesystem', outputDir: lighthouseDir }
  } };
  const configFile = path.join(output, 'lighthouserc.json');
  await writeFile(configFile, JSON.stringify(configuration, null, 2));
  // Separate collect/assert/upload: a failed assertion must still retain its reports.
  const lhci = path.join(root, 'node_modules/@lhci/cli/src/cli.js');
  result.stages.lighthouseCollect = await run(process.execPath, [lhci, 'collect', `--config=${configFile}`], policy.limits.lighthouseTimeoutSeconds, 'lighthouse-collect.log', output);
  if (result.stages.lighthouseCollect.exitCode !== 0 || result.stages.lighthouseCollect.timedOut) throw new Error('Lighthouse collection failed');
  result.stages.lighthouseAssert = await run(process.execPath, [lhci, 'assert', `--config=${configFile}`], 60, 'lighthouse-assert.log', output);
  result.stages.lighthouseUpload = await run(process.execPath, [lhci, 'upload', `--config=${configFile}`], 60, 'lighthouse-upload.log', output);
  if (result.stages.lighthouseUpload.exitCode !== 0) throw new Error('Lighthouse report preservation failed');
  result.lighthouse = [];
  for (const name of await readdir(path.join(output, '.lighthouseci'))) {
    if (!name.startsWith('lhr-') || !name.endsWith('.json')) continue;
    const report = JSON.parse(await readFile(path.join(output, '.lighthouseci', name)));
    if (report.runtimeError) throw new Error(`Lighthouse runtime error: ${report.runtimeError.code}`);
    result.lighthouse.push({ url: report.requestedUrl, finalUrl: report.finalDisplayedUrl || report.finalUrl, fetchedAt: report.fetchTime, lighthouseVersion: report.lighthouseVersion, userAgent: report.userAgent, categories: Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, value.score])), lcpMs: report.audits['largest-contentful-paint']?.numericValue, cls: report.audits['cumulative-layout-shift']?.numericValue });
  }
  if (result.lighthouse.length !== lighthousePaths.length * configuration.ci.collect.numberOfRuns) throw new Error('Lighthouse coverage incomplete');
  if (target === 'live') {
    const response = await fetch(`${origin}/deployment.json`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Post-audit deployment read failed');
    result.deploymentAfter = await response.json();
    if (result.deploymentBefore.sourceSha !== result.deploymentAfter.sourceSha) throw new Error('Deployment changed during audit; results span releases');
  }
  result.status = result.crawl.passed && result.stages.lighthouseAssert.exitCode === 0 ? 'passed' : 'failed';
} catch (error) { result.status = 'failed'; result.error = error.message; }
finally {
  if (server) await server.close();
  result.finishedAt = new Date().toISOString();
  for (const name of ['siteone.json', 'siteone.html', 'lighthouse-assert.log']) {
    try { result.artifacts[name] = createHash('sha256').update(await readFile(path.join(output, name))).digest('hex'); } catch {}
  }
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
  const markdown = [`# Peninsula Insider SEO audit`, '', `Status: **${result.status}**`, `Run: ${id}`, `Source: ${result.sourceSha}`, `Target: ${target}; profile: ${profile}`, `Deployed source: ${result.deploymentBefore?.sourceSha || 'local build'}`, '', `SiteOne URLs checked: ${result.crawl?.checkedUrls ?? 'unavailable'}`, `HTTP/coverage failures: ${result.crawl?.failures.length ?? 'unavailable'}`, `Finding counts: ${result.crawl?.findings.length ?? 'unavailable'}`, '', result.error ? `Execution error: ${result.error}` : '', 'Lighthouse SEO/accessibility assertions block regressions below the configured floor. Performance/LCP/CLS warnings remain visible; they do not prove ranking changes.', '', 'Read summary.json, siteone.html and lighthouse/*.html for evidence. Daily/CI audits sample priority routes; weekly follows internal links within the explicit URL limit.'];
  await writeFile(path.join(output, 'summary.md'), markdown.join('\n') + '\n');
  await copyFile(path.join(output, 'summary.json'), path.join(state, 'latest.json'));
  await lock.close();
  await rm(lockPath);
}
console.log(JSON.stringify({ status: result.status, output, error: result.error || null }));
process.exitCode = result.status === 'passed' ? 0 : 1;
