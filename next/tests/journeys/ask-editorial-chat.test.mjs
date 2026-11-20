/** The flag used to build next/dist must match this isolated browser fixture.
 * Default-off smoke: node --test tests/journeys/ask-editorial-chat.test.mjs
 * Pilot: PI_ASK_EDITORIAL_CHAT_FIXTURE=1 node --test tests/journeys/ask-editorial-chat.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';

const fixture = process.env.PI_ASK_EDITORIAL_CHAT_FIXTURE === '1';
const site = await Site.open();
test.after(() => site.close());

const opener = '.ask-link';
const modal = '#ask-editorial-dialog';
const draft = '#ask-editorial-question';
const turns = '[data-ask-editorial-turns] > div';

test('default build preserves the paused Search entry and does not render the pilot', { skip: fixture }, async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    assert.equal(await reader.page.$eval(opener, link => link.getAttribute('href')), '/ask/');
    assert.equal(await reader.page.$(modal + ', [data-ask-editorial-open], #pi-chat, [data-pi-popup]'), null);
    await reader.page.click(opener);
    await reader.page.waitForFunction(() => location.pathname === '/ask/' && !!document.querySelector('#ask-safe-q'));
  } finally {
    await reader.close();
  }
});

test('fixture works without JavaScript as a normal /ask/ link', { skip: !fixture }, async () => {
  const reader = await site.reader();
  try {
    const page = reader.page;
    await page.setJavaScriptEnabled(false);
    await page.goto(site.origin + '/', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval(opener, link => link.getAttribute('href')), '/ask/');
    assert.equal(await page.$eval(opener, link => link.getAttribute('aria-haspopup')), null);
    assert.equal(await page.$(modal + '[open]'), null);
    await Promise.all([page.waitForNavigation(), page.click(opener)]);
    assert.equal(new URL(page.url()).pathname, '/ask/');
    assert.ok(await page.$('#ask-safe-q'));
  } finally {
    await reader.close();
  }
});

for (const width of [320, 390, 1280, 1440]) {
  test('fixture editorial chat is bounded, private and keyboard accessible at ' + width + 'px', { skip: !fixture }, async () => {
    const reader = await site.reader();
    const page = reader.page;
    const mobile = width < 768;
    const protectedRequests = [];
    const marker = 'EDITORIAL_FIXTURE_PRIVATE_4825';
    let capture = false;
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/concierge/') || (capture && (
        url.href.includes(marker) || (request.postData() ?? '').includes(marker) ||
        request.resourceType() === 'xhr' || request.resourceType() === 'fetch'
      ))) protectedRequests.push(url.pathname);
    });
    const submit = async value => {
      await page.focus(draft);
      await page.type(draft, value);
      await page.keyboard.press('Enter');
    };
    const last = () => page.$$eval(turns, nodes => nodes.at(-1).textContent);
    try {
      await page.setViewport({ width, height: 844, isMobile: mobile, hasTouch: mobile });
      await page.evaluateOnNewDocument(() => {
        sessionStorage.setItem('pi-chat-state', 'open');
        sessionStorage.setItem('pi-chat-history', '[{"role":"pi","text":"Legacy answer to ignore"}]');
      });
      await reader.load('/');
      await page.waitForFunction(() => document.querySelector('.ask-link')?.getAttribute('aria-haspopup') === 'dialog');
      assert.equal(await page.$(modal + '[open], #pi-chat, [data-pi-popup], #siteSearchOverlayAsk'), null);
      assert.equal(await page.$eval('[data-ask-enabled]', el => el.dataset.askEnabled), 'false');
      await page.evaluate(() => {
        window.__askStorageOps = [];
        for (const name of ['getItem', 'setItem', 'removeItem']) {
          const method = Storage.prototype[name];
          Storage.prototype[name] = function (...args) {
            if (String(args[0]).includes('pi-chat') || args.some(a => String(a).includes('EDITORIAL_FIXTURE_PRIVATE_4825'))) {
              window.__askStorageOps.push([name, args[0]]);
            }
            return method.apply(this, args);
          };
        }
      });

      if (mobile) await page.tap(opener);
      else {
        await page.focus(opener);
        await page.keyboard.press('Enter');
      }
      await page.waitForSelector(modal + '[open]', { visible: true });
      assert.equal(await page.$eval(modal, el => el.matches(':modal')), true);
      assert.equal(await page.$eval(modal, el => el.getAttribute('aria-labelledby')), 'ask-editorial-title');
      assert.match(await page.$eval('#ask-editorial-scope', el => el.textContent), /not AI/);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
      assert.equal(await page.evaluate(() => document.activeElement?.id), mobile ? '' : 'ask-editorial-question');
      if (mobile) assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-ask-editorial-close')), true);
      const box = await page.$eval(modal, el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, w: innerWidth, h: innerHeight };
      });
      assert.ok(box.left >= 0 && box.right <= box.w && box.top >= 0 && box.bottom <= box.h, JSON.stringify(box));
      assert.equal(await page.$eval(modal, el => el.textContent.includes('Legacy answer to ignore')), false);
      assert.equal(await page.$('#ask-editorial-dialog [data-evt], #ask-editorial-dialog [aria-label*="microphone" i]'), null);
      for (let i = 0; i < 9; i++) {
        await page.keyboard.press('Tab');
        // Chromium's browser chrome can be in the Tab order of a native modal.
        // No element behind it may receive DOM focus.
        assert.equal(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('#ask-editorial-dialog')), true);
      }
      await page.focus('[data-ask-editorial-close]');
      await page.keyboard.press('/');
      assert.equal(await page.$('#siteSearchOverlay[data-open="true"]'), null);
      await page.click('[data-ask-editorial-example]');
      assert.equal(await page.$eval(draft, el => el.value), 'What is the Cape Schanck Boardwalk?');
      assert.equal((await page.$$(turns)).length, 0, 'examples are editable drafts and never auto-submit');
      capture = true;
      await page.keyboard.press('Enter');
      assert.match(await last(), /timber coastal boardwalk/);
      assert.ok(await page.$(turns + ' a[href="/explore/cape-schanck-boardwalk/"]'));
      await submit('Can I bring a wheelchair on Coppins Track today?');
      assert.match(await last(), /don’t verify live conditions/);
      assert.ok(await page.$(turns + ' a[href$="/sites/coppins-track"]'));
      const fallback = marker + ' & not Cape Schanck or Sorrento <b>no injection</b>';
      await submit(fallback);
      assert.equal(await page.$(turns + ' b'), null);
      assert.match(await last(), /only have editorial answers/);
      const handoff = await page.$$eval(turns + ' a[href^="/search/"]', links => links.at(-1).href);
      assert.equal(new URL(handoff).searchParams.get('q'), fallback);
      assert.deepEqual(protectedRequests, []);
      assert.deepEqual(await page.evaluate(() => window.__askStorageOps), []);
      capture = false;

      await page.type(draft, 'draft to discard');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#ask-editorial-dialog')?.open && document.activeElement?.classList.contains('ask-link'));
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
      await page.keyboard.press('Enter');
      await page.waitForSelector(modal + '[open]');
      assert.equal(await page.$eval(draft, el => el.value), '');
      assert.equal((await page.$$(turns)).length, 0);
      await submit(fallback);
      await page.click(turns + ' a[href^="/search/"]');
      await page.waitForFunction(value => location.pathname === '/search/' && document.querySelector('#searchPageInput')?.value === value, {}, fallback);
      assert.equal(await page.$(modal + '[open]'), null);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => location.pathname === '/' && document.querySelector('.ask-link')?.getAttribute('aria-haspopup') === 'dialog');
      assert.equal(await page.$(modal + '[open]'), null);
      assert.equal((await page.$$(turns)).length, 0);
      assert.equal(await page.$eval(draft, el => el.value), '');
      await page.focus(opener);
      await page.keyboard.press('/');
      await page.waitForSelector('#siteSearchOverlay[data-open="true"]');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#siteSearchOverlay[data-open="false"]');
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}
