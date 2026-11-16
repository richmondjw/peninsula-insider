#!/usr/bin/env node
// Give every published event that lacks a complete hero image one, via
// scripts/event-hero.mjs. The auto-publisher calls this on the records it has
// just written; editors can run it on everything.
//
//   node scripts/assign-event-heroes.mjs                 # dry run, all events
//   node scripts/assign-event-heroes.mjs --write         # write, all events
//   node scripts/assign-event-heroes.mjs --write a b     # write, these slugs only

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EVENT_DIR, heroIsComplete, loadContext, resolveEventHero } from './event-hero.mjs';
import { readdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const write = args.includes('--write');
const only = new Set(args.filter((a) => !a.startsWith('--')));

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await files(full));
    else if (e.name.endsWith('.json')) out.push(full);
  }
  return out;
}

const ctx = await loadContext();
let changed = 0;
for (const file of await files(EVENT_DIR)) {
  const raw = await readFile(file, 'utf8');
  const event = JSON.parse(raw);
  if (only.size && !only.has(event.slug)) continue;
  if ((event.status ?? 'published') !== 'published' || heroIsComplete(event.heroImage)) continue;
  const { hero, via } = resolveEventHero(event, ctx);
  console.log(`${write ? 'set' : 'would set'} ${event.slug} <- ${via} ${hero.src}`);
  changed += 1;
  if (write) {
    // Keep key order stable: heroImage goes after summary, where hand-made records keep it.
    const next = {};
    for (const [k, v] of Object.entries(event)) {
      if (k === 'heroImage') continue;
      next[k] = v;
      if (k === 'summary') next.heroImage = hero;
    }
    if (!next.heroImage) next.heroImage = hero;
    await writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
  }
}
console.log(`${changed} event(s) ${write ? 'updated' : 'need a hero'}`);
