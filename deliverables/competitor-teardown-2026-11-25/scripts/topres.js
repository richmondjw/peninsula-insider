const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  for (const url of process.argv.slice(2)) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-AU' });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    const meta = {}; const done = [];
    cdp.on('Network.responseReceived', e => { meta[e.requestId] = { url: e.response.url, type: e.type, mime: e.response.mimeType }; });
    cdp.on('Network.loadingFinished', e => { if (meta[e.requestId]) done.push({ ...meta[e.requestId], kb: Math.round(e.encodedDataLength / 1024) }); });
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(3500);
    const imgs = await page.evaluate(() => [...document.images].filter(i => i.naturalWidth > 0).map(i => ({ src: i.currentSrc.slice(-70), nat: i.naturalWidth + 'x' + i.naturalHeight, shown: Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height) })).sort((a, b) => parseInt(b.nat) - parseInt(a.nat)).slice(0, 6));
    done.sort((a, b) => b.kb - a.kb);
    const tot = done.reduce((s, d) => s + d.kb, 0);
    const byType = {}; for (const d of done) byType[d.type] = (byType[d.type] || 0) + d.kb;
    console.log('\n==', url.replace('https://', ''), '| total KB', tot, JSON.stringify(byType));
    for (const d of done.slice(0, 8)) console.log('  ', String(d.kb).padStart(5), 'KB', d.type.padEnd(10), d.mime.padEnd(22), d.url.replace(/^https?:\/\//, '').slice(0, 110));
    console.log('   largest decoded images (natural vs displayed CSS px @390w):', JSON.stringify(imgs));
    await ctx.close();
  }
  await browser.close();
})();
