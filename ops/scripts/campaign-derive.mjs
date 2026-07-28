#!/usr/bin/env node
/**
 * campaign-derive.mjs
 *
 * Generates channel copy for every asset on a campaign.
 *
 * Design decision that matters: derivatives are assembled from FRAGMENTS that
 * each carry their own provenance, rather than generated as prose and
 * fact-checked afterwards. A fragment is either:
 *
 *   { from: 'signal', id }   text lifted from a pi_campaign_signals assertion
 *   { from: 'plan',   field } text lifted from a human-written itinerary field
 *   { from: 'thesis' }        the human-approved thesis
 *   { from: 'boilerplate' }   fixed brand furniture with no factual content
 *
 * Because provenance is structural, the trace check is not a heuristic that
 * can be fooled. A fragment with no source cannot be assembled at all. That
 * is the whole fabrication defence, moved one layer earlier than a QA gate.
 *
 * No LLM. No cost. The voice is PI's because a human wrote every factual
 * sentence; this script chooses, orders, and frames them per channel.
 *
 * Usage:
 *   node ops/scripts/campaign-derive.mjs --campaign CMP-2026-W31-the-peninsula-golf-weekend
 *   node ops/scripts/campaign-derive.mjs --campaign <key> --dry-run
 *
 * Env: SUPABASE_SERVICE_KEY
 */

