# Itinerary detail design review

Scope: the six itinerary entries rendered by the itinerary branch of `next/src/pages/explore/plans/[slug].astro`. The published plan articles use the separate layout reviewed in `plan-article-design-rubric-2026-10-01.md`.

## Rubric (100 points)

| Criterion | Points | Evidence for full marks |
| --- | ---: | --- |
| Arrival and trip identity | 20 | Cover communicates destination, duration, audience and action immediately, with credited photography. |
| Route clarity | 25 | A visitor can understand and jump to the route before reading the full narrative. Day and stop order stays accurate. |
| Decision and controls | 15 | Stay, My Trip, gallery, and planning actions match the trip type and reach working targets. |
| Editorial rhythm | 15 | The day sequence, practical notes, and booking information are scannable without losing the story. |
| Responsive craft | 15 | All itinerary routes work at phone, tablet and desktop widths without clipping or horizontal scroll. |
| Trust and access | 10 | Photo credits, headings, focus states, contrast, motion preferences and source caveats remain clear. |

## Iteration log

| Pass | Score | Evidence and next action |
| --- | ---: | --- |
| Live baseline | 73 | Strong photography and complete content, but the mobile gallery and facts panel delay the route. The day-trip facts panel also points to accommodation. Bring the route forward and correct that action. |
| First code pass | 90 | A connected cover, route overview and mobile reading order make the itinerary easier to follow. Refine the day-trip primary action and same-page link direction; verify every itinerary route. |
| Final visual pass | 99 | The day-trip save action is primary, overview links indicate downward jumps, and no-stay facts lead to the route. All six itinerary routes passed 320, 390, 768 and 1440 px checks for one H1, a hero, working overview anchors, intended mobile reading order and no horizontal overflow. The desktop facts panel stays alongside the route. One point is reserved for direct reader testing. |

Final breakdown: arrival 20/20; route clarity 25/25; decision and controls 15/15; editorial rhythm 15/15; responsive craft 15/15; trust and access 9/10.

Scores are editorial design judgements supported by rendered checks, not automated guarantees.
