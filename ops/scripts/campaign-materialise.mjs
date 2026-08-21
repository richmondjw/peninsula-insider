#!/usr/bin/env node
/**
 * campaign-materialise.mjs
 *
 * Turns the campaign's site assets into real files in the content layer.
 *
 * Up to this point the factory produces copy in a database, which is not a
 * publishable artifact. This is the step that writes an actual Astro article
 * with valid frontmatter into next/src/content/articles/, so the site leg of
 * distribution has something to distribute.
 *
 * It stops at "file written and staged". It does not commit, does not push,
 * and does not deploy. Materialising is production; publishing is a decision.
 *
 * Gates it will not cross:
 *   - the thesis must be signed (an unsigned draft is not publishable copy)
 *   - the hero image must be rights-cleared for site use, or the article is
 *     written with `status: draft` and the missing hero recorded, rather than
 *     silently borrowing an uncleared image
 *   - the output must pass the house-style and no-pricing rules, because a
 *     price in content is a build-blocking error that would take the whole
 *     deploy down
 *
 * Usage:
 *   node ops/scripts/campaign-materialise.mjs --campaign CMP-2026-W31-...
 *   node ops/scripts/campaign-materialise.mjs --campaign <key> --dry-run
 *
 * Env: SUPABASE_SERVICE_KEY
 */

