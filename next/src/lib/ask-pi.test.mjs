import test from 'node:test';
import assert from 'node:assert/strict';
import { tokens } from './ask-guide.mjs';
import { converse, swapStop, occasion, pageOffers, tripLink, composeRequest, applyCompose, talkPages, cardsFor, isFollowUp } from './ask-pi.mjs';
import * as lines from './pi-lines.mjs';

const today = '2026-11-20';
const kw = (...parts) => [...new Set(tokens(parts.join(' ')))].join(' ');
const page = (u, k, t, ty, p, pn, s, best = '') => ({ u, k, t, ty, p, pn, s, f: best ? [['Best for', best]] : [], h: 'abc', kw: kw(t, ty, pn, s, best) });
const index = {
  schemaVersion: '1.0',
  generatedAt: '2026-11-20T03:00:00.000Z',
  places: [{ slug: 'flinders', name: 'Flinders' }, { slug: 'red-hill', name: 'Red Hill' }, { slug: 'sorrento', name: 'Sorrento' }],
  topics: { dogs: { u: '/dog-friendly/', t: 'Dog-friendly guide' } },
  records: [
    page('/eat/flinders-sourdough/', 'eat', 'Flinders Sourdough', 'Bakery', 'flinders', 'Flinders', 'A wood-fired bakery in an old church hall.'),
    page('/eat/flinders-general-store/', 'eat', 'Flinders General Store', 'Café', 'flinders', 'Flinders', 'The village store with coffee and bread.', 'Family outings'),
    page('/eat/moke-dining/', 'eat', 'Moke Dining', 'Restaurant', 'flinders', 'Flinders', 'A weekly set menu on Cook Street.', 'Couples'),
    page('/eat/flinders-hotel/', 'eat', 'Flinders Hotel', 'Pub', 'flinders', 'Flinders', 'A corner pub with a bar and a dining room.'),
    page('/explore/flinders-pier/', 'do', 'Flinders Pier', 'Walk', 'flinders', 'Flinders', 'A timber pier over the seagrass.', 'Family outings'),
    page('/explore/flinders-gallery/', 'do', 'Flinders Village Gallery', 'Gallery', 'flinders', 'Flinders', 'A small gallery of local painters.'),
    page('/wine/nazaaray-estate/', 'wine', 'Nazaaray Estate', 'Winery', 'flinders', 'Flinders', 'A family-run cellar door at the southern tip.'),
    page('/eat/red-hill-baker/', 'eat', 'The Red Hill Baker', 'Bakery', 'red-hill', 'Red Hill', 'Pies and bread on the main road.'),
    page('/eat/tedesca-osteria/', 'eat', 'Tedesca Osteria', 'Restaurant', 'red-hill', 'Red Hill', 'A farmhouse osteria with a wood oven.', 'Long lunches'),
    page('/explore/red-hill-rail-trail/', 'do', 'Red Hill Rail Trail', 'Walk', 'red-hill', 'Red Hill', 'A flat trail on the old railway line.'),
    page('/wine/polperro/', 'wine', 'Polperro', 'Winery', 'red-hill', 'Red Hill', 'A cellar door with a view over the vines.'),
    page('/wine/red-hill-brewery/', 'wine', 'Red Hill Brewery', 'Brewery', 'red-hill', 'Red Hill', 'A brewery among the hop bines.'),
    page('/wine/foxeys-hangout/', 'wine', 'Foxeys Hangout', 'Winery', 'red-hill', 'Red Hill', 'A deck over the vines.'),
    page('/stay/quarters/', 'stay', 'Quarters at Flinders Hotel', 'Hotel', 'flinders', 'Flinders', 'A quiet village stay behind the pub.'),
    page('/eat/sorrento-cafe/', 'eat', 'Stringers', 'Café', 'sorrento', 'Sorrento', 'A corner store and cafe.'),
    { u: '/explore/walks/', k: 'do', g: 1, t: 'The best walks on the Mornington Peninsula', s: 'Foreshore paths.', h: 'abc', kw: kw('best walks foreshore paths') },
    { u: '/explore/places/flinders/', k: 'place', t: 'Flinders', s: 'A village at the southern tip.', h: 'abc', kw: kw('Flinders village southern tip') },
  ],
};
const allowed = new Set(index.records.flatMap((record) => [record.t, record.s, record.ty, record.pn, ...(record.f || []).flat()]).filter(Boolean));
const authored = JSON.stringify(lines);
function talk(...questions) {
  let state = null;
  let last = null;
  for (const question of questions) {
    last = converse(index, question, state, { today });
    state = last.state;
    // State must survive sessionStorage.
    state = JSON.parse(JSON.stringify(state));
  }
  return last;
}
const titles = (result) => result.reply.cards.map((item) => item.title);

