/**
 * Peninsula Insider — CMS data access.
 *
 * Thin functional layer over Supabase that returns typed results in the shape
 * defined by `./schema.ts`. Both the admin server (with a per-request JWT
 * client) and the build-time anon-key reader use the same helpers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CMS_EDITABLE_ENTITY_TYPES,
  CMS_ENTRY_STATUSES,
  CMS_FIELD_KINDS,
  CMS_IMAGE_SLOT_PURPOSES,
  CMS_REVISION_ACTIONS,
  type CmsEditableEntityType,
  type CmsEditableImageSlot,
  type CmsEditableTextField,
  type CmsEntryStatus,
  type CmsFieldKind,
  type CmsImageSlotPurpose,
  type CmsRevisionAction,
  type CmsRevisionPatch,
  type CmsRevisionRecord,
} from './schema.ts';

// ---- row shape coming back from Postgres -----------------------------------

interface TextFieldRow {
  id: string;
  entity_type: string;
  entity_slug: string;
  field_path: string;
  label: string;
  field_kind: string;
  locale: string | null;
  value: string | null;
  status: string;
  updated_by: string | null;
  updated_at: string;
}

interface ImageSlotRow {
  id: string;
  entity_type: string;
  entity_slug: string;
  field_path: string;
  label: string;
  purpose: string;
  storage_bucket: string;
  storage_path: string | null;
  public_url: string | null;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
  mime_type: string | null;
  status: string;
  updated_by: string | null;
  updated_at: string;
}

interface RevisionRow {
  id: string;
  entity_type: string;
  entity_slug: string;
  action: string;
  status: string;
  summary: string | null;
  patch: unknown;
  created_by: string | null;
  restored_from_revision_id: string | null;
  created_at: string;
}

// ---- conversion ------------------------------------------------------------

function asEntityType(v: string): CmsEditableEntityType {
  return (CMS_EDITABLE_ENTITY_TYPES as readonly string[]).includes(v)
    ? (v as CmsEditableEntityType)
    : 'page';
}
function asStatus(v: string): CmsEntryStatus {
  return (CMS_ENTRY_STATUSES as readonly string[]).includes(v) ? (v as CmsEntryStatus) : 'draft';
}
function asTextKind(v: string): Exclude<CmsFieldKind, 'image'> {
  return v === 'markdown' || v === 'richtext' || v === 'text' ? v : 'text';
}
function asImagePurpose(v: string): CmsImageSlotPurpose {
  return (CMS_IMAGE_SLOT_PURPOSES as readonly string[]).includes(v)
    ? (v as CmsImageSlotPurpose)
    : 'hero';
}
function asAction(v: string): CmsRevisionAction {
  return (CMS_REVISION_ACTIONS as readonly string[]).includes(v)
    ? (v as CmsRevisionAction)
    : 'update';
}

function rowToTextField(row: TextFieldRow): CmsEditableTextField {
  return {
    id: row.id,
    entityType: asEntityType(row.entity_type),
    entitySlug: row.entity_slug,
    fieldPath: row.field_path,
    label: row.label,
    kind: asTextKind(row.field_kind),
    value: row.value,
    status: asStatus(row.status),
    locale: row.locale,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function rowToImageSlot(row: ImageSlotRow): CmsEditableImageSlot {
  return {
    id: row.id,
    entityType: asEntityType(row.entity_type),
    entitySlug: row.entity_slug,
    fieldPath: row.field_path,
    label: row.label,
    purpose: asImagePurpose(row.purpose),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    altText: row.alt_text,
    caption: row.caption,
    credit: row.credit,
    mimeType: row.mime_type,
    status: asStatus(row.status),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function rowToRevision(row: RevisionRow): CmsRevisionRecord {
  const rawPatch = Array.isArray(row.patch) ? row.patch : [];
  const patch: CmsRevisionPatch[] = rawPatch
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => {
      const op = p.op === 'unset' ? 'unset' : 'set';
      const target = typeof p.target === 'string' ? p.target : '';
      const value = typeof p.value === 'string' || p.value === null ? p.value : undefined;
      const out: CmsRevisionPatch = { op, target };
      if (value !== undefined) out.value = value;
      return out;
    })
    .filter((p) => p.target.length > 0);

  return {
    id: row.id,
    entityType: asEntityType(row.entity_type),
    entitySlug: row.entity_slug,
    action: asAction(row.action),
    status: asStatus(row.status),
    summary: row.summary,
    patch,
    createdAt: row.created_at,
    createdBy: row.created_by,
    restoredFromRevisionId: row.restored_from_revision_id,
  };
}

// ---- queries ---------------------------------------------------------------

export interface FetchEntryOptions {
  status?: CmsEntryStatus | 'any';
}

export async function listTextFieldsForEntry(
  client: SupabaseClient,
  entityType: CmsEditableEntityType,
  entitySlug: string,
  options: FetchEntryOptions = {},
): Promise<CmsEditableTextField[]> {
  let query = client
    .from('cms_text_fields')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)
    .order('field_path', { ascending: true });
  if (options.status && options.status !== 'any') {
    query = query.eq('status', options.status);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as TextFieldRow[]).map(rowToTextField);
}

export async function listImageSlotsForEntry(
  client: SupabaseClient,
  entityType: CmsEditableEntityType,
  entitySlug: string,
  options: FetchEntryOptions = {},
): Promise<CmsEditableImageSlot[]> {
  let query = client
    .from('cms_image_slots')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)
    .order('field_path', { ascending: true });
  if (options.status && options.status !== 'any') {
    query = query.eq('status', options.status);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as ImageSlotRow[]).map(rowToImageSlot);
}

export async function listRevisionsForEntry(
  client: SupabaseClient,
  entityType: CmsEditableEntityType,
  entitySlug: string,
  limit = 25,
): Promise<CmsRevisionRecord[]> {
  const { data, error } = await client
    .from('cms_revisions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as RevisionRow[]).map(rowToRevision);
}

// ---- writes ---------------------------------------------------------------

export interface UpsertTextFieldInput {
  entityType: CmsEditableEntityType;
  entitySlug: string;
  fieldPath: string;
  label: string;
  kind: Exclude<CmsFieldKind, 'image'>;
  value: string | null;
  status: CmsEntryStatus;
  locale?: string | null;
}

export async function upsertTextField(
  client: SupabaseClient,
  input: UpsertTextFieldInput,
  actorId: string | null,
): Promise<CmsEditableTextField | null> {
  const payload = {
    entity_type: input.entityType,
    entity_slug: input.entitySlug,
    field_path: input.fieldPath,
    label: input.label,
    field_kind: input.kind,
    value: input.value,
    status: input.status,
    locale: input.locale ?? null,
    updated_by: actorId,
  };
  const { data, error } = await client
    .from('cms_text_fields')
    .upsert(payload, { onConflict: 'entity_type,entity_slug,field_path,locale' })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return rowToTextField(data as TextFieldRow);
}

export interface UpsertImageSlotInput {
  entityType: CmsEditableEntityType;
  entitySlug: string;
  fieldPath: string;
  label: string;
  purpose: CmsImageSlotPurpose;
  storageBucket: string;
  storagePath: string | null;
  publicUrl: string | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  mimeType?: string | null;
  status: CmsEntryStatus;
}

export async function upsertImageSlot(
  client: SupabaseClient,
  input: UpsertImageSlotInput,
  actorId: string | null,
): Promise<CmsEditableImageSlot | null> {
  const payload = {
    entity_type: input.entityType,
    entity_slug: input.entitySlug,
    field_path: input.fieldPath,
    label: input.label,
    purpose: input.purpose,
    storage_bucket: input.storageBucket,
    storage_path: input.storagePath,
    public_url: input.publicUrl,
    alt_text: input.altText ?? null,
    caption: input.caption ?? null,
    credit: input.credit ?? null,
    mime_type: input.mimeType ?? null,
    status: input.status,
    updated_by: actorId,
  };
  const { data, error } = await client
    .from('cms_image_slots')
    .upsert(payload, { onConflict: 'entity_type,entity_slug,field_path' })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return rowToImageSlot(data as ImageSlotRow);
}

export interface RecordRevisionInput {
  entityType: CmsEditableEntityType;
  entitySlug: string;
  action: CmsRevisionAction;
  status: CmsEntryStatus;
  summary?: string | null;
  patch: CmsRevisionPatch[];
}

export async function recordRevision(
  client: SupabaseClient,
  input: RecordRevisionInput,
  actorId: string | null,
): Promise<CmsRevisionRecord | null> {
  const payload = {
    entity_type: input.entityType,
    entity_slug: input.entitySlug,
    action: input.action,
    status: input.status,
    summary: input.summary ?? null,
    patch: input.patch,
    created_by: actorId,
  };
  const { data, error } = await client
    .from('cms_revisions')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return rowToRevision(data as RevisionRow);
}

// ---- aggregate read for an editor session ---------------------------------

export interface CmsEntrySnapshot {
  entityType: CmsEditableEntityType;
  entitySlug: string;
  textFields: CmsEditableTextField[];
  imageSlots: CmsEditableImageSlot[];
  revisions: CmsRevisionRecord[];
}

export async function getCmsEntrySnapshot(
  client: SupabaseClient,
  entityType: CmsEditableEntityType,
  entitySlug: string,
  options: FetchEntryOptions = { status: 'any' },
): Promise<CmsEntrySnapshot> {
  const [textFields, imageSlots, revisions] = await Promise.all([
    listTextFieldsForEntry(client, entityType, entitySlug, options),
    listImageSlotsForEntry(client, entityType, entitySlug, options),
    listRevisionsForEntry(client, entityType, entitySlug, 25),
  ]);
  return { entityType, entitySlug, textFields, imageSlots, revisions };
}

// ---- public/build-time read for a published page --------------------------

export async function getPublishedPageOverrides(
  client: SupabaseClient,
  entitySlug: string,
): Promise<{ textFields: CmsEditableTextField[]; imageSlots: CmsEditableImageSlot[] }> {
  const [textFields, imageSlots] = await Promise.all([
    listTextFieldsForEntry(client, 'page', entitySlug, { status: 'published' }),
    listImageSlotsForEntry(client, 'page', entitySlug, { status: 'published' }),
  ]);
  return { textFields, imageSlots };
}

// ---- collection inventory for the admin dashboard -------------------------

export interface CmsCollectionSummaryRow {
  entityType: CmsEditableEntityType;
  entitySlug: string;
  textFieldCount: number;
  imageSlotCount: number;
  draftCount: number;
  publishedCount: number;
  lastUpdatedAt: string | null;
}

/**
 * Aggregate summary across both text and image rows. Cheap enough for the
 * scale we expect in v1 — pulls all rows readable to the caller and groups in
 * memory. RLS already filters to admin-readable rows.
 */
