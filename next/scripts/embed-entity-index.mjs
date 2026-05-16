#!/usr/bin/env node
/**
 * embed-entity-index.mjs
 *
 * Phase C embedding population. Backfills the `embedding` column on
 * pi.entity_index using the same OpenAI model the concierge corpus uses
 * (text-embedding-3-small, 1536 dim). No second embedding pipeline.
 *
 * Behaviour
 * ---------
 * - Pulls rows where embedding is null OR the content_hash of title|dek|body
 *   has changed since the last embed.
 * - Embeds in batches (OpenAI accepts arrays). Default batch = 32.
 * - Upserts the row's embedding + a content_hash sidecar column so the next
 *   run can detect drift.
 *
 * Modes
 * -----
 *   --dry-run         (default) Count rows that need embedding. No API calls.
 *   --apply                     Embed and write back to Supabase.
 *   --force                     Re-embed every row even if hash unchanged.
 *   --limit=N                   Cap total rows embedded this run.
 *
 * Env
 * ---
 *   OPENAI_API_KEY              Required when --apply.
 *   SUPABASE_SERVICE_KEY        Required when --apply (write to pi.entity_index).
 *   PUBLIC_SUPABASE_URL         Optional override.
 *   EMBEDDING_MODEL             Default: text-embedding-3-small.
 *
 * Wired into deploy after Phase B is live and SUPABASE_SERVICE_KEY is rotated.
 */

import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const opts = { apply: false, force: false, limit: null };
for (const a of args) {
  if (a === '--apply') opts.apply = true;
  else if (a === '--force') opts.force = true;
  else if (a.startsWith('--limit=')) opts.limit = parseInt(a.slice('--limit='.length), 10);
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'https://tjjhpvslpysfklwpqmgz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const BATCH = 32;

if (!SUPABASE_KEY) {
  console.error('[FATAL] SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

function hashContent(parts) {
  return createHash('sha256').update(parts.filter(Boolean).join('\n\n')).digest('hex');
}

async function fetchPi(path, { method = 'GET', body = null, prefer = null } = {}) {
  const headers = {
    'Content-Type':    'application/json',
    'apikey':          SUPABASE_KEY,
    'Authorization':   `Bearer ${SUPABASE_KEY}`,
    'Accept-Profile':  'pi',
    'Content-Profile': 'pi',
  };
  if (prefer) headers['Prefer'] = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function embed(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

// ─── load candidate rows ─────────────────────────────────────────────────
// Select rows needing embedding. content_hash column (added by this script
// on first apply) lives in entity_index. When the hash differs from the
// hash of title|dek|body, the row is stale.
const select = opts.force
  ? '*'
  : 'entity_type,entity_slug,title,dek,body,content_hash,embedding';

let rows = await fetchPi(`entity_index?select=${select}&order=refreshed_at.desc`);
const needsEmbed = [];
for (const r of rows) {
  const h = hashContent([r.title, r.dek, r.body]);
  const stale = opts.force || r.content_hash !== h || !r.embedding;
  if (stale) needsEmbed.push({ row: r, hash: h });
  if (opts.limit && needsEmbed.length >= opts.limit) break;
}

console.log(`[embed] candidates: ${rows.length}`);
console.log(`[embed] needs embedding: ${needsEmbed.length}`);
console.log(`[embed] model: ${EMBEDDING_MODEL}`);

if (!opts.apply) {
  console.log(`[embed] DRY RUN. Run with --apply (requires OPENAI_API_KEY + SUPABASE_SERVICE_KEY).`);
  process.exit(0);
}
if (!OPENAI_KEY) {
  console.error('[FATAL] --apply requires OPENAI_API_KEY');
  process.exit(1);
}

// ─── batched embed + upsert ──────────────────────────────────────────────
for (let i = 0; i < needsEmbed.length; i += BATCH) {
  const batch = needsEmbed.slice(i, i + BATCH);
  const texts = batch.map(({ row }) =>
    [row.title, row.dek, row.body].filter(Boolean).join('\n\n').slice(0, 8192)
  );
  let vectors;
  try {
    vectors = await embed(texts);
  } catch (err) {
    console.error(`[embed] batch ${i / BATCH + 1} failed: ${err.message}`);
    process.exit(1);
  }
  // Upsert in parallel within the batch.
  await Promise.all(batch.map(async ({ row, hash }, j) => {
    const v = vectors[j];
    if (!v) return;
    const path = `entity_index?entity_type=eq.${encodeURIComponent(row.entity_type)}&entity_slug=eq.${encodeURIComponent(row.entity_slug)}`;
    await fetchPi(path, {
      method: 'PATCH',
      body: { embedding: `[${v.join(',')}]`, content_hash: hash },
      prefer: 'return=minimal',
    });
  }));
  console.log(`[embed] batch ${i / BATCH + 1}/${Math.ceil(needsEmbed.length / BATCH)} done (${batch.length} rows)`);
}

console.log(`[embed] complete. ${needsEmbed.length} rows embedded.`);
