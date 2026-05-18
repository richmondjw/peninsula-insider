# Editing Peninsula Insider — Sanity Studio guide

This is Emma's daily-driver reference for editing the site in Sanity
Studio. Bookmark **https://peninsula-insider.sanity.studio/** and sign
in with the same Google/GitHub you use for everything else.

If you'd rather watch than read, ask James for a 15-min walkthrough —
the patterns are intuitive once you've done one venue and one article.

---

## What lives where

| You want to edit… | In Studio go to… |
|---|---|
| A venue (restaurant, winery, hotel, spa) | **Venue** in the left rail |
| A place (Sorrento, Red Hill, Cape Schanck, etc) | **Place** |
| A journal article | **Article** |
| An event listed in What's On | **Event** |
| A tour, tour operator, or tour package | **Tour** / **Tour operator** / **Tour package** |
| An experience (walk, beach, gallery, lookout) | **Experience** |
| An itinerary in /plans/ | **Itinerary** |
| The homepage cover image / headline | **Homepage cover** (singleton) |
| The mega-menu rails (whats-on, eat, wine, stay, etc) | **Mega-rail** (singleton) |
| A hub page hero (whats-on, places, eat-cafes) | **Page hero** |
| Masthead label, edition, footer links | **Site settings** (singleton) |

Use the search at the top of the left rail to jump straight to any
entity by name.

---

## The publish workflow

Every document has three states:

1. **Draft** — what you're currently editing. Only visible in Studio.
2. **Published** — what's on the live site.
3. **Draft over published** — you've made changes but haven't published
   yet. Live site still shows the old version; Studio shows yours.

The publish button is in the **bottom-right corner** of every document.
Hit it when you're ready to send a change live. Within ~30 seconds the
live page updates automatically (no rebuild needed).

To **unpublish** a document (e.g. a venue that's closed), open the dots
menu next to publish and choose Unpublish. The page returns 404 on the
live site within ~30 seconds.

To **revert** a draft you don't want to keep, dots menu → Discard changes.

---

## Editing a venue (the most common task)

1. **Venue** in the left rail → click the venue.
2. Up the top you'll see field groups: **Editorial · Location · Booking
   & price · Wine · FAQ · Authority · Dog friendly · Admin**. They split
   the form into manageable chunks; click between them.
3. Most of your daily work lives in **Editorial**: signature, why we go,
   editor note (the body prose), best for, if only one thing, pair with.
4. **Hero image** is in Editorial too. Click the image, then Replace to
   upload a new one. After upload you can drag the **hotspot** (the dot
   on the image) — this is the focal point that stays in frame when the
   image gets cropped for different layouts. Drag the dot to whatever
   should always be visible.
5. **Tags** are facets — mood/season/audience — used by hub filters.
   Pick from the list; don't invent new values (they won't filter).
6. **Wine** group only matters for wineries. Subregion, key varieties,
   visiting hours, on-site restaurant, etc.
7. **Admin** → Last verified is the date you last checked the facts on
   this page. Update it whenever you do.
8. **Publish**.

---

## Editing an article

1. **Article** in the left rail → click the article.
2. Field groups: **Editorial · Body · Related · SEO & FAQ · Admin**.
3. **Editorial** has title/dek/author/format/tags/featured/heroImage.
4. **Body** is where the prose lives. This is a rich text editor:
   - **Headings**: click the style dropdown (top-left of the editor)
     → H2 or H3.
   - **Bold / italic**: select text and use the buttons or Cmd+B / Cmd+I.
   - **Links**: select text → link button → paste URL. Internal links
     start with `/` (e.g. `/eat/alba-thermal-springs/`).
   - **Lists**: bullet or numbered.
   - **Custom embeds**: the **+** button at the bottom-left of the body
     editor lets you insert an Alert, Practical Callout, Cellar Door
     List, Dog Policy Table, Subregion Grid, or Variety Guide.
5. **Related** is where you link the article to venues / experiences /
   places / itineraries / other articles. Click into each field and
   search-pick from the list. These drive the "Related" rails at the
   bottom of the article.
6. **SEO & FAQ** is for the FAQPage schema — questions and answers
   editors actually expect readers to have.
