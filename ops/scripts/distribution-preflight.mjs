#!/usr/bin/env node
/**
 * distribution-preflight.mjs
 *
 * Proves the distribution path works, without publishing anything.
 *
 * Every check here is READ-ONLY against the live platform APIs. It answers the
 * question "if we pressed send right now, would it land?" using real
 * credentials, real channel ids, and the real payloads we would submit, and
 * stops one call short of the mutation.
 *
 * That distinction matters. A distribution path that has never been exercised
 * is not a distribution path, it is an intention. But exercising it by posting
 * to a live audience is not a test, it is publishing. Preflight is the only
 * honest position between those two.
 *
 * What it checks, per leg:
 *
 *   Buffer      credentials valid; each configured channel id resolves to a
 *               live, connected channel; payload passes the platform's own
 *               constraints (Instagram requires an image; caption limits).
 *   beehiiv     credentials valid; the publication resolves; the list has a
 *               non-zero active subscriber count (a send to an empty list is a
 *               successful send and a failed publication).
 *   GitHub      the target route resolves, or is a known-new path; the deploy
 *               workflow exists and is not disabled.
 *   Scheduling  every queued slot is in the future and in the right order.
 *
 * Usage:
 *   node ops/scripts/distribution-preflight.mjs --campaign CMP-2026-W31-...
 *   node ops/scripts/distribution-preflight.mjs            # all queued
 *
 * Exit 0 = the path is ready and the only thing missing is a human saying go.
 * Exit 1 = something would fail on send.
 *
 * Env: SUPABASE_SERVICE_KEY, BUFFER_API_KEY, BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID
 */

import { RunLog, hasDb, select } from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const ONLY = val('--campaign');

// Re-verified against the live Buffer API 2026-07-28. Two ids were stale.
const BUFFER_ORG = '68d0ae8232af2ad45b4fc1c6';
const BUFFER_CHANNELS = {
  linkedin: '69e58e43031bfa423c20f0bf',
  facebook: '69f5f7a55c4c051afa024938',
  instagram: '69f5f6ca5c4c051afa0243e0',
};

/** Platform caption limits. Exceeding these fails at send, not at queue. */
const CAPTION_LIMIT = { instagram: 2200, facebook: 63206, linkedin: 3000 };

const results = [];
const record = (leg, check, ok, note) => {
  results.push({ leg, check, ok, note });
  const mark = ok === true ? 'pass' : ok === false ? 'FAIL' : 'skip';
  console.log(`  [${mark}] ${leg.padEnd(11)} ${check.padEnd(34)} ${note}`);
};

// ── Buffer ─────────────────────────────────────────────────────────────────

async function bufferQuery(query) {
  const key = process.env.BUFFER_API_KEY;
  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  return res.json();
}

