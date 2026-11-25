// perfshot.js <out.json> <shotdir> <device: desktop|mobile> <label=url> ...
// Lab measurement + screenshots from a real headless Chromium. Not field data.
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const [outFile, shotDir, device, ...pairs] = process.argv.slice(2);
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const results = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile)) : {};
  for (const pair of pairs) {
    const i = pair.indexOf('=');
    const label = pair.slice(0, i), url = pair.slice(i + 1);
    const key = label + '@' + device;
    if (results[key]) continue;
    const ctxOpts = device === 'mobile'
      ? { ...devices['iPhone 13'], locale: 'en-AU' }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-AU' };
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    if (device === 'mobile') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const reqType = {}, bytes = {}, counts = {}, hosts = new Set();
    let total = 0, nreq = 0;
    cdp.on('Network.responseReceived', e => { reqType[e.requestId] = e.type; try { hosts.add(new URL(e.response.url).host); } catch (x) {} });
    cdp.on('Network.loadingFinished', e => { const t = reqType[e.requestId] || 'Other'; bytes[t] = (bytes[t] || 0) + e.encodedDataLength; counts[t] = (counts[t] || 0) + 1; total += e.encodedDataLength; nreq++; });
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0; window.__lcpEl = '';
      try {
        new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpEl = (e.element ? e.element.tagName + (e.url ? ' ' + e.url.slice(-80) : '') : ''); } }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
    });
    const rec = { label, url, device };
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
    page.on('pageerror', e => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 160)));
    try {
      const t0 = Date.now();
      await page.goto(url, { waitUntil: 'load', timeout: 90000 });
      rec.loadWall = Date.now() - t0;
      await page.waitForTimeout(4000);
      const m = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0] || {};
        const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || null;
        return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp && Math.round(fcp), lcp: Math.round(window.__lcp), lcpEl: window.__lcpEl, cls: +window.__cls.toFixed(3), dom: document.getElementsByTagName('*').length, height: document.documentElement.scrollHeight, title: document.title, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
      });
      Object.assign(rec, m);
      rec.requests = nreq; rec.totalKB = Math.round(total / 1024);
      rec.kb = Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)]));
      rec.counts = counts; rec.hosts = hosts.size; rec.hostList = [...hosts];
      rec.consoleErrors = consoleErrors.slice(0, 8);
      await page.screenshot({ path: `${shotDir}/${label}_${device}_fold.png`, fullPage: false });
      // full page, scroll first to trigger lazy content
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(1200);
      rec.heightAfterScroll = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.screenshot({ path: `${shotDir}/${label}_${device}_full.png`, fullPage: true }).catch(e => { rec.fullShotErr = e.message.slice(0, 100); });
    } catch (e) { rec.error = e.message.slice(0, 200); }
    results[key] = rec;
    fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
    console.log(key, 'ttfb', rec.ttfb, 'fcp', rec.fcp, 'lcp', rec.lcp, 'cls', rec.cls, 'req', rec.requests, 'KB', rec.totalKB, 'dom', rec.dom, 'h', rec.height, rec.error || '');
    await ctx.close();
    await new Promise(r => setTimeout(r, 500));
  }
  await browser.close();
})();
