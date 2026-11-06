import assert from 'node:assert/strict';
import test from 'node:test';

import { webVitalPayload } from './web-vitals-payload.ts';
import { createWebVitalReporter } from './web-vitals-rum.ts';
import { emit } from './analytics-events.ts';

test('LCP and INP retain millisecond units as stable integers', () => {
  assert.deepEqual(
    webVitalPayload({ name: 'LCP', value: 2487.6, delta: 120.4, rating: 'good', navigationType: 'navigate' }),
    {
      metric: 'LCP',
      metric_value: 2488,
      metric_delta: 120,
      metric_rating: 'good',
      navigation_type: 'navigate',
    },
  );
  assert.equal(webVitalPayload({ name: 'INP', value: Number.NaN, delta: 1, rating: 'poor', navigationType: 'navigate' }), null);
});

test('CLS is scaled by 1000 so GA4 receives an integer without losing precision', () => {
  assert.deepEqual(
    webVitalPayload({ name: 'CLS', value: 0.0874, delta: 0.0121, rating: 'good', navigationType: 'back-forward-cache' }),
    {
      metric: 'CLS',
      metric_value: 87,
      metric_delta: 12,
      metric_rating: 'good',
      navigation_type: 'back-forward-cache',
    },
  );
});

test('only the three Core Web Vitals enter the field stream', () => {
  assert.equal(webVitalPayload({ name: 'FCP', value: 1000, delta: 1000, rating: 'good', navigationType: 'navigate' }), null);
});

test('a delayed metric keeps its originating hard-navigation path and stops after a soft route', () => {
  const calls = [];
  let active = true;
  const report = createWebVitalReporter('/explore/golf/', () => active, (...args) => {
    calls.push(args);
    return true;
  });
  report({ name: 'LCP', value: 2100, delta: 2100, rating: 'good', navigationType: 'navigate' });
  active = false;
  report({ name: 'CLS', value: 0.02, delta: 0.02, rating: 'good', navigationType: 'navigate' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].pagePath, '/explore/golf/');
});

test('the positive transport path queues a consented event with the bound page envelope', () => {
  const calls = [];
  globalThis.window = {
    location: { pathname: '/later-soft-route/' },
    gtag: (...args) => calls.push(args),
  };
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ analytics: true }),
  };
  emit('web_vital_observed', {
    metric: 'LCP',
    metric_value: 2100,
    metric_delta: 2100,
    metric_rating: 'good',
    navigation_type: 'navigate',
  }, { component: 'WebVitalsRUM', pagePath: '/explore/golf/?ignored=true' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'event');
  assert.equal(calls[0][1], 'web_vital_observed');
  assert.equal(calls[0][2].pi_page, '/explore/golf/');
  assert.equal(calls[0][2].metric, 'LCP');
  delete globalThis.window;
  delete globalThis.localStorage;
});

