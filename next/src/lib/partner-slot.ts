/**
 * The labelling rule for paid placements (PI-021).
 *
 * Peninsula Insider's published position is that the commercial/editorial
 * firewall "is enforced by labelling, not absence" (src/pages/
 * editorial-approach.astro). That sentence only means something if the label
 * is one a reader takes as "money changed hands". "Partner" is not: a reader
 * can reasonably read it as a collaborator, a supplier, or a venue the
 * publication likes. The chip exists precisely so that nobody has to guess.
 *
 * Lives here rather than inside PartnerSlot.astro so the rule can be tested
 * without rendering a component, and so any future paid surface enforces the
 * same vocabulary instead of inventing its own.
 *
 * This file deliberately says nothing about what may be sold, to whom, or at
 * what price. It governs only how a sale is disclosed once one exists.
 */

/** Words a reader can be expected to read as "this placement was paid for". */
export const DISCLOSING_LABEL =
  /\b(sponsored|advertisement|paid partnership|partner content|promoted)\b/i;

/** The default when a paid surface does not choose its own wording. */
export const DEFAULT_DISCLOSURE_LABEL = 'Sponsored';

/** Does this label disclose a paid placement to a reader? */
export function isDisclosingLabel(label: string | null | undefined): boolean {
  return typeof label === 'string' && DISCLOSING_LABEL.test(label);
}

/**
 * Throw if a live paid placement is about to render without disclosing itself.
 *
 * A throw, not a warning: a commercial card that reaches a reader unlabelled
 * is worse than a page that fails to build. `live` is the caller's own
 * judgement about whether the placement renders at all - a disabled or
 * half-filled slot is not held to the rule, because it shows nobody anything.
 */
export function assertDisclosingLabel(
  label: string | null | undefined,
  { live, surface }: { live: boolean; surface: string }
): void {
  if (!live) return;
  if (isDisclosingLabel(label)) return;
  throw new Error(
    `${surface}: the label ${JSON.stringify(label)} does not disclose a paid placement. ` +
      'Use one of sponsored / advertisement / paid partnership / partner content / promoted, ' +
      'or take the placement down. An unlabelled commercial card breaches the ' +
      'editorial firewall (PI-021).'
  );
}