test('a plan is asked for in three taps, then put in order from pages in one town', () => {
  let turn = converse(index, 'Create me a plan', null, { today });
  assert.equal(turn.reply.kind, 'interview');
  assert.equal(turn.reply.lead, lines.INTERVIEW.who.ask);
  turn = converse(index, 'Kids in tow', turn.state, { today });
  assert.equal(turn.reply.lead, lines.INTERVIEW.where.ask);
  assert.ok(turn.reply.chips.includes('Flinders') && turn.reply.chips.includes(lines.YOU_PICK));
  turn = converse(index, 'Flinders', turn.state, { today });
  assert.equal(turn.reply.lead, lines.INTERVIEW.long.ask);
  turn = converse(index, 'The whole day', turn.state, { today });
  assert.equal(turn.reply.kind, 'plan');
  assert.equal(turn.reply.plan.title, 'A day in Flinders');
  assert.deepEqual(turn.reply.plan.stops.map((stop) => stop.label), ['To start', 'Then', 'The table', 'After']);
  assert.ok(turn.reply.plan.stops.every((stop) => stop.card.meta.endsWith('Flinders')));
  assert.equal(new Set(titles(turn)).size, 4, 'no page appears twice');
  // With children along, the page that says "family" comes first and the last stop is not a tasting.
  assert.equal(turn.reply.plan.stops[0].card.title, 'Flinders General Store');
  assert.notEqual(turn.reply.plan.stops[3].card.title, 'Nazaaray Estate');
  assert.match(turn.reply.lead, /^Kids in tow\. Brave\./);
  assert.ok(turn.reply.notes.includes(lines.PLAN_NOTES.order));
});

test('a request that already says who, where and how long skips the questions', () => {
  const turn = talk('plan a morning in Red Hill for the two of us');
  assert.equal(turn.reply.kind, 'plan');
  assert.equal(turn.reply.plan.title, 'A morning in Red Hill');
  assert.deepEqual(titles(turn), ['The Red Hill Baker', 'Red Hill Rail Trail']);
});

test('every string on a plan stop is copied from the index, and every line of hers is authored', () => {
  for (const questions of [['plan a day in Flinders for the two of us, the whole day'], ['Surprise me'], ['Rainy day rescue'], ['best nightlife on the peninsula'],
    ['settle an argument: I want a long lunch but she wants a walk'], ['talk me out of it', 'three wineries, a brewery and Tedesca Osteria with a toddler']]) {
    const turn = talk(...questions);
    for (const item of turn.reply.cards) {
      for (const text of [item.title, item.summary, ...item.facts.flat()]) assert.ok(!text || allowed.has(text), `${questions}: "${text}" is not in the index`);
    }
    // Her line, with the reader's words, towns and counts taken out, is in pi-lines.mjs.
    const skeleton = turn.reply.lead.split(/(?<=[.!?]) /)[0].replace(/Flinders|Red Hill|Sorrento|\d+/g, '').slice(0, 12);
    assert.ok(authored.includes(skeleton.trim().slice(0, 8)), `${questions}: "${turn.reply.lead}" is not an authored line`);
  }
});

