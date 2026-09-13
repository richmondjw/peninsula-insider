/**
 * analytics-events - the runtime half of the PI-024 measurement contract.
 *
 * analytics-contract.ts holds the pure rules (envelope, redaction, dedup,
 * the booking-click decision). This file is the only place those rules meet
 * the browser. It exists so that:
 *
 *   1. There is ONE exit. Every contract event is built here and dispatched
 *      through `trackEvent` in v5-analytics.ts, which is consent-gated. No
 *      component talks to gtag or dataLayer directly.
 *   2. Inline scripts can play. Several of the surfaces that needed
 *      instrumenting (/itinerary/, /partners/, the search overlay, /search/)
 *      run inside `is:inline` blocks that cannot import a module, so this
 *      file publishes `window.piTrack` for them. It is a bridge, not a
 *      second dispatcher: `window.piTrack` IS `emit`.
 *   3. Two surfaces are instrumented without editing them. The plan context
 *      chips and the corrections mailto links are owned by other work in
 *      flight, so they are picked up by delegated listeners here keyed off
 *      markup that already exists.
 *
 * WHAT THIS FILE WILL NOT DO. It will not record a success that did not
 * happen. An outbound booking click is a click, not a booking. A partner
 * enquiry that opened a mail client is a handoff, not a submission. The
 * event names below say which is which, and docs/analytics-dictionary.md
 * says it again in the one place a future reader will look.
 */

import {
  bookingClickDecision,
  eventEnvelope,
  lengthBucket,
  makeDeduper,
  safePagePath,
  type EnvelopeContext,
} from './analytics-contract';
import { readConsentState, trackEvent } from './v5-analytics';

/**
 * Build identity. Set PUBLIC_RELEASE_SHA in the deploy workflow (it is wired
 * to github.sha alongside SOURCE_SHA). Local and preview builds report
 * 'unreleased' rather than a plausible-looking lie.
 */
const RELEASE: string =
  (import.meta.env.PUBLIC_RELEASE_SHA as string | undefined)?.slice(0, 12) || 'unreleased';

/** One dedup gate for the whole page, so keys are comparable across surfaces. */
const gate = makeDeduper();

/** Collision-resistant enough to join a start/success pair. Never a user id. */
export function newId(): string {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    /* fall through to the timestamp form */
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export interface EmitOptions {
  /** Component or surface that owns the call site. */
  component?: string;
  /** Dedup key. Identify the intent, not the element. Omit to skip dedup. */
  dedupKey?: string;
  dedupMs?: number;
}

/**
 * Build and dispatch one contract event. Returns false when the event was
 * suppressed by the dedup gate, true otherwise; it does NOT report whether
 * anything reached GA4, because that depends on consent and no call site has
 * any business branching on a reader's consent choice.
 */
export function emit(
  name: string,
  params: Record<string, unknown> = {},
  opts: EmitOptions = {},
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (opts.dedupKey && !gate(opts.dedupKey, opts.dedupMs)) return false;
    const ctx: EnvelopeContext = {
      eventId: newId(),
      timestamp: new Date().toISOString(),
      pagePath: safePagePath(window.location.pathname),
      release: RELEASE,
      consentState: readConsentState(),
      component: opts.component,
    };
    trackEvent(name, eventEnvelope(name, params, ctx));
    return true;
  } catch {
    /* analytics must never break an interaction */
    return false;
  }
}

/* ------------------------------------------------------------------------ */
/* Delegated listeners                                                       */
/* ------------------------------------------------------------------------ */

function siteHost(): string {
  try {
    return window.location.hostname;
  } catch {
    return '';
  }
}

/**
 * booking_outbound_clicked.
 *
 * One capture-phase listener for every outbound booking affordance on the
 * site. Capture phase because a same-tab outbound link starts unloading the
 * document the moment the default action runs, and several booking CTAs are
 * same-tab by design. Bubble phase would lose them.
 *
 * A link opts in by carrying data-pi-book="<kind>". Nothing else is counted:
 * a "visit website" link is not a reservation intent, and inflating the one
 * number the commercial gates read would be the most expensive kind of
 * wrong. The rule itself lives in bookingClickDecision() so it is testable.
 */
function onOutboundClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return;

  if (anchor.dataset.piIntent === 'correction') {
    // A mailto click is a reader reaching for the correction channel. It is
    // NOT correction_submitted: nothing on this site can observe whether the
    // mail was ever sent. See the dictionary entry for the distinction.
    const surface = anchor.dataset.piSurface || 'unknown';
    emit(
      'correction_channel_opened',
      { surface },
      { component: 'CorrectionLink', dedupKey: 'correction:' + surface },
    );
    return;
  }

  const decision = bookingClickDecision({
    href: anchor.getAttribute('href'),
    siteHost: siteHost(),
    kind: anchor.dataset.piBook,
    entityType: anchor.dataset.entityType || anchor.dataset.piEntityType,
    entitySlug: anchor.dataset.entitySlug || anchor.dataset.piEntitySlug,
    surface: anchor.dataset.surface || anchor.dataset.piSurface,
    provider: anchor.dataset.piProvider,
  });
  if (!decision.fire) return;

  const key =
    'booking:' +
    String(decision.params.destination_host) +
    ':' +
    String(decision.params.entity_id ?? '') +
    ':' +
    String(decision.params.surface ?? '');

  emit('booking_outbound_clicked', decision.params, {
    component: 'OutboundBooking',
    dedupKey: key,
  });
}

/**
 * plan_context_changed.
 *
 * The /explore/plans/ context chips belong to PlanContextEngine.astro, which
 * this ticket must not edit. The chips already carry data-plan-context and
 * aria-pressed, which is enough to measure the change from outside without
 * touching the component. A click on the already-selected chip is not a
 * change and is not recorded.
 *
 * Known gap: a context restored from ?context= on page load fires nothing,
 * because no click happened. Recorded in the dictionary rather than faked.
 */
function onPlanContextClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  const chip = target?.closest?.('[data-plan-context]') as HTMLElement | null;
  if (!chip) return;
  const contextId = chip.dataset.planContext;
  if (!contextId) return;
  if (chip.getAttribute('aria-pressed') === 'true') return;

  const active = document.querySelector(
    '[data-plan-context][aria-pressed="true"]',
  ) as HTMLElement | null;

  emit(
    'plan_context_changed',
    {
      context_id: contextId,
      previous_context_id: active?.dataset.planContext || '',
      surface: 'explore-plans',
    },
    { component: 'PlanContextEngine', dedupKey: 'plan-context:' + contextId },
  );
}

let installed = false;

/**
 * Install the contract listeners and publish the inline-script bridge.
 * Idempotent, and safe to call from a layout that runs on every page.
 */
export function initContractAnalytics(): void {
  if (typeof document === 'undefined' || installed) return;
  installed = true;

  const w = window as unknown as {
    piTrack?: typeof emit;
    piAnalytics?: {
      emit: typeof emit;
      newId: typeof newId;
      lengthBucket: typeof lengthBucket;
    };
  };
  w.piTrack = emit;
  // lengthBucket travels with the bridge so an inline script can describe the
  // SHAPE of a query or a note without ever handling the text itself.
  w.piAnalytics = { emit, newId, lengthBucket };

  document.addEventListener('click', onOutboundClick, true);
  document.addEventListener('click', onPlanContextClick, true);
}
