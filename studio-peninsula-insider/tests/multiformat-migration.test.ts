import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { FoundryRun } from '../shared/contracts.js';
import { runNewsletterSocialFixture } from '../server/newsletter-social-fixtures.js';
import { runPreproductionFixture } from '../server/preproduction-fixtures.js';
import { FileFoundryStore } from '../server/store.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('accepted branch fixture migration', () => {
  it('reconstructs and reseals the four exact V1 recipe and bundle pairs while keeping old reviews historical', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-foundry-accepted-lanes-'));
    temporaryDirectories.push(directory);
    const fixtures = [
      runNewsletterSocialFixture('legacy-editor', 'legacy-newsletter-social-v1'),
      runPreproductionFixture('explainer', 'legacy-editor', 'legacy-explainer-v1'),
      runPreproductionFixture('podcast', 'legacy-editor', 'legacy-podcast-v1'),
      runPreproductionFixture('short_video', 'legacy-editor', 'legacy-short-video-v1'),
    ];

    for (const [index, fresh] of fixtures.entries()) {
      const artifact = fresh.artifactPack.completed[0];
      const legacy = structuredClone(fresh) as unknown as {
        schemaVersion: string;
        originAuthorityReceiptHash?: string;
        evaluationAsOf?: string;
        artifactPack: FoundryRun['artifactPack'] & { schemaVersion: string };
      };
      legacy.schemaVersion = 'pi.foundry-run.v2';
      (legacy.artifactPack as unknown as { schemaVersion: string }).schemaVersion = 'pi.artifact-pack.v1';
      delete legacy.originAuthorityReceiptHash;
      delete legacy.evaluationAsOf;
      legacy.artifactPack.reviews = [{
        id: `legacy-review-${index}`,
        artifactId: artifact.id,
        artifactVersion: artifact.version,
        decision: 'accepted',
        reviewer: 'legacy-reviewer',
        decidedAt: fresh.updatedAt,
        status: 'current',
        dependencySnapshot: artifact.dependencies,
        authority: 'draft_handoff_only',
      }];
      const file = join(directory, `runs-${index}.json`);
      await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [legacy], captureProjections: [] })}\n`, 'utf8');

      const store = new FileFoundryStore(file, directory, undefined, () => fresh.updatedAt);
      const migrated = await store.get(fresh.id);
      expect(migrated).toMatchObject({
        schemaVersion: 'pi.foundry-run.v3',
        id: fresh.id,
        idempotencyKey: fresh.idempotencyKey,
        recipe: { id: fresh.recipe.id },
        bundle: { id: fresh.bundle.id },
      });
      expect(migrated?.artifactPack.reviews).toEqual([expect.objectContaining({
        id: `legacy-review-${index}`,
        status: 'stale',
        staleReason: 'legacy_unsealed',
      })]);
      const reviewed = await store.review(fresh.id, {
        artifactId: artifact.id,
        decision: 'accepted',
        reviewer: 'v1-reviewer',
        expectedVersion: migrated!.version,
        expectedArtifactVersion: artifact.version,
      });
      expect(reviewed.artifactPack.reviews.filter((review) => review.status === 'current')).toHaveLength(1);
      expect(JSON.parse(await readFile(file, 'utf8')).schemaVersion).toBe('pi.foundry-file-store.v3');
      const restarted = await new FileFoundryStore(file, directory, undefined, () => fresh.updatedAt).get(fresh.id);
      expect(restarted?.artifactPack.reviews.some((review) => review.id === `legacy-review-${index}` && review.status === 'stale')).toBe(true);
    }
  });
});
