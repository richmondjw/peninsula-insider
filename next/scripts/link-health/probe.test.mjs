import test from 'node:test';
import assert from 'node:assert/strict';
import {verdictFor} from './probe.mjs';

test('a passive challenge script on a real event page is not a bot wall', () => {
  assert.equal(verdictFor({
    code: '200',
    title: 'Trivia Night - British Comedy',
    body: '<main><h1>Trivia Night - British Comedy</h1></main><script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script><script type="application/ld+json">{"@type":"Event"}</script>',
    bytes: 200,
  }), 'ok');
});

test('an actual challenge page remains blocked', () => {
  assert.equal(verdictFor({
    code: '200',
    title: 'Just a moment...',
    body: '<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>',
    bytes: 80,
  }), 'blocked');
});

test('a 200 response with only a challenge script and no main content stays blocked', () => {
  assert.equal(verdictFor({
    code: '200',
    title: 'Loading',
    body: '<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>',
    bytes: 80,
  }), 'blocked');
});
