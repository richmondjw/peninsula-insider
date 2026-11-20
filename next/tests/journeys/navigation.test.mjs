/**
 * PI-012: the listener sweep, as a measurement rather than a reading.
 *
 * scripts/client-listener-hygiene.test.mjs scans source for the shapes that
 * are known to accumulate. It is cheap and it runs on every build, and it
 * should stay - but it can only find shapes someone has already thought of. It
 * missed six live accumulators because it follows a function called by name
 * and not a function passed as an argument, which is how every v5 island
 * registers (`querySelectorAll(...).forEach(hydrate)`).
 *
 * This test does not read the source at all. It drives the built site, counts
 * every listener, interval and observer held on `document` or `window`, walks
 * back and forth between two pages, and counts again. A shape nobody has
 * thought of still shows up as a number that went up, with the file that
 * registered it named in the failure.
 *
 * WARM-UP. The first visit to a page type executes bundled modules that have
 * never run in this tab, and each registers its listeners once. That is
 * correct and finite. So the baseline is taken after two full round trips,
 * by which point every module on both pages has executed, and only growth
 * AFTER that point counts - which is growth per navigation, which is
 * unbounded.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Site, grown } from './harness.mjs';

const askPiFlag = readFileSync(new URL('../../src/lib/features.ts', import.meta.url), 'utf8')
  .match(/^export const SHOW_ASK_PI = (true|false);\s*$/m);
assert.ok(askPiFlag, 'Declare the active or paused Ask PI mode explicitly before testing it');
const askPiActive = askPiFlag[1] === 'true';
// Ask PI answered from the guides is a third mode with its own journey
// (ask-guide.test.mjs); the paused-page assertions below do not apply to it.
const askGuideActive = !askPiActive && /^export const SHOW_ASK_GUIDE = true;\s*$/m.test(readFileSync(new URL('../../src/lib/features.ts', import.meta.url), 'utf8'));
const askPaused = !askPiActive && !askGuideActive;

async function assertPausedAskMenu(page) {
  assert.equal(await page.$('#pi-chat, .pi-tile, [data-pi-popup], #siteSearchOverlayAsk'), null);
  assert.equal((await page.$$('.ask-link')).length, 1);
  assert.deepEqual(await page.$eval('.ask-link', el => ({
    tag: el.tagName,
    href: el.getAttribute('href'),
    label: el.getAttribute('aria-label'),
    title: el.getAttribute('title'),
    event: el.getAttribute('data-evt'),
  })), {
    tag: 'A', href: '/ask/', label: 'Ask PI, currently site search',
    title: 'Ask PI, currently site search', event: null,
  });
}

const site = await Site.open();
test.after(() => site.close());

/**
 * One pair per journey, plus the two layout surfaces that carry the site
 * chrome. Every page here is on a journey named in the ticket.
 */
const PAIRS = [
  ['/', '/eat/', 'the home page and a hub, which is most readers\' first navigation'],
  ['/search/', '/eat/', 'search'],
  ['/saved/', '/eat/', 'saves, legacy surface'],
  ['/me/saved/', '/eat/', 'saves, v5 surface'],
  ['/me/trip/', '/me/saved/', 'trips, between the two surfaces that write the same store'],
  ['/explore/plans/', '/eat/', 'planning'],
  ['/whats-on/', '/explore/', 'two filtered hubs'],
  ['/explore/map/', '/eat/', 'the map surface'],
];

/**
 * Before any of it: prove the tape measure moves.
 *
 * Every assertion below is of the form "nothing grew", and a DEAD counter
 * reports exactly that. If the wrappers in instrument() ever stopped being
 * installed - a Chrome change, a CSP, a refactor that lands before the
 * instrumentation script - this whole file would go green and STAY green
 * while the defect it exists to catch shipped freely.
 *
 * So the first test registers a listener the harness controls and asserts the
 * counter moved by exactly one, then removes it and asserts the counter came
 * back down. It does not depend on how many listeners the site happens to
 * register, so it cannot drift with the corpus or the design, and it fails
 * loudly the day the instrumentation stops working.
 */
