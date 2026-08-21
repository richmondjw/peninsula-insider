export interface LiveStatusEvent {
  key: string;
  message: string;
}

export interface LiveStatusState {
  announcedKeys: string[];
  message: string;
  sequence: number;
}

export const EMPTY_LIVE_STATUS: LiveStatusState = { announcedKeys: [], message: '', sequence: 0 };

export const MEDIA_WAIT_MESSAGE = 'Text, script and storyboard review can continue. Media render-ready remains a visible, nonblocking WAIT until exact assets, rights, releases and disclosures are bound.';

export function nextLiveStatus(current: LiveStatusState, event: LiveStatusEvent): LiveStatusState {
  if (current.announcedKeys.includes(event.key)) return current;
  return {
    announcedKeys: [...current.announcedKeys, event.key],
    message: event.message,
    sequence: current.sequence + 1,
  };
}

export function liveStatusAnnouncement(state: LiveStatusState): string {
  return state.sequence > 0 ? `Status update ${state.sequence}. ${state.message}` : '';
}

export function fixtureReadyStatus(
  runId: string,
  recipeLabel: string,
  artifactCount: number,
  failures: Array<{ key: string; detail: string }> = [],
): LiveStatusEvent {
  const partial = failures.length > 0
    ? ` Partial pack: ${failures.length} optional ${failures.length === 1 ? 'derivative' : 'derivatives'} failed. ${failures.map((failure) => `${failure.key.replaceAll('-', ' ')}: ${failure.detail}`).join(' ')}`
    : '';
  return { key: `fixture:${runId}`, message: `${recipeLabel} fixture is ready. ${artifactCount} artifacts loaded for review.${partial}` };
}

export function reviewResultStatus(runId: string, runVersion: number, artifactId: string, label: string, decision: 'accepted' | 'rejected'): LiveStatusEvent {
  return { key: `review:${runId}:${runVersion}:${artifactId}:${decision}`, message: `${label} draft handoff ${decision}.` };
}

export function mediaWaitStatus(runId: string, artifactId: string, artifactVersion: number, label: string): LiveStatusEvent {
  return {
    key: `media-wait:${runId}:${artifactId}:${artifactVersion}`,
    message: `${label}: ${MEDIA_WAIT_MESSAGE}`,
  };
}
