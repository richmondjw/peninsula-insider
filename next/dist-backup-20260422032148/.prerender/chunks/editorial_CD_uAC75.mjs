function baseHref(path) {
  const raw = "/";
  const base = raw.endsWith("/") ? raw : raw + "/";
  if (path === "/" || path === "") return base;
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${clean}`;
}
const formatLabel = {
  "editors-letter": "Editor's Letter",
  "long-lunch-list": "Long Lunch List",
  "cellar-door-dispatch": "Cellar Door Dispatch",
  "stay-notes": "Stay Notes",
  "slow-peninsula": "Slow Peninsula",
  "insider-edit": "Insider Edit",
  interview: "Interview",
  investigation: "Investigation",
  service: "Service",
  "weekend-picker": "Weekend Picker"
};
const eventCategoryLabel = {
  "food-wine": "Food & Wine",
  market: "Markets",
  festival: "Festivals",
  "cellar-door": "Cellar Doors",
  community: "Community",
  arts: "Arts",
  wellness: "Wellness",
  "live-music": "Live Music",
  "racing-sport": "Racing & Sport",
  "family-programs": "Kids & Family",
  exhibition: "Exhibitions",
  civic: "Civic",
  nature: "Nature & Walks",
  "writers-ideas": "Writers & Ideas"
};
const eventLensLabel = {
  "weekend-pick": "Weekend Pick",
  "date-idea": "Date Idea",
  "family-saturday": "Family Saturday",
  "rainy-day": "Rainy Day",
  "worth-the-drive": "Worth The Drive",
  free: "Free",
  "school-holidays": "School Holidays",
  "walk-in": "Walk-In",
  ticketed: "Ticketed",
  "locals-know": "Locals Know"
};
const kidsGradeCopy = {
  A: {
    label: "Kids Grade A",
    blurb: "Bring a pram, bring a toddler, bring a teen  -  everyone will be happy."
  },
  B: {
    label: "Kids Grade B",
    blurb: "One age range event  -  good if you've got 5-to-10s, risky otherwise."
  },
  C: {
    label: "Kids Grade C",
    blurb: "Marketed as family but it's really for adults with tolerant kids."
  },
  "not-for-kids": {
    label: "Adults only",
    blurb: "Leave them at home. This is not the outing."
  }
};
const weatherCopy = {
  "all-weather": "All weather",
  "sunny-only": "Sunny only",
  "rainy-day-rescue": "Rainy-day rescue",
  "weather-proof": "Weather-proof",
  mixed: "Weather flexible"
};
function isUpcoming(date, now = /* @__PURE__ */ new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() >= today.getTime();
}
function eventDateLabel(start, end) {
  const fmt = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const short = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long" });
  if (!end || end.getTime() === start.getTime()) return fmt(start);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${short(start)} – ${sameYear ? fmt(end) : fmt(end)}`;
}
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
const stayTypes = ["hotel", "villa", "cottage", "glamping", "farm-stay", "spa"];
const wineTypes = ["winery", "producer", "brewery", "distillery"];
function titleize(value) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
function placeLabel(place) {
  return titleize(String(place?.id ?? place ?? ""));
}
function venueHrefPrefix(type) {
  if (stayTypes.includes(type)) return baseHref("/stay");
  if (wineTypes.includes(type)) return baseHref("/wine");
  return baseHref("/eat");
}
function routeSlug(entry) {
  return entry.slug ?? entry.id ?? entry?.data?.slug ?? entry?.data?.id;
}
const placesWithHero = /* @__PURE__ */ new Set([
  "balnarring",
  "cape-schanck",
  "dromana",
  "flinders",
  "main-ridge",
  "merricks",
  "moorooduc",
  "mornington",
  "mount-martha",
  "point-nepean",
  "portsea",
  "red-hill",
  "rosebud",
  "rye",
  "safety-beach",
  "sorrento"
]);
function resolveHeroSrc(data) {
  const src = data?.heroImage?.src;
  if (src && !src.includes("placeholder")) return src;
  const place = String(data?.place?.id ?? data?.place ?? "");
  if (place && placesWithHero.has(place)) {
    return baseHref(`/images/sourced/place-${place}-01.webp`);
  }
  return baseHref("/images/sourced/home-cover.webp");
}
function heroBackgroundStyle(data) {
  return `background-image: url(${resolveHeroSrc(data)}); background-size: cover; background-position: center;`;
}
function currentSeason(date = /* @__PURE__ */ new Date()) {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return "summer";
  if (m >= 2 && m <= 4) return "autumn";
  if (m >= 5 && m <= 7) return "winter";
  return "spring";
}
const seasonBlurb = {
  summer: {
    label: "The summer issue",
    line: "Back beaches at 5pm, bay swims at dawn, and long lunches that stretch until the light goes long."
  },
  autumn: {
    label: "The autumn issue",
    line: "Vintage on the ridge, pinot lunches in low sun, and cellar doors with a fire going in the corner."
  },
  winter: {
    label: "The winter issue",
    line: "Thermal springs, pub dinners, long-lunch fireplaces, and walks the crowds have finally left alone."
  },
  spring: {
    label: "The spring issue",
    line: "New menus, fresh vintage releases, wildflower walks, and the most generous midweek bookings of the year."
  }
};
function isLocalFavourite(venue) {
  const audience = venue?.data?.tags?.audience ?? [];
  return audience.includes("locals");
}
function isFirstTimer(venue) {
  const audience = venue?.data?.tags?.audience ?? [];
  if (audience.includes("first-timers")) return true;
  const type = venue?.data?.type;
  return ["cafe", "market", "bakery"].includes(type);
}
function inSeason(venue, season) {
  const seasons = venue?.data?.tags?.season ?? [];
  return seasons.includes(season) || seasons.includes("all-year");
}
function experienceInSeason(experience, season) {
  const seasons = experience?.data?.seasonBest ?? [];
  if (seasons.length === 0) return true;
  return seasons.includes(season) || seasons.includes("all-year");
}

export { typeLabel as a, isFirstTimer as b, currentSeason as c, inSeason as d, stayTypes as e, experienceInSeason as f, formatLabel as g, heroBackgroundStyle as h, isLocalFavourite as i, isUpcoming as j, kidsGradeCopy as k, weatherCopy as l, eventCategoryLabel as m, eventDateLabel as n, eventLensLabel as o, placeLabel as p, routeSlug as r, seasonBlurb as s, titleize as t, venueHrefPrefix as v, wineTypes as w };
