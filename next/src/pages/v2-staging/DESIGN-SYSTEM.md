# Peninsula Insider — V2 Staging Design System

Reference for porting existing pages into the v2 magazine-editorial template.
All v2 pages live under `src/pages/v2-staging/<same-path-as-production>`.

---

## 1. Hard rules

- **Layout:** every page wraps in `../../layouts/v2/BaseLayout.astro` (or deeper, `../../../layouts/v2/BaseLayout.astro` for nested). BaseLayout already emits the utility bar, masthead, colophon, scroll animations JS, and subscribe-form JS — **do not** render those inline.
- **Props:** `<BaseLayout title="..." description="..." section="eat|stay|wine|explore|golf|spa|escape|whats-on|journal|''">`. `section` drives the masthead "aria-current" highlight.
- **Links:** every internal `href="/..."` MUST be prefixed with Astro's BASE_URL. Do it with `const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/'` and then `href={\`${base}eat/restaurant-name/\`}`. External links stay absolute.
- **Images:** same pattern — `src={\`${base}images/sourced/whatever.webp\`}`. No hardcoded `/images/...`.
- **Do not** import `Masthead.astro`, `Footer.astro`, `Breadcrumbs.astro` from the production `components/` folder. They are for the live site. Use only `components/v2/*` and plain HTML blocks.
- **Do not** load production CSS (`styles.css`, `mobile-fixes.css`). BaseLayout already loads `assets/v2/global.css` which contains the full v2 vocabulary.
- **Newsletter CTA:** drop `<NewsletterBlock />` (import from `../../components/v2/NewsletterBlock.astro`) above the closing `</BaseLayout>` for every content page. Hubs, articles, listicles, detail — all get the newsletter block.
- **Content fidelity:** preserve all existing page COPY (headlines, body, venue names, etc.). Re-skin the presentation, don't rewrite the content. Data-flow (`getCollection`, filters, sorts) stays identical — only swap the rendering markup.

---

## 2. Section vocabulary (classes)

Classes are already defined in `public/assets/v2/global.css`. Don't invent new ones — reuse these.

### Eyebrow / meta
- `.eyebrow` — small all-caps label. Modifier: `.eyebrow--ochre` for amber-brown accent colour.
- `.ornament` — inline decorative dot / em-dash wrapper.

### Hero (large cover image)
```html
<section class="hero">
  <div class="container">
    <div class="hero__frame">
      <div class="hero__above">
        <div class="hero__meta">
          <span class="hero__meta-tag">Eyebrow text</span>
          <span class="hero__meta-divider"></span>
          <span class="hero__meta-date">Dateline</span>
        </div>
        <h1 class="hero__headline">Headline with <em>italic</em> emphasis</h1>
        <p class="hero__dek">Deck / subheadline paragraph.</p>
        <div class="hero__byline">
          <span>— By <strong>The Editors</strong></span>
          <a href="#" class="hero__byline-read">Read <span style="opacity:.5;margin-left:.3rem;">8 min</span></a>
        </div>
      </div>
      <figure>
        <img class="hero__image" src="..." alt="..." loading="eager" fetchpriority="high">
        <figcaption class="hero__image-cap">
          <span>Caption left</span>
          <span>Credit right</span>
        </figcaption>
      </figure>
    </div>
  </div>
</section>
```
For a rotating image on the home page only, use `.hero__rotator` with multiple `.hero__slide` (`.is-active` on first).

### Shortlist (numbered editorial ranking)
```html
<section class="shortlist">
  <div class="container">
    <div class="shortlist__frame">
      <div class="shortlist__intro">
        <span class="eyebrow eyebrow--ochre">The Shortlist</span>
        <h2>Intro headline with <em>italic</em>.</h2>
        <p class="shortlist__intro-body">Intro paragraph.</p>
      </div>
      <ol class="shortlist__list" style="list-style:none;">
        <li class="sl-item">
          <span class="sl-item__num">01</span>
          <div class="sl-item__body">
            <div class="sl-item__meta">
              <span>Town</span><span class="sl-item__meta-sep"></span>
              <span>Fact</span><span class="sl-item__meta-sep"></span>
              <span>Fact</span>
            </div>
            <a href="..." class="sl-item__name">Venue name</a>
            <p class="sl-item__why">Why-paragraph.</p>
            <div class="sl-item__tags">
              <span class="sl-item__tag sl-item__tag--hat">Hat tag</span>
              <span class="sl-item__tag">Plain tag</span>
            </div>
          </div>
        </li>
        ... more li.sl-item ...
      </ol>
    </div>
  </div>
</section>
```

### Feature well (magazine card grid)
```html
<section class="well">
  <div class="container">
    <div class="well__head">
      <div>
        <span class="eyebrow eyebrow--ochre">Eyebrow</span>
        <h2 class="well__head-title">Section headline.</h2>
      </div>
      <a href="..." class="well__head-link">See all →</a>
    </div>
    <div class="well__grid">
      <article class="feat feat--lead">
        <img class="feat__image" src="..." alt="...">
        <div class="feat__body">
          <div class="feat__eyebrow">Department <span class="ornament">—</span> Tag</div>
          <a href="..."><h3 class="feat__title">Article title</h3></a>
          <p class="feat__excerpt">Excerpt.</p>
          <div class="feat__byline">
            <span>— By <strong>Byline</strong></span>
            <span class="feat__byline-sep">·</span>
            <span class="feat__byline-read">12 min read</span>
          </div>
        </div>
      </article>
      <article class="feat feat--std"> ... </article>
      ... 3-4 more feat--std cards ...
    </div>
  </div>
</section>
```

### Department / venue grid
```html
<section class="dept">
  <div class="container">
    <div class="dept__head">
      <div class="dept__titles">
        <span class="eyebrow eyebrow--ochre">Department · I</span>
        <h2 class="dept__title">Eat <em>&amp;</em> drink</h2>
        <p class="dept__dek">Intro.</p>
      </div>
      <a href="..." class="well__head-link">All → </a>
    </div>
    <div class="dept__grid">
      <article class="venue">
        <div class="venue__image" style="background-image:url(...)">
          <span class="venue__image-marker">Restaurant</span>
          <span class="venue__image-hat">Two hats</span>
        </div>
        <div class="venue__meta">
          <span>Red Hill</span><span class="venue__meta-sep"></span>
          <span>$$$$</span><span class="venue__meta-sep"></span>
          <span>Tasting only</span>
        </div>
        <a href="..."><h3 class="venue__name">Venue name</h3></a>
        <p class="venue__sig">Summary.</p>
      </article>
      ... more .venue cards ...
    </div>
  </div>
</section>
```
**Note:** `.venue__image` is a div with `background-image` inline style. For `<img>` children, fall back to `<div class="venue__image"><img src="..." alt=""></div>` — CSS will object-fit.

### Escape card (2-up weekend plans)
```html
<section class="escapes">
  <div class="container">
    <div class="escapes__head">
      <div>
        <span class="eyebrow eyebrow--ochre">Department · III</span>
        <h2 class="dept__title">Weekends <em>already planned</em>.</h2>
      </div>
      <a href="..." class="well__head-link">All escape plans →</a>
    </div>
    <div class="escapes__grid">
      <article class="escape">
        <div class="escape__image" style="background-image:url(...);">
          <span class="escape__image-tag"><strong>2</strong> nights</span>
        </div>
        <div class="escape__body">
          <span class="escape__eyebrow">Plan · Wine weekend</span>
          <a href="..."><h3 class="escape__title">Title.</h3></a>
          <p class="escape__dek">Dek.</p>
          <div class="escape__foot">
            <span>Ex Melbourne · Fri to Sun</span>
            <span class="escape__foot-read">Plan →</span>
          </div>
        </div>
      </article>
      ... up to 2 or 4 ...
    </div>
  </div>
</section>
```

### Place card strip
```html
<section class="places">
  <div class="container">
    <div class="places__head">...same pattern as escapes__head...</div>
    <div class="places__grid">
      <a href="..." class="place">
        <div class="place__image" style="background-image:url(...);"></div>
        <div class="place__name">Red Hill</div>
        <div class="place__count">42 venues</div>
      </a>
      ... 6 total ...
    </div>
  </div>
</section>
```

### Briefing (dark panel)
```html
<section class="briefing">
  <div class="container">
    <div class="briefing__head">
      <div class="briefing__titles">
        <div class="briefing__eyebrow">The Weekend Briefing</div>
        <h2 class="briefing__title">Date range — a <em>short brief</em>.</h2>
        <p class="briefing__dek">Dek.</p>
      </div>
      <a href="..." class="briefing__link">Full calendar →</a>
    </div>
    <div class="briefing__grid">
      <article class="brief-card brief-card--lead">
        <span class="brief-card__marker">Pick of the week</span>
        <span class="brief-card__tag">Saturday · Red Hill</span>
        <span class="brief-card__when">All day · from 8 am</span>
        <h3 class="brief-card__title">Title</h3>
        <p class="brief-card__body">Body.</p>
        <span class="brief-card__more">Details →</span>
      </article>
      ... 2 .brief-card items ...
    </div>
    <dl class="briefing__foot">
      <div class="bf-meta"><dt>The weather</dt><dd>Text <small>subtext</small></dd></div>
      ... 4-5 items ...
    </dl>
  </div>
</section>
```

### Editor's letter (prose + side image)
```html
<section class="letter">
  <div class="container">
    <div class="letter__frame">
      <div class="letter__body">
        <div class="letter__eyebrow">
          <span class="letter__eyebrow-rule"></span>
          <span class="eyebrow eyebrow--ochre">Editor's Letter</span>
        </div>
        <h2 class="letter__head">Headline with <em>italic</em>.</h2>
        <div class="letter__prose">
          <p>Body paragraph.</p>
          <blockquote class="pullquote">Pullquote.</blockquote>
          <p>More body.</p>
        </div>
        <div class="letter__sig">
          <span class="letter__sig-mark">—</span>
          <div>
            <div class="letter__sig-name">The Editors</div>
            <div class="letter__sig-role">Peninsula Insider</div>
          </div>
        </div>
      </div>
      <div class="letter__side">
        <img class="letter__image" src="..." alt="...">
        <figcaption class="letter__image-cap">Caption.</figcaption>
      </div>
    </div>
  </div>
</section>
```

### Contents / TOC
```html
<section class="contents">
  <div class="container">
    <div class="contents__head">
      <div>
        <span class="eyebrow eyebrow--ochre">In this issue</span>
        <h2>Section intro.</h2>
      </div>
      <div class="byline">meta · stats</div>
    </div>
    <div class="contents__grid">
      <div class="contents__dept">
        <div class="contents__dept-head">
          <span class="contents__dept-title">Eat &amp; Drink</span>
          <span class="contents__dept-num">I</span>
        </div>
        <a href="..." class="contents__item"><span class="contents__item-num">01</span><span>Title</span></a>
        ... more items ...
      </div>
      ... 3-4 depts ...
    </div>
  </div>
</section>
```

---

## 3. Archetype → which sections to combine

### Section hub (`/eat/`, `/stay/`, `/wine/`, `/explore/`, `/escape/`, `/journal/`, `/whats-on/`, `/places/`, `/golf/`, `/spa/`)
Typical order:
1. `<section class="hero">` — section cover (single image OK, no rotator)
2. `<section class="letter">` — short editor's note for the section (optional)
3. `<section class="shortlist">` — top picks if the section has a natural top-5
4. `<section class="dept">` — main grid of venues / articles / places for this section
5. `<section class="well">` — feature well for recent articles
6. `<section class="places">` or `<section class="escapes">` — cross-sell
7. `<NewsletterBlock />`

### Listicle / category page (`/eat/best-restaurants/`, `/stay/luxury/`, `/wine/best-cellar-doors/`, etc.)
1. `<section class="hero">` — hero with headline = listicle title
2. `<section class="letter">` — methodology intro
3. `<section class="shortlist">` — the numbered list (the core of the page)
4. `<section class="dept">` — related items (optional)
5. `<NewsletterBlock />`

### Detail page (`/eat/<slug>/`, `/stay/<slug>/`, `/places/<slug>/`, etc.)
1. `<section class="hero">` — venue/place hero image
2. `<section class="letter">` — editor's take (main prose)
3. Side panel (inside `letter__side` or new `<aside>`) — facts, address, price, booking link
4. `<section class="well">` — related items in the same section
5. `<NewsletterBlock />`

### Article / journal (`/journal/<slug>/`)
1. `<section class="hero">` — article cover
2. `<section class="letter">` — article body (can be multiple letter blocks or one long one; pull quotes inside `letter__prose`)
3. `<section class="well">` — "more like this" 3-5 related articles
4. `<NewsletterBlock />`

### Static (`/about/`, `/contact/`, `/privacy/`, `/terms/`, `/404/`)
1. `<section class="hero">` — page title hero (smaller, text-only is fine)
2. `<section class="letter">` — body prose
3. `<NewsletterBlock />` (skip for 404)

---

## 4. Typical file skeleton

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/v2/BaseLayout.astro';
import NewsletterBlock from '../../components/v2/NewsletterBlock.astro';

// EXACTLY preserve data-flow from the production page
const venues = (await getCollection('venues')).filter(/* same filter */);

const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : import.meta.env.BASE_URL + '/';
---
<BaseLayout title="Page title — Peninsula Insider" section="eat">

<section class="hero"> ... </section>
<section class="letter"> ... </section>
<section class="shortlist"> ... </section>
<section class="dept"> ... </section>

<NewsletterBlock />
</BaseLayout>
```

---

## 5. Porting rules of thumb

- **Keep all `getCollection` logic identical.** Only change how the data renders.
- **Swap cards:** production `<VenueCard venue={v}>` → v2 `<article class="venue">...inline markup...</article>`.
- **Swap breadcrumbs:** drop them entirely (v2 design doesn't use them) OR put them in `.hero__meta` as a tag.
- **Swap SectionHero:** replace with `<section class="hero">` block.
- **Swap FeatureArticle / ArticleCard:** replace with `<article class="feat feat--std">`.
- **Drop production-only components:** `WeekendPickerBlock`, `PillarNav`, `CoverHero`, `ClusterLinks`, `EventBadges` — replace with nearest v2 equivalent (shortlist / feat / briefing) or drop.
- **Pullquotes:** `<blockquote class="pullquote">` inside `.letter__prose`.
- **Numerals:** numbered items use two-digit padded strings ("01", "02"...), not raw integers.
- **Section numerals:** each dept section can have a Roman numeral (I, II, III, IV...) in the eyebrow.
- **Italic emphasis on headlines:** use `<em>` liberally — the Newsreader italic is a design feature.

---

## 6. Where each archetype lives

| Archetype | Example prod file | Port target |
|-----------|------------------|-------------|
| Section hub | `src/pages/eat/index.astro` | `src/pages/v2-staging/eat/index.astro` |
| Listicle | `src/pages/eat/best-restaurants.astro` | `src/pages/v2-staging/eat/best-restaurants.astro` |
| Detail slug page | `src/pages/eat/[slug].astro` | `src/pages/v2-staging/eat/[slug].astro` |
| Journal article | `src/pages/journal/<name>.astro` | `src/pages/v2-staging/journal/<name>.astro` |
| Static | `src/pages/about.astro` | `src/pages/v2-staging/about.astro` |

**Depth increase:** production pages import at `../../layouts/BaseLayout.astro`. V2-staging pages at the same nesting need the same `../../` (same depth); pages nested one more level need `../../../`. Same goes for `astro:content`, `components/`, `lib/`, etc.

---

## 7. Canonical reference

The home page at `src/pages/v2-staging/index.astro` is the full reference. When in doubt about markup structure, grep for the section there.

The original design mockup lives at `design-mockup/v2.html` — it contains every v2 class in a single file if you need to look up markup.

The full CSS vocabulary is in `next/public/assets/v2/global.css`.