7. **Admin → status** controls visibility:
   - `draft` — not on live site, not in search
   - `review` — same as draft, used to mean "this is ready to look at"
   - `scheduled` — same, used when planning ahead
   - `published` — live
8. **Publish**.

### A note on the 20 articles with custom embeds

The migration converted the 20 .mdx articles to Portable Text. Most
fields came through perfectly. The four items-array embeds —
**CellarDoorList**, **DogPolicyTable**, **SubregionGrid**, **VarietyGuide**
— came across with their raw JSX `items={…}` data stored as JSON in an
`itemsJson` / `rowsJson` field on the embed.

The site renders these correctly today (the JSON is read back into the
component). If you want to *edit* the items in one of these embeds,
you'll need to edit the JSON directly for now. Ask James for help if
this is unclear — we may add per-item field editors in a future Studio
update.

Article slugs affected: cape-schanck-guide, dog-friendly-wineries,
mornington-peninsula-winery-tour, where-to-eat-mornington-peninsula, plus
a few hub guides.

---

## Replacing the homepage cover image

1. **Homepage cover** in the left rail.
2. The document has an **Active scene** number (0-based) and an array of
   scenes. The active scene is what visitors see.
3. To swap which scene is live: change **Active scene** from 0 to 1, 2,
   or 3. Publish. Live site updates within ~30 seconds.
4. To replace the image in a scene: expand the scene → click the image
   → Replace.
5. To rewrite the headline or dispatch text: expand the scene and edit
   the fields directly.

This replaces the old right-click-on-the-cover inline editor. It's
slower for one-off image swaps but eliminates the brief image flicker
visitors used to see, and gives you the headline + dispatch + caption
all in one place.

---

## Managing events

Events are mostly auto-discovered by a scraper today (~76 of 91 events
in the dataset). Editorial overlay fields — editor verdict, kids grade,
lens tags, etc — are in the **Editorial overlay** group at the top of
the event form. Those are what you'd typically touch.

**Important caveat**: the scraper still writes to JSON files, not
Sanity. Until James migrates that pipeline (separate workstream), if you
edit a scraper-discovered event in Sanity, the next scraper run will
overwrite your changes. **Safe** to edit:

- Events you created from scratch in Studio (no scraper origin)
- The editorial overlay fields of scraper events (`editorVerdict`,
  `whyWeCare`, `editorNote`, `kidsGrade`, `lens`, etc) — these are
  preserved across re-imports per the existing config

**Unsafe** (until pipeline migrates):

- The machine-imported fields (title, dates, venue, source URL, etc)
  on scraper-origin events. Edit those in the source spreadsheet
  instead, or ask James.

---

## Image library

**Sanity → Tools → Media** shows every image asset in the dataset, with
search by filename and tags. Hover over an image to see which documents
reference it.

To reuse an image across multiple documents: replace the image, choose
**Select from existing assets** instead of uploading, and pick from the
library.

Every image has:
- **Alt text** — required, describe what's in the photo
- **Credit** — photographer or source. Use `jem` for photos you and
  James shot — templates render that as "Photograph by jem".
- **License** — `venue-media-kit`, `original-commissioned`,
  `wikimedia-cc-by`, `tmp-unsplash` (placeholder, replace when possible).
- **Caption** — optional, shown beneath the image on detail pages.

---

## Asking for help

- "I can't find a venue / can't open a document" → Sanity URL, then
  paste the doc title in chat
- "The site doesn't reflect my change" → wait 60 seconds, then check
  the publish button actually said "Published" (not "Publish")
- "I'm not sure if I should be editing this in Studio or JSON" → ask
  before changing anything that looks scraper-imported
- Anything bigger → grab James for 10 min

---

## What changed compared to the inline editor

| Before | Now |
|---|---|
| Right-click image on the live site → upload | Open the document in Studio → replace image |
| Click-to-edit prose on the live site | Edit in Studio's rich text editor |
| Edits sometimes flickered on load | Edits ship as a single SSR render — no flicker possible |
| Each page had its own override state | One document per entity, one source of truth |
| Hard to find what you edited last | Studio's revision history shows every change with timestamps |

The Studio is slower for one-click "I just want to fix this typo on the
live site" edits. It's faster for everything else — adding a venue,
authoring an article, managing the event slate, restructuring a place
page. The trade was deliberate.
