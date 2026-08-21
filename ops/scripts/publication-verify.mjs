#!/usr/bin/env node
/**
 * publication-verify.mjs
 *
 * Checks that everything the factory believes it published is actually live.
 *
 * This exists because "submitted successfully" and "live" are different
 * facts, and the gap between them is the failure nobody notices. A Buffer
 * post can be accepted and then fail at the platform. A site deploy can go
 * green while the route 404s. An email can send to an empty segment. None of
 * those raise an error anywhere.
 *
 * So `verify_failed` is deliberately treated as LOUDER than `failed`:
 * a failed submission is visible, a silently-not-live post is not.
 *
 * Per platform:
 *   github     HTTP 200 on published_url, and the page body mentions the
 *              campaign's UTM or the plan slug (a 200 on a soft-404 shell is
 *              not proof of publication).
 *   buffer     query the post by id; state must be `sent`.
 *   beehiiv    post status must be `confirmed`, with a non-zero recipient count.
 *   manual     never auto-verified; a human marks it.
 *
 * Usage:
 *   node ops/scripts/publication-verify.mjs
 *   node ops/scripts/publication-verify.mjs --campaign CMP-2026-W31-...
 *   node ops/scripts/publication-verify.mjs --dry-run
 *
 * Exit 1 if anything is unverified past its grace window, so the daily health
 * job alerts rather than a human remembering to look.
 *
 * Env: SUPABASE_SERVICE_KEY, BUFFER_API_KEY, BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID
 */

import { RunLog, hasDb, select, patch } from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const ONLY = val('--campaign');
const DRY = args.includes('--dry-run');

/** How long after the scheduled time we wait before calling it a problem. */
const GRACE_MINUTES = 30;

async function verifyGithub(pub, asset, campaign) {
  const url = asset.published_url || asset.cta_url;
  if (!url) return { ok: false, note: 'no published_url or cta_url to check' };
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { ok: false, note: `HTTP ${res.status}` };
    const body = await res.text();
    // A 200 alone is not proof: GitHub Pages serves a styled 404 shell with a
    // 404 status, but SPA fallbacks and stale caches can still 200 on nothing.
    // Require the page to actually mention the plan.
    const marker = campaign.featured_plan_slug;
    if (marker && !body.includes(marker)) {
      return { ok: false, note: `200 but page does not mention "${marker}" (possible stale cache or wrong route)` };
    }
    return { ok: true, note: `200, ${body.length} bytes, mentions ${marker}` };
  } catch (err) {
    return { ok: false, note: `fetch failed: ${err.message}` };
  }
}

async function verifyBuffer(pub) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) return { ok: null, note: 'BUFFER_API_KEY not set; cannot verify' };
  if (!pub.external_id) return { ok: false, note: 'no Buffer post id recorded' };
  try {
    const res = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query: `query { post(input: { id: "${pub.external_id}" }) { id status dueAt } }`,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json();
    const status = j?.data?.post?.status;
    if (!status) return { ok: false, note: `no status returned: ${JSON.stringify(j).slice(0, 200)}` };
    if (status === 'sent') return { ok: true, note: 'buffer reports sent' };
    // Still scheduled is not a failure until its time has passed.
    return { ok: null, note: `buffer status "${status}"` };
  } catch (err) {
    return { ok: false, note: `buffer query failed: ${err.message}` };
  }
}