import { writeFile, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import {
  REPO, CONTENT, RunLog, hasDb, select, patch,
  loadItineraries, loadEntities, stopSlug, readJsonDir,
  houseStyle, houseStyleViolations,
} from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const KEY = val('--campaign');
const DRY = args.includes('--dry-run');

if (!KEY) {
  console.error('Usage: campaign-materialise.mjs --campaign <campaign_key> [--dry-run]');
  process.exit(2);
}

const ARTICLES = join(REPO, 'next/src/content/articles');

/** YAML-quote a string safely for frontmatter. */
const q = (s) => `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Reading time at ~220 wpm, the figure the rest of the site uses. */
const readingTime = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 220));

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function main() {
  const log = new RunLog('campaign-materialise', { jobSource: 'manual' });
  if (!hasDb()) {
    await log.stage('load', { status: 'failed', errorCode: 'NO_DB' });
    process.exit(2);
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  let t0 = new Date();
  const [campaign] = await select(`pi_campaigns?select=*&campaign_key=eq.${encodeURIComponent(KEY)}`);
  if (!campaign) {
    await log.stage('load', { status: 'failed', startedAt: t0, errorCode: 'CAMPAIGN_NOT_FOUND', errorDetail: KEY });
    process.exit(1);
  }
  log.campaignId = campaign.id;
  log.correlationId = campaign.correlation_id;

  const assets = await select(`pi_campaign_assets?select=*&campaign_id=eq.${campaign.id}`);
  const signals = await select(`pi_campaign_signals?select=*&campaign_id=eq.${campaign.id}`);
  const article = assets.find((a) => a.channel === 'site_article');
  if (!article?.body_md) {
    await log.stage('load', {
      status: 'blocked', startedAt: t0,
      errorCode: 'NO_ARTICLE_BODY',
      errorDetail: 'site_article asset has no body_md. Run campaign-derive.mjs first.',
    });
    process.exit(1);
  }
  await log.stage('load', { startedAt: t0, outputs: { state: campaign.state, assets: assets.length } });

  // ── Thesis gate ──────────────────────────────────────────────────────────
  t0 = new Date();
  const signed = Boolean(campaign.thesis_approved_by);
  await log.stage('thesis-gate', {
    startedAt: t0,
    status: signed ? 'ok' : 'degraded',
    outputs: { signed, approved_by: campaign.thesis_approved_by },
    degradations: signed ? [] : ['thesis unsigned: article will be written with status: draft'],
  });

  // ── Hero image, through the rights gate ──────────────────────────────────
  t0 = new Date();
  const itineraries = await loadItineraries();
  const plan = itineraries.find((i) => i.slug === campaign.featured_plan_slug);
  const entities = await loadEntities();
  const [venueRecords, experienceRecords] = await Promise.all([
    readJsonDir(join(CONTENT, 'venues')),
    readJsonDir(join(CONTENT, 'experiences')),
  ]);
  const venueSlugs = new Set(venueRecords.map((v) => v.slug));
  const experienceSlugs = new Set(experienceRecords.map((e) => e.slug));
  const stops = (plan?.stops ?? []).slice().sort((a, b) => (a.day - b.day) || (a.order - b.order));

  const stopSlugs = stops.map(stopSlug).filter(Boolean);
  const candidates = stopSlugs.length
    ? await select(
      `pi_media_assets?select=storage_path,subject,entity_slug,permitted_channels,attribution_text,attribution_required,licence,rights_owner,approval_status` +
      `&approval_status=eq.approved&entity_slug=in.(${stopSlugs.map(encodeURIComponent).join(',')})`)
    : [];
  // site_article must be in permitted_channels. No exceptions, no fallback to
  // "it's probably fine" - that is how the 385 mis-credited images happened.
  const hero = (candidates ?? []).find((m) => (m.permitted_channels ?? []).includes('site_article')) ?? null;

  // heroImage is REQUIRED by the articles schema (imageRef, not optional), so
  // "write it without a hero" is not an option: the file would fail content
  // validation and break the build for everyone. And borrowing an uncleared
  // image is exactly how the 385 mis-credited images happened.
  //
  // So this is the top rung of the media ladder: stop, and ask a human for an
  // asset. The campaign parks in media_required, which is what that state is for.
  if (!hero) {
    await log.stage('hero-rights-gate', {
      startedAt: t0, status: 'blocked',
      errorCode: 'RIGHTS_GATE_BLOCKED',
      errorDetail: `no approved asset with site_article in permitted_channels for any of ${stopSlugs.length} stops: ${stopSlugs.join(', ')}`,
      escalatedTo: 'james',
    });
    if (!DRY) {
      await patch(`pi_campaigns?id=eq.${campaign.id}`, {
        state: 'media_required',
        blocked_reason: `No rights-cleared hero for ${campaign.featured_plan_slug}. Supply one asset cleared for site_article, or clear an existing one.`,
      });
    }
    console.error(`
Cannot write the article: no rights-cleared hero image.`);
    console.error(`heroImage is required by the articles schema, so writing without one would`);
    console.error(`fail the content build. Borrowing an uncleared image is not an option.
`);
    console.error(`Stops with no cleared asset: ${stopSlugs.join(', ')}`);
    console.error(`
Campaign parked in media_required. Supply a hero, then re-run.
`);
    process.exit(1);
  }
  await log.stage('hero-rights-gate', {
    startedAt: t0,
    outputs: { src: hero.storage_path, licence: hero.licence },
  });

  // ── Compose ──────────────────────────────────────────────────────────────
  t0 = new Date();
  const today = new Date().toISOString().slice(0, 10);
  const slug = `${slugify(plan.title.split(':')[0])}-${campaign.publication_week.toLowerCase()}`;
  const title = plan.title.split(':')[0].trim();
  const dek = houseStyle(campaign.core_promise || plan.dek);

  // The body already passed the trace check in campaign-derive. Re-run the
  // blocking style rules here because this is the copy that reaches the build.
  const body = houseStyle(article.body_md);
  const violations = houseStyleViolations(body);
  if (violations.length) {
    await log.stage('style-gate', {
      startedAt: t0, status: 'failed',
      errorCode: 'HOUSE_STYLE_FAILED', errorDetail: violations.join('; '),
    });
    console.error(`\nRefusing to write. ${violations.join('. ')}.`);
    console.error('A price in content is a build-blocking error and would take the whole deploy down.\n');
    process.exit(1);
  }
  await log.stage('style-gate', { startedAt: t0, outputs: { chars: body.length } });

  // Tags from the plan's own taxonomy, not invented.
  const tags = [...new Set([
    ...(plan.theme ?? []),
    plan.occasion && plan.occasion !== 'none' ? plan.occasion : null,
    campaign.seasonal_context?.season,
    plan.audience,
  ].filter(Boolean))];

  const fm = [];
  fm.push('---');
  fm.push(`slug: ${q(slug)}`);
  fm.push(`title: ${q(title)}`);
  fm.push(`dek: ${q(dek)}`);
  fm.push('author: "editorial"');
  fm.push('houseByline: true');
  fm.push(`publishedAt: ${today}`);
  fm.push('heroImage:');
  fm.push(`  src: ${q(hero.storage_path)}`);
  fm.push(`  alt: ${q(hero.subject || `${title} on the Mornington Peninsula`)}`);
  fm.push(`  credit: ${q(hero.attribution_text || hero.rights_owner || 'Peninsula Insider')}`);
  fm.push(`  license: ${q(hero.licence)}`);
  fm.push('format: "service"');
  fm.push(`tags: [${tags.map(q).join(', ')}]`);
  fm.push(`readingTimeMinutes: ${readingTime(body)}`);
  fm.push('featured: false');
  // Unsigned thesis or missing hero means this is not publishable yet, and the
  // frontmatter should say so rather than a human having to remember.
  const publishable = signed;   // hero is guaranteed by the gate above
  fm.push(`status: ${q(publishable ? 'review' : 'draft')}`);
  fm.push('section: plans');
  if (plan.planShape) fm.push(`planShape: ${q(plan.planShape)}`);
  fm.push(`relatedItineraries: [${q(plan.slug)}]`);
  // relatedVenues and relatedExperiences are separate schema references. A stop
  // can be either, and putting an experience slug in relatedVenues fails Astro
  // content validation, which fails the build.
  const used = stops.map(stopSlug).filter(Boolean);
  const relVenues = [...new Set(used.filter((sl) => venueSlugs.has(sl)))];
  const relExperiences = [...new Set(used.filter((sl) => experienceSlugs.has(sl)))];
  if (relVenues.length) fm.push(`relatedVenues: [${relVenues.map(q).join(', ')}]`);
  if (relExperiences.length) fm.push(`relatedExperiences: [${relExperiences.map(q).join(', ')}]`);
  fm.push('---');
  fm.push('');

  const provenance = [
    '<!--',
    `  Produced by the Peninsula Insider content factory.`,
    `  Campaign:  ${campaign.campaign_key}`,
    `  Thesis by: ${campaign.thesis_approved_by ?? 'UNSIGNED DRAFT'}`,
    `  Fact base: ${signals.length} signals, ${signals.filter((s) => s.verification === 'verified').length} verified`,
    `  Every factual sentence is lifted from the content layer or the fact base.`,
    `  No model wrote prose here. See ops/campaigns/${campaign.campaign_key}-review.md`,
    '-->',
    '',
  ].join('\n');

  const out = fm.join('\n') + provenance + body + '\n';
  const path = join(ARTICLES, `${slug}.md`);

  if (DRY) {
    await log.stage('write', { startedAt: t0, status: 'skipped', outputs: { reason: 'dry run', path: relative(REPO, path) } });
    console.log('\n--- would write ---\n');
    console.log(out.slice(0, 1400));
    console.log('\n--- end ---\n');
    return;
  }

  await writeFile(path, out, 'utf8');
  await log.stage('write', {
    startedAt: t0, mutation: 'mutating-content',
    outputs: { path: relative(REPO, path), status: publishable ? 'review' : 'draft' },
    artifacts: [relative(REPO, path)],
  });

  await patch(`pi_campaign_assets?id=eq.${article.id}`, {
    published_url: `https://peninsulainsider.com.au/journal/${slug}/`,
  });

  console.log(`\nwrote:   ${relative(REPO, path)}`);
  console.log(`status:  ${publishable ? 'review' : 'draft (thesis unsigned)'}`);
  console.log(`hero:    ${hero.storage_path} (${hero.licence})`);
  console.log(`\nNot committed, not pushed, not deployed. Materialising is production; publishing is a decision.\n`);
}

main().catch((err) => {
  console.error(`[campaign-materialise] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