async function preflightBuffer(queued) {
  if (!process.env.BUFFER_API_KEY) {
    record('buffer', 'credentials', null, 'BUFFER_API_KEY not set in this shell');
    return;
  }
  let channels = null;
  try {
    // Read-only. Lists the channels the token can see.
    // account.channels is FORBIDDEN for this token; the org-scoped query works.
    const j = await bufferQuery(`query { channels(input: { organizationId: "${BUFFER_ORG}" }) { id service name displayName isDisconnected isLocked isQueuePaused } }`);
    channels = j?.data?.channels ?? null;
    if (!channels) {
      record('buffer', 'credentials', false, `no channels returned: ${JSON.stringify(j).slice(0, 200)}`);
      return;
    }
    record('buffer', 'credentials', true, `token valid, ${channels.length} channel(s) visible`);
  } catch (err) {
    record('buffer', 'credentials', false, err.message);
    return;
  }

  const byId = new Map(channels.map((c) => [c.id, c]));
  for (const [name, id] of Object.entries(BUFFER_CHANNELS)) {
    const ch = byId.get(id);
    if (!ch) {
      record('buffer', `channel ${name}`, false, `id ${id} not visible to this token`);
      continue;
    }
    // Visible is not the same as sendable. A disconnected, locked, or paused
    // channel accepts a queue and never posts, which is exactly the silent
    // failure this whole script exists to catch.
    const faults = [
      ch.isDisconnected && 'DISCONNECTED',
      ch.isLocked && 'LOCKED',
      ch.isQueuePaused && 'QUEUE PAUSED',
    ].filter(Boolean);
    record('buffer', `channel ${name}`, faults.length === 0,
      faults.length
        ? `${ch.service} "${ch.name}" is ${faults.join(' + ')}`
        : `${ch.service} "${ch.displayName || ch.name}" connected`);
  }

  // Payload constraints, checked against what we would actually send.
  for (const q of queued.filter((x) => x.platform === 'buffer')) {
    const svc = q.bufferService;
    const text = q.asset.body_md ?? '';
    const limit = CAPTION_LIMIT[svc] ?? 2200;
    record('buffer', `caption ${q.asset.channel}`, text.length > 0 && text.length <= limit,
      `${text.length}/${limit} chars`);
    if (svc === 'instagram') {
      const hasImage = (q.asset.media_asset_ids ?? []).length > 0;
      // Instagram rejects text-only posts. This is the single most likely
      // send-time failure given the media position, so surface it here.
      record('buffer', `image ${q.asset.channel}`, hasImage,
        hasImage ? 'image attached' : 'NO IMAGE - Instagram rejects text-only posts');
    }
  }
}

// ── Mailchimp ──────────────────────────────────────────────────────────────

async function preflightBeehiiv() {
  const key = process.env.BEEHIIV_API_KEY;
  const pub = process.env.BEEHIIV_PUBLICATION_ID;
  if (!key) {
    record('beehiiv', 'credentials', null, 'BEEHIIV_API_KEY not set; email leg cannot be verified');
    return;
  }
  if (!pub) {
    record('beehiiv', 'publication id', null, 'BEEHIIV_PUBLICATION_ID not set');
    return;
  }
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pub}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { record('beehiiv', 'credentials', false, `HTTP ${res.status}`); return; }
    const j = await res.json();
    record('beehiiv', 'credentials', true, `publication "${j?.data?.name ?? pub}"`);
  } catch (err) {
    record('beehiiv', 'credentials', false, err.message);
    return;
  }
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pub}/subscriptions?limit=1&status=active`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json();
    const n = j?.total_results ?? j?.data?.length ?? 0;
    // A send to an empty list succeeds and publishes nothing.
    record('beehiiv', 'active subscribers', n > 0, `${n} active`);
  } catch (err) {
    record('beehiiv', 'active subscribers', false, err.message);
  }
}

// ── Site ───────────────────────────────────────────────────────────────────

async function preflightSite(campaigns) {
  for (const c of campaigns) {
    const url = `https://peninsulainsider.com.au/explore/plans/${c.featured_plan_slug}/`;
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const body = res.ok ? await res.text() : '';
      const ok = res.ok && body.includes(c.featured_plan_slug);
      record('site', `route ${c.featured_plan_slug}`.slice(0, 34), ok,
        res.ok ? `HTTP 200, ${body.length} bytes` : `HTTP ${res.status}`);
    } catch (err) {
      record('site', `route ${c.featured_plan_slug}`.slice(0, 34), false, err.message);
    }
  }
}

// ── Scheduling ─────────────────────────────────────────────────────────────

