import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildPatch, runUrlArticleFixture } from '../.server-build/server/fixture-runner.js';
import { FileFoundryStore } from '../.server-build/server/store.js';

const execute = promisify(execFile);
const studioRoot = resolve(new URL('..', import.meta.url).pathname);
const sourceRoot = resolve(studioRoot, '..');
const scratch = await mkdtemp(join(tmpdir(), 'pi-foundry-patch-verify-'));
let targetRoot = process.env.PI_PATCH_TARGET_ROOT ? resolve(process.env.PI_PATCH_TARGET_ROOT) : '';
let removeTarget = false;

try {
  if (!targetRoot) {
    targetRoot = join(scratch, 'repository');
    await execute('git', ['clone', '--quiet', '--no-local', sourceRoot, targetRoot]);
    removeTarget = true;
  }
  if (await realpath(targetRoot) === await realpath(sourceRoot)) {
    throw new Error('Patch verification target must be a disposable repository, not the source worktree');
  }

  const stateRoot = join(scratch, 'state');
  const store = new FileFoundryStore(join(stateRoot, 'runs.json'), stateRoot, undefined, () => '2026-08-21T05:00:00.000Z');
  let run = await store.create(runUrlArticleFixture('patch-verifier', 'generated-patch-application-v1', { includeClearedHero: true }));
  for (const type of ['quick_note', 'article_draft', 'article_metadata']) {
    const artifact = run.artifactPack.completed.find((candidate) => candidate.type === type);
    if (!artifact) throw new Error(`Missing ${type} fixture artifact`);
    run = await store.review(run.id, {
      artifactId: artifact.id,
      expectedArtifactVersion: artifact.version,
      expectedVersion: run.version,
      decision: 'accepted',
      reviewer: 'patch-verifier',
    });
  }
  const quick = run.artifactPack.completed.find((artifact) => artifact.type === 'quick_note');
  const metadata = run.artifactPack.completed.find((artifact) => artifact.type === 'article_metadata');
  if (!quick || !metadata) throw new Error('Patch artifacts are unavailable');
  const quickPatch = join(scratch, 'quick-note.patch');
  const articlePatch = join(scratch, 'article.patch');
  await writeFile(quickPatch, buildPatch(run, quick.id), 'utf8');
  await writeFile(articlePatch, buildPatch(run, metadata.id), 'utf8');

  await execute('git', ['-C', targetRoot, 'apply', '--check', '--whitespace=error-all', quickPatch, articlePatch]);
  await execute('git', ['-C', targetRoot, 'apply', '--whitespace=error-all', quickPatch, articlePatch]);
  const outputs = [
    join(targetRoot, 'next/src/content/quick-notes/2026-08-21-red-hill-wet-weather-lunch.md'),
    join(targetRoot, 'next/src/content/articles/red-hill-wet-weather-lunch.md'),
  ];
  for (const output of outputs) {
    const content = await readFile(output, 'utf8');
    if (/—|&(?:m|M)(?:dash|DASH);|&#0*8212;|&#x0*2014;/i.test(content)) throw new Error(`${output} contains an em dash`);
    if (/\$\s?\d|\b(?:price|cost|fee|charge|surcharge|free|complimentary)\b/i.test(content)) throw new Error(`${output} contains price language`);
  }
  process.stdout.write(`Generated Quick Note and Article patches applied cleanly in disposable repository ${targetRoot}.\n`);
} finally {
  if (removeTarget) await rm(targetRoot, { recursive: true, force: true });
  await rm(scratch, { recursive: true, force: true });
}
