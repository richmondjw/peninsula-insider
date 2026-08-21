import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
  focusReviewTarget,
  reviewFocusAfterFailure,
  reviewFocusAfterSuccess,
  shouldRestoreReviewFocus,
  type ReviewFocusElements,
} from '../shared/review-focus.js';

function elements(): { values: ReviewFocusElements; spies: Record<keyof ReviewFocusElements, ReturnType<typeof vi.fn>> } {
  const spies = {
    acceptedHandoff: vi.fn(),
    rejectAction: vi.fn(),
    approveAction: vi.fn(),
  };
  return {
    spies,
    values: {
      acceptedHandoff: { focus: spies.acceptedHandoff },
      rejectAction: { focus: spies.rejectAction },
      approveAction: { focus: spies.approveAction },
    },
  };
}

describe('review focus restoration', () => {
  it('moves an accepted review to its newly available handoff link', () => {
    const { values, spies } = elements();
    expect(focusReviewTarget(reviewFocusAfterSuccess('accepted'), values)).toBe(true);
    expect(spies.acceptedHandoff).toHaveBeenCalledOnce();
    expect(spies.rejectAction).not.toHaveBeenCalled();
    expect(spies.approveAction).not.toHaveBeenCalled();
  });

  it('returns a rejected review to the stable Reject action', () => {
    const { values, spies } = elements();
    expect(focusReviewTarget(reviewFocusAfterSuccess('rejected'), values)).toBe(true);
    expect(spies.rejectAction).toHaveBeenCalledOnce();
  });

  it('restores a failed review request to its triggering action', () => {
    for (const decision of ['accepted', 'rejected'] as const) {
      const { values, spies } = elements();
      expect(focusReviewTarget(reviewFocusAfterFailure(decision), values)).toBe(true);
      expect(decision === 'accepted' ? spies.approveAction : spies.rejectAction).toHaveBeenCalledOnce();
    }
  });

  it('waits safely when the after-commit target is not mounted yet', () => {
    const { values, spies } = elements();
    expect(focusReviewTarget('accepted_handoff', { ...values, acceptedHandoff: null })).toBe(false);
    expect(spies.acceptedHandoff).not.toHaveBeenCalled();
  });

  it('wires the after-commit targets to the rendered review controls', async () => {
    const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(appSource).toContain('setPendingReviewFocus({ ...request, target: reviewFocusAfterSuccess(decision) })');
    expect(appSource).toContain('setPendingReviewFocus({ ...request, target: reviewFocusAfterFailure(decision) })');
    expect(appSource).toContain('if (operation || !pendingReviewFocus) return;');
    expect(appSource).toContain('upsertRun(body, false)');
    expect(appSource).toContain('acceptedHandoffs.current.get(pendingReviewFocus.artifactId)');
    expect(appSource).not.toContain('requestAnimationFrame');
  });

  it('restores focus only for the current token, run, artifact and navigation epoch', () => {
    const pending = { requestToken: 4, runId: 'run-a', artifactId: 'artifact-a', navigationEpoch: 7 };
    const current = { latestRequestToken: 4, runId: 'run-a', artifactId: 'artifact-a', navigationEpoch: 7 };
    expect(shouldRestoreReviewFocus(pending, current)).toBe(true);
    expect(shouldRestoreReviewFocus(pending, { ...current, latestRequestToken: 5 })).toBe(false);
    expect(shouldRestoreReviewFocus(pending, { ...current, runId: 'run-b' })).toBe(false);
    expect(shouldRestoreReviewFocus(pending, { ...current, artifactId: 'artifact-b' })).toBe(false);
    expect(shouldRestoreReviewFocus(pending, { ...current, navigationEpoch: 8 })).toBe(false);
  });

  it('rejects stale and navigated focus requests without touching any target', () => {
    const { values, spies } = elements();
    const pending = { requestToken: 2, runId: 'run-a', artifactId: 'artifact-a', navigationEpoch: 1 };
    const scenarios = [
      { latestRequestToken: 3, runId: 'run-a', artifactId: 'artifact-a', navigationEpoch: 1 },
      { latestRequestToken: 2, runId: 'run-b', artifactId: 'artifact-a', navigationEpoch: 1 },
      { latestRequestToken: 2, runId: 'run-a', artifactId: 'artifact-b', navigationEpoch: 1 },
      { latestRequestToken: 2, runId: 'run-a', artifactId: 'artifact-a', navigationEpoch: 2 },
    ];
    for (const current of scenarios) {
      if (shouldRestoreReviewFocus(pending, current)) focusReviewTarget('accepted_handoff', values);
    }
    expect(spies.acceptedHandoff).not.toHaveBeenCalled();
    expect(spies.rejectAction).not.toHaveBeenCalled();
    expect(spies.approveAction).not.toHaveBeenCalled();
  });
});
