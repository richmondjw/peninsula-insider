import test from 'node:test';
import assert from 'node:assert/strict';
import { findings, phoneFound, addressFound, CLOSED } from './venue-recheck.mjs';

const venue = { slug: 'x', name: 'X', phone: '+61 3 5989 2000', address: '12 Shoreham Road, Red Hill South VIC 3937', website: 'https://example.com' };
const filler = ' Welcome to our cellar door and restaurant in the hills.'.repeat(6);

test('our phone number is found however their site writes it', () => {
  assert.ok(phoneFound('+61 3 5989 2000', 'Call (03) 5989 2000 today'));
  assert.ok(phoneFound('+61 3 5989 2000', 'tel: 03 5989-2000'));
  assert.ok(!phoneFound('+61 3 5989 2000', 'Call 03 5989 9999'));
});

test('our street address is found by number and street name', () => {
  assert.ok(addressFound('12 Shoreham Road, Red Hill South VIC 3937', 'Find us at 12 Shoreham Rd, Red Hill South'));
  assert.ok(!addressFound('12 Shoreham Road, Red Hill South VIC 3937', 'Find us at 33 Arthurs Seat Road'));
  assert.ok(addressFound('Red Hill VIC', 'anything'), 'an address with no street number is not checked');
});

test('a matching site reports nothing', () => {
  assert.deepEqual(findings(venue, { ok: true, text: `12 Shoreham Road. Phone 03 5989 2000.${filler}` }), []);
});

test('closing language is raised first, with the words around it', () => {
  const found = findings(venue, { ok: true, text: `After ten years we have closed our doors. Thank you.${filler} 12 Shoreham Road 03 5989 2000` });
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'high');
  assert.match(found[0].what, /closed our doors/);
  assert.ok(!CLOSED.test('Closed Mondays and Tuesdays. The cellar door is closed on public holidays.'), 'ordinary closing days are not a closure');
});

test('a site that answers with an error is raised; no answer at all is kept apart', () => {
  assert.equal(findings(venue, { ok: false, status: 404, why: 'status 404' })[0].level, 'high');
  assert.equal(findings(venue, { ok: false, why: 'ENOTFOUND' })[0].level, 'unread');
});

test('a page with almost no text is not compared', () => {
  const found = findings(venue, { ok: true, text: 'Loading' });
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'low');
});
