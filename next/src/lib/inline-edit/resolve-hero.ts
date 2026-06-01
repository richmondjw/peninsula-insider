/**
 * Override-aware hero resolver — the single entry point for rendering an
 * entity's hero image anywhere on the site.
 *
 * THE RULE (do not bypass): any surface that renders an entity's hero
 * (card, listing grid, detail page, homepage block) MUST resolve through
 * `resolveHero(...)`. Never read `data.heroImage.src` or call
 * `heroBackgroundStyle(data)` / `resolveHeroSrc(data)` directly in a
 * template.
 *
 * Why: the inline CMS saves an editor's image replacement to a Supabase
 * slot keyed by (entity_type, entity_slug, field_path). A surface that
 * reads frontmatter alone never consults that slot, so the replacement is
 * ignored and the image reverts to the content file on the next rebuild.
 * That was the /explore/plans/ regression (2026-05-29): the guide cards rendered
 * `article.data.heroImage.src` straight from frontmatter, so the editor's
 * uploaded hero kept reverting. Routing every hero through one resolver
 * means the override is always applied and the bug cannot recur.
 *
 * Field-path note: most entities store the hero under `heroImage`
 * (venues, places, events, experiences, itineraries, tours, tour
 * operators, tour packages). Articles historically use `hero`. Pass the
 * right `fieldPath`, or rely on the built-in fallback that checks both so
 * an override saved under either key is honoured.
 */

import {
  loadOverrides,
  type CmsEntityType,
  type CmsOverrideImage,
} from './overrides';
import {
  resolveHeroSrc,
  heroBackgroundStyle,
  hasOwnHeroImage,
} from '../editorial';

export interface ResolvedHero {
  /** Best hero src: CMS override → content frontmatter → fallback chain. */
  src: string;
  /** Best alt text: override → frontmatter alt → entity name/title. */
  alt: string;
  /** Ready-to-use `background-image` style string for hero blocks. */
  style: string;
  /**
   * True when there is a genuine photo to show — either a published CMS
   * override or a real (non-placeholder, non-category-fallback) frontmatter
   * image. Use this to gate optional hero blocks so resolveHeroSrc's
   * fallback spread doesn't make an image appear where the content file
   * never specified one.
   */
  hasPhoto: boolean;
  /** The raw published override row, if any. */
  override: CmsOverrideImage | undefined;
}

export async function resolveHero(
  entityType: CmsEntityType,
  slug: string,
  data: any,
  fieldPath: string = 'heroImage',
): Promise<ResolvedHero> {
  const images = (await loadOverrides(entityType, slug)).image;
  // Honour the requested key first, then tolerate the other common key so
  // an override saved from any surface for this entity is always applied.
  const override =
    images[fieldPath] ?? images.hero ?? images.heroImage ?? undefined;

  const src = override?.src ?? resolveHeroSrc(data);
  const alt =
    override?.alt ??
    data?.heroImage?.alt ??
    data?.name ??
    data?.title ??
    '';
  const style = override?.src
    ? `background-image: url(${override.src}); background-size: cover; background-position: center;`
    : heroBackgroundStyle(data);

  return {
    src,
    alt,
    style,
    hasPhoto: Boolean(override) || hasOwnHeroImage(data),
    override,
  };
}
