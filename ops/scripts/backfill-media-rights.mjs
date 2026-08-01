#!/usr/bin/env node
/**
 * backfill-media-rights.mjs
 *
 * Populates pi_media_assets from the existing content layer, then writes a
 * media debt report.
 *
 * Why this exists
 * ---------------
 * The content schema records src / alt / credit / license and nothing else.
 * There is no expiry, no permitted-channels, no derivative-works flag, and no
 * generation provenance, so no machine can answer "may I put this in a Reel?".
 * Until it can, automated media production is unsafe.
 *
 * Policy applied here (conservative by default — an asset earns channels, it
 * is never granted them by omission):
 *
 *   original-commissioned / credit "jem"  all channels, derivatives OK, approved
 *   venue-media-kit                       site + organic social, no derivatives,
 *                                         no paid use, pending
 *   visit-victoria                        site + organic social, no derivatives
 *   wikimedia-cc0                         all channels, derivatives OK, approved
 *   wikimedia-cc-by                       all channels, derivatives OK, attribution
 *   wikimedia-cc-by-sa                    site only — share-alike is a trap for
 *                                         generated video; escalate before wider use
 *   tmp-unsplash / tmp-wikimedia /
 *   tmp-pexels                            SITE ONLY, no derivatives, no paid,
 *                                         pending. These are uncleared.
 *   other-licensed                        site only, pending, needs a human
 *
 * Usage:
 *   node ops/scripts/backfill-media-rights.mjs              # dry run + report
 *   node ops/scripts/backfill-media-rights.mjs --apply      # write to Supabase
 *   node ops/scripts/backfill-media-rights.mjs --report-only
 *
 * Env:
 *   SUPABASE_SERVICE_KEY  required for --apply
 */

import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO = resolve(__dirname, '../..');
const CONTENT = join(REPO, 'next/src/content');
const PUBLIC_IMAGES = join(REPO, 'next/public/images');

const SUPABASE_URL = process.env.PI_SUPABASE_URL || 'https://mvdtkgsfuhmkioygxgge.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REPORT_ONLY = args.includes('--report-only');

const ALL_CHANNELS = [
  'site_plan', 'site_article', 'site_whats_on', 'site_home',
  'email', 'ig_carousel', 'ig_reel', 'ig_story', 'facebook', 'linkedin',
  'video_master', 'video_short', 'thumbnail',
];
const SITE_ONLY = ['site_plan', 'site_article', 'site_whats_on', 'site_home'];
const SITE_AND_ORGANIC = [...SITE_ONLY, 'email', 'ig_carousel', 'ig_story', 'facebook', 'linkedin'];

/** licence -> rights posture. The single source of truth for the rights gate. */
const POLICY = {
  'original-commissioned': {
    channels: ALL_CHANNELS, derivative: true, paid: true, approve: true, attribution: false,
  },
  'wikimedia-cc0': {
    channels: ALL_CHANNELS, derivative: true, paid: true, approve: true, attribution: false,
  },
  'wikimedia-cc-by': {
    channels: ALL_CHANNELS, derivative: true, paid: true, approve: true, attribution: true,
  },
  'wikimedia-cc-by-sa': {
    channels: SITE_ONLY, derivative: false, paid: false, approve: false, attribution: true,
    note: 'Share-alike propagates to derivative works. Escalate before any video or paid use.',
  },
  'venue-media-kit': {
    channels: SITE_AND_ORGANIC, derivative: false, paid: false, approve: false, attribution: false,
    note: 'Supplied for editorial coverage of this venue. Derivative works usually excluded; confirm before animating.',
  },
  'visit-victoria': {
    channels: SITE_AND_ORGANIC, derivative: false, paid: false, approve: false, attribution: true,
    note: 'Tourism board asset. Confirm campaign and paid-use terms before wider use.',
  },
  'tmp-unsplash': {
    channels: SITE_ONLY, derivative: false, paid: false, approve: false, attribution: true,
    note: 'UNCLEARED placeholder. Replace with first-party or clear the licence.',
  },
  'tmp-wikimedia': {
    channels: SITE_ONLY, derivative: false, paid: false, approve: false, attribution: true,
    note: 'UNCLEARED placeholder. Replace with first-party or clear the licence.',
  },
  'tmp-pexels': {
    channels: SITE_ONLY, derivative: false, paid: false, approve: false, attribution: true,
    note: 'UNCLEARED placeholder. Replace with first-party or clear the licence.',
  },
  'other-licensed': {
    channels: SITE_ONLY, derivative: false, paid: false, approve: false, attribution: false,
    note: 'Licence unspecified. Needs a human before any use beyond the website.',
  },
};

