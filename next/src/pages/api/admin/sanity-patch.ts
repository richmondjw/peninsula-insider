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

export const prerender = process.env.PI_ADMIN_HYBRID !== '1';
export async function getStaticPaths() {
  return [];
}

interface PatchBody {
  docId?: string;
  entityType?: string;
  entitySlug?: string;
  fieldPath?: string;
  newAssetRef?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

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
        return badRequest(`No ${sanityType} found with slug "${entitySlug}"`);
      }
      targetDocId = found._id;
    } catch (err) {
      return internalError(`Doc lookup failed: ${(err as Error).message}`);
    }
  }

  // Strip the `drafts.` prefix if a draft id slipped through — we always
  // want to patch the published doc.
  if (targetDocId.startsWith('drafts.')) targetDocId = targetDocId.slice('drafts.'.length);

  // Fetch the current asset ref at fieldPath BEFORE patching so the client
  // can offer an Undo. Non-fatal if it fails — Undo simply won't appear.
  // The fieldPath has already been validated as a safe identifier above.
  let previousAssetRef: string | null = null;
  try {
    const prev = await client.fetch<{ ref: string | null } | null>(
      `*[_id == $id][0]{ "ref": ${fieldPath}.asset._ref }`,
      { id: targetDocId },
    );
    if (prev && typeof prev.ref === 'string') previousAssetRef = prev.ref;
  } catch {
    /* non-fatal */
  }

  try {
    await client
      .patch(targetDocId)
      .set({
        [fieldPath]: {
          _type: 'image',
          asset: { _type: 'reference', _ref: newAssetRef },
        },
      })
      .commit({ autoGenerateArrayKeys: true });

    // Build a CDN URL for the new asset so the browser can swap the visible
    // src immediately. The image URL builder needs project/dataset; we read
    // them off the write client config.
    const builder = imageUrlBuilder({
      projectId: client.config().projectId!,
      dataset: client.config().dataset!,
    });
    const newUrl = builder.image(newAssetRef).auto('format').url();

    return jsonResponse({
      ok: true,
      data: { docId: targetDocId, fieldPath, newAssetRef, newUrl, previousAssetRef },
    });
  } catch (err) {
    return internalError(`Patch failed: ${(err as Error).message}`);
  }
};
