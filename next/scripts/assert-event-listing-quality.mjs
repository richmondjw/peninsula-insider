#!/usr/bin/env node
// Admission check for a selected, editor-reviewed event listing.
// Invoke with one or more slugs. This checks source records before a build;
// the live page is checked separately after deployment.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EVENT_DIR = path.join(ROOT, 'src', 'content', 'events');
const CLAIM_DIR = path.join(ROOT, 'src', 'content', 'claims', 'events');
const EVIDENCE_DIR = path.join(ROOT, 'src', 'content', 'evidence', 'events');
const PUBLIC_DIR = path.join(ROOT, 'public');
const slugs = process.argv.slice(2);
if (!slugs.length || slugs.some((slug) => !/^[a-z0-9-]+$/.test(slug))) {
  console.error('usage: node scripts/assert-event-listing-quality.mjs <event-slug> [event-slug...]');
  process.exit(2);
}

const failures = [];
const words = (value) => String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
const requireField = (ok, slug, reason) => {
  if (!ok) failures.push(slug + ': ' + reason);
};
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

for (const slug of slugs) {
  let event;
  try {
    event = await readJson(path.join(EVENT_DIR, slug + '.json'));
  } catch (error) {
    failures.push(slug + ': event record unavailable or invalid: ' + error.message);
    continue;
  }
  requireField(event.slug === slug, slug, 'slug does not match file');
  requireField(event.status === 'published', slug, 'listing must be published');
  requireField(words(event.summary) >= 22, slug, 'summary needs at least 22 words');
  requireField(words(event.description) >= 22, slug, 'description needs at least 22 words');
  requireField(words(event.editorNote) >= 130, slug, 'editorial notes need at least 130 words');
  requireField(String(event.editorNote ?? '').split(/\n\s*\n/).filter(Boolean).length >= 3,
    slug, 'editorial notes need at least three useful paragraphs');
  for (const field of ['venueName', 'streetAddress', 'suburb', 'startTime', 'endTime',
    'bookingStatus', 'weatherDependency', 'accessibilityNotes']) {
    requireField(Boolean(String(event[field] ?? '').trim()), slug, 'missing ' + field);
  }
  requireField(/^https:\/\//.test(event.primarySourceUrl ?? ''), slug, 'missing HTTPS primary source');
  requireField(/^\d{4}-\d{2}-\d{2}$/.test(event.lastCheckedDate ?? ''),
    slug, 'missing verification date');
  requireField(/^\d{4}-\d{2}-\d{2}$/.test(event.nextOccurrence ?? ''),
    slug, 'missing confirmed next occurrence');
  if (event.occurrencePolicy === 'confirmed-only') {
    requireField(event.startDate === event.endDate && event.startDate === event.nextOccurrence,
      slug, 'confirmed-only listing dates disagree');
  }

  const hero = event.heroImage ?? {};
  requireField(hero.rightsStatus === 'recorded', slug, 'hero rights not recorded');
  requireField(words(hero.alt) >= 7, slug, 'hero alt text is too thin');
  requireField(Boolean(hero.creator && hero.permission && hero.rightsHolder),
    slug, 'hero creator, permission or rights holder missing');
  requireField(/^\/images\/[a-z0-9/_-]+\.(png|jpe?g|webp)$/i.test(hero.src ?? ''),
    slug, 'hero must be a local image asset');
  if (hero.depictionStatus === 'illustrative') {
    requireField(/illustrat/i.test(hero.caption ?? ''), slug, 'illustration disclosure missing');
  }
  if (/^\/images\//.test(hero.src ?? '')) {
    try {
      const asset = path.join(PUBLIC_DIR, hero.src.slice(1));
      requireField((await stat(asset)).size >= 10_000, slug, 'hero asset is unexpectedly small');
    } catch {
      failures.push(slug + ': hero asset is missing');
    }
  }

  try {
    const claim = await readJson(path.join(CLAIM_DIR, slug, 'event-schedule.json'));
    requireField(claim.subject?.slug === slug && claim.subject?.field === 'nextOccurrence',
      slug, 'schedule claim does not point to nextOccurrence');
    const date = new Date(event.nextOccurrence + 'T12:00:00Z');
    const day = String(date.getUTCDate());
    const year = String(date.getUTCFullYear());
    const month = date.toLocaleString('en-AU', { month: 'long', timeZone: 'UTC' });
    const claimText = String(claim.statement ?? '');
    requireField(claimText.includes(day) && claimText.includes(month) && claimText.includes(year),
      slug, 'schedule claim does not match confirmed date');
    const files = (await readdir(path.join(EVIDENCE_DIR, slug)))
      .filter((file) => file.endsWith('.json'));
    const evidence = await Promise.all(files.map((file) =>
      readJson(path.join(EVIDENCE_DIR, slug, file))));
    requireField(evidence.some((item) =>
      item.stance === 'supports' &&
      item.claim === claim.claimId &&
      item.url === event.primarySourceUrl &&
      item.retrievedAt === event.lastCheckedDate &&
      String(item.note ?? '').includes(day) &&
      String(item.note ?? '').includes(month) &&
      String(item.note ?? '').includes(year)),
      slug, 'no current primary-source evidence for the confirmed date');
  } catch (error) {
    failures.push(slug + ': schedule evidence unavailable or invalid: ' + error.message);
  }
}
if (failures.length) {
  for (const failure of failures) console.error('FAIL ' + failure);
  process.exit(1);
}
console.log('PASS selected event listing quality: ' + slugs.join(', '));
