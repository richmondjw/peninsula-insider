---
type: checkpoint
week: 2026-W35
checkpoint: restoration
status: OUT-OF-CYCLE — newsroom rhythm restored Thu 27 Aug 2026 after 10 dark weeks
owner: Sloane Beaumont
tags: [peninsula-insider, sloane, checkpoint, w35, restoration]
---

# Blocker Checkpoint — W35 (Restoration) · Thu 27 Aug 2026

**Filed:** Thursday 27 August 2026 (not the usual Wednesday 10:00 slot — this is the first newsroom artifact since W25, closing a ten-week gap)
**Filed by:** Sloane Beaumont, Managing Editor
**Authorisation:** James (publisher) has authorised urgent restoration of the weekly cycle as of today.

---

## Why this checkpoint exists off-cycle

The last locked slate on record is `slate-2026-W25.md` (Mon 15 Jun 2026). The last retro is `retro-2026-W25.md`. The last perf brief is `perf-2026-W25.md`. The last Editor's Letter is `letter-2026-25.md`. Nothing in `.claude/newsroom/slates/`, `retros/`, or `perf/` has been touched since 19 June 2026, apart from one automated `monthly-2026-08.md` report filed 2 August with `[skip-review]` in its commit message.

That is ten weeks with no Monday commissioning, no Wednesday checkpoint, no Friday retro or perf council, and no Editor's Letter. This checkpoint is the first step back into the rhythm, not a normal midweek check. It is scoped narrowly: identify what is actually broken, right now, on the live site, and get the current week moving again. It does not attempt to reconstruct or backfill the ten missing weeks.

---

## What has actually been happening while the newsroom was dark

The newsroom process stopped, but the site did not go static. A separate automated pipeline (daily insider picks, daily "content freshness" passes, quick notes, a "content factory" campaign system, and an automated monthly editorial report) has kept publishing on its own schedule, entirely outside slate, commissioning, checkpoint, or Vera's copy-edit sign-off gate:

- `next/src/content/articles/insider-picks-*.md` — roughly weekly, `author: "editorial"`, `houseByline: true`, agent-authored, tagged `[agent-authored] [skip-review]` in commit messages. Most recent: `insider-picks-2026-08-27.md`, "The Last Weekend of Winter," published 2026-08-27, genuinely covering the 29–30 August weekend (Epicurean Sunday lunch, Bushrangers Bay Track, Pt. Leo Estate sculpture park free-entry deadline).
- `next/src/content/quick-notes/` — daily weather notes and periodic editor notes, running continuously through August.
- A "content factory" campaign system (see `the-sorrento-off-season-weekend-2026-w33.md`, campaign `CMP-2026-W33-sorrento-off-season-weekend`) that generates itinerary pieces from a signal/fact base with a human thesis approval (logged as "james (via chat approval 2026-07-28)") but no masthead byline, no Margot structural edit, and no Vera sign-off. That specific piece has sat with `status: "review"` since 28 July — a full month unresolved, published nowhere.
- `.claude/newsroom/perf/monthly-2026-08.md` — an automated monthly report, filed 2 August, `[skip-review]`, listing five pieces "shipped" against a checklist (seasonal-research, thematic-gap-analysis, three long-forms, town-hub-refresh) with no names, no slate reference, and no connection to this newsroom's artifacts.

None of this is on any locked slate. None of it carries a masthead byline or a logged Vera sign-off. It is real, and some of it (the insider-picks cadence in particular) is genuinely useful, but it is a parallel content operation that has been substituting for editorial process rather than running through it. That substitution — not a lack of any content at all — is the real shape of the ten-week gap.

---

## Real blockers found, in order of severity

### 🔴 BLOCKER 1 — No fresh "Peninsula This Weekend" dispatch is live on the homepage for 29–30 August

The homepage weekend-picker module and the newsletter preview block in `index.html` both still point to `peninsula-this-weekend-jun-27` — "The solstice crowd has gone home... the final Sunday Sessions at the springs" — dated 27–28 June. That is exactly two months stale on the site's single highest-visibility weekend-planning surface. Confirmed by direct inspection of `index.html` (weekend-picker section, kicker text "This weekend · 27–28 June"; newsletter preview block, same slug).

The last article actually named in the `peninsula-this-weekend-*` slug series is `peninsula-this-weekend-jul-18.md`. Nothing in that series has published since 18 July.

