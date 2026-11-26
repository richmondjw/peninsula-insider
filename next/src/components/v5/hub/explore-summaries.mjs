/** One-line reasons for the Explore hub: why a place earns its spot.
 *
 * Every line restates facts already in that entry's editorNote (distances,
 * designers, dates, what is there, who it suits). Change a line when its
 * record changes. Never add access, amenity, price or condition claims the
 * record does not make, and keep the swim warning on ocean beaches: the
 * records say they are unpatrolled or unsuitable for swimming.
 * Limits (tested): 25 words, a full stop, no ellipsis, no em-dash. */
const summaries = {
  'arthurs-seat-lookout': 'The Peninsula’s highest point. Ride the Eagle gondola up and the whole region lays itself out below, from the bay to the Melbourne horizon.',
  'ashcombe-maze': 'Australia’s oldest symmetrical hedge maze, a lavender labyrinth and a café that puts lavender in everything. Best in spring.',
  'balnarring-beach': 'Western Port’s quiet answer to the bay beaches: paler sand, flatter water, kilometres of it, and mostly locals.',
  'bushrangers-bay-walk': 'A 5.4 km return through coastal scrub to a wild ocean bay. Steep stairs on the way back, and it is not a swimming beach.',
  'bushrangers-bay': 'Dramatic rock formations and Southern Ocean views at the end of a two-hour return walk. Come to look, not to swim.',
  'cape-schanck-boardwalk': 'Basalt cliffs, pounding water and the lighthouse in one compact stop. Stairs lead down to the rock platform if you want more.',
  'cape-schanck-lighthouse-walk': 'A boardwalk past the 1859 lighthouse to Pulpit Rock, with Bass Strait on both sides. About 90 minutes for the 4 km return.',
  'coastal-walk-cape-schanck': 'The Peninsula’s longest coastal walk: 26 km of Bass Strait cliff and cove. Almost nobody walks it all, so pick a section.',
  'coppins-track': 'Four kilometres of clifftop heath from Sorrento Ocean Beach to Diamond Bay, a small beach that is almost always empty.',
  'dromana-beach': 'A long, gentle arc of shallow bay water with lawn and shade behind it. The easy family beach, without Sorrento’s parking battles.',
  'eagle-ridge-golf-course': 'An 18-hole public course in Boneo that welcomes golfers of every ability, with tee times booked online.',
  'farnsworth-track': 'The best view for the least effort: 1.5 km of Bass Strait clifftop between Portsea Ocean Beach and London Bridge.',
  'flinders-golf-club': 'Eighteen holes above West Head with the coast in view. Visitors book through the golf shop.',
  'greens-bush-two-bays-section': 'The Peninsula’s best bushwalk: 8.9 km one way past 200-year-old grasstrees, fern gullies and the occasional kangaroo.',
  'gunnamatta-ocean-beach': 'Long, wild and nearly empty outside summer. Come to walk and watch Bass Strait at work; the rips make it no place to swim.',
  'montalto-sculpture-trail': 'Contemporary Australian sculpture through the vines and gardens, in under an hour. Walk it before or after lunch at Montalto.',
  'moonah-links': 'Two 18-hole courses in Fingal, including the Open Course that hosted the Australian Open in 2003 and 2005.',
  'mornington-foreshore-walk': 'Seven kilometres of bay views, bathing boxes and small beaches between Mornington and Mount Martha. The Peninsula’s most dog-friendly long walk.',
  'mornington-golf-club': 'Public green-fee bookings and views across Port Phillip Bay, easy to fit into a Mornington stay.',
  'mornington-peninsula-gallery': 'The region’s best gallery, strong on Australian modernism and free to enter. The Peninsula’s first answer to a wet day.',
  'mount-martha-beach': 'A bay beach with bathing boxes and the village a short walk away. Check conditions before you swim.',
  'point-nepean-fort-walk': 'Old quarantine buildings and cliff-edge lookouts, then bunkers and gun emplacements facing the Heads. Check park notices for closed sections.',
  'point-nepean-national-park': 'The tip of the Peninsula: a former defence site where the first Allied shots of both World Wars were fired. Best by bike or shuttle.',
  'portsea-front-beach': 'White sand and calm bay water, small enough to feel private, with the Portsea Hotel two minutes up the hill.',
  'portsea-golf-club': 'A course that winds through coastal dunes and Moonah forest. Visitor days vary, so check the club’s calendar first.',
  'pt-leo-sculpture-park': 'More than seventy works, Antony Gormley among them, across sixteen acres above the vines. A serious outdoor gallery; entry is ticketed.',
  'racv-cape-schanck-golf-course': 'Robert Trent Jones Jr’s par-70 resort course: tree-lined fairways and elevated tees with ocean views.',
  'red-hill-hinterland-cycling': 'Quiet back roads linking cellar doors, farms and viewpoints. Make it a half-day loop with lunch in the middle; hire bikes in Red Hill.',
  'red-hill-truffles': 'Follow trained dogs through a working truffle farm. A different truffle comes up in each season, so check the hunt calendar.',
  'rosebud-country-club': 'Thirty-six holes across the North and South courses, with a clubhouse that suits a group based around Rosebud.',
  'rye-ocean-beach': 'A wide, exposed back beach for walking, often close to empty, and near enough to Peninsula Hot Springs to pair with a soak.',
  'safety-beach-foreshore': 'Shallow, sheltered bay water and a flat shoreline that runs for kilometres towards Mount Martha. Still check conditions on the day.',
  'sea-search-encounters': 'Snorkel with the seal colony at Chinaman’s Hat or over the sponge gardens at the Heads. Gear supplied, booking essential, competent swimmers only.',
  'sorrento-back-beach': 'The surf side of Sorrento: more force, more wind and the best dusk light. Walk it in any season; swim only between the flags.',
  'sorrento-ferry': 'Forty minutes across the bay to Queenscliff, often with dolphins and seals on the way. Go as a foot passenger for a day trip.',
  'sorrento-golf-club': 'A private parkland course with limited visitor times, and none from Boxing Day to the end of January. Call the pro shop first.',
  'sorrento-ocean-baths': 'Rock pools to walk to and look at, best at low tide in calm conditions. Treat it as a viewing stop, not a swim.',
  'st-andrews-beach-golf-course': 'Tom Doak’s fully public 18 holes in Fingal, open to visitors seven days a week.',
  'summit-circuit-arthurs-seat': 'A 1.8 km loop past Seawinds Gardens and the lookouts, with the bay on one side and the ocean on the other. An easy hour.',
  'sunny-ridge-strawberry-farm': 'Pick your own strawberries from November to April, pay by weight, then finish with ice cream made from the farm’s fruit.',
  'the-dunes-golf-links': 'Tony Cashmore’s public championship links in the Rye dunes, plus the nine-hole Cups Course for a quicker round.',
  'the-national-golf-club': 'Three championship courses on one Cape Schanck plateau and a fourth at Frankston. A private club, so sort out access before you plan around it.',
  'two-bays-walking-track': 'The signature long walk: 26 km from the bay at Dromana to Bass Strait at Cape Schanck. Most people do it in sections.',
  // Springs, spas and markets live in the venues collection.
  'peninsula-hot-springs': 'The original Peninsula thermal springs: still the biggest, and still the most complete circuit for people who want the full ritual.',
  'alba-thermal-springs': 'Geothermal, rain, botanical and cold-plunge pools, with a sauna and steam room. Choose a bathing session and keep the rest of the day light.',
  'endota-spa-mornington': 'The practical day spa for a Mornington weekend: a short walk from the treatment table to lunch on Main Street.',
  'one-spa-racv-cape-schanck': 'A resort spa high on the cliffs at Cape Schanck, with Southern Ocean views and a treatment menu broad enough to fill a day.',
  'spa-by-jackalope': 'A small, design-led spa in the Jackalope vineyard: dark, sculptural treatment rooms and Australian-made botanicals. Book the earliest session.',
  'mornington-farmers-market': 'A produce market in Mornington Park on the second Saturday of each month, 8am to 1pm.',
  'mornington-main-street-market': 'Stalls along Main Street every Wednesday. The easy one to fold into a Mornington town day.',
  'mount-eliza-farmers-market': 'A village farmers market on the fourth Sunday of each month, 9am to 1pm, with producers from the Mornington corridor.',
  'rye-beachside-market': 'On the Rye foreshore opposite the Rye Hotel, the first Saturday of each month from 8.30am to 2pm.',
};

