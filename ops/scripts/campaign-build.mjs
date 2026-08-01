#!/usr/bin/env node
/**
 * campaign-build.mjs
 *
 * Turns a chosen Featured Plan into a Content Campaign Packet: one
 * pi_campaigns row, its pi_campaign_signals fact base, and the skeleton
 * pi_campaign_assets rows for every channel.
 *
 * Selection happens upstream (score-plan-fitness.mjs ranks, a human picks).
 * This script does not choose. It packages.
 *
 * The thesis is left EMPTY on purpose. It is a JUDGEMENT-zone field and the
 * campaign cannot leave `brief_ready` without a human writing or approving
 * one. A machine may draft it later; it may never finalise it.
 *
 * Usage:
 *   node ops/scripts/campaign-build.mjs --plan the-peninsula-golf-weekend
 *   node ops/scripts/campaign-build.mjs --plan <slug> --week 2026-W31
 *   node ops/scripts/campaign-build.mjs --plan <slug> --dry-run
 *
 * Env: SUPABASE_SERVICE_KEY
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import {
  REPO, RunLog, hasDb, select, insert,
  loadEntities, loadItineraries, stopSlug,
  melbourneToday, isoWeek, seasonOf, houseStyle, randomUUID,
} from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const PLAN = val('--plan');
const WEEK = val('--week');
const DRY = args.includes('--dry-run');

if (!PLAN) {
  console.error('Usage: campaign-build.mjs --plan <itinerary-slug> [--week YYYY-Www] [--dry-run]');
  process.exit(2);
}

/**
 * The channel plan. Approval levels come straight from the governance ladder:
 * L3 = human always, L2 = agent + sample audit, L1 = auto-publish + spot check,
 * L0 = mechanical.
 */
const CHANNELS = [
  { channel: 'site_plan',     approval: 'L3', lifespan: 365, purpose: 'Complete the schema, add a seasonal variation, refresh lastVerified' },
  { channel: 'site_article',  approval: 'L3', lifespan: 270, purpose: 'The story-world piece. Why this Plan, why now' },
  { channel: 'email',         approval: 'L3', lifespan: 3,   purpose: 'Lead with the thesis, carry the Picks' },
  { channel: 'ig_carousel',   approval: 'L2', lifespan: 60,  purpose: 'Persuade: the shape of the weekend, one slide per stop', variant: '4:5' },
  { channel: 'opinion_card',  approval: 'L2', lifespan: 120, purpose: 'Prove: one verdict, typeset. No photography needed' },
  { channel: 'facebook',      approval: 'L1', lifespan: 5,   purpose: 'Remind: one practical detail, conversational', variant: '1.91:1' },
  { channel: 'linkedin',      approval: 'L2', lifespan: 21,  purpose: 'Prove: the industry observation, for operators and partners', variant: '1.91:1' },
  { channel: 'ig_story',      approval: 'L1', lifespan: 1,   purpose: 'Enable: booking order, link sticker', variant: '9:16' },
  { channel: 'site_links',    approval: 'L0', lifespan: 3650, purpose: 'Cross-link every stop entity back to the Plan; ItemList JSON-LD' },
];

