/**
 * Helpers for marking up editable surfaces.
 *
 * Sprinkle these data-* attributes on any element you want the inline editor
 * to recognise. The browser-side client at `client.ts` looks for
 * `[data-pi-edit]` elements and lights them up when edit mode is on.
 *
 * Public site behaviour with these attributes present but edit mode off:
 * zero — they're inert data attributes.
 */

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

export type CmsTextKind = 'text' | 'markdown' | 'richtext';

export interface EditableTextOpts {
  entityType: CmsEntityType;
  entitySlug: string;
  fieldPath: string;
  label: string;
  kind?: CmsTextKind;
}

export interface EditableImageOpts {
  entityType: CmsEntityType;
  entitySlug: string;
  fieldPath: string;
  label: string;
  /** Defaults to `'hero'`. */
  purpose?: 'hero' | 'card' | 'gallery' | 'inline' | 'seo';
  /**
   * Optional: when this image is sourced from a Sanity *singleton* doc
   * (e.g. `homepageCover`, `megaRail`, `siteSettings`), pass the singleton
   * `_id` here. The admin overlay will resolve the patch target directly
   * to that doc id instead of trying to query by slug.
   */
  sanitySingletonId?: string;
  /**
   * Optional: dot-notation path inside the singleton doc to the image
   * field. Defaults to `fieldPath`. Use this when the legacy `fieldPath`
   * (e.g. `cover.image`) doesn't match the Sanity schema's actual path
   * (e.g. `scenes[2].image`).
   */
  sanitySingletonPath?: string;
}

/**
 * Returns the attribute bag for a text field. Spread onto the element that
 * already renders the text — the inline editor edits whatever's inside it.
 *
 *   <h1 {...editableText({ entityType: 'page', entitySlug: 'home',
 *                          fieldPath: 'cover.headline',
 *                          label: 'Cover headline' })}>
 *     {value}
 *   </h1>
 */
export function editableText(opts: EditableTextOpts): Record<string, string> {
  return {
    'data-pi-edit': 'text',
    'data-pi-entity-type': opts.entityType,
    'data-pi-entity-slug': opts.entitySlug,
    'data-pi-field-path': opts.fieldPath,
    'data-pi-field-kind': opts.kind ?? 'text',
    'data-pi-label': opts.label,
  };
}

/**
 * Returns the attribute bag for an image slot. Spread onto the <img> element
 * (or a wrapping element containing exactly one <img>).
 *
 *   <img
 *     {...editableImage({ entityType: 'page', entitySlug: 'home',
 *                         fieldPath: 'cover.image',
 *                         label: 'Cover image' })}
 *     src={src} alt={alt} />
 */
export function editableImage(opts: EditableImageOpts): Record<string, string> {
  const attrs: Record<string, string> = {
    'data-pi-edit': 'image',
    'data-pi-entity-type': opts.entityType,
    'data-pi-entity-slug': opts.entitySlug,
    'data-pi-field-path': opts.fieldPath,
    'data-pi-purpose': opts.purpose ?? 'hero',
    'data-pi-label': opts.label,
  };
  if (opts.sanitySingletonId) {
    attrs['data-pi-sanity-singleton-id'] = opts.sanitySingletonId;
    attrs['data-pi-sanity-singleton-path'] = opts.sanitySingletonPath ?? opts.fieldPath;
  }
  return attrs;
}
