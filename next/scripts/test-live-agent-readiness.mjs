import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { sydneyDate, validateLivePayloads } from './audit-live-agent-readiness.mjs';

const expectedSha = 'a'.repeat(40);
const execFileAsync = promisify(execFile);

function fixture(overrides = {}) {
  const event = {
    title: 'Market',
    url: 'https://peninsulainsider.com.au/whats-on/market/',
    startDate: '2026-08-15',
    thisWeekend: true,
  };
  return {
    root: '<link rel="canonical" href="https://peninsulainsider.com.au/" />',
    feed: {
      generated: '2026-08-15',
      count: 1,
      numberOfItems: 1,
      thisWeekend: {
        start: '2026-08-15',
        end: '2026-08-16',
        count: 1,
        label: 'Sat 15 – Sun 16 August',
      },
      itemListElement: [{
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'Event',
          url: event.url,
          startDate: event.startDate,
        },
      }],
      events: [event],
    },
    weekend: '<h1>This weekend</h1><p>Sat 15 – Sun 16 August</p>',
    llms: 'https://peninsulainsider.com.au/whats-on/',
    llmsFull: 'https://peninsulainsider.com.au/',
    sitemap: '<loc>https://peninsulainsider.com.au/</loc>',
    deployment: { sourceSha: expectedSha },
    ...overrides,
  };
}

test('derives the Sydney date across the UTC date boundary', () => {
  assert.equal(sydneyDate(new Date('2026-08-14T14:10:00Z')), '2026-08-15');
});

test('accepts a current, internally consistent live surface', () => {
  assert.deepEqual(
    validateLivePayloads(fixture(), { expectedDate: '2026-08-15', expectedSha }),
    [],
  );
});

test('scheduled checks may validate semantic freshness without an expected deployment SHA', () => {
  assert.deepEqual(validateLivePayloads(fixture(), { expectedDate: '2026-08-15' }), []);
});

test('rejects stale events, stale provenance, and redirect sitemap entries', () => {
  const payloads = fixture();
  payloads.feed.events[0].startDate = '2026-08-14';
  payloads.deployment.sourceSha = 'b'.repeat(40);
  payloads.sitemap += '<loc>https://peninsulainsider.com.au/explore/best-walks/</loc>';
  const failures = validateLivePayloads(payloads, { expectedDate: '2026-08-15', expectedSha });
  assert.ok(failures.some((failure) => failure.includes('expired')));
  assert.ok(failures.some((failure) => failure.includes('live deployment source')));
  assert.ok(failures.some((failure) => failure.includes('redirect/noindex')));
});

test('rejects malformed, reversed, and incorrectly flagged event dates', () => {
  const payloads = fixture();
  payloads.feed.events[0].startDate = 'banana';
  payloads.feed.events[0].endDate = '2026-08-14';
  const failures = validateLivePayloads(payloads, { expectedDate: '2026-08-15', expectedSha });
  assert.ok(failures.some((failure) => failure.includes('malformed or reversed')));
});

test('rejects impossible calendar dates and valid-format reversed ranges', () => {
  const impossible = fixture();
  impossible.feed.events[0].startDate = '2026-99-99';
  assert.ok(
    validateLivePayloads(impossible, { expectedDate: '2026-08-15', expectedSha })
      .some((failure) => failure.includes('malformed or reversed')),
  );

  const reversed = fixture();
  reversed.feed.events[0].startDate = '2026-08-16';
  reversed.feed.events[0].endDate = '2026-08-15';
  assert.ok(
    validateLivePayloads(reversed, { expectedDate: '2026-08-15', expectedSha })
      .some((failure) => failure.includes('malformed or reversed')),
  );
});

test('rejects an event flagged for a weekend it does not intersect', () => {
  const payloads = fixture();
  payloads.feed.events[0].startDate = '2026-08-17';
  const failures = validateLivePayloads(payloads, { expectedDate: '2026-08-15', expectedSha });
  assert.ok(failures.some((failure) => failure.includes('outside the weekend window')));
});

test('command-line audit verifies HTTP status, provenance, and semantic payloads', async (context) => {
  const payloads = fixture();
  const routes = new Map([
    ['/', ['text/html', payloads.root]],
    ['/whats-on/upcoming.json', ['application/json', JSON.stringify(payloads.feed)]],
    ['/whats-on/this-weekend/', ['text/html', payloads.weekend]],
    ['/llms.txt', ['text/plain', payloads.llms]],
    ['/llms-full.txt', ['text/plain', payloads.llmsFull]],
    ['/sitemap.xml', ['application/xml', payloads.sitemap]],
    ['/deployment.json', ['application/json', JSON.stringify(payloads.deployment)]],
  ]);
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const route = routes.get(path);
    if (!route) {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': route[0] });
    response.end(route[1]);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => server.close());

  const address = server.address();
  const script = fileURLToPath(new URL('./audit-live-agent-readiness.mjs', import.meta.url));
  const { stdout } = await execFileAsync(process.execPath, [
    script,
    '--base',
    `http://127.0.0.1:${address.port}`,
    '--expected-date',
    '2026-08-15',
    '--expected-sha',
    expectedSha,
    '--attempts',
    '1',
  ]);
  assert.match(stdout, /Live agent-readiness passed/);
});
