import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$SectionHero } from './SectionHero_BlToWmif.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$SubscribeForm } from './SubscribeForm_VDfFMXvN.mjs';

const $$Newsletter = createComponent(async ($$result, $$props, $$slots) => {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Newsletter" }
  ];
  const articles = (await getCollection("articles", ({ data }) => data.status === "published")).sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const dispatches = articles.filter((a) => a.data.format === "weekend-picker").slice(0, 3);
  const highlights = articles.filter((a) => a.data.format !== "weekend-picker").slice(0, 3);
  const previewPieces = dispatches.length > 0 ? dispatches : highlights;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Newsletter — Peninsula Insider", "description": "Subscribe to The Insider's Dispatch: weekly Peninsula coverage with honest picks, new openings, and the cellar doors worth knowing.", "section": "home" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems })} ${renderComponent($$result2, "SectionHero", $$SectionHero, { "eyebrow": "Newsletter", "subEyebrow": "The Insider's Dispatch", "title": "The Peninsula in your inbox, every <em>week.</em>", "dek": "New openings, cellar door dispatches, and the places we're quietly recommending this season. Written by editors who live here — never by advertisers.", "gradient": "journal", "heroImage": "/images/sourced/article-sunset-01.webp", "visualLabel": "Weekly · independent · subscriber-only picks" })}  ${maybeRenderHead()}<section class="newsletter-signup"> <div class="container"> <div class="newsletter-signup__inner"> <div class="newsletter-signup__pitch"> <h2 class="newsletter-signup__title">What you'll get</h2> <ul class="newsletter-signup__list"> <li> <strong>Weekly dispatch</strong> — one curated email every week with the openings, closures, and stories that matter.
</li> <li> <strong>Weekend Picker</strong> — our Wednesday 6pm Peninsula This Weekend note: one opinionated pick, one weather-proof backup, one thing to skip.
</li> <li> <strong>Subscriber-only notes</strong> — short editorial observations we don't publish on the site. The things we'd text a friend.
</li> <li> <strong>Early access</strong> — new guides and long-form pieces land in the newsletter before they hit the site.
</li> </ul> </div> <div class="newsletter-signup__form-block"> ${renderComponent($$result2, "SubscribeForm", $$SubscribeForm, { "variant": "light", "source": "newsletter-page" })} </div> </div> </div> </section>  <section class="newsletter-proof"> <div class="container"> <div class="split-intro"> <div> <p class="label label--accent">What it sounds like</p> <h2 class="split-intro__title">Written like a good recommendation from someone who lives here</h2> </div> <p class="split-intro__body">Every issue has a voice. We don't write round-ups that read like tourism copy — we write the email we'd want to receive on a Wednesday evening when we're thinking about the weekend.</p> </div> <div class="newsletter-proof__promises"> <article class="about-principle"> <h3 class="about-principle__title">No advertising</h3> <p class="about-principle__body">The newsletter is funded by the site, not by venue placements. Every mention is earned.</p> </article> <article class="about-principle"> <h3 class="about-principle__title">No click-bait subjects</h3> <p class="about-principle__body">Subject lines tell you what's inside. If the newsletter is about three cellar doors worth the appointment, the subject says so.</p> </article> <article class="about-principle"> <h3 class="about-principle__title">Weekly, not daily</h3> <p class="about-principle__body">One curated dispatch every week. We write when we have something to say.</p> </article> </div> </div> </section>  ${previewPieces.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Recent from the site</p> <h2 class="venues__title">The kind of writing subscribers receive first</h2> <p class="venues__sub">These pieces mirror the editorial voice of the newsletter — service-first, opinionated, and built around real decisions.</p> </div> <a href="/journal" class="venues__link">More in the Journal →</a> </div> <div class="venues__grid"> ${previewPieces.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`} <section class="newsletter" id="newsletter-bottom" aria-label="Newsletter signup"> <div class="container"> <div class="newsletter__stack"> <p class="newsletter__label">One more time</p> <h2 class="newsletter__title">Join the list. Skip the noise.</h2> <p class="newsletter__body">If you visit the Peninsula — or just think about it — this is the one email worth opening.</p> ${renderComponent($$result2, "SubscribeForm", $$SubscribeForm, { "variant": "dark", "source": "newsletter-page" })} <div class="newsletter__proof-row" aria-hidden="true"> <span>Weekly dispatch</span> <span>Independent picks</span> <span>Privacy respected</span> </div> </div> </div> </section> ` })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/newsletter.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/newsletter.astro";
const $$url = "/newsletter";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Newsletter,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
