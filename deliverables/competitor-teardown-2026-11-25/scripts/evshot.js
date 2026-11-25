// evshot.js : viewport screenshots (390x844 @2x) scrolled to a heading or selector, for evidence images.
const { chromium, devices } = require('playwright');
const jobs = JSON.parse(process.argv[2]);
(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  for (const j of jobs) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent, locale: 'en-AU' });
    const page = await ctx.newPage();
    try {
      await page.goto(j.url, { waitUntil: 'load', timeout: 90000 });
      await page.waitForTimeout(j.wait || 3500);
      if (j.dismiss) { await page.locator(j.dismiss).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500); }
      const y = await page.evaluate(({ text, sel, offset }) => {
        let el = null;
        if (sel) el = document.querySelector(sel);
        if (!el && text) el = [...document.querySelectorAll('h1,h2,h3,p,div')].find(e => e.children.length < 3 && e.innerText && e.innerText.trim().toLowerCase().startsWith(text.toLowerCase()));
        if (!el) return null;
        const top = el.getBoundingClientRect().top + window.scrollY - (offset || 90);
        window.scrollTo(0, Math.max(0, top));
        return Math.round(top);
      }, { text: j.text, sel: j.sel, offset: j.offset });
      await page.waitForTimeout(j.settle || 2500);
      await page.screenshot({ path: j.out, fullPage: false });
      console.log(j.out, 'scrolledTo', y);
    } catch (e) { console.log(j.out, 'ERR', e.message.slice(0, 120)); }
    await ctx.close();
  }
  await browser.close();
})();
