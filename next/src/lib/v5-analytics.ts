import { eventEnvelope, sanitiseParams } from './analytics-contract.ts';
/**
 * v5-analytics - the ONE GA4 dispatch utility for the v5 component system.
 *
 * Every v5 component carries plain `data-evt` attributes; this module owns
 * the single delegated click listener that turns those attributes into GA4
 * events. Other build agents import { trackEvent, initV5Analytics } from
 * here rather than writing their own gtag calls (BUILD-CONTRACT convention).
 *
 * Event registry (names fixed in 07-design-system/component-specifications.md
 * section 0.2 and the build contract). Click-delegated events handled here:
 *
 *   card_click        Card link (all variants)
 *   save_add          SaveControl toggle on   (sent via trackEvent)
 *   save_remove       SaveControl toggle off  (sent via trackEvent)
 *   plan_fork         SaveControl fork variant
 *   trip_add          Card "+ Trip" affordance (behaviour wired by the
 *                     store agent later; the click event fires from day one)
 *   book_out          BookingControl outbound click
 *   filter_apply      FilterBar chips (filter agent)
 *   ask_open          Ask PI triggers, EmptyState secondary action
 *   dispatch_submit   Dispatch/newsletter forms (page agents)
 *   map_toggle        List/Map toggle (map agent)
 *   empty_state_cta   EmptyState primary action
 *   error_retry       ErrorState retry button
 *   alert_dismiss     Alert dismiss button
 *
 * Not handled here: card_impression (needs IntersectionObserver batching,
 * owned by the store agent when it wires saves/trip behaviour).
 *
 * Consent is checked on every call against pi-consent-v1. A loaded gtag
 * does not imply continuing consent: withdrawal suppresses further events.
 * With granted consent, dispatch through gtag or queue its argument tuple
 * while the loader starts. Unknown/denied consent stores and sends nothing.
 * All v5 events use the shared redaction/envelope contract. */

const CONSENT_KEY = 'pi-consent-v1';

/** Payload keys read off the element (data-* -> snake_case param). */
const PARAM_ATTRS: Array<[string, string]> = [
  ['entityType', 'entity_type'],
  ['entitySlug', 'entity_slug'],
  ['variant', 'variant'],
  ['surface', 'surface'],
  ['position', 'position'],
  ['label', 'label'],
  ['region', 'region'],
  ['action', 'action'],
];

/**
 * Three-state consent, because "not granted" and "refused" are different
 * facts and the warehouse needs to tell them apart. `unknown` means the
 * reader has not answered the CookieBanner yet (no stored record, or a
 * record written by an older schema version).
 */
export type ConsentState = 'granted' | 'denied' | 'unknown';

/** Read the stored consent record. Never throws; never writes. */
export function readConsentState(): ConsentState {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return 'unknown';
    const parsed = JSON.parse(raw) as { analytics?: boolean } | null;
    if (!parsed || typeof parsed !== 'object') return 'unknown';
    if (typeof parsed.analytics !== 'boolean') return 'unknown';
    return parsed.analytics ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

function analyticsConsented(): boolean {
  return readConsentState() === 'granted';
}

/**
 * Send one event to GA4, consent-gated. Safe to call from any handler;
 * never throws, no-ops on the server and for unconsented readers.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !analyticsConsented()) return;
  try {
    if (params.pi_event !== name || params.pi_schema !== 1) {
      params = eventEnvelope(name, params, {
        eventId: globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        timestamp: new Date().toISOString(),
        pagePath: window.location?.pathname || '/',
        release: import.meta.env?.PUBLIC_RELEASE_SHA?.slice(0, 12) || 'unreleased',
        consentState: 'granted',
      });
    }
    const { params: safe } = sanitiseParams(params);
    // Contract-generated timestamps/UUIDs contain digits that the general
    // phone detector intentionally rejects. Restore only validated formats.
    if (params.pi_event === name && params.pi_schema === 1) {
      if (typeof params.pi_ts === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(params.pi_ts)) safe.pi_ts = params.pi_ts;
      if (typeof params.pi_event_id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(params.pi_event_id)) safe.pi_event_id = params.pi_event_id;
    }
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    };
    if (typeof w.gtag === 'function') {
      // Check current consent above: gtag can remain loaded after withdrawal.
      w.gtag('event', name, safe);
      return;
    }
    if (analyticsConsented()) {
      w.dataLayer = w.dataLayer || [];
      // gtag drains argument tuples, not generic dataLayer objects.
      w.dataLayer.push(['event', name, safe]);
    }
    // No consent, no dispatch. Deliberate no-op.
  } catch {
    /* analytics must never break a click */
  }
}

function paramsFrom(el: HTMLElement): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [dataKey, paramKey] of PARAM_ATTRS) {
    const value = el.dataset[dataKey];
    if (value !== undefined && value !== '') {
      params[paramKey] = paramKey === 'position' ? Number(value) : value;
    }
  }
  return params;
}

let installed = false;

/**
 * Install the one delegated [data-evt] click listener. Idempotent: every
 * v5 component script calls this on load and only the first call binds.
 */
export function initV5Analytics(): void {
  if (typeof document === 'undefined' || installed) return;
  installed = true;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      const el = target?.closest?.('[data-evt]') as HTMLElement | null;
      if (!el) return;
      const name = el.dataset.evt;
      if (!name) return;
      trackEvent(name, paramsFrom(el));
    },
    // Capture so book_out and card_click fire before navigation unloads us.
    true,
  );
}
