import test from 'node:test';
import assert from 'node:assert/strict';
import { trackEvent } from './v5-analytics.ts';

test('intent dispatch honours denied, unknown and withdrawn consent even with gtag loaded', () => {
  const calls = [];
  let consent = null;
  globalThis.window = { gtag: (...args) => calls.push(args) };
  globalThis.localStorage = { getItem: () => consent };
  trackEvent('trip_add');
  consent = JSON.stringify({ analytics: false });
  trackEvent('trip_add');
  assert.equal(calls.length, 0);
  consent = JSON.stringify({ analytics: true });
  trackEvent('trip_add', { entity_slug: 'arthurs-seat-eagle', surface: 'me-trip', email: 'private@example.com', trip_title: 'Birthday for James', share_url: '/me/trip/?i=private' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'event');
  assert.equal(calls[0][1], 'trip_add');
  assert.equal(calls[0][2].surface, 'me-trip');
  assert.equal(calls[0][2].pi_consent, 'granted');
  assert.match(calls[0][2].pi_ts, /^\d{4}-/);
  assert.ok(calls[0][2].pi_event_id);
  for (const key of ['email', 'trip_title', 'share_url']) assert.equal(calls[0][2][key], undefined);
  consent = JSON.stringify({ analytics: false });
  trackEvent('trip_share');
  assert.equal(calls.length, 1);
  delete globalThis.window; delete globalThis.localStorage;
});

test('granted consent queues one gtag-compatible event while loader starts', () => {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => JSON.stringify({ analytics: true }) };
  trackEvent('trip_add', { surface: 'me-saved' });
  assert.equal(window.dataLayer.length, 1);
  assert.equal(window.dataLayer[0][0], 'event');
  assert.equal(window.dataLayer[0][1], 'trip_add');
  assert.equal(window.dataLayer[0][2].surface, 'me-saved');
  delete globalThis.window; delete globalThis.localStorage;
});
