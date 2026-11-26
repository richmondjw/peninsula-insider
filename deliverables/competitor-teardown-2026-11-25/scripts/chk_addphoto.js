const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  for (const [label, opts] of [['mobile', { ...devices['iPhone 13'] }], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    for (const u of process.argv.slice(2)) {
      await page.goto(u, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[class*="placeholder"]')];
        const out = [];
        for (const e of els) {
          const after = getComputedStyle(e, '::after').content;
          if (/add photo/i.test(after)) {
            const cs = getComputedStyle(e);
            const img = e.querySelector('img');
            const card = e.closest('article, li, .venue-card, a') || e.parentElement;
            out.push({ cls: e.className.toString().slice(0, 90), visible: e.offsetParent !== null && cs.display !== 'none' && cs.visibility !== 'hidden', hasImg: !!img, imgLoaded: img ? (img.complete && img.naturalWidth > 0) : null, bg: cs.backgroundImage.slice(0, 60), name: (card && (card.querySelector('h3,h2,h4') || {}).innerText || '').slice(0, 40) });
          }
        }
        return { total: els.length, addPhoto: out.length, visibleAddPhoto: out.filter(o => o.visible).length, sample: out.slice(0, 6) };
      });
      console.log(label, u.replace('https://peninsulainsider.com.au', ''), JSON.stringify(r));
    }
    await ctx.close();
  }
  await browser.close();
})();
