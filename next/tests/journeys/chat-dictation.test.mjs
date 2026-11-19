import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from './harness.mjs';

const site = await Site.open();
test.after(() => site.close());
async function reader(mode = 'provider') {
  const r = await site.reader();
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
  await r.load('/about/');
  await r.page.evaluate(() => window.PIChat.open());
  await r.page.waitForSelector('#pi-chat-input', { visible: true });
  return r;
}
async function start(page) {
  await page.click('#pi-chat-mic');
  await page.waitForSelector('#pi-chat-voice-start', { visible: true });
  assert.equal(await page.evaluate(() => window.voiceFake.starts), 0);
  await page.click('#pi-chat-voice-start');
}
const draft = (p) => p.$eval('#pi-chat-input', n => n.value);
const message = (p) => p.$eval('#pi-chat-voice-status', n => n.textContent);
async function result(p, text, index = 0) {
  await p.evaluate(({ text, index }) => {
    const results = Array.from({ length: index + 1 }, () => ({ isFinal: true, 0: { transcript: text } }));
    window.voiceFake.session.onresult?.({ resultIndex: index, results });
  }, { text, index });
}

test('explicit consent, append final results once, stop, edit and ordinary Send', async () => {
  const r = await reader(); const p = r.page;
  try {
    await p.type('#pi-chat-input', 'Lunch near');
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
    await p.focus('#pi-chat-mic'); await p.keyboard.press('Enter');
    await p.waitForSelector('#pi-chat-voice-start', { visible: true });
    assert.match(await message(p), /may send audio/);
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 0);
    await p.keyboard.press('Enter');
    assert.equal(await p.evaluate(() => window.voiceFake.starts), 1);
    assert.equal(await p.evaluate(() => window.voiceFake.session.lang), 'en-AU');
    await result(p, 'Sorrento'); await result(p, 'Sorrento');
    assert.equal(await draft(p), 'Lunch near Sorrento');
    assert.equal(await p.$$eval('#pi-chat-log .pi-msg--you', n => n.length), 0);
    assert.equal(await p.evaluate(() => window.chatRequests.length), 0);
    await p.click('#pi-chat-mic');
    assert.equal(await p.evaluate(() => window.voiceFake.stops), 1);
    await result(p, 'with kids', 1);
    await p.evaluate(() => window.voiceFake.session.onend());
    assert.equal(await draft(p), 'Lunch near Sorrento with kids');
    assert.match(await message(p), /Review or edit/);
    await p.click('#pi-chat-send');
    await p.waitForFunction(() => document.querySelector('#pi-chat-log')?.textContent.includes('Lunch near Sorrento with kids'));
    assert.equal(await draft(p), '');
    await p.waitForFunction(() => !document.querySelector('#pi-chat-send').disabled);
    assert.deepEqual(await p.evaluate(() => window.chatRequests), [{ query: 'Lunch near Sorrento with kids' }]);
    assert.match(await p.$eval('#pi-chat-log', n => n.textContent), /A mocked Peninsula answer/);
  } finally { await r.close(); }
});

test('typing cancels and late recognition cannot overwrite edits; length is bounded', async () => {
  const r = await reader(); const p = r.page;
  try {
    await start(p); await result(p, 'Lunch');
    await p.type('#pi-chat-input', ' edited');
    await p.evaluate(() => window.voiceFake.lateResult('stale replacement'));
    assert.equal(await draft(p), 'Lunch edited');
    assert.equal(await p.evaluate(() => window.voiceFake.aborts), 1);
    await p.$eval('#pi-chat-input', n => { n.value = 'x'.repeat(498); });
    await p.click('#pi-chat-mic'); await p.click('#pi-chat-voice-start');
    await result(p, 'long sentence');
    assert.equal((await draft(p)).length, 500);
    assert.match(await message(p), /500-character/);
  } finally { await r.close(); }
});