test('"not that one" moves to the next page for that part of the day and never repeats a stop', () => {
  const turn = talk('plan a day in Flinders for the two of us, the whole day');
  const before = turn.reply.plan.stops.map((stop) => stop.card.title);
  const swapped = swapStop(index, turn.state, 0);
  const after = swapped.plan.stops.map((stop) => stop.card.title);
  assert.notEqual(after[0], before[0]);
  assert.deepEqual(after.slice(1), before.slice(1));
  assert.equal(new Set(after).size, after.length);
  assert.equal(swapped.remark, lines.SWAP_LINES[0]);
  // The only cellar door in town cannot be swapped.
  assert.equal(swapped.plan.stops[3].swappable, false);
  assert.equal(swapStop(index, swapped.state, 3).remark, lines.SWAP_ONLY);
});

test('a plan links to the trip planner in the format it already imports', () => {
  const turn = talk('plan a morning in Red Hill for the two of us');
  const url = new URL(turn.reply.plan.trip, 'https://example.test');
  assert.equal(url.pathname, '/me/trip/');
  assert.equal(url.searchParams.get('i'), 'venue:red-hill-baker:day-1|experience:red-hill-rail-trail:day-1');
  assert.equal(decodeURIComponent(url.searchParams.get('d')), 'day-1:A morning in Red Hill');
  assert.equal(tripLink(index, turn.state.pi.plan), turn.reply.plan.trip);
});

test('a plan asked for with a price or for a weekend says what she will not do, even after the questions', () => {
  const turn = talk('plan me a cheap weekend in Flinders with the kids', 'The whole day');
  assert.equal(turn.reply.kind, 'plan');
  assert.equal(turn.reply.notes[0], lines.PLAN_NOTES.oneDay);
  assert.ok(lines.REFUSALS.price.includes(turn.reply.notes[1]));
});

test('surprise me picks the town; somewhere else moves; rainy day rescue keeps the day and goes under a roof', () => {
  const first = talk('Surprise me');
  assert.equal(first.reply.kind, 'plan');
  assert.ok(lines.PLAN_LEADS.surprise.some((line) => first.reply.lead.startsWith(line.split('{')[0])));
  const moved = converse(index, 'Somewhere else', first.state, { today });
  assert.notEqual(moved.reply.plan.town, first.reply.plan.town);
  const wet = talk('plan a day in Flinders for the two of us, the whole day', 'Rainy day rescue');
  assert.equal(wet.reply.plan.town, 'Flinders');
  assert.equal(wet.reply.plan.stops.find((stop) => stop.label === 'Then').card.title, 'Flinders Village Gallery');
  // Where the guides have nothing indoors, she says so rather than sending them outside.
  const none = talk('plan a morning in Red Hill for the two of us', 'Rainy day rescue');
  assert.ok(none.reply.notes.some((note) => /no things to do in Red Hill under a roof/.test(note)) || none.reply.kind === 'none');
});

test('a thin town is declined in plain words, not padded', () => {
  const turn = talk('plan a morning in Sorrento for the two of us');
  assert.equal(turn.reply.kind, 'none');
  assert.match(turn.reply.lead, /too thin on Sorrento/);
});

test('talk me out of it remarks on the plan, never on a place', () => {
  const asked = talk('Talk me out of it');
  assert.equal(asked.reply.lead, lines.CRITIQUE.ask);
  const turn = converse(index, 'three wineries, a brewery and Tedesca Osteria with a toddler', asked.state, { today });
  assert.equal(turn.reply.kind, 'critique');
  assert.equal(turn.reply.lead, `${lines.CRITIQUE.drinks} ${lines.CRITIQUE.kids}`);
  assert.deepEqual(titles(turn), ['Tedesca Osteria']);
  assert.deepEqual(turn.reply.chips, [lines.CRITIQUE.fix]);
  assert.equal(converse(index, 'Fix it for me', turn.state, { today }).reply.kind, 'plan');
  assert.equal(talk('talk me out of it: a walk then lunch').reply.lead, lines.CRITIQUE.fine);
});

