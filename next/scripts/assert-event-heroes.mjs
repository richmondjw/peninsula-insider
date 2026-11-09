#!/usr/bin/env node
// Gate: no published, current event may ship without a complete hero image,
// and no summary may simply restate the title.
//
// Added 2026-11-09 after 46 of 61 published events reached the live site with
// no image and five carried summaries like "Vinehop at Phaedrus Estate." The
// fix for a missing hero is `node scripts/assign-event-heroes.mjs --write`.
// A thin summary needs real copy from the organiser's page.
//
// Ended events are skipped: they are not rendered as listings, and holding a
// deploy over an expired record would be the date-driven gate failure that
// audit-event-safeguards.mjs warns against.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENT_DIR, heroIsComplete } from './event-hero.mjs';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const today = new Date().toISOString().slice(0, 10);
const STOP = new Set('the a an at of and in on for with to by live starts am pm'.split(' '));
const words = (s) => String(s ?? '').toLowerCase().match(/[a-z']+/g) ?? [];

/** Words the summary adds beyond the title and venue. Exported for tests. */
export function addedWords(event) {
  const known = new Set([...words(event.title), ...words(event.venueName), ...STOP]);
  return words(event.summary).filter((w) => !known.has(w));
}

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await files(full));
    else if (e.name.endsWith('.json')) out.push(full);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = [];
  let checked = 0;
  for (const file of await files(EVENT_DIR)) {
    const e = JSON.parse(await readFile(file, 'utf8'));
    if ((e.status ?? 'published') !== 'published') continue;
    const last = e.nextOccurrence ?? e.endDate ?? e.startDate;
    if (e.recurrence === 'one-off' && last && String(last).slice(0, 10) < today) continue;
    checked += 1;
    if (!heroIsComplete(e.heroImage)) {
      failures.push(`${e.slug}: no complete hero image (run scripts/assign-event-heroes.mjs --write)`);
    } else {
      try {
        const size = (await stat(path.join(PUBLIC, e.heroImage.src.split('?')[0]))).size;
        if (size < 10_000) failures.push(`${e.slug}: hero file is suspiciously small (${size} bytes)`);
      } catch {
        failures.push(`${e.slug}: hero file missing: ${e.heroImage.src}`);
      }
    }
    if (addedWords(e).length < 3) failures.push(`${e.slug}: summary only restates the title ("${e.summary}")`);
  }
  if (failures.length) {
    console.error(`assert:event-heroes FAILED (${failures.length}):\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`assert:event-heroes ok: ${checked} current published events, all with a hero and a real summary`);
}
