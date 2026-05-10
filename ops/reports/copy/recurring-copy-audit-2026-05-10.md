# Peninsula Insider — Recurring Copy Audit
**Date:** 2026-05-10
**Scope:** Surfaces in `next/src/components/`, `next/src/layouts/`, `next/src/pages/` that use recurring operational claims (cadence, dispatch timing, contact, disclosure).
**Method:** Greps for known claim families, compared against `ops/copy/canonical.md`.
**Result:** **Real drift exists** in cadence wording. Concentrated in newsletter / dispatch surfaces.

## Headline finding

PI uses **at least 8 distinct phrasings** of the same operational fact ("weekly dispatch, lands Sunday") across components. Drift is highest on legacy v2/v3/v4 component variants but exists in production v6 surfaces too.

## Cadence wording — current variants

| Variant | Where | Status |
|---|---|---|
| `The dispatch lands Sunday.` | `components/v3/V3WeekendHero.astro` | ✅ on-spec |
| `The dispatch lands Sunday, before the bookings close.` | `components/CoverHero.astro` (one branch) | ✅ on-spec (longer form) |
| `The weekly dispatch lands.` | `components/CoverHero.astro` (other branch) | ⚠️ drops "Sunday" — fails the `dispatch.cadence.standard` canonical |
| `The briefing that arrives weekly.` | `components/Masthead.astro` (and a near-duplicate without trailing period) | ❌ off-spec — "briefing" is not the product noun, drops "Sunday" |
| `The briefing that arrives weekly` (no period) | `components/v2/Masthead.astro` | ❌ off-spec, plus inconsistent terminal punctuation |
| `Independent editorial. Weekly.` | `components/Masthead.astro` (mobile-nav tagline) | ⚠️ drops "Sunday"; ok as ultra-compact form but no canonical entry yet |
| `Dispatched weekly.` | `components/CoverHero.astro` (methodology line) | ✅ on-spec for `methodology.dispatch` |
| `Updated weekly` | `components/CoverHero.astro` (issue-label) | ❌ off-spec — implies content drift, not a dispatch |
| `Weekly dispatch` (next-dispatch label) | `components/CoverHero.astro` | ⚠️ acceptable as a label, but loses "Sunday" |

**Interpretation:**
- The canonical claim is `weekly + Sunday + dispatch`.
- Real surfaces variously drop one or two of those three signals.
- The most problematic drift is `Updated weekly` and `arrives weekly`, both of which weaken the "before the weekend" hook that ties the cadence to reader value.

## Dispatch title convention — drift status

The canonical title is **`Peninsula This Weekend — D[D] to D[D] Month`** with the two dates being the **upcoming** Sat–Sun.

Spot check on dispatch articles:
- `next/src/content/articles/peninsula-this-weekend-april-24.md` — title check needed
- `next/src/content/articles/peninsula-this-weekend-april-26.md` — title check needed
- `next/src/content/articles/peninsula-this-weekend-may-03.md` — title check needed

The cadence rule was tightened on `2026-04-27` (logged in `ops/editorial-jobs.json` `dispatchCadence.lockedAt`). Articles published before that date may use the old "covers the past weekend" convention. **Recommendation:** spot-check dispatches and either retitle or annotate with "originally published as ..." for pre-lock entries.

## CTA wording

| Variant | Where | Status |
|---|---|---|
| `Get the weekly dispatch` | `Masthead.astro`, `CoverHero.astro` (secondary CTA) | ✅ canonical `cta.signup.primary` |
| `Join the dispatch` | _(not currently used in repo)_ | reserved as `cta.signup.secondary` |
| `Subscribe` | `SubscribeForm.astro` (button label) | ❌ off-spec — too generic |
| `Sign up` | `NewsletterBlock.astro` (button label) | ❌ off-spec — corporate tone |

**Action:** the `Subscribe` and `Sign up` button labels in form components should be replaced with `Get the weekly dispatch` (or `Join` if button width is tight).

## Correction CTA wording

> `Business update or correction? Let us know: corrections@peninsulainsider.com.au`

This is canonical and consistent — added 2026-05-10 in commit `ea24895912` at template level. **Status: ✅ aligned.**

## Disclosure lines

Greps for `affiliate`, `featured partner`, `sponsored`, `advertising disclosure` come back **sparse**. Most pages don't carry visible disclosures yet.

The advertising pivot was 2026-04-30. Disclosure surfaces are now the trust mechanism. **Status: ⚠️ canonical strings exist in `ops/copy/canonical.md`, but adoption across the corpus is incomplete.** This is a Tranche 4 follow-up (item 12 — exception queue should track disclosure adoption per page).

## Contact lines

| Address | Where | Status |
|---|---|---|
| `corrections@peninsulainsider.com.au` | venue/evergreen/place/journal templates | ✅ correction CTA |
| `partners@peninsulainsider.com.au` | _(referenced in correction-handling.md, not yet on partners page)_ | ⚠️ needs verification on `/partners/` |
| `hello@peninsulainsider.com.au` | _(referenced in correction-handling.md)_ | ⚠️ needs verification on `/contact/` |
| `editorial@peninsulainsider.com.au` | _(press)_ | ⚠️ needs verification |

**Action:** confirm all four addresses are actually monitored. The correction loop assumes they are.

## Versioned-component drift specifically

This is a meta-finding. Drift is concentrated in:
- `components/v2/*.astro` — legacy
- `components/v3/*.astro` — legacy
- `components/v4/*.astro` — legacy

These are not currently rendered on production — they're staging / preview component implementations (see `ops/surface-map.md` for the surface boundary). But:
1. They cost grep noise and audit drag.
2. They get copy-pasted forward when someone builds a new variant.
3. They are still in the working tree, so they look authoritative.

**Recommendation:** Either retire the v2/v3/v4 component directories outright (if the corresponding staging routes are also retired), or move them under `next/src/components/_archive/` to make the staging-only intent grep-visible.

## Recommended actions

In priority order:

1. **Lock canonical** — `ops/copy/canonical.md` is now the source of truth (this report's reference). New copy reviewers point to it.
2. **Bring `Masthead.astro` and `CoverHero.astro` into line** — replace `arrives weekly` and `Updated weekly` with the canonical cadence string. Single PR, all surfaces.
3. **Replace `Subscribe` / `Sign up` button labels** with `Get the weekly dispatch` in `SubscribeForm.astro` and `NewsletterBlock.astro`.
4. **Verify the four contact mailboxes** are actually monitored. If not, decide which are real and edit `ops/correction-handling.md` accordingly.
5. **Move legacy v2/v3/v4 components** to an `_archive/` directory so future audits don't trip on them.
6. **Add `ops/scripts/copy-source-check.mjs`** in a future tranche to grep for forbidden variants in CI (Tranche 5 candidate).

## Coverage of canonical entries

| Canonical entry | Coverage | Drift |
|---|---|---|
| `dispatch.cadence.standard` | ~40% of surfaces | High |
| `dispatch.cadence.full` | ~20% | Medium |
| `dispatch.title.format` | locked in jobs.json, partial on articles | Medium |
| `contact.correction.line` | template-wide | None (just shipped) |
| `methodology.dispatch` | 1 surface | n/a |
| `verification.short` | partial | Low |
| `disclosure.*` | sparse | High — adoption gap |
| `cta.signup.primary` | ~50% (some forms still use generic labels) | Medium |
