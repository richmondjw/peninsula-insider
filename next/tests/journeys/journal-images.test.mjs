import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';

const site = await Site.open();
test.after(() => site.close());

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Journal story images load at ${viewport.width}px with their own credits`, async () => {
    const reader = await site.reader();
    try {
      await reader.page.setViewport(viewport);
      await reader.load('/journal/');
      await reader.page.evaluate(() => document.querySelectorAll('.story img').forEach(img => { img.loading = 'eager'; }));
      await reader.waitFor(() => {
        const images = [...document.querySelectorAll('.story img')];
        return images.length > 0 && images.every(img => img.complete && img.naturalWidth > 0);
      }, 'Journal images did not load');
      const figures = await reader.page.evaluate(() => [...document.querySelectorAll('.story')].map(story => ({
        image: !!story.querySelector('img[data-journal-image]'),
        credit: story.querySelector('[data-journal-image-credit]')?.textContent?.trim(),
        width: story.querySelector('img')?.getBoundingClientRect().width,
      })));
      assert.ok(figures.length > 0);
      assert.ok(figures.every(f => f.image && f.credit && f.width > 0 && f.width <= viewport.width));
    } finally { await reader.close(); }
  });
}

test('failed article and thematic images recover to original art after client navigation, with updated attribution', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/journal/');
    await reader.navigate('/journal/quealy-winemakers-balnarring/');
    const slug = await reader.page.evaluate(() => {
      const img = document.querySelector('.article-hero__image');
      const recovery = JSON.parse(img.dataset.journalRecovery);
      recovery[0].src = '/__missing-theme-image__.jpg';
      img.dataset.journalRecovery = JSON.stringify(recovery);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      delete img.dataset.piImageOriginalSrc;
      img.src = '/__missing-article-image__.jpg';
      return img.dataset.piEntitySlug;
    });
    await reader.waitFor(() => {
      const img = document.querySelector('.article-hero__image');
      return img?.getAttribute('src')?.split(/[?#]/)[0] === '/images/editorial/journal-backstop.svg' && img.complete && img.naturalWidth > 0;
    }, 'Original illustration did not recover after two image failures');
    const result = await reader.page.evaluate(() => {
      const img = document.querySelector('.article-hero__image');
      const figure = img.closest('figure');
      return { slug: img.dataset.piEntitySlug, alt: img.alt, credit: figure.querySelector('[data-journal-image-credit]').textContent, caption: figure.querySelector('[data-journal-image-caption]').textContent };
    });
    assert.equal(result.slug, slug);
    assert.match(result.alt, /Original illustration/);
    assert.equal(result.credit, 'Illustration · Peninsula Insider');
    assert.match(result.caption, /not a photograph/);
    assert.doesNotMatch(result.credit, /Visit Victoria/);
  } finally { await reader.close(); }
});