async function verifyBeehiiv(pub) {
  const key = process.env.BEEHIIV_API_KEY;
  const publication = process.env.BEEHIIV_PUBLICATION_ID;
  if (!key || !publication) return { ok: null, note: 'beehiiv credentials not set; cannot verify' };
  if (!pub.external_id) return { ok: false, note: 'no beehiiv post id recorded' };
  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publication}/posts/${pub.external_id}?expand[]=stats`,
      { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { ok: false, note: `HTTP ${res.status}` };
    const j = await res.json();
    const status = j?.data?.status;
    if (status !== 'confirmed' && status !== 'archived') return { ok: null, note: `beehiiv status "${status}"` };
    const recipients = j?.data?.stats?.email?.recipients ?? 0;
    // Sent to nobody is a successful send and a failed publication.
    if (!recipients) return { ok: false, note: 'sent to 0 recipients' };
    return { ok: true, note: `confirmed, ${recipients} recipients` };
  } catch (err) {
    return { ok: false, note: `beehiiv query failed: ${err.message}` };
  }
}

async function main() {
  const log = new RunLog('publication-verify', { jobSource: 'manual' });
  if (!hasDb()) {
    await log.stage('load', { status: 'failed', errorCode: 'NO_DB' });
    process.exit(2);
  }

  let t0 = new Date();
  // Anything submitted or claimed-published but not yet verified.
  const pubs = await select(
    'pi_publications?select=*&state=in.(submitted,published)&verified_at=is.null&order=scheduled_for.asc&limit=200'
  );
  if (!pubs?.length) {
    await log.stage('load', { startedAt: t0, outputs: { pending: 0 } });
    console.log('\nNothing awaiting verification.\n');
    return;
  }

  const assetIds = [...new Set(pubs.map((p) => p.campaign_asset_id))];
  const assets = await select(`pi_campaign_assets?select=*&id=in.(${assetIds.join(',')})`);
  const assetById = new Map((assets ?? []).map((a) => [a.id, a]));
  const campaignIds = [...new Set((assets ?? []).map((a) => a.campaign_id))];
  const campaigns = campaignIds.length
    ? await select(`pi_campaigns?select=*&id=in.(${campaignIds.join(',')})`)
    : [];
  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));

  const scoped = ONLY
    ? pubs.filter((p) => campaignById.get(assetById.get(p.campaign_asset_id)?.campaign_id)?.campaign_key === ONLY)
    : pubs;

  await log.stage('load', { startedAt: t0, outputs: { pending: scoped.length } });

  const VERIFIERS = { github: verifyGithub, buffer: verifyBuffer, beehiiv: verifyBeehiiv };
  let problems = 0;
  const results = [];

  for (const pub of scoped) {
    const t = new Date();
    const asset = assetById.get(pub.campaign_asset_id);
    const campaign = asset ? campaignById.get(asset.campaign_id) : null;
    const dueMinutesAgo = (Date.now() - new Date(pub.scheduled_for).getTime()) / 6e4;
    const past = dueMinutesAgo > GRACE_MINUTES;

    if (pub.platform === 'manual') {
      results.push({ pub, asset, verdict: 'manual', note: 'manual platform; a human marks this' });
      await log.stage(`verify:${asset?.channel ?? pub.platform}`, {
        startedAt: t, status: 'skipped', outputs: { reason: 'manual platform' },
      });
      continue;
    }

    const verifier = VERIFIERS[pub.platform];
    const r = verifier ? await verifier(pub, asset, campaign) : { ok: null, note: 'no verifier' };

    let verdict;
    if (r.ok === true) verdict = 'verified';
    else if (r.ok === false && past) verdict = 'verify_failed';
    else if (r.ok === false) verdict = 'pending';
    else verdict = past ? 'unverifiable' : 'pending';

    results.push({ pub, asset, verdict, note: r.note });

    if (!DRY) {
      if (verdict === 'verified') {
        await patch(`pi_publications?id=eq.${pub.id}`, {
          state: 'published', verified_at: new Date().toISOString(), verification_note: r.note,
        });
        if (asset) {
          await patch(`pi_campaign_assets?id=eq.${asset.id}`, {
            state: 'published', published_at: new Date().toISOString(),
          });
        }
      } else if (verdict === 'verify_failed') {
        await patch(`pi_publications?id=eq.${pub.id}`, {
          state: 'verify_failed', verification_note: r.note,
        });
      }
    }

    if (verdict === 'verify_failed' || verdict === 'unverifiable') problems += 1;

    await log.stage(`verify:${asset?.channel ?? pub.platform}`, {
      startedAt: t,
      status: verdict === 'verified' ? 'ok' : verdict === 'pending' ? 'skipped' : 'failed',
      mutation: DRY ? 'report-only' : 'mutating-content',
      outputs: { platform: pub.platform, verdict, note: r.note },
      // A post that submitted and is not live is the quiet failure this whole
      // script exists to make loud.
      errorCode: verdict === 'verify_failed' ? 'PUBLISH_VERIFY_FAILED'
        : verdict === 'unverifiable' ? 'PUBLISH_UNVERIFIABLE' : null,
      errorDetail: verdict === 'verified' ? null : r.note,
      escalatedTo: verdict === 'verify_failed' ? 'james' : null,
    });
  }

  console.log('');
  for (const r of results) {
    console.log(`  ${r.verdict.padEnd(14)} ${String(r.asset?.channel ?? r.pub.platform).padEnd(16)} ${r.note}`);
  }
  const s = log.summary();
  console.log(`\n${results.length} checked, ${problems} problem(s). stages: ${s.stages} ${JSON.stringify(s.counts)}\n`);
  process.exit(problems ? 1 : 0);
}

main().catch((err) => {
  console.error(`[publication-verify] fatal: ${err.stack || err.message}`);
  process.exit(2);
});
