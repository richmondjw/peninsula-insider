/**
 * Ask PI, answered from the published guides.
 *
 * Runs in the reader's browser against /ask/index.json (built by
 * scripts/generate-ask-index.mjs from the text of the published pages). It
 * matches a question to pages; it does not write facts. Every title, summary
 * and detail in a reply is copied from the page the card links to, and every
 * sentence of its own is fixed wording about what it matched and what it
 * cannot check. Nothing is sent anywhere and nothing is stored.
 *
 * Pure functions only, so the same file runs under node --test.
 */

export const ASK_MAX_LENGTH = 500;
export const ASK_PAGE_SIZE = 5;

const STOP = new Set(('a an the of in on at for to and or with is are there any some me i we us my our you your what whats where wheres which who how can ' +
  'could should would do does did go find show tell give get about near nearby around good best great nice top recommend recommendation suggest ' +
  'place places somewhere something anything thing things please want looking look need like it that this be have has mornington peninsula pi from by as ' +
  's t im were going visit visiting spot spots option options idea ideas here then after before also too just really very more other another one day ' +
  'take bring will if so but not no yes ok okay hi hello thanks thank got know love would id wed lets let whether somewhere anywhere may might shall ' +
  'whats wheres hows friendly way much many kind sort type').split(' '));

function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && /(?:ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function normalise(text) {
  return String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[‘’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Words a page or a question can be matched on. */
export function tokens(text) {
  return normalise(text).split(' ').filter((word) => word && !STOP.has(word)).map(stem).filter((word) => word.length > 1 && !STOP.has(word));
}

// Reader words mapped to the words our pages use. Applied to questions only.
const SYNONYMS = { kid: 'family', child: 'family', children: 'family', toddler: 'family', romantic: 'couple', date: 'couple', anniversary: 'couple',
  scenic: 'view', friend: 'group', rain: 'rainy', wet: 'rainy', indoor: 'rainy', relaxed: 'slow', quiet: 'slow',
  walking: 'walk', hike: 'walk', hiking: 'walk', trail: 'walk', gig: 'music', concert: 'music', movie: 'cinema', film: 'cinema' };
export const questionWords = (text) => tokens(text).map((word) => SYNONYMS[word] || word);

// ── What a question can ask for ────────────────────────────────────────────
// `drop` words only name the category. `boost` words also say something about
// the place (a cafe, a brewery) and lift pages that mention them.
// `drop` words only name the category. `type` words name it and must also be
// on the page ("markets" finds markets, not every event). `boost` words name
// it and lift pages that mention them, without excluding the rest.
const NONE = /$^/g;
const CATEGORIES = [
  { kinds: ['event'], label: "what's on", hub: '/whats-on/',
    drop: /\b(?:whats on|what is on|whats happening|events?|happening|going on)\b/g,
    type: /\b(?:festivals?|markets?|comedy|exhibitions?|workshops?|cinema|movies?)\b/g,
    boost: /\b(?:gigs?|live music|music|concerts?|shows?|class(?:es)?)\b/g },
  { kinds: ['stay'], label: 'places to stay', hub: '/stay/',
    drop: /\b(?:stay(?:s|ing)?|accommodation|sleep|night away|nights away|overnight|book a room|rooms?)\b/g,
    type: /\b(?:hotels?|glamping|cottages?|villas?|lodges?)\b/g,
    boost: /\b(?:suites?|retreats?|farm stay)\b/g },
  { kinds: ['wine'], label: 'wineries, breweries and distilleries', hub: '/wine/',
    drop: /\b(?:wine|wines|wine tasting|tasting|drinks?)\b/g,
    type: /\b(?:brewer(?:y|ies)|distiller(?:y|ies)|gin|cider)\b/g,
    boost: /\b(?:winer(?:y|ies)|cellar doors?|vineyards?|beer|pinot|chardonnay)\b/g },
  { kinds: ['eat'], label: 'places to eat and drink', hub: '/eat/',
    drop: /\b(?:eat|eating|food|restaurants?|dining|dine|meal|meals|bite)\b/g,
    type: /\b(?:cafes?|baker(?:y|ies)|pubs?|pizza|providores?)\b/g,
    boost: /\b(?:lunch|long lunch|dinner|breakfast|brunch|coffee|seafood|fish and chips)\b/g },
  { kinds: ['plan'], label: 'ready-made plans', hub: '/explore/plans/',
    drop: /\b(?:itinerar(?:y|ies)|plans?|plan a|planning)\b/g, type: NONE,
    boost: /\b(?:day trip|weekend away|escape|getaway|one night|two nights?|road trip)\b/g },
  { kinds: ['tour'], label: 'tours', hub: '/tour/', drop: /\b(?:tours?|guided)\b/g, type: NONE, boost: /\b(?:wine tours?|private|charter)\b/g },
  { kinds: ['fishing'], label: 'fishing spots and charters', hub: '/fishing/', drop: /\b(?:fishing|fish)\b/g, type: /\b(?:charters?|piers?|jett(?:y|ies))\b/g, boost: /\b(?:snapper|squid|whiting)\b/g },
  { kinds: ['boating'], label: 'boat ramps and hire', hub: '/boating/', drop: /\b(?:boating|boats?)\b/g, type: NONE, boost: /\b(?:ramps?|launch|hire|kayaks?)\b/g },
  { kinds: ['do'], label: 'things to do', hub: '/explore/',
    drop: /\b(?:things to do|what to do|activit(?:y|ies)|explore|exploring|outdoors?|see|sights?)\b/g,
    type: /\b(?:walks?|walking|hikes?|hiking|trails?|beach(?:es)?|lookouts?|gardens?|galler(?:y|ies)|spas?|golf)\b/g,
    boost: /\b(?:hot springs|springs|bathing|nature|parks?|coastal|bush)\b/g },
  { kinds: ['story'], label: 'Journal stories', hub: '/journal/', drop: /\b(?:journal|stories|story|articles?|read|reading)\b/g, type: NONE, boost: NONE },
  { kinds: ['place'], label: 'towns and places', hub: '/explore/places/', drop: /\b(?:towns?|villages?|suburbs?|areas?)\b/g, type: NONE, boost: NONE },
];
// Every category word, stemmed: these never identify one page by name.
const GENERIC = new Set(tokens('events markets festivals comedy exhibitions workshops cinema movies gigs music concerts shows classes stays accommodation ' +
  'hotels glamping cottages villas lodges suites retreats wines wineries cellar doors vineyards breweries beer distilleries gin cider pinot chardonnay tasting ' +
  'drinks eat food restaurants dining meals cafes bakeries pubs pizza providores lunch dinner breakfast brunch coffee seafood chips itineraries plans trips ' +
  'tours guided charters piers jetties fishing fish boats boating ramps hire kayaks walks walking hikes hiking trails beaches lookouts gardens galleries spas ' +
  'golf springs nature parks coastal bush views journal stories articles towns villages live long guide family couple group weekend night'));
const CATEGORY_BY_KIND =new Map(CATEGORIES.map((category) => [category.kinds[0], category]));

// Things that change on the day, or that only the operator can confirm. Ask PI
// never answers these; it says so and points to the page and the operator.
const LIVE = /\b(?:(?:is|are|will|does|do|when)\b.*\bopen|open (?:now|today|tonight|tomorrow|late|on|at|until|till)|opening (?:hours|times)|clos(?:e|ed|es|ure|ures|ing)|hours?|cancel(?:led|ed|lation|lations)?|called off|postponed|sold out|availab(?:le|ility)|book(?:ed)? out|tickets? left|track conditions?|park conditions?|tides?|low tide|high tide|flood(?:ing|ed)?|weather|forecast|rain(?:ing)? (?:today|tomorrow|now)|fire danger|fire ban|safe(?:ty)?|danger(?:ous)?|swim(?:ming)?|surf(?:ing)?|rips?|landslips?|wheelchairs?|accessib(?:le|ility)|step ?free|prams?|strollers?|mobility|parking|allerg(?:y|ies|en|ens)|gluten|coeliac|celiac|vegan|halal|kosher)\b/;
const PRICE = /\b(?:cheap(?:er|est)?|prices?|priced|cost(?:s|ing)?|how much|budget|affordable|expensive|fees?|free entry|dollars?)\b|\$/;
const DOGS = /\b(?:dogs?|pupp(?:y|ies)|pooch(?:es)?|off leash|pet friendly|pets?)\b/;
const RESET = /^(?:start over|start again|reset|new question|clear)$/;
const MORE = /^(?:show more|more|next|more like (?:this|these)|keep going)$/;
const REFINES = /^(?:and|or|what about|how about|in|near|around|with|for|on|this|next|also|any|closer|but|only|just)\b/;
const HERE =/\b(?:near here|around here|close to here|nearby|near this|close by)\b/;
const NEAR_ME = /\b(?:near me|close to me|around me|where i am|my location)\b/;
const ELSEWHERE = /\b(?:elsewhere|anywhere|whole peninsula|all of the peninsula|any town)\b/;
const NO_DATE = /\b(?:any time|anytime|any date|whenever)\b/;

// ── Dates, on the Melbourne calendar ───────────────────────────────────────
const DAY_MS = 86_400_000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function melbourneDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
const toDate = (iso) => new Date(iso + 'T12:00:00Z');
const toIso = (date) => date.toISOString().slice(0, 10);
const addDays = (iso, days) => toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
const weekday = (iso) => toDate(iso).getUTCDay();
export function sayDay(iso) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(iso));
}
function sayWindow(window) {
  return window.start === window.end ? `on ${sayDay(window.start)}` : `from ${sayDay(window.start)} to ${sayDay(window.end)}`;
}

/** Finds a date phrase. Returns { window, text } with the phrase removed. */
export function parseWhen(text, today) {
  const take = (match, start, end) => ({ window: { start, end }, text: text.replace(match, ' ') });
  let m;
  if ((m = text.match(/\b(?:today|tonight|this (?:morning|afternoon|arvo|evening))\b/))) return take(m[0], today, today);
  if ((m = text.match(/\btomorrow(?: night| morning)?\b/))) return take(m[0], addDays(today, 1), addDays(today, 1));
  if ((m = text.match(/\b(this|next|coming)? ?weekend\b/))) {
    // Friday to Sunday, as the What's On pages count it. On a weekend, "this
    // weekend" is what is left of it.
    const dow = weekday(today);
    const sunday = addDays(today, dow === 0 ? 0 : 7 - dow);
    let start = dow === 0 ? today : addDays(sunday, -2);
    if (start < today) start = today;
    const shift = m[1] === 'next' ? 7 : 0;
    return take(m[0], shift ? addDays(addDays(sunday, -2), 7) : start, addDays(sunday, shift));
  }
  if ((m = text.match(/\bnext week\b/))) {
    const monday = addDays(today, ((8 - weekday(today)) % 7) || 7);
    return take(m[0], monday, addDays(monday, 6));
  }
  if ((m = text.match(/\bthis week\b/))) return take(m[0], today, addDays(today, (7 - weekday(today)) % 7));
  const monthNames = MONTHS.map((month) => month + '|' + month.slice(0, 3)).join('|');
  if ((m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)? (?:of )?(${monthNames})\\b|\\b(${monthNames}) (\\d{1,2})(?:st|nd|rd|th)?\\b`)))) {
    const day = Number(m[1] || m[4]);
    const month = MONTHS.findIndex((name) => name.startsWith((m[2] || m[3]).slice(0, 3)));
    let year = Number(today.slice(0, 4));
    const iso = (y) => `${y}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (day >= 1 && day <= 31 && toIso(toDate(iso(year))) === iso(year)) {
      if (iso(year) < today) year += 1;
      return take(m[0], iso(year), iso(year));
    }
  }
  // "may" is only the month after "in" or "during".
  if ((m = text.match(new RegExp(`\\b(?:in |during )may\\b|\\b(?:in |during )?(${MONTHS.filter((month) => month !== 'may').join('|')})\\b`)))) {
    m[1] = m[1] || 'may';
    const month = MONTHS.indexOf(m[1]);
    let year = Number(today.slice(0, 4));
    if (month < Number(today.slice(5, 7)) - 1) year += 1;
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const last = toIso(new Date(Date.UTC(year, month + 1, 0, 12)));
    return take(m[0], first < today ? today : first, last);
  }
  if ((m = text.match(new RegExp(`\\b(?:this |on |next )?(${WEEKDAYS.join('|')})s?(?: night| morning| afternoon)?\\b`)))) {
    const ahead = (WEEKDAYS.indexOf(m[1]) - weekday(today) + 7) % 7;
    const day = addDays(today, ahead);
    return take(m[0], day, day);
  }
  return { window: null, text };
}

// ── Reading a question ─────────────────────────────────────────────────────
function findPlace(text, places) {
  const found = [...places].sort((a, b) => b.name.length - a.name.length)
    .find((place) => new RegExp(`\\b${normalise(place.name)}\\b`).test(text));
  if (!found) return { place: null, text };
  return { place: found, text: text.replace(new RegExp(`\\b(?:in |near |around |at |close to )?${normalise(found.name)}\\b`), ' ') };
}

export function pagePlace(index, pagePath) {
  if (!pagePath) return null;
  const direct = pagePath.match(/^\/explore\/places\/([a-z0-9-]+)\/$/)?.[1];
  const slug = direct || index.records.find((record) => record.u === pagePath)?.p;
  return index.places.find((place) => place.slug === slug) || null;
}

export function parseQuestion(question, index, context = {}) {
  const today = context.today || melbourneDay(context.now);
  let text = ' ' + normalise(question) + ' ';
  const parsed = { kinds: null, place: null, window: null, words: [], boost: [], flags: {} };

  parsed.flags.live = LIVE.test(text);
  parsed.flags.price = PRICE.test(question.toLowerCase());
  parsed.flags.dogs = DOGS.test(text);
  parsed.flags.elsewhere = ELSEWHERE.test(text);
  parsed.flags.noDate = NO_DATE.test(text);
  parsed.flags.nearMe = NEAR_ME.test(text);
  text = text.replace(ELSEWHERE, ' ').replace(NO_DATE, ' ').replace(NEAR_ME, ' ');

  if (HERE.test(text)) {
    parsed.place = pagePlace(index, context.pagePath);
    parsed.flags.hereUnknown = !parsed.place;
    text = text.replace(HERE, ' ');
  }
  if (!parsed.place) {
    const where = findPlace(text, index.places);
    parsed.place = where.place;
    text = where.text;
  }
  // The category is the one the reader names first: "pub with live music" is
  // a pub, "lunch at a winery" is lunch. Words of the others stay as words.
  let chosen = null;
  for (const category of CATEGORIES) {
    const at = Math.min(...[category.drop, category.type, category.boost].map((pattern) => {
      const found = text.search(new RegExp(pattern.source));
      return found < 0 ? Infinity : found;
    }));
    if (at < (chosen?.at ?? Infinity)) chosen = { category, at };
  }
  if (chosen) {
    const { category } = chosen;
    const boost = text.match(category.boost) || [];
    parsed.kinds = category.kinds;
    parsed.boost.push(...boost.flatMap(tokens));
    text = text.replace(category.drop, ' ');
    for (const word of boost) text = text.replace(word, ' ');
  }
  // The date comes out after the category, so "what's on Saturday" keeps its "on".
  const when = parseWhen(text, today);
  parsed.window = when.window;
  text = when.text;
  const boosted = new Set(parsed.boost);
  // What is left once the category, town and date are taken out.
  parsed.rest = text;
  // `words` are matched against pages; `said` is how the reader put them.
  parsed.words = [];
  parsed.said = [];
  for (const raw of normalise(text).split(' ')) {
    const [word] = questionWords(raw);
    if (!word || boosted.has(word) || parsed.words.includes(word)) continue;
    parsed.words.push(word);
    parsed.said.push(raw);
  }
  return parsed;
}

// ── Choosing pages ─────────────────────────────────────────────────────────
function daySeed(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function onInWindow(record, window, today) {
  const dates = record.d;
  if (!dates || dates.e < today) return false;
  if (!window) return true;
  if (!dates.dated) return false;
  if (dates.w.some((day) => day >= window.start && day <= window.end)) return true;
  if (dates.s >= window.start && dates.s <= window.end) return true;
  const span = (toDate(dates.e) - toDate(dates.s)) / DAY_MS;
  return span <= 10 && dates.s <= window.end && dates.e >= window.start;
}

function select(index, filter, today) {
  const kinds = filter.kinds || ['eat', 'wine', 'stay', 'do', 'event', 'plan', 'tour', 'fishing', 'boating', 'place'];
  let pool = index.records.filter((record) => kinds.includes(record.k));
  pool = pool.filter((record) => (record.k === 'event' ? onInWindow(record, filter.window, today) : true));
  if (filter.place) pool = pool.filter((record) => record.p === filter.place.slug || (record.k === 'place' && record.u.endsWith(`/${filter.place.slug}/`)));

  const scored = pool.map((record) => {
    const words = new Set(record.kw.split(' '));
    const hits = filter.words.filter((word) => words.has(word));
    const lift = filter.boost.filter((word) => words.has(word)).length;
    // The whole ordering, stated once: how well the page's own words match
    // the question, then (events) its date, then a daily rotation. No field of
    // the record other than its words and its date takes part; there is no
    // partner, payment or editorial-tier input.
    return {
      record,
      hits,
      score: hits.length * 10 + lift * 3,
      date: record.k === 'event' ? (record.d.dated ? '0' : '1') + record.d.s : '',
      order: daySeed(today + record.u),
    };
  });
  const all = scored.filter((item) => item.hits.length === filter.words.length);
  const some = scored.filter((item) => item.hits.length > 0);
  const chosen = all.length ? all : some;
  const missing = all.length ? [] : filter.words.filter((word) => !some.some((item) => item.hits.includes(word)));
  const partial = !all.length && some.length > 0;

  // Events run in date order. Everything else has no ranking on the page to
  // copy, so equal matches rotate daily rather than always favouring A to C.
  chosen.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.order - b.order);
  return { records: chosen.map((item) => item.record), partial, missing, empty: chosen.length === 0, poolSize: pool.length };
}

/** A page the question names. The town or the category alone never counts. */
function findNamed(index, question, parsed) {
  const asked = new Set(tokens(question));
  // Words that are the reader's own, not a category ("markets", "walks",
  // "cafes"), a town or a date. A name needs at least one of them.
  const distinct = new Set(tokens(parsed.rest).filter((word) => !GENERIC.has(word)));
  let best = null;
  for (const record of index.records) {
    const title = [...new Set(tokens(record.t))];
    if (!title.length) continue;
    const hits = title.filter((word) => asked.has(word));
    const enough = hits.length === title.length || (hits.length >= 2 && hits.length / title.length >= 0.5);
    if (!enough || !hits.some((word) => distinct.has(word))) continue;
    // A one-word title ("Free Things to Do" is just "free") is only a name
    // when it is the whole of what was asked.
    if (title.length === 1 && distinct.size !== 1) continue;
    const score = hits.length * 2 + (hits.length === title.length ? 1 : 0);
    if (!best || score > best.score) best = { record, score };
  }
  return best?.record || null;
}

// ── Replies ────────────────────────────────────────────────────────────────
const KIND_LABEL = { story: 'Journal', plan: 'Plan', place: 'Place guide', tour: 'Tour', fishing: 'Fishing', boating: 'Boating' };
const STATUS_WORD ={ cancelled: 'Cancelled', postponed: 'Postponed', rescheduled: 'Rescheduled', 'moved-online': 'Moved online' };

export function card(record) {
  const facts = (record.f || []).filter(([label]) => ['When', 'Time', 'Best for', 'Best in', 'Difficulty'].includes(label)).slice(0, 2);
  return {
    href: record.u,
    title: record.t,
    // The first part is our own label for the kind of page; the town is the page's.
    meta: [record.g ? 'Guide' : record.ty || KIND_LABEL[record.k], record.pn].filter(Boolean).join(' · '),
    summary: record.s,
    facts,
    badge: record.d?.st && STATUS_WORD[record.d.st] ? STATUS_WORD[record.d.st] : null,
  };
}

const sentence = (text) => text.replace(/^./, (first) => first.toUpperCase());
const searchLink =(question) => ({ href: '/search/?' + new URLSearchParams({ q: question }), label: 'Search the whole site for this' });
const EXAMPLES = ['Lunch in Red Hill', "What's on this weekend", 'Places to stay in Sorrento', 'Coastal walks'];

function describe(filter) {
  const dated = filter.window && filter.kinds?.[0] === 'event';
  // "events on Saturday", not "what's on on Saturday".
  const what = dated ? 'events' : filter.kinds ? CATEGORY_BY_KIND.get(filter.kinds[0]).label : 'pages';
  const parts = [what];
  if (filter.place) parts.push(`in ${filter.place.name}`);
  if (filter.window && filter.kinds?.[0] === 'event') parts.push(sayWindow(filter.window));
  return parts.join(' ');
}

function chipsFor(filter, result, shown) {
  const chips = [];
  if (result.records.length > shown) chips.push('Show more');
  if (filter.place) {
    for (const [kind, phrase] of [['eat', 'Where to eat'], ['stay', 'Places to stay'], ['do', 'Things to do'], ['event', "What's on"]]) {
      if (filter.kinds?.[0] !== kind) chips.push(`${phrase} in ${filter.place.name}`);
    }
  } else {
    const counts = new Map();
    for (const record of result.records) if (record.pn) counts.set(record.pn, (counts.get(record.pn) || 0) + 1);
    for (const [name] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)) chips.push(`In ${name}`);
  }
  if (filter.kinds?.[0] === 'event' && !filter.window) chips.push('This weekend');
  return chips.slice(0, 5);
}