export function exploreSummary(slug, data) {
  if (summaries[slug]) return summaries[slug];
  // Complete existing short copy may survive; longer prose is never cut into a fragment.
  for (const text of [data.signature, data.whyWeGo]) {
    if (typeof text === 'string' && text.trim().split(/\s+/).length <= 25) return text.trim();
  }
  if (data.type === 'market') return 'Check the next market date and location before travelling; individual stall line-ups can change.';
  if (data.type === 'spa') return 'Choose your treatment or bathing session, then check the operator’s current booking and access information.';
  return 'Read the visit details, then check current opening and access information before travelling.';
}

export function effortLabel(data) {
  // A walk grading is not a mobility-access claim and should not label a gallery or beach.
  if (data.type !== 'walk' || !['easy', 'moderate', 'hard'].includes(data.difficulty)) return undefined;
  return `${data.difficulty[0].toUpperCase()}${data.difficulty.slice(1)} walk`;
}

// ── Explore hub ordering and decision facts (2026-11-21) ─────────────────────

/** Our first ten, in order: a spread of kinds and corners of the Peninsula.
 * The first is set large on the hub, so the count stays at one plus a multiple
 * of three. Editorial choice; change the order here, nowhere else. */
export const EXPLORE_PICKS = [
  'peninsula-hot-springs',
  'cape-schanck-lighthouse-walk',
  'sorrento-back-beach',
  'point-nepean-national-park',
  'arthurs-seat-lookout',
  'pt-leo-sculpture-park',
  'mornington-foreshore-walk',
  'sorrento-ferry',
  'balnarring-beach',
  'farnsworth-track',
];

