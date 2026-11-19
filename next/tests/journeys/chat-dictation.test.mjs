import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from './harness.mjs';

const policy = path => `camera=(), microphone=${path === '/ask/' ? '(self)' : '()'}, geolocation=(), payment=(), usb=()`;
const site = await Site.open({ headersForPath: path => ({ 'Permissions-Policy': policy(path) }) });
test.after(() => site.close());
async function reader(mode = 'provider', target = site) {
  const r = await target.reader();
  await r.page.evaluateOnNewDocument((mode) => {
    window.voiceFake = { starts: 0, stops: 0, aborts: 0, session: null, checks: [] };
    window.chatRequests = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (String(url).includes('/concierge/ask/stream')) {
        window.chatRequests.push(JSON.parse(options.body));
        return new Response('event: text\ndata: {"delta":"A mocked Peninsula answer."}\n\nevent: meta\ndata: {"recommendations":[],"follow_on":[]}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
      }
      return originalFetch(url, options);
    };
    class Recognition {
      constructor() { if (mode === 'local' || mode === 'delayed') this.processLocally = false; }
      static async available() {
        if (mode === 'delayed') return new Promise(resolve => window.voiceFake.checks.push(resolve));
        return 'available';
      }
      start() {
        window.voiceFake.starts++;
        window.voiceFake.session = this;
        window.voiceFake.lateResult = (text) => this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] });
        if (mode === 'throw') throw new Error('blocked');
        this.onstart?.();
      }
      stop() { window.voiceFake.stops++; }
      abort() { window.voiceFake.aborts++; }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: mode === 'unsupported' ? undefined : Recognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
  }, mode);
  await r.page.goto(target.origin + '/ask/', { waitUntil: 'domcontentloaded' });
  await r.page.waitForFunction(() => document.querySelector('[data-ask]')?.dataset.booted === '1');
  return r;
}
async function start(page) {
  await page.click('#ask-mic');
  await page.waitForSelector('#ask-voice-start', { visible: true });
  assert.equal(await page.evaluate(() => window.voiceFake.starts), 0);
  await page.click('#ask-voice-start');
}
const draft = (p) => p.$eval('#ask-q', n => n.value);
const message = (p) => p.$eval('#ask-voice-status', n => n.textContent);
async function result(p, text, index = 0) {
  await p.evaluate(({ text, index }) => {
    const results = Array.from({ length: index + 1 }, () => ({ isFinal: true, 0: { transcript: text } }));
    window.voiceFake.session.onresult?.({ resultIndex: index, results });
  }, { text, index });
}

test('explicit consent, append final results once, stop, edit and ordinary Send', async () => {
  const r = await reader(); const p = r.page;
  try {
    await p.type('#ask-q', 'Lunch near');
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
    await p.focus('#ask-mic'); await p.keyboard.press('Enter');
    await p.waitForSelector('#ask-voice-start', { visible: true });
    assert.match(await message(p), /may send audio/);
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
    await p.keyboard.press('Enter');
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 1);
    assert.equal(await p.evaluate(() => window.voiceFake.session.lang), 'en-AU');
    await result(p, 'Sorrento'); await result(p, 'Sorrento');
    assert.equal(await draft(p), 'Lunch near Sorrento');
    assert.equal(await p.$eval('[data-ask-answer]', n => n.hidden), true);
    assert.equal(await p.evaluate(() => window.chatRequests.length), 0);
    await p.click('#ask-mic');
    assert.equal(await p.evaluate(() => window.voiceFake.stops), 1);
    await result(p, 'with kids', 1);
    await p.evaluate(() => window.voiceFake.session.onend());
    assert.equal(await draft(p), 'Lunch near Sorrento with kids');
    assert.match(await message(p), /Review or edit/);
    await p.click('[data-ask-submit]');
    await p.waitForFunction(() => document.querySelector('[data-ask-question]')?.textContent.includes('Lunch near Sorrento with kids'));
    assert.equal(await draft(p), 'Lunch near Sorrento with kids');
    await p.waitForFunction(() => !document.querySelector('[data-ask-submit]').disabled);
    assert.deepEqual(await p.evaluate(() => window.chatRequests), [{ query: 'Lunch near Sorrento with kids' }]);
    assert.match(await p.$eval('[data-ask-answer]', n => n.textContent), /A mocked Peninsula answer/);
  } finally { await r.close(); }
});

