import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildReleaseManifest } from './release-manifest.mjs';

test('release manifest binds critical output hashes to the source release', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-release-'));
  try {
    await mkdir(join(dir, 'whats-on'), { recursive: true });
    await writeFile(join(dir, 'index.html'), '<html>PI</html>');
    await writeFile(join(dir, 'sitemap.xml'), '<urlset/>');
    await writeFile(join(dir, 'whats-on', 'upcoming.json'), '{"events":[]}');
    const result = await buildReleaseManifest({
      distDir: dir,
      sourceSha: '9c29fe33b3a018aa58fb4316463dbe0fd6c7465c',
      runId: '12345',
      trigger: 'push',
      actor: 'james',
      generatedAt: '2026-08-25T00:00:00.000Z',
    });
    assert.equal(result.releaseId, '9c29fe33b3a0-12345');
    assert.equal(result.verification.state, 'awaiting_external_verification');
    assert.deepEqual(result.artifacts.map((item) => item.path), [
      '/index.html',
      '/sitemap.xml',
      '/whats-on/upcoming.json',
    ]);
    assert.match(result.artifacts[0].sha256, /^[0-9a-f]{64}$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('release manifest fails closed without the public root', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-release-empty-'));
  try {
    await assert.rejects(
      () => buildReleaseManifest({ distDir: dir, sourceSha: 'abcdef1', runId: '1' }),
      /requires dist\/index\.html/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
