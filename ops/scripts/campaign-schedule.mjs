#!/usr/bin/env node
/**
 * campaign-schedule.mjs
 *
 * Turns `ready` campaign assets into pi_publications rows on the staggered
 * release ladder, and (only behind --submit) pushes social posts to Buffer.
 *
 * Ordering is deliberate and interlocked:
 *   Thu 06:00  site        every other channel links to it
 *   Thu 07:00  email       after the site is verified live
 *   Thu 18:00  ig_carousel
 *   Fri 08:00  facebook
 *   Sat 09:00  ig_story    while the weekend is actually happening
 *   Mon 08:00  opinion_card
 *
 * Nothing publishes simultaneously. A site failure cancels everything
 * downstream; an email failure does not cancel social; one social post
 * failing does not cancel its siblings.
 *
 * SAFETY: --submit is the only thing that talks to a live channel, and it
 * refuses to run unless the campaign's thesis is signed and every L3 asset on
 * it is `ready`. Queueing is always safe and is the default.
 *
 * Usage:
 *   node ops/scripts/campaign-schedule.mjs --campaign <key>            # queue only
 *   node ops/scripts/campaign-schedule.mjs --campaign <key> --submit   # push to Buffer
 *   node ops/scripts/campaign-schedule.mjs --campaign <key> --from 2026-07-30
 *
 * Env: SUPABASE_SERVICE_KEY, BUFFER_API_KEY (only for --submit)
 */

import { RunLog, hasDb, select, insert, patch } from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const KEY = val('--campaign');
const SUBMIT = args.includes('--submit');
const FROM = val('--from');

if (!KEY) {
  console.error('Usage: campaign-schedule.mjs --campaign <campaign_key> [--submit] [--from YYYY-MM-DD]');
  process.exit(2);
}

/** Buffer channel ids. Re-verified against the live API 2026-07-28: the two
 *  ids previously recorded in ops/skills/social-publishing.md were stale and
 *  resolved to "Channel not found". Verify with distribution-preflight.mjs
 *  rather than trusting this list. */
// Re-verified against the live Buffer API 2026-07-28. Two ids were stale.
const BUFFER_ORG = '68d0ae8232af2ad45b4fc1c6';
const BUFFER_CHANNELS = {
  linkedin: '69e58e43031bfa423c20f0bf',
  facebook: '69f5f7a55c4c051afa024938',
  instagram: '69f5f6ca5c4c051afa0243e0',
};

/** channel -> { platform, dayOffset from the Thursday anchor, hour, minute } */
const LADDER = {
  site_plan:    { platform: 'github',    day: 0, hour: 6,  minute: 0 },
  site_article: { platform: 'github',    day: 0, hour: 6,  minute: 0 },
  site_links:   { platform: 'github',    day: 0, hour: 6,  minute: 0 },
  email:        { platform: 'mailchimp', day: 0, hour: 7,  minute: 0 },
  ig_carousel:  { platform: 'buffer',    day: 0, hour: 18, minute: 0, buffer: 'instagram' },
  facebook:     { platform: 'buffer',    day: 1, hour: 8,  minute: 0, buffer: 'facebook' },
  ig_story:     { platform: 'buffer',    day: 2, hour: 9,  minute: 0, buffer: 'instagram' },
  opinion_card: { platform: 'buffer',    day: 4, hour: 8,  minute: 0, buffer: 'instagram' },
  linkedin:     { platform: 'buffer',    day: 4, hour: 8,  minute: 0, buffer: 'linkedin' },
};

/** Next Thursday at or after `from`, in AEST (+10:00). */
function anchorThursday(fromStr) {
  const base = fromStr ? new Date(`${fromStr}T00:00:00+10:00`) : new Date();
  const d = new Date(base);
  const day = d.getUTCDay();
  // Thursday = 4. Walk forward to the next Thursday (today counts).
  const delta = (4 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function slotFor(anchor, spec) {
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() + spec.day);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(spec.hour).padStart(2, '0');
  const mm = String(spec.minute).padStart(2, '0');
  // AEST is UTC+10 year round for scheduling purposes here; Buffer stores UTC.
  return new Date(`${y}-${m}-${dd}T${hh}:${mm}:00+10:00`);
}

async function bufferPost({ text, channelId, dueAt, platform }) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error('BUFFER_API_KEY is not set');
  const meta = platform === 'facebook'
    ? ', metadata: { facebook: { type: post } }'
    : platform === 'instagram'
      ? ', metadata: { instagram: { type: post, shouldShareToFeed: true } }'
      : '';
  const mutation =
    `mutation { createPost(input: { text: ${JSON.stringify(text)}, channelId: "${channelId}", ` +
    `schedulingType: automatic, dueAt: "${dueAt}", mode: customScheduled${meta} }) ` +
    `{ ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }`;
  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: mutation }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await res.json();
  const post = j?.data?.createPost?.post;
  const err = j?.data?.createPost?.message || j?.errors?.[0]?.message;
  if (!post?.id) throw new Error(err || `unexpected Buffer response: ${JSON.stringify(j).slice(0, 300)}`);
  return post;
}

