import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead } from './prerender_DgZBHBwL.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Page not found  -  Peninsula Insider", "description": "The page you're looking for doesn't exist. Try the homepage or browse our sections.", "section": "home" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="not-found"> <div class="container"> <div class="not-found__inner"> <p class="not-found__code">404</p> <h1 class="not-found__title">This page doesn't exist</h1> <p class="not-found__body">Either the URL is wrong, the page moved, or it was never here to begin with. The Peninsula is big enough to get lost in  -  the website shouldn't be.</p> <nav class="not-found__nav" aria-label="Recovery links"> <a href="/" class="not-found__link">← Back to the homepage</a> <a href="/journal" class="not-found__link">Browse the Journal</a> <a href="/eat" class="not-found__link">Eat & Drink</a> <a href="/explore" class="not-found__link">Explore</a> <a href="/places" class="not-found__link">Places</a> <a href="/contact" class="not-found__link">Report a broken link</a> </nav> </div> </div> </section> ${renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, { "title": "While you're here  -  the newsletter is real.", "body": "Weekly Peninsula coverage with honest picks, new openings, and the cellar doors worth knowing." })} ` })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/404.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
