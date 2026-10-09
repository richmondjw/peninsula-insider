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
import { imagePresentationText } from '../image-presentation.mjs';
import bakedImageOverrides from '../../data/cms-image-overrides.json';
import imageQuarantine from '../../data/cms-image-quarantine.json';

export type CmsEntityType =
  | 'article'
  | 'page'
  | 'event'
  | 'place'
  | 'region'
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
const SKIP_LIVE_READS = process.env.PI_SKIP_CMS_LIVE_READS === '1';

// Exact published uploads held after image-subject and rights review.
// A future upload has a different storage path and remains eligible.
function isQuarantined(key: string, fieldPath: string, storagePath: string | null | undefined, src: string): boolean {
  return imageQuarantine.quarantined.some((entry) =>
    entry.key === key &&
    entry.fieldPath === fieldPath &&
    (entry.storagePath === storagePath || src.endsWith('/' + entry.storagePath))
  );
}

type BakedImageSlot = {
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  credit?: string | null;
  storagePath?: string | null;
};

type BakedImageOverrides = {
  images?: Record<string, Record<string, BakedImageSlot>>;
};

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

/**
 * House-style guard at the render boundary. CMS rows are written by
 * editors (and predate some style rules), so em-dashes typed into the
 * database would otherwise bypass the editorial linters and land in the
 * built HTML. Normalise them here, per the BRAND-PI punctuation rule.
 */
function houseStyle(value: string): string {
  return value.replace(/\s*—\s*/g, ' - ');
}

async function fetchOverrides(
  entityType: CmsEntityType,
  entitySlug: string,
): Promise<CmsOverrides> {
  const baked = loadBakedImages(entityType, entitySlug);
  const key = `${entityType}/${entitySlug}`;
  // Deterministic local/CI verification can opt into the checked-in snapshot.
  // Production builds leave this unset and continue to fetch published rows.
  if (SKIP_LIVE_READS) return { text: {}, image: baked };
  const client = createCmsAnonClient();
  if (!client) return { text: {}, image: baked };

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
      if (row.value && row.value.length > 0) text[row.field_path] = houseStyle(row.value);
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
      if (isQuarantined(key, row.field_path, row.storage_path, src)) continue;
      image[row.field_path] = {
        src,
        alt: row.alt_text ? imagePresentationText(houseStyle(row.alt_text)) : row.alt_text,
        caption: row.caption ? imagePresentationText(houseStyle(row.caption)) : row.caption,
        credit: row.credit ? imagePresentationText(houseStyle(row.credit)) : row.credit,
        storagePath: row.storage_path,
      };
    }

    return { text, image: { ...baked, ...image } };
  } catch {
    return { text: {}, image: baked };
  }
}

function loadBakedImages(entityType: CmsEntityType, entitySlug: string): Record<string, CmsOverrideImage> {
  const key = `${entityType}/${entitySlug}`;
  const source = bakedImageOverrides as BakedImageOverrides;
  const slots = source.images?.[key];
  if (!slots) return {};

  const image: Record<string, CmsOverrideImage> = {};
  for (const [fieldPath, row] of Object.entries(slots)) {
    const src = row.src ?? row.storagePath;
    if (!src) continue;
    if (isQuarantined(key, fieldPath, row.storagePath, src)) continue;
    image[fieldPath] = {
      src,
      alt: imagePresentationText(row.alt ?? null),
      caption: imagePresentationText(row.caption ?? null),
      credit: imagePresentationText(row.credit ?? null),
      storagePath: row.storagePath ?? null,
    };
  }
  return image;
}