test('the instrumentation counts - every "nothing grew" below is void without this', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');

    const before = await reader.instrumentation();
    assert.ok(
      before.listenerTotal > 0,
      'the site registered no document/window listeners at all on a cold load of "/". '
      + 'Either the page shipped no behaviour or the counters are not installed; in both '
      + 'cases the growth assertions below would pass on a corpse.',
    );

    await reader.page.evaluate(() => {
      window.__probe = () => {};
      document.addEventListener('pi-harness-probe', window.__probe);
    });
    const added = await reader.instrumentation();
    assert.equal(
      added.listenerTotal,
      before.listenerTotal + 1,
      'registering one listener on document did not move the counter, so the '
      + 'addEventListener wrapper is not installed and no growth can ever be observed',
    );

    await reader.page.evaluate(() => {
      document.removeEventListener('pi-harness-probe', window.__probe);
    });
    const removed = await reader.instrumentation();
    assert.equal(
      removed.listenerTotal,
      before.listenerTotal,
      'removing the listener did not bring the counter back down, so a balanced '
      + 'teardown-and-rebind would be reported as a leak and every failure here would be noise',
    );

    assert.ok(
      before.sourcesAttributed > 0,
      'no registration was attributed to a source file, so a failure below could name the '
      + 'symptom but never the file to fix',
    );
  } finally {
    await reader.close();
  }
});

for (const [a, b, why] of PAIRS) {
  test(`no listener accumulates walking between ${a} and ${b} (${why})`, async () => {
    const reader = await site.reader();
    try {
      await reader.load(a);
      // Warm: every module on both pages has now executed at least once.
      await reader.navigate(b);
      await reader.navigate(a);
      await reader.navigate(b);
      await reader.navigate(a);
      const before = await reader.globals();
      // A page that rendered nothing registers nothing, and "nothing grew" is
      // then true for the most boring possible reason. Refuse to report green
      // off a blank pair.
      assert.ok(
        Object.keys(before.listeners).length > 0,
        `after four navigations between ${a} and ${b}, not one listener was held on `
        + 'document or window. Neither page is running any client behaviour, so the '
        + 'growth check below would pass whatever the router did.',
      );

      for (let i = 0; i < 3; i += 1) {
        await reader.navigate(b);
        await reader.navigate(a);
      }
      const after = await reader.globals();

      const growth = grown(before, after);
      const detail = growth.map((line) => {
        const key = line.slice(0, line.lastIndexOf(':'));
        const was = before.sources[key] || {};
        const now = after.sources[key] || {};
        const who = Object.entries(now)
          .filter(([src, n]) => n > (was[src] || 0))
          .map(([src, n]) => `        ${src} (${was[src] || 0} -> ${n})`);
        return [`      ${line}`, ...who].join('\n');
      });

      assert.deepEqual(
        growth,
        [],
        `Six navigations between ${a} and ${b} left extra listeners behind.\n`
        + 'Each one is a copy that will run on the next event, on a DOM that no longer exists, '
        + 'for the life of the tab. Register on document/window once at module scope, or tear the '
        + 'previous registration down before making a new one.\n'
        + detail.join('\n'),
      );
    } finally {
      await reader.close();
    }
  });
}

test('walking the journeys raises no uncaught error', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    for (const route of ['/eat/', '/search/', '/me/saved/', '/me/trip/', '/explore/plans/', '/']) {
      await reader.navigate(route);
    }
    assert.deepEqual(
      await reader.errors(),
      [],
      'an uncaught error stops every handler registered after it on that turn, so the page '
      + 'half-works in a way nothing reports',
    );
  } finally {
    await reader.close();
  }
});

