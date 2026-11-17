# Evidenced venue relationships: draft PR770

Base: 7a5c30451f2988c9315c8e5623362193959ac6c1. Branch: codex/evidenced-relationships-20261117. No merge or deployment authorised for this stage. No schedules changed.

The shared deterministic index uses the existing canonical resolver, exact-name contextual audit, event promotion eligibility and Haversine helper. It separates actual canonical body anchors, related editorial selections, explicit itinerary stops/overnight stays and coordinate-based nearby places. Existing related image cards/rankings remain distinct from measured nearby places. Images, content records, booking/source links and rights rules are unchanged.

Nearby uses valid finite stored Peninsula coordinates, within5km, nearest6 with deterministic ties. Labels state approximate straight-line distance; this is not route distance or independent coordinate verification. Missing coordinates yield no geographic fallback. Canonical alias self-links are suppressed; shared canonical body targets remain ambiguous. Current brewery/distillery template/resolver conflicts are held, not guessed. Festival host membership is not physical event location. Existing EventStrip date/kind/approval payload and browser expiry remain in use.

Journal Markdown body evidence uses the actual renderer's CMS block overrides. Plan articles do not consume those overrides because their actual renderer does not. MDX body extraction and static override guide references remain explicit gaps; their source shadow records are not treated as rendered proof. No fuzzy matching, CMS writes, inferred itinerary stays or automatic source rewriting.

## Operation and evidence

Run `cd next && npm run test:relationships && npm run test:journal-links && npm run build`. The existing `npm run audit:link-graph` / `npm run assert:link-graph` now includes `relationships`: per-venue edges/gaps, holds, actual rendered panels, unsupported contextual guides and expected-versus-rendered defects. This consumes the existing page inventory; it is not another crawler. Audit-only, no unattended apply/publish mode.

For rendered QA use the existing CI journal review step: `node scripts/audit-link-graph.mjs --dist dist --json review/journal-link-graph.json`, then `node scripts/review-relationships.mjs`. Eight representative cases cover Eat, Wine, Stay/Kanasta and spa fragments at390/1440px, destination eligibility, disclosure/Enter navigation and overflow. Artifacts remain under the existing journal-links exact-head artifact.

Initial source-only diagnostic:136JSON venues,289articles,6itineraries;110eligible venues,73with explicit editorial selections,16with explicit plan references,78with coordinate-based nearby candidates. This does not establish built/CMS acceptance. Eight promotable events at the diagnostic clock had no eligible explicit physical-venue reference, so no venue-event claims were created. Static/MDX and missing identity/coordinate evidence remain in the review queue.

Independent interim reviewer `/root/independent_review` found a misplaced spa insertion, misleading related-selection heading, plan-CMS divergence and an insufficient evidence audit. Corrected; added regression checks for unsupported classifications, actual anchor mismatches, missing panels, distances and event venue/day. Initial aggregate build also reproduced two pre-existing event-collector failures; no failure is waived. Exact final source and rendered review and CI are still required. Draft only.

Concurrent PR767 artwork, local tour corrections and Cape Retreat content are deliberately untouched. Shared template integration preserves existing related cards; reconcile current main and inspect overlap before final review.
