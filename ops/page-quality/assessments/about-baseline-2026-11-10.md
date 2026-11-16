# About page baseline, 10 November 2026

**URL:** `https://peninsulainsider.com.au/about/`
**Revision reviewed:** `3a4796cbea68af42ee715df49cf1f73adfa30d37`
**Tier:** T1
**State:** provisional, in remediation
**Visitor task:** understand who publishes Peninsula Insider, how recommendations are chosen and checked, how commercial work is separated, and how to correct an error.

## Independent baseline

Three reviewers submitted before reconciliation:

- Visual and UX: **83.5/100**
- Editorial and trust: **82.25/100**
- Accessibility and technical: **94/100**

No reviewer observed a hard-gate failure. Verified Visit Victoria records support both displayed photographs. Acceptance remains provisional because direct spoken assistive-technology evidence and field performance evidence are not complete.

## Reconciled deductions

1. Claims about continuing checks and editorial method were not auditable on the page.
2. The method described principles but did not show the evidence trail, trade-off or response to unconfirmed information.
3. Ownership and commercial-policy routes were not sufficiently explicit.
4. The first screen lacked a clear route into the publication's current picks.
5. Skip-link activation changed the fragment but did not reliably move programmatic focus to the main landmark.
6. Mobile Lighthouse performance was 85 with LCP 3.8 seconds. CLS was 0 and automated accessibility was 100; these automated results do not replace direct assistive-technology review.

## Bounded iteration

**Hypothesis:** an attributable checking standard, explicit ownership and commercial links, a complete worked judgement, a first-screen action and a focusable main landmark will materially improve trust, task completion and keyboard continuity without changing page identity or image rights.

**Acceptance tests:**

- Process claims distinguish source verification from editorial judgement.
- The page states what happens when evidence cannot be confirmed and dates the method review.
- Ownership, terms, partner information and correction routes are one step away.
- The worked example includes reason, audience, trade-off and pre-travel check.
- Skip-link activation can place focus on `#main-content`.
- Desktop and 390px mobile rendering, keyboard order, source checks and production build pass.
- Independent regrade remains required; no 99/100 claim may be inferred from implementation or automated checks.

**Rollback:** revert the About-page and shared-main changes if they introduce navigation, accessibility, layout or factual regressions.

**Evaluation date:** 10 November 2026.

## Candidate verification, 11 November 2026

- Full production build passed after the dated What's On feed regenerated within the same calendar day.
- Keyboard activation of “Skip to content” moved focus to `#main-content`.
- Controlled Puppeteer checks at 320, 360, 375, 390 and 412 CSS pixels found no horizontal page overflow. An initial Windows headless screenshot concern was independently withdrawn after DOM-level verification.
- Independent candidate scores were **92.75/100** (visual/UX), **95.5/100** (editorial/trust) and **97.75/100** (accessibility/technical).
- No factual, image-rights, blocked-task or serious-accessibility hard gate was observed.
- The candidate does **not** yet qualify as 99/100. Direct spoken screen-reader acceptance, live release verification and production or field performance evidence remain open.

## Exact-live regrade and bounded iteration, 16 November 2026

The candidate was verified on production revision `aecab892517846e6a759421054854ba087b7f510`, deployment run `43800174429`. Three independent exact-live scores were **94.75/100** (visual/UX), **97.75/100** (editorial/trust) and **98.75/100** (accessibility/technical). No reviewer observed a hard-gate failure. The conservative programme score is therefore **94.75/100, provisional**; it is not a 99 pass.

The visual reviewer identified tightly tracked display headings and weak persistent feedback in the on-page navigation. The bounded follow-up:

- relaxes page-scoped display tracking from as tight as `-0.065em` to `-0.02em`–`-0.035em`;
- raises the worked-verdict display line-height from `1.42` to `1.45`;
- gives the on-page links a visible selected state and an `aria-current="location"` state driven by the visible target section.

The full production build passed, including the image, content, link, event, provenance, claim-support and agent-boundary gates. Controlled browser checks at 390px and 1440px found no horizontal overflow or console errors, and scrolling to the independence section selected only “Our independence” as the current location.

Direct spoken screen-reader evidence remains unavailable. This iteration must be released and independently regraded on its exact live revision; no score increase or 99 acceptance is inferred from the implementation or local checks.
