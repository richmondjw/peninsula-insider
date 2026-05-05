#!/usr/bin/env node
/**
 * export-local-secrets.mjs — Phase 4 WS4D pipeline.
 *
 * Pulls submissions with status='approved' from the Supabase
 * pi.submissions table and writes one markdown file per submission to
 * next/src/content/local-secrets/<slug>.md. Marks the source row as
 * status='published' so it isn't exported twice.
 *
 * Usage:
 *   PUBLIC_SUPABASE_ANON_KEY=... node next/scripts/export-local-secrets.mjs
 *
 * Editorial workflow for v1:
 *   1. Reader submits via /submit/ → row lands with status='pending'.
 *   2. Editor reviews in Supabase Studio. Approves by setting
 *      status='approved' and (optionally) writes editor_notes,
 *      published_slug.
 *   3. This script runs (manually or via a deploy hook), exports the
 *      markdown, sets status='published'.
 *   4. Next site build picks up the new markdown file and the secret
 *      goes live at /journal/local-secrets/<slug>/.
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content', 'local-secrets');

const SUPABASE_URL =
  process.env.PUBLIC_SUPABASE_URL || 'https://tjjhpvslpysfklwpqmgz.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('[export] No SUPABASE_SERVICE_KEY (or PUBLIC_SUPABASE_ANON_KEY) in env. Aborting.');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'pi' },
});

function slugify(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function escapeYamlString(s) {
  if (s == null) return '""';
  const v = String(s).replace(/"/g, '\\"');
  return `"${v}"`;
}

async function main() {
  const { data: rows, error } = await client
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[export] Failed to load approved submissions:', error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log('[export] No approved submissions to export.');
    return;
  }

  await mkdir(CONTENT_DIR, { recursive: true });

  let exported = 0;
  for (const row of rows) {
    const slug = row.published_slug?.trim() || slugify(row.title);
    if (!slug) {
      console.warn('[export] skipping row', row.id, '(no slug)');
      continue;
    }
    const submittedAt = new Date(row.created_at).toISOString().slice(0, 10);
    const publishedAt = new Date().toISOString().slice(0, 10);
    const heroBlock = (row.photo_urls && row.photo_urls.length > 0)
      ? `heroImage:\n  src: "${row.photo_urls[0]}"\n  alt: ${escapeYamlString(row.title)}\n  credit: ${escapeYamlString(row.submitter_name)}\n  license: other-licensed\n`
      : '';
    const frontmatter = ''
      + '---\n'
      + `title: ${escapeYamlString(row.title)}\n`
      + 'contributor:\n'
      + `  name: ${escapeYamlString(row.submitter_name)}\n`
      + (row.submitter_handle ? `  handle: ${escapeYamlString(row.submitter_handle)}\n` : '')
      + (row.place_name ? `placeName: ${escapeYamlString(row.place_name)}\n` : '')
      + `category: ${row.category}\n`
      + `submittedAt: ${submittedAt}\n`
      + `publishedAt: ${publishedAt}\n`
      + (row.editor_notes ? `editorNote: ${escapeYamlString(row.editor_notes)}\n` : '')
      + heroBlock
      + '---\n\n';
    const body = String(row.body ?? '').trim() + '\n';
    const filePath = join(CONTENT_DIR, `${slug}.md`);
    await writeFile(filePath, frontmatter + body, 'utf-8');

    const { error: updErr } = await client
      .from('submissions')
      .update({
        status: 'published',
        published_slug: slug,
        decision_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (updErr) {
      console.warn('[export] wrote file but failed to mark published for row', row.id, ':', updErr.message);
    }
    exported++;
    console.log(`[export] wrote ${slug}.md (from submission ${row.id})`);
  }

  console.log(`[export] done. ${exported} file(s) written.`);
}

main().catch((err) => {
  console.error('[export] fatal:', err);
  process.exit(1);
});
