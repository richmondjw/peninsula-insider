import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute, F as Fragment } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$SectionHero } from './SectionHero_BlToWmif.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { r as routeSlug, g as formatLabel, h as heroBackgroundStyle } from './editorial_CD_uAC75.mjs';

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Index;
  const articles = (await getCollection("articles", ({ data }) => data.status === "published")).sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const featured = articles.find((article) => article.data.featured) ?? articles[0];
  const featuredSlug = featured ? routeSlug(featured) : null;
  const latest = articles.filter((article) => routeSlug(article) !== featuredSlug);
  const rest = latest;
  const pickSlugs = [
    "the-sorrento-weekend",
    "the-market-saturday",
    "the-peninsula-beach-swimming-guide"
  ];
  const picks = pickSlugs.map((slug) => rest.find((article) => routeSlug(article) === slug)).filter((article) => Boolean(article));
  const formatOrder = [
    {
      key: "weekend-picker",
      title: "Weekend Picker",
      intro: "Our Wednesday 6pm Peninsula This Weekend dispatches: one pick, one weather-proof backup, one thing to skip."
    },
    {
      key: "service",
      title: "Service pieces",
      intro: "Useful before you book. Weekend shapes, rainy-day plans, family trips, and the questions readers actually ask."
    },
    {
      key: "long-lunch-list",
      title: "Long lunch lists",
      intro: "The daylight-dining playbook. Which tables earn the drive and which do not."
    },
    {
      key: "cellar-door-dispatch",
      title: "Cellar door dispatches",
      intro: "The producers worth the appointment, the wines worth the cellar, and the arguments happening in the vines."
    },
    {
      key: "stay-notes",
      title: "Stay notes",
      intro: "The rooms, cottages, and villas that change the shape of a weekend."
    },
    {
      key: "insider-edit",
      title: "Insider edits",
      intro: "Shortlists with a point of view  -  the places locals rotate through, not the ones brochures push."
    },
    {
      key: "slow-peninsula",
      title: "Slow Peninsula",
      intro: "Field notes from the quieter end of the region. Weather, light, time, and the pieces no one is rushing."
    },
    {
      key: "editors-letter",
      title: "Editor's letters",
      intro: "Where the issue is framed  -  what changed, what matters, what to read first."
    },
    {
      key: "interview",
      title: "Interviews",
      intro: "Long-form conversations with the people building the Peninsula worth writing about."
    },
    {
      key: "investigation",
      title: "Investigations",
      intro: "Reporting with edges. Where we spend the extra weeks."
    }
  ];
  const groups = formatOrder.map((group) => ({
    ...group,
    articles: rest.filter((article) => article.data.format === group.key)
  })).filter((group) => group.articles.length > 0);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Journal" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Mornington Peninsula Journal · Peninsula Insider", "description": "Long-form Peninsula journalism, service pieces, and editorial dispatches — written by editors who live on the Peninsula.", "section": "journal", "canonical": "https://peninsulainsider.com.au/journal" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems })} ${renderComponent($$result2, "SectionHero", $$SectionHero, { "eyebrow": "Journal", "subEyebrow": "Dispatches · lists · essays · stay notes", "title": "Long-form notes from a region best read <em>slowly.</em>", "dek": "The Journal is where Peninsula Insider moves past directories and into voice. Browse by format below, or jump straight to the three pieces doing the most work right now.", "gradient": "journal", "visualLabel": "Long lunch notebook · cellar door dispatches", "heroImage": "/images/sourced/journal-hub-hero-01.webp" })}  ${maybeRenderHead()}<section class="editors-desk" aria-label="Editor’s note"> <div class="container"> <div class="editors-desk__inner"> <div class="editors-desk__col"> <p class="label label--accent">From the editor’s desk</p> <h2 class="editors-desk__title">What we’re writing about this season</h2> <p class="editors-desk__body">Autumn on the Peninsula is vintage season on the ridge and fireplace-lunch season everywhere else. The Journal is leaning into the service pieces that help you build a weekend around those two moods  -  plus a cellar-door dispatch series, honest stay notes, and the rolling <em>Peninsula This Weekend</em> brief refreshed each week.</p> <p class="editors-desk__body">Every piece below answers a real question a weekend visitor actually asks. If we can’t finish the sentence <em>“Read this before you…”</em> then we don’t publish it.</p> </div> <div class="editors-desk__col editors-desk__formats"> <p class="label">Formats in this issue</p> <ul class="editors-desk__format-list"> <li><strong>Service pieces</strong> -  the practical guides: weekend shapes, rainy-day plans, family trips</li> <li><strong>Long lunch lists</strong> -  the daylight-dining playbook</li> <li><strong>Cellar door dispatches</strong> -  the wines, the producers, the arguments in the vines</li> <li><strong>Weekend Picker</strong> -  one pick, one backup, one skip  -  every Wednesday 6 pm</li> <li><strong>Stay notes</strong> -  the rooms that change the shape of a weekend</li> <li><strong>Insider edits</strong> -  shortlists with a point of view</li> </ul> </div> </div> </div> </section>  <section class="planning-guides" aria-label="Planning guides"> <div class="container"> <div class="planning-guides__header"> <p class="label label--accent">Planning guides</p> <h2 class="planning-guides__title">Read this before you book.</h2> <p class="planning-guides__dek">Service pieces and seasonal guides for the specific weekend you're trying to build. Each one answers a real question a weekend visitor actually asks.</p> </div> <ul class="planning-guides__grid"> <li><a href="/journal/mornington-peninsula-itinerary"><span class="planning-guides__eyebrow">Itinerary</span><span class="planning-guides__name">The best 3-day Mornington Peninsula plan</span></a></li> <li><a href="/journal/mornington-peninsula-day-trip"><span class="planning-guides__eyebrow">Day trip</span><span class="planning-guides__name">Mornington Peninsula day trip from Melbourne</span></a></li> <li><a href="/journal/mornington-peninsula-hot-springs-guide"><span class="planning-guides__eyebrow">Hot springs</span><span class="planning-guides__name">The Peninsula hot springs guide</span></a></li> <li><a href="/journal/mornington-peninsula-winery-tour"><span class="planning-guides__eyebrow">Cellar doors</span><span class="planning-guides__name">Self-drive winery tour — the route that works</span></a></li> <li><a href="/journal/mornington-peninsula-with-kids"><span class="planning-guides__eyebrow">Family</span><span class="planning-guides__name">Mornington Peninsula with kids — the honest guide</span></a></li> <li><a href="/journal/dog-friendly-mornington-peninsula"><span class="planning-guides__eyebrow">Dogs</span><span class="planning-guides__name">Dog-friendly Peninsula — beaches, cafés, stays</span></a></li> <li><a href="/journal/mornington-peninsula-in-autumn"><span class="planning-guides__eyebrow">Season</span><span class="planning-guides__name">The Peninsula in autumn — vintage and fires</span></a></li> <li><a href="/journal/mornington-peninsula-in-winter"><span class="planning-guides__eyebrow">Season</span><span class="planning-guides__name">The Peninsula in winter — what still runs</span></a></li> <li><a href="/journal/free-things-to-do-mornington-peninsula"><span class="planning-guides__eyebrow">Budget</span><span class="planning-guides__name">Free things to do on the Peninsula</span></a></li> <li><a href="/journal/best-brunch-mornington-peninsula"><span class="planning-guides__eyebrow">Eat</span><span class="planning-guides__name">Best brunch on the Mornington Peninsula</span></a></li> <li><a href="/journal/mornington-peninsula-wedding-venues"><span class="planning-guides__eyebrow">Wedding</span><span class="planning-guides__name">Peninsula wedding venues worth the weekend</span></a></li> <li><a href="/explore/best-walks"><span class="planning-guides__eyebrow">Walks</span><span class="planning-guides__name">Best walks on the Mornington Peninsula</span></a></li> </ul> </div> </section> ${featured && renderTemplate`<section class="feature feature--compact"> <div class="container"> <div class="feature__inner"> <div class="feature__image-block feature__image-block--bay" aria-hidden="true"${addAttribute(heroBackgroundStyle(featured.data), "style")}> <div class="feature__image-overlay"></div> <span class="feature__image-tag">Lead story</span> </div> <div class="feature__content"> <div class="feature__label"> <span class="label label--accent">${formatLabel[featured.data.format] ?? featured.data.format}</span> </div> <h2 class="feature__title"> <a${addAttribute(`/journal/${featuredSlug}`, "href")}>${featured.data.title}</a> </h2> <p class="feature__dek">${featured.data.dek}</p> <div class="feature__byline"> ${featured.data.readingTimeMinutes && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <span class="feature__byline-name">${featured.data.readingTimeMinutes} min read</span> <span class="feature__byline-dot" aria-hidden="true"></span> ` })}`} <span class="feature__byline-meta">${featured.data.publishedAt.toLocaleDateString("en-AU", { month: "long", day: "numeric", year: "numeric" })}</span> </div> <a${addAttribute(`/journal/${featuredSlug}`, "href")} class="feature__cta">Read the piece →</a> </div> </div> </div> </section>`}${picks.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Editor's picks</p> <h2 class="venues__title">Three pieces to read first</h2> <p class="venues__sub">If you only have 20 minutes with the Journal, start here.</p> </div> </div> <div class="venues__grid"> ${picks.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`}<section class="format-nav"> <div class="container"> <p class="label label--accent format-nav__label">Navigate by format</p> <p class="format-nav__sub">Every piece in the Journal carries a format tag. Pick the kind of reading you want  -  or keep scrolling and let the page sort itself.</p> <div class="format-nav__chips"> ${groups.map((group) => renderTemplate`<a${addAttribute(`#${group.key}`, "href")} class="format-chip"> <span class="format-chip__name">${group.title}</span> <span class="format-chip__count">${group.articles.length}</span> </a>`)} </div> </div> </section> ${groups.map((group) => renderTemplate`<section class="venues venues--alt"${addAttribute(group.key, "id")}> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">${formatLabel[group.key] ?? group.title}</p> <h2 class="venues__title">${group.title}</h2> <p class="venues__sub">${group.intro}</p> </div> <span class="venues__count">${group.articles.length} pieces</span> </div> <div class="venues__grid"> ${group.articles.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`)}${renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})} ` })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/journal/index.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/journal/index.astro";
const $$url = "/journal";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