async function main() {
  const today = melbourneToday();
  const week = WEEK || isoWeek(today);
  const season = seasonOf(today);
  const correlationId = randomUUID();
  const log = new RunLog('campaign-build', { jobSource: 'manual', correlationId });

  // ── 1. Resolve the plan ──────────────────────────────────────────────────
  let t0 = new Date();
  const itineraries = await loadItineraries();
  const plan = itineraries.find((i) => i.slug === PLAN);
  if (!plan) {
    await log.stage('resolve-plan', {
      status: 'failed', startedAt: t0,
      errorCode: 'PLAN_NOT_FOUND',
      errorDetail: `no itinerary with slug "${PLAN}". Available: ${itineraries.map((i) => i.slug).join(', ')}`,
    });
    process.exit(1);
  }
  const entities = await loadEntities();
  const stops = (plan.stops ?? []).slice().sort((a, b) => (a.day - b.day) || (a.order - b.order));
  await log.stage('resolve-plan', {
    startedAt: t0,
    outputs: { plan: plan.slug, stops: stops.length, resolved: stops.filter((s) => entities.has(stopSlug(s))).length },
  });

  // ── 2. Media readiness against the rights gate ───────────────────────────
  t0 = new Date();
  let cleared = new Set();
  let mediaKnown = false;
  if (hasDb()) {
    const slugs = stops.map(stopSlug).filter(Boolean);
    const rows = await select(
      `pi_media_assets?select=entity_slug,permitted_channels,derivative_works_ok,approval_status` +
      `&entity_slug=in.(${slugs.map(encodeURIComponent).join(',')})&approval_status=eq.approved`
    );
    mediaKnown = true;
    for (const r of rows ?? []) {
      if ((r.permitted_channels ?? []).includes('ig_carousel')) cleared.add(r.entity_slug);
    }
  }
  const gaps = stops.map(stopSlug).filter((s) => s && !cleared.has(s));
  const mediaReadiness = stops.length ? cleared.size / stops.length : 0;
  await log.stage('media-readiness', {
    startedAt: t0,
    status: mediaKnown ? (mediaReadiness < 0.5 ? 'degraded' : 'ok') : 'degraded',
    outputs: { readiness: Number(mediaReadiness.toFixed(2)), cleared: [...cleared], gaps },
    degradations: mediaKnown
      ? (gaps.length ? [`${gaps.length} of ${stops.length} stops have no social-cleared asset; derivatives fall back to typographic cards`] : [])
      : ['rights registry unavailable; media readiness unknown'],
  });

  // ── 3. Build the fact base from human-written editorial fields ───────────
  // Nothing here is invented. Every assertion is lifted from a content file a
  // human wrote, which is why these start as `single_source` rather than
  // `verified`: PI wrote them, but they have not been re-confirmed against a
  // T1 source this week. The verify pass upgrades or demotes them.
  t0 = new Date();
  const signals = [];

  if (plan.editorNote) {
    signals.push({
      role: 'context',
      assertion: houseStyle(plan.editorNote).slice(0, 900),
      entity_slug: null,
      verification: 'single_source',
      source_tier: 2,
      source_url: `https://peninsulainsider.com.au/explore/plans/${plan.slug}/`,
    });
  }

  for (const s of stops) {
    const slug = stopSlug(s);
    const e = entities.get(slug);
    if (!e) continue;
    if (s.note) {
      signals.push({
        role: 'support',
        assertion: houseStyle(`${e.name}: ${s.note}`).slice(0, 900),
        entity_slug: slug,
        verification: 'single_source',
        source_tier: 2,
        source_url: e.website ?? null,
      });
    }
    if (e.bookingUrl) {
      signals.push({
        role: 'commercial',
        assertion: houseStyle(`${e.name} takes direct bookings.`),
        entity_slug: slug,
        verification: 'single_source',
        source_tier: 1,
        source_url: e.bookingUrl,
      });
    }
  }

  // Seasonal timing. Deterministic, so it is genuinely verified.
  signals.push({
    role: 'timing',
    assertion: houseStyle(`Published for ${week}, ${season} on the Mornington Peninsula.`),
    entity_slug: null,
    verification: 'verified',
    source_tier: 1,
    source_url: null,
    verified_at: new Date().toISOString(),
  });

  // Media gaps are a risk signal, recorded so the QA pass can strip any
  // derivative that implies photography we do not have.
  if (gaps.length) {
    signals.push({
      role: 'risk',
      assertion: houseStyle(`No social-cleared photography for: ${gaps.join(', ')}. Derivatives for these stops must use brand graphics or typographic cards.`),
      entity_slug: null,
      verification: 'verified',
      source_tier: 1,
      source_url: null,
      verified_at: new Date().toISOString(),
    });
  }

  await log.stage('build-fact-base', {
    startedAt: t0,
    outputs: {
      signals: signals.length,
      byRole: signals.reduce((a, s) => ({ ...a, [s.role]: (a[s.role] ?? 0) + 1 }), {}),
    },
  });

  // ── 4. Assemble the packet ───────────────────────────────────────────────
  const campaignKey = `CMP-${week}-${plan.slug}`.slice(0, 120);
  const riskClass = mediaReadiness < 0.3 ? 'amber' : 'green';
  const campaign = {
    campaign_key: campaignKey,
    publication_week: week,
    featured_plan_slug: plan.slug,
    audience: {
      couple: 'couples', couples: 'couples', family: 'families', families: 'families',
      friends: 'friends', solo: 'solo', locals: 'locals',
    }[plan.audience] ?? 'planners',
    // JUDGEMENT zone: deliberately null. A human writes the thesis.
    strategic_theme: null,
    editorial_thesis: null,
    core_promise: null,
    angle_rationale: null,
    plan_fitness_json: { media_readiness: Number(mediaReadiness.toFixed(2)), stops: stops.length },
    seasonal_context: { season, week, generated_from: 'campaign-build.mjs' },
    confidence: null,
    // Always brief_ready at build time. A thin media position is a RISK, not a
    // block: production has not run yet, so nothing is actually stuck. The
    // media_required state belongs to the production stage, which is the only
    // stage that can discover it genuinely cannot proceed.
    state: 'brief_ready',
    risk_class: riskClass,
    risk_note: gaps.length
      ? houseStyle(`Media readiness ${(mediaReadiness * 100).toFixed(0)}%. ${gaps.length} of ${stops.length} stops lack a social-cleared asset. Derivatives will fall back to brand graphics and typographic cards.`)
      : null,
    blocked_reason: null,
    // Use the whole plan slug: slicing the last two segments turned
    // "sorrento-off-season-weekend" into "season-weekend", which is not
    // identifiable in an analytics report.
    utm_campaign: `pi-${week.toLowerCase()}-${plan.slug}`.slice(0, 60),
    correlation_id: correlationId,
    est_cost_usd: 0,
  };

  const assets = CHANNELS.map((c) => ({
    channel: c.channel,
    variant: c.variant ?? null,
    purpose: c.purpose,
    approval_level: c.approval,
    lifespan_days: c.lifespan,
    state: 'draft',
    cta_url: `https://peninsulainsider.com.au/explore/plans/${plan.slug}/?utm_source=${c.channel}&utm_medium=organic&utm_campaign=${campaign.utm_campaign}`,
  }));

  // ── 5. Persist ───────────────────────────────────────────────────────────
  t0 = new Date();
  let campaignId = null;
  if (DRY || !hasDb()) {
    await log.stage('persist', {
      startedAt: t0, status: 'skipped',
      outputs: { reason: DRY ? 'dry run' : 'no database credentials' },
    });
  } else {
    const existing = await select(`pi_campaigns?select=id,state&campaign_key=eq.${encodeURIComponent(campaignKey)}`);
    if (existing?.length) {
      campaignId = existing[0].id;
      await log.stage('persist', {
        startedAt: t0, status: 'skipped', mutation: 'report-only',
        outputs: { campaign_id: campaignId, reason: `campaign ${campaignKey} already exists in state ${existing[0].state}` },
      });
    } else {
      const [created] = await insert('pi_campaigns', [campaign]);
      campaignId = created.id;
      log.campaignId = campaignId;
      // PostgREST requires every object in a batch to carry the same keys, so
      // normalise against a full template rather than relying on each builder
      // above to remember the optional fields.
      const SIGNAL_KEYS = {
        campaign_id: null, claim_id: null, opportunity_id: null, role: null,
        assertion: null, entity_slug: null, verification: 'unverified',
        source_tier: null, source_url: null, verified_at: null, expires_at: null,
      };
      await insert(
        'pi_campaign_signals',
        signals.map((s) => ({ ...SIGNAL_KEYS, ...s, campaign_id: campaignId }))
      );
      await insert('pi_campaign_assets', assets.map((a) => ({ ...a, campaign_id: campaignId })));
      await log.stage('persist', {
        startedAt: t0, mutation: 'mutating-content',
        toState: campaign.state,
        outputs: { campaign_id: campaignId, signals: signals.length, assets: assets.length },
      });
    }
  }

  // ── 6. Write the human-facing brief ──────────────────────────────────────
  t0 = new Date();
  const brief = renderBrief({ campaign, campaignId, plan, stops, entities, signals, assets, gaps, mediaReadiness });
  const dir = join(REPO, 'ops/campaigns');
  await mkdir(dir, { recursive: true });
  const briefPath = join(dir, `${campaignKey}.md`);
  await writeFile(briefPath, brief, 'utf8');
  const packetPath = join(dir, `${campaignKey}.json`);
  await writeFile(packetPath, JSON.stringify({ campaign, signals, assets, campaign_id: campaignId }, null, 2), 'utf8');
  await log.stage('write-brief', {
    startedAt: t0, mutation: 'mutating-content',
    artifacts: [relative(REPO, briefPath), relative(REPO, packetPath)],
  });

  const s = log.summary();
  console.log(`\ncampaign: ${campaignKey}`);
  console.log(`state:    ${campaign.state}${campaign.blocked_reason ? ` (${campaign.blocked_reason})` : ''}`);
  console.log(`brief:    ${relative(REPO, briefPath)}`);
  console.log(`stages:   ${s.stages} (${JSON.stringify(s.counts)})`);
  console.log(`\nNext: write the thesis in the brief, then run campaign-derive.mjs.\n`);
}

