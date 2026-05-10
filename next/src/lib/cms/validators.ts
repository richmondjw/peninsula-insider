import {
  CMS_EDITABLE_ENTITY_TYPES,
  CMS_ENTRY_STATUSES,
  CMS_FIELD_KINDS,
  CMS_IMAGE_SLOT_PURPOSES,
  CMS_REVISION_ACTIONS,
  type CmsAdminAccess,
  type CmsEditableEntityType,
  type CmsEditableImageSlot,
  type CmsEditableTextField,
  type CmsEditorIdentity,
  type CmsEntryStatus,
  type CmsFieldKind,
  type CmsImageSlotPurpose,
  type CmsRevisionRecord,
} from './schema.ts';

const hasOwn = <T extends object>(value: T, key: PropertyKey): key is keyof T =>
  Object.prototype.hasOwnProperty.call(value, key);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isIsoDateString(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function isEnumValue<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return isString(value) && (values as readonly string[]).includes(value);
}

export function isCmsEditorIdentity(value: unknown): value is CmsEditorIdentity {
  return (
    isRecord(value) &&
    isString(value.userId) &&
    isNullableString(value.email) &&
    typeof value.isEditor === 'boolean'
  );
}

export function isCmsAdminAccess(value: unknown): value is CmsAdminAccess {
  return (
    isRecord(value) &&
    hasOwn(value, 'identity') &&
    isCmsEditorIdentity(value.identity) &&
    typeof value.canRead === 'boolean' &&
    typeof value.canWrite === 'boolean' &&
    typeof value.canPublish === 'boolean'
  );
}

export function isCmsEditableTextField(value: unknown): value is CmsEditableTextField {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isEnumValue(value.entityType, CMS_EDITABLE_ENTITY_TYPES) &&
    isString(value.entitySlug) &&
    isString(value.fieldPath) &&
    isString(value.label) &&
    isEnumValue(value.kind, CMS_FIELD_KINDS) &&
    value.kind !== 'image' &&
    isNullableString(value.value) &&
    isEnumValue(value.status, CMS_ENTRY_STATUSES) &&
    isNullableString(value.locale) &&
    isIsoDateString(value.updatedAt) &&
    isNullableString(value.updatedBy)
  );
}

export function isCmsEditableImageSlot(value: unknown): value is CmsEditableImageSlot {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isEnumValue(value.entityType, CMS_EDITABLE_ENTITY_TYPES) &&
    isString(value.entitySlug) &&
    isString(value.fieldPath) &&
    isString(value.label) &&
    isEnumValue(value.purpose, CMS_IMAGE_SLOT_PURPOSES) &&
    isString(value.storageBucket) &&
    isNullableString(value.storagePath) &&
    isNullableString(value.publicUrl) &&
    isNullableString(value.altText) &&
    isNullableString(value.caption) &&
    isNullableString(value.credit) &&
    isNullableString(value.mimeType) &&
    isEnumValue(value.status, CMS_ENTRY_STATUSES) &&
    isIsoDateString(value.updatedAt) &&
    isNullableString(value.updatedBy)
  );
}

// ---- input validators (write-path payloads) -------------------------------
//
// These differ from the record validators above: incoming payloads do not
// carry server-assigned fields like `id`, `updatedAt`, `updatedBy`, so we
// validate just the editor-supplied subset.

export interface UpsertTextFieldPayload {
  fieldPath: string;
  label: string;
  kind: Exclude<CmsFieldKind, 'image'>;
  value: string | null;
  status: CmsEntryStatus;
  locale?: string | null;
}

export interface UpsertImageSlotPayload {
  fieldPath: string;
  label: string;
  purpose: CmsImageSlotPurpose;
  storageBucket?: string;
  storagePath: string | null;
  publicUrl: string | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  mimeType?: string | null;
  status: CmsEntryStatus;
}

export function isCmsCollection(value: unknown): value is CmsEditableEntityType {
  return isEnumValue(value, CMS_EDITABLE_ENTITY_TYPES);
}

export function isUpsertTextFieldPayload(value: unknown): value is UpsertTextFieldPayload {
  if (!isRecord(value)) return false;
  if (!isString(value.fieldPath) || value.fieldPath.length === 0) return false;
  if (!isString(value.label) || value.label.length === 0) return false;
  if (!isEnumValue(value.kind, CMS_FIELD_KINDS) || value.kind === 'image') return false;
  if (!isNullableString(value.value)) return false;
  if (!isEnumValue(value.status, CMS_ENTRY_STATUSES)) return false;
  if (hasOwn(value, 'locale') && !(value.locale === undefined || isNullableString(value.locale))) {
    return false;
  }
  return true;
}

export function isUpsertImageSlotPayload(value: unknown): value is UpsertImageSlotPayload {
  if (!isRecord(value)) return false;
  if (!isString(value.fieldPath) || value.fieldPath.length === 0) return false;
  if (!isString(value.label) || value.label.length === 0) return false;
  if (!isEnumValue(value.purpose, CMS_IMAGE_SLOT_PURPOSES)) return false;
  if (!isNullableString(value.storagePath)) return false;
  if (!isNullableString(value.publicUrl)) return false;
  if (!isEnumValue(value.status, CMS_ENTRY_STATUSES)) return false;
  for (const key of ['storageBucket', 'altText', 'caption', 'credit', 'mimeType'] as const) {
    if (hasOwn(value, key) && !(value[key] === undefined || isNullableString(value[key]))) {
      return false;
    }
  }
  return true;
}

export function isCmsRevisionRecord(value: unknown): value is CmsRevisionRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isEnumValue(value.entityType, CMS_EDITABLE_ENTITY_TYPES) &&
    isString(value.entitySlug) &&
    isEnumValue(value.action, CMS_REVISION_ACTIONS) &&
    isEnumValue(value.status, CMS_ENTRY_STATUSES) &&
    isNullableString(value.summary) &&
    Array.isArray(value.patch) &&
    value.patch.every((item) =>
      isRecord(item) &&
      (item.op === 'set' || item.op === 'unset') &&
      isString(item.target) &&
      (!hasOwn(item, 'value') || isNullableString(item.value))
    ) &&
    isIsoDateString(value.createdAt) &&
    isNullableString(value.createdBy) &&
    isNullableString(value.restoredFromRevisionId)
  );
}