test('settle an argument gives each side one page, in one town when the guides have both', () => {
  const turn = talk('Settle an argument: I want a long lunch but she wants a walk');
  assert.equal(turn.reply.kind, 'plan');
  assert.equal(turn.reply.plan.stops.length, 2);
  assert.match(turn.reply.plan.stops[0].label, /^For “long lunch”$/);
  assert.match(turn.reply.plan.stops[1].label, /^For “walk”$/);
  const towns = turn.reply.plan.stops.map((stop) => stop.card.meta.split(' · ').pop());
  assert.equal(towns[0], towns[1]);
  assert.equal(talk('Settle an argument').reply.lead, lines.ARGUMENT.ask);
});

test('nightlife owns the limit, then shows pages whose own words mention a bar, a pub or a brewery', () => {
  const turn = talk("where's the best nightlife on the peninsula");
  assert.equal(turn.reply.lead, lines.NIGHTLIFE.lead);
  assert.deepEqual(titles(turn).sort(), ['Flinders Hotel', 'Red Hill Brewery']);
  assert.ok(turn.reply.notes.includes(lines.NIGHTLIFE.note));
  assert.match(talk('nightlife in Sorrento').reply.lead, /nothing closer than that in Sorrento/);
});

test('refusals are hers, with the plain statement kept underneath', () => {
  const hours = talk('Is Tedesca Osteria open today?');
  assert.ok(lines.REFUSALS.hours.includes(hours.reply.lead));
  assert.match(hours.reply.notes[0], /can’t check opening hours/);
  assert.deepEqual(titles(hours), ['Tedesca Osteria']);
  assert.ok(lines.REFUSALS.price.includes(talk('how much is lunch at Moke Dining').reply.lead));
  assert.ok(lines.REFUSALS.tides.includes(talk('what are the tides at Flinders').reply.lead));
  // Nothing light where being wrong could hurt someone.
  assert.deepEqual([talk('is it safe to swim at Flinders').reply.lead], lines.REFUSALS.safety);
  assert.ok(lines.REFUSALS.dogs.includes(talk('dog friendly cafes in Flinders').reply.lead));
});

