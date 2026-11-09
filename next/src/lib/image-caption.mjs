/**
 * image-caption.mjs - the one rule for what appears beneath an image.
 *
 * James, 9 November 2026: captions were mechanical. An "Illustrative image"
 * badge, then "This image shows Montalto. It does not depict the place
 * described on this page." The rule now:
 *
 *   1. A photograph of a real place gets a short place line and its source:
 *        Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula
 *        Photo · Two Palms Australia, courtesy of Visit Victoria
 *      The region stays in the line: the Visit Victoria licence requires the
 *      caption to identify the region (ops/records/visit-victoria/README.md,
 *      enforced by scripts/lint-visit-victoria.mjs).
 *   2. Artwork (our own illustrations, generated plates, placeholders) gets
 *      nothing beneath it. No badge, no description, no credit.
 *   3. No badge, ever. No "this image shows / does not depict" sentences, no
 *      "not a view from a listed stay" disclaimers. Alt text still describes
 *      the image honestly for screen-reader users; that is where description
 *      belongs.
 *
 * A stand-in photograph with no nameable place (a generic vineyard row) gets
 * its credit only, because most of those licences (CC BY, CC BY-SA, Visit
 * Victoria) require attribution beside the image.
 *
 * `cleanCaption` is applied at render time as well as to stored data, so a
 * CMS caption or a future agent-written caption cannot bring the old dialect
 * back. scripts/assert-image-captions.mjs fails the build on stored captions
 * that still carry it.
 */

