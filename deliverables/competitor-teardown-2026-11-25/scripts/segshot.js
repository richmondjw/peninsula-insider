// segshot.js <url> <outprefix> [width=390] : capture a long page in viewport-sized steps at DPR 1 and report section headings with offsets.
const { chromium, devices } = require('playwright');
(async () => {
  const [url, out, w] = process.argv.slice(2);
  const width = parseInt(w || '390', 10);
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const ctx = await browser.newContext({ viewport: { width, height: 1800 }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, userAgent: width < 600 ? devices['iPhone 13'].userAgent : undefined, locale: 'en-AU' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const heads = await page.evaluate(() => [...document.querySelectorAll('h1,h2')].map(h => ({ t: h.tagName, y: Math.round(h.getBoundingClientRect().top + window.scrollY), s: h.innerText.replace(/\s+/g, ' ').trim().slice(0, 70) })).filter(h => h.s));
  console.log('height', H); console.log(JSON.stringify(heads));
  let i = 0;
  for (let y = 0; y < H && i < 14; y += 1800, i++) {
    await page.evaluate(yy => window.scrollTo(0, yy), y);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}_${String(i).padStart(2, '0')}.png`, fullPage: false });
  }
  console.log('segments', i);
  await browser.close();
})();