test('she brings back what the reader told her, once, in their words', () => {
  assert.equal(occasion("It's my mum's 70th next month"), 'your mum’s 70th'.replace('’', "'"));
  assert.equal(occasion('our anniversary'), 'your anniversary');
  assert.equal(occasion('lunch with my partner'), null);
  const first = talk("Lunch in Red Hill for mum's 70th");
  assert.equal(first.reply.aside ?? null, null, 'not on the turn it was said');
  const second = converse(index, 'wineries in Red Hill', first.state, { today });
  assert.match(second.reply.aside, /mum's 70th/);
  const third = converse(index, 'breweries', second.state, { today });
  assert.equal(third.reply.aside ?? null, null);
});

test('on a venue page she offers a day built around it, and that stop stays put', () => {
  assert.deepEqual(pageOffers(index, '/eat/moke-dining/').chips, ['Build a day around this', 'What goes with this']);
  assert.equal(pageOffers(index, '/explore/walks/'), null);
  const turn = converse(index, 'Build a day around this', null, { today, pagePath: '/eat/moke-dining/' });
  assert.equal(turn.reply.kind, 'plan');
  const table = turn.reply.plan.stops.find((stop) => stop.label === 'The table');
  assert.equal(table.card.title, 'Moke Dining');
  assert.equal(table.swappable, false);
  const withThis = converse(index, 'What goes with this', null, { today, pagePath: '/eat/moke-dining/' });
  assert.ok(withThis.reply.cards.length >= 2 && withThis.reply.cards.every((item) => item.meta.endsWith('Flinders') && item.title !== 'Moke Dining'));
});

test('an ordinary question still goes to the matcher unchanged, and persona off is the matcher', () => {
  const turn = talk('Where should we have lunch in Red Hill?');
  assert.equal(turn.reply.kind, 'results');
  assert.match(turn.reply.lead, /places to eat and drink in Red Hill/);
  const refined = converse(index, 'in Flinders', turn.state, { today });
  assert.ok(titles(refined).includes('Moke Dining'));
  assert.equal(converse(index, 'Create me a plan', null, { today, persona: false }).reply.kind !== 'interview', true);
  assert.equal(converse(index, 'ready-made plans', null, { today }).reply.kind !== 'interview', true);
});

test('a question in the middle of the three taps is answered, and the interview is dropped', () => {
  const asked = talk('Plan my day');
  const turn = converse(index, 'wineries in Red Hill', asked.state, { today });
  assert.equal(turn.reply.kind, 'results');
  assert.equal(turn.state.pi?.interview, undefined);
  const nonsense = converse(index, 'zzqx', asked.state, { today });
  assert.equal(nonsense.reply.lead, lines.INTERVIEW.who.again);
});

test('no authored line carries a price, a time, a day, an em dash or a claim to have been there', () => {
  const all = [];
  const walk = (value) => { if (typeof value === 'string') all.push(value); else if (value && typeof value === 'object' && !(value instanceof RegExp)) Object.values(value).forEach(walk); };
  walk(lines);
  for (const line of all) {
    assert.doesNotMatch(line, /—|\$|\b\d{1,2}\s?(?:am|pm)\b|\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i, line);
    assert.doesNotMatch(line, /\b(?:i(?:'ve|’ve| have) (?:been|eaten|stayed|visited|tried)|when i (?:was|went|ate)|last time i)\b/i, line);
  }
});

test('the platform is offered a few pages per part of the day, the one showing first', () => {
  const turn = talk('plan a day in Flinders for the two of us, the whole day');
  const request = composeRequest(turn.state);
  assert.equal(request.title, 'A day in Flinders');
  assert.deepEqual(request.slots.map((slot) => slot.label), ['To start', 'Then', 'The table', 'After']);
  request.slots.forEach((slot, i) => {
    assert.equal(slot.options[0], turn.reply.plan.stops[i].card.href, 'the page showing is the first option');
    assert.ok(slot.options.length <= 3 && new Set(slot.options).size === slot.options.length);
  });
  // A stop a day was built around is the only option for its part.
  const around = converse(index, 'Build a day around this', null, { today, pagePath: '/eat/moke-dining/' });
  assert.deepEqual(composeRequest(around.state).slots.find((slot) => slot.label === 'The table').options, ['/eat/moke-dining/']);
  assert.equal(composeRequest(talk('lunch in Red Hill').state), null);
});

test('her picks are taken only from what was offered, and her lines only for pages she picked', () => {
  const turn = talk('plan a day in Flinders for the two of us, the whole day');
  const request = composeRequest(turn.state);
  const second = request.slots[0].options[1];
  const applied = applyCompose(index, turn.state, request, {
    picks: [second, request.slots[1].options[0], request.slots[2].options[0], request.slots[3].options[0]],
    opening: 'Two of you and a whole day. Easy.',
    lines: { [second]: 'Start at the counter.', '/eat/tedesca-osteria/': 'A line about a page that is not in the plan.', [request.slots[2].options[0]]: 42 },
  });
  assert.equal(applied.plan.stops[0].card.href, second);
  assert.equal(applied.plan.stops[0].line, 'Start at the counter.');
  assert.equal(applied.plan.stops[2].line, null, 'a line that is not text is ignored');
  assert.deepEqual(Object.keys(applied.state.pi.plan.lines), [second]);
  assert.equal(applied.opening, 'Two of you and a whole day. Easy.');
  // Swapping that stop away takes her line with it; the trip link follows the stops.
  const swapped = swapStop(index, applied.state, 0);
  assert.equal(swapped.plan.stops[0].line, null);
  assert.ok(applied.plan.trip.includes(second.split('/').filter(Boolean).pop()));
});

test('a pick that was never offered, a repeat, or a malformed reply changes nothing', () => {
  const turn = talk('plan a day in Flinders for the two of us, the whole day');
  const request = composeRequest(turn.state);
  const before = turn.reply.plan.stops.map((stop) => stop.card.href);
  const outside = applyCompose(index, turn.state, request, { picks: ['/eat/tedesca-osteria/', before[1], before[1], 7], opening: 9, lines: null });
  assert.deepEqual(outside.plan.stops.map((stop) => stop.card.href), before, 'every bad pick falls back to the page that was showing');
  assert.equal(outside.opening, null);
  assert.equal(new Set(outside.plan.stops.map((stop) => stop.card.href)).size, before.length);
  for (const bad of [null, {}, { picks: null }, { picks: before.slice(0, 2) }, { picks: 'x' }]) assert.equal(applyCompose(index, turn.state, request, bad), null);
});

test('in conversation she is given what the matcher found, what was on screen, and pages that fit what has been said', () => {
  const lunch = talk('Where should we have lunch in Red Hill?');
  const found = lunch.reply.cards.map((item) => item.href);
  const pages = talkPages(index, 'Where should we have lunch in Red Hill?', [], lunch.reply, [], { today });
  assert.deepEqual(pages.slice(0, found.length), found, 'the matcher\'s own answer comes first');
  assert.ok(pages.length <= 24 && new Set(pages).size === pages.length);

  // A follow-up the matcher cannot read still carries the pages that were on screen.
  const follow = converse(index, 'which of those is quieter?', lunch.state, { today });
  assert.equal(follow.reply.cards.length, 0);
  const again = talkPages(index, 'which of those is quieter?', ['Where should we have lunch in Red Hill?'], follow.reply, found, { today });
  for (const href of found) assert.ok(again.includes(href), href);

  // Loose talk reaches pages by what was said earlier: the town and the company.
  const loose = talkPages(index, 'she hates crowds', ['we are in Flinders for the two of us'], null, [], { today });
  assert.ok(loose.includes('/eat/moke-dining/'), 'a Flinders page whose words say "couples"');
  assert.ok(loose.every((href) => !href.startsWith('/journal/')));
});

test('a greeting or a grumble brings no pages, so she talks before she recommends', () => {
  assert.deepEqual(talkPages(index, 'hi PI, long week', [], null, [], { today }), []);
  assert.deepEqual(talkPages(index, 'who are you anyway?', [], null, [], { today }), []);
});

test('her picks become tiles with the same page-copied text, and unknown pages are ignored', () => {
  const tiles = cardsFor(index, ['/eat/moke-dining/', '/not/a-page/', '/eat/moke-dining/', '/wine/polperro/']);
  assert.deepEqual(tiles.map((item) => item.title), ['Moke Dining', 'Polperro']);
  for (const item of tiles) for (const text of [item.title, item.summary, ...item.facts.flat()]) assert.ok(!text || allowed.has(text));
  assert.deepEqual(cardsFor(index, null), []);
});

test('a short reply mid-thread stays on the thread, not on a page that shares one of its words', () => {
  const said = ['where can I get a good steak'];
  // On its own "church" finds the bakery in the old church hall. Mid-thread it is not the subject.
  const alone = converse(index, 'church', null, { today });
  assert.ok(alone.reply.cards.some((item) => item.href === '/eat/flinders-sourdough/'));
  assert.equal(isFollowUp(index, 'church', said, { today }), true);
  assert.deepEqual(talkPages(index, 'church', said, alone.reply, [], { today }), []);
  // What was on screen is kept, and comes first.
  assert.deepEqual(talkPages(index, 'the first one', ['lunch in Red Hill'], null, ['/eat/tedesca-osteria/'], { today })[0], '/eat/tedesca-osteria/');
  // A message with a subject of its own is not a follow-up, and with no thread nothing is.
  assert.equal(isFollowUp(index, 'what about a winery in Red Hill', said, { today }), false);
  assert.equal(isFollowUp(index, 'church', [], { today }), false);
});

test('"Surprise me" starts somewhere different per chat and does not repeat a town until she has been round them', () => {
  const first = new Set();
  for (let shuffle = 0; shuffle < 40; shuffle += 1) first.add(converse(index, 'Surprise me', null, { today, shuffle }).reply.plan?.title);
  assert.ok(first.size > 1, 'the first surprise depends on where the chat starts');
  let state = null;
  const towns = [];
  for (let i = 0; i < 2; i += 1) {
    const turn = converse(index, 'Surprise me', state, { today, shuffle: 5 });
    state = turn.state;
    towns.push(turn.reply.plan?.title);
  }
  assert.notEqual(towns[0], towns[1]);
});
