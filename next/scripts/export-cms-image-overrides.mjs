#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoNext = path.resolve(__dirname, '..');
const outputPath = path.join(repoNext, 'src', 'data', 'cms-image-overrides.json');

const supabaseUrl =
  process.env.PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://tjjhpvslpysfklwpqmgz.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  db: { schema: 'pi' },
});

const pageSize = 1000;
let from = 0;
const rows = [];

while (true) {
  const to = from + pageSize - 1;
  const { data, error } = await client
    .from('cms_image_slots')
    .select(
      'entity_type, entity_slug, field_path, public_url, storage_path, alt_text, caption, credit, updated_at',
    )
    .eq('status', 'published')
    .order('entity_type', { ascending: true })
    .order('entity_slug', { ascending: true })
    .order('field_path', { ascending: true })
    .range(from, to);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  rows.push(...(data ?? []));
  if (!data || data.length < pageSize) break;
  from += pageSize;
}

const images = {};
for (const row of rows) {
  const src = row.public_url || row.storage_path;
  if (!src) continue;
  const entityKey = `${row.entity_type}/${row.entity_slug}`;
  images[entityKey] ??= {};
  images[entityKey][row.field_path] = {
    src,
    alt: row.alt_text ?? null,
    caption: row.caption ?? null,
    credit: row.credit ?? null,
    storagePath: row.storage_path ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'pi.cms_image_slots',
  imageCount: Object.values(images).reduce((count, slots) => count + Object.keys(slots).length, 0),
  entityCount: Object.keys(images).length,
  images,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${payload.imageCount} image override(s) for ${payload.entityCount} entity/entities to ${outputPath}`);