test('real document header denial prevents even a fake recognizer from starting', async () => {
  const blocked = await Site.open({ headersForPath: () => ({ 'Permissions-Policy': policy('/about/') }) });
  const r = await reader('provider', blocked); const p = r.page;
  try {
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), false);
    await p.click('#ask-mic');
    assert.match(await message(p), /blocked by its permissions/);
    assert.equal(await p.$eval('#ask-voice-start', n => n.hidden), true);
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
  } finally { await r.close(); await blocked.close(); }
});

test('shared mic hands off an unsent draft and hard navigation keeps policies separate', async () => {
  const r = await reader(); const p = r.page;
  try {
    await r.load('/about/');
    await p.evaluate(() => { window.PIChat.open(); window.boundaryMarker = true; });
    await p.waitForSelector('#pi-chat-input', { visible: true });
    await p.type('#pi-chat-input', 'Keep this unsent draft');
    await p.click('#pi-chat-min'); await p.evaluate(() => window.PIChat.open());
    assert.equal(await p.$eval('#pi-chat-input', n => n.value), 'Keep this unsent draft');
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), false);
    assert.equal(await p.$eval('#pi-chat-mic', n => n.tagName), 'A');
    await Promise.all([p.waitForNavigation(), p.click('#pi-chat-mic')]);
    await p.waitForFunction(() => document.querySelector('[data-ask]')?.dataset.booted === '1');
    assert.equal(await p.evaluate(() => window.boundaryMarker), undefined);
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), true);
    assert.equal(await draft(p), 'Keep this unsent draft');
    assert.equal(await p.evaluate(() => sessionStorage.getItem('pi-voice-draft')), null);
    assert.equal(await p.evaluate(() => window.chatRequests.length), 0);
    assert.equal(new URL(p.url()).search, '');
    await start(p);
    await p.evaluate(() => window.addEventListener('pagehide', () => sessionStorage.setItem('voice-test-aborts', String(window.voiceFake.aborts)), { once: true }));
    await Promise.all([p.waitForNavigation(), p.click('#ask-voice a')]);
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), false);
    assert.equal(await p.evaluate(() => sessionStorage.getItem('voice-test-aborts')), '1');
    await p.goBack({ waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#ask-mic');
    assert.equal(await p.$eval('#ask-mic', n => n.getAttribute('aria-pressed')), 'false');
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), true);
    assert.ok(await p.evaluate(() => window.voiceFake.starts <= 1));
    await p.goForward({ waitUntil: 'domcontentloaded' });
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), false);
  } finally { await r.close(); }
});