test('denied, no-speech and network errors preserve typed text and offer fallback', async () => {
  for (const error of ['not-allowed', 'service-not-allowed', 'no-speech', 'network', 'audio-capture']) {
    const r = await reader(); const p = r.page;
    try {
      await p.type('#pi-chat-input', 'My draft'); await start(p);
      await p.evaluate(error => window.voiceFake.session.onerror({ error }), error);
      assert.equal(await draft(p), 'My draft');
      assert.match(await message(p), /microphone on your keyboard/);
      assert.equal(await p.$eval('#pi-chat-mic', n => n.getAttribute('aria-pressed')), 'false');
      assert.equal(await p.evaluate(() => window.voiceFake.starts), 1);
    } finally { await r.close(); }
  }
});

test('unsupported and synchronous failure leave typing usable', async () => {
  for (const mode of ['unsupported', 'throw']) {
    const r = await reader(mode); const p = r.page;
    try {
      await p.click('#pi-chat-mic');
      if (mode === 'throw') await p.click('#pi-chat-voice-start');
      assert.match(await message(p), /microphone on your keyboard/);
      await p.type('#pi-chat-input', 'Still typing');
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
    await p.click('#pi-chat-mic'); await p.click('#pi-chat-mic');
    await p.evaluate(() => window.voiceFake.checks[1]('available'));
    await p.waitForSelector('#pi-chat-voice-start', { visible: true });
    assert.match(await message(p), /run on this device/);
    await p.evaluate(() => window.voiceFake.checks[0]('unavailable'));
    await p.click('#pi-chat-voice-start');
    assert.equal(await p.evaluate(() => window.voiceFake.session.processLocally), true);
  } finally { await r.close(); }
});

test('cancel, minimise/reopen, reset, visibility, pagehide and soft navigation clean up', async () => {
  for (const action of ['cancel', 'minimise', 'reset', 'visibility', 'pagehide', 'navigate']) {
    const r = await reader(); const p = r.page;
    try {
      await p.type('#pi-chat-input', 'Keep me'); await start(p);
      await p.evaluate(() => { window.voiceFake.savedHandler = window.voiceFake.session.onresult; });
      if (action === 'cancel') await p.click('#pi-chat-voice-cancel');
      if (action === 'minimise') { await p.click('#pi-chat-min'); await p.evaluate(() => window.PIChat.open()); }
      if (action === 'reset') await p.click('#pi-chat-new');
      if (action === 'visibility') await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      if (action === 'pagehide') await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      if (action === 'navigate') await r.navigate('/contact/');
      await p.evaluate(() => window.voiceFake.savedHandler({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'late' } }] }));
      assert.equal(await draft(p), 'Keep me');
      assert.equal(await p.evaluate(() => window.voiceFake.aborts), 1);
      assert.equal(await p.$eval('#pi-chat-mic', n => n.getAttribute('aria-pressed')), 'false');
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
        return { mic: rect('pi-chat-mic'), send: rect('pi-chat-send'), input: rect('pi-chat-input'), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(dimensions.mic.width >= 44 && dimensions.mic.height >= 44);
      assert.ok(dimensions.mic.right <= dimensions.send.left);
      assert.ok(dimensions.input.width > 180);
      assert.equal(dimensions.overflow, false);
      await p.focus('#pi-chat-mic');
      await p.keyboard.press('Tab');
      await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift');
      assert.notEqual(await p.$eval('#pi-chat-mic', n => getComputedStyle(n).outlineStyle), 'none');
      if (process.env.PI_VOICE_EVIDENCE) {
        await fs.mkdir(process.env.PI_VOICE_EVIDENCE, { recursive: true });
        await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/composer-${width}.png` });
      }
      await p.click('#pi-chat-mic'); await p.waitForSelector('#pi-chat-voice-start', { visible: true });
      if (process.env.PI_VOICE_EVIDENCE) await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/disclosure-${width}.png` });
      await p.click('#pi-chat-voice-start');
      if (process.env.PI_VOICE_EVIDENCE) await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/listening-${width}.png` });
      await p.evaluate(() => window.voiceFake.session.onerror({ error: 'not-allowed' }));
      if (process.env.PI_VOICE_EVIDENCE) await p.screenshot({ path: `${process.env.PI_VOICE_EVIDENCE}/denied-${width}.png` });
    } finally { await r.close(); }
  }
});
