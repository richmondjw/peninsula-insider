/**
 * Generic CMS-override loader for the inline-editing system.
 *
 * Any component can self-load its overrides:
 *
 *   const o = await loadOverrides('page', 'home');
 *   const eyebrow = o.text['weekend.eyebrow'] ?? 'Default eyebrow';
 *   const hero = o.image['cover.image'];
 *
 * Reads use the public anon key, gated server-side by the
 * `cms_*_public_read_published` RLS policies in
 * `ops/migrations/2026-05-10-pi-cms-public-read.sql`. Returns an empty
 * record when Supabase is unconfigured or no published rows exist.
 *
 * In-memory cache keyed by `${entityType}/${entitySlug}` so multiple
 * components on a page reading the same entity share one request.
 */

import { createCmsAnonClient } from '../cms/server';

export type CmsEntityType =
  | 'article'
  | 'page'
  | 'event'
  | 'place'
  | 'venue'
  | 'experience'
  | 'itinerary'
  | 'tour'
  | 'tour-operator'
  | 'tour-package';

export interface CmsOverrideImage {
  src: string;
  alt: string | null;
  caption: string | null;
  credit: string | null;
  storagePath: string | null;
}

export interface CmsOverrides {
  text: Record<string, string>;
  image: Record<string, CmsOverrideImage>;
}

const EMPTY: CmsOverrides = { text: {}, image: {} };
const cache = new Map<string, Promise<CmsOverrides>>();

export async function loadOverrides(
  entityType: CmsEntityType,
  entitySlug: string,
): Promise<CmsOverrides> {
  const key = `${entityType}/${entitySlug}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = fetchOverrides(entityType, entitySlug);
  cache.set(key, promise);
  return promise;
}

async function fetchOverrides(
  entityType: CmsEntityType,
  entitySlug: string,
): Promise<CmsOverrides> {
  const client = createCmsAnonClient();
  if (!client) return EMPTY;

  try {
    const [textResp, imageResp] = await Promise.all([
      client
        .from('cms_text_fields')
        .select('field_path, value')
        .eq('entity_type', entityType)
        .eq('entity_slug', entitySlug)
        .eq('status', 'published'),
      client
        .from('cms_image_slots')
        .select('field_path, public_url, storage_path, alt_text, caption, credit')
        .eq('entity_type', entityType)
        .eq('entity_slug', entitySlug)
        .eq('status', 'published'),
    ]);

    const text: Record<string, string> = {};
    for (const row of (textResp.data as Array<{ field_path: string; value: string | null }> | null) ?? []) {
      if (row.value && row.value.length > 0) text[row.field_path] = row.value;
    }

    const image: Record<string, CmsOverrideImage> = {};
    type ImageRow = {
      field_path: string;
      public_url: string | null;
      storage_path: string | null;
      alt_text: string | null;
      caption: string | null;
      credit: string | null;
    };
    for (const row of (imageResp.data as ImageRow[] | null) ?? []) {
      const src = row.public_url ?? row.storage_path;
      if (!src) continue;
      image[row.field_path] = {
        src,
        alt: row.alt_text,
        caption: row.caption,
        credit: row.credit,
        storagePath: row.storage_path,
      };
    }

    return { text, image };
  } catch {
    return EMPTY;
  }
}