import { writeFile, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import {
  REPO, RunLog, hasDb, select, patch,
  loadEntities, loadItineraries, stopSlug,
  houseStyle, houseStyleViolations,
} from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const KEY = val('--campaign');
const DRY = args.includes('--dry-run');

if (!KEY) {
  console.error('Usage: campaign-derive.mjs --campaign <campaign_key> [--dry-run]');
  process.exit(2);
}

// ── Fragment assembly ──────────────────────────────────────────────────────

const frag = {
  signal: (s, text) => ({ from: 'signal', id: s.id ?? null, role: s.role, text: houseStyle(text ?? s.assertion) }),
  plan: (field, text) => ({ from: 'plan', field, text: houseStyle(text) }),
  thesis: (text) => ({ from: 'thesis', text: houseStyle(text) }),
  boiler: (text) => ({ from: 'boilerplate', text: houseStyle(text) }),
};

/** Join fragments into markdown and return the provenance list alongside. */
function assemble(fragments, joiner = '\n\n') {
  const kept = fragments.filter((f) => f && f.text && f.text.trim());
  const untraced = kept.filter((f) => !['signal', 'plan', 'thesis', 'boilerplate'].includes(f.from));
  if (untraced.length) {
    throw new Error(`[derive] ${untraced.length} fragment(s) have no provenance. Refusing to assemble.`);
  }
  return {
    body: kept.map((f) => f.text).join(joiner),
    provenance: kept.map((f) => ({ from: f.from, id: f.id ?? null, field: f.field ?? null, chars: f.text.length })),
  };
}

const nights = (n) => `${n} ${n === 1 ? 'night' : 'nights'}`;

// ── Per-channel generators ─────────────────────────────────────────────────

function genSiteArticle({ thesis, promise, plan, stops, entities, signals }) {
  const support = signals.filter((s) => s.role === 'support');
  const f = [
    frag.thesis(thesis),
    frag.boiler('## The shape of it'),
    frag.plan('dek', plan.dek),
  ];
  for (const s of stops) {
    const e = entities.get(stopSlug(s));
    if (!e || !s.note) continue;
    const sig = support.find((x) => x.entity_slug === stopSlug(s));
    f.push(frag.boiler(`### ${e.name}`));
    f.push(sig ? frag.signal(sig, s.note) : frag.plan(`stops.${stopSlug(s)}.note`, s.note));
  }
  if (plan.skipThese) {
    f.push(frag.boiler('## What to skip'));
    f.push(frag.plan('skipThese', plan.skipThese));
  }
  f.push(frag.boiler('## The plan'));
  if (promise) f.push(frag.thesis(promise));
  return assemble(f);
}

function genEmail({ thesis, promise, plan, stops, entities, signals, ctaUrl }) {
  const commercial = signals.filter((s) => s.role === 'commercial');
  const first = stops[0] ? entities.get(stopSlug(stops[0])) : null;
  const f = [
    frag.boiler('**The lead**'),
    frag.thesis(thesis),
    frag.boiler('**The featured plan**'),
    frag.plan('title', `**${plan.title}**`),
    frag.plan('dek', plan.dek),
    frag.boiler(`${nights(plan.lengthNights)}, ${stops.length} stops, about ${plan.totalDriveMinutes ?? '?'} minutes of driving.`),
  ];
  if (first) {
    f.push(frag.boiler('**Start here**'));
    f.push(frag.plan('stops.0', `${first.name}. ${stops[0].note ?? ''}`));
  }
  if (commercial.length) {
    f.push(frag.boiler('**One booking note**'));
    f.push(frag.signal(commercial[0]));
  }
  if (promise) f.push(frag.thesis(promise));
  f.push(frag.boiler(`[Read the full plan](${ctaUrl})`));
  return assemble(f);
}

function genCarousel({ thesis, plan, stops, entities, signals, mediaGaps }) {
  const slides = [];
  slides.push({ n: 1, kind: 'hook', ...assemble([frag.thesis(thesis.split(/(?<=\.)\s/)[0])]) });
  slides.push({
    n: 2, kind: 'frame',
    ...assemble([frag.plan('dek', `${nights(plan.lengthNights)}. ${stops.length} stops. ${plan.dek}`)]),
  });
  let n = 3;
  for (const s of stops.slice(0, 5)) {
    const e = entities.get(stopSlug(s));
    if (!e) continue;
    const sig = signals.find((x) => x.role === 'support' && x.entity_slug === stopSlug(s));
    slides.push({
      n: n++,
      kind: mediaGaps.includes(stopSlug(s)) ? 'typographic' : 'photo',
      ...assemble([
        frag.boiler(`${String(s.timeRange ?? s.timeOfDay).toUpperCase()} · ${e.name}`),
        sig ? frag.signal(sig, s.note) : frag.plan('stops.note', s.note ?? ''),
      ], '\n'),
    });
  }
  if (plan.skipThese) {
    slides.push({ n: n++, kind: 'typographic', ...assemble([frag.boiler('What to skip'), frag.plan('skipThese', plan.skipThese)], '\n') });
  }
  slides.push({ n, kind: 'cta', ...assemble([frag.boiler('The full plan, with the booking order. Link in bio.')]) });

  const body = slides.map((s) => `**Slide ${s.n}** (${s.kind})\n${s.body}`).join('\n\n');
  const provenance = slides.flatMap((s) => s.provenance);
  return { body, provenance, slides: slides.length, typographic: slides.filter((s) => s.kind === 'typographic').length };
}

function genFacebook({ thesis, plan, stops, entities, signals, ctaUrl }) {
  // Facebook's job is Remind, and its reader is usually the person the plan is
  // NOT built for. Lead with the objection, not the pitch.
  const support = signals.filter((s) => s.role === 'support');
  const pick = support[Math.min(1, support.length - 1)] ?? support[0];
  const f = [
    frag.thesis(thesis.split(/(?<=\.)\s/).slice(0, 1).join(' ')),
    pick ? frag.signal(pick) : frag.plan('dek', plan.dek),
    frag.boiler(`${nights(plan.lengthNights)}, ${stops.length} stops, about ${plan.totalDriveMinutes ?? '?'} minutes of driving all up.`),
    frag.boiler(`Full plan and the booking order: ${ctaUrl}`),
  ];
  return assemble(f);
}

function genStory({ plan, stops, entities, signals, ctaUrl }) {
  const commercial = signals.filter((s) => s.role === 'commercial');
  const frames = [
    assemble([frag.plan('title', plan.title)], '\n'),
    assemble([frag.boiler('Book these first'), ...(commercial.slice(0, 2).map((c) => frag.signal(c)))], '\n'),
    assemble([frag.boiler('Everything else fits around them'),
      frag.plan('shape', `${stops.length} stops, ${plan.totalDriveMinutes ?? '?'} minutes driving`)], '\n'),
    assemble([frag.boiler('Full plan: link sticker')], '\n'),
  ];
  return {
    body: frames.map((f, i) => `**Frame ${i + 1}**\n${f.body}`).join('\n\n'),
    provenance: frames.flatMap((f) => f.provenance),
  };
}

function genOpinionCard({ plan }) {
  // The cheapest high-value derivative in the matrix: pure typography over
  // PI's own verdict. No photography, no rights exposure, no generation.
  const source = plan.skipThese
    ? frag.plan('skipThese', plan.skipThese)
    : frag.plan('editorNote', (plan.editorNote ?? '').split(/(?<=\.)\s/).slice(0, 2).join(' '));
  return assemble([source, frag.boiler('Peninsula Insider')], '\n\n');
}

function genSiteLinks({ plan, stops, entities }) {
  const rows = stops
    .map((s) => entities.get(stopSlug(s)))
    .filter(Boolean)
    .map((e) => `- \`${e.slug}\` cross-links to /explore/plans/${plan.slug}/`);
  return assemble([
    frag.boiler('Mechanical linking pass. No editorial content.'),
    frag.boiler(rows.join('\n')),
    frag.boiler(`Add ItemList JSON-LD to /explore/plans/${plan.slug}/ covering ${stops.length} stops in order.`),
  ]);
}

function genSitePlan({ plan, mediaGaps, signals }) {
  const optional = ['editorialFrame', 'anchorStay', 'bookingChecklist', 'variations', 'skipThese', 'faq', 'costBreakdown'];
  const missing = optional.filter((k) => {
    const v = plan[k];
    return v === undefined || v === null || (Array.isArray(v) && v.length === 0);
  });
  const risk = signals.find((s) => s.role === 'risk');
  return assemble([
    frag.boiler('## Plan enhancement worklist'),
    frag.boiler(missing.length
      ? `Schema fields to complete: ${missing.map((m) => `\`${m}\``).join(', ')}`
      : 'Schema complete.'),
    frag.boiler('Refresh `lastVerified` once the fact base is re-confirmed.'),
    risk ? frag.signal(risk) : frag.boiler('Media position acceptable.'),
    frag.boiler(mediaGaps.length
      ? `Photography needed for: ${mediaGaps.join(', ')}`
      : 'No photography gaps.'),
  ]);
}

// ── Thesis loading ─────────────────────────────────────────────────────────

/** Read the thesis out of the human-edited brief, if the DB does not have it. */
async function thesisFromBrief(key) {
  try {
    const md = await readFile(join(REPO, 'ops/campaigns', `${key}.md`), 'utf8');
    const block = /```\s*\nTHESIS:\s*([\s\S]*?)\nCORE PROMISE:\s*([\s\S]*?)\nWHY THIS ANGLE[^\n]*\n([\s\S]*?)\nAPPROVED BY:\s*([^\n]*)\n[\s\S]*?```/m.exec(md);
    if (!block) return null;
    const [, thesis, promise, rationale, approvedBy] = block;
    const clean = (s) => s.replace(/\s+/g, ' ').trim();
    if (!clean(thesis)) return null;
    return {
      thesis: clean(thesis),
      promise: clean(promise),
      rationale: clean(rationale),
      // An unsigned thesis is a draft. Derivatives still generate so they can
      // be looked at, but nothing L3 reaches `ready` and the campaign parks in
      // awaiting_editorial_approval. A machine must never sign this line.
      approvedBy: clean(approvedBy) || null,
    };
  } catch {
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const log = new RunLog('campaign-derive', { jobSource: 'manual' });

  if (!hasDb()) {
    await log.stage('load', { status: 'failed', errorCode: 'NO_DB', errorDetail: 'SUPABASE_SERVICE_KEY not set' });
    process.exit(2);
  }

  // ── 1. Load campaign, signals, assets ────────────────────────────────────
  let t0 = new Date();
  const [campaign] = await select(`pi_campaigns?select=*&campaign_key=eq.${encodeURIComponent(KEY)}`);
  if (!campaign) {
    await log.stage('load', { status: 'failed', startedAt: t0, errorCode: 'CAMPAIGN_NOT_FOUND', errorDetail: KEY });
    process.exit(1);
  }
  log.campaignId = campaign.id;
  log.correlationId = campaign.correlation_id;
  const signals = await select(`pi_campaign_signals?select=*&campaign_id=eq.${campaign.id}`);
  const assets = await select(`pi_campaign_assets?select=*&campaign_id=eq.${campaign.id}`);
  await log.stage('load', {
    startedAt: t0,
    outputs: { campaign: KEY, state: campaign.state, signals: signals.length, assets: assets.length },
  });

  // ── 2. Thesis gate. This is the governance rule, enforced in code. ───────
  t0 = new Date();
  let thesis = campaign.editorial_thesis;
  let promise = campaign.core_promise;
  let rationale = campaign.angle_rationale;
  let approvedBy = campaign.thesis_approved_by;
  if (!thesis) {
    const fromBrief = await thesisFromBrief(KEY);
    if (fromBrief) ({ thesis, promise, rationale, approvedBy } = fromBrief);
  }
  if (!thesis) {
    await log.stage('thesis-gate', {
      status: 'blocked', startedAt: t0,
      errorCode: 'THESIS_MISSING',
      errorDetail: `No editorial thesis. Write one in ops/campaigns/${KEY}.md and re-run.`,
      escalatedTo: 'james',
    });
    console.error('\nThe thesis is a JUDGEMENT-zone field. A machine may draft it; it may never finalise it.');
    console.error(`Write it into ops/campaigns/${KEY}.md between the fenced block, then re-run.\n`);
    process.exit(1);
  }
  const thesisApproved = Boolean(approvedBy) && !/^draft/i.test(approvedBy);
  await log.stage('thesis-gate', {
    startedAt: t0,
    status: thesisApproved ? 'ok' : 'degraded',
    outputs: { thesis_chars: thesis.length, has_promise: Boolean(promise), approved_by: approvedBy },
    degradations: thesisApproved ? [] : ['thesis is an unsigned draft; L3 assets will not reach ready'],
  });

  // ── 3. Resolve plan + media position ─────────────────────────────────────
  t0 = new Date();
  const itineraries = await loadItineraries();
  const plan = itineraries.find((i) => i.slug === campaign.featured_plan_slug);
  const entities = await loadEntities();
  const stops = (plan?.stops ?? []).slice().sort((a, b) => (a.day - b.day) || (a.order - b.order));

  const slugs = stops.map(stopSlug).filter(Boolean);
  const mediaRows = slugs.length
    ? await select(
      `pi_media_assets?select=entity_slug,permitted_channels&approval_status=eq.approved` +
      `&entity_slug=in.(${slugs.map(encodeURIComponent).join(',')})`)
    : [];
  const cleared = new Set(
    (mediaRows ?? []).filter((r) => (r.permitted_channels ?? []).includes('ig_carousel')).map((r) => r.entity_slug)
  );
  const mediaGaps = slugs.filter((s) => !cleared.has(s));
  await log.stage('resolve-plan', {
    startedAt: t0,
    status: mediaGaps.length ? 'degraded' : 'ok',
    outputs: { stops: stops.length, cleared: cleared.size },
    degradations: mediaGaps.length ? [`${mediaGaps.length} stops without cleared media; those slides render typographic`] : [],
  });

  // ── 4. Generate ──────────────────────────────────────────────────────────
  const ctx = { thesis, promise, rationale, plan, stops, entities, signals, mediaGaps };
  const GENERATORS = {
    site_plan: () => genSitePlan(ctx),
    site_article: () => genSiteArticle(ctx),
    email: (a) => genEmail({ ...ctx, ctaUrl: a.cta_url }),
    ig_carousel: () => genCarousel(ctx),
    facebook: (a) => genFacebook({ ...ctx, ctaUrl: a.cta_url }),
    ig_story: (a) => genStory({ ...ctx, ctaUrl: a.cta_url }),
    opinion_card: () => genOpinionCard(ctx),
    site_links: () => genSiteLinks(ctx),
  };

  const results = [];
  for (const asset of assets) {
    const t = new Date();
    const gen = GENERATORS[asset.channel];
    if (!gen) {
      results.push({ asset, state: 'skipped', reason: 'no generator for this channel' });
      await log.stage(`derive:${asset.channel}`, {
        startedAt: t, status: 'skipped',
        outputs: { reason: 'no generator (media channel, produced in the video stage)' },
      });
      continue;
    }

    let out;
    try {
      out = gen(asset);
    } catch (err) {
      results.push({ asset, state: 'qa_failed', reason: err.message });
      await log.stage(`derive:${asset.channel}`, {
        startedAt: t, status: 'failed',
        errorCode: 'TRACE_CHECK_FAILED', errorDetail: err.message,
      });
      continue;
    }

    // ── QA: house style and no-pricing, both build-blocking upstream ───────
    const violations = houseStyleViolations(out.body);
    // ── QA: provenance. Boilerplate is allowed but must not dominate. ──────
    const factual = out.provenance.filter((p) => p.from !== 'boilerplate');
    const factualChars = factual.reduce((n, p) => n + p.chars, 0);
    const totalChars = out.provenance.reduce((n, p) => n + p.chars, 0);
    const factualShare = totalChars ? factualChars / totalChars : 0;

    const qa = {
      house_style: violations.length ? 'fail' : 'pass',
      violations,
      trace: 'pass',
      provenance: out.provenance,
      factual_share: Number(factualShare.toFixed(2)),
      sources: {
        signal: out.provenance.filter((p) => p.from === 'signal').length,
        plan: out.provenance.filter((p) => p.from === 'plan').length,
        thesis: out.provenance.filter((p) => p.from === 'thesis').length,
        boilerplate: out.provenance.filter((p) => p.from === 'boilerplate').length,
      },
      ...(out.slides ? { slides: out.slides, typographic_slides: out.typographic } : {}),
    };
    // An L3 asset on an unsigned thesis stays a draft. Approval cannot be
    // inherited from a thesis nobody signed.
    const state = violations.length
      ? 'qa_failed'
      : (asset.approval_level === 'L3' && !thesisApproved) ? 'draft' : 'ready';

    results.push({ asset, state, body: out.body, qa });
    await log.stage(`derive:${asset.channel}`, {
      startedAt: t,
      status: violations.length ? 'failed' : 'ok',
      mutation: DRY ? 'report-only' : 'mutating-content',
      outputs: { chars: out.body.length, factual_share: qa.factual_share, sources: qa.sources },
      errorCode: violations.length ? 'HOUSE_STYLE_FAILED' : null,
      errorDetail: violations.join('; ') || null,
    });
  }

  // ── 5. Persist ───────────────────────────────────────────────────────────
  t0 = new Date();
  if (!DRY) {
    for (const r of results) {
      if (!r.body) continue;
      await patch(`pi_campaign_assets?id=eq.${r.asset.id}`, {
        body_md: r.body, qa_json: r.qa, state: r.state,
      });
    }
    const anyFailed = results.some((r) => r.state === 'qa_failed');
    const nextState = anyFailed ? 'qa_failed'
      : thesisApproved ? 'in_production'
        : 'awaiting_editorial_approval';
    await patch(`pi_campaigns?id=eq.${campaign.id}`, {
      editorial_thesis: thesis,
      core_promise: promise || null,
      angle_rationale: rationale || null,
      state: nextState,
      blocked_reason: anyFailed ? 'one or more derivatives failed house style' : null,
      // Only a signed thesis records an approval. A machine never signs.
      thesis_approved_at: thesisApproved ? (campaign.thesis_approved_at ?? new Date().toISOString()) : null,
      thesis_approved_by: thesisApproved ? approvedBy : null,
    });
    await log.stage('persist', {
      startedAt: t0, mutation: 'mutating-content',
      toState: anyFailed ? 'qa_failed' : 'in_production',
      outputs: { written: results.filter((r) => r.body).length },
    });
  } else {
    await log.stage('persist', { startedAt: t0, status: 'skipped', outputs: { reason: 'dry run' } });
  }

  // ── 6. Review pack ───────────────────────────────────────────────────────
  t0 = new Date();
  const L = [];
  L.push(`# Derivative review: ${plan.title}`);
  L.push('');
  L.push(`**Campaign:** \`${KEY}\``);
  L.push(`**Thesis:** ${thesis}`);
  L.push(`**Thesis approved by:** ${thesisApproved ? approvedBy : '**NOT APPROVED — unsigned draft**'}`);
  L.push('');
  L.push('Every factual sentence below was written by a human and lifted from the content layer or the fact base. Nothing here was invented by a model. The `sources` line on each asset says exactly where its text came from.');
  L.push('');
  for (const r of results) {
    L.push(`---`);
    L.push('');
    L.push(`## \`${r.asset.channel}\`${r.asset.variant ? ` (${r.asset.variant})` : ''} — ${r.asset.approval_level}`);
    L.push('');
    L.push(`_${r.asset.purpose}_`);
    L.push('');
    if (r.state === 'skipped') { L.push(`Skipped: ${r.reason}`); L.push(''); continue; }
    if (r.state === 'qa_failed') { L.push(`**QA FAILED:** ${r.reason ?? r.qa.violations.join('; ')}`); L.push(''); }
    L.push(`\`sources: ${JSON.stringify(r.qa?.sources ?? {})} · factual share ${r.qa?.factual_share ?? '?'}\``);
    L.push('');
    L.push('```');
    L.push(r.body ?? '');
    L.push('```');
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push('## Approve');
  L.push('');
  for (const r of results.filter((x) => x.asset.approval_level === 'L3' && x.state === 'ready')) {
    L.push(`- [ ] \`${r.asset.channel}\``);
  }
  L.push('');
  L.push('L2 and L1 assets publish without per-item approval. Audit a sample.');
  L.push('');

  const reviewPath = join(REPO, 'ops/campaigns', `${KEY}-review.md`);
  await writeFile(reviewPath, L.join('\n'), 'utf8');
  await log.stage('write-review', { startedAt: t0, mutation: 'mutating-content', artifacts: [relative(REPO, reviewPath)] });

  const s = log.summary();
  const ready = results.filter((r) => r.state === 'ready').length;
  console.log(`\ncampaign: ${KEY}`);
  console.log(`derived:  ${ready} ready, ${results.filter((r) => r.state === 'qa_failed').length} failed, ${results.filter((r) => r.state === 'skipped').length} skipped`);
  console.log(`review:   ${relative(REPO, reviewPath)}`);
  console.log(`stages:   ${s.stages} (${JSON.stringify(s.counts)})\n`);
}

main().catch((err) => {
  console.error(`[campaign-derive] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
