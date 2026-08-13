import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const auditScript = fileURLToPath(new URL('./audit-agent-readiness.mjs', import.meta.url));
const instant = '2026-08-14T14:10:00Z'; // 15 August in Australia/Sydney.

function writeFixture(root, generated = '2026-08-15', endDate = '2026-08-15') {
  const weekendDir = join(root, 'whats-on', 'this-weekend');
  const feedDir = join(root, 'whats-on');
  mkdirSync(weekendDir, { recursive: true });
  writeFileSync(
    join(feedDir, 'upcoming.json'),
    JSON.stringify({
      generated,
      count: 1,
      thisWeekend: { count: 1 },
      events: [{
        title: 'Fixture event',
        url: 'https://peninsulainsider.com.au/whats-on/fixture/',
        startDate: endDate,
        endDate,
        thisWeekend: true,
      }],
    }),
  );
  writeFileSync(
    join(weekendDir, 'index.html'),
    '<html><body><article data-weekend-end="2026-08-16T13:59:00.000Z" data-source-mode="registry-fallback"></article></body></html>',
  );
  writeFileSync(
    join(root, 'index.html'),
    '<html><head><link rel="canonical" href="https://peninsulainsider.com.au/" /></head><body></body></html>',
  );
  writeFileSync(
    join(root, 'sitemap.xml'),
    '<?xml version="1.0"?><urlset><url><loc>https://peninsulainsider.com.au/</loc></url></urlset>',
  );
}

function runAudit(root) {
  return spawnSync(
    process.execPath,
    [auditScript, '--site', root, '--instant', instant],
    { encoding: 'utf8' },
  );
}

test('derives the audit date in Australia/Sydney at the UTC date boundary', () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    writeFixture(root);
    const result = runAudit(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /passed for 2026-08-15/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a previous-day feed and expired occurrence', () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    writeFixture(root, '2026-08-14', '2026-08-14');
    const result = runAudit(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected 2026-08-15/);
    assert.match(result.stderr, /Expired occurrence/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
