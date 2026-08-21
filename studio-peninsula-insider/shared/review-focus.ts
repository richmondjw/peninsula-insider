export type ReviewFocusTarget = 'accepted_handoff' | 'reject_action' | 'approve_action';

export interface ReviewFocusElements {
  acceptedHandoff: { focus: () => void } | null;
  rejectAction: { focus: () => void } | null;
  approveAction: { focus: () => void } | null;
}

export interface BoundReviewFocus extends ReviewFocusTargetContext {
  target: ReviewFocusTarget;
}

export interface ReviewFocusTargetContext {
  requestToken: number;
  runId: string;
  artifactId: string;
  navigationEpoch: number;
}

export interface CurrentReviewFocusContext {
  latestRequestToken: number;
  runId: string | null;
  artifactId: string | null;
  navigationEpoch: number;
}

export function reviewFocusAfterSuccess(decision: 'accepted' | 'rejected'): ReviewFocusTarget {
  return decision === 'accepted' ? 'accepted_handoff' : 'reject_action';
}

export function reviewFocusAfterFailure(decision: 'accepted' | 'rejected'): ReviewFocusTarget {
  return decision === 'accepted' ? 'approve_action' : 'reject_action';
}

export function focusReviewTarget(target: ReviewFocusTarget, elements: ReviewFocusElements): boolean {
  const element = target === 'accepted_handoff'
    ? elements.acceptedHandoff
    : target === 'reject_action'
      ? elements.rejectAction
      : elements.approveAction;
  if (!element) return false;
  element.focus();
  return true;
}

export function shouldRestoreReviewFocus(
  pending: ReviewFocusTargetContext,
  current: CurrentReviewFocusContext,
): boolean {
  return pending.requestToken === current.latestRequestToken
    && pending.runId === current.runId
    && pending.artifactId === current.artifactId
    && pending.navigationEpoch === current.navigationEpoch;
}
