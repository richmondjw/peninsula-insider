# `articles/`  -  The Insider's Journal

One Markdown file per article. Schema: `articles` in `../../content/config.ts`.

Articles use Astro's `content` collection type (not `data`), so they have YAML front-matter and a Markdown body. This is the one place in the content layer where James (or a contributor) drafts long-form in a writing-first format rather than a structured-data-first format.

## Filename convention

`YYYY-MM-DD-slug.md`  -  ISO date prefix + kebab-case slug.

```
articles/
  2026-05-07-field-guide-autumn-peninsula.md
  2026-05-14-tedesca-tractor-laura.md
  2026-05-21-long-lunch-list.md
  2026-05-28-flinders-not-red-hill.md
```

The date prefix is the *publish* date, not the draft date. Drafts live with a future date and `status: draft`.

## Front-matter template

```yaml
---
slug: field-guide-autumn-peninsula
title: "The Last Long Weekend Before Winter"
dek: "A field guide to autumn on the Mornington Peninsula, and why the locals still treat April like a secret."
author: james-richmond
houseByline: false
publishedAt: 2026-05-07
updatedAt: 2026-05-07
heroImage:
  src: /images/journal/2026-05-07/hero.jpg
  alt: "Vines turning on Mornington-Flinders Road, late April"
  credit: "Kristoferb / Wikimedia Commons"
  license: tmp-wikimedia
  caption: "Red Hill vines, autumn 2024"
format: editors-letter
tags: [autumn, weekend, red-hill, flinders, long-lunch]
relatedVenues: [tedesca-osteria, quealy-winemakers, ten-minutes-by-tractor]
relatedExperiences: [bushrangers-bay-walk]
readingTimeMinutes: 8
featured: true
status: published
---
```

## The body

After the front-matter, write the article in Markdown. Treat it like a magazine column, not a blog post. Short paragraphs, strong opening line, real opinion, specific venues named with backticks or links to atomic venue pages.

## The eight formats

Every article must declare a `format`. The format is how the article is categorised in the Journal index and used for rotation in the newsletter.

| Format | When to use |
|---|---|
| `editors-letter` | Personal, signed, first-person essays from the editor |
| `long-lunch-list` | Ranked restaurant-led curation tied to mood/occasion |
| `cellar-door-dispatch` | Wine-country reporting  -  releases, harvest, winemaker profiles |
| `stay-notes` | Accommodation reviews and planning-oriented stay roundups |
| `slow-peninsula` | Walks, beaches, wellness, rainy-day, shoulder-season |
| `insider-edit` | Decisive picks in a category  -  the strongest version of a list |
| `interview` | Q&A or profile pieces with chefs, winemakers, hoteliers |
| `investigation` | Longer investigative / opinion pieces |
| `service` | Utility pieces  -  "Where to go for…" / "What to do when…" |

## Status lifecycle

1. `draft`  -  James or contributor writing. Not in the build index.
2. `review`  -  Ready for editor review. Still not published.
3. `scheduled`  -  Approved, waiting for its Thursday slot.
4. `published`  -  Live on the site and included in builds.

Only `published` articles appear in the Journal index, newsletter, and homepage.

## The two-articles-in-the-bank rule

At any given point we keep two unpublished articles in `scheduled` state. The roadmap (§ 11) calls this out as a brand-preservation rule  -  if James's health flares or a week gets chaotic, the Thursday cadence still holds because there's a scheduled piece ready to auto-publish.
