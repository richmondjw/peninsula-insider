import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, b as addAttribute, F as Fragment, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection, r as renderEntry } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$ExperienceCard } from './ExperienceCard_BzrVPHmr.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { r as routeSlug, h as heroBackgroundStyle, v as venueHrefPrefix, t as titleize, g as formatLabel } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
async function getStaticPaths() {
  const articles = await getCollection("articles", ({ data }) => data.status === "published");
  return articles.map((article) => ({
    params: { slug: routeSlug(article) },
    props: { article }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const { article } = Astro2.props;
  const { Content } = await renderEntry(article);
  const allArticles = (await getCollection("articles", ({ data }) => data.status === "published")).sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const currentIndex = allArticles.findIndex((a) => routeSlug(a) === routeSlug(article));
  const prevArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;
  const nextArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const moreArticles = allArticles.filter((entry) => routeSlug(entry) !== routeSlug(article)).filter((entry) => {
    if (entry.data.format === article.data.format) return true;
    return entry.data.tags.some((tag) => article.data.tags.includes(tag));
  }).slice(0, 3);
  const moreFallback = allArticles.filter((entry) => routeSlug(entry) !== routeSlug(article)).slice(0, 3);
  const relatedArticles = moreArticles.length >= 2 ? moreArticles : moreFallback;
  const allVenues = await getCollection("venues");
  const relatedVenueSlugs = (article.data.relatedVenues ?? []).map((entry) => String(entry.id ?? entry));
  const relatedVenues = allVenues.filter((venue) => relatedVenueSlugs.includes(routeSlug(venue))).slice(0, 3);
  const allExperiences = await getCollection("experiences");
  const relatedExperienceSlugs = (article.data.relatedExperiences ?? []).map((entry) => String(entry.id ?? entry));
  const relatedExperiences = allExperiences.filter((exp) => relatedExperienceSlugs.includes(routeSlug(exp))).slice(0, 3);
  const authorLabel = article.data.houseByline ? "The Peninsula Insider" : String(article.data.author?.id ?? article.data.author);
  const articleHeroStyle = heroBackgroundStyle(article.data);
  const slug = routeSlug(article);
  const canonical = `https://peninsulainsider.com.au/journal/${slug}`;
  const ogImage = article.data.heroImage?.src && !article.data.heroImage.src.includes("placeholder") ? article.data.heroImage.src : "/images/sourced/home-cover.webp";
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Journal", href: "/journal" },
    { label: article.data.title }
  ];
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.data.title,
    description: article.data.dek,
    datePublished: article.data.publishedAt.toISOString(),
    ...article.data.updatedAt ? { dateModified: article.data.updatedAt.toISOString() } : {},
    author: {
      "@type": "Organization",
      name: "Peninsula Insider",
      url: "https://peninsulainsider.com.au"
    },
    publisher: {
      "@type": "Organization",
      name: "Peninsula Insider",
      url: "https://peninsulainsider.com.au",
      logo: {
        "@type": "ImageObject",
        url: "https://peninsulainsider.com.au/images/sourced/home-cover.webp"
      }
    },
    ...ogImage !== "/images/sourced/home-cover.webp" ? { image: `https://peninsulainsider.com.au${ogImage}` } : {},
    mainEntityOfPage: canonical,
    url: canonical
  };
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${article.data.title} | Peninsula Insider`, "description": article.data.dek, "section": "journal", "canonical": canonical, "ogImage": ogImage, "ogType": "article", "publishedTime": article.data.publishedAt.toISOString(), "modifiedTime": (article.data.updatedAt ?? article.data.publishedAt).toISOString() }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", '<article class="article"> <div class="container"> <div class="article__meta"> <span class="article__format">', '</span> <span class="article__dot" aria-hidden="true"></span> <span class="article__meta-item">', "</span> ", ' </div> <h1 class="article__title">', '</h1> <p class="article__dek">', '</p> <div class="article__byline"> <span class="article__byline-name">By ', "</span> ", " </div> ", ' <div class="article__hero" aria-hidden="true"', '> <div class="article__hero-fog"></div> <span class="article__hero-caption">', '</span> </div> <div class="prose"> ', ' </div> <div class="article__share"> <span class="article__share-label">Share this piece</span> <div class="article__share-actions"> <button class="article__share-btn" id="copyLink" aria-label="Copy link to clipboard"> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> <span class="article__share-btn-label">Copy link</span> </button> <a', ' target="_blank" rel="noopener noreferrer" class="article__share-btn" aria-label="Share on X / Twitter"> <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg> <span class="article__share-btn-label">X / Twitter</span> </a> <a', ' target="_blank" rel="noopener noreferrer" class="article__share-btn" aria-label="Share on Facebook"> <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path></svg> <span class="article__share-btn-label">Facebook</span> </a> </div> </div> </div> </article> ', "", "", "", "", " "])), unescapeHTML(JSON.stringify(articleSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), formatLabel[article.data.format] ?? article.data.format, article.data.publishedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }), article.data.readingTimeMinutes && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <span class="article__dot" aria-hidden="true"></span> <span class="article__meta-item">${article.data.readingTimeMinutes} min read</span> ` })}`, article.data.title, article.data.dek, authorLabel, article.data.updatedAt && renderTemplate`<span class="article__byline-updated">
Updated ${article.data.updatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} </span>`, article.data.tags.length > 0 && renderTemplate`<div class="article__tags"> ${article.data.tags.map((tag) => renderTemplate`<span class="article__tag">${titleize(tag)}</span>`)} </div>`, addAttribute(articleHeroStyle, "style"), article.data.heroImage.alt, renderComponent($$result2, "Content", Content, {}), addAttribute(`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(article.data.title + " — via @PeninsulaInsider")}`, "href"), addAttribute(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`, "href"), relatedArticles.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Keep reading</p> <h2 class="venues__title">More from the Journal</h2> </div> <a href="/journal" class="venues__link">All stories →</a> </div> <div class="venues__grid"> ${relatedArticles.map((entry) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": entry })}`)} </div> </div> </section>`, relatedVenues.length > 0 && renderTemplate`<section class="venues"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Mentioned in this piece</p> <h2 class="venues__title">Venues worth opening in a new tab</h2> <p class="venues__sub">Every venue referenced has its own page with editor notes, booking links, and nearby picks.</p> </div> </div> <div class="venues__grid"> ${relatedVenues.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": venueHrefPrefix(venue.data.type) })}`)} </div> </div> </section>`, relatedExperiences.length > 0 && renderTemplate`<section class="experience-index"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Experiences in this piece</p> <h2 class="venues__title">The non-restaurant moves that round out the trip</h2> </div> <a href="/explore" class="venues__link">Explore all →</a> </div> <div class="experience-grid"> ${relatedExperiences.map((exp) => renderTemplate`${renderComponent($$result2, "ExperienceCard", $$ExperienceCard, { "experience": exp })}`)} </div> </div> </section>`, (prevArticle || nextArticle) && renderTemplate`<nav class="article-nav" aria-label="Article navigation"> <div class="container"> <div class="article-nav__inner"> ${prevArticle ? renderTemplate`<a${addAttribute(`/journal/${routeSlug(prevArticle)}`, "href")} class="article-nav__link article-nav__link--prev"> <span class="article-nav__direction">← Previous</span> <span class="article-nav__link-title">${prevArticle.data.title}</span> </a>` : renderTemplate`<div></div>`} ${nextArticle ? renderTemplate`<a${addAttribute(`/journal/${routeSlug(nextArticle)}`, "href")} class="article-nav__link article-nav__link--next"> <span class="article-nav__direction">Next →</span> <span class="article-nav__link-title">${nextArticle.data.title}</span> </a>` : renderTemplate`<div></div>`} </div> </div> </nav>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/journal/[slug].astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/journal/[slug].astro";
const $$url = "/journal/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
