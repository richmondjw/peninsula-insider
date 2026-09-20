import test from 'node:test';
import assert from 'node:assert/strict';
import { isJournalEditorial, isJournalDiscovery, visibleArticleTags } from './journal-curation.mjs';

test('automatic dated Picks cannot crowd out editorial discovery, including featured Picks', () => {
  const story = {status: 'published', tags: ['wine'], publishedAt: new Date('2026-09-01')};
  const picks = Array.from({length: 100}, () => ({status: 'published', tags: ['insider-picks', 'spring'], featured: true}));
  assert.deepEqual([...picks, story].filter(isJournalEditorial), [story]);
  assert.equal(isJournalEditorial({...story, status: 'draft'}), false);
  assert.equal(isJournalEditorial({...story, section: 'plans'}), false);
});

test('Picks labels are cadence-neutral without rewriting content metadata', () => {
  const data = {tags: ['insider-picks', 'Weekly', ' DAILY ', 'spring', 'family']};
  assert.deepEqual(visibleArticleTags(data), ['insider-picks', 'spring', 'family']);
  assert.equal(data.tags.length, 5);
  assert.deepEqual(visibleArticleTags({tags: ['weekly', 'markets']}), ['weekly', 'markets']);
});

test('expired seasonal pieces leave promotion while retaining editorial archive eligibility', () => {
 const story = {status:'published', tags:['family'], promotionExpiresAt:'2026-10-04T13:00:00Z'};
 assert.equal(isJournalDiscovery(story, Date.parse('2026-10-04T12:59:59Z')), true);
 assert.equal(isJournalDiscovery(story, Date.parse('2026-10-04T13:00:00Z')), false);
 assert.equal(isJournalEditorial(story), true);
 assert.equal(isJournalDiscovery({...story, promotionExpiresAt:'bad-date'}), false);
 assert.equal(isJournalDiscovery({status:'published'}), true);
});