const DEFAULT_POLICY = {
  channels: [], derivative: false, paid: false, approve: false, attribution: false,
  note: 'Unrecognised licence value. No channels permitted until reviewed.',
};

const ENTITY_DIRS = {
  venues: 'venue', experiences: 'experience', places: 'place', events: 'event',
  itineraries: 'itinerary', articles: 'article', regions: 'region',
  'signature-events': 'event', tours: 'tour', 'tour-operators': 'tour',
  'tour-packages': 'tour', 'fishing-charters': 'fishing', 'fishing-locations': 'fishing',
  'boat-ramps': 'boating', 'boat-hire': 'boating', species: 'species',
};

// Mood tags that imply an outdoor / weather-exposed subject.
const OUTDOOR_MOODS = new Set(['walk', 'beach', 'outdoor', 'surf', 'garden', 'waterfront', 'golf', 'view', 'sunset', 'rooftop']);

function slugifyPath(p) {
  return p.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').toLowerCase();
}

function inferOrientation(src) {
  // Filename conventions in this repo do not encode dimensions; without an
  // image library we cannot measure. Leave null rather than guess wrong —
  // a wrong orientation would silently mis-route an asset to the wrong channel.
  return null;
}

function inferShotType(subject, entityType) {
  const s = (subject || '').toLowerCase();
  if (entityType === 'region' || entityType === 'place') return 'establishing';
  if (/\b(map|route)\b/.test(s)) return 'map';
  if (/\b(dish|plate|food|lunch|dinner)\b/.test(s)) return 'food';
  if (/\b(interior|room|dining)\b/.test(s)) return 'interior';
  if (/\b(coast|beach|cliff|bay|landscape|vineyard)\b/.test(s)) return 'wide';
  return null;
}

async function walkJson(dir) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walkJson(full));
    else if (e.name.endsWith('.json') && !e.name.startsWith('_')) out.push(full);
  }
  return out;
}

/** Pull every imageRef out of one content record. */
function extractImages(record, entityType, entitySlug) {
  const found = [];
  const push = (img, role) => {
    if (img && typeof img === 'object' && typeof img.src === 'string' && img.src) {
      found.push({ ...img, role, entityType, entitySlug });
    }
  };
  push(record.heroImage, 'hero');
  push(record.image, 'image');
  push(record.photo, 'photo');
  for (const g of record.gallery ?? []) push(g, 'gallery');
  return found;
}