test('only canonical Ask HTML allows microphone; other features, routes and assets remain denied', async () => {
  const r = await reader(); const p = r.page;
  try {
    for (const feature of ['camera', 'geolocation', 'payment', 'usb']) {
      assert.equal(await p.evaluate(f => document.featurePolicy.allowsFeature(f), feature), false);
    }
    const asset = await p.$eval('script[src]', n => n.getAttribute('src'));
    for (const path of ['/', '/about/', '/privacy/', '/ask/index.html', '/%61sk/', asset]) {
      const response = await fetch(site.origin + path);
      assert.equal(response.headers.get('permissions-policy'), policy(path), path);
    }
    for (const path of ['/ask/index.html', '/%61sk/']) {
      await p.goto(site.origin + path, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('#ask-mic');
      await p.click('#ask-mic');
      assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
      assert.match(await message(p), /unavailable/);
    }
  } finally { await r.close(); }
});

test('ordinary page links cross the Ask policy boundary with a new document', async () => {
  const r = await reader(); const p = r.page;
  try {
    await r.load('/about/');
    await p.evaluate(() => {
      window.boundaryMarker = true;
      const a = document.createElement('a');
      a.id = 'boundary-ask'; a.href = '/ask/'; a.textContent = 'Open as a page';
      a.dataset.piPage = 'true'; // Existing shared-chat page link convention; no reload attribute.
      document.body.append(a);
    });
    await Promise.all([p.waitForNavigation(), p.click('#boundary-ask')]);
    await p.waitForFunction(() => document.querySelector('[data-ask]')?.dataset.booted === '1');
    assert.equal(await p.evaluate(() => window.boundaryMarker), undefined);
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), true);
    assert.equal(await p.$('meta[name="astro-view-transitions-enabled"]'), null);
    await p.evaluate(() => {
      window.boundaryMarker = true;
      const a = document.createElement('a');
      a.id = 'boundary-about'; a.href = '/about/'; a.textContent = 'About'; document.body.append(a);
    });
    await Promise.all([p.waitForNavigation(), p.click('#boundary-about')]);
    assert.equal(await p.evaluate(() => window.boundaryMarker), undefined);
    assert.equal(await p.evaluate(() => document.featurePolicy.allowsFeature('microphone')), false);
  } finally { await r.close(); }
});

test('typing cancels and late recognition cannot overwrite edits; length is bounded', async () => {
  const r = await reader(); const p = r.page;
  try {
    await start(p); await result(p, 'Lunch');
    await p.type('#ask-q', ' edited');
    await p.evaluate(() => window.voiceFake.lateResult('stale replacement'));
    assert.equal(await draft(p), 'Lunch edited');
    assert.equal(await p.evaluate(() => window.voiceFake.aborts), 1);
    await p.$eval('#ask-q', n => { n.value = 'x'.repeat(498); });
    await p.click('#ask-mic'); await p.click('#ask-voice-start');
    await result(p, 'long sentence');
    assert.equal((await draft(p)).length, 500);
    assert.match(await message(p), /500-character/);
  } finally { await r.close(); }
});

test('denied, no-speech and network errors preserve typed text and offer fallback', async () => {
  for (const error of ['not-allowed', 'service-not-allowed', 'no-speech', 'network', 'audio-capture']) {
    const r = await reader(); const p = r.page;
    try {
      await p.type('#ask-q', 'My draft'); await start(p);
      await p.evaluate(error => window.voiceFake.session.onerror({ error }), error);
      assert.equal(await draft(p), 'My draft');
      assert.match(await message(p), /microphone on your keyboard/);
      assert.equal(await p.$eval('#ask-mic', n => n.getAttribute('aria-pressed')), 'false');
      assert.equal(await p.evaluate(() => window.voiceFake.starts), 1);
    } finally { await r.close(); }
  }
});

test('unsupported and synchronous failure leave typing usable', async () => {
  for (const mode of ['unsupported', 'throw']) {
    const r = await reader(mode); const p = r.page;
    try {
      await p.click('#ask-mic');
      if (mode === 'throw') await p.click('#ask-voice-start');
      assert.match(await message(p), /microphone on your keyboard/);
      await p.type('#ask-q', 'Still typing');
      assert.equal(await draft(p), 'Still typing');
    } finally { await r.close(); }
  }
});

test('on-device selection fails closed without provider fallback', async () => {
  const r = await reader('local'); const p = r.page;
  try {
    await start(p);
    assert.equal(await p.evaluate(() => window.voiceFake.session.processLocally), true);
    await p.evaluate(() => window.voiceFake.session.onerror({ error: 'language-not-supported' }));
    assert.match(await message(p), /No switch to online/);
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 1);
  } finally { await r.close(); }
});

