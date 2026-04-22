import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { a as renderTemplate, b as addAttribute, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import 'clsx';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Breadcrumbs = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Breadcrumbs;
  const { items } = Astro2.props;
  const SITE_URL = "https://peninsulainsider.com.au";
  const rawPathname = Astro2.url.pathname.replace(/^\/V2/, "") || "/";
  const normalizedPath = rawPathname !== "/" ? rawPathname.replace(/\/$/, "") : rawPathname;
  const currentUrl = `${SITE_URL}${normalizedPath}`;
  function absolutize(href, fallback) {
    if (!href) return fallback;
    if (href.startsWith("http://") || href.startsWith("https://")) return href;
    if (href === "/") return SITE_URL;
    return `${SITE_URL}${href.startsWith("/") ? href : "/" + href}`;
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absolutize(item.href, currentUrl)
    }))
  };
  return renderTemplate(_a || (_a = __template(['<script type="application/ld+json">', "<\/script> ", '<nav class="breadcrumbs" aria-label="Breadcrumb"> <div class="container"> <ol class="breadcrumbs__list"> ', " </ol> </div> </nav>"])), unescapeHTML(JSON.stringify(breadcrumbSchema)), maybeRenderHead(), items.map((item, index) => renderTemplate`<li class="breadcrumbs__item"> ${item.href && index < items.length - 1 ? renderTemplate`<a${addAttribute(item.href, "href")}>${item.label}</a>` : renderTemplate`<span${addAttribute(index === items.length - 1 ? "page" : void 0, "aria-current")}>${item.label}</span>`} </li>`));
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/Breadcrumbs.astro", void 0);

export { $$Breadcrumbs as $ };
