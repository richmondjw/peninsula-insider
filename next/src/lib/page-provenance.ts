/**
 * page-provenance.ts  -  PI-004, provenance for a page built from records.
 *
 * A thin wrapper so a hub or category page does not have to load the claim
 * registry itself. The registry is read once per build and memoised: the
 * corpus is static, and 40 pages each re-reading two collections is a cost
 * with no benefit.
 *
 * The returned `stampISO` is the only date a page should hand to structured
 * data or to a stamp, and it is derived from the records the page lists. It
 * is deliberately not a parameter: a date passed in as a constant is exactly
 * how this site ended up publishing one hardcoded April stamp on eleven
 * pages that had nothing to do with each other.
 */
import { getCollection } from 'astro:content';
import precedence from '../data/source-precedence.json';
import { aggregateProvenance, buildProvenanceIndex, stampLabel } from './provenance.mjs';

let indexPromise: Promise<ReturnType<typeof buildProvenanceIndex>> | null = null;

export function provenanceIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all([getCollection('claims'), getCollection('evidence')]).then(
      ([claims, evidence]) => buildProvenanceIndex(claims, evidence)
    );
  }
  return indexPromise;
}

/**
 * `type` is the registry subject type, which is the DIRECTORY name under
 * src/content/ (so 'fishing-locations', not the collection key
 * 'fishingLocations'). The registry joins on {type, slug} rather than on a
 * collection reference, precisely so one claim can be asserted by records in
 * several collections.
 */
export async function pageProvenance(
  records: Array<{ id?: string; data?: Record<string, unknown> }>,
  type: string
) {
  const derived = aggregateProvenance(records, {
    type,
    index: await provenanceIndex(),
    precedence,
  });
  return {
    ...derived,
    /** Check date if one was earned, else the floor review date, else null. */
    stampISO: (derived.checkedOn ?? derived.reviewedOn ?? null) as string | null,
    /** 'Last fact-verified' only when the check was earned. */
    stampLabel: stampLabel(derived),
  };
}