test('stale availability cannot change the mode disclosed by a newer attempt', async () => {
  const r = await reader('delayed'); const p = r.page;
  try {
    await p.click('#ask-mic'); await p.click('#ask-mic');
    await p.evaluate(() => window.voiceFake.checks[1]('available'));
    await p.waitForSelector('#ask-voice-start', { visible: true });
    assert.match(await message(p), /run on this device/);
    await p.evaluate(() => window.voiceFake.checks[0]('unavailable'));
    await p.click('#ask-voice-start');
    assert.equal(await p.evaluate(() => window.voiceFake.session.processLocally), true);
  } finally { await r.close(); }
});

test('a route change during availability or before Start cannot begin capture', async () => {
  for (const phase of ['availability', 'start']) {
    const r = await reader('delayed'); const p = r.page;
    try {
      await p.click('#ask-mic');
      if (phase === 'start') {
        await p.evaluate(() => window.voiceFake.checks[0]('available'));
        await p.waitForSelector('#ask-voice-start', { visible: true });
      }
      await p.evaluate(() => history.replaceState(null, '', '/about/'));
      if (phase === 'availability') await p.evaluate(() => window.voiceFake.checks[0]('available'));
      else await p.click('#ask-voice-start');
      assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
      assert.match(await message(p), /unavailable/);
    } finally { await r.close(); }
  }
});

test('cancel, visibility, pagehide and hash changes clean up without resuming', async () => {
  for (const action of ['cancel', 'visibility', 'pagehide', 'hash']) {
    const r = await reader(); const p = r.page;
    try {
      await p.type('#ask-q', 'Keep me'); await start(p);
      await p.evaluate(() => { window.voiceFake.savedHandler = window.voiceFake.session.onresult; });
      if (action === 'cancel') await p.click('#ask-voice-cancel');
      if (action === 'visibility') await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      if (action === 'hash') await p.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
      if (action === 'pagehide') await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await p.evaluate(() => window.voiceFake.savedHandler({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'late' } }] }));
      assert.equal(await draft(p), 'Keep me');
      assert.equal(await p.evaluate(() => window.voiceFake.aborts), 1);
      assert.equal(await p.$eval('#ask-mic', n => n.getAttribute('aria-pressed')), 'false');
    } finally { await r.close(); }
  }
});

test('390px and 1440px composer geometry, focus and disclosed/listening/error views', async () => {
  for (const width of [390, 1440]) {
    const r = await reader(); const p = r.page;
    try {
      await p.setViewport({ width, height: 844 });
      const dimensions = await p.evaluate(() => {
        const rect = id => { const b = document.getElementById(id).getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height }; };
        return { mic: rect('ask-mic'), input: rect('ask-q'), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(dimensions.mic.width >= 44 && dimensions.mic.height >= 44);
      assert.ok(dimensions.input.right <= dimensions.mic.left);
      assert.ok(dimensions.input.width > 180);
      assert.equal(dimensions.overflow, false);
      await p.focus('#ask-q');
      await p.keyboard.press('Tab');
      await p.waitForFunction(() => document.activeElement?.id === 'ask-mic');
      assert.notEqual(await p.$eval('#ask-mic', n => getComputedStyle(n).outlineStyle), 'none');
      if (process.env.PI_VOICE_EVIDENCE) {
        await fs.mkdir(process.env.PI_VOICE_EVIDENCE, { recursive: true });
        await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/composer-${width}.png` });
      }
      await p.click('#ask-mic'); await p.waitForSelector('#ask-voice-start', { visible: true });
      if (process.env.PI_VOICE_EVIDENCE) await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/disclosure-${width}.png` });
      await p.click('#ask-voice-start');
      if (process.env.PI_VOICE_EVIDENCE) await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/listening-${width}.png` });
      await p.evaluate(() => window.voiceFake.session.onerror({ error: 'not-allowed' }));
      if (process.env.PI_VOICE_EVIDENCE) await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/denied-${width}.png` });
    } finally { await r.close(); }
  }
});
