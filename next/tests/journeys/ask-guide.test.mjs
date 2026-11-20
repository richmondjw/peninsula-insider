/**
 * Ask PI in a real browser over the built site: the chat window, her picks
 * from the guides, and her voice from the platform API.
 *
 * The harness serves tests/journeys/fixtures/ask-index.json at
 * /ask/index.json and answers /concierge/pi/* only when a test supplies a
 * reply, so what is asserted here is the window, not the guides or the model.
 *   node --test tests/journeys/ask-guide.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Site } from './harness.mjs';

const features = readFileSync(new URL('../../src/lib/features.ts', import.meta.url), 'utf8');
const flag = (name) => features.match(new RegExp(`^export const ${name} = (true|false);\\s*$`, 'm'))?.[1] === 'true';
const guideOn = flag('SHOW_ASK_GUIDE') && !flag('SHOW_ASK_PI');
const voiceOn = guideOn && flag('SHOW_ASK_VOICE');
const personaOn = guideOn && flag('SHOW_ASK_PERSONA');
const composeOn = personaOn && voiceOn && flag('SHOW_ASK_COMPOSE');
const talkOn = personaOn && voiceOn && flag('SHOW_ASK_TALK');

const site = await Site.open();
test.after(() => site.close());

const opener = '.ask-link';
const chat = '#pi-chat';
const draft = '#pi-chat-input';
const answers = '#pi-chat-log > .pi-msg--pi';

async function openChat(reader, mobile) {
  const page = reader.page;
  await page.waitForSelector(chat);
  if (mobile) await page.tap(opener);
  else await page.click(opener);
  await page.waitForFunction(() => document.querySelector('#pi-chat')?.dataset.state === 'open' && !document.querySelector('#pi-chat-panel')?.hidden);
  // Let the opening animation finish before anything is measured.
  await page.waitForFunction(() => {
    const panel = document.querySelector('#pi-chat-panel');
    return document.querySelector('#pi-chat')?.classList.contains('is-in') && getComputedStyle(panel).opacity === '1' && panel.getAnimations().length === 0;
  });
}

async function say(page, text) {
  const before = (await page.$$(answers)).length;
  await page.focus(draft);
  await page.type(draft, text);
  await page.keyboard.press('Enter');
  await page.waitForFunction((selector, count) => {
    const nodes = document.querySelectorAll(selector);
    return nodes.length > count && !nodes[nodes.length - 1].classList.contains('is-live');
  }, {}, answers, before);
  return page.$eval(`${answers}:last-child`, node => ({
    prose: node.querySelector('.pi-msg__prose')?.textContent ?? '',
    tiles: [...node.querySelectorAll('.pi-tile')].map(tile => ({ href: tile.getAttribute('href'), title: tile.querySelector('.pi-tile__title')?.textContent, why: tile.querySelector('.pi-tile__why')?.textContent })),
    inline: [...node.querySelectorAll('.pi-msg__inline')].map(link => link.getAttribute('href')),
    small: node.querySelector('.pi-msg__small')?.textContent ?? '',
    chips: [...node.querySelectorAll('.pi-chat__chip')].map(chip => chip.textContent),
  }));
}

test('with Ask PI off, the menu still leads to the paused page and no chat renders', { skip: guideOn }, async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    assert.equal(await reader.page.$eval(opener, link => link.getAttribute('href')), '/ask/');
    assert.equal(await reader.page.$(`${chat}, [data-pi-popup], [data-ask-guide-root]`), null);
  } finally {
    await reader.close();
  }
});

test('without JavaScript, Ask PI is a plain link to a page whose form is site search', { skip: !guideOn }, async () => {
  const reader = await site.reader();
  try {
    const page = reader.page;
    await page.setJavaScriptEnabled(false);
    await page.goto(site.origin + '/', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval(opener, link => link.getAttribute('href')), '/ask/');
    await Promise.all([page.waitForNavigation(), page.click(opener)]);
    assert.equal(new URL(page.url()).pathname, '/ask/');
    assert.equal(await page.$eval('main [data-ask-guide-form]', form => form.getAttribute('action')), '/search/');
  } finally {
    await reader.close();
  }
});

for (const width of [390, 1280, 1440]) {
  test(`with her voice unavailable, PI still answers from the guides at ${width}px`, { skip: !guideOn }, async () => {
    const reader = await site.reader();
    const page = reader.page;
    const mobile = width < 768;
    const generated = [];
    page.on('request', request => { if (/\/concierge\/ask/.test(request.url())) generated.push(request.url()); });
    try {
      await page.setViewport({ width, height: 844, isMobile: mobile, hasTouch: mobile });
      await reader.load('/');
      await openChat(reader, mobile);
      const box = await page.$eval('#pi-chat-panel', el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, w: innerWidth, h: innerHeight };
      });
      assert.ok(box.left >= 0 && box.right <= box.w + 1 && box.top >= 0 && box.bottom <= box.h + 1, JSON.stringify(box));
      assert.match(await page.$eval('.pi-chat__fine', el => el.textContent), /published guides.*written by AI/s);

      const lunch = await say(page, 'Where should we have lunch in Red Hill?');
      assert.deepEqual(lunch.tiles.map(tile => tile.href).sort(), ['/eat/red-gum-bbq/', '/eat/tedesca-osteria/']);
      assert.equal(lunch.tiles.find(tile => tile.href === '/eat/tedesca-osteria/').why, 'A single-set-menu osteria inside a restored Red Hill farmhouse.');
      assert.match(lunch.prose, /places to eat and drink in Red Hill/, 'the matcher\'s own line stands in for her note');
      assert.ok(lunch.chips.includes('Places to stay in Red Hill'), lunch.chips.join(' | '));

      // The picks run down the thread: nothing in the chat scrolls sideways.
      const sideways = await page.$eval('#pi-chat-thread', thread => [...thread.querySelectorAll('.pi-tiles, .pi-tile')].filter(el => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > thread.getBoundingClientRect().right + 1).length);
      assert.equal(sideways, 0, 'no pick is wider than the thread');
      assert.equal(await page.$eval('#pi-chat-thread', thread => thread.scrollWidth <= thread.clientWidth + 1), true);
      assert.equal(await page.$(`${answers}:last-child .pi-tile[href="/eat/tedesca-osteria/"] img`), null, 'a page with no photograph of its own gets a tile without one');

      // A chip is a follow-up on the same answer.
      const count = (await page.$$(answers)).length;
      await page.evaluate(() => [...document.querySelectorAll('#pi-chat-log .pi-chat__chip')].find(chip => chip.textContent === 'Places to stay in Red Hill').click());
      await page.waitForFunction((selector, n) => document.querySelectorAll(selector).length > n && !document.querySelector(selector + ':last-child').classList.contains('is-live'), {}, answers, count);
      assert.ok(await page.$(`${answers}:last-child .pi-tile[href="/stay/lindenderry/"]`));
      // Where the page has its own photograph, the tile shows it with that page's credit.
      await page.waitForFunction(selector => document.querySelector(selector)?.classList.contains('is-loaded'), {}, `${answers}:last-child .pi-tile[href="/stay/lindenderry/"] .pi-tile__media`);
      assert.equal(await page.$eval(`${answers}:last-child .pi-tile[href="/stay/lindenderry/"] .pi-tile__credit`, el => el.textContent), 'Photo · Fixture credit');

      const open = await say(page, 'Is Tedesca Osteria open today?');
      assert.match(open.small, /can’t check opening hours/, 'the plain statement stays under her line');
      assert.match(open.prose, /opening hours|front door|ask me anything again/i, 'the refusal is one of her own lines');
      assert.deepEqual(open.tiles.map(tile => tile.href), ['/eat/tedesca-osteria/']);

      const odd = await say(page, 'zzqx <b>pirates</b> & "quotes"');
      assert.equal(await page.$('#pi-chat-log b'), null, 'markup in a question is text');
      assert.equal(odd.tiles.length, 0);
      assert.ok(await page.$(`${answers}:last-child .pi-msg__links a[href^="/search/"]`));
      assert.deepEqual(generated, [], 'the generated-answer route is never called');

      // A tile closes the chat, goes to the page, and the thread is there on return.
      const tile = `${answers} .pi-tile[href="/eat/tedesca-osteria/"]`;
      await page.evaluate(selector => document.querySelector(selector).click(), tile);
      await page.waitForFunction(() => location.pathname === '/eat/tedesca-osteria/' && document.querySelector('#pi-chat')?.dataset.state === 'closed');
      await page.waitForFunction(() => document.querySelector('#pi-chat-panel')?.hidden);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('pi-chat-sheet')), false);
      await reader.waitFor(() => {
        const link = document.querySelector('.ask-link');
        if (!link) return false;
        const r = link.getBoundingClientRect();
        return r.width > 0 && link.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }, 'masthead Ask PI is ready after the destination settles');
      await openChat(reader, mobile);
      assert.equal((await page.$$(answers)).length, 4, 'the conversation is kept');

      await page.click('#pi-chat-new');
      assert.equal((await page.$$(answers)).length, 0);
      assert.equal(await page.$eval('#pi-chat-hello', el => el.hidden), false);
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}

for (const width of [390, 1280]) {
  test(`her checked note eases in above the picks, and the front desk handles the rest, at ${width}px`, { skip: !voiceOn }, async () => {
    const note = 'I’d start with Tedesca Osteria, a single-set-menu osteria in a restored farmhouse. Red Gum BBQ is the louder option.';
    const reader = await site.reader({ concierge: { voice: { say: note }, 'front-desk': { say: 'Long week, then. Which town are you near?', rewrite: null } } });
    const page = reader.page;
    const mobile = width < 768;
    try {
      await page.setViewport({ width, height: 844, isMobile: mobile, hasTouch: mobile });
      await reader.load('/');
      await openChat(reader, mobile);

      const lunch = await say(page, 'lunch in Red Hill');
      assert.equal(lunch.prose, note, 'her note is already there when the answer appears: the picks never arrive ahead of it');
      await page.waitForFunction(() => document.querySelector('#pi-chat-log > .pi-msg--pi:last-child .pi-msg__prose')?.classList.contains('is-voiced'));
      const prose = await page.$eval(`${answers}:last-child .pi-msg__prose`, el => el.textContent);
      assert.equal(prose, note);
      assert.ok(await page.$eval(`${answers}:last-child`, node => Boolean(node.querySelector('.pi-msg__prose').compareDocumentPosition(node.querySelector('.pi-tiles')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'her words sit above the picks');
      // Her call is first in the list.
      assert.equal(await page.$eval(`${answers}:last-child .pi-tile`, tile => tile.getAttribute('href')), '/eat/tedesca-osteria/');
      assert.deepEqual(await page.$$eval(`${answers}:last-child .pi-msg__inline`, links => links.map(link => link.getAttribute('href'))), ['/eat/tedesca-osteria/', '/eat/red-gum-bbq/'], 'the places she names link to their pages');
      assert.equal(lunch.tiles.length, 2, 'the picks do not depend on the note');
      const sent = JSON.parse(reader.conciergeCalls().find(call => call.path === 'voice').body);
      assert.equal(sent.question, 'lunch in Red Hill');
      assert.deepEqual([...sent.cards].sort(), ['/eat/red-gum-bbq/', '/eat/tedesca-osteria/']);
      assert.deepEqual(Object.keys(sent).sort(), ['cards', 'history', 'question'], 'only the question, the chosen pages and the thread are sent');

      // Something the matcher cannot read goes to the front desk, in her voice.
      const chatty = await say(page, 'hello PI, long week');
      assert.equal(chatty.prose, 'Long week, then. Which town are you near?');
      assert.equal(chatty.tiles.length, 0);

      // The front desk's reading is run through the matcher; the picks are still the guides'.
      reader.setConcierge({ voice: { say: null }, 'front-desk': { say: 'Lunch it is.', rewrite: 'lunch in Flinders' } });
      const reread = await say(page, 'zzqx feed me somewhere southern');
      assert.deepEqual(reread.tiles.map(tile => tile.href), ['/eat/flinders-general-store/']);
      assert.match(reread.prose, /places to eat and drink in Flinders/, 'no note came back, so the matcher\'s line stays');

      // A note that is not a string is ignored.
      reader.setConcierge({ voice: { say: 42 }, 'front-desk': { say: null, rewrite: null } });
      const safe = await say(page, 'where to stay in Red Hill');
      assert.match(safe.prose, /places to stay in Red Hill/);
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}

for (const width of [390, 1280]) {
  test(`PI plans half a day in three taps, and the plan can be changed, kept and shared, at ${width}px`, { skip: !personaOn }, async () => {
    const reader = await site.reader();
    const page = reader.page;
    const mobile = width < 768;
    const sent = [];
    page.on('request', request => { if (request.method() === 'POST') sent.push(request.url()); });
    const tap = async (label) => {
      const before = (await page.$$(answers)).length;
      await page.evaluate(text => [...document.querySelectorAll('#pi-chat .pi-chat__chip')].find(chip => chip.textContent === text && chip.offsetParent).click(), label);
      await page.waitForFunction((selector, count) => {
        const nodes = document.querySelectorAll(selector);
        return nodes.length > count && !nodes[nodes.length - 1].classList.contains('is-live');
      }, {}, answers, before);
    };
    const note = () => page.$eval('#pi-chat-log .pi-note[data-pi-live]', el => ({
      title: el.querySelector('.pi-note__title').textContent,
      stops: [...el.querySelectorAll('.pi-note__stop')].map(stop => ({ when: stop.querySelector('.pi-note__when').textContent, name: stop.querySelector('.pi-note__name').textContent, href: stop.querySelector('.pi-note__name').getAttribute('href'), swap: Boolean(stop.querySelector('[data-pi-swap]')) })),
      scribble: el.querySelector('.pi-note__scribble').hidden ? '' : el.querySelector('.pi-note__scribble').textContent,
      trip: el.querySelector('[data-pi-trip]')?.getAttribute('href'),
      status: el.querySelector('.pi-note__status').textContent,
    }));
    try {
      await page.setViewport({ width, height: 844, isMobile: mobile, hasTouch: mobile });
      await reader.load('/');
      await page.evaluate(() => {
        window.__piEvents = [];
        const real = window.piTrack;
        window.piTrack = (name, params, options) => { window.__piEvents.push([name, params]); return real ? real(name, params, options) : true; };
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__piCopied = text; } }, configurable: true });
      });
      await openChat(reader, mobile);

      await tap('Plan my day');
      assert.equal(await page.$eval(`${answers}:last-child .pi-msg__prose`, el => el.textContent), 'Before I plan anything: who’s coming?');
      await tap('Just the two of us');
      await tap('Sorrento');
      await tap('Half a day');

      const plan = await note();
      assert.equal(plan.title, 'Half a day in Sorrento');
      assert.deepEqual(plan.stops.map(stop => stop.when), ['Then', 'The table']);
      const fixture = new Set(['/explore/coppins-track/', '/explore/sorrento-back-beach/', '/eat/bistro-elba/', '/eat/the-baths-sorrento/']);
      assert.ok(plan.stops.every(stop => fixture.has(stop.href)), JSON.stringify(plan.stops));
      assert.equal(plan.stops[1].name, 'Bistro Elba', 'the page that says "couples" comes first for two');
      assert.match(await page.$eval(`${answers}:last-child .pi-msg__prose`, el => el.textContent), /^Just the two of you\. Easy\./);
      assert.match(await page.$eval(`${answers}:last-child .pi-msg__small`, el => el.textContent), /no cafe or bakery in Sorrento.*I can’t check hours or bookings/s);
      assert.ok(plan.stops.every(stop => stop.swap));
      const box = await page.$eval('#pi-chat-log .pi-note[data-pi-live]', el => { const r = el.getBoundingClientRect(); const t = document.querySelector('#pi-chat-thread').getBoundingClientRect(); return { left: r.left, right: r.right, tl: t.left, tr: t.right }; });
      assert.ok(box.left >= box.tl && box.right <= box.tr + 1, 'the notebook fits the thread: ' + JSON.stringify(box));
      const target = await page.$eval('#pi-chat-log [data-pi-swap]', el => el.getBoundingClientRect().height);
      assert.ok(target >= 44, 'swap is a 44px target');

      // "Not that one" changes that stop only, and she remarks on it.
      await page.click('#pi-chat-log [data-pi-swap="0"]');
      await page.waitForFunction(before => document.querySelector('#pi-chat-log .pi-note[data-pi-live] .pi-note__name').textContent !== before, {}, plan.stops[0].name);
      const swapped = await note();
      assert.equal(swapped.stops[1].name, plan.stops[1].name);
      assert.equal(swapped.scribble, 'Fine. Second choice it is.');
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.piSwap), '0', 'focus stays on the control');

      // The plan goes to My Trip in the format that page already imports.
      const trip = new URL(swapped.trip, site.origin);
      assert.equal(trip.pathname, '/me/trip/');
      assert.deepEqual(trip.searchParams.get('i').split('|').map(item => item.split(':')[1]).sort(), swapped.stops.map(stop => stop.href.split('/').filter(Boolean).pop()).sort());

      await page.click('#pi-chat-log [data-pi-share]');
      await page.waitForFunction(() => document.querySelector('#pi-chat-log .pi-note__status').textContent.startsWith('Copied'));
      const copied = await page.evaluate(() => window.__piCopied);
      assert.match(copied, /^Half a day in Sorrento\n1\. /);
      assert.ok(copied.includes(trip.pathname + trip.search), 'the copied text carries the link');

      // Once a visit she mentions the newsletter.
      assert.equal(await page.$eval(`${answers}:last-child .pi-msg__offer a`, a => a.getAttribute('href')), '/newsletter/');

      // "PI got it wrong" sends which button was pressed and nothing typed.
      await page.click(`${answers}:last-child [data-pi-fb="open"]`);
      await page.click(`${answers}:last-child [data-pi-fb="missed-point"]`);
      assert.match(await page.$eval(`${answers}:last-child .pi-msg__fb`, el => el.textContent), /^Noted\./);
      const events = await page.evaluate(() => window.__piEvents);
      assert.deepEqual(events.find(([name]) => name === 'ask_feedback'), ['ask_feedback', { action: 'missed-point', variant: 'plan' }]);
      assert.ok(events.every(([, params]) => !/Sorrento|two of us|Plan my day/i.test(JSON.stringify(params))), 'no event carries what was typed');
      // With compose off a plan sends nothing. With it on, only the compose call is made.
      const calls = sent.filter(url => /concierge/.test(url));
      if (composeOn) assert.ok(calls.every(url => /\/concierge\/pi\/compose$/.test(url)), calls.join(' '));
      else assert.deepEqual(calls, [], 'a plan sends nothing to the platform');

      // A second plan takes over; the first can no longer be swapped.
      await tap('Somewhere else');
      assert.equal((await page.$$('#pi-chat-log .pi-note')).length, 2);
      assert.equal((await page.$$('#pi-chat-log .pi-note[data-pi-live]')).length, 1);
      assert.equal(await page.$('#pi-chat-log .pi-note:not([data-pi-live]) [data-pi-swap]'), null);

      // Opening a stop keeps the plan for the return trip.
      await page.evaluate(() => document.querySelector('#pi-chat-log .pi-note[data-pi-live] .pi-note__name').click());
      await page.waitForFunction(() => document.querySelector('#pi-chat')?.dataset.state === 'closed' && location.pathname !== '/');
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}

test('on a venue page PI offers what goes with it, and her modes are one tap away', { skip: !personaOn }, async () => {
  const reader = await site.reader();
  const page = reader.page;
  try {
    await page.setViewport({ width: 1280, height: 844 });
    await reader.load('/eat/tedesca-osteria/');
    await openChat(reader, false);
    await page.waitForFunction(() => !document.querySelector('#pi-chat-here').hidden);
    assert.equal(await page.$eval('#pi-chat-here-label', el => el.textContent), 'You’re looking at Tedesca Osteria.'.replace('’', "'"));
    assert.deepEqual(await page.$$eval('#pi-chat-here .pi-chat__chip', chips => chips.map(chip => chip.textContent)), ['Build a day around this', 'What goes with this']);
    const starters = await page.$$eval('#pi-chat-hello > .pi-chat__chips .pi-chat__chip', chips => chips.map(chip => chip.textContent));
    for (const mode of ['Plan my day', 'Surprise me', 'Talk me out of it', 'Settle an argument', 'Rainy day rescue']) assert.ok(starters.includes(mode), mode);

    await page.evaluate(() => [...document.querySelectorAll('#pi-chat-here .pi-chat__chip')].find(chip => chip.textContent === 'What goes with this').click());
    await page.waitForFunction(selector => document.querySelector(selector) && !document.querySelector(selector).classList.contains('is-live'), {}, `${answers}:last-child`);
    assert.deepEqual(await page.$$eval(`${answers}:last-child .pi-tile`, tiles => tiles.map(tile => tile.getAttribute('href')).sort()), ['/explore/red-hill-truffles/', '/stay/lindenderry/']);
    assert.equal(await page.$eval(`${answers}:last-child .pi-msg__prose`, el => el.textContent), 'Same town as Tedesca Osteria, different kind of stop.');

    const critique = await say(page, 'Talk me out of it');
    assert.equal(critique.prose, 'Go on then. Tell me the plan, all of it.');
    const verdict = await say(page, 'four wineries and a brewery before lunch with a toddler');
    assert.match(verdict.prose, /Who’s driving\?.*Brave\./s);
    assert.equal(verdict.tiles.length, 0, 'a remark on the plan names no place');

    const night = await say(page, "where's the best nightlife on the peninsula");
    assert.match(night.prose, /^Peninsula nightlife is mostly a second bottle and a clear sky/);
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});

test('PI’s call marks the pick her checked note names first', { skip: !(voiceOn && personaOn) }, async () => {
  const reader = await site.reader({ concierge: { voice: { say: 'I’d start with Red Gum BBQ. Tedesca Osteria is the quieter one.' }, 'front-desk': { say: null, rewrite: null } } });
  const page = reader.page;
  try {
    await page.setViewport({ width: 1280, height: 844 });
    await reader.load('/');
    await openChat(reader, false);
    await say(page, 'lunch in Red Hill');
    await page.waitForFunction(() => document.querySelector('#pi-chat-log > .pi-msg--pi:last-child .pi-msg__prose')?.classList.contains('is-voiced'));
    assert.deepEqual(await page.$$eval(`${answers}:last-child .pi-tile`, tiles => tiles.filter(tile => tile.querySelector('.pi-tile__call')).map(tile => tile.getAttribute('href'))), ['/eat/red-gum-bbq/']);
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});

test('with compose on, her picks and lines arrive with the plan, and a bad reply leaves the plan as built', { skip: !composeOn }, async () => {
  const reader = await site.reader({ concierge: { compose: {
    picks: ['/explore/sorrento-back-beach/', '/eat/the-baths-sorrento/'],
    opening: 'Two of you and half a day. I’ve kept it simple.',
    lines: { '/explore/sorrento-back-beach/': 'Start with the beach.', '/eat/tedesca-osteria/': 'A line for a page that is not in this plan.' },
  } } });
  const page = reader.page;
  try {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await reader.load('/');
    await openChat(reader, true);
    const planned = await say(page, 'plan half a day in Sorrento for the two of us');
    assert.equal(planned.prose, 'Two of you and half a day. I’ve kept it simple.', 'her opening is there when the plan appears');
    const stops = await page.$$eval('#pi-chat-log .pi-note[data-pi-live] .pi-note__stop', nodes => nodes.map(node => ({ href: node.querySelector('.pi-note__name').getAttribute('href'), line: node.querySelector('.pi-note__line')?.textContent ?? null })));
    assert.deepEqual(stops, [{ href: '/explore/sorrento-back-beach/', line: 'Start with the beach.' }, { href: '/eat/the-baths-sorrento/', line: null }]);
    const sent = JSON.parse(reader.conciergeCalls().find(call => call.path === 'compose').body);
    assert.deepEqual(Object.keys(sent).sort(), ['history', 'question', 'slots', 'title']);
    assert.ok(sent.slots.every(slot => slot.options.length >= 1 && slot.options.length <= 3));

    // A reply that picks pages that were never offered changes nothing.
    reader.setConcierge({ compose: { picks: ['/eat/tedesca-osteria/', '/stay/lindenderry/'], opening: 7, lines: {} } });
    await page.click('#pi-chat-new');
    const kept = await say(page, 'plan half a day in Sorrento for the two of us');
    assert.match(kept.prose, /^Just the two of you\. Easy\./, 'her authored line stands');
    const hrefs = await page.$$eval('#pi-chat-log .pi-note[data-pi-live] .pi-note__name', links => links.map(link => link.getAttribute('href')));
    assert.ok(hrefs.every(href => href.includes('sorrento') || href === '/explore/coppins-track/' || href === '/eat/bistro-elba/'), hrefs.join(' '));
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});

test('in conversation she replies as herself, her picks are the tiles, and a follow-up carries the pages on screen', { skip: !talkOn }, async () => {
  const reader = await site.reader({ concierge: { talk: { say: 'Long week, then. What are you planning?', picks: [], next: ['A long lunch', 'Somewhere to stay'] } } });
  const page = reader.page;
  try {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await reader.load('/');
    await openChat(reader, true);

    // Small talk: her words, no tiles, and suggestions in the reader's voice.
    const hello = await say(page, 'hi PI, long week');
    assert.equal(hello.prose, 'Long week, then. What are you planning?');
    assert.equal(hello.tiles.length, 0);
    assert.deepEqual(hello.chips, ['A long lunch', 'Somewhere to stay']);
    let sent = JSON.parse(reader.conciergeCalls().filter(call => call.path === 'talk').pop().body);
    assert.deepEqual(Object.keys(sent).sort(), ['followUp', 'history', 'message', 'onPage', 'pages']);
    assert.deepEqual(sent.pages, [], 'a greeting sends no pages');

    // A real question: she makes the call, and the tiles are the places she named, in her order.
    reader.setConcierge({ talk: { say: 'I’d start with Red Gum BBQ. Tedesca Osteria is the quieter one.', picks: ['/eat/red-gum-bbq/', '/eat/tedesca-osteria/', '/stay/not-a-page/'], next: [], why: { '/eat/red-gum-bbq/': 'Picnic tables, so nobody minds the noise.', '/stay/not-a-page/': 'A line for nothing.' } } });
    const lunch = await say(page, 'lunch in Red Hill');
    assert.equal(lunch.prose, 'I’d start with Red Gum BBQ. Tedesca Osteria is the quieter one.');
    assert.deepEqual(lunch.tiles.map(tile => tile.href), ['/eat/red-gum-bbq/', '/eat/tedesca-osteria/'], 'a pick that is not a published page is ignored');
    assert.deepEqual(await page.$$eval(`${answers}:last-child .pi-tile__note`, notes => notes.map(note => note.textContent)), ['Picnic tables, so nobody minds the noise.'], 'her line sits on the pick it is about');
    assert.equal(await page.$eval(`${answers}:last-child .pi-tile`, tile => Boolean(tile.querySelector('.pi-tile__call'))), true);
    sent = JSON.parse(reader.conciergeCalls().filter(call => call.path === 'talk').pop().body);
    assert.equal(sent.history.at(-1).q, 'hi PI, long week');

    // A follow-up the matcher cannot read still sends the pages that were on screen.
    reader.setConcierge({ talk: { say: 'Tedesca Osteria, by a distance.', picks: ['/eat/tedesca-osteria/'], next: [] } });
    const quieter = await say(page, 'which of those is quieter?');
    assert.equal(quieter.prose, 'Tedesca Osteria, by a distance.');
    assert.deepEqual(quieter.tiles.map(tile => tile.href), ['/eat/tedesca-osteria/']);
    sent = JSON.parse(reader.conciergeCalls().filter(call => call.path === 'talk').pop().body);
    assert.ok(sent.pages.includes('/eat/red-gum-bbq/') && sent.pages.includes('/eat/tedesca-osteria/'), sent.pages.join(' '));

    // Things she cannot check never go to the model: her authored refusal stands.
    const before = reader.conciergeCalls().filter(call => call.path === 'talk').length;
    const open = await say(page, 'Is Tedesca Osteria open today?');
    assert.match(open.small, /can’t check opening hours/);
    assert.equal(reader.conciergeCalls().filter(call => call.path === 'talk').length, before);

    // No reply from the platform: the guides answer as before.
    reader.setConcierge({ talk: { say: null, picks: [], next: [] } });
    const fallback = await say(page, 'where to stay in Red Hill');
    assert.match(fallback.prose, /places to stay in Red Hill/);
    assert.ok(fallback.tiles.some(tile => tile.href === '/stay/lindenderry/'));
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});

test('the /ask/ page puts a plan in order as plain links', { skip: !personaOn }, async () => {
  const reader = await site.reader();
  const page = reader.page;
  try {
    await reader.load('/ask/?q=' + encodeURIComponent('plan half a day in Sorrento for the two of us'));
    await page.waitForFunction(() => document.querySelectorAll('main [data-ask-guide-log] > article').length === 1);
    assert.equal(await page.$eval('main [data-ask-guide-answer], main .ask-guide__answer', el => el.dataset.askGuideKind), 'plan');
    assert.equal((await page.$$('main [data-ask-guide-log] .ask-guide__card')).length, 2);
    assert.ok(await page.$('main [data-ask-guide-log] a[href^="/me/trip/?i="]'));
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});

test('the /ask/ page shows the plain matches for a question sent in its address', { skip: !guideOn }, async () => {
  const reader = await site.reader();
  const page = reader.page;
  try {
    await reader.load('/ask/?q=' + encodeURIComponent('lunch in Red Hill'));
    await page.waitForFunction(() => document.querySelectorAll('main [data-ask-guide-log] > article').length === 1);
    assert.ok(await page.$('main [data-ask-guide-log] a[href="/eat/tedesca-osteria/"]'));
    assert.equal(await page.$eval('h1', el => el.textContent.trim()), 'Ask PI');
    assert.equal(await page.$eval(chat, el => el.hidden), true, 'the chat steps aside on its own page');
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});
