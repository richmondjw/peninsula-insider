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

      // A chip is a follow-up on the same answer.
      const count = (await page.$$(answers)).length;
      await page.evaluate(() => [...document.querySelectorAll('#pi-chat-log .pi-chat__chip')].find(chip => chip.textContent === 'Places to stay in Red Hill').click());
      await page.waitForFunction((selector, n) => document.querySelectorAll(selector).length > n && !document.querySelector(selector + ':last-child').classList.contains('is-live'), {}, answers, count);
      assert.ok(await page.$(`${answers}:last-child .pi-tile[href="/stay/lindenderry/"]`));

      const open = await say(page, 'Is Tedesca Osteria open today?');
      assert.match(open.prose, /can’t check opening hours/);
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
      await page.waitForFunction(() => document.querySelector('#pi-chat-log > .pi-msg--pi:last-child .pi-msg__prose')?.classList.contains('is-voiced'));
      const prose = await page.$eval(`${answers}:last-child .pi-msg__prose`, el => el.textContent);
      assert.equal(prose, note);
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
