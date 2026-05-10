# Peninsula Insider — Post-publish Verification Checklist
**Last reviewed:** 2026-05-10
**Authority:** Operational requirement. No change is treated as "live" until external verification passes.

## When this gate runs

This gate runs **after every live mutation** (see `ops/operating-surface.md` for which jobs are `mutating-live`). It runs in two modes:

- **Automated** — `ops/scripts/post-publish-verify.mjs` invoked from `deploy.yml` (or manually via `node ops/scripts/post-publish-verify.mjs <urls...>`)
- **Manual** — for ad-hoc edits or when the automated gate is unavailable, complete the checklist below

## The gate

A change is **not "live"** until the following all pass on the externally-resolved URL (not the build artifact, not the preview):

### Required checks

1. **HTTP** — URL resolves, returns `200`, redirects (if any) terminate at the same canonical
2. **Canonical** — `<link rel="canonical">` is present and points to the externally-resolved URL
3. **Title** — `<title>` is present, non-empty, and not the generic site title
4. **Meta description** — `<meta name="description">` is present, non-empty, and ≥ 50 characters
5. **OpenGraph** — `og:title`, `og:description`, `og:image` all present
6. **Stylesheet** — at least one `<link rel="stylesheet">` resolves to `200` (catches the hashed-CSS regression that hit PI on 2026-04-13)
7. **Hero image** — for entity/article pages, `heroImage.src` resolves to `200` and is not the generic placeholder
8. **Target copy** — for content pages, the unique signature string (e.g. venue name, article title, dispatch weekend dates) appears in the rendered HTML
9. **No raw-HTML fallback** — page does not show the unstyled raw-HTML fallback that indicates a CSS-loading failure
10. **Sitemap inclusion** — page is in `sitemap.xml` (unless `sitemapExclude: true`)

### For dispatch / journal articles only

11. **Hero credit** — `heroImage.credit` is rendered visibly on the page
12. **`lastVerified` line** — visible verification date is rendered (≤ 90 days old for evergreen, ≤ 30 days for dispatches)
13. **Related links** — at least 3 internal links to other PI surfaces are present and resolve

### For event pages only

14. **Date is in future or "ongoing"** — past-only events are 404'd, not 200
15. **Booking URL or "no booking"** — explicit booking state is rendered, not blank

## Failure handling

If any required check fails:

1. **Block the live notification.** The change is not "live" yet — operators should not be told it succeeded.
2. **Write a `verification_result: "failed"` ledger entry** with the failing checks listed.
3. **Trigger rollback or re-deploy** — the operator decides which.
4. **Open an exception in `ops/exception-queue.md`** with the URL, failure mode, and timestamp.

## Manual run

For when the automated gate cannot run (e.g. ad-hoc Astro edit pushed directly):

```bash
node ops/scripts/post-publish-verify.mjs https://peninsulainsider.com.au/<path>/
```

The script exits `0` if all required checks pass, `1` otherwise. Use `--report=ops/reports/verify/<date>.md` to write a structured report.

## What this gate explicitly does NOT check

These belong to other gates and are intentionally out of scope here so this gate stays fast and operationally clear:

- Editorial quality, voice, tone — that is the QA gate, not post-publish
- Image relevance — that is `pi-daily-image-relevance-scan`
- Internal-link integrity — that is `pi-daily-link-audit`
- Governance fields like `lastVerified` freshness across the corpus — that is the governance audit (item 3 / item 5)
- Accuracy of factual claims — that is `pi-daily-accuracy-scan`

## Origin / why this gate exists

PI has been bitten more than once by deploy-success-but-publish-broken regressions:
- **2026-04-13:** stylesheet hash mismatch shipped the site as raw HTML for ~30 minutes before being noticed.
- **2026-05-09:** event hero image rendered the wrong asset; only caught by manual review the next morning.

Both would have been caught by checks 6 and 7 respectively. This gate exists to prevent the next one.
