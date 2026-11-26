// Drive the competitor's header search like a visitor: open search, type, submit, read results.
const { chromium } = require('playwright');
(async () => {
  const terms = process.argv.slice(2);
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-AU' });
  const page = await ctx.newPage();
  for (const term of terms) {
    await page.goto('https://www.visitmorningtonpeninsula.org/Things-To-Do', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    // click the search icon (last icon in nav)
    const icon = page.locator('img[src*="icon__Search"]').first();
    await icon.click({ timeout: 8000 }).catch(e => console.log('icon click err', e.message.slice(0, 80)));
    await page.waitForTimeout(1000);
    const inputs = await page.evaluate(() => [...document.querySelectorAll('input[type=text], input[type=search], input:not([type])')].filter(i => i.offsetParent !== null).map(i => ({ id: i.id, name: i.name, ph: i.placeholder, cls: i.className })).slice(0, 6));
    console.log('TERM', term, 'visible inputs:', JSON.stringify(inputs));
    const inp = page.locator('input[placeholder*="earch" i]:visible').first();
    if (await inp.count()) {
      await inp.fill(term);
      await page.waitForTimeout(1800);
      const sugg = await page.evaluate(() => [...document.querySelectorAll('.ui-autocomplete li, .search-suggestions li, [class*="suggest"] li, [class*="autocomplete"] li')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 8));
      console.log('  suggestions:', JSON.stringify(sugg));
      await inp.press('Enter');
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5000);
      const info = await page.evaluate(() => {
        const b = document.querySelector('main') || document.body;
        return { url: location.href, text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 1400), nlinks: b.querySelectorAll('a[href*="/View/"], a[href*="/Stories/"]').length };
      });
      console.log('  URL:', info.url); console.log('  RESULT-LINKS:', info.nlinks); console.log('  TEXT:', info.text.slice(0, 1100));
      await page.screenshot({ path: 'shots/v_searchui_' + term.replace(/\W+/g, '_') + '.png', fullPage: false });
    }
    await page.waitForTimeout(800);
  }
  await browser.close();
})();
