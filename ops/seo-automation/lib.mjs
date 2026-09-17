import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export function validateOrigin(value, liveOrigin) {
  const url = new URL(value);
  if (url.origin !== liveOrigin && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Only the PI site or a loopback build is allowed');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected a plain origin');
  return url.origin;
}

export function evaluateCrawl(report, { expectedPaths = [], maxUrls = 2000 } = {}) {
  if (!Array.isArray(report.results) || !report.results.length || !report.crawler?.version || !Array.isArray(report.summary?.items)) throw new Error('Missing or invalid SiteOne evidence');
  const failures = [];
  const paths = new Set();
  for (const row of report.results) {
    const pathname = new URL(row.url).pathname;
    paths.add(pathname);
    const status = Number(row.status);
    if (!Number.isInteger(status) || status < 200 || status >= 400) failures.push({ kind: 'http', url: row.url, status: row.status });
    else if (expectedPaths.includes(pathname) && status !== 200) failures.push({ kind: 'priority-redirect', url: row.url, status });
  }
  for (const pathname of expectedPaths) if (!paths.has(pathname)) failures.push({ kind: 'missing-url', path: pathname });
  if (report.results.length >= maxUrls) failures.push({ kind: 'crawl-limit', maxUrls });
  return { passed: failures.length === 0, checkedUrls: report.results.length, failures, findings: report.summary.items.filter(item => ['CRITICAL', 'WARNING'].includes(item.status)), scores: report.qualityScores ?? null };
}

// Serves only the build, never source or credentials. No SPA fallback: missing routes must fail.
export async function serveBuild(directory) {
  const root = path.resolve(directory);
  if (!(await stat(path.join(root, 'index.html'))).isFile()) throw new Error('Build index missing');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Outside build');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
