# Markdown Article Image Debt — Audit & Scope Call

**Date:** 2026-05-19
**Author:** PR H audit
**Status:** Closed — no debt, no action required

## TL;DR

There is **no inline image debt** in the markdown article collection. Zero articles
have hardcoded `<img>`, `![](...)`, `<Image>`, or `<picture>` tags in their bodies.
Every image reference lives in YAML frontmatter (`heroImage.src`), which is already
schema-validated and structurally separable from prose.

No migration work is justified at this time. This document exists to formally take
"editable inline images in markdown articles" off the to-do list.

## Audit Method

Grepped `next/src/content/articles/**/*.{md,mdx}` for every form of inline image
reference (`![...](...)` markdown syntax, `<img src=...>` HTML, `<Image>` and
`<picture>` Astro/JSX components). Cross-checked the `/images/` and `.webp|.jpg|.png|.avif`
matches that did surface — every one of them was inside the frontmatter `heroImage`
block, not the body.

Also recorded git-log freshness (last touched within 90 days) as a staleness signal.

## Numbers

| Metric | Value |
|---|---|
| Total markdown articles | 175 (155 `.md` + 20 `.mdx`) |
| Articles with inline `![](...)` body images | **0** |
| Articles with `<img>` body tags | **0** |
| Articles with `<Image>` / `<picture>` components | **0** |
| Articles with frontmatter `heroImage.src` | ~all (structured, not "hardcoded body") |
| Articles modified in last 90 days | 175 / 175 (100% active) |
| Sanity-already-migrated overlap | N/A — not relevant; no body images to migrate |

## Why This Is The Right Outcome

1. **Editorial discipline already paid off.** The collection was built with a
   `heroImage` frontmatter contract from day one. Authors never had a path to
   embed inline images mid-prose, so the debt never accrued. Frontmatter images
   are schema-validated against `next/src/content/config.ts` and surface through
   the page template, not through markdown rendering.

2. **Frontmatter `heroImage` is not the same problem.** Making `heroImage.src`
   editor-replaceable is a separate, well-scoped task — the right tool is the
   existing CMS admin inline-edit layer (see PR #91 / `project_pi_cms_admin_hybrid`),
   not a remark plugin or `<MarkdownImage>` shim.

3. **The broader markdown → Sanity migration (`ops/sanity-migration/PLAN.md`)
   subsumes this.** When markdown articles are decommissioned, their `heroImage`
   refs go through the Sanity asset pipeline. Building a parallel editing surface
   for an asset class that has no usage would be pure overhead.

## Recommendation

**No action.** Close out the "editable images in markdown articles" thread.

If a future editorial workflow introduces inline body images to markdown
articles, this audit should be re-run before any are merged — the cleanest
intervention point is a content-collection schema check or a markdown linter,
not after-the-fact migration tooling.

## Followups (not blocking)

- `heroImage.src` editability: track under the CMS admin hybrid layer
  (`project_pi_cms_admin_hybrid`), where right-click image replace already exists
  on Astro pages and can extend to article hero slots.
- Sanity migration progress: `ops/sanity-migration/PLAN.md` remains the canonical
  consolidation plan.
