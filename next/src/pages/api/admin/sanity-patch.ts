/**
 * POST /api/admin/sanity-patch
 *
 * Patches a single image field on a Sanity document with a new asset
 * reference. Identification can come from either:
 *
 *   1. `{ docId, fieldPath, newAssetRef }` — when the caller already
 *      resolved the doc id (e.g. via stega decode of the rendered src).
 *
 *   2. `{ entityType, entitySlug, fieldPath, newAssetRef }` — when the
 *      caller has the legacy `data-pi-edit` attribute trio. We resolve
 *      `entityType` to a Sanity `_type` and query by `slug.current`.
 *
 * Response includes the freshly built asset URL so the client can swap
 * the visible image without waiting for a revalidate round-trip.
 */
import type { APIRoute } from 'astro';
import imageUrlBuilder from '@sanity/image-url';
import {
  badRequest,
  forbidden,
  internalError,
  jsonResponse,
  resolveCmsAccess,
  unauthorized,
} from '../../../lib/cms/server';
import { entityTypeToSanityType, getSanityWriteClient } from '../../../lib/sanity/write-client';
import { routesForDocument, triggerRevalidate } from '../../../lib/sanity/revalidate-paths';
import { upsertImageSlot } from '../../../lib/cms/api';

export const prerender = false;
export async function getStaticPaths() {
  return [];
}

