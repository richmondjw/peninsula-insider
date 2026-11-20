/**
 * Ask PI from the guides, in a real browser over the built site.
 *
 * The harness serves tests/journeys/fixtures/ask-index.json at
 * /ask/index.json, so what is asserted here is the window, not the guides.
 * The flag the build was made with must match features.ts:
 *   node --test tests/journeys/ask-guide.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Site } from './harness.mjs';

const features = readFileSync(new URL('../../src/lib/features.ts', import.meta.url), 'utf8');
const flag = (name) => features.match(new RegExp(`^export const ${name} = (true|false);\\s*$`, 'm'))?.[1] === 'true';
const guideOn = flag('SHOW_ASK_GUIDE') && !flag('SHOW_ASK_PI');

const site = await Site.open();
test.after(() => site.close());

const opener = '.ask-link';
const modal = '#ask-guide-dialog';
const draft = '#ask-dialog-question';
const turns = `${modal} [data-ask-guide-log] > article`;
const MARKER = 'ASK_GUIDE_PRIVATE_4825';

test('with Ask PI off, the menu still leads to the paused page and nothing of the guide renders', { skip: guideOn }, async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    assert.equal(await reader.page.$eval(opener, link => link.getAttribute('href')), '/ask/');
    assert.equal(await reader.page.$(`${modal}, [data-ask-guide-open], [data-ask-guide-root]`), null);
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
    assert.equal(await page.$eval(opener, link => link.getAttribute('aria-haspopup')), null);
    await Promise.all([page.waitForNavigation(), page.click(opener)]);
    assert.equal(new URL(page.url()).pathname, '/ask/');
    assert.equal(await page.$eval('main [data-ask-guide-form]', form => form.getAttribute('action')), '/search/');
    assert.equal(await page.$eval('main [data-ask-guide-input]', input => input.getAttribute('name')), 'q');
  } finally {
    await reader.close();
  }
});

for (const width of [320, 390, 1280, 1440]) {
  test(`Ask PI answers from the guides, privately and by keyboard, at ${width}px`, { skip: !guideOn }, async () => {
    const reader = await site.reader();
    const page = reader.page;
    const mobile = width < 768;
    const leaks = [];
    const fetched = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/concierge/')) leaks.push('concierge ' + url.pathname);
      if (url.href.includes(MARKER) || (request.postData() ?? '').includes(MARKER)) leaks.push('question sent to ' + url.pathname);
      if (['xhr', 'fetch'].includes(request.resourceType()) && url.pathname.startsWith('/ask/')) fetched.push(request.method() + ' ' + url.pathname + url.search);
    });
    const submit = async value => {
      const before = (await page.$$(turns)).length;
      await page.focus(draft);
      await page.type(draft, value);
      await page.keyboard.press('Enter');
      await page.waitForFunction((selector, count) => document.querySelectorAll(selector).length > count, {}, turns, before);
    };
    const last = () => page.$$eval(turns, nodes => nodes.at(-1).textContent);
    try {
      await page.setViewport({ width, height: 844, isMobile: mobile, hasTouch: mobile });
      await reader.load('/');
      await page.waitForFunction(() => document.querySelector('.ask-link')?.getAttribute('aria-haspopup') === 'dialog');
      assert.equal(await page.$(`${modal}[open], #pi-chat, [data-pi-popup], #siteSearchOverlayAsk`), null, 'the generated-answer concierge is not on the page');
      await page.evaluate(marker => {
        window.__askStorageOps = [];
        for (const name of ['getItem', 'setItem', 'removeItem']) {
          const method = Storage.prototype[name];
          Storage.prototype[name] = function (...args) {
            if (args.some(value => /ask|pi-chat/i.test(String(value)) || String(value).includes(marker))) window.__askStorageOps.push([name, String(args[0])]);
            return method.apply(this, args);
          };
        }
      }, MARKER);

      if (mobile) await page.tap(opener);
      else {
        await page.focus(opener);
        await page.keyboard.press('Enter');
      }
      await page.waitForSelector(`${modal}[open]`, { visible: true });
      assert.equal(await page.$eval(modal, el => el.matches(':modal')), true);
      assert.match(await page.$eval('#ask-dialog-scope', el => el.textContent), /doesn’t use AI.*doesn’t send or save/s);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
      assert.equal(await page.evaluate(() => document.activeElement?.id), mobile ? '' : 'ask-dialog-question');
      const box = await page.$eval(modal, el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, w: innerWidth, h: innerHeight };
      });
      assert.ok(box.left >= 0 && box.right <= box.w && box.top >= 0 && box.bottom <= box.h, JSON.stringify(box));
      assert.equal(await page.$(`${modal} [data-evt], ${modal} [aria-label*="microphone" i]`), null);
      for (let i = 0; i < 9; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('#ask-guide-dialog')), true, 'focus stays inside the dialog');
      }

      // A question becomes cards whose words are the index's words.
      await submit('Where should we have lunch in Red Hill?');
      assert.match(await last(), /places to eat and drink in Red Hill/);
      const cards = await page.$$eval(`${turns}:last-child .ask-guide__card`, rows => rows.map(row => ({
        href: row.querySelector('a').getAttribute('href'), title: row.querySelector('a').textContent, summary: row.querySelector('.ask-guide__summary')?.textContent,
      })));
      assert.deepEqual(cards.map(card => card.href).sort(), ['/eat/red-gum-bbq/', '/eat/tedesca-osteria/']);
      assert.equal(cards.find(card => card.href === '/eat/tedesca-osteria/').summary, 'A single-set-menu osteria inside a restored Red Hill farmhouse.');

      // A chip is a follow-up on the same answer.
      const chip = await page.$$eval(`${turns}:last-child [data-ask-guide-chip]`, buttons => buttons.map(button => button.textContent));
      assert.ok(chip.includes('Places to stay in Red Hill'), chip.join(' | '));
      const before = (await page.$$(turns)).length;
      await page.evaluate(selector => [...document.querySelectorAll(selector)].find(button => button.textContent === 'Places to stay in Red Hill').click(), `${turns}:last-child [data-ask-guide-chip]`);
      await page.waitForFunction((selector, count) => document.querySelectorAll(selector).length > count, {}, turns, before);
      assert.ok(await page.$(`${turns}:last-child a[href="/stay/lindenderry/"]`));
      assert.equal((await page.$$(`${turns}:not(:last-child) [data-ask-guide-chip]`)).length, 0, 'only the latest answer offers chips');

      // What it cannot check, it says it cannot check.
      await submit('Is Tedesca Osteria open today?');
      assert.match(await last(), /can’t check opening hours/);
      assert.ok(await page.$(`${turns}:last-child a[href="/eat/tedesca-osteria/"]`));

      // Markup in a question is text, and an unmatched question hands off to search with the exact words.
      const odd = `${MARKER} <b>pirates</b> & "quotes"`;
      await submit(odd);
      assert.equal(await page.$(`${turns} b`), null);
      assert.equal((await page.$$(`${turns}:last-child .ask-guide__card`)).length, 0);
      const handoff = await page.$$eval(`${turns}:last-child a[href^="/search/"]`, links => links.at(-1).href);
      assert.equal(new URL(handoff).searchParams.get('q'), odd);

      assert.deepEqual(leaks, [], 'no question text leaves the browser and the concierge is never called');
      assert.deepEqual([...new Set(fetched)], ['GET /ask/index.json'], 'the only request is the index, with no query');
      assert.deepEqual(await page.evaluate(() => window.__askStorageOps), [], 'nothing is written to storage');

      // Escape returns focus; the thread is still there on reopening.
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#ask-guide-dialog')?.open && document.activeElement?.classList.contains('ask-link'));
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
      await page.keyboard.press('Enter');
      await page.waitForSelector(`${modal}[open]`);
      assert.equal((await page.$$(turns)).length, 4);

      // Following a card closes the dialog and unlocks the page; the thread survives the navigation.
      await page.evaluate(selector => document.querySelector(selector).click(), `${turns} a[href="/eat/tedesca-osteria/"]`);
      await page.waitForFunction(() => location.pathname === '/eat/tedesca-osteria/');
      await page.waitForFunction(() => document.querySelector('.ask-link')?.getAttribute('aria-haspopup') === 'dialog');
      assert.equal(await page.$(`${modal}[open]`), null);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
      await page.focus(opener);
      await page.keyboard.press('Enter');
      await page.waitForSelector(`${modal}[open]`);
      assert.equal((await page.$$(turns)).length, 4, 'the conversation is kept across a client-side navigation');

      // Start over clears it.
      await page.evaluate(() => document.querySelector('#ask-guide-dialog [data-ask-guide-reset]').click());
      assert.equal((await page.$$(turns)).length, 0);
      await page.keyboard.press('Escape');
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}

test('the /ask/ page answers a question sent in its address, and the menu link goes to its question box', { skip: !guideOn }, async () => {
  const reader = await site.reader();
  const page = reader.page;
  try {
    await reader.load('/ask/?q=' + encodeURIComponent('lunch in Red Hill'));
    await page.waitForFunction(() => document.querySelectorAll('main [data-ask-guide-log] > article').length === 1);
    assert.ok(await page.$('main [data-ask-guide-log] a[href="/eat/tedesca-osteria/"]'));
    assert.equal(await page.$eval('h1', el => el.textContent.trim()), 'Ask PI');
    await page.click(opener);
    assert.equal(await page.$(`${modal}[open]`), null);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'ask-page-question');
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
  }
});
