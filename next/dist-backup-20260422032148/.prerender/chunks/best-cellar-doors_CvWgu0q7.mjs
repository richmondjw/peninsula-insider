import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$BestCellarDoors = createComponent(async ($$result, $$props, $$slots) => {
  const wineTypes = ["winery", "producer", "brewery", "distillery"];
  const venues = (await getCollection("venues")).filter((v) => wineTypes.includes(v.data.type)).sort((a, b) => Number(b.data.authority?.hallidayScore ?? 0) - Number(a.data.authority?.hallidayScore ?? 0));
  const topVenues = venues.slice(0, 12);
  topVenues.slice(0, 3).map((v) => v.data.name);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I need an appointment for cellar doors on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Some cellar doors require appointments, particularly the smaller boutique producers. Larger estates like Montalto and Crittenden Estate are generally open without bookings. Always check the winery website before visiting — hours and booking requirements shift seasonally, especially in winter."
        }
      },
      {
        "@type": "Question",
        name: "What is the best wine region on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Red Hill plateau and its sub-regions — Red Hill South, Main Ridge, and Merricks — form the core of the Mornington Peninsula wine region. The cool maritime climate produces elegant Pinot Noir and Chardonnay. Over 200 growers work the plateau with 50-plus cellar doors open to visitors."
        }
      },
      {
        "@type": "Question",
        name: "When is the best time to visit Mornington Peninsula wineries?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Autumn (March–May) is the peak season — vintage is underway, cellar doors have fires lit, and the plateau is at its most atmospheric. Spring (September–November) brings new vintage releases and lower crowds. Summer weekends are busy but the atmosphere is excellent; book ahead. Winter is the best-kept secret: most cellar doors are open with reduced hours and the coast is dramatically empty."
        }
      }
    ]
  };
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Wine Country", href: "/wine" },
    { label: "Best Cellar Doors" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Best Cellar Doors Mornington Peninsula · Peninsula Insider", "description": "The editorial shortlist of the best cellar doors on the Mornington Peninsula — Pinot Noir, Chardonnay, and the producers worth driving to.", "section": "wine", "canonical": "https://peninsulainsider.com.au/wine/best-cellar-doors" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", `<article class="article"> <div class="container"> <h1 class="article__title">The Best Cellar Doors on the Mornington Peninsula</h1> <div class="prose"> <p>Mornington Peninsula Pinot Noir is one of Australia's most consistent cool-climate stories. With over 200 growers and 50-plus cellar doors concentrated on the Red Hill plateau and its surrounding sub-regions, the question is no longer whether it's worth the drive but which doors to open. This list is editorial — no advertising, no paid placement. Every entry has been visited and the wine has been drunk at the source.</p> <p>The Peninsula's strengths are Pinot Noir and Chardonnay, with a handful of producers doing exceptional work in Pinot Gris, Pinot Blanc, and late-harvest styles. The best cellar door visits combine a tasting with a lunch or at minimum a board — the landscape earns more time than a thirty-minute visit allows.</p> <p>The list is ordered by editorial authority and Halliday score where applicable. Benchmark producers first, then the smaller rooms doing interesting work below them.</p> </div> </div> </article> <section class="venues" id="rankings"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Editorial ranking · `, '</p> <h2 class="venues__title">The top ', ' cellar doors, by authority</h2> <p class="venues__sub">Ordered by editorial weight. Benchmark producers first, then the rooms doing strong quiet work.</p> </div> <a href="/wine" class="venues__link">All ', ' producers →</a> </div> <div class="venues__grid"> ', ' </div> </div> </section> <section class="faq-section"> <div class="container"> <div class="prose"> <h2>Frequently asked questions</h2> <h3>Do I need an appointment for cellar doors on the Mornington Peninsula?</h3> <p>Some cellar doors require appointments, particularly the smaller boutique producers. Larger estates like Montalto and Crittenden Estate are generally open without bookings. Always check the winery website before visiting — hours and booking requirements shift seasonally, especially in winter.</p> <h3>What is the best wine region on the Mornington Peninsula?</h3> <p>The Red Hill plateau and its sub-regions — Red Hill South, Main Ridge, and Merricks — form the core of the Mornington Peninsula wine region. The cool maritime climate produces elegant Pinot Noir and Chardonnay. Over 200 growers work the plateau with 50-plus cellar doors open to visitors.</p> <h3>When is the best time to visit Mornington Peninsula wineries?</h3> <p>Autumn (March–May) is the peak season — vintage is underway, cellar doors have fires lit, and the plateau is at its most atmospheric. Spring (September–November) brings new vintage releases and lower crowds. Summer weekends are busy but the atmosphere is excellent; book ahead. Winter is the best-kept secret: most cellar doors are open with reduced hours and the coast is dramatically empty.</p> <h3>What wine varieties is the Mornington Peninsula known for?</h3> <p>Pinot Noir and Chardonnay are the benchmark varieties, both benefiting from the cool maritime climate and basalt soils of the Red Hill plateau. Pinot Gris, Pinot Blanc, and Viognier are strong secondary varieties. A handful of producers are also doing interesting work with Tempranillo and Gamay as the region experiments beyond its two anchor grapes.</p> </div> </div> </section> ', " "])), unescapeHTML(JSON.stringify(faqSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), (/* @__PURE__ */ new Date()).getFullYear(), topVenues.length, venues.length, topVenues.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/wine" })}`), renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/wine/best-cellar-doors.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/wine/best-cellar-doors.astro";
const $$url = "/wine/best-cellar-doors";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$BestCellarDoors,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