const localPlaceModules = import.meta.glob('../../../content/places/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, LocalPlaceJson>;

interface PatchBody {
  docId?: string;
  entityType?: string;
  entitySlug?: string;
  fieldPath?: string;
  newAssetRef?: string;
}

interface LocalPlaceJson {
  slug?: string;
  name?: string;
  kind?: string;
  zone?: string;
  coordinates?: { lat?: number; lng?: number };
  factualLede?: string;
  intro?: string;
  signature?: string;
  insiderNote?: string;
  tldr?: string[];
  bestFor?: string[];
  notFor?: string[];
  bestSeason?: string;
  worstTime?: string;
  stayDuration?: string;
  bestDay?: string;
  skip?: string;
  driveTime?: string;
  featured?: boolean;
  publishedAt?: string;
  sitemapExclude?: boolean;
  heroImage?: {
    alt?: string;
    credit?: string;
    license?: string;
    caption?: string;
  };
  relatedPlaces?: Array<string | { id?: string; slug?: string }>;
}

function localPlaceForSlug(slug: string): LocalPlaceJson | null {
  const match = Object.entries(localPlaceModules).find(([path, data]) =>
    path.endsWith(`/${slug}.json`) || data.slug === slug,
  );
  return match?.[1] ?? null;
}

function compactRecord<T extends Record<string, unknown>>(doc: T): T {
  for (const key of Object.keys(doc)) {
    if (doc[key] === undefined || doc[key] === null) delete doc[key];
  }
  return doc;
}

async function createPlaceFromLocalJson(
  client: ReturnType<typeof getSanityWriteClient>,
  slug: string,
  newAssetRef: string,
): Promise<{ _id: string } | null> {
  if (!client) return null;
  const raw = localPlaceForSlug(slug);
  if (!raw?.slug || !raw.name || !raw.intro || !raw.kind || !raw.zone) return null;

  const relatedPlaces = (raw.relatedPlaces ?? [])
    .map((entry) => (typeof entry === 'string' ? entry : entry.id ?? entry.slug))
    .filter((s): s is string => Boolean(s))
    .map((s) => ({
      _type: 'reference',
      _key: s,
      _ref: `place-${s}`,
      _weak: true,
    }));

  const doc = compactRecord({
    _id: `place-${slug}`,
    _type: 'place',
    name: raw.name,
    slug: { _type: 'slug', current: raw.slug },
    kind: raw.kind,
    zone: raw.zone,
    coordinates: raw.coordinates,
    factualLede: raw.factualLede,
    intro: raw.intro,
    signature: raw.signature,
    insiderNote: raw.insiderNote,
    tldr: raw.tldr,
    bestFor: raw.bestFor,
    notFor: raw.notFor,
    bestSeason: raw.bestSeason,
    worstTime: raw.worstTime,
    stayDuration: raw.stayDuration,
    bestDay: raw.bestDay,
    skip: raw.skip,
    driveTime: raw.driveTime,
    featured: !!raw.featured,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : new Date().toISOString(),
    sitemapExclude: !!raw.sitemapExclude,
    relatedPlaces: relatedPlaces.length > 0 ? relatedPlaces : undefined,
    heroImage: {
      _type: 'imageRef',
      asset: { _type: 'reference', _ref: newAssetRef },
      alt: raw.heroImage?.alt ?? raw.name,
      credit: raw.heroImage?.credit ?? 'Peninsula Insider',
      license: raw.heroImage?.license ?? 'venue-media-kit',
      caption: raw.heroImage?.caption,
    },
  });

  await client.createOrReplace(doc);
  return { _id: `place-${slug}` };
}

function pageHeroSlugFromId(docId: string): string | null {
  if (!docId.startsWith('pageHero-')) return null;
  const slug = docId.slice('pageHero-'.length).replace(/--/g, '/').replace(/^\/+|\/+$/g, '');
  return slug || null;
}

async function createPageHeroFromId(
  client: ReturnType<typeof getSanityWriteClient>,
  docId: string,
  fieldPath: string,
  newAssetRef: string,
): Promise<boolean> {
  if (!client || fieldPath !== 'image') return false;
  const pathSlug = pageHeroSlugFromId(docId);
  if (!pathSlug) return false;

  await client.createIfNotExists({
    _id: docId,
    _type: 'pageHero',
    pathSlug,
    image: {
      _type: 'imageRef',
      asset: { _type: 'reference', _ref: newAssetRef },
      alt: pathSlug,
      credit: 'Peninsula Insider',
      license: 'editor-upload',
    },
  });
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return badRequest('Body must be JSON');
  }

  const { docId, entityType, entitySlug, fieldPath, newAssetRef } = body;
  if (!fieldPath || typeof fieldPath !== 'string') return badRequest('Missing fieldPath');
  if (!newAssetRef || typeof newAssetRef !== 'string') return badRequest('Missing newAssetRef');
  if (!/^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$/.test(newAssetRef)) {
    return badRequest('newAssetRef must be a Sanity asset reference id');
  }

  // Reject any field path that looks like a GROQ injection attempt. Sanity
  // patch helpers escape the value, but dot-notation is interpreted by the
  // patch builder, so we still want to validate the shape.
  if (!/^[a-zA-Z_][a-zA-Z0-9_.[\]]*$/.test(fieldPath)) {
    return badRequest('Invalid fieldPath');
  }

  // ── Page-entity route: write to Supabase image_slots, not Sanity ─────────
  // Page-level images (homepage cover, editor's letter, etc.) are stored in
  // Supabase cms_image_slots. The Sanity asset upload still provides the CDN
  // URL; we just store the reference in Supabase instead of a Sanity singleton
  // document, which eliminates the homepageCover GROQ dependency and CDN cache
  // issues that caused persistent image revert bugs.
  if (entityType === 'page' && entitySlug) {
    if (!access.client) return internalError('No Supabase client available');
    // Build the public CDN URL from the Sanity asset ref so we still get fast
    // image delivery without adding another storage dependency.
    const sanityBuilder = imageUrlBuilder({ projectId: 'a062b30n', dataset: 'production' });
    const newUrl = sanityBuilder.image(newAssetRef).auto('format').url();
    const actorId = access.access?.identity?.userId ?? null;
    const slot = await upsertImageSlot(
      access.client,
      {
        entityType: 'page',
        entitySlug,
        fieldPath,
        label: fieldPath,
        purpose: 'hero',
        storageBucket: 'sanity-cdn',
        storagePath: null,
        publicUrl: newUrl,
        mimeType: null,
        status: 'published',
      },
      actorId,
    );
    if (!slot) return internalError('Failed to save image slot to Supabase');
    // Fire deploy hook so the static build picks up the new URL.
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHookUrl) {
      fetch(deployHookUrl, { method: 'POST' }).catch((err) => {
        console.error('[sanity-patch] page-entity deploy hook failed:', err);
      });
    }
    return jsonResponse({
      ok: true,
      data: {
        entityType: 'page',
        entitySlug,
        fieldPath,
        newUrl,
      },
    });
  }

  // All paths below this point require the Sanity write client.
  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

  // Resolve target doc id.
  let targetDocId = docId ?? null;
  if (!targetDocId) {
    if (!entityType || !entitySlug) {
      return badRequest('Provide either docId, or entityType + entitySlug');
    }
    const sanityType = entityTypeToSanityType(entityType);
    if (!sanityType) {
      return badRequest(
        `entityType "${entityType}" has no Sanity-document mapping. Use docId from stega instead.`,
      );
    }
    try {
      const found = await client.fetch<{ _id: string } | null>(
        `*[_type == $type && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id}`,
        { type: sanityType, slug: entitySlug },
      );
      if (!found?._id) {
        if (sanityType === 'place') {
          const created = await createPlaceFromLocalJson(client, entitySlug, newAssetRef);
          if (created?._id) {
            targetDocId = created._id;
          } else {
            return badRequest(`No ${sanityType} found with slug "${entitySlug}"`);
          }
        } else {
          return badRequest(`No ${sanityType} found with slug "${entitySlug}"`);
        }
      } else {
        targetDocId = found._id;
      }
    } catch (err) {
      return internalError(`Doc lookup failed: ${(err as Error).message}`);
    }
  }

  // Strip the `drafts.` prefix if a draft id slipped through — we always
  // want to patch the published doc.
  if (targetDocId.startsWith('drafts.')) targetDocId = targetDocId.slice('drafts.'.length);

  // Page-level heroes are progressively created as editors touch them.
  // If a rendered image points at a pageHero singleton that has not been
  // seeded yet, create the shell document so the patch has somewhere durable
  // to land instead of failing with "document ... was not found".
  try {
    const existing = await client.fetch<{ _id: string } | null>(
      `*[_id == $id][0]{_id}`,
      { id: targetDocId },
    );
    if (!existing?._id) {
      const createdPageHero = await createPageHeroFromId(client, targetDocId, fieldPath, newAssetRef);
      if (!createdPageHero) {
        return badRequest(`No Sanity document found with id "${targetDocId}"`);
      }
    }
  } catch (err) {
    return internalError(`Doc existence check failed: ${(err as Error).message}`);
  }

  // Fetch the current image object BEFORE patching so replacement keeps
  // imageRef metadata (alt, credit, license, caption) instead of downgrading
  // the field to a bare Sanity image.
  // The fieldPath has already been validated as a safe identifier above.
  let previousAssetRef: string | null = null;
  let previousImage: Record<string, unknown> | null = null;
  try {
    const prev = await client.fetch<{ image: Record<string, unknown> | null; ref: string | null } | null>(
      `*[_id == $id][0]{ "image": ${fieldPath}, "ref": ${fieldPath}.asset._ref }`,
      { id: targetDocId },
    );
    if (prev && typeof prev.ref === 'string') previousAssetRef = prev.ref;
    if (prev?.image && typeof prev.image === 'object') previousImage = prev.image;
  } catch {
    /* non-fatal */
  }

  try {
    const nextImage = {
      ...(previousImage ?? {}),
      _type: 'imageRef',
      asset: { _type: 'reference', _ref: newAssetRef },
    };

    await client
      .patch(targetDocId)
      .set({
        [fieldPath]: nextImage,
      })
      .commit({ autoGenerateArrayKeys: true });

    const confirmed = await client.fetch<{ ref: string | null } | null>(
      `*[_id == $id][0]{ "ref": ${fieldPath}.asset._ref }`,
      { id: targetDocId },
    );
    if (confirmed?.ref !== newAssetRef) {
      return internalError(
        `Patch verification failed: ${fieldPath}.asset._ref is "${confirmed?.ref ?? 'null'}"`,
      );
    }

    // Build a CDN URL for the new asset so the browser can swap the visible
    // src immediately. The image URL builder needs project/dataset; we read
    // them off the write client config.
    const builder = imageUrlBuilder({
      projectId: client.config().projectId!,
      dataset: client.config().dataset!,
    });
    const newUrl = builder.image(newAssetRef).auto('format').url();

    // Fire-and-forget on-demand revalidation so the inline edit reflects
    // on the public site within a few seconds — no need to wait for a
    // Sanity webhook (which only catches Studio edits) or a natural
    // deploy. Best-effort: lookup _type+slug, map to affected routes,
    // GET each with the prerender-revalidate header.
    //
    // We don't await this — the editor's visible swap already happened
    // client-side; the cache bust is just so OTHER browser sessions
    // (and the editor's own next page-load) see the new image.
    let revalidatedRoutes: string[] = [];
    try {
      const meta = await client.fetch<{ _type: string; slug?: { current?: string }; pathSlug?: string } | null>(
        `*[_id == $id][0]{ _type, slug, pathSlug }`,
        { id: targetDocId },
      );
      if (meta) {
        revalidatedRoutes = routesForDocument({
          _id: targetDocId,
          _type: meta._type,
          slug: meta.slug,
          pathSlug: meta.pathSlug,
        });
        if (revalidatedRoutes.length > 0) {
          const origin = new URL(request.url).origin;
          await triggerRevalidate(revalidatedRoutes, origin);
        }
      }
    } catch (err) {
      console.error('[sanity-patch] revalidate trigger failed:', err);
    }

    // Trigger a full Vercel rebuild so the static site picks up the new
    // image within ~4 minutes. Fire-and-forget — same philosophy as
    // triggerRevalidate above. The editor's in-browser swap already happened;
    // this just ensures the next organic visitor sees the updated image
    // without waiting for the next scheduled deploy.
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHookUrl) {
      fetch(deployHookUrl, { method: 'POST' }).catch((err) => {
        console.error('[sanity-patch] deploy hook trigger failed:', err);
      });
    }

    return jsonResponse({
      ok: true,
      data: {
        docId: targetDocId,
        fieldPath,
        newAssetRef,
        newUrl,
        previousAssetRef,
        confirmedAssetRef: confirmed?.ref ?? null,
        revalidatedRoutes,
      },
    });
  } catch (err) {
    return internalError(`Patch failed: ${(err as Error).message}`);
  }
};
