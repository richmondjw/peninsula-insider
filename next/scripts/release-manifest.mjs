#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nextRoot = resolve(here, '..');

export async function sha256(path) {
  const body = await readFile(path);
  return createHash('sha256').update(body).digest('hex');
}

async function existingArtifact(distDir, relativePath) {
  const path = join(distDir, relativePath);
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    return { path: `/${relativePath.replaceAll('\\', '/')}`, bytes: info.size, sha256: await sha256(path) };
  } catch {
    return null;
  }
}

export async function buildReleaseManifest({
  distDir,
  sourceSha,
  runId,
  trigger,
  actor,
  generatedAt = new Date().toISOString(),
}) {
  if (!/^[0-9a-f]{7,64}$/i.test(sourceSha || '')) throw new Error('SOURCE_SHA must be a Git SHA');
  if (!runId) throw new Error('BUILD_RUN_ID is required');

  const critical = [
    'index.html',
    'sitemap.xml',
    'sitemap-index.xml',
    'whats-on/upcoming.json',
    'llms.txt',
    'feed.xml',
  ];
  const artifacts = (await Promise.all(critical.map((path) => existingArtifact(distDir, path))))
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path));

  if (!artifacts.some((item) => item.path === '/index.html')) {
    throw new Error('release manifest requires dist/index.html');
  }

  const releaseId = `${sourceSha.slice(0, 12)}-${runId}`;
  return {
    schemaVersion: 1,
    releaseId,
    sourceSha,
    buildRunId: String(runId),
    generatedAt,
    trigger: trigger || 'unknown',
    authority: {
      mode: 'github-protected-release',
      actor: actor || 'unknown',
      note: 'Approval remains the protected branch/merge decision; this manifest is evidence, not authority.',
    },
    artifacts,
    verification: {
      state: 'awaiting_external_verification',
      expectedDeploymentSha: sourceSha,
    },
  };
}

async function main() {
  const distDir = resolve(process.env.PI_DIST_DIR || join(nextRoot, 'dist'));
  const output = resolve(process.env.PI_RELEASE_MANIFEST || join(distDir, 'release-manifest.json'));
  const manifest = await buildReleaseManifest({
    distDir,
    sourceSha: process.env.SOURCE_SHA,
    runId: process.env.BUILD_RUN_ID,
    trigger: process.env.RELEASE_TRIGGER,
    actor: process.env.RELEASE_ACTOR,
  });
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ releaseId: manifest.releaseId, output, artifacts: manifest.artifacts.length })}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[release-manifest] ${error.message}`);
    process.exit(1);
  });
}
