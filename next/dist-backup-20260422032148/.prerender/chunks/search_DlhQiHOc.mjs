import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead } from './prerender_DgZBHBwL.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Search = createComponent(async ($$result, $$props, $$slots) => {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Search" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Search | Peninsula Insider", "description": "Search Peninsula Insider for places, stays, long lunches, beaches, itineraries, events, and local intelligence across the Mornington Peninsula.", "section": "home" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", " ", `<section class="search-page"> <div class="container search-page__inner"> <div class="search-page__header"> <p class="label label--accent">Search</p> <h1 class="search-page__title">Search the Peninsula</h1> <p class="search-page__intro">Find places, long lunches, stays, beaches, itineraries, events, and journal pieces across Peninsula Insider.</p> </div> <div class="search-page__box"> <label class="search-page__label" for="site-search">Search the guide</label> <input id="site-search" class="search-page__input" type="search" placeholder="Try Red Hill, long lunch, family beach, Sorrento stay..." autocomplete="off"> <p class="search-page__hint">Search works across articles, venue pages, place guides, itineraries, experiences, and events.</p> </div> <div id="search-results" class="search-page__results" aria-live="polite"></div> </div> </section> <script>
    let pagefindInstance;
    const input = document.getElementById('site-search');
    const results = document.getElementById('search-results');

    function escapeHtml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async function loadPagefind() {
      if (pagefindInstance) return pagefindInstance;
      pagefindInstance = await import('/pagefind/pagefind.js');
      return pagefindInstance;
    }

    function renderEmpty(state) {
      if (state === 'idle') {
        results.innerHTML = '<div class="search-state"><p>Start typing to search the guide.</p></div>';
        return;
      }
      if (state === 'none') {
        results.innerHTML = '<div class="search-state"><p>No results yet. Try a town, mood, or trip type.</p></div>';
      }
    }

    async function runSearch(query) {
      const q = query.trim();
      if (!q) {
        renderEmpty('idle');
        return;
      }

      results.innerHTML = '<div class="search-state"><p>Searching…</p></div>';
      const { search } = await loadPagefind();
      const searchResult = await search(q, { limit: 12 });

      if (!searchResult.results.length) {
        renderEmpty('none');
        return;
      }

      const data = await Promise.all(searchResult.results.map((item) => item.data()));
      results.innerHTML = \`
        <div class="search-results-meta">\${searchResult.results.length} result\${searchResult.results.length === 1 ? '' : 's'}</div>
        <div class="search-results-grid">
          \${data.map((item) => \`
            <article class="search-card">
              <p class="search-card__url">\${escapeHtml(item.url)}</p>
              <h2 class="search-card__title"><a href="\${item.url}">\${escapeHtml(item.meta.title || 'Untitled')}</a></h2>
              <p class="search-card__excerpt">\${item.excerpt || ''}</p>
            </article>
          \`).join('')}
        </div>
      \`;
    }

    renderEmpty('idle');
    input?.addEventListener('input', (event) => runSearch(event.target.value));
  <\/script> `], [" ", " ", `<section class="search-page"> <div class="container search-page__inner"> <div class="search-page__header"> <p class="label label--accent">Search</p> <h1 class="search-page__title">Search the Peninsula</h1> <p class="search-page__intro">Find places, long lunches, stays, beaches, itineraries, events, and journal pieces across Peninsula Insider.</p> </div> <div class="search-page__box"> <label class="search-page__label" for="site-search">Search the guide</label> <input id="site-search" class="search-page__input" type="search" placeholder="Try Red Hill, long lunch, family beach, Sorrento stay..." autocomplete="off"> <p class="search-page__hint">Search works across articles, venue pages, place guides, itineraries, experiences, and events.</p> </div> <div id="search-results" class="search-page__results" aria-live="polite"></div> </div> </section> <script>
    let pagefindInstance;
    const input = document.getElementById('site-search');
    const results = document.getElementById('search-results');

    function escapeHtml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async function loadPagefind() {
      if (pagefindInstance) return pagefindInstance;
      pagefindInstance = await import('/pagefind/pagefind.js');
      return pagefindInstance;
    }

    function renderEmpty(state) {
      if (state === 'idle') {
        results.innerHTML = '<div class="search-state"><p>Start typing to search the guide.</p></div>';
        return;
      }
      if (state === 'none') {
        results.innerHTML = '<div class="search-state"><p>No results yet. Try a town, mood, or trip type.</p></div>';
      }
    }

    async function runSearch(query) {
      const q = query.trim();
      if (!q) {
        renderEmpty('idle');
        return;
      }

      results.innerHTML = '<div class="search-state"><p>Searching…</p></div>';
      const { search } = await loadPagefind();
      const searchResult = await search(q, { limit: 12 });

      if (!searchResult.results.length) {
        renderEmpty('none');
        return;
      }

      const data = await Promise.all(searchResult.results.map((item) => item.data()));
      results.innerHTML = \\\`
        <div class="search-results-meta">\\\${searchResult.results.length} result\\\${searchResult.results.length === 1 ? '' : 's'}</div>
        <div class="search-results-grid">
          \\\${data.map((item) => \\\`
            <article class="search-card">
              <p class="search-card__url">\\\${escapeHtml(item.url)}</p>
              <h2 class="search-card__title"><a href="\\\${item.url}">\\\${escapeHtml(item.meta.title || 'Untitled')}</a></h2>
              <p class="search-card__excerpt">\\\${item.excerpt || ''}</p>
            </article>
          \\\`).join('')}
        </div>
      \\\`;
    }

    renderEmpty('idle');
    input?.addEventListener('input', (event) => runSearch(event.target.value));
  <\/script> `])), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead()) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/search.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/search.astro";
const $$url = "/search";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Search,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
