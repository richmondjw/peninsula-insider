import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { imagePresentationText } from './image-presentation.mjs';

test('reviewed illustration labels use natural image wording and keep their qualifiers', () => {
  for (const [before, after] of [
    ['Peninsula Insider, AI-assisted illustration', 'Illustration: Peninsula Insider'],
    ['AI-assisted artwork by Peninsula Insider', 'Illustration: Peninsula Insider'],
    ['AI-assisted artwork · Peninsula Insider', 'Illustration · Peninsula Insider'],
    ['AI-assisted editorial illustration. Not a specific location.', 'Editorial illustration. Not a specific location.'],
    ['AI\u2011assisted editorial\u00a0illustration. Not geographic or navigational.', 'Editorial illustration. Not geographic or navigational.'],
    ['AI generated artwork by Peninsula Insider', 'Illustration: Peninsula Insider'],
  ]) {
    assert.equal(imagePresentationText(before), after);
    assert.equal(imagePresentationText(after), after);
  }
});

test('real attribution, licences, topical descriptions and missing values are preserved', () => {
  for (const value of [null, undefined, '', 'jem', 'Photo courtesy of Visit Victoria',
    'Photographer / CC BY-SA 4.0; cropped from original',
    'Synthetic Memories explores AI-generated art.',
    'An exhibition about AI-assisted editorial illustration',
    'AI-assisted editorial illustration is the subject of this exhibition.',
    'Peninsula Insider, AI-assisted',
    'Original AI-assisted artwork created for Peninsula Insider; website rollout approved.']) {
    assert.equal(imagePresentationText(value), value);
  }
});

test('reviewed source captions retain depiction caveats and internal generation provenance', () => {
  const records = [
    ['articles', 'breakfast-before-the-crowds', 'md'],
    ['articles', 'first-time-peninsula', 'md'],
    ['articles', 'how-to-plan-a-peninsula-weekend', 'md'],
    ...['bass-flinders-gin-masterclass', 'crib-point-community-market',
      'dominion-wrestling-big-group-hug-mornington-2026',
      'hill-ridge-community-market-september-2026-restart',
      'mornington-racecourse-market', 'peninsula-hot-springs-daily-studio-yoga']
      .map(slug => ['events', slug, 'json']),
  ];
  for (const [collection, slug, extension] of records) {
    const source = fs.readFileSync(new URL(`../content/${collection}/${slug}.${extension}`, import.meta.url), 'utf8');
    const caption = source.match(/(?:"caption"|caption):\s*"([^"]+)"/)[1];
    assert.match(caption, /^Editorial illustration\./, slug);
    assert.match(caption, /\bnot\b/i, slug);
    assert.match(source, /Peninsula Insider, AI-assisted/, slug);
    assert.match(source, /Original AI-assisted artwork created for Peninsula Insider/, slug);
  }
});

test('both CMS image presentation boundaries use the formatter without changing saved metadata', () => {
  const loader = fs.readFileSync(new URL('./inline-edit/overrides.ts', import.meta.url), 'utf8');
  for (const field of ['alt_text', 'caption', 'credit']) {
    assert.ok(loader.includes(`imagePresentationText(houseStyle(row.${field}))`));
  }
  for (const field of ['alt', 'caption', 'credit']) {
    assert.ok(loader.includes(`imagePresentationText(row.${field} ?? null)`));
  }
  assert.ok(loader.includes('text[row.field_path] = houseStyle(row.value)'));
  const client = fs.readFileSync(new URL('./inline-edit/client.ts', import.meta.url), 'utf8');
  for (const value of ['altText', 'row.alt_text', 'override.alt_text']) {
    assert.ok(client.includes(`el.alt = imagePresentationText(${value})`));
    assert.ok(client.includes(`el.setAttribute('aria-label', imagePresentationText(${value}))`));
  }
  assert.match(client, /alt_text: altText \|\| null/);
  assert.match(client, /caption:\s+caption \|\| null/);
  assert.match(client, /credit:\s+credit \|\| null/);
});
