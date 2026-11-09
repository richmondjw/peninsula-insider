import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { heroIsComplete, loadContext, resolveEventHero } from './event-hero.mjs';
import { addedWords } from './assert-event-heroes.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = await loadContext();
const ev = (over) => ({ slug: 'x-2026-11-14', title: 'Something', summary: '', venueName: 'Nowhere', category: 'community', ...over });

test('every library image exists and every category has a default', async () => {
  const lib = JSON.parse(await readFile(path.join(NEXT, 'src/data/event-illustrations.json'), 'utf8'));
  for (const m of lib.motifs) {
    for (const v of m.variants ?? [m]) {
      assert.ok((await stat(path.join(NEXT, 'public', v.src))).size > 10_000, v.src);
      assert.ok(v.alt.split(/\s+/).length >= 7, `${v.src} alt text too thin`);
    }
  }
  for (const id of Object.values(lib.categoryDefaults)) assert.ok(lib.motifs.some((m) => m.id === id), id);
});

test('a recorded own hero is never replaced', () => {
  const own = { src: '/images/sourced/a.webp', alt: 'a', credit: 'c', rightsStatus: 'recorded' };
  assert.equal(resolveEventHero(ev({ heroImage: own }), ctx).via, 'own');
});

test('an unrecorded stand-in is replaced', () => {
  const r = resolveEventHero(ev({ heroImage: { src: '/images/sourced/a.webp', alt: 'a', credit: 'c' } }), ctx);
  assert.notEqual(r.via, 'own');
  assert.ok(heroIsComplete(r.hero));
});

test('title subject beats category, and specific beats general', () => {
  assert.equal(resolveEventHero(ev({ title: 'Live at Peninsula Beer Garden', category: 'live-music' }), ctx).via, 'motif:music');
  assert.equal(resolveEventHero(ev({ title: 'Pitmaster Masterclass at Red Gum BBQ' }), ctx).via, 'motif:barbecue');
  assert.equal(resolveEventHero(ev({ title: 'Spring Winery Walk' }), ctx).via, 'motif:wine');
});

test('no match falls back to the category default, and the result is always complete', () => {
  const r = resolveEventHero(ev({ title: 'Untitled evening', category: 'writers-ideas' }), ctx);
  assert.equal(r.via, 'category:writers-ideas');
  assert.ok(heroIsComplete(r.hero));
  assert.match(r.hero.caption, /not a photograph/);
});

test('variant choice is stable for a slug', () => {
  const a = resolveEventHero(ev({ title: 'Live music' }), ctx).hero.src;
  const b = resolveEventHero(ev({ title: 'Live music' }), ctx).hero.src;
  assert.equal(a, b);
});

test('a summary that restates the title adds no words', () => {
  assert.equal(addedWords({ title: 'Vinehop', venueName: 'Phaedrus Estate', summary: 'Vinehop at Phaedrus Estate.' }).length, 0);
  assert.ok(addedWords({ title: 'Eve Eve', venueName: 'Portsea Hotel', summary: 'A pre-Christmas night of live music and DJs.' }).length >= 3);
});