**This is not a total content gap.** `insider-picks-2026-08-27.md` exists, is dated correctly for this weekend, and contains real, verified picks (Epicurean Sunday roast, Bushrangers Bay Track, Pt. Leo sculpture park). It went out through the automated pipeline, not through commissioning or Vera's gate, and the homepage weekend-picker module does not point to it — it points to the June dispatch. The gap is a commissioning-and-linking gap, not a research gap.
**Owner:** Iris (weekend dispatch is her standing beat) to write/adapt the properly commissioned "Peninsula This Weekend — 29 to 30 August" dispatch, using the already-verified facts in `insider-picks-2026-08-27.md` as source material — do not re-verify facts that are already confirmed, but do not invent anything beyond them either.
**Gate:** Vera copy-edit sign-off required before this replaces the June dispatch on the homepage and newsletter preview. Nothing publishes without it.

### 🔴 BLOCKER 2 — Homepage and What's On carry expired event cards

Confirmed by direct inspection:
- `index.html` nav mega-menu: "MPRG school holiday workshops" tagged "Editor's pick · Winter '26," described as "Starts 1 July" — that start date is nearly two months past.
- `whats-on/index.html`: multiple expired cards, per the fresh accuracy scan (`reports/peninsula-accuracy-scan-2026-08-27.md`) — MPRG workshops, Flinders truffle season, the Soil Cellar event (25 July), Stonier winter lunch, Youth Services school-holiday program.
- Cross-checked against the events source data: `helen-britton-story-so-far-mprg-2026.json` and `natalia-milosz-piekarska-sifted-light-mprg-2026.json` both carry `endDate: 2026-08-23` — four days past as of today.

This is the accuracy scan's top finding, logged as "needs approval" rather than auto-fixed, because swapping featured emphasis is an editorial call, not a mechanical one.
**Owner:** Iris (events/culture desk) to audit current live and upcoming events from `next/src/content/events/` and propose the replacement card set — what's actually on for the coming weeks, not a rebuild of the whole calendar.
**Gate:** Vera sign-off on factual accuracy (dates, venues, entry conditions) before Margot/engineering swap the cards live. This is a publish action, not a draft — it does not happen without sign-off.

### 🟡 BLOCKER 3 — A month-old auto-generated piece is stuck in limbo with no editorial owner

`the-sorrento-off-season-weekend-2026-w33.md` has `status: "review"` since 28 July. It was generated by the content-factory campaign system with a publisher-approved thesis but no masthead byline, no structural edit, and no Vera pass. It is neither published nor killed. This is a symptom of the same root cause as Blockers 1 and 2: content produced outside the newsroom process has nowhere to land once the process resumes.
**Owner:** Margot to review this piece this week — either it goes through a proper structural edit and Vera sign-off to publish, or it is formally archived. It does not sit in `review` indefinitely.
**Gate:** Vera sign-off before publish, as with every other piece.

---

## Non-blocker observations

- The daily quick-note (weather) and daily insider-picks cadence has held right through the ten-week newsroom gap without interruption. That is the one part of the system that did not need Sloane, Margot, Tyler, or Vera to keep functioning — worth naming honestly in the retro.
- No commissioning briefs exist in `.claude/newsroom/briefs/` — the folder does not exist in the repo. There is nothing to audit there; it is simply empty because nothing has been commissioned through this process since W25.
- Dex (Phase 2 performance analyst) was flagged as overdue as of the W25 retro (five consecutive analytics-blind councils). There is still no Dex. The W34 perf brief filed today is qualitative for the same reason.

---

## Summary

Two live blockers on the site right now: a two-month-stale weekend dispatch on the homepage, and expired event cards on the homepage nav and What's On page. Both are real, both are evidenced directly from the live HTML and the fresh accuracy scan, and both have named owners and a Vera sign-off gate on this week's slate. A third item — a stuck auto-generated piece — is lower severity but needs a decision this week so it stops being an orphan.

The larger finding is structural, not contained to this week: for ten weeks, an automated content pipeline has been substituting for editorial process rather than feeding it. That is the finding this checkpoint exists to surface. The slate below is scoped to get this week moving again, not to relitigate the ten weeks that are gone.

*— Sloane Beaumont, Managing Editor*
*Checkpoint filed: Thursday 27 August 2026*