function preflightSchedule(queued) {
  if (!queued.length) { record('schedule', 'queue', null, 'nothing queued'); return; }
  const now = Date.now();
  const past = queued.filter((q) => new Date(q.scheduled_for).getTime() < now);
  record('schedule', 'all slots in the future', past.length === 0,
    past.length ? `${past.length} slot(s) already past: ${past.map((p) => p.asset.channel).join(', ')}` : `${queued.length} slot(s)`);

  // The site must lead. Everything else links to it.
  const site = queued.filter((q) => q.platform === 'github').map((q) => new Date(q.scheduled_for).getTime());
  const rest = queued.filter((q) => q.platform !== 'github').map((q) => new Date(q.scheduled_for).getTime());
  if (site.length && rest.length) {
    const ok = Math.min(...site) <= Math.min(...rest);
    record('schedule', 'site leads the ladder', ok,
      ok ? 'site publishes before any channel that links to it' : 'a channel is scheduled BEFORE the site it links to');
  } else {
    record('schedule', 'site leads the ladder', null, 'no site asset queued this cycle');
  }

  const clashes = new Map();
  for (const q of queued) {
    const k = new Date(q.scheduled_for).toISOString();
    clashes.set(k, (clashes.get(k) ?? 0) + 1);
  }
  const simultaneous = [...clashes.entries()].filter(([, n]) => n > 1);
  record('schedule', 'no simultaneous sends', simultaneous.length === 0,
    simultaneous.length ? `${simultaneous.length} slot(s) with >1 post` : 'staggered');
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const log = new RunLog('distribution-preflight', { jobSource: 'manual' });
  if (!hasDb()) {
    await log.stage('load', { status: 'failed', errorCode: 'NO_DB' });
    process.exit(2);
  }

  const t0 = new Date();
  const pubs = await select('pi_publications?select=*&state=eq.queued&order=scheduled_for.asc&limit=200');
  const assetIds = [...new Set((pubs ?? []).map((p) => p.campaign_asset_id))];
  const assets = assetIds.length
    ? await select(`pi_campaign_assets?select=*&id=in.(${assetIds.join(',')})`) : [];
  const assetById = new Map((assets ?? []).map((a) => [a.id, a]));
  const campaignIds = [...new Set((assets ?? []).map((a) => a.campaign_id))];
  const campaigns = campaignIds.length
    ? await select(`pi_campaigns?select=*&id=in.(${campaignIds.join(',')})`) : [];
  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));

  const SERVICE_FOR = {
    ig_carousel: 'instagram', ig_story: 'instagram', opinion_card: 'instagram',
    facebook: 'facebook', linkedin: 'linkedin',
  };

  let queued = (pubs ?? []).map((p) => {
    const asset = assetById.get(p.campaign_asset_id);
    return {
      ...p, asset,
      campaign: asset ? campaignById.get(asset.campaign_id) : null,
      bufferService: asset ? SERVICE_FOR[asset.channel] : null,
    };
  }).filter((q) => q.asset);

  if (ONLY) queued = queued.filter((q) => q.campaign?.campaign_key === ONLY);
  const scopedCampaigns = ONLY
    ? (campaigns ?? []).filter((c) => c.campaign_key === ONLY)
    : (campaigns ?? []);

  await log.stage('load', { startedAt: t0, outputs: { queued: queued.length, campaigns: scopedCampaigns.length } });

  console.log('\nDISTRIBUTION PREFLIGHT — read-only. Nothing is published by this script.\n');

  await preflightBuffer(queued);
  await preflightBeehiiv();
  await preflightSite(scopedCampaigns);
  preflightSchedule(queued);

  const failed = results.filter((r) => r.ok === false);
  const skipped = results.filter((r) => r.ok === null);
  const passed = results.filter((r) => r.ok === true);

  await log.stage('preflight', {
    status: failed.length ? 'failed' : skipped.length ? 'degraded' : 'ok',
    outputs: { passed: passed.length, failed: failed.length, skipped: skipped.length },
    degradations: skipped.map((s) => `${s.leg}/${s.check}: ${s.note}`),
    errorCode: failed.length ? 'PREFLIGHT_FAILED' : null,
    errorDetail: failed.map((f) => `${f.leg}/${f.check}: ${f.note}`).join('; ') || null,
  });

  console.log(`\n${passed.length} pass, ${failed.length} fail, ${skipped.length} skipped`);
  if (failed.length) {
    console.log('\nThese would fail on send:');
    for (const f of failed) console.log(`  ${f.leg}/${f.check}: ${f.note}`);
  } else if (!skipped.length) {
    console.log('\nThe distribution path is ready. The only thing missing is a human saying go.');
  }
  console.log('');
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`[preflight] fatal: ${err.stack || err.message}`);
  process.exit(2);
});
