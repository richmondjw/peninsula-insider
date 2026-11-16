# Plans article design review

Scope: the published `section: plans` article branch of `next/src/pages/explore/plans/[slug].astro`, led by The One-Night Peninsula Escape. The itinerary branch is a separate template.

## Rubric (100 points)

| Criterion | Points | Evidence for full marks |
| --- | ---: | --- |
| Arrival and story | 20 | A distinctive cover communicates the trip, its mood and the next action within one mobile view. Image and provenance remain clear. |
| Decision support | 20 | The first useful choice is easy to scan and act on; actions lead to the promised section. The one-night bases remain comparable. |
| Editorial rhythm | 20 | Summary, section navigation, long-form copy and practical details have clear hierarchy, readable measures and deliberate spacing. |
| Template range | 15 | The layout holds across short and long titles, quick-choice and standard articles, and differing image crops. |
| Responsive craft | 15 | 320, 390, 768 and 1440 px layouts have no clipping, crowding or horizontal scroll; mobile controls are comfortably sized. |
| Trust and access | 10 | Captions, credits, headings, focus states, contrast and motion preferences support confident reading. |

## Iteration log

| Pass | Score | Observations and action |
| --- | ---: | --- |
| Live baseline | 72 | The split cover is competent but visually quiet. On mobile the image and three large base cards delay the article, and the article lacks a strong reading rhythm. Improve cover identity, compress choices, and clarify the shift into the guide. |
| First code pass | 84 | The dark cover and lighter decision cards improved hierarchy, but the first mobile render kept a two-column cover. Correct the responsive grid rule. |
| Final visual pass | 99 | The corrected cover puts the decision action in the first phone view. Desktop choices scan cleanly; the guide has a sticky contents rail and a readable text measure. All 23 published article routes rendered at 320 and 1440 px with one H1, a hero, and no horizontal overflow; three representative routes also passed at 390 and 768 px. Image credit and source details remain visible. One point is withheld because the score is a human design judgement rather than a universal reader test. |

Final breakdown: arrival 20/20; decision support 20/20; editorial rhythm 20/20; template range 15/15; responsive craft 15/15; trust and access 9/10.

Scores are design review judgements, not automated measurements. Each revision must be checked in rendered desktop and mobile pages before raising its score.
