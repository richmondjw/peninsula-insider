/** Real ClientRouter regression: filters must not erase router-owned history. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, grown } from './harness.mjs';
const site = await Site.open();
// Optional existing local dev server; default remains the normal built-site harness.
if (process.env.PI_FILTER_TEST_ORIGIN) {
  const url = new URL(process.env.PI_FILTER_TEST_ORIGIN);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.protocol, 'http:');
  site.origin = url.origin;
}
test.after(() => site.close());
async function click(page, selector) {
  const handles = await page.$$(selector);
  for (const handle of handles) {
    const visible = await handle.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest('[hidden],[inert]');
    });
    if (!visible) { await handle.dispose(); continue; }
    await handle.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    // The sheet animates into place. Wait for stable geometry before one
    // real pointer dispatch; never retry a click or bypass an occluding node.
    await handle.evaluate(async el => {
      const started = performance.now(); let last = '', since = started;
      while (performance.now() - started < 1500) {
        const r = el.getBoundingClientRect(), signature = JSON.stringify([r.x, r.y, r.width, r.height]);
        if (signature !== last) { last = signature; since = performance.now(); }
        if (performance.now() - since >= 200) return;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw Error('Chosen control geometry did not settle');
    });
    const point = await handle.evaluate(el => {
      const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { x, y, belongs: hit === el || el.contains(hit) };
    });
    assert.equal(point.belongs, true, 'Chosen control is occluded');
    await page.mouse.click(point.x, point.y); await handle.dispose(); return;
  }
  assert.fail('No visible control: ' + selector);
}
const snapshot = page => page.evaluate(() => ({
  state: history.state, length: history.length, url: location.href,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  count: document.querySelector('[data-filter-count]')?.textContent,
  status: document.getElementById('pi-results-status')?.textContent,
  focus: document.activeElement?.hasAttribute('data-sheet-open'),
  sort: document.querySelector('[data-sort-select]')?.value,
  visible: [...document.querySelectorAll('[data-filter-countable]:not([hidden])')].map(x => x.dataset.title),
}));
async function listing(reader, query) {
  await reader.waitFor(q => location.search === q && new URL(document.querySelector('link[rel="canonical"]')?.href).pathname === '/wine/' && !!document.querySelector('[data-filter-count]') && document.querySelector('[data-filter-count]').textContent === document.getElementById('pi-results-status')?.textContent, 'Filtered list URL, DOM and announcement must agree', query);
}
for (const width of [1440, 390]) test(`real filter history, restoration and listener stability at ${width}px`, async () => {
  const reader = await site.reader(); const { page } = reader; const requests = [];
  page.on('request', r => { if (r.resourceType() === 'fetch') requests.push(r.url()); });
  try {
    await page.setViewport({ width, height: 1000 }); await reader.load('/wine/');
    const initial = await snapshot(page); assert.equal(typeof initial.state.index, 'number');
    await click(page, '[data-filter-chip][data-value="tasting-first"]'); await listing(reader, '?mood=tasting-first');
    const chip = await snapshot(page); assert.equal(chip.state.index, initial.state.index); assert.equal(chip.length, initial.length);
    await click(page, '[data-sheet-open]'); await click(page, '[data-sheet-option][data-key="place"][data-value="red-hill"]');
    const beforeApplyRequests = requests.length; await click(page, '[data-sheet-apply]'); await listing(reader, '?place=red-hill&mood=tasting-first');
    const applied = await snapshot(page); assert.equal(applied.state.index, initial.state.index + 1); assert.equal(applied.length, initial.length + 1); assert.equal(applied.focus, true);
    assert.equal(requests.slice(beforeApplyRequests).filter(x => new URL(x).pathname === '/wine/').length, 1, 'One router query fetch for sheet Apply');
    await click(page, 'a[href="/wine/polperro/"]'); await reader.waitFor(() => location.pathname === '/wine/polperro/' && document.querySelector('h1')?.textContent.trim() === 'Polperro', 'Detail page');
    assert.equal((await snapshot(page)).state.index, initial.state.index + 2);
    await page.goBack(); await listing(reader, '?place=red-hill&mood=tasting-first');
    assert.deepEqual((await snapshot(page)).visible, applied.visible);
    const warm = await reader.globals();
    for (let i = 0; i < 2; i++) {
      await page.goForward(); await reader.waitFor(() => location.pathname === '/wine/polperro/' && document.querySelector('h1')?.textContent.trim() === 'Polperro', 'Forward detail');
      await page.goBack(); await listing(reader, '?place=red-hill&mood=tasting-first');
    }
    assert.deepEqual(grown(warm, await reader.globals()), [], 'Repeated traversal must not add global listeners');
    await page.goBack(); await listing(reader, '?mood=tasting-first'); assert.deepEqual((await snapshot(page)).visible, chip.visible);
    await page.goForward(); await listing(reader, '?place=red-hill&mood=tasting-first');
    const length = (await snapshot(page)).length;
    await page.select('[data-sort-select]', 'az'); await reader.waitFor(() => location.search.includes('sort=az'), 'Sort URL');
    let state = await snapshot(page); assert.equal(state.sort, 'az'); assert.equal(state.state.index, applied.state.index); assert.equal(state.length, length);
    await click(page, '[data-filter-clear]'); await listing(reader, '?sort=az'); state = await snapshot(page); assert.equal(state.visible.length, initial.visible.length); assert.equal(state.state.index, applied.state.index);
    await click(page, '[data-sheet-open]'); await click(page, '[data-sheet-apply]'); await listing(reader, '?sort=az'); assert.equal((await snapshot(page)).length, length, 'Unchanged Apply creates no duplicate entry');
    assert.deepEqual(await reader.errors(), []);
  } finally { await reader.close(); }
});
test('existing local filter demo view and sort replacements retain router metadata and each other', async () => {
  const reader = await site.reader(); const { page } = reader;
  try {
    await reader.load('/dev/v5-filters/'); const initial = await snapshot(page);
    await click(page, '[data-view="map"]'); await reader.waitFor(() => new URLSearchParams(location.search).get('view') === 'map', 'Map query');
    await page.select('[data-sort-select]', 'town'); await reader.waitFor(() => new URLSearchParams(location.search).get('sort') === 'town', 'Town sort');
    let current = await snapshot(page); assert.equal(current.state.index, initial.state.index); assert.equal(current.length, initial.length); assert.equal(new URL(current.url).searchParams.get('view'), 'map');
    await click(page, '[data-view="list"]'); await reader.waitFor(() => !new URLSearchParams(location.search).has('view'), 'List query'); current = await snapshot(page);
    assert.equal(new URL(current.url).searchParams.get('sort'), 'town'); assert.equal(current.state.index, initial.state.index); assert.equal(current.length, initial.length);
  } finally { await reader.close(); }
});
