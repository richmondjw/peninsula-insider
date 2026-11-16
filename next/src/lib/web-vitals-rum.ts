/**
 * Consent-gated real-user Core Web Vitals reporting.
 *
 * CrUX does not currently publish a Peninsula Insider field sample, so this
 * records LCP, INP and CLS into the existing GA4 property for readers who
 * have explicitly allowed analytics. It uses the shared analytics contract:
 * no query strings, user identifiers or raw element details leave the page.
 */

import type { Metric } from 'web-vitals';
import { emit } from './analytics-events.ts';
import { readConsentState } from './v5-analytics.ts';
import { webVitalPayload } from './web-vitals-payload.ts';

const PRODUCTION_HOSTS = new Set(['peninsulainsider.com.au', 'www.peninsulainsider.com.au']);

let installed = false;
let loading = false;
let consentListenerInstalled = false;
let navigationListenerInstalled = false;
let hardNavigationActive = true;
let hardNavigationPath: string | null = null;

type MetricDispatch = typeof emit;

/** Bind delayed metric callbacks to their originating hard navigation. */
export function createWebVitalReporter(
  pagePath: string,
  isActive: () => boolean,
  dispatch: MetricDispatch = emit,
): (metric: Metric) => void {
  return (metric: Metric): void => {
    if (!isActive()) return;
    const payload = webVitalPayload(metric);
    if (!payload) return;
    dispatch('web_vital_observed', payload, {
      component: 'WebVitalsRUM',
      pagePath,
    });
  };
}

async function installObservers(): Promise<void> {
  if (installed || loading || typeof window === 'undefined') return;
  if (!PRODUCTION_HOSTS.has(window.location.hostname)) return;
  if (readConsentState() !== 'granted') return;
  if (!hardNavigationActive || !hardNavigationPath) return;

  loading = true;
  try {
    const { onCLS, onINP, onLCP } = await import('web-vitals');
    if (readConsentState() !== 'granted' || !hardNavigationActive) return;
    installed = true;
    const report = createWebVitalReporter(
      hardNavigationPath,
      () => hardNavigationActive,
    );
    onCLS(report);
    onINP(report);
    onLCP(report);
  } catch {
    // Performance telemetry must never affect the reader experience.
  } finally {
    loading = false;
  }
}

export function initWebVitalsRUM(): void {
  if (typeof window === 'undefined') return;
  hardNavigationPath ??= window.location.pathname;
  if (!navigationListenerInstalled) {
    navigationListenerInstalled = true;
    document.addEventListener('astro:before-preparation', () => {
      // web-vitals measures document navigations, not Astro soft routes. Stop
      // before a soft-route URL can contaminate the originating page sample.
      hardNavigationActive = false;
    }, { once: true });
  }
  void installObservers();
  if (consentListenerInstalled) return;
  consentListenerInstalled = true;
  window.addEventListener('pi:consent-changed', () => {
    void installObservers();
  });
}

