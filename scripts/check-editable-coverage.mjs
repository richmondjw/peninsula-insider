#!/usr/bin/env node
/**
 * scripts/check-editable-coverage.mjs
 *
 * Build-time enforcement of CMS editor conventions. Fails the build if a
 * card component is missing the inline-editor tagging the architecture
 * requires. The goal is that future developers (and future-me, and future
 * Claude) cannot regress the system back to the auto-detect anti-pattern
 * that caused the 2026-05-11 "same image across many venues" bug.
 *
 * Rules enforced:
 *
 *   1. Every `*Card.astro` component under next/src/components/ must call
 *      `editableImage(...)` somewhere in its template. The hero element
 *      must be tagged with entity-scoped attrs so inline-editor uploads
 *      key on the entity, not on the image filename.
 *
 *   2. The `entityType` argument to `editableImage(...)` must use one of
 *      the canonical kinds: article, venue, place, event, experience,
 *      itinerary, tour, tour-operator, tour-package.
 *
 *   3. The hero `fieldPath` should be `'hero'` (convention). Other paths
 *      are allowed but a warning is printed.
 *
 * Exit code 0 = pass. Exit code 1 = blocking error. Warnings print and
 * pass.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.resolve(__dirname, '../next/src/components');

const VALID_KINDS = new Set([
  'article', 'venue', 'place', 'event', 'experience', 'itinerary',
  'tour', 'tour-operator', 'tour-package',
]);

// Card components that legitimately have no hero image (e.g. text-only
// editorial cards). They're exempt from the editableImage requirement
// but still must use PiSaveActions for the save+share affordance.
const HERO_EXEMPT = new Set([
  'ArticleCard.astro',  // text-only editorial variant
]);

// Card components that aren't actually CMS-editable surfaces — typically
// older v3 chrome no longer rendered. They're exempt from both checks.
const SKIP_ENTIRELY = new Set([
  // v3 cards we deliberately don't bother re-tagging; the V3 chrome is
  // a parallel design system we may deprecate. If you uncomment and
  // re-introduce them, remove them from this list.
  'v3/V3EditorialCard.astro',
  'v3/V3EntityCard.astro',
  'v3/V3EventCard.astro',
]);

const errors = [];
const warnings = [];

async function walk(dir, rel = '') {
  const found = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const r = path.posix.join(rel, e.name);
    if (e.isDirectory()) {
      const nested = await walk(full, r);
      found.push(...nested);
    } else if (e.isFile() && /Card\.astro$/.test(e.name)) {
      found.push({ rel: r, full });
    }
  }
  return found;
}

function reportPath(rel) {
  return path.posix.join('next/src/components', rel);
}

async function checkCard(card) {
  if (SKIP_ENTIRELY.has(card.rel)) return;
  const src = await fs.readFile(card.full, 'utf-8');

  // Rule 1: PiSaveActions usage. Every card surfaces save + share.
  if (!/<PiSaveActions\b/.test(src)) {
    errors.push(`${reportPath(card.rel)}: missing <PiSaveActions .../> mount. Every card must have the save+share affordance.`);
  }

  // Rule 2: editableImage tagging on the hero. Hero-exempt cards are
  // skipped here (text-only editorial layouts).
  if (HERO_EXEMPT.has(card.rel)) return;

  const editableImageCalls = [...src.matchAll(/editableImage\s*\(\s*{([\s\S]*?)}\s*\)/g)];
  if (editableImageCalls.length === 0) {
    errors.push(`${reportPath(card.rel)}: hero element is not tagged with editableImage({...}). Filename-keyed auto-detect is the bug we're preventing — every card hero must carry entity-scoped attrs.`);
    return;
  }

  for (const [, args] of editableImageCalls) {
    const kindMatch = args.match(/entityType\s*:\s*['"]([^'"]+)['"]/);
    if (!kindMatch) {
      errors.push(`${reportPath(card.rel)}: editableImage() call missing 'entityType'.`);
      continue;
    }
    const kind = kindMatch[1];
    if (!VALID_KINDS.has(kind)) {
      errors.push(`${reportPath(card.rel)}: editableImage() entityType="${kind}" is not in the canonical list (${[...VALID_KINDS].join(', ')}).`);
    }

    const slugMatch = args.match(/entitySlug\s*:\s*([^,]+),/);
    if (!slugMatch) {
      errors.push(`${reportPath(card.rel)}: editableImage() call missing 'entitySlug'.`);
    }

    const fieldMatch = args.match(/fieldPath\s*:\s*['"]([^'"]+)['"]/);
    if (!fieldMatch) {
      errors.push(`${reportPath(card.rel)}: editableImage() call missing 'fieldPath'.`);
    } else if (fieldMatch[1] !== 'hero' && !/^hero\.|^image$/.test(fieldMatch[1])) {
      warnings.push(`${reportPath(card.rel)}: editableImage() fieldPath="${fieldMatch[1]}" — convention is 'hero' for the primary card image.`);
    }
  }
}

async function main() {
  const cards = await walk(COMPONENTS_DIR);
  for (const card of cards) await checkCard(card);

  console.log(`[editable-coverage] checked ${cards.length} *Card.astro components`);

  if (warnings.length > 0) {
    console.log('');
    console.log(`[editable-coverage] ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  warn: ${w}`);
  }

  if (errors.length > 0) {
    console.log('');
    console.error(`[editable-coverage] ${errors.length} error(s):`);
    for (const e of errors) console.error(`  fail: ${e}`);
    console.error('');
    console.error('CMS conventions failed. See docs/cms-architecture.md for the rules.');
    process.exit(1);
  }

  console.log('[editable-coverage] all cards conform.');
}

main().catch((err) => {
  console.error('[editable-coverage] fatal:', err);
  process.exit(1);
});
