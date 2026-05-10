# Peninsula Insider — Canonical Recurring Copy
**Last reviewed:** 2026-05-10
**Authority:** Single source of truth for repeated operational claims that appear across multiple PI surfaces. If a surface uses a recurring claim and it disagrees with this file, this file wins and the surface should be brought into line.

## Why this file exists

Recurring copy drifts. PI was bitten by this on 2026-04-19 (newsletter cadence wording was inconsistent across the homepage rail, masthead nav, footer, subscribe form, and the v3 weekend hero). The fix at the time was per-surface — this file prevents the same drift class from recurring.

## How to use this file

When writing copy that **repeats a system fact** (cadence, contact email, dispatch timing, methodology claim, disclosure), check here first. If the canonical entry doesn't fit your surface, propose an extension here rather than diverging silently. Reviewers should reject PRs that introduce a new variant of an existing claim.

This file is **not** a style guide. Voice / tone / framing remain editorial decisions per surface. This file controls *operational facts*, not *editorial expression*.

---

## Cadence facts

### `dispatch.cadence.short`
> **Weekly. Sunday.**

For places where space is tight (mobile nav badge, footer sub-line, subscribe form helper text).

### `dispatch.cadence.standard`
> **The weekly dispatch lands Sunday.**

Default form. Use on hero blocks, newsletter hubs, masthead taglines.

### `dispatch.cadence.full`
> **The weekly dispatch lands Sunday morning, before the weekend's bookings close.**

For pages that need to communicate the *value* of the cadence (newsletter signup page, methodology page, founders prospectus). The "before bookings close" phrase ties the cadence to reader benefit.

### `dispatch.cadence.what-it-covers`
> **One pick, one weather-proof backup, one thing to skip — for the weekend ahead.**

Standard description of dispatch content shape. Use after a cadence statement when more context is helpful.

### Anti-patterns (do NOT use)
- ❌ "The briefing that arrives weekly" — drops the Sunday signal, which is the operational hook for "before the weekend"
- ❌ "Updated weekly" — implies content drift, not a dispatch
- ❌ "Daily" / "regular" / "frequent" — not what PI actually does
- ❌ Ending with "every week!" or any exclamation — not house tone
- ❌ Em-dashes anywhere — house rule (`feedback_no_em_dashes.md`)

---

## Title convention for the dispatch

### `dispatch.title.format`
> **Peninsula This Weekend — D[D] to D[D] Month**

Where the two dates are the **Saturday and Sunday of the weekend covered**, which is the weekend *immediately following* the Sunday publish date (publish-date + 6 days = Saturday, +7 = Sunday).

Example: a dispatch published Sunday 2026-05-10 covers Saturday 2026-05-16 and Sunday 2026-05-17, so the title is `Peninsula This Weekend — 16 to 17 May`.

This is locked in `ops/editorial-jobs.json` under `dispatchCadence.titleConvention`. Anywhere else this rule appears, it must match exactly.

### Anti-patterns
- ❌ Using the weekend immediately *before* the publish date (the dispatch publishes ahead, not in arrears)
- ❌ Using a single date or date range that doesn't span Sat–Sun
- ❌ Using "May 16" instead of "16 May" (PI uses day-month order)

---

## Contact / correction lines

### `contact.correction.line`
> **Business update or correction? Let us know: [corrections@peninsulainsider.com.au](mailto:corrections@peninsulainsider.com.au)**

Use on venue, evergreen, place, and journal-guide templates. Live as of commit `ea24895912` (2026-05-10).

### `contact.correction.short`
> **Spotted something wrong? [corrections@peninsulainsider.com.au](mailto:corrections@peninsulainsider.com.au)**

Compact alternative for sidebar / footer / repeated-block surfaces.

### `contact.partners.line`
> **Are you a Peninsula operator? Tell us about it: [partners@peninsulainsider.com.au](mailto:partners@peninsulainsider.com.au)**

Use on partner-facing surfaces. Avoid mixing into reader-facing copy.

---

## Trust / methodology lines

### `methodology.short`
> **Local. Independent. Selective. Every venue visited. Every opinion earned.**

Compact methodology hook. Use on cover blocks, prospectus, partner-facing surfaces.

### `methodology.dispatch`
> **An editorial product about one small, well-defined place. Every venue visited. Every opinion earned. Dispatched weekly.**

Longer methodology hook for the dispatch hub and cover blocks.

### `methodology.recommendation-not-fact`
> **Recommendations are editorial judgement. Facts on this page were verified [DATE].**

For pages where the distinction between recommendation and fact matters operationally (e.g., where a venue has formally disputed framing). Pair with the visible `lastVerified` date.

---

## Verification stamps

### `verification.short`
> **Last verified: D Month YYYY**

Standard form on entity / evergreen pages. Date format is the same as dispatch titles (day-month-year, no leading zero).

### `verification.fresh-window`
- Evergreen pages: refresh `lastVerified` ≤ every **365 days** (governance error if older)
- Dispatch / weekend articles: refresh ≤ every **30 days**
- Partner-claim pages: refresh ≤ every **180 days**

These thresholds are encoded in `ops/scripts/governance-audit.mjs`. Update both this file and the audit script if the policy changes.

---

## Disclosure / commercial lines

### `disclosure.affiliate`
> **This page contains affiliate links. We earn a small commission if you book through them. It does not change our recommendations.**

Mandatory on any page with affiliate links. Render in the page's footer-disclosure block, not inline.

### `disclosure.featured-partner`
> **Featured partner. Editorial standards apply identically to partner and non-partner placements.**

Use only on entity pages flagged `featuredPartner: true`. The disclosure must be on the page, not buried in a /partners/ link.

### `disclosure.advertising`
> **Sponsored. Editorial team had no role in writing this section.**

Reserved for paid editorial slots. PI's policy is to keep sponsored copy structurally distinct from editorial copy — same disclosure goes on every sponsored unit.

These three are the only currently-required disclosure forms. The advertising pivot of 2026-04-30 means commercial placements are core revenue, but the firewall is preserved by **disclosure**, not by absence.

---

## Newsletter signup CTAs

### `cta.signup.primary`
> **Get the weekly dispatch**

Default button label across mast / nav / hero. Already used in masthead and v3 weekend hero — treat this as locked.

### `cta.signup.secondary`
> **Join the dispatch**

Compact alternative when the word "weekly" is already in nearby copy.

### Anti-patterns
- ❌ "Subscribe" (too generic — drops the editorial framing)
- ❌ "Sign up for our newsletter" (corporate tone — not house voice)
- ❌ "Stay in the loop" (cliché — explicitly off-brand)

---

## Maintenance rule

When you change a canonical entry here:
1. Update the entry below the heading (do not delete entries — write a deprecation note instead).
2. Search the codebase for surfaces that used the old form and bring them into line in the same PR.
3. Update `ops/scripts/copy-source-check.mjs` if the entry is one of the gated checks.

When a new recurring claim appears (i.e. you find yourself writing the same operational fact in a third place), promote it to this file before merging.

## Coverage

This file currently controls 7 claim families:
1. Dispatch cadence
2. Dispatch title convention
3. Contact / correction lines
4. Methodology hooks
5. Verification stamps
6. Disclosure / commercial lines
7. Newsletter signup CTAs

Future candidates (not yet promoted):
- About-page founders blurb (currently varies between pages)
- Map/itinerary footer disclaimer
- Pass / membership pricing wording
