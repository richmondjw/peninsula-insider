# Peninsula Insider — `next/` Astro scaffold

This directory is the **Phase 1 rebuild seed** for Peninsula Insider.

It is not the migrated site yet. It is the committable starting point that turns the roadmap decision into a real project:

- **Astro** as the site generator
- **JSON-first / content-collection-first** content model
- **Static output** for GitHub Pages / preview deploys during the bridge phase
- **Editorial architecture** that can grow into venue pages, place hubs, the Journal, itineraries, events, and the newsletter landing page

The legacy live site remains the flat HTML/CSS/JS build in the parent directory until cutover.

---

## Why this exists

The current site is visually competent but structurally wrong. Its content lives in brochure pages (`eat.html`, `wine.html`, `stay.html`) instead of atomic URLs. That blocks search growth, editorial depth, booking flows, map integration, and AI-assisted content production.

This scaffold is the first concrete move away from that architecture.

---

## Included in this scaffold

### Project config
- `package.json`
- `astro.config.mjs`
- `tsconfig.json`

### Content model
- `src/content/config.ts`

### Data layer docs
- `src/data/README.md`
- `src/data/venues/README.md`
- `src/data/places/README.md`
- `src/data/articles/README.md`

### Placeholder page
- `src/pages/index.astro`

All of this is intentionally minimal but real. A developer can run `npm install && npm run dev` here and start implementing from a believable base instead of from a blank folder.

---

## What is deliberately NOT here yet

Not because these aren't needed, but because they have not earned complexity yet:

- No Tailwind
- No MDX
- No CMS integration
- No map integration
- No search integration
- No design token system
- No routing templates for venues/places/articles
- No build adapter
- No content records yet

The rule is simple: **only add dependencies when the next concrete implementation step requires them.**

---

## Suggested Week 1 implementation order

1. Create a seed place record (`red-hill.json`)
2. Create a seed venue record (`tedesca-osteria.json`)
3. Build a single venue page route that renders the seed record
4. Build a single place hub route that aggregates venues by place slug
5. Add `homepage.json`
6. Split the homepage into the seven modules defined in the roadmap
7. Add the first Journal article in `src/data/articles/`

This sequence keeps the architecture honest and aligned with the roadmap.

---

## Commands

```bash
npm install
npm run dev
npm run build
npm run check
```

---

## Key references

- `../docs/roadmap-2026-04-09.md`
- `../docs/editorial-system-2026-04-09.md`
- `../docs/newsletter-product-2026-04-09.md`
- `../../reports/peninsula-image-shortlist-2026-04-09.md`

---

## Editorial / technical principles encoded here

1. **Atomic or nothing** — every entity gets its own URL.
2. **Content in git** — AI agents can author directly into the repo.
3. **Opinionated editorial voice** — structured data supports the story, it doesn't replace it.
4. **Bridge now, hard cutover later** — parallel build first, full migration later.
5. **Keep complexity deferred** — start with the smallest viable honest system.

---

Created 9 April 2026 as part of Peninsula Insider Phase 0 / early Phase 1 execution.