for (const width of [320, 390, 1280, 1440]) {
  test(`paused Ask PI menu is reachable without a chat at ${width}px`, { skip: !askPaused }, async (t) => {
    const reader = await site.reader();
    const page = reader.page;
    const askCalls = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname.includes('/concierge/')) askCalls.push(request.method());
    });
    try {
      await page.setViewport({ width, height: 900, isMobile: width < 768, hasTouch: width < 768 });
      await reader.load('/');
      await assertPausedAskMenu(page);
      const menu = await page.$eval('.ask-link', el => {
        const box = el.getBoundingClientRect();
        return {
          width: box.width, height: box.height,
          visible: el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)),
          overflow: document.documentElement.scrollWidth > innerWidth,
          imageLoaded: el.querySelector('img').naturalWidth > 0,
        };
      });
      assert.ok(menu.visible && menu.imageLoaded && menu.width >= 44 && menu.height >= 44, JSON.stringify(menu));
      assert.equal(menu.overflow, false);
      if (width < 1280) {
        for (let repeat = 0; repeat < 2; repeat++) {
          await page.click('.mobile-menu');
          assert.equal(await page.$eval('#mobile-drawer', el => el.open), true);
          assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
          await page.keyboard.press('Escape');
          assert.equal(await page.$eval('#mobile-drawer', el => el.open), false);
          assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('mobile-menu')), true);
          assert.equal(await page.evaluate(() => document.body.style.position), '');
          assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
        }
      }
      await page.focus('.brand');
      for (let tabs = 0; tabs < 30; tabs++) {
        if (await page.evaluate(() => document.activeElement?.classList.contains('ask-link'))) break;
        await page.keyboard.press('Tab');
      }
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('ask-link')), true, 'Ask PI is reachable by Tab from the home link');
      assert.equal(await page.$eval('.ask-link', el => el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth) > 0), true);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.pathname === '/ask/' && document.querySelector('#ask-safe-q'));
      await assertPausedAskMenu(page);
      assert.equal(await page.$eval('main.ask-safe .ask-safe__status', el => el.textContent.trim()), 'Temporarily paused');
      assert.equal(await page.$('dialog[open], #pi-chat'), null);
      if (width < 768) {
        await reader.navigate('/');
        await page.evaluate(() => {
          const events = [];
          const state = () => {
            const link = document.querySelector('.ask-link');
            const rect = link?.getBoundingClientRect();
            const x = rect ? rect.left + rect.width / 2 : -1;
            const y = rect ? rect.top + rect.height / 2 : -1;
            const hit = document.elementFromPoint(x, y);
            return {
              path: location.pathname, x, y, scrollY: window.scrollY,
              transition: document.documentElement.getAttribute('data-astro-transition'),
              hit: hit?.className?.baseVal ?? hit?.className ?? hit?.tagName ?? null,
              actionable: !!link && getComputedStyle(link).visibility === 'visible' && link.contains(hit),
              drawerOpen: document.querySelector('#mobile-drawer')?.open,
              bodyPosition: document.body.style.position,
              htmlOverflow: document.documentElement.style.overflow,
            };
          };
          for (const type of ['pointerdown', 'pointerup', 'click']) {
            document.addEventListener(type, event => {
              if (events.length >= 12) return;
              events.push({ type, trusted: event.isTrusted, pointer: event.pointerType,
                tag: event.target?.nodeName, onAsk: !!event.target?.closest?.('.ask-link') });
            }, { capture: true });
          }
          window.__askMenuTap = { state, events };
        });
        const initial = await page.evaluate(() => window.__askMenuTap.state());
        // Astro emits page-load before the document transition finishes. A painted
        // transition snapshot is not a hit-testable link. Tap as soon as the real
        // control owns its center point, not after an arbitrary delay.
        let ready;
        try {
          const actionableCenter = await page.waitForFunction(() => {
            const s = window.__askMenuTap.state();
            return s.path === '/' && s.actionable && !s.drawerOpen && !s.bodyPosition && !s.htmlOverflow ? s : false;
          }, { timeout: 5000, polling: 'raf' });
          ready = await actionableCenter.jsonValue();
          await actionableCenter.dispose();
          await page.touchscreen.tap(ready.x, ready.y);
          await page.waitForFunction(() => location.pathname === '/ask/' && document.querySelector('#ask-safe-q'), { timeout: 8000 });
          const events = await page.evaluate(() => window.__askMenuTap?.events);
          assert.ok(events?.some(e => e.type === 'pointerdown' && e.pointer === 'touch' && e.trusted && e.onAsk), 'the browser delivered touch to the real Ask PI link');
          assert.ok(events?.some(e => e.type === 'click' && e.trusted && e.onAsk), 'the real touch activated the Ask PI link');
        } finally {
          const final = await page.evaluate(() => ({ ...window.__askMenuTap?.state(), events: window.__askMenuTap?.events }));
          t.diagnostic(JSON.stringify({ width, initial, ready, final }));
        }
        await assertPausedAskMenu(page);
      }
      assert.deepEqual(askCalls, []);
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {

  test(`Ask PI paused uses editorial search at ${viewport.width}px`, { skip: !askPaused }, async () => {
    const reader = await site.reader();
    const page = reader.page;
    const askCalls = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/concierge/')) {
        askCalls.push(request.method());
      }
    });
    try {
      await page.setViewport(viewport);
      await page.evaluateOnNewDocument(() => {
        if (window.top !== window) return;
        sessionStorage.setItem('pi-chat-state', 'open');
        sessionStorage.setItem('pi-chat-history', JSON.stringify([
          { role: 'pi', text: 'Old recommendation', places: [{ title: 'Eat', href: '/eat/' }], next: [] },
        ]));
      });

      await reader.load('/');
      await assertPausedAskMenu(page);
      assert.equal(await page.$eval('[data-ask-enabled]', el => el.dataset.askEnabled), 'false');

      const query = 'Where can I eat in Red Hill?';
      await reader.load('/ask/?q=' + encodeURIComponent(query));
      assert.equal(await page.$eval('main.ask-safe .ask-safe__status', el => el.textContent.trim()), 'Temporarily paused');
      await assertPausedAskMenu(page);
      assert.equal(await page.$eval('form[role="search"] #ask-safe-q', el => el.value), query);
      assert.equal(await page.$eval('main.ask-safe form', el => el.getAttribute('method')), 'get');
      await page.click('main.ask-safe form button[type="submit"]');
      await page.waitForFunction(q => location.pathname === '/search/' && new URLSearchParams(location.search).get('q') === q, {}, query);
      await page.waitForFunction(q => document.querySelector('#searchPageInput')?.value === q, {}, query);
      assert.deepEqual(askCalls, []);
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });


  test(`Ask PI paused preserves query through Astro history at ${viewport.width}px`, { skip: !askPaused }, async () => {
    const reader = await site.reader();
    const page = reader.page;
    const askCalls = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.includes('/concierge/')) askCalls.push(request.method());
    });
    const url = (query) => '/ask/?q=' + encodeURIComponent(query);
    const assertAsk = async (query) => {
      await page.waitForFunction(q => location.pathname === '/ask/'
        && new URLSearchParams(location.search).get('q') === q
        && document.querySelector('#ask-safe-q')?.value === q, { timeout: 6000 }, query);
      assert.equal(await page.evaluate(() => window.__askPauseHistoryDocument), 'same-document');
      await assertPausedAskMenu(page);
    };
    const edit = async (value) => {
      await page.focus('#ask-safe-q');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      if (value) await page.keyboard.type(value);
      else await page.keyboard.press('Backspace');
      assert.equal(await page.$eval('#ask-safe-q', input => input.value), value);
      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('astro:page-load'));
      });
      assert.equal(await page.$eval('#ask-safe-q', input => input.value), value);
    };
    const moveHistory = async (direction) => {
      const before = await page.evaluate(() => window.__J.pageLoads);
      await page.evaluate(dir => history.go(dir), direction);
      await page.waitForFunction(n => window.__J.pageLoads > n, { timeout: 6000 }, before);
      assert.equal(await page.evaluate(() => window.__askPauseHistoryDocument), 'same-document');
    };
    try {
      await page.setViewport(viewport);
      await reader.load('/');
      await page.evaluate(() => { window.__askPauseHistoryDocument = 'same-document'; });

      const first = 'Red Hill & lunch';
      const second = 'Sorrento coastal walk';
      await reader.navigate(url(first));
      await assertAsk(first);
      await edit('Personal draft edit');
      await edit('');

      await reader.navigate(url(second));
      await assertAsk(second);
      await moveHistory(-1);
      await assertAsk(first);
      await moveHistory(1);
      await assertAsk(second);

      await reader.navigate('/eat/');
      assert.equal(await page.$('#ask-safe-q'), null);
      await moveHistory(-1);
      await assertAsk(second);
      await moveHistory(1);
      assert.equal(await page.evaluate(() => location.pathname), '/eat/');
      assert.equal(await page.$('#ask-safe-q'), null);
      assert.deepEqual(askCalls, []);
      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });

  test(`Ask PI recommendation minimises and preserves conversation at ${viewport.width}px`, { skip: !askPiActive }, async () => {
    const reader = await site.reader();
    try {
      await reader.page.setViewport(viewport);
      await reader.page.evaluateOnNewDocument(() => {
        sessionStorage.setItem('pi-chat-state', 'open');
        sessionStorage.setItem('pi-chat-history', JSON.stringify([
          { role: 'you', text: 'Where should we eat?' },
          { role: 'pi', text: 'Browse Eat. ' + 'A useful recommendation to read while planning your day. '.repeat(35), places: [{ title: 'Eat', href: '/eat/' }], next: [] },
        ]));
      });
      await reader.load('/');
      await reader.page.waitForSelector('#pi-chat[data-state="open"] .pi-tile', { visible: true });
      // Amplify the overlay lifetime so an accidental wait or quick CI animation
      // cannot hide this regression. Only the recommendation transition is skipped.
      await reader.page.evaluate(() => {
        document.addEventListener('astro:before-swap', event => {
          const style = event.newDocument.createElement('style');
          style.textContent = '::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: 5s !important; }';
          event.newDocument.head.append(style);
        });
      });
      const history = await reader.page.evaluate(() => sessionStorage.getItem('pi-chat-history'));
      const pageLoads = await reader.page.evaluate(() => window.__J.pageLoads);
      await reader.page.click('.pi-tile__title');
      await reader.waitFor(n => window.__J.pageLoads > n, 'recommendation finishes Astro navigation', pageLoads);
      await reader.page.waitForFunction(() => location.pathname === '/eat/' && document.querySelector('#pi-chat')?.dataset.state === 'closed');
      await reader.page.waitForFunction(() => document.querySelector('#pi-chat-panel')?.hidden);
      const state = await reader.page.evaluate(() => ({
        stored: sessionStorage.getItem('pi-chat-state'),
        history: sessionStorage.getItem('pi-chat-history'),
        expanded: document.querySelector('#pi-chat-launch').getAttribute('aria-expanded'),
        locked: document.documentElement.classList.contains('pi-chat-sheet'),
        docked: document.documentElement.classList.contains('pi-chat-docked'),
      }));
      assert.equal(state.stored, 'closed');
      assert.equal(state.history, history);
      assert.equal(state.expanded, 'false');
      assert.equal(state.locked, false);
      assert.equal(state.docked, false);
      // Ask PI lives in the masthead (2026-11-16); the floating launcher is hidden.
      await reader.waitFor(() => {
        const link = document.querySelector('.ask-link');
        if (!link) return false;
        const style = getComputedStyle(link), r = link.getBoundingClientRect();
        return style.visibility === 'visible' && r.width > 0 && link.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }, 'masthead Ask PI is ready after destination settles');
      if (viewport.hasTouch) await reader.page.tap('.ask-link');
      else await reader.page.click('.ask-link');
      await reader.waitFor(() => document.querySelector('#pi-chat')?.dataset.state === 'open' && !document.querySelector('#pi-chat-panel')?.hidden && !!document.querySelector('.pi-tile'), 'chat reopens with saved recommendations', null, { describe: () => {
        const root = document.querySelector('#pi-chat'), panel = document.querySelector('#pi-chat-panel'), launch = document.querySelector('.ask-link');
        const r = launch.getBoundingClientRect();
        return { state: root?.dataset.state, classes: root?.className, booted: root?.dataset.booted, panelHidden: panel?.hidden, tiles: document.querySelectorAll('.pi-tile').length, stored: sessionStorage.getItem('pi-chat-state'), hit: document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML, errors: window.__J.pageErrors, roots: document.querySelectorAll('#pi-chat').length };
      } });
      assert.equal(await reader.page.$eval('.pi-msg--you', el => el.textContent), 'Where should we eat?');
      // Scroll real overflowing content after reopening, not just scrollTop assignment.
      await reader.page.$eval('#pi-chat-thread', el => el.scrollTop = 0);
      const box = await reader.page.$eval('#pi-chat-thread', el => {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height * .75, height: r.height };
      });
      if (viewport.hasTouch) {
        const cdp = await reader.page.createCDPSession();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
        for (let i = 1; i <= 8; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - Math.min(240, box.height / 2) * i / 8 }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else {
        await reader.page.mouse.move(box.x, box.y);
        await reader.page.mouse.wheel({ deltaY: 240 });
      }
      await reader.page.waitForFunction(() => document.querySelector('#pi-chat-thread').scrollTop > 30, { timeout: 1500 });
      await reader.page.click('#pi-chat-min');
      await reader.waitFor(() => document.querySelector('#pi-chat-panel')?.hidden, 'manual minimise still works');
      await reader.page.click('.ask-link');
      await reader.waitFor(() => document.querySelector('#pi-chat')?.dataset.state === 'open', 'manual reopen still works');
      await reader.page.$eval('.pi-tile', a => { a.href = '/explore/'; });
      const secondLoads = await reader.page.evaluate(() => window.__J.pageLoads);
      await reader.page.click('.pi-tile__title');
      await reader.waitFor(n => window.__J.pageLoads > n && location.pathname === '/explore/', 'second recommendation navigation completes', secondLoads);
      assert.equal(await reader.page.evaluate(() => document.querySelector('#pi-chat').dataset.state), 'closed');
      await reader.page.click('.ask-link');
      await reader.waitFor(() => document.querySelector('#pi-chat')?.dataset.state === 'open', 'chat reopens after second navigation');
      await reader.page.click('#pi-chat-new');
      await reader.waitFor(() => document.querySelector('#pi-chat-log')?.children.length === 0, 'new conversation control still works');

      assert.deepEqual(await reader.errors(), []);
    } finally {
      await reader.close();
    }
  });
}
