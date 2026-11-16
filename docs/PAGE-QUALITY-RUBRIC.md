# Page quality rubric

Proposed 2026-11-09 at James's request (an alternative 100-point rubric, `JWR-TheOne/07-projects/peninsula-insider/deliverables/2026-11-09-web-page-design-rubric.md`, was written the same day; one should supersede the other). The governing principle is **simplicity as the ultimate sophistication**: a page is finished when nothing is left to remove, not when nothing is left to add.

This rubric scores **pages**. The Coastal Punch 100-point rubric (`COASTAL-PUNCH-ILLUSTRATIONS.md`) still scores **individual illustrations**.

## Five criteria, 0 to 4 each, out of 20

| # | Criterion | 0 | 2 | 4 |
|---|---|---|---|---|
| 1 | **Purpose.** What the page is and what to do, understood within five seconds on a phone. | Can't tell | Clear, but competing with other things | One message, one main action |
| 2 | **Restraint.** Every element earns its place. Test each one: would a reader miss it if it went? | Content repeated, many section types | Some padding | Nothing left to remove |
| 3 | **Imagery.** Every image slot is filled, relevant and honest, in one visual style. | Empty slots | Filled but generic or mixed styles | Real photograph or house illustration in every slot |
| 4 | **Content.** Specific, accurate and current. | Wrong or stale | Mixed quality | Every line specific, details consistent |
| 5 | **Craft.** Type hierarchy, spacing, alignment, mobile, contrast. | Broken | Solid, a few rough spots | Nothing to fix |

Use 1 and 3 for "between the anchors". Every score must cite one piece of evidence from the page (a quote, a count, a screenshot region). A score without evidence does not count.

## Hard fails

Any one of these caps the page at **10**, whatever the total:

- an empty image slot, or a placeholder that reads as missing content;
- a broken link or a 404;
- a past, wrong or contradictory event or fact;
- horizontal scrolling at 390px;
- a text contrast failure.

## Bands

| Score | Meaning |
|---|---|
| 18 to 20 | Reference standard. Other pages are measured against it. |
| 15 to 17 | Ship. |
| 11 to 14 | Needs work before it is promoted. |
| 10 or below | Fail. Fix before anything else on the page. |

## Method

1. Screenshot the live page at 1280px and 390px, full height.
2. Two scorers mark it independently, without seeing each other's scores, each with evidence per criterion.
3. Where they differ by more than one point on a criterion, the lower score stands until the evidence is reconciled.
4. Append the result to `ops/records/page-quality/ledger.jsonl` (one JSON line: date, URL, deployed SHA, five scores, hard fails, total, evidence, scorer).
5. Re-score after every change meant to improve the page. A change that does not move a score was not an improvement.

Why 0 to 4 and not 100 points: two scorers will not agree on 87 against 91, but they do agree on 2 against 3 when each step has a written anchor. A small scale is the repeatable one.

## What is enforced in code

Rubric scoring is human judgement, but the hard fails that can be checked mechanically are gates:

- **Imagery hard fail for events:** `npm run assert:event-heroes` (in `npm run build` and the Content Gate) fails if any current published event lacks a hero image with recorded rights. `scripts/assign-event-heroes.mjs` fills gaps from the venue's own verified photograph or the house illustration library (`src/data/event-illustrations.json`). The auto-publisher calls it on every record it writes.
- **Content, restated titles:** the same gate fails any event summary that adds fewer than three words beyond its title and venue. The auto-publisher holds such candidates for a human instead of publishing them.

## Baseline

`/whats-on/` on 2026-11-09 (SHA `ded7143b`): Purpose 3, Restraint 1, Imagery 0, Content 2, Craft 3 = 9/20, plus a hard fail (empty lead image). See the ledger for the evidence and later scores.
