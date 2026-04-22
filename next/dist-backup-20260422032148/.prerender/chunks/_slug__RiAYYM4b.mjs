import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$VenueDetailTemplate } from './VenueDetailTemplate_zFcPY4iK.mjs';
import { r as routeSlug, t as titleize, a as typeLabel } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
async function getStaticPaths() {
  const wineTypes = ["winery", "producer", "brewery", "distillery"];
  const venues = await getCollection("venues");
  return venues.filter((venue) => wineTypes.includes(venue.data.type)).map((venue) => ({
    params: { slug: routeSlug(venue) },
    props: { venue }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const wineTypes = ["winery", "producer", "brewery", "distillery"];
  const { venue } = Astro2.props;
  const slug = routeSlug(venue);
  const allVenues = await getCollection("venues");
  const related = allVenues.filter((entry) => routeSlug(entry) !== slug).filter((entry) => wineTypes.includes(entry.data.type)).slice(0, 3);
  const articles = (await getCollection("articles", ({ data }) => data.status === "published")).filter(
    (article) => article.data.relatedVenues.some((entry) => String(entry.id ?? entry) === slug)
  ).slice(0, 3);
  const itineraries = (await getCollection("itineraries")).filter(
    (itinerary) => itinerary.data.stops.some((stop) => String(stop.venue?.id ?? stop.venue ?? "") === slug)
  ).slice(0, 2);
  const venuePlaceName = titleize(String(venue.data.place?.id ?? venue.data.place ?? ""));
  typeLabel[venue.data.type] ?? titleize(venue.data.type);
  const sigDesc = (venue.data.signature ?? "").trim();
  const editorLead = (venue.data.editorNote ?? "").split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  const description = sigDesc.length >= 90 ? sigDesc : (editorLead || sigDesc).slice(0, 158);
  const canonical = `https://peninsulainsider.com.au/wine/${slug}`;
  const ogImage = venue.data.heroImage?.src && !venue.data.heroImage.src.includes("placeholder") ? venue.data.heroImage.src : "/images/sourced/home-cover.webp";
  const venueSchema = {
    "@context": "https://schema.org",
    "@type": ["Winery", "LocalBusiness"],
    name: venue.data.name,
    description: venue.data.signature,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.data.address,
      addressRegion: "VIC",
      addressCountry: "AU"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.data.coordinates?.lat,
      longitude: venue.data.coordinates?.lng
    },
    ...venue.data.website ? { url: venue.data.website } : {},
    ...venue.data.phone ? { telephone: venue.data.phone } : {},
    ...venue.data.priceBand ? { priceRange: venue.data.priceBand } : {}
  };
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${venue.data.name}, ${venuePlaceName} · Peninsula Insider`, "description": description, "section": "wine", "canonical": canonical, "ogImage": ogImage }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " "])), unescapeHTML(JSON.stringify(venueSchema)), renderComponent($$result2, "VenueDetailTemplate", $$VenueDetailTemplate, { "venue": venue, "section": "wine", "related": related, "articles": articles, "itineraries": itineraries })) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/wine/[slug].astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/wine/[slug].astro";
const $$url = "/wine/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
