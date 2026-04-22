import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, a as renderTemplate, u as unescapeHTML, b as addAttribute } from './prerender_DgZBHBwL.mjs';
import 'clsx';

const $$SectionHero = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$SectionHero;
  const {
    eyebrow = "Peninsula Insider",
    subEyebrow,
    title,
    dek,
    gradient = "vineyard",
    visualLabel,
    heroImage
  } = Astro2.props;
  const gradClass = `section-hero__visual hero-grad--${gradient}`;
  const heroStyle = heroImage ? `background-image: url(${heroImage})` : void 0;
  return renderTemplate`${maybeRenderHead()}<section class="section-hero"> <div class="container"> <div class="section-hero__inner"> <div> <div class="section-hero__eyebrow"> <span class="label label--accent">${eyebrow}</span> <span class="section-hero__rule" aria-hidden="true"></span> ${subEyebrow && renderTemplate`<span class="label">${subEyebrow}</span>`} </div> <h1 class="section-hero__title">${unescapeHTML(title)}</h1> <p class="section-hero__dek">${dek}</p> </div> <div${addAttribute(gradClass, "class")} aria-hidden="true"${addAttribute(heroStyle, "style")}> <div class="section-hero__visual-fog"></div> ${visualLabel && renderTemplate`<span class="section-hero__visual-label">${visualLabel}</span>`} </div> </div> </div> </section>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/SectionHero.astro", void 0);

export { $$SectionHero as $ };