const TYPE_ROTATION = ['walk', 'beach', 'spa', 'lookout', 'gallery', 'attraction', 'tour', 'park', 'market', 'golf-course'];

/** Order a list of { slug, type, name }: the picks first, then the rest dealt
 * one kind at a time so no stretch of the list is all golf or all beaches. */
export function exploreOrder(items) {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const picked = EXPLORE_PICKS.map((slug) => bySlug.get(slug)).filter(Boolean);
  const taken = new Set(picked.map((item) => item.slug));
  const queues = new Map();
  for (const item of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
    if (taken.has(item.slug)) continue;
    const key = TYPE_ROTATION.includes(item.type) ? item.type : 'attraction';
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(item);
  }
  const rest = [];
  let dealt = true;
  while (dealt) {
    dealt = false;
    for (const key of TYPE_ROTATION) {
      const next = queues.get(key)?.shift();
      if (next) { rest.push(next); dealt = true; }
    }
  }
  return [...picked, ...rest];
}

export const TIME_OPTIONS = [
  { value: 'hour', label: 'An hour or less' },
  { value: 'couple', label: 'A couple of hours' },
  { value: 'half-day', label: 'Half a day' },
  { value: 'full-day', label: 'A full day' },
];

/** Which "How long have you got?" answer a recorded duration falls under.
 * No recorded duration means no answer: the place is never guessed into one. */
export function timeBucket(minutes) {
  if (typeof minutes !== 'number' || minutes <= 0) return undefined;
  if (minutes <= 60) return 'hour';
  if (minutes <= 150) return 'couple';
  if (minutes <= 300) return 'half-day';
  return 'full-day';
}

const QUARTERS = { 0: '', 15: '¼', 30: '½', 45: '¾' };

/** "45 min", "1½ hr", "Full day". Quarter-hours print as fractions, never "1.3 hr". */
export function timeLabel(minutes) {
  if (typeof minutes !== 'number' || minutes <= 0) return undefined;
  if (minutes > 300) return 'Full day';
  if (minutes < 60) return `${minutes} min`;
  const rounded = Math.round(minutes / 15) * 15;
  const hours = Math.floor(rounded / 60);
  return `${hours}${QUARTERS[rounded % 60]} hr`;
}

// Restates each record: gallery entry terms from its editorNote, market days
// from its signature. Change with the record.
const CUES = {
  'mornington-peninsula-gallery': 'Free entry',
  'pt-leo-sculpture-park': 'Ticketed entry',
  'mornington-farmers-market': 'Second Saturday',
  'mornington-main-street-market': 'Wednesdays',
  'rye-beachside-market': 'First Saturday',
  'mount-eliza-farmers-market': 'Fourth Sunday',
};

// From each course record's golf.access field.
const GOLF_ACCESS = {
  public: 'Open to visitors',
  'semi-private': 'Visitors by booking',
  private: 'Members and guests',
};

/** One practical cue for the card, only where the record supports it. */
export function exploreCue(slug, data) {
  if (CUES[slug]) return CUES[slug];
  if (data.type === 'golf-course') return GOLF_ACCESS[data.golf?.access];
  // Opening hours recorded for all seven days of the week.
  const days = new Set((data.visiting?.openingHours ?? []).flatMap((row) => row.days ?? []));
  if (days.size === 7) return 'Open every day';
  return undefined;
}

/** A beach has no finish line: say roughly how long people stay, not "1¼ hr".
 * Same grammar as timeLabel ("1 hr", "Half a day") so a list of cards reads as
 * one set of facts (2026-11-27 critique: five duration styles on one page). */
export function beachTimeLabel(minutes) {
  if (typeof minutes !== 'number' || minutes <= 0) return undefined;
  if (minutes <= 60) return 'About 1 hr';
  if (minutes <= 150) return '1 to 2 hr';
  return 'Half a day';
}

/** Where to book, when the record carries a booking page. A members' club's page is not one. */
export function exploreBookingUrl(data) {
  if (data.golf?.access === 'private') return undefined;
  const url = data.type === 'golf-course' ? data.golf?.bookingUrl ?? data.bookingUrl : data.bookingUrl;
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url : undefined;
}

/** "18 holes" for a course; the record's holes count across all its courses. */
export function golfLabel(data) {
  const holes = data.golf?.holes;
  return data.type === 'golf-course' && typeof holes === 'number' && holes > 0 ? `${holes} holes` : undefined;
}

/** Who or what day a place suits, from the tags the filters already use. */
export function exploreSuits(facets, data, slug) {
  // A rainy-day tag on a garden means its café, and the springs are outdoors: only say it of a gallery.
  if ((facets.mood ?? []).includes('rainy-day') && data?.type === 'gallery') return 'Works in the rain';
  // Only where the record itself is tagged as a family outing, not merely
  // listed with families among its audiences: half the guide would carry it.
  // Not on an outing whose own line sets a swimming requirement.
  if ((data?.tags?.mood ?? []).includes('family') && !NOT_FOR_SMALL_CHILDREN.includes(slug)) return 'Good with kids';
  return undefined;
}
const NOT_FOR_SMALL_CHILDREN = ['sea-search-encounters'];
