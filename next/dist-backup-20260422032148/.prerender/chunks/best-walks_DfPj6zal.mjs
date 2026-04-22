import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$ExperienceCard } from './ExperienceCard_BzrVPHmr.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$BestWalks = createComponent(async ($$result, $$props, $$slots) => {
  const experiences = await getCollection("experiences");
  const walks = experiences.filter((e) => e.data.type === "walk").sort((a, b) => {
    return (b.data.durationMinutes ?? 0) - (a.data.durationMinutes ?? 0);
  });
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best walk on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Bushrangers Bay walk from Cape Schanck is the standout — a 45-minute descent through coastal scrub to a wild, usually empty beach with basalt platforms and Southern Ocean views. For something longer, the Two Bays Walking Track from Dromana to Cape Schanck covers 26 km across the plateau and ranks among Victoria's best day walks."
        }
      },
      {
        "@type": "Question",
        name: "Are there easy walks on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The Sorrento foreshore walk, Mornington Pier to Mills Beach loop, and the Cape Schanck boardwalk are all flat-to-gentle, under 45 minutes, and suitable for families. The Point Nepean shuttle-and-walk option lets you cover the fort trail without the full return distance."
        }
      },
      {
        "@type": "Question",
        name: "Can you walk along the coast on the Mornington Peninsula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The ocean side (southern coast) has the best coastal walking — cliff paths, headland tracks, and beach-access trails from Cape Schanck to Point Nepean. The bay side is flatter and has paved foreshore paths through Mornington, Mount Martha, and Dromana. The two coasts feel completely different — rugged ocean vs calm bay — and most visitors underestimate how close they are."
        }
      }
    ]
  };
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: "Best Walks" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Best Walks on the Mornington Peninsula · Peninsula Insider", "description": "The best walking tracks on the Mornington Peninsula — coastal cliff walks, national park trails, and easy foreshore strolls, with difficulty, duration, and honest editor notes.", "section": "explore", "canonical": "https://peninsulainsider.com.au/explore/best-walks" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", `<article class="article"> <div class="container"> <h1 class="article__title">The Best Walks on the Mornington Peninsula</h1> <div class="prose"> <p>The Peninsula's coastline is its most underused asset. The ocean beach walks at Cape Schanck, Bushrangers Bay, and Point Nepean offer genuine wild-coast walking — basalt platforms, bass strait views, and almost no crowds outside of summer weekends. The Two Bays Walking Track connects Dromana to Cape Schanck across the plateau, one of Victoria's better day walks if you're prepared for it.</p> <p>Most Peninsula walks are accessible without specialist gear. A decent pair of shoes handles everything except Point Nepean's longer trails. Bring water — shade is intermittent on the coastal sections. The best time for coast walks is early morning or late afternoon; midday in summer exposes you to direct sun with no shelter.</p> </div> </div> </article> `, "", `<section class="faq-section"> <div class="container"> <div class="prose"> <h2>Walk planning notes</h2> <h3>Coastal walks</h3> <p>The Cape Schanck boardwalk and the Bushrangers Bay trail are the two strongest coastal walks on the Peninsula — both accessible from Cape Schanck Lighthouse car park. Cape Schanck gives you the lighthouse and the platform views in under 30 minutes; Bushrangers Bay adds a further hour each way into a protected bay the crowds don't reach on weekday mornings.</p> <h3>Long walks</h3> <p>The Two Bays Walking Track is the Peninsula's only legitimate day walk — 26km from Dromana to Cape Schanck crossing the plateau. It's divided into manageable sections; the Greens Bush section alone (south side of the national park) is worth a half-day if you want forest walking without the full commitment.</p> <h3>Easy walks</h3> <p>The Mornington foreshore, Mount Martha beach, and Point Nepean's Fort walk are the most accessible options — flat, well-maintained paths with views throughout. Good for families with young children or anyone who wants to walk without committing to anything technical.</p> </div> </div> </section> `, " "])), unescapeHTML(JSON.stringify(faqSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), walks.length > 0 && renderTemplate`<section class="experience-index"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">All walks · ${walks.length} tracked</p> <h2 class="venues__title">Walking tracks on the Mornington Peninsula</h2> <p class="venues__sub">Coastal cliff walks, plateau trails, and foreshore strolls — each with timing, difficulty, and an honest editor note.</p> </div> <a href="/explore" class="venues__link">All experiences →</a> </div> <div class="experience-grid"> ${walks.map((walk) => renderTemplate`${renderComponent($$result2, "ExperienceCard", $$ExperienceCard, { "experience": walk })}`)} </div> </div> </section>`, walks.length === 0 && renderTemplate`<section class="article"> <div class="container"> <div class="prose"> <p>Walking track coverage is being added — check back soon, or <a href="/explore">browse all experiences</a> in the meantime.</p> </div> </div> </section>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/explore/best-walks.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/explore/best-walks.astro";
const $$url = "/explore/best-walks";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$BestWalks,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