async function main() {
  const log = new RunLog('campaign-schedule', { jobSource: 'manual' });
  if (!hasDb()) {
    await log.stage('load', { status: 'failed', errorCode: 'NO_DB' });
    process.exit(2);
  }

  let t0 = new Date();
  const [campaign] = await select(`pi_campaigns?select=*&campaign_key=eq.${encodeURIComponent(KEY)}`);
  if (!campaign) {
    await log.stage('load', { status: 'failed', startedAt: t0, errorCode: 'CAMPAIGN_NOT_FOUND', errorDetail: KEY });
    process.exit(1);
  }
  log.campaignId = campaign.id;
  log.correlationId = campaign.correlation_id;
  const assets = await select(`pi_campaign_assets?select=*&campaign_id=eq.${campaign.id}`);
  await log.stage('load', { startedAt: t0, outputs: { state: campaign.state, assets: assets.length } });

  // ── Release gate ─────────────────────────────────────────────────────────
  t0 = new Date();
  const l3 = assets.filter((a) => a.approval_level === 'L3');
  const l3NotReady = l3.filter((a) => a.state !== 'ready');
  const thesisSigned = Boolean(campaign.thesis_approved_by);
  const blockers = [];
  if (!thesisSigned) blockers.push('thesis is not signed');
  if (l3NotReady.length) blockers.push(`${l3NotReady.length} L3 asset(s) not ready: ${l3NotReady.map((a) => a.channel).join(', ')}`);

  if (SUBMIT && blockers.length) {
    await log.stage('release-gate', {
      status: 'blocked', startedAt: t0,
      errorCode: 'RELEASE_GATE_BLOCKED', errorDetail: blockers.join('; '),
      escalatedTo: 'james',
    });
    console.error(`\nRefusing to submit. ${blockers.join('. ')}.`);
    console.error('Queueing is still available without --submit.\n');
    process.exit(1);
  }
  await log.stage('release-gate', {
    startedAt: t0,
    status: blockers.length ? 'degraded' : 'ok',
    outputs: { submit: SUBMIT, thesis_signed: thesisSigned },
    degradations: blockers.length ? [`queue only: ${blockers.join('; ')}`] : [],
  });

  // ── Queue ────────────────────────────────────────────────────────────────
  const anchor = anchorThursday(FROM);
  const existing = await select(
    `pi_publications?select=id,campaign_asset_id,state&campaign_asset_id=in.(${assets.map((a) => a.id).join(',')})`
  );
  const queuedFor = new Set((existing ?? []).map((p) => p.campaign_asset_id));

  const queued = [];
  for (const asset of assets) {
    const spec = LADDER[asset.channel];
    if (!spec) continue;
    if (asset.state !== 'ready') continue;
    if (queuedFor.has(asset.id)) continue;
    const when = slotFor(anchor, spec);
    const [row] = await insert('pi_publications', [{
      campaign_asset_id: asset.id,
      platform: spec.platform,
      scheduled_for: when.toISOString(),
      state: 'queued',
    }]);
    await patch(`pi_campaign_assets?id=eq.${asset.id}`, { state: 'scheduled', scheduled_for: when.toISOString() });
    queued.push({ asset, publication: row, when, spec });
  }

  await log.stage('queue', {
    mutation: 'mutating-content',
    outputs: {
      queued: queued.length,
      already_queued: assets.filter((a) => queuedFor.has(a.id)).length,
      not_ready: assets.filter((a) => a.state !== 'ready' && LADDER[a.channel]).map((a) => a.channel),
    },
  });

  // ── Submit ───────────────────────────────────────────────────────────────
  if (!SUBMIT) {
    console.log('\nQueued only. Nothing was sent to a live channel.');
    console.log('Re-run with --submit once the thesis is signed and the L3 assets are approved.\n');
  } else {
    for (const q of queued.filter((x) => x.spec.platform === 'buffer')) {
      const t = new Date();
      const channelId = BUFFER_CHANNELS[q.spec.buffer];
      try {
        const post = await bufferPost({
          text: q.asset.body_md,
          channelId,
          dueAt: q.when.toISOString(),
          platform: q.spec.buffer,
        });
        await patch(`pi_publications?id=eq.${q.publication.id}`, {
          state: 'submitted', submitted_at: new Date().toISOString(), external_id: post.id,
          attempt_count: 1,
        });
        await patch(`pi_campaign_assets?id=eq.${q.asset.id}`, { platform_post_id: post.id });
        await log.stage(`submit:${q.asset.channel}`, {
          startedAt: t, mutation: 'mutating-live',
          outputs: { post_id: post.id, due_at: post.dueAt },
        });
      } catch (err) {
        await patch(`pi_publications?id=eq.${q.publication.id}`, {
          state: 'failed', last_error: String(err.message).slice(0, 500), attempt_count: 1,
        });
        // One sibling failing must not cancel the others.
        await log.stage(`submit:${q.asset.channel}`, {
          startedAt: t, status: 'failed', mutation: 'mutating-live',
          errorCode: 'SUBMIT_FAILED', errorDetail: err.message,
        });
      }
    }
  }

  // ── Report ───────────────────────────────────────────────────────────────
  console.log(`\ncampaign: ${KEY}`);
  console.log(`anchor:   ${anchor.toISOString().slice(0, 10)} (Thursday)`);
  console.log('');
  for (const q of queued.sort((a, b) => a.when - b.when)) {
    const local = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(q.when);
    console.log(`  ${local.padEnd(14)} ${q.spec.platform.padEnd(10)} ${q.asset.channel}`);
  }
  if (!queued.length) console.log('  nothing newly queued');
  const s = log.summary();
  console.log(`\nstages: ${s.stages} (${JSON.stringify(s.counts)})\n`);
}

main().catch((err) => {
  console.error(`[campaign-schedule] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
