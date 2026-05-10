export const CMS_EDITABLE_ENTITY_TYPES = ['article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary'] as const;

export type CmsEditableEntityType = (typeof CMS_EDITABLE_ENTITY_TYPES)[number];

export const CMS_FIELD_KINDS = ['text', 'markdown', 'richtext', 'image'] as const;
export type CmsFieldKind = (typeof CMS_FIELD_KINDS)[number];

export const CMS_ENTRY_STATUSES = ['draft', 'published'] as const;
export type CmsEntryStatus = (typeof CMS_ENTRY_STATUSES)[number];

export const CMS_REVISION_ACTIONS = ['create', 'update', 'publish', 'unpublish', 'restore'] as const;
export type CmsRevisionAction = (typeof CMS_REVISION_ACTIONS)[number];

export const CMS_IMAGE_SLOT_PURPOSES = ['hero', 'card', 'gallery', 'inline', 'seo'] as const;
export type CmsImageSlotPurpose = (typeof CMS_IMAGE_SLOT_PURPOSES)[number];

export type CmsFieldPath = string;

export interface CmsEditableTextField {
  id: string;
  entityType: CmsEditableEntityType;
  entitySlug: string;
  fieldPath: CmsFieldPath;
  label: string;
  kind: Exclude<CmsFieldKind, 'image'>;
  value: string | null;
  status: CmsEntryStatus;
  locale: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CmsEditableImageSlot {
  id: string;
  entityType: CmsEditableEntityType;
  entitySlug: string;
  fieldPath: CmsFieldPath;
  label: string;
  purpose: CmsImageSlotPurpose;
  storageBucket: string;
  storagePath: string | null;
  publicUrl: string | null;
  altText: string | null;
  caption: string | null;
  credit: string | null;
  mimeType: string | null;
  status: CmsEntryStatus;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CmsRevisionPatch {
  op: 'set' | 'unset';
  target: CmsFieldPath;
  value?: string | null;
}

export interface CmsRevisionRecord {
  id: string;
  entityType: CmsEditableEntityType;
  entitySlug: string;
  action: CmsRevisionAction;
  status: CmsEntryStatus;
  summary: string | null;
  patch: CmsRevisionPatch[];
  createdAt: string;
  createdBy: string | null;
  restoredFromRevisionId: string | null;
}

export interface CmsEditorIdentity {
  userId: string;
  email: string | null;
  isEditor: boolean;
}

export interface CmsAdminAccess {
  identity: CmsEditorIdentity;
  canRead: boolean;
  canWrite: boolean;
  canPublish: boolean;
}