export async function listCmsEntries(
  client: SupabaseClient,
): Promise<CmsCollectionSummaryRow[]> {
  const [textRes, imageRes] = await Promise.all([
    client
      .from('cms_text_fields')
      .select('entity_type, entity_slug, status, updated_at'),
    client
      .from('cms_image_slots')
      .select('entity_type, entity_slug, status, updated_at'),
  ]);

  type Bucket = CmsCollectionSummaryRow;
  const byKey = new Map<string, Bucket>();

  function bump(
    entityType: string,
    entitySlug: string,
    status: string,
    updatedAt: string,
    kind: 'text' | 'image',
  ) {
    const key = `${entityType}::${entitySlug}`;
    const current = byKey.get(key) ?? {
      entityType: asEntityType(entityType),
      entitySlug,
      textFieldCount: 0,
      imageSlotCount: 0,
      draftCount: 0,
      publishedCount: 0,
      lastUpdatedAt: null as string | null,
    };
    if (kind === 'text') current.textFieldCount += 1;
    if (kind === 'image') current.imageSlotCount += 1;
    if (status === 'draft') current.draftCount += 1;
    if (status === 'published') current.publishedCount += 1;
    if (!current.lastUpdatedAt || updatedAt > current.lastUpdatedAt) {
      current.lastUpdatedAt = updatedAt;
    }
    byKey.set(key, current);
  }

  for (const row of (textRes.data ?? []) as TextFieldRow[]) {
    bump(row.entity_type, row.entity_slug, row.status, row.updated_at, 'text');
  }
  for (const row of (imageRes.data ?? []) as ImageSlotRow[]) {
    bump(row.entity_type, row.entity_slug, row.status, row.updated_at, 'image');
  }

  return [...byKey.values()].sort((a, b) => {
    const aT = a.lastUpdatedAt ?? '';
    const bT = b.lastUpdatedAt ?? '';
    return bT.localeCompare(aT);
  });
}
