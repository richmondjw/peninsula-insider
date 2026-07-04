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

export function track(name: SaveEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...params });
  } catch {
    /* never let analytics break a click handler */
  }
}
