import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { a as renderTemplate, r as renderComponent, u as unescapeHTML, m as maybeRenderHead } from './prerender_DgZBHBwL.mjs';
import { $ as $$SubscribeForm } from './SubscribeForm_VDfFMXvN.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$NewsletterBlock = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$NewsletterBlock;
  const {
    title = "The Peninsula in your inbox, every week.",
    body = "New openings, cellar-door dispatches, weekend-picker verdicts, and the places we're quietly recommending this season. Written by editors who live here."
  } = Astro2.props;
  return renderTemplate(_a || (_a = __template(["", `<section class="newsletter" id="newsletter" aria-label="Newsletter signup"> <div class="container"> <div class="newsletter__stack"> <p class="newsletter__label">The Insider's Dispatch</p> <h2 class="newsletter__title">`, '</h2> <p class="newsletter__body">', "</p> ", ` <div class="newsletter__proof-row" aria-hidden="true"> <span>Weekly dispatch</span> <span>Independent picks</span> <span>Unsubscribe any time</span> </div> </div> </div> </section> <script>
  (function () {
    function initReveal() {
      var section = document.getElementById('newsletter');
      if (!section) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          section.classList.add('newsletter--visible');
          observer.disconnect();
        }
      }, { threshold: 0.15 });
      observer.observe(section);
    }
    initReveal();
    document.addEventListener('astro:page-load', initReveal);
  })();
<\/script>`])), maybeRenderHead(), unescapeHTML(title.replace(", ", ",<br />")), body, renderComponent($$result, "SubscribeForm", $$SubscribeForm, { "variant": "dark", "source": "footer" }));
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/NewsletterBlock.astro", void 0);

export { $$NewsletterBlock as $ };
