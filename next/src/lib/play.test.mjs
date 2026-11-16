import assert from 'node:assert/strict';
import test from 'node:test';

import { PLAY, playUrl } from './play.ts';

test('campaign links open the case they advertise', () => {
  const url = new URL(playUrl('homepage-card'));

  assert.equal(url.origin, 'https://play.peninsulainsider.com.au');
  assert.equal(url.searchParams.get('case'), PLAY.case.id);
  assert.equal(url.searchParams.get('utm_campaign'), `where-is-pi-case-${PLAY.case.id}`);
  assert.equal(url.searchParams.get('utm_content'), 'homepage-card');
});
