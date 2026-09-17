/**
 * Saves analytics - thin shim over `window.gtag`.
 *
 * All save / share / fork / print events on Peninsula Insider go through
 * `track()` so we have a single place to add buffering, debouncing, or
 * an alternative analytics destination later. Today it forwards to GA4
 * if `gtag` is available, otherwise queues into `dataLayer`, otherwise
 * no-ops silently (CookieBanner gates the gtag loader so events fire
 * only after consent).
 *
 * Event naming convention: `pi_<noun>_<verb>` - flat, lowercase,
 * snake_case. Keeps the GA4 explorer readable and groups all PI
 * events together in any reporting view.
 */

import { sanitiseParams } from '../analytics-contract';

export type SaveEvent =
  | 'pi_save'           // card or article saved
  | 'pi_unsave'         // card or article unsaved
  | 'pi_share_item'     // share button on a card or article
  | 'pi_plan_share'     // share-plan toolbar button on /account/saved/
  | 'pi_plan_print'     // print-plan toolbar button on /account/saved/
  | 'pi_plan_clear'     // clear-plan toolbar button on /account/saved/
  | 'pi_plan_fork';     // editorial-itinerary fork OR shared-plan fork

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Consent, read from the same record the gtag loader and v5-analytics read
 * (localStorage 'pi-consent-v1', written by CookieBanner).
 *
 * This check used to be missing. `gtag` only exists after consent, so the
 * first branch below was gated, but the dataLayer fallback was not: a reader
 * who had refused analytics, or who had not answered the banner at all,
 * still had every save, unsave, share, fork, print and clear buffered into
 * window.dataLayer. Nothing transmitted it today (the site loads gtag.js,
 * which ignores object-form pushes, and there is no GTM container), so this
 * was a loaded gun rather than a live leak - adding a container would have
 * flushed the lot on the next pageview. PI-024, 2026-09-13.
 */
function analyticsConsented(): boolean {
  try {
    const raw = localStorage.getItem('pi-consent-v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { analytics?: boolean } | null;
    return !!(parsed && parsed.analytics);
  } catch {
    return false;
  }
}

export function track(name: SaveEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitised = sanitiseParams(params);
    const safeParams = sanitised.redacted > 0
      ? { ...sanitised.params, pi_redacted: sanitised.redacted }
      : sanitised.params;
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, safeParams);
      return;
    }
    if (!analyticsConsented()) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...safeParams });
  } catch {
    /* never let analytics break a click handler */
  }
}
