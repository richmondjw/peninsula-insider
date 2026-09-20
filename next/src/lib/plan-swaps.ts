/** Deliberate nearby dining alternatives from the existing venue corpus.
 * No availability, travel-time or group-suitability promises are implied.
 */
export const PLAN_SWAPS: Record<string, { slug: string; reason: string }[]> = {
  montalto: [{ slug: 'port-phillip-estate', reason: 'Another dining stop in Red Hill South. This changes the venue and menu; check the dining room, opening times and booking availability directly.' }],
  'port-phillip-estate': [{ slug: 'montalto', reason: 'Another dining stop in Red Hill South, with a restaurant and Piazza option. Choose the dining option and check opening times and booking availability directly.' }],
};
