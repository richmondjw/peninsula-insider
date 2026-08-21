import type { CaptureRecord } from '../shared/capture-contracts.js';
import type { FoundryRun } from '../shared/contracts.js';
import { assertRealUrlContentLineage } from './real-url-lineage.js';
import { buildRealUrlRun, summarizeCapture } from './real-url-runner.js';

export interface ImmutableCaptureResolver {
  get(attemptId: string): Promise<CaptureRecord | undefined>;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

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
    if (!same(summarizeCapture(record), run.capture!.revisions[index])) {
      throw new Error('Mutable capture summary does not match the immutable manifest');
    }
  });

  const artifactRecord = records.find((record) => record.attempt.id === run.capture!.artifactAttemptId);
  if (!artifactRecord || artifactRecord.attempt.state !== 'extracted') {
    throw new Error('Immutable artifact capture is unavailable');
  }
  const baseline = buildRealUrlRun(artifactRecord, run.bundle.submittedBy, run.idempotencyKey);
  if (!same(run.claims, baseline.claims)) throw new Error('Mutable claims do not match the immutable extraction');
  if (!same(run.bundle.sourceItems, baseline.bundle.sourceItems)
      || run.bundle.id !== baseline.bundle.id
      || run.bundle.title !== baseline.bundle.title
      || run.bundle.capturedAt !== baseline.bundle.capturedAt) {
    throw new Error('Mutable source items do not match the immutable source revision');
  }
  if (run.angle.id !== baseline.angle.id
      || run.angle.label !== baseline.angle.label
      || run.angle.framing !== baseline.angle.framing
      || run.artifact.angleId !== baseline.artifact.angleId) {
    throw new Error('Artifact metadata does not match the immutable extraction');
  }
  for (const blocker of baseline.blockers) {
    if (!run.blockers.includes(blocker)) throw new Error('Immutable source restriction blocker is missing');
  }
  assertRealUrlContentLineage(run);
  return artifactRecord;
}
