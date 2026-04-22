import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { c as createRenderInstruction, b as addAttribute, a as renderTemplate, m as maybeRenderHead, r as renderComponent, d as renderSlot, e as renderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import 'clsx';

async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}</script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"></script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}

const $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ClientRouter;
  const { fallback = "animate" } = Astro2.props;
  return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "/home/node/.openclaw/workspace/peninsula-insider/next/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/node_modules/astro/components/ClientRouter.astro", void 0);

const $$Masthead = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Masthead;
  const { section = "home" } = Astro2.props;
  const navItems = [
    { key: "eat", label: "Eat & Drink", href: "/eat" },
    { key: "stay", label: "Stay", href: "/stay" },
    { key: "wine", label: "Wine", href: "/wine" },
    { key: "explore", label: "Explore", href: "/explore" },
    { key: "escape", label: "Escape", href: "/escape" },
    { key: "whats-on", label: "What’s On", href: "/whats-on" },
    { key: "journal", label: "Journal", href: "/journal" }
  ];
  return renderTemplate`${maybeRenderHead()}<header class="masthead"> <div class="container"> <div class="masthead__inner"> <a href="/" class="masthead__logo">
Peninsula <span>Insider</span> </a> <nav aria-label="Primary"> <ul class="masthead__nav"> ${navItems.map((item) => renderTemplate`<li> <a${addAttribute(item.href, "href")}${addAttribute(section === item.key ? "page" : void 0, "aria-current")}> ${item.label} </a> </li>`)} </ul> </nav> <a href="/newsletter" class="masthead__cta">Subscribe</a> <a href="/newsletter" class="masthead__cta-mobile" aria-label="Subscribe to the newsletter">Subscribe</a> <button class="masthead__burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav"> <span></span><span></span><span></span> </button> </div> </div> </header> <nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation"> <div class="mobile-nav__inner"> <p class="mobile-nav__eyebrow">Explore the Peninsula</p> ${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")} class="mobile-nav__link"${addAttribute(section === item.key ? "page" : void 0, "aria-current")}> <span>${item.label}</span> <span class="mobile-nav__arrow" aria-hidden="true">→</span> </a>`)} <div class="mobile-nav__footer"> <a href="/newsletter" class="mobile-nav__cta">Get the weekly dispatch</a> <p class="mobile-nav__tagline">Independent editorial. No advertisers. Every Wednesday.</p> </div> </div> </nav>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/Masthead.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const sectionLinks = [
    { label: "Eat & Drink", href: "/eat" },
    { label: "Stay", href: "/stay" },
    { label: "Wine Country", href: "/wine" },
    { label: "Explore", href: "/explore" },
    { label: "Golf", href: "/golf" },
    { label: "Spa & Wellness", href: "/spa" },
    { label: "Escape", href: "/escape" },
    { label: "What's On", href: "/whats-on" },
    { label: "Journal", href: "/journal" }
  ];
  const placeLinks = [
    { label: "Red Hill", href: "/places/red-hill" },
    { label: "Sorrento", href: "/places/sorrento" },
    { label: "Flinders", href: "/places/flinders" },
    { label: "Mornington", href: "/places/mornington" },
    { label: "Portsea", href: "/places/portsea" },
    { label: "Main Ridge", href: "/places/main-ridge" },
    { label: "All places", href: "/places" }
  ];
  const aboutLinks = [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Newsletter", href: "/newsletter" },
    { label: "Privacy", href: "/privacy" }
  ];
  return renderTemplate`${maybeRenderHead()}<footer class="footer"> <div class="container"> <div class="footer__grid"> <div class="footer__brand"> <span class="footer__logo">Peninsula <span>Insider</span></span> <p class="footer__tagline">The independent editorial guide to the Mornington Peninsula.</p> <p class="footer__dispatch-note"><em>Peninsula This Weekend</em> dispatches every Wednesday 6 pm &middot; <a href="/#newsletter">Subscribe</a></p> <div class="footer__social"> <a href="https://www.instagram.com/peninsula.insider/" class="footer__social-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer"> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> </a> <a href="https://www.facebook.com/61568754749670" class="footer__social-link" aria-label="Facebook" target="_blank" rel="noopener noreferrer"> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg> </a> <a href="https://www.linkedin.com/company/115044132" class="footer__social-link" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg> </a> </div> </div> <nav class="footer__col" aria-label="Sections"> <p class="footer__col-title">Sections</p> <ul> ${sectionLinks.map((link) => renderTemplate`<li><a${addAttribute(link.href, "href")}>${link.label}</a></li>`)} </ul> </nav> <nav class="footer__col" aria-label="Places"> <p class="footer__col-title">Places</p> <ul> ${placeLinks.map((link) => renderTemplate`<li><a${addAttribute(link.href, "href")}>${link.label}</a></li>`)} </ul> </nav> <nav class="footer__col" aria-label="About"> <p class="footer__col-title">About</p> <ul> ${aboutLinks.map((link) => renderTemplate`<li><a${addAttribute(link.href, "href")}>${link.label}</a></li>`)} </ul> </nav> </div> <div class="footer__bottom"> <p class="footer__copy">&copy; ${year} Peninsula Insider. All rights reserved.</p> <p class="footer__independence">Built on the Peninsula, for the Peninsula.</p> </div> </div> </footer>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/Footer.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$BaseLayout;
  const SITE_URL = "https://peninsulainsider.com.au";
  const {
    title,
    description = "The independent editorial guide to the Mornington Peninsula — no advertisers, no press trips, just honest coverage.",
    section = "home",
    preview = false,
    canonical,
    ogImage = "/images/sourced/home-cover.webp",
    ogType = "website",
    noindex = false,
    publishedTime,
    modifiedTime
  } = Astro2.props;
  const rawPathname = Astro2.url.pathname.replace(/^\/V2/, "") || "/";
  const normalizedPath = rawPathname !== "/" ? rawPathname.replace(/\/$/, "") : rawPathname;
  const canonicalUrl = canonical ?? `${SITE_URL}${normalizedPath}`;
  const ogImageAbsolute = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage.startsWith("/") ? ogImage : "/" + ogImage}`;
  return renderTemplate(_a || (_a = __template(['<html lang="en-AU"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="content-language" content="en-AU"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet"><title>', '</title><meta name="description"', '><link rel="canonical"', '><link rel="alternate" hrefLang="en-au"', '><link rel="alternate" hrefLang="x-default"', '><meta name="robots"', '><!-- Open Graph --><meta property="og:title"', '><meta property="og:description"', '><meta property="og:image"', '><meta property="og:url"', '><meta property="og:type"', '><meta property="og:site_name" content="Peninsula Insider"><meta property="og:locale" content="en_AU">', "", '<!-- Twitter Card --><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"', '><meta name="twitter:description"', '><meta name="twitter:image"', '><script type="application/ld+json">', "<\/script><!-- View transitions: client-side routing with page fade -->", `<link rel="stylesheet" href="/assets/styles.css"><!-- Enhancement layers --><link rel="stylesheet" href="/assets/mobile-fixes.css"><link rel="stylesheet" href="/assets/scroll-animations.css"><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-0MR9YVZ9NW"><\/script><script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-0MR9YVZ9NW');
  <\/script>`, "</head> <body> ", " <main> ", " </main> ", ` <script>
    (function() {
      function initNav() {
        var burger = document.querySelector('.masthead__burger');
        var nav = document.getElementById('mobileNav');
        if (!burger || !nav) return;

        // Always reset state cleanly on each page load / transition
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';

        // Guard against double-binding on repeated calls
        if (burger._navBound) return;
        burger._navBound = true;

        burger.addEventListener('click', function() {
          var open = nav.classList.toggle('is-open');
          burger.classList.toggle('is-open', open);
          burger.setAttribute('aria-expanded', String(open));
          document.body.style.overflow = open ? 'hidden' : '';
        });

        nav.querySelectorAll('a').forEach(function(link) {
          link.addEventListener('click', function() {
            nav.classList.remove('is-open');
            burger.classList.remove('is-open');
            burger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          });
        });
      }

      // Run on first load and after every view-transition swap
      initNav();
      document.addEventListener('astro:page-load', initNav);
    })();
  <\/script> <!-- Copy-link share button --> <script>
    (function () {
      function initShareBtn() {
        var btn = document.getElementById('copyLink');
        if (!btn || btn._shareBound) return;
        btn._shareBound = true;
        btn.addEventListener('click', function () {
          var url = window.location.href;
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .catch(function () {
              var ta = document.createElement('textarea');
              ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
              document.body.appendChild(ta); ta.select();
              document.execCommand('copy'); document.body.removeChild(ta);
            })
            .then(function () {
              var label = btn.querySelector('.article__share-btn-label');
              btn.classList.add('is-copied');
              if (label) label.textContent = 'Copied!';
              setTimeout(function () {
                btn.classList.remove('is-copied');
                if (label) label.textContent = 'Copy link';
              }, 2200);
            });
        });
      }
      initShareBtn();
      document.addEventListener('astro:page-load', initShareBtn);
    })();
  <\/script> <!-- Enhancement JS --> <script src="/assets/subscribe-form.js"><\/script> <script src="/assets/scroll-animations.js"><\/script> <!-- Lenis smooth scroll — buttery weighted physics on every page --> `, " </body> </html>"])), title, addAttribute(description, "content"), addAttribute(canonicalUrl, "href"), addAttribute(canonicalUrl, "href"), addAttribute(canonicalUrl, "href"), addAttribute(noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large", "content"), addAttribute(title, "content"), addAttribute(description, "content"), addAttribute(ogImageAbsolute, "content"), addAttribute(canonicalUrl, "content"), addAttribute(ogType, "content"), publishedTime && renderTemplate`<meta property="article:published_time"${addAttribute(publishedTime, "content")}>`, modifiedTime && renderTemplate`<meta property="article:modified_time"${addAttribute(modifiedTime, "content")}>`, addAttribute(title, "content"), addAttribute(description, "content"), addAttribute(ogImageAbsolute, "content"), unescapeHTML(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Peninsula Insider",
    url: SITE_URL,
    logo: `${SITE_URL}/images/sourced/home-cover.webp`
  })), renderComponent($$result, "ClientRouter", $$ClientRouter, {}), renderHead(), renderComponent($$result, "Masthead", $$Masthead, { "section": section }), renderSlot($$result, $$slots["default"]), renderComponent($$result, "Footer", $$Footer, {}), renderScript($$result, "/home/node/.openclaw/workspace/peninsula-insider/next/src/layouts/BaseLayout.astro?astro&type=script&index=0&lang.ts"));
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/layouts/BaseLayout.astro", void 0);

export { $$BaseLayout as $ };
