import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_LIVE_STATUS,
  MEDIA_WAIT_MESSAGE,
  fixtureReadyStatus,
  liveStatusAnnouncement,
  mediaWaitStatus,
  nextLiveStatus,
  reviewResultStatus,
} from '../shared/live-status.js';

describe('accessible live status', () => {
  it('deduplicates the exact same event within one run', () => {
    const event = mediaWaitStatus('run-one', 'artifact-hooks', 1, 'video hooks');
    const announced = nextLiveStatus(EMPTY_LIVE_STATUS, event);
    expect(nextLiveStatus(announced, event)).toBe(announced);
    expect(announced.sequence).toBe(1);
  });

  it('announces the same deterministic artifact identity in a second run', () => {
    const first = nextLiveStatus(EMPTY_LIVE_STATUS, mediaWaitStatus('run-one', 'artifact-hooks', 1, 'video hooks'));
    const second = nextLiveStatus(first, mediaWaitStatus('run-two', 'artifact-hooks', 1, 'video hooks'));
    expect(second.sequence).toBe(2);
    expect(second.announcedKeys).toHaveLength(2);
    expect(liveStatusAnnouncement(second)).not.toBe(liveStatusAnnouncement(first));
  });

  it('announces distinct media-WAIT artifacts with distinct exposed text mutations', () => {
    const first = nextLiveStatus(EMPTY_LIVE_STATUS, mediaWaitStatus('run-one', 'artifact-script', 1, '30-second video script'));
    const second = nextLiveStatus(first, mediaWaitStatus('run-one', 'artifact-scenes', 1, 'video scenes'));
    expect(second.sequence).toBe(2);
    expect(second.message).toContain('video scenes');
    expect(second.message).toContain(MEDIA_WAIT_MESSAGE);
    expect(liveStatusAnnouncement(second)).not.toBe(liveStatusAnnouncement(first));
  });

  it('retains launch, media-WAIT and review identities without suppressing one another', () => {
    const events = [
      fixtureReadyStatus('run-fixture', 'Short video', 9),
      mediaWaitStatus('run-fixture', 'artifact-hooks', 1, 'video hooks'),
      reviewResultStatus('run-fixture', 2, 'artifact-hooks', 'video hooks', 'accepted'),
    ];
    const final = events.reduce(nextLiveStatus, EMPTY_LIVE_STATUS);
    expect(final.sequence).toBe(3);
    expect(final.announcedKeys).toEqual(events.map((event) => event.key));
    expect(liveStatusAnnouncement(final)).toBe('Status update 3. video hooks draft handoff accepted.');
  });

  it('includes optional failure count and detail in the one launch announcement', () => {
    const event = fixtureReadyStatus('run-partial', 'Explainer', 4, [{
      key: 'explainer-visualisation',
      detail: 'Optional visualisation fixture failed deterministically.',
    }]);
    const state = nextLiveStatus(EMPTY_LIVE_STATUS, event);
    expect(liveStatusAnnouncement(state)).toBe(
      'Status update 1. Explainer fixture is ready. 4 artifacts loaded for review. Partial pack: 1 optional derivative failed. explainer visualisation: Optional visualisation fixture failed deterministically.',
    );
  });

  it('keeps launch, review and media-WAIT announcements on one dedicated DOM surface', async () => {
    const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
    const statusTags = [...appSource.matchAll(/<[^>]+role="status"[^>]*>/g)].map((match) => match[0]);
    const liveTags = [...appSource.matchAll(/<[^>]+aria-live="polite"[^>]*>/g)].map((match) => match[0]);
    expect(appSource.match(/liveStatusAnnouncement\(liveStatus\)/g)).toHaveLength(1);
    expect(appSource).toContain('role="status" aria-live="polite" aria-atomic="true">{liveStatusAnnouncement(liveStatus)}');
    expect(statusTags).toEqual([
      '<div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">',
      '<div className="notice warning" role="status">',
      '<div className="capture-live" role="status" aria-live="polite">',
      '<section className="empty" role="status">',
    ]);
    expect(liveTags).toEqual([
      '<div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">',
      '<div className="capture-live" role="status" aria-live="polite">',
    ]);
    expect(appSource).not.toMatch(/className="runbar"[^>]*aria-live/);
    expect(appSource).not.toMatch(/className="patch-action"[^>]*(?:role="status"|aria-live)/);
    expect(appSource).not.toMatch(/className="notice warning pack-failures"[^>]*(?:role="status"|aria-live)/);
  });
});
