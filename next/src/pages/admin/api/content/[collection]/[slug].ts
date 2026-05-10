import type { APIRoute } from 'astro';

import {
  getCmsEntrySnapshot,
  listImageSlotsForEntry,
  listTextFieldsForEntry,
  recordRevision,
  upsertImageSlot,
  upsertTextField,
} from '../../../../../lib/cms/api';
import {
  badRequest,
  forbidden,
  internalError,
  jsonResponse,
  resolveCmsAccess,
  unauthorized,
} from '../../../../../lib/cms/server';
import type { CmsEditableEntityType } from '../../../../../lib/cms/schema';
import {
  isCmsCollection,
  isUpsertImageSlotPayload,
  isUpsertTextFieldPayload,
} from '../../../../../lib/cms/validators';

/**
 * Admin content API.
 *
 * Routes:
 *   GET    /admin/api/content/:collection/:slug              → snapshot for an entry
 *   GET    /admin/api/content/:collection/:slug?field=foo    → just that text/image field
 *   PUT    /admin/api/content/:collection/:slug              → upsert text or image (replace)
 *   PATCH  /admin/api/content/:collection/:slug              → upsert (alias of PUT)
 *
 * Body shape for PUT/PATCH:
 *   { kind: 'text', payload: UpsertTextFieldPayload, summary?: string }
 *   { kind: 'image', payload: UpsertImageSlotPayload, summary?: string }
 *
 * All requests are authorised by `resolveCmsAccess` against the request's
 * Supabase JWT cookie. Writes go through the per-request user-JWT client so
 * RLS evaluates as the editor — never the service-role key.
 */

// Hybrid-only route. When PI_ADMIN_HYBRID is unset, prerender = true and
// getStaticPaths returns [], so the static build excludes this endpoint
// entirely. When PI_ADMIN_HYBRID=1, the @astrojs/vercel adapter is loaded and
// the endpoint runs at request time.
const PI_ADMIN_HYBRID = (import.meta.env.PI_ADMIN_HYBRID as string | undefined) === '1';
export const prerender = !PI_ADMIN_HYBRID;
export async function getStaticPaths() {
  return [];
}

interface ParsedParams {
  collection: CmsEditableEntityType;
  slug: string;
}

function parseParams(params: Record<string, string | undefined>): ParsedParams | { error: string } {
  const rawCollection = params.collection;
  const rawSlug = params.slug;
  if (!rawCollection || !isCmsCollection(rawCollection)) {
    return { error: `Unknown collection "${rawCollection ?? ''}"` };
  }
  if (!rawSlug || rawSlug.length === 0 || rawSlug.length > 200) {
    return { error: 'Missing or invalid slug' };
  }
  return { collection: rawCollection, slug: rawSlug };
}

export const GET: APIRoute = async ({ params, request, url }) => {
  const parsed = parseParams(params);
  if ('error' in parsed) return badRequest(parsed.error);

  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok || !access.client || !access.access) {
    if (access.reason === 'not-editor') return forbidden('Not an editor');
    return unauthorized();
  }

  const fieldFilter = url.searchParams.get('field');

  try {
    if (fieldFilter) {
      // Filter snapshot down to this single field (could be text or image).
      const [textFields, imageSlots] = await Promise.all([
        listTextFieldsForEntry(access.client, parsed.collection, parsed.slug, { status: 'any' }),
        listImageSlotsForEntry(access.client, parsed.collection, parsed.slug, { status: 'any' }),
      ]);
      const text = textFields.find((f) => f.fieldPath === fieldFilter) ?? null;
      const image = imageSlots.find((f) => f.fieldPath === fieldFilter) ?? null;
      return jsonResponse({
        ok: true,
        data: {
          entityType: parsed.collection,
          entitySlug: parsed.slug,
          field: fieldFilter,
          text,
          image,
        },
      });
    }

    const snapshot = await getCmsEntrySnapshot(
      access.client,
      parsed.collection,
      parsed.slug,
      { status: 'any' },
    );
    return jsonResponse({ ok: true, data: snapshot });
  } catch (err) {
    return internalError((err as Error).message || 'Read failed');
  }
};

const handleWrite: APIRoute = async ({ params, request }) => {
  const parsed = parseParams(params);
  if ('error' in parsed) return badRequest(parsed.error);

  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok || !access.client || !access.access) {
    if (access.reason === 'not-editor') return forbidden('Not an editor');
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON');
  }

  if (!body || typeof body !== 'object') {
    return badRequest('Body must be a JSON object');
  }

  const { kind, payload, summary } = body as {
    kind?: unknown;
    payload?: unknown;
    summary?: unknown;
  };

  const actorId = access.access.identity.userId;
  const summaryText = typeof summary === 'string' ? summary : null;

  try {
    if (kind === 'text') {
      if (!isUpsertTextFieldPayload(payload)) {
        return jsonResponse(
          { ok: false, error: 'Invalid text field payload' },
          { status: 422 },
        );
      }
      const saved = await upsertTextField(
        access.client,
        {
          entityType: parsed.collection,
          entitySlug: parsed.slug,
          fieldPath: payload.fieldPath,
          label: payload.label,
          kind: payload.kind,
          value: payload.value,
          status: payload.status,
          locale: payload.locale ?? null,
        },
        actorId,
      );
      if (!saved) return internalError('Failed to upsert text field');

      await recordRevision(
        access.client,
        {
          entityType: parsed.collection,
          entitySlug: parsed.slug,
          action: 'update',
          status: payload.status,
          summary: summaryText,
          patch: [{ op: 'set', target: payload.fieldPath, value: payload.value }],
        },
        actorId,
      );

      return jsonResponse({ ok: true, data: saved });
    }

    if (kind === 'image') {
      if (!isUpsertImageSlotPayload(payload)) {
        return jsonResponse(
          { ok: false, error: 'Invalid image slot payload' },
          { status: 422 },
        );
      }
      const saved = await upsertImageSlot(
        access.client,
        {
          entityType: parsed.collection,
          entitySlug: parsed.slug,
          fieldPath: payload.fieldPath,
          label: payload.label,
          purpose: payload.purpose,
          storageBucket: payload.storageBucket ?? 'cms-assets',
          storagePath: payload.storagePath,
          publicUrl: payload.publicUrl,
          altText: payload.altText ?? null,
          caption: payload.caption ?? null,
          credit: payload.credit ?? null,
          mimeType: payload.mimeType ?? null,
          status: payload.status,
        },
        actorId,
      );
      if (!saved) return internalError('Failed to upsert image slot');

      await recordRevision(
        access.client,
        {
          entityType: parsed.collection,
          entitySlug: parsed.slug,
          action: 'update',
          status: payload.status,
          summary: summaryText,
          patch: [{ op: 'set', target: payload.fieldPath, value: payload.publicUrl }],
        },
        actorId,
      );

      return jsonResponse({ ok: true, data: saved });
    }

    return badRequest('Body must include kind: "text" | "image" and a payload');
  } catch (err) {
    return internalError((err as Error).message || 'Write failed');
  }
};

export const PUT: APIRoute = handleWrite;
export const PATCH: APIRoute = handleWrite;