async function main() {
  // ── Gather every declared image reference across the content layer ────────
  const declared = new Map(); // src -> record
  const mismatches = [];
  let recordCount = 0;

  for (const [dir, entityType] of Object.entries(ENTITY_DIRS)) {
    const files = await walkJson(join(CONTENT, dir));
    for (const f of files) {
      let rec;
      try { rec = JSON.parse(await readFile(f, 'utf8')); } catch { continue; }
      recordCount += 1;
      const slug = rec.slug || f.split(/[\\/]/).pop().replace(/\.json$/, '');
      for (const img of extractImages(rec, entityType, slug)) {
        const prev = declared.get(img.src);
        if (prev && prev.license !== img.license) {
          mismatches.push({
            src: img.src, kind: 'licence-conflict',
            detail: `declared as "${prev.license}" on ${prev.entitySlug} and "${img.license}" on ${img.entitySlug}`,
          });
        }
        // credit/licence disagreement: claiming PI authorship on a third-party licence
        const credit = (img.credit || '').trim();
        const lic = img.license || 'venue-media-kit';
        const claimsOwn = /^(jem|peninsula insider)$/i.test(credit);
        if (claimsOwn && !['original-commissioned'].includes(lic)) {
          mismatches.push({
            src: img.src, kind: 'credit-licence-mismatch',
            detail: `credit "${credit}" claims PI authorship but licence is "${lic}" (${img.entityType}/${img.entitySlug})`,
          });
        }
        if (!prev) declared.set(img.src, { ...img, license: lic, usedBy: [img.entitySlug] });
        else prev.usedBy.push(img.entitySlug);
      }
    }
  }

  // ── Also inventory files on disk that nothing references ──────────────────
  const onDisk = new Set();
  async function walkFiles(dir) {
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walkFiles(full);
      else if (['.webp', '.jpg', '.jpeg', '.png', '.avif', '.svg'].includes(extname(e.name).toLowerCase())) {
        onDisk.add('/' + relative(join(REPO, 'next/public'), full).replace(/\\/g, '/'));
      }
    }
  }
  await walkFiles(PUBLIC_IMAGES);

  const orphans = [...onDisk].filter((p) => !declared.has(p));
  const missingFiles = [...declared.keys()].filter((p) => !onDisk.has(p) && !p.startsWith('http'));

  // ── Build rows ────────────────────────────────────────────────────────────
  const rows = [];
  for (const [src, img] of declared) {
    const lic = img.license;
    const policy = POLICY[lic] ?? DEFAULT_POLICY;
    const creditIsJem = /^jem$/i.test((img.credit || '').trim());
    // The "jem" sentinel means James and Emma shot it: treat as first-party
    // regardless of what the licence field says, but flag the disagreement.
    const effective = creditIsJem ? POLICY['original-commissioned'] : policy;
    const isPlaceholder = /placeholder/i.test(src) || src.endsWith('.svg');

    rows.push({
      asset_key: slugifyPath(src).slice(0, 180),
      storage_path: src,
      public_url: `https://peninsulainsider.com.au${src}`,
      content_hash: createHash('sha256').update(src).digest('hex').slice(0, 32),
      subject: img.alt || null,
      entity_slug: img.entitySlug || null,
      season: null,
      weather: null,
      time_of_day: null,
      orientation: inferOrientation(src),
      shot_type: isPlaceholder ? 'graphic' : inferShotType(img.alt, img.entityType),
      people_present: false,
      people_released: false,
      visible_branding: [],
      rights_owner: creditIsJem ? 'James and Emma Richmond' : (img.credit || null),
      licence: creditIsJem ? 'original-commissioned' : lic,
      licence_ref: null,
      attribution_text: effective.attribution ? (img.credit || null) : null,
      attribution_required: !!effective.attribution,
      derivative_works_ok: isPlaceholder ? false : effective.derivative,
      // A placeholder graphic must never reach a channel.
      permitted_channels: isPlaceholder ? [] : effective.channels,
      paid_use_ok: isPlaceholder ? false : effective.paid,
      approval_status: isPlaceholder ? 'quarantined' : (effective.approve ? 'approved' : 'pending'),
      approved_by: effective.approve && !isPlaceholder ? 'backfill-policy-2026-07-28' : null,
      approved_at: effective.approve && !isPlaceholder ? new Date().toISOString() : null,
      quality_notes: isPlaceholder
        ? 'Placeholder graphic. Quarantined: not a usable asset.'
        : (effective.note ?? null),
    });
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const byLicence = {};
  for (const r of rows) byLicence[r.licence] = (byLicence[r.licence] ?? 0) + 1;
  const uncleared = rows.filter((r) => r.permitted_channels.length === 0);
  const siteOnly = rows.filter((r) => r.permitted_channels.length && !r.permitted_channels.includes('ig_reel'));
  const socialOk = rows.filter((r) => r.permitted_channels.includes('ig_reel'));
  const derivOk = rows.filter((r) => r.derivative_works_ok);

  const lines = [];
  lines.push('# Peninsula Insider — Media Debt Report');
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Source:** ${recordCount} content records, ${declared.size} distinct referenced images, ${onDisk.size} files on disk`);
  lines.push('');
  lines.push('This report answers one question the content schema currently cannot:');
  lines.push('**which images may legally leave the website?**');
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`| Measure | Count | Share |`);
  lines.push(`|---|---:|---:|`);
  const pct = (n) => `${((n / Math.max(1, rows.length)) * 100).toFixed(0)}%`;
  lines.push(`| Total referenced assets | ${rows.length} | 100% |`);
  lines.push(`| Cleared for social video (ig_reel) | ${socialOk.length} | ${pct(socialOk.length)} |`);
  lines.push(`| Cleared for derivative works (crop / animate) | ${derivOk.length} | ${pct(derivOk.length)} |`);
  lines.push(`| Restricted to the website | ${siteOnly.length} | ${pct(siteOnly.length)} |`);
  lines.push(`| No permitted channel at all | ${uncleared.length} | ${pct(uncleared.length)} |`);
  lines.push('');
  lines.push('## By licence');
  lines.push('');
  lines.push('| Licence | Assets | Posture |');
  lines.push('|---|---:|---|');
  for (const [lic, n] of Object.entries(byLicence).sort((a, b) => b[1] - a[1])) {
    const p = POLICY[lic] ?? DEFAULT_POLICY;
    const posture = p.channels.length === 0 ? 'no channels'
      : p.channels.includes('ig_reel') ? 'all channels'
        : p.channels.includes('facebook') ? 'site + organic social'
          : 'site only';
    lines.push(`| \`${lic}\` | ${n} | ${posture}${p.derivative ? ', derivatives OK' : ', no derivatives'} |`);
  }
  lines.push('');

  if (mismatches.length) {
    lines.push('## Rights integrity problems');
    lines.push('');
    lines.push('These block automated media production until resolved.');
    lines.push('');
    lines.push('| Kind | Asset | Detail |');
    lines.push('|---|---|---|');
    for (const m of mismatches.slice(0, 60)) {
      lines.push(`| ${m.kind} | \`${m.src}\` | ${m.detail} |`);
    }
    if (mismatches.length > 60) lines.push(`| ... | | ${mismatches.length - 60} more |`);
    lines.push('');
  }

  if (missingFiles.length) {
    lines.push('## Referenced but missing from disk');
    lines.push('');
    for (const p of missingFiles.slice(0, 40)) lines.push(`- \`${p}\``);
    if (missingFiles.length > 40) lines.push(`- ... ${missingFiles.length - 40} more`);
    lines.push('');
  }

  lines.push('## Orphans (on disk, referenced by nothing)');
  lines.push('');
  lines.push(`${orphans.length} files. These are candidates for deletion or for re-use once rights are confirmed.`);
  lines.push('');

  lines.push('## What this means for the content factory');
  lines.push('');
  lines.push(`Media readiness is the binding constraint on the derivative engine. With ${socialOk.length} of ${rows.length} assets cleared for social video, the fallback ladder (brand graphic, then typographic card) will carry most campaigns until first-party photography closes the gap.`);
  lines.push('');
  lines.push('The rights gate is enforced in the database: `pi_media_assets.permitted_channels` must contain the target channel, and `derivative_works_ok` must be true before any crop, reframe, or image-to-video. Neither can be bypassed by an agent.');
  lines.push('');

  const reportPath = join(REPO, `ops/reports/media-debt-${new Date().toISOString().slice(0, 10)}.md`);
  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`[media-rights] report -> ${relative(REPO, reportPath)}`);
  console.log(`[media-rights] ${rows.length} assets | ${socialOk.length} social-cleared | ${uncleared.length} no-channel | ${mismatches.length} integrity problems`);

  if (REPORT_ONLY) return;

  if (!APPLY) {
    console.log('[media-rights] dry run. Re-run with --apply to write to Supabase.');
    return;
  }
  if (!SUPABASE_KEY) {
    console.error('[media-rights] --apply needs SUPABASE_SERVICE_KEY.');
    process.exit(2);
  }

  // ── Upsert in batches ─────────────────────────────────────────────────────
  let written = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/pi_media_assets?on_conflict=asset_key`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(60000),
      }
    );
    if (!res.ok) {
      console.error(`[media-rights] batch ${i} failed: HTTP ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    written += batch.length;
    console.log(`[media-rights] upserted ${written}/${rows.length}`);
  }
  console.log('[media-rights] done.');
}

main().catch((err) => {
  console.error(`[media-rights] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
