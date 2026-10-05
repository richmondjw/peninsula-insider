import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { approvedEventContent, currentVerifiedPrice, isVerifiedPriceRecord, isPublicEventRecord, eventContentKind, refreshVerifiedPriceElements } from './event-publication.mjs';

const now = new Date('2026-10-04T00:00:00Z');
const price = { label: 'Adults AUD 25; children AUD 10', sourceUrl: 'https://organiser.example/tickets', checkedAt: '2026-10-03T00:00:00Z', validUntil: '2026-10-07T00:00:00Z' };
test('price needs an explicit safe source and bounded validity', () => {
  assert.equal(currentVerifiedPrice({ verifiedPrice: price }, now).label, price.label);
  for (const override of [{ sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://user:secret@example.com/' }, { checkedAt: 'invalid' }, { checkedAt: null }, { validUntil: null }, { checkedAt: '2026-10-05T00:00:00Z' }, { validUntil: now.toISOString() }, { checkedAt: '2026-09-26T00:00:00Z' }]) {
    assert.equal(currentVerifiedPrice({ verifiedPrice: { ...price, ...override } }, now), null);
  }
  assert.equal(isVerifiedPriceRecord({ ...price, validUntil: price.checkedAt }), false);
});
test('future expiry cannot extend price freshness beyond seven days', () => {
  const actual = currentVerifiedPrice({ verifiedPrice: { ...price, validUntil: '2027-01-01' } }, now);
  assert.equal(actual.expiresAt, '2026-10-10T00:00:00.000Z');
});
test('drafts and unapproved intelligence records have no public URL', () => {
  for (const status of ['draft', 'review', 'scheduled', 'archived']) assert.equal(isPublicEventRecord({ status }), false);
  assert.equal(isPublicEventRecord({ status: 'published' }), true);
  assert.equal(isPublicEventRecord({ status: 'published', intelligence: {} }), false);
  const intelligence = { revision: 'rev-1', approvedBy: 'James', approvedAt: now, reviewedAt: now, factScore: 96, evidenceIds: ['evidence-1'] };
  intelligence.approvedContent = approvedEventContent({ status: 'published', intelligence });
  assert.equal(isPublicEventRecord({ status: 'published', intelligence }), true);
  assert.equal(isPublicEventRecord({ status: 'published', intelligence: { ...intelligence, factScore: 89 } }), false);
});
test('content kinds preserve explicit labels and recognise flexible legacy experiences', () => {
  assert.equal(eventContentKind({ contentKind: 'offer' }), 'offer');
  assert.equal(eventContentKind({ dateBasis: 'on-request' }), 'experience');
  assert.equal(eventContentKind({}), 'event');
});

// Load the actual TypeScript implementation with Node's own type erasure.
// The feature flag is injected so both schema paths can be tested without an
// Astro runtime or a mutable production expiry heartbeat.
async function eventsModule(enabled) {
  let source = await readFile(new URL('./events.ts', import.meta.url), 'utf8');
  source = stripTypeScriptTypes(source);
  source = source.replace(/import \{ USE_OCCURRENCE_MODEL \} from ['"]\.\/features['"];?/, `const USE_OCCURRENCE_MODEL = ${enabled};`);
  source = source.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => {
    if (!specifier.startsWith('.')) return `from '${specifier}'`;
    return `from '${new URL(specifier, import.meta.url).href}'`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
for (const enabled of [true, false]) {
  test(`actual JSON-LD omits unknown availability and online attendance (model ${enabled})`, async () => {
    const { eventJsonLd } = await eventsModule(enabled);
    const data = { slug: 'test', title: 'A physical event', summary: 'Summary', startDate: new Date('2026-12-01'), recurrence: 'one-off', indoorOutdoor: 'Indoor / Outdoor', bookingUrl: 'https://example.com/book', bookingStatus: 'unknown', status: 'published' };
    const ld = eventJsonLd({ data }, 'https://peninsulainsider.com.au');
    assert.equal(ld.startDate, '2026-12-01');
    assert.equal('endDate' in ld, false);
    assert.equal('availability' in ld.offers, false);
    assert.equal(ld.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
    assert.equal(eventJsonLd({ data: { ...data, bookingStatus: 'open' } }, 'https://example.com').offers.availability, 'https://schema.org/InStock');
    assert.equal('availability' in eventJsonLd({ data: { ...data, bookingStatus: 'open', cancelled: true } }, 'https://example.com').offers, false);
  });
}
test('actual timed schema resolves Melbourne DST and preserves unknown end', async () => {
  const { eventJsonLd } = await eventsModule(true);
  const data = { slug: 'timed', title: 'Timed', summary: 'Summary', startDate: new Date('2026-12-01'), startTime: '11:00', recurrence: 'one-off', status: 'published' };
  const ld = eventJsonLd({ data }, 'https://example.com');
  assert.equal(ld.startDate, '2026-12-01T11:00:00+11:00');
  assert.equal('endDate' in ld, false);
  assert.equal(eventJsonLd({ data: { ...data, endTime: '12:00' } }, 'https://example.com').endDate, '2026-12-01T12:00:00+11:00');
});

test('static price remains hidden without JavaScript and is withdrawn at expiry', () => {
  const value = { hidden: true };
  const fallback = { hidden: false };
  const row = {
    getAttribute: (name) => name === 'data-price-checked' ? '2026-10-03T00:00:00Z' : '2026-10-07T00:00:00Z',
    querySelector: (selector) => selector === '[data-price-current]' ? value : fallback,
  };
  const root = { querySelectorAll: () => [row] };
  assert.equal(refreshVerifiedPriceElements(root, now.getTime()), Date.parse('2026-10-07T00:00:00Z'));
  assert.equal(value.hidden, false);
  assert.equal(fallback.hidden, true);
  assert.equal(refreshVerifiedPriceElements(root, Date.parse('2026-10-07T00:00:00Z')), null);
  assert.equal(value.hidden, true);
  assert.equal(fallback.hidden, false);
});

test('formerly published archives remain addressable; never-published archives stay private',()=>{assert.equal(isPublicEventRecord({status:'archived',publishedAt:'2026-04-09'}),true);assert.equal(isPublicEventRecord({status:'archived'}),false);assert.equal(isPublicEventRecord({status:'archived',publishedAt:'invalid'}),false);assert.equal(isPublicEventRecord({status:'archived',publishedAt:'2026-04-09',intelligence:{}}),false);});

 test('public intelligence receipts require James and completed approval and review', () => {
  const intelligence = { revision: 'synthetic', approvedBy: 'James', approvedAt: '2026-10-03T00:00:00Z', reviewedAt: '2026-10-02T00:00:00Z', factScore: 96, evidenceIds: ['synthetic'] };
  intelligence.approvedContent = approvedEventContent({ status: 'published', intelligence });
  assert.equal(isPublicEventRecord({ status: 'published', intelligence }, now), true);
  assert.equal(isPublicEventRecord({status:'published', intelligence:{...intelligence, reviewedAt:'2026-10-03T01:00:00Z'}}, now), true);
  for (const change of [{approvedBy: 'Someone else'}, {approvedAt: '2026-10-05T00:00:00Z'}, {reviewedAt: '2026-10-05T00:00:00Z'}]) {
    assert.equal(isPublicEventRecord({status: 'published', intelligence: {...intelligence, ...change}}, now), false);
  }
 });

test('public edits withdraw stale approval while Astro date normalisation remains stable',()=>{
 const data={status:'published',slug:'synthetic-bound',title:'Approved title',startDate:'2026-10-10',venueName:'Gallery',place:'mornington',verifiedPrice:{...price},intelligence:{revision:'synthetic',approvedBy:'James',approvedAt:'2026-10-03',reviewedAt:'2026-10-03',factScore:100,evidenceIds:['synthetic'],geography:{shireConfirmed:true,verifiedBy:'James',evidenceId:'geo',checkedAt:'2026-10-03'}}};
 data.intelligence.approvedContent=approvedEventContent(data);assert.equal(isPublicEventRecord(data,now),true);
 assert.equal(isPublicEventRecord({...data,startDate:new Date(data.startDate),place:{id:'mornington',collection:'places'},verifiedPrice:{...price,checkedAt:new Date(price.checkedAt),validUntil:new Date(price.validUntil)},intelligence:{...data.intelligence,geography:{...data.intelligence.geography,checkedAt:new Date('2026-10-03')}}},now),true);
 for(const edit of [{title:'Changed title'},{startDate:'2026-10-11'},{place:'frankston'},{coordinates:{lat:-38.2,lng:145}},{editorNote:'New unapproved claim'},{verifiedPrice:{...price,label:'New price'}}])assert.equal(isPublicEventRecord({...data,...edit},now),false);
 assert.equal(isPublicEventRecord({...data,intelligence:{...data.intelligence,geography:{...data.intelligence.geography,shireConfirmed:false}}},now),false);
});

for (const enabled of [true, false]) {
  for (const [signal, cancellation] of [
    ['flag', { cancelled: true }],
    ['verification status', { verificationStatus: 'Updated after organiser cancellation notice' }],
    ['summary prefix', { summary: 'Cancelled: this edition will not go ahead' }],
    ['editor withdrawal', { skipThis: true }],
  ]) {
    test(`cancelled edition preserves dates/status and omits schedule using ${signal} (model ${enabled})`, async () => {
      const { eventJsonLd, eventCalendarUrl } = await eventsModule(enabled);
      const data = { slug: 'cancelled-edition', title: '3 October edition', summary: 'Fixture',
        startDate: new Date('2026-10-03'), endDate: new Date('2026-10-03'),
        nextOccurrence: new Date('2026-11-07'), recurrence: 'monthly', status: 'published',
        bookingUrl: 'https://example.com/book', bookingStatus: 'open', ...cancellation };
      const ld = eventJsonLd({ data }, 'https://example.com');
      assert.equal(ld.startDate, '2026-10-03');
      assert.equal(ld.endDate, '2026-10-03');
      assert.equal(ld.eventStatus, 'https://schema.org/EventCancelled');
      assert.equal('eventSchedule' in ld, false);
      assert.equal('availability' in ld.offers, false);
      const calendar = new URL(eventCalendarUrl(data, 'https://example.com/edition/'));
      assert.equal(calendar.searchParams.get('dates'), '20261003/20261004');
      assert.equal(data.nextOccurrence.toISOString(), '2026-11-07T00:00:00.000Z');
    });
  }
}

for (const enabled of [true, false]) {
  test(`noncancelled recurrence retains its schedule (model ${enabled})`, async () => {
    const { eventJsonLd } = await eventsModule(enabled);
    for (const [recurrence, frequency] of [['weekly', 'P1W'], ['monthly', 'P1M']]) {
      const data = { slug: 'live-series', title: 'Synthetic Saturday programme', summary: 'Fixture',
        startDate: new Date('2099-01-03'), recurrence, cancelled: false, status: 'published' };
      const ld = eventJsonLd({ data }, 'https://example.com');
      assert.equal(ld.eventSchedule.repeatFrequency, frequency);
      assert.equal(ld.eventSchedule.byDay, 'https://schema.org/Saturday');
      assert.notEqual(ld.eventStatus, 'https://schema.org/EventCancelled');
    }
  });
  test(`a cancelled past session does not remove a distinct future series schedule (model ${enabled})`, async () => {
    const { eventJsonLd, eventCalendarUrl } = await eventsModule(enabled);
    const data = { slug: 'separate-series', title: 'Synthetic series', summary: 'Fixture',
      startDate: new Date('2020-01-01'), recurrence: 'monthly', status: 'published',
      venueName: 'Fixture venue', intelligence: {}, seriesOccurrences: [
        { id: 'past', originalDate: '2020-01-01', date: '2020-01-01', status: 'cancelled', venueName: 'Fixture venue' },
        { id: 'future', originalDate: '2099-01-03', date: '2099-01-03', status: 'scheduled', venueName: 'Fixture venue' },
      ] };
    const ld = eventJsonLd({ data }, 'https://example.com');
    assert.equal(ld.startDate, '2099-01-03');
    assert.equal(ld.eventSchedule.repeatFrequency, 'P1M');
    assert.notEqual(ld.eventStatus, 'https://schema.org/EventCancelled');
    assert.equal(data.seriesOccurrences[0].status, 'cancelled');
    assert.equal(new URL(eventCalendarUrl(data, 'https://example.com/series/')).searchParams.get('dates'), '20990103/20990104');
  });
}

for (const enabled of [true, false]) {
  test(`all-day calendar keeps an exclusive next date across DST boundaries (model ${enabled})`, async () => {
    const { eventCalendarUrl } = await eventsModule(enabled);
    for (const [start, end, expected] of [
      ['2026-10-03', '2026-10-03', '20261003/20261004'],
      ['2026-10-03', '2026-10-04', '20261003/20261005'],
      ['2026-04-04', '2026-04-04', '20260404/20260405'],
      ['2026-04-04', '2026-04-05', '20260404/20260406'],
    ]) {
      const data = { slug: 'all-day-dst', title: 'Synthetic all-day edition', summary: 'Fixture',
        startDate: new Date(start), endDate: new Date(end), recurrence: 'one-off', status: 'published' };
      assert.equal(new URL(eventCalendarUrl(data, 'https://example.com/edition/')).searchParams.get('dates'), expected);
    }
  });
}
