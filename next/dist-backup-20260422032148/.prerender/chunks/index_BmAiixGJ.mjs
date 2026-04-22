import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, b as addAttribute, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { r as routeSlug } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const allArticles = await getCollection("articles", ({ data }) => data.status === "published");
  const spaArticles = allArticles.filter((a) => a.data.tags?.some((t) => ["spa", "hot-springs", "wellness"].includes(t))).sort((a, b) => new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime());
  const allVenues = await getCollection("venues");
  const spaVenues = allVenues.filter((v) => v.data.type === "spa");
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Spa & Wellness" }
  ];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best spa on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Alba Thermal Springs is the strongest single spa booking on the Peninsula for most first-time visitors — design-led, adults-focused, and with session caps that keep the experience calm. Peninsula Hot Springs is the larger, more complete wellness complex with more pools and treatment options, best for groups or the full ritual-circuit experience. For resort-style day spa with cliff-top views, One Spa at RACV Cape Schanck is the pick."
        }
      },
      {
        "@type": "Question",
        name: "Which is better — Peninsula Hot Springs or Alba Thermal Springs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "They are different experiences. Alba Thermal Springs opened in 2022 and is architecturally tighter, quieter, and adults-focused. Peninsula Hot Springs opened in 2005 and is larger, more varied, and better suited to groups or families. For couples and design lovers, Alba usually wins. For the full ritual and wellness program, Peninsula Hot Springs is stronger — book midweek or Twilight to avoid crowds."
        }
      },
      {
        "@type": "Question",
        name: "How far are the Mornington Peninsula hot springs from Melbourne?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Both Peninsula Hot Springs and Alba Thermal Springs are in Fingal, approximately 90 to 100 minutes from Melbourne CBD via the Mornington Peninsula Freeway. One Spa at RACV Cape Schanck is a similar distance. Spa by Jackalope at Merricks North is slightly closer at 80 to 90 minutes."
        }
      },
      {
        "@type": "Question",
        name: "Can you visit both Peninsula Hot Springs and Alba Thermal Springs in one day?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, but it is not recommended. Each bathhouse is a three-to-four-hour commitment if done properly. Back-to-back sessions collapse into a blur, your skin suffers, and you miss the best pools at each. A better model is one visit per trip, or two visits spaced across a two-night stay with a meal and rest between them."
        }
      },
      {
        "@type": "Question",
        name: "What is the best time of year for the Mornington Peninsula hot springs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The shoulder seasons — April to May and September to November — offer the most pleasant bathing conditions. Winter is excellent for the hot pools themselves but requires warm layers for transit between pools. Summer can feel hot and crowded at midday; book early morning or evening Twilight sessions in peak season."
        }
      }
    ]
  };
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Best Spas Mornington Peninsula",
    description: "The complete guide to spas, hot springs, and wellness venues on the Mornington Peninsula — from Peninsula Hot Springs and Alba Thermal Springs to resort spas and boutique treatment rooms.",
    url: "https://peninsulainsider.com.au/spa",
    about: {
      "@type": "Thing",
      name: "Mornington Peninsula spas and hot springs"
    }
  };
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Mornington Peninsula Hot Springs Guide · Peninsula Insider", "description": "The best spas on the Mornington Peninsula — Peninsula Hot Springs, Alba Thermal Springs, One Spa at RACV Cape Schanck, Spa by Jackalope, Endota. Tier-ranked hot springs, resort spas, and day spas with booking guidance. Updated 2026.", "section": "explore", "canonical": "https://peninsulainsider.com.au/spa", "ogImage": "/images/sourced/spa-alba-thermal-springs-01.webp", "modifiedTime": "2026-04-14" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', '<\/script> <script type="application/ld+json">', "<\/script> ", " ", `<section class="section-hero"> <div class="container"> <div class="section-hero__inner"> <div class="section-hero__content"> <p class="label label--accent">Spa & Wellness</p> <h1 class="section-hero__title">The Best Spas on the Mornington Peninsula</h1> <p class="section-hero__dek">Two serious geothermal bathhouses. Cliff-top resort spas. Boutique treatment rooms inside design hotels. Australia's most complete wellness destination for a weekend that actually resets you.</p> </div> <div class="section-hero__visual" aria-hidden="true" style="background-image: url(/images/sourced/spa-alba-thermal-springs-01.webp); background-size: cover; background-position: center;"> <div class="section-hero__visual-fog"></div> <span class="section-hero__visual-label">Spa · Wellness · Hot Springs Country</span> </div> </div> </div> </section> `, '<section class="editorial-promise"> <div class="container"> <div class="editorial-promise__inner"> <div> <p class="label label--accent">Peninsula Insider approach to wellness</p> <h2 class="editorial-promise__title">Honest, locally literate, useful</h2> </div> <div> <p>Not every spa on the Peninsula is equally useful to a visitor. This guide tells you which bathhouse session is worth building a weekend around, which resort spa adds to a stay, and which day-spa rooms fit around lunch rather than defining the trip.</p> <p>Prices change. Session timing changes everything. We do not publish session prices without live verification — check direct before booking, and choose midweek where your calendar allows.</p> </div> </div> </div> </section> ', '<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Go deeper</p> <h2 class="venues__title">Build the wellness weekend</h2> </div> </div> <div class="venues__grid venues__grid--links"> <div class="venue-card"> <h3 class="venue-card__name"><a href="/journal/peninsula-hot-springs-vs-alba">Peninsula Hot Springs vs Alba</a></h3> <p class="venue-card__signature">The honest, side-by-side comparison. Which bathhouse is actually right for the weekend you are trying to have.</p> <a href="/journal/peninsula-hot-springs-vs-alba" class="venue-card__cta">Read the comparison →</a> </div> <div class="venue-card"> <h3 class="venue-card__name"><a href="/journal/mornington-peninsula-stay-and-soak">Stay and Soak — Where to Stay</a></h3> <p class="venue-card__signature">The accommodation pairings that make each spa weekend work. Hot springs, resort spas, and boutique treatment rooms matched to stays within fifteen minutes.</p> <a href="/journal/mornington-peninsula-stay-and-soak" class="venue-card__cta">Read the guide →</a> </div> <div class="venue-card"> <h3 class="venue-card__name"><a href="/journal/best-spas-mornington-peninsula">The Tier Guide</a></h3> <p class="venue-card__signature">Tier 1 through Tier 3 — which spa for which kind of weekend. Destination wellness, resort spas, and the reliable day-spa options.</p> <a href="/journal/best-spas-mornington-peninsula" class="venue-card__cta">Read the guide →</a> </div> </div> </div> </section> ', " "])), unescapeHTML(JSON.stringify(faqSchema)), unescapeHTML(JSON.stringify(collectionSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), spaArticles.length > 0 && renderTemplate`<section class="venues"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Start here</p> <h2 class="venues__title">Three pieces that explain Peninsula wellness</h2> <p class="venues__sub">The comparison, the tier guide, and where to stay near the hot springs.</p> </div> <a href="/journal" class="venues__link">All journal pieces →</a> </div> <div class="venues__grid"> ${spaArticles.slice(0, 3).map((article) => renderTemplate`<article class="venue-card"> <div class="venue-card__top"> <span class="venue-card__type">Wellness</span> <span class="venue-card__price">${article.data.readingTimeMinutes ? `${article.data.readingTimeMinutes} min` : ""}</span> </div> <h3 class="venue-card__name"> <a${addAttribute(`/journal/${routeSlug(article)}`, "href")}>${article.data.title}</a> </h3> <p class="venue-card__signature">${article.data.dek}</p> <a${addAttribute(`/journal/${routeSlug(article)}`, "href")} class="venue-card__cta">Read the piece →</a> </article>`)} </div> </div> </section>`, spaVenues.length > 0 && renderTemplate`<section class="venues"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">The spas</p> <h2 class="venues__title">Every spa we cover</h2> <p class="venues__sub">Hot springs, resort spas, and day spas — each with an editorial take.</p> </div> </div> <div class="venues__grid"> ${spaVenues.map((venue) => renderTemplate`<article class="venue-card"> <div class="venue-card__top"> <span class="venue-card__type">${venue.data.place}</span> <span class="venue-card__price">${venue.data.priceBand}</span> </div> <h3 class="venue-card__name"> <a${addAttribute(`/stay/${venue.data.slug}`, "href")}>${venue.data.name}</a> </h3> <p class="venue-card__signature">${venue.data.signature}</p> <a${addAttribute(`/stay/${venue.data.slug}`, "href")} class="venue-card__cta">Read the guide →</a> </article>`)} </div> </div> </section>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, { "title": "Hot springs, long lunches, and what's worth the drive", "body": "Peninsula Insider dispatches every Wednesday. One pick, one backup, one honest opinion." })) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/spa/index.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/spa/index.astro";
const $$url = "/spa";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
