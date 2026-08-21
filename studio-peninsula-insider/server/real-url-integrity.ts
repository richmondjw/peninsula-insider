import type { CaptureRecord } from '../shared/capture-contracts.js';
import type { FoundryRun } from '../shared/contracts.js';
import { assertRealUrlContentLineage } from './real-url-lineage.js';
import { deriveRealUrlClaims, summarizeCapture } from './real-url-runner.js';

export interface ImmutableCaptureResolver {
  get(attemptId: string): Promise<CaptureRecord | undefined>;
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export async function validateRealUrlRunAgainstResolver(
  run: FoundryRun,
  resolver?: ImmutableCaptureResolver,
): Promise<CaptureRecord | undefined> {
  if (!run.capture) return undefined;
  if (!resolver) throw new Error('Real URL runs require an immutable capture resolver');
  const attemptIds = run.capture.revisions.map((revision) => revision.attemptId);
  if (new Set(attemptIds).size !== attemptIds.length) throw new Error('Capture revision history contains duplicate attempts');
  const records = await Promise.all(attemptIds.map(async (attemptId) => {
    const record = await resolver.get(attemptId);
    if (!record || record.attempt.id !== attemptId) throw new Error('Immutable capture manifest is unavailable');
    return record;
  }));
  records.forEach((record, index) => {
    if (!same(summarizeCapture(record), run.capture!.revisions[index])) throw new Error('Mutable capture summary does not match the immutable manifest');
  });
  const artifactRecord = records.find((record) => record.attempt.id === run.capture!.artifactAttemptId);
  if (!artifactRecord || artifactRecord.attempt.state !== 'extracted') throw new Error('Immutable artifact capture is unavailable');
  if (!same(run.claimSet.claims, deriveRealUrlClaims(artifactRecord))) throw new Error('Mutable claims do not match the immutable extraction');
  assertRealUrlContentLineage(run);
  return artifactRecord;
}
