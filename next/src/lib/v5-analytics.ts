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
 * Consent gating mirrors the BaseLayout gtag loader exactly: gtag.js is
 * only injected after the reader opts in via CookieBanner (localStorage
 * key 'pi-consent-v1', change event 'pi:consent-changed'). So:
 *   1. window.gtag exists  -> consent was granted, send through gtag.
 *   2. no gtag but stored consent grants analytics -> queue into dataLayer
 *      (the loader drains it when it injects gtag later this pageview).
 *   3. otherwise -> no-op. Nothing is stored, nothing leaves the page.
 */

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

function analyticsConsented(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { analytics?: boolean } | null;
    return !!(parsed && parsed.analytics);
  } catch {
    return false;
  }
}

/**
 * Send one event to GA4, consent-gated. Safe to call from any handler;
 * never throws, no-ops on the server and for unconsented readers.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    };
    if (typeof w.gtag === 'function') {
      // gtag only exists post-consent (BaseLayout loader), so this is gated.
      w.gtag('event', name, params);
      return;
    }
    if (analyticsConsented()) {
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: name, ...params });
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
