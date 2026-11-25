import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { BUILD_CLOCK_MAX_AGE_MS, acceptBuildInstant, readBuildInstant } from './build-clock.mjs';

const now = new Date('2026-11-25T13:09:00.000Z'); // 00:09 on 26 November in Melbourne.
const ago = (ms) => new Date(now.getTime() - ms).toISOString();

test('accepts the instant of a build that started minutes ago', () => {
  const result = acceptBuildInstant('2026-11-25T12:58:00.000Z', now);
  assert.equal(result.accepted, true);
  assert.equal(result.instant.toISOString(), '2026-11-25T12:58:00.000Z');
});

test('the window is inclusive at its edge and closed one millisecond past it', () => {
  assert.equal(acceptBuildInstant(ago(BUILD_CLOCK_MAX_AGE_MS), now).accepted, true);
  const past = acceptBuildInstant(ago(BUILD_CLOCK_MAX_AGE_MS + 1), now);
  assert.equal(past.accepted, false);
  assert.match(past.reason, /old; a build's own clock is accepted for 2\.0 h/);
});

test('refuses an instant ahead of the checking clock', () => {
  const result = acceptBuildInstant(ago(-1), now);
  assert.equal(result.accepted, false);
  assert.match(result.reason, /ahead of this clock/);
});

test('refuses anything that is not a full UTC instant', () => {
  for (const value of [undefined, null, 0, '', '2026-11-25', '2026-11-25T12:58:00+11:00', 'yesterday', '2026-13-45T99:99:99.000Z']) {
    assert.equal(acceptBuildInstant(value, now).accepted, false, String(value));
  }
});

test('reads the instant from a built site, and refuses a site without one', () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-build-clock-'));
  try {
    assert.match(readBuildInstant(root, now).reason, /no \/whats-on\/upcoming\.json/);
    mkdirSync(join(root, 'whats-on'));
    const feed = join(root, 'whats-on', 'upcoming.json');
    writeFileSync(feed, '{not json');
    assert.match(readBuildInstant(root, now).reason, /not valid JSON/);
    writeFileSync(feed, JSON.stringify({ generated: '2026-11-25' }));
    assert.equal(readBuildInstant(root, now).accepted, false);
    writeFileSync(feed, JSON.stringify({ generatedAt: ago(60_000) }));
    assert.equal(readBuildInstant(root, now).accepted, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
