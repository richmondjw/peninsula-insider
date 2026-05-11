# Publish Report: Peninsula This Weekend — 16 to 17 May 2026
_Published: 2026-05-11 | Dispatch date: manual catch-up (cron gap)_

---

## Deploy summary

| Step | Result |
|---|---|
| Article committed | ✓ `01d40d9d6f` — "Publish Peninsula This Weekend — 16 to 17 May (manual catch-up after cron gap)" |
| git push origin main | ✓ Pushed (after merge conflict resolution in build artefacts) |
| Build workflow triggered | ✓ Manual `gh workflow run deploy.yml` (last commit had [skip ci]; workflow_dispatch used as workaround) |
| GH Actions run | ✓ `25644908228` — Build & deploy site to GitHub Pages — **success in 2m38s** |
| Post-publish verification step | ✓ Passed (built into deploy.yml workflow) |

## Live verification

| Check | Result |
|---|---|
| `/whats-on/this-weekend/` title shows "16–17 May" | ✓ `<title>Peninsula This Weekend — 16–17 May | Peninsula Insider</title>` |
| `/whats-on/this-weekend/` H1 shows "16 to 17 May" | ✓ `<h1>Peninsula This Weekend — 16 to 17 May</h1>` |
| `/whats-on/this-weekend/` dek | ✓ "The quiet weekend. One forest, one forage, and the last few Sundays of the Shoreham market season." |
| `/journal/peninsula-this-weekend-may-16/` HTTP status | ✓ 200 |
| JSON-LD Event schema start/end dates | ✓ startDate: 2026-05-15T07:00:00.000Z (Fri) / endDate: 2026-05-17T13:59:00.000Z (Sun night AEST) |

## Live URLs

- Canonical (rolling): https://peninsulainsider.com.au/whats-on/this-weekend/
- Archive permalink: https://peninsulainsider.com.au/whats-on/this-weekend/archive/2026-05-11/
- Journal redirect: https://peninsulainsider.com.au/journal/peninsula-this-weekend-may-16/ (→ 200)

---

## Git notes

The merge into main required a conflict resolution step. The divergence was caused by two auto-generated build-artefact commits on local (`build: deploy site (auto) [skip ci]`) conflicting with three remote ops commits (`ops/run-log/daily-usage`). Conflicts were in `pagefind/pagefind-entry.json` and four `quick-note/*.html` files. Remote versions accepted via `git checkout --theirs`; these are build-generated outputs, not editorial content.

The final commit in the dispatch chain had `[skip ci]` in its message (the merge commit), which caused the deploy workflow to skip. Resolved by manually triggering `gh workflow run deploy.yml --ref main`.

**Lesson for future dispatches:** Ensure the dispatch commit lands as the HEAD at push time (no subsequent [skip ci] merge commits following it), or be ready to manually trigger the deploy workflow.

---

## 4 reports written

1. `reports/peninsula-this-weekend-research-2026-05-11.md`
2. `reports/peninsula-this-weekend-shape-2026-05-11.md`
3. `reports/peninsula-this-weekend-review-2026-05-11.md`
4. `reports/peninsula-this-weekend-publish-2026-05-11.md` (this file)