function renderBrief({ campaign, campaignId, plan, stops, entities, signals, assets, gaps, mediaReadiness }) {
  const L = [];
  L.push(`# Campaign brief: ${plan.title}`);
  L.push('');
  L.push(`**Key:** \`${campaign.campaign_key}\``);
  L.push(`**Week:** ${campaign.publication_week} (${campaign.seasonal_context.season})`);
  L.push(`**State:** \`${campaign.state}\` · risk \`${campaign.risk_class}\``);
  if (campaignId) L.push(`**Campaign id:** \`${campaignId}\``);
  L.push(`**UTM:** \`${campaign.utm_campaign}\``);
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 1. The thesis (JUDGEMENT — you write this)');
  L.push('');
  L.push('> _Two or three sentences. Name a place, name a window, name an action._');
  L.push('> _This is the only thing the whole campaign inherits, so it is the only thing worth getting exactly right._');
  L.push('');
  L.push('```');
  L.push('THESIS:');
  L.push('');
  L.push('CORE PROMISE:');
  L.push('');
  L.push('WHY THIS ANGLE OVER THE RUNNERS-UP:');
  L.push('');
  L.push('APPROVED BY:');
  L.push('```');
  L.push('');
  L.push('Nothing generates until `THESIS` is filled in.');
  L.push('');
  L.push('`APPROVED BY` is the signature line and **only a human may fill it**. Leave it blank and the derivatives still generate so you can read them, but every L3 asset stays a draft and the campaign parks in `awaiting_editorial_approval`. Sign it and the campaign moves to `in_production`.');
  L.push('');
  L.push('## 2. The Plan');
  L.push('');
  L.push(`**${plan.title}**`);
  L.push('');
  L.push(`${plan.dek}`);
  L.push('');
  L.push(`${plan.lengthNights} night(s) · ${stops.length} stops · ${plan.totalDriveMinutes ?? '?'} min driving · best for ${plan.audience}`);
  L.push('');
  L.push('| Day | Time | Stop | Editorial note |');
  L.push('|---|---|---|---|');
  for (const s of stops) {
    const e = entities.get(stopSlug(s));
    L.push(`| ${s.day} | ${s.timeRange ?? s.timeOfDay} | ${e?.name ?? stopSlug(s)} | ${(s.note ?? '').slice(0, 110)} |`);
  }
  L.push('');

  // Schema completeness: the highest-leverage site work.
  const optional = ['editorialFrame', 'anchorStay', 'bookingChecklist', 'variations', 'skipThese', 'faq', 'costBreakdown', 'walkingIntensity', 'drivingDistanceKm'];
  const missing = optional.filter((k) => {
    const v = plan[k];
    return v === undefined || v === null || (Array.isArray(v) && v.length === 0);
  });
  if (missing.length) {
    L.push('### Schema fields still empty on this Plan');
    L.push('');
    L.push('Filling these is worth more than any derivative. They are what turn a good page into the definitive answer.');
    L.push('');
    for (const m of missing) L.push(`- \`${m}\``);
    L.push('');
  }

  L.push('## 3. Fact base');
  L.push('');
  L.push('Every proposition in every derivative must trace to a row here. Anything a derivative asserts that is not below is a fabrication and the QA pass will strip it.');
  L.push('');
  L.push('| Role | Verification | Assertion |');
  L.push('|---|---|---|');
  for (const s of signals) {
    L.push(`| ${s.role} | ${s.verification} (T${s.source_tier ?? '?'}) | ${s.assertion.slice(0, 150)} |`);
  }
  L.push('');
  L.push('**To verify before publication:** every `single_source` row above is PI asserting its own prior copy. That is fine for context, but any of it that reaches a hook or a timing claim must be re-confirmed against a first-party source this week.');
  L.push('');

  L.push('## 4. Media position');
  L.push('');
  L.push(`Readiness: **${(mediaReadiness * 100).toFixed(0)}%** (${stops.length - gaps.length} of ${stops.length} stops have a social-cleared asset).`);
  L.push('');
  if (gaps.length) {
    L.push('Stops with no channel-permitted photography:');
    L.push('');
    for (const g of gaps) L.push(`- \`${g}\``);
    L.push('');
    L.push('The derivative engine will fall back to brand graphics and typographic cards for these. That is a legitimate outcome, not a failure. It is also the argument for commissioning first-party photography.');
    L.push('');
  }

  L.push('## 5. Channel plan');
  L.push('');
  L.push('| Channel | Approval | Lifespan | Purpose |');
  L.push('|---|---|---:|---|');
  for (const a of assets) {
    L.push(`| \`${a.channel}\`${a.variant ? ` (${a.variant})` : ''} | ${a.approval_level} | ${a.lifespan_days}d | ${a.purpose} |`);
  }
  L.push('');
  L.push('L3 = you approve, always. L2 = agent drafts, you audit a sample. L1 = auto-publish, spot check. L0 = mechanical.');
  L.push('');
  L.push('## 6. Approval');
  L.push('');
  L.push('- [ ] Thesis written and it names a place, a window, and an action');
  L.push('- [ ] Fact base checked: no hook or timing claim rests on unverified material');
  L.push('- [ ] Media position accepted (or photography supplied)');
  L.push('- [ ] Ready to generate derivatives');
  L.push('');
  return L.join('\n');
}

main().catch((err) => {
  console.error(`[campaign-build] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