/**
 * One turn. `state` is what the last turn matched, so "in Flinders" or "this
 * weekend" refines the previous answer. Returns { reply, state }.
 */
export function ask(index, question, state = null, context = {}) {
  const asked = typeof question === 'string' ? question.trim() : '';
  if (!asked || asked.length > ASK_MAX_LENGTH) return null;
  const today = context.today || melbourneDay(context.now);
  const bare = normalise(asked);
  const builtOn = sayDay(melbourneDay(new Date(index.generatedAt)));
  const footer = `From Peninsula Insider pages as published on ${builtOn}.`;

  if (RESET.test(bare)) {
    return { state: null, reply: { kind: 'help', lead: 'Cleared. What are you planning?', notes: [], cards: [], links: [], chips: EXAMPLES } };
  }
  if (MORE.test(bare) && state?.filter) {
    const result = select(index, state.filter, today);
    const offset = state.offset + ASK_PAGE_SIZE;
    const page = result.records.slice(offset, offset + ASK_PAGE_SIZE);
    if (!page.length) {
      return { state, reply: { kind: 'none', lead: `That is every match for ${describe(state.filter)}.`, notes: [], cards: [], links: [searchLink(state.question)], chips: chipsFor(state.filter, { records: [] }, 0) } };
    }
    return { state: { ...state, offset }, reply: { kind: 'results', lead: `More ${describe(state.filter)}.`, notes: [footer], cards: page.map(card), links: [searchLink(state.question)], chips: chipsFor(state.filter, result, offset + ASK_PAGE_SIZE) } };
  }

  const parsed = parseQuestion(asked, index, context);
  const notes = [];
  const links = [];

  // A named page first: "tell me about Coppins Track", "is the Red Hill market on".
  const named = findNamed(index, asked, parsed);

  if (parsed.flags.dogs && index.topics?.dogs) {
    links.push({ href: index.topics.dogs.u, label: index.topics.dogs.t });
    return { state, reply: { kind: 'topic', lead: 'Dog rules differ from venue to venue and can change, so I don’t filter by them. Our dog-friendly guide sets out what each venue has confirmed.', notes: [], cards: named ? [card(named)] : [], links: [...links, searchLink(asked)], chips: [] } };
  }
  if (parsed.flags.live || parsed.flags.price) {
    const lead = parsed.flags.price && !parsed.flags.live
      ? 'I don’t quote prices. They change, and the operator’s own page is the place to check them.'
      : 'I can’t check opening hours, bookings, cancellations, weather, tides, access or dietary needs on the day.';
    if (named?.d?.st && STATUS_WORD[named.d.st]) notes.push(`Our page lists ${named.t} as ${STATUS_WORD[named.d.st].toLowerCase()}.`);
    else if (named?.k === 'event') notes.push(`Our page for ${named.t} had no cancellation recorded when it was published on ${builtOn}. Confirm with the organiser before you go.`);
    else if (named) notes.push('The page below links to the operator for current details.');
    else notes.push('Each of our pages links to the operator or official source for current details.');
    return { state, reply: { kind: 'live', lead, notes, cards: named ? [card(named)] : [], links: [searchLink(asked)], chips: [] } };
  }
  if (named && parsed.words.length <= tokens(named.t).length + 1 && !parsed.window) {
    const place = named.p ? index.places.find((item) => item.slug === named.p) : null;
    // Only the town carries forward, so "where to eat" next means "near it".
    const filter = { kinds: null, place, window: null, words: [], boost: [] };
    return {
      state: { filter, offset: 0, question: asked },
      reply: { kind: 'named', lead: 'Here is our page on it.', notes: [footer], cards: [card(named)], links: [searchLink(asked)],
        chips: place ? [`Where to eat in ${place.name}`, `Things to do in ${place.name}`, `Places to stay in ${place.name}`] : [] },
    };
  }

  // Carry the last answer forward only when this turn adds to it: a short
  // follow-up ("in Flinders", "where to stay") or one that opens like one.
  const refines = bare.split(' ').length <= 4 || REFINES.test(bare);
  let previous = refines ? state?.filter : null;
  // Words alone only refine if the last answer's pages match them; otherwise
  // "tell me a joke" is a new question, not a filter on the last one.
  if (previous && !parsed.kinds && !parsed.place && !parsed.window && !parsed.flags.elsewhere && !parsed.flags.noDate) {
    const narrowed = select(index, { ...previous, words: [...previous.words, ...parsed.words] }, today);
    if (!parsed.words.length || narrowed.empty || narrowed.partial) previous = null;
  }
  const filter = {
    kinds: parsed.kinds || previous?.kinds || null,
    // "Where to stay" after "lunch in Red Hill" means Red Hill. A new category
    // with its own date ("what's on this weekend") is a new question.
    place: parsed.flags.elsewhere ? null : parsed.place || (parsed.kinds && parsed.window ? null : previous?.place) || null,
    // A date stays while the talk is still about what's on.
    window: parsed.flags.noDate ? null : parsed.window || (!parsed.kinds || parsed.kinds[0] === 'event' ? previous?.window : null) || null,
    words: parsed.kinds || !previous ? parsed.words : [...new Set([...previous.words, ...parsed.words])],
    said: parsed.kinds || !previous ? parsed.said : [...new Set([...(previous.said || []), ...parsed.said])],
    boost: parsed.kinds || !previous ? parsed.boost : [...new Set([...previous.boost, ...parsed.boost])],
  };
  // A date with nothing else is a What's On question.
  if (!filter.kinds && filter.window) filter.kinds = ['event'];

  if (parsed.flags.nearMe) notes.push('I can’t see where you are. Name a town and I’ll narrow it.');
  if (parsed.flags.hereUnknown) notes.push('This page isn’t tied to one town, so I haven’t narrowed by place.');
  if (!filter.kinds && !filter.place && !filter.words.length) {
    return { state, reply: { kind: 'help', lead: 'Ask about somewhere to eat, drink, stay or walk, or what’s on. Name a town or a date to narrow it.', notes, cards: [], links: [searchLink(asked)], chips: EXAMPLES } };
  }

  if (!filter.kinds && filter.place && !filter.words.length) {
    const guide = index.records.find((record) => record.k === 'place' && record.u.endsWith(`/${filter.place.slug}/`));
    return {
      state: { filter, offset: 0, question: asked },
      reply: { kind: 'place', lead: guide ? `Here is our guide to ${filter.place.name}. What are you after there?` : `What are you after in ${filter.place.name}?`, notes: guide ? [footer] : [],
        cards: guide ? [card(guide)] : [], links: [searchLink(asked)],
        chips: [`Where to eat in ${filter.place.name}`, `Places to stay in ${filter.place.name}`, `Things to do in ${filter.place.name}`, `What's on in ${filter.place.name}`] },
    };
  }

  let result = select(index, filter, today);
  if (result.empty && !filter.kinds) {
    const stories = select(index, { ...filter, kinds: ['story'] }, today);
    if (!stories.empty && !stories.partial) { filter.kinds = ['story']; result = stories; }
  }
  const quoted = (words) => words.map((word) => `“${word}”`).join(' and ');
  // A town carried over from the last turn must not empty this one.
  if (result.empty && filter.place && !parsed.place && filter.kinds) {
    notes.push(`Nothing is listed in ${filter.place.name}, so this is the whole Peninsula.`);
    filter.place = null;
    result = select(index, filter, today);
  }
  // In one town the list is short enough to show anyway, with the gap stated.
  // Across the whole Peninsula it would be a random handful, so it is not shown.
  if (result.empty && result.poolSize && filter.words.length && filter.kinds && filter.place) {
    notes.push(`None of these pages matches ${quoted(filter.said)}.`);
    filter.words = [];
    filter.said = [];
    result = select(index, filter, today);
  }
  if (result.empty) {
    const where = filter.place ? ` in ${filter.place.name}` : '';
    const matching = filter.words.length ? ` matching ${quoted(filter.said)}` : '';
    const lead = filter.kinds?.[0] === 'event'
      ? `Our What’s On pages list nothing${where}${filter.window ? ' ' + sayWindow(filter.window) : ''}${matching}.`
      : filter.kinds
        ? `Our guides list no ${CATEGORY_BY_KIND.get(filter.kinds[0]).label}${where}${matching}.`
        : `Nothing in our guides matches ${quoted(filter.said)}${where}.`;
    const chips = [];
    if (filter.place && filter.kinds) chips.push(`${sentence(CATEGORY_BY_KIND.get(filter.kinds[0]).label)} elsewhere`);
    if (filter.window && filter.kinds?.[0] === 'event') chips.push("What's on any time");
    if (filter.kinds) links.push({ href: CATEGORY_BY_KIND.get(filter.kinds[0]).hub, label: `Browse all ${CATEGORY_BY_KIND.get(filter.kinds[0]).label}` });
    return { state: { filter, offset: 0, question: asked }, reply: { kind: 'none', lead, notes, cards: [], links: [...links, searchLink(asked)], chips } };
  }

  let lead = `From our guides: ${describe(filter)}`;
  if (filter.words.length && !result.partial) lead += ` matching ${quoted(filter.said)}`;
  lead += '.';
  if (result.partial) {
    lead = `Closest ${describe(filter)} in our guides.`;
    const missing = filter.said.filter((_, at) => result.missing.includes(filter.words[at]));
    if (missing.length) notes.push(`No page here matches ${quoted(missing)}.`);
  }
  if (parsed.window && filter.kinds?.[0] !== 'event') notes.push('I can’t check which days a place is open, so the date isn’t applied here.');
  if (filter.kinds?.[0] === 'event') {
    notes.push('Dates are the next ones our pages list. Organisers can change plans, so check before you go.');
    links.push({ href: '/whats-on/', label: 'See the full What’s On calendar' });
  } else if (filter.kinds) {
    links.push({ href: CATEGORY_BY_KIND.get(filter.kinds[0]).hub, label: `Browse all ${CATEGORY_BY_KIND.get(filter.kinds[0]).label}` });
  }
  notes.push(footer);
  const chips = chipsFor(filter, result, ASK_PAGE_SIZE);
  // The town came from the last turn, not this one: make leaving it one tap.
  if (filter.place && !parsed.place && filter.kinds) chips.splice(chips[0] === 'Show more' ? 1 : 0, 0, `${sentence(CATEGORY_BY_KIND.get(filter.kinds[0]).label)} elsewhere`);
  return {
    state: { filter, offset: 0, question: asked },
    reply: { kind: 'results', lead, notes, cards: result.records.slice(0, ASK_PAGE_SIZE).map(card), links: [...links, searchLink(asked)], chips: chips.slice(0, 5) },
  };
}
