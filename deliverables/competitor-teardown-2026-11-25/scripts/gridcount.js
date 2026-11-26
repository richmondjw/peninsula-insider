// Render category pages like a visitor and read what the page displays: card count, pagination, card fields.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const paths = process.argv.slice(3);
  const outFile = process.argv[2];
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-AU' });
  const results = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile)) : {};
  for (const p of paths) {
    if (results[p]) continue;
    const page = await ctx.newPage();
    const rec = { path: p };
    try {
      const t0 = Date.now();
      await page.goto('https://www.visitmorningtonpeninsula.org' + p, { waitUntil: 'load', timeout: 60000 });
      rec.loadMs = Date.now() - t0;
      await page.waitForFunction(() => document.querySelectorAll('.listing__placeholder').length === 0, { timeout: 20000 }).catch(() => { rec.placeholderTimeout = true; });
      await page.waitForFunction(() => document.querySelectorAll('.grid article a[href]').length > 0, { timeout: 15000 }).catch(() => { rec.noCards = true; });
      rec.gridMs = Date.now() - t0;
      await page.waitForTimeout(500);
      const read = () => page.evaluate(() => {
        const grid = document.querySelector('.grid');
        if (!grid) return null;
        const cards = [...grid.querySelectorAll('article')].map(a => {
          const link = a.querySelector('a[href]');
          return { href: link ? link.getAttribute('href') : null, text: a.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) };
        }).filter(c => c.href);
        const pag = [...grid.querySelectorAll('.pagination a')].map(e => e.innerText.trim()).filter(Boolean);
        const title = (grid.querySelector('.grid__app-title') || {}).innerText || '';
        return { cards, pag, title: title.replace(/\s+/g, ' ').trim(), gridText: grid.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) };
      });
      const first = await read();
      rec.first = first;
      if (first) {
        rec.perPage = first.cards.length;
        const uniq = new Map();
        for (const c of first.cards) uniq.set(c.href, c.text);
        let pagesSeen = 1;
        for (let want = 2; want < 200; want++) {
          const clicked = await page.evaluate((w) => {
            const a = [...document.querySelectorAll('.grid .pagination a')].find(e => e.innerText.trim() === String(w));
            if (!a) return false; a.click(); return true;
          }, want);
          if (!clicked) break;
          await page.waitForTimeout(900);
          const cur = await read();
          pagesSeen++;
          for (const c of cur.cards) uniq.set(c.href, c.text);
        }
        rec.pages = pagesSeen;
        rec.total = uniq.size;
        rec.all = [...uniq.entries()].map(([h, t]) => ({ h, t }));
      }
    } catch (e) { rec.error = e.message.slice(0, 200); }
    results[p] = rec;
    fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
    console.log(p, 'total=', rec.total, 'pages=', rec.pages, 'perPage=', rec.perPage, 'loadMs=', rec.loadMs, 'gridMs=', rec.gridMs, rec.error || '');
    await page.close();
    await new Promise(r => setTimeout(r, 700));
  }
  await browser.close();
})();
