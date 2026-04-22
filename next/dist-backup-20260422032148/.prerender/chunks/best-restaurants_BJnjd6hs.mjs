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
const $$BestRestaurants = createComponent(async ($$result, $$props, $$slots) => {
  const eatTypes = ["restaurant", "cafe", "winery"];
  const venues = (await getCollection("venues")).filter((v) => eatTypes.includes(v.data.type)).sort((a, b) => Number(b.data.authority?.hats ?? 0) - Number(a.data.authority?.hats ?? 0));
  const topVenues = venues.slice(0, 15);
  const top3Names = topVenues.slice(0, 3).map((v) => v.data.name);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What are the best restaurants on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `The strongest rooms right now are ${top3Names.join(", ")}. All three offer serious food in the vineyard-dining tradition the Peninsula does best — long lunches, estate-grown produce, and wine lists anchored by Mornington Pinot.`
        }
      },
      {
        "@type": "Question",
        name: "Do I need to book restaurants on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most serious restaurants on the Peninsula require bookings, especially on weekends. Cellar door restaurants in Red Hill like Ten Minutes by Tractor and Montalto can book out weeks ahead in summer and autumn. Book as far ahead as you can for special occasions; casual venues like Allis Wine Bar and local bakeries typically operate walk-in."
        }
      },
      {
        "@type": "Question",
        name: "What is the best area for restaurants on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Red Hill plateau — including Main Ridge and Red Hill South — has the highest concentration of serious dining. Mornington town has the strongest casual dining scene. Sorrento and Portsea dominate in summer for atmosphere. For wine-paired lunches, stick to the ridge."
        }
      }
    ]
  };
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Eat & Drink", href: "/eat" },
    { label: "Best Restaurants" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Best Restaurants Mornington Peninsula · Peninsula Insider", "description": "The editorial ranked list of the best restaurants on the Mornington Peninsula — from three-hat vineyard dining rooms to the bakeries and pubs worth the detour.", "section": "eat", "canonical": "https://peninsulainsider.com.au/eat/best-restaurants" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", `<article class="article"> <div class="container"> <h1 class="article__title">The Best Restaurants on the Mornington Peninsula</h1> <div class="prose"> <p>The Mornington Peninsula runs on the Sunday long lunch. From the ridge-top dining rooms of Red Hill to the fisherman's-wharf-adjacent tables of Mornington, the dining options are deep, opinionated, and worth the drive. This list is built on editorial judgement — every entry has been visited and earned its sentence. No advertising, no paid placement, no sponsored rankings. If a restaurant appears here, it's because the meal was worth the drive and the editor was willing to say so.</p> <p>The Peninsula's strongest category is the vineyard restaurant — a dining room attached to or embedded within a working winery, where the produce is grown within a few kilometres and the wine list is anchored by the estate. Montalto, Ten Minutes by Tractor, and Polperro operate at the serious end of this format. Below them, a deep bench of rooms doing honest, seasonal work without the fanfare.</p> <p>The list is ordered by editorial authority: top-rated rooms first, then the places doing quietly strong work below them.</p> </div> </div> </article> <section class="venues" id="rankings"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Editorial ranking · `, '</p> <h2 class="venues__title">The top ', ' dining rooms, by authority</h2> <p class="venues__sub">Ordered by editorial weight. Rooms with a hat rating first, then the places doing the strongest quiet work.</p> </div> <a href="/eat" class="venues__link">All ', ' venues →</a> </div> <div class="venues__grid venues__grid--ranked"> ', ' </div> </div> </section> <section class="faq-section"> <div class="container"> <div class="prose"> <h2>Frequently asked questions</h2> <h3>What are the best restaurants on the Mornington Peninsula?</h3> <p>The strongest rooms right now are ', ". All three offer serious food in the vineyard-dining tradition the Peninsula does best — long lunches, estate-grown produce, and wine lists anchored by Mornington Pinot. Below them, a deep bench of cellar door restaurants and neighbourhood rooms doing honest, seasonal work.</p> <h3>Do I need to book restaurants on the Mornington Peninsula?</h3> <p>Most serious restaurants on the Peninsula require bookings, especially on weekends. Cellar door restaurants in Red Hill like Ten Minutes by Tractor and Montalto can book out weeks ahead in summer and autumn. Book as far ahead as you can for special occasions; casual venues like Allis Wine Bar and local bakeries typically operate walk-in.</p> <h3>What is the best area for restaurants on the Mornington Peninsula?</h3> <p>The Red Hill plateau — including Main Ridge and Red Hill South — has the highest concentration of serious dining. Mornington town has the strongest casual dining scene. Sorrento and Portsea dominate in summer for atmosphere. For wine-paired lunches, stick to the ridge.</p> <h3>When is the best time to visit Mornington Peninsula for food?</h3> <p>Autumn is the peak dining season. Vintage is running on the ridge, fires are lit in cellar door dining rooms, and the summer crowds have thinned enough that the best tables are actually bookable. Spring is a close second — new menus, release wines, and golden light that starts early and stays late.</p> </div> </div> </section> ", " "])), unescapeHTML(JSON.stringify(faqSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), (/* @__PURE__ */ new Date()).getFullYear(), topVenues.length, venues.length, topVenues.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`), top3Names.join(", "), renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/eat/best-restaurants.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/eat/best-restaurants.astro";
const $$url = "/eat/best-restaurants";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$BestRestaurants,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
