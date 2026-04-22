import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './prerender_DgZBHBwL.mjs';
import 'clsx';

const $$VenueCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$VenueCard;
  const typeLabel = {
    restaurant: "Restaurant",
    winery: "Winery",
    cafe: "Café",
    bakery: "Bakery",
    pub: "Pub",
    brewery: "Brewery",
    distillery: "Distillery",
    producer: "Producer",
    market: "Market",
    hotel: "Hotel",
    villa: "Villa",
    cottage: "Cottage",
    glamping: "Glamping",
    "farm-stay": "Farm Stay",
    spa: "Spa"
  };
  const { venue, hrefPrefix = "/eat" } = Astro2.props;
  const data = venue.data;
  const slug = venue.id ?? data.slug;
  const href = `${hrefPrefix}/${slug}`;
  const placeLabel = String(data.place?.id ?? data.place ?? "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const shortAddress = data.address?.split(",").slice(-2).join(",").trim() ?? "";
  const hats = data.authority?.hats ?? 0;
  return renderTemplate`${maybeRenderHead()}<article class="venue-card"> <div class="venue-card__top"> <span class="venue-card__type"> ${typeLabel[data.type] ?? data.type} · <a${addAttribute(`/places/${data.place?.id ?? data.place}`, "href")} class="venue-card__place-link">${placeLabel}</a> </span> <span class="venue-card__price">${data.priceBand}</span> </div> <h3 class="venue-card__name"> <a${addAttribute(href, "href")}>${data.name}</a> </h3> <p class="venue-card__place">${shortAddress}</p> ${hats > 0 && renderTemplate`<div class="venue-card__hats"${addAttribute(`${hats} Good Food Guide hat${hats > 1 ? "s" : ""}`, "aria-label")}> ${Array.from({ length: hats }).map(() => renderTemplate`<span class="venue-card__hat" aria-hidden="true"></span>`)} </div>`} <p class="venue-card__signature">${data.signature}</p> <div class="venue-card__actions"> <a${addAttribute(href, "href")} class="venue-card__cta">Editor's notes →</a> ${data.bookingUrl && data.bookingProvider !== "none" && renderTemplate`<a${addAttribute(data.bookingUrl, "href")} target="_blank" rel="noopener noreferrer" class="venue-card__book"${addAttribute((e) => e.stopPropagation(), "onClick")}>Book →</a>`} </div> </article>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/VenueCard.astro", void 0);

export { $$VenueCard as $ };
