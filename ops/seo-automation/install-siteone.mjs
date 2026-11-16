import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm, chmod, copyFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const { siteone: tool } = JSON.parse(await readFile(path.join(root, 'tools.json')));
if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Pinned worker supports Linux x64 only');
const temporary = await mkdtemp(path.join(tmpdir(), 'pi-siteone-'));
try {
  const response = await fetch(tool.url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`SiteOne download: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== tool.sha256) throw new Error('SiteOne archive checksum mismatch');
  const archive = path.join(temporary, 'release.tar.gz');
  await writeFile(archive, bytes);
  const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
  if (entries.some(entry => entry.startsWith('/') || entry.split('/').includes('..'))) throw new Error('Unsafe release archive');
  execFileSync('tar', ['-xzf', archive, '-C', temporary]);
  const binary = entries.find(entry => /(^|\/)siteone-crawler$/.test(entry));
  if (!binary) throw new Error('Release has no SiteOne binary');
  await mkdir(path.join(root, '.tools'), { recursive: true });
  const destination = path.join(root, '.tools', 'siteone-crawler');
  await copyFile(path.join(temporary, binary), destination);
  await chmod(destination, 0o755);
  // SiteOne 2.5.1 prints its version but exits 2 for this informational flag.
  const version = spawnSync(destination, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (version.error || !version.stdout.includes(`Version: ${tool.version}.`)) throw new Error('Installed SiteOne version mismatch');
  console.log(version.stdout.trim());
} finally {
  await rm(temporary, { recursive: true, force: true });
}