/** Clause openers and phrases that belong to the retired disclosure dialect. */
export const DISCLAIMER = /\b(?:illustrat\w*|conceptual|not (?:a|an|the|this|every|exact|promised|specific|verified)\b|does not (?:show|depict|guarantee)|do not (?:show|depict|guarantee)|is not\b|isn['’]t\b|this (?:image|photograph|photo|is|does)\b|the (?:image|photograph) shows|(?:venue|regional|coastal|gallery)? ?context\b|stand-?in|representative|placeholder|supplied on|official .*image|destination (?:view|photograph)|editorial (?:artwork|image|illustration)|context photo|resized|converted to webp|cropped|used to|shown as|historical photograph|confirm the current)/i;

/**
 * Stored captions whose place survives only by hand: the place is named
 * inside a disclaimer, or a stand-in photograph is of a nameable place.
 * Keyed on the caption text with any trailing full stop removed.
 */
const OVERRIDES = new Map([
  ['Chardonnay grapes at Main Ridge Estate in nearby Red Hill, used to illustrate the wine country around Main Ridge', 'Main Ridge Estate, Red Hill, Mornington Peninsula'],
  ['Chardonnay grapes at Main Ridge Estate in nearby Red Hill. Used to illustrate the wine country around Main Ridge', 'Main Ridge Estate, Red Hill, Mornington Peninsula'],
  ['Illustrative Main Ridge vineyard image; this is not Ten Minutes by Tractor', 'Main Ridge Estate, Red Hill, Mornington Peninsula'],
  ['Gallery exterior for venue context; this photograph does not show the Orizome workshop', 'Mornington Peninsula Regional Gallery, Mornington'],
  ['Mornington Peninsula Regional Gallery interior for venue context; this photograph does not show the Tessellation workshop', 'Mornington Peninsula Regional Gallery, Mornington'],
  ['Mornington Peninsula Regional Gallery exterior. Illustrative venue photograph; it does not depict the National Works on Paper 2026 exhibition', 'Mornington Peninsula Regional Gallery, Mornington'],
  ['Historical photograph of the Flinders Hotel pub frontage, not the 2026 event', 'Flinders Hotel, Flinders, Mornington Peninsula'],
  ['Flinders Hotel pub frontage, photographed in 2010; this is not a photograph of the Quarters rooms', 'Flinders Hotel, Flinders, Mornington Peninsula'],
  ['Portsea bay context, not the tour entry point. Confirm the current route with Bayplay', 'Portsea, Mornington Peninsula'],
  ['Illustrative Sorrento bay coast. This does not show Driftaway on Dundas or Rye', 'Sorrento, Mornington Peninsula'],
  ['Illustrative Balnarring Beach setting, not the Happy Glamper tent. Resized and converted to WebP from a public-domain photograph', 'Balnarring Beach, Mornington Peninsula'],
  ['Illustrative Devilbend Reservoir landscape near Moorooduc, not Woodman Estate or its lake. Resized and converted to WebP. CC BY-SA 4.0', 'Devilbend Reservoir, Moorooduc, Mornington Peninsula'],
  ['Montalto Vineyard & Olive Grove, Mornington Peninsula, one of the suggested Red Hill stops', 'Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula'],
  ['Jackalope Hotel, Mornington Peninsula, one of the suggested stays', 'Jackalope Hotel, Merricks North, Mornington Peninsula'],
  ['Point King Beach context photo, not Bayplay tour departure or water entry', 'Point King Beach, Portsea, Mornington Peninsula'],
  ['Capel Sound foreshore from above in April 2024. Cropped from the original panorama', 'Capel Sound foreshore, Mornington Peninsula'],
  ['Tootgarook Recreation Reserve, photographed in February 2023. This is not the Tootgarook Wetland', 'Tootgarook Recreation Reserve, Mornington Peninsula'],
  ['Lindenderry at Red Hill, Mornington Peninsula, shown as an illustrative wine-country setting', 'Lindenderry, Red Hill, Mornington Peninsula'],
  ['Visitors at Ocean Eight Vineyard in Shoreham, Mornington Peninsula. A local vineyard scene for this coastal place guide', 'Ocean Eight Vineyard, Shoreham, Mornington Peninsula'],
  ['Jackalope Hotel vineyard outlook, Merricks North, Mornington Peninsula. A local scene used to introduce this place guide', 'Jackalope Hotel, Merricks North, Mornington Peninsula'],
]);

/** Abbreviations whose full stop does not end a sentence. */
const ABBREVIATION = /\b(Pt|St|Mt|Rd|Ave|Dr)\.\s/g;

/**
 * Reduce a stored caption to its short place line, or '' when nothing but
 * disclosure is left. Never invents a place: it only keeps leading text the
 * caption already had.
 */
export function cleanCaption(raw) {
  if (typeof raw !== 'string') return '';
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const key = text.replace(/\.$/, '');
  if (OVERRIDES.has(key)) return OVERRIDES.get(key);

  const guarded = text.replace(ABBREVIATION, (m, abbr) => `${abbr}․ `);
  const sentence = guarded.split(/(?<=[.;])\s+|;\s*|\s+[–—]\s+/)[0] ?? '';
  const kept = [];
  for (const segment of sentence.split(/,\s*/)) {
    const clean = segment.replace(/[.;:]+$/, '').trim();
    if (!clean || DISCLAIMER.test(clean)) break;
    // Editorial tails (", one of the suggested stops") are skipped rather than
    // cut, so a region named after them survives.
    if (/^(?:one of|where|which|home to|adjacent to|photographed in|the venue)\b/i.test(clean)) continue;
    kept.push(clean);
  }
  return kept.join(', ').replace(/․/g, '.').replace(/[\s,.;:]+$/, '').trim();
}

/** Our own artwork: illustrations, generated plates and placeholders. */
export function isArtwork(image) {
  const src = typeof image?.src === 'string' ? image.src.split(/[?#]/)[0] : '';
  const credit = typeof image?.credit === 'string' ? image.credit.trim() : '';
  // A file format alone does not make an image artwork: a context photograph
  // can be an SVG-wrapped raster. Only our own artwork paths and credits do.
  return (
    /^\/images\/(?:generated|illustrations)\//.test(src) ||
    /^\/images\/editorial\/journal-backstop\./.test(src) ||
    /\/(?:event-)?placeholder[^/]*$/.test(src) ||
    /^(?:illustration|ai-assisted artwork)\b/i.test(credit)
  );
}

/**
 * What to print beneath an image: `{ place, credit }`, either part possibly
 * empty, or null when nothing should be printed at all.
 */
export function captionParts(image) {
  if (!image || image.decorative === true || isArtwork(image)) return null;
  const place = cleanCaption(image.caption);
  const credit = typeof image.credit === 'string' ? image.credit.trim() : '';
  if (!place && !credit) return null;
  return { place, credit };
}
