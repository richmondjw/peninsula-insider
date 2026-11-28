/**
 * Ask PI as a character: plans, modes and her own lines, over the matcher.
 *
 * lib/ask-guide.mjs matches a question to published pages. This file sits on
 * top of it and adds what a reader can do with those pages: a day put in
 * order, a plan pulled apart, an argument settled, a refusal with some
 * character. It keeps the matcher's rule. Nothing here writes a fact:
 *
 *   - Every stop is a page from /ask/index.json and is shown with card(), so
 *     its title, town, summary and details are copied from that page.
 *   - Which page goes in which part of the day is decided from that page's own
 *     words (a "cafe", a "restaurant", a "walk"). The order is PI's; the note
 *     under every plan says so, and that hours are not checked.
 *   - Everything PI says in her own voice is a fixed line from pi-lines.mjs,
 *     filled only with the reader's words, a town name or a count.
 *
 * Runs in the browser. Nothing is sent or stored. Pure functions, so the same
 * file runs under node --test.
 */
import { ask, card, select, normalise, parseQuestion, questionWords, melbourneDay, sayDay, daySeed, ASK_MAX_LENGTH } from './ask-guide.mjs';
import {
  REFUSALS, REFUSAL_TOPICS, INTERVIEW, YOU_PICK, PLAN_LEADS, SWAP_LINES, SWAP_ONLY, CRITIQUE, ARGUMENT, NIGHTLIFE,
  WITH_THIS, CALLBACKS, REACTIONS, NEWSLETTER, PLAN_NOTES, pick, fill, STRIKES, ABOUT_HER, SUPPORT, TIEBREAK,
} from './pi-lines.mjs';

// ── Reading a page's own words ─────────────────────────────────────────────
const words = (record) => ` ${normalise(record.ty || '')} ${record.kw} `;
const START = /\b(?:cafe|bakery|bakehouse|coffee|breakfast|brunch|providore)\b/;
const TABLE = /\b(?:restaurant|lunch|dinner|pub|dining|bistro|osteria|kitchen)\b/;
// Under a roof only when the page says so: its type is a gallery, or its own
// words say rainy, indoor, museum, cinema or spa. A beach, a walk, a lookout
// or a park never is, whatever else its page mentions.
const UNDER_ROOF = /\b(?:rainy|indoor|museum|cinema|spa|bathing)\b/;
const OUTDOORS = /^(?:beach|walk|lookout|park|golf course|market)$/;
const underRoof = (record) => !OUTDOORS.test(normalise(record.ty || '')) && (normalise(record.ty || '') === 'gallery' || UNDER_ROOF.test(words(record)));
// Not a stop on a general day out: a round of golf, a tour, or a market that only runs on its own dates.
const NOT_A_STOP = /^(?:golf course|tour|market)$/;
const EVENING = /\b(?:bar|cocktail|pub|brewery|distillery|music)\b/;

const ROLES = {
  start: { label: 'To start', missing: 'cafe or bakery', test: (record) => record.k === 'eat' && START.test(words(record)) },
  wander: { label: 'Then', missing: 'things to do', test: (record) => record.k === 'do' },
  table: { label: 'The table', missing: 'restaurant', test: (record) => record.k === 'eat' && TABLE.test(words(record)) },
  after: { label: 'After', missing: 'cellar door', test: (record) => record.k === 'wine' },
};
const LENGTHS = { morning: ['start', 'wander'], half: ['start', 'wander', 'table'], day: ['start', 'wander', 'table', 'after'] };
const ORDER = ['start', 'wander', 'table', 'after'];
const TITLES = { morning: 'A morning in', half: 'Half a day in', day: 'A day in' };
const WHO_WORD = { couple: 'couple', family: 'family', group: 'group' };
const isStop = (record) => ['eat', 'wine', 'do'].includes(record.k) && !record.g && record.p && !NOT_A_STOP.test(normalise(record.ty || ''));

function roleOf(record) {
  if (!isStop(record)) return null;
  if (record.k === 'wine') return 'after';
  if (record.k === 'do') return 'wander';
  return ROLES.start.test(record) && !ROLES.table.test(record) ? 'start' : 'table';
}

// ── What the reader said ───────────────────────────────────────────────────
const WHO = [
  ['family', /\b(?:kids?|children|family|toddlers?|bab(?:y|ies)|little ones?|grandkids?)\b/],
  ['couple', /\b(?:two of us|couple|partner|wife|husband|girlfriend|boyfriend|date|anniversary|romantic|honeymoon)\b/],
  // A headcount can be supplied without saying anything about the relationship.
  ['pair', /\bfor (?:two|2)(?: (?:people|adults|guests)\b|$| (?=in\b|near\b|around\b|at\b|on\b|this\b|tomorrow\b|today\b))/],
  ['group', /\b(?:group|friends|mates|girls|hens?|bucks?|\d+ of us|(?:three|four|five|six|seven|eight|nine|ten) of us)\b/],
  ['solo', /\b(?:just me|solo|alone|myself|on my own)\b/],
];
const LONG = [
  ['morning', /\bmorning\b/],
  ['half', /\bhalf\b|\bfew hours\b|\b(?:till|until) lunch\b|\bafternoon\b/],
  ['day', /\b(?:whole|full|all) day\b|\bthe lot\b|\ball of it\b/],
];
const AUTO = /\b(?:you pick|you choose|you decide|surprise me|anywhere|leave it to you|dont mind|up to you|no idea)\b/;
const PLAN = /\b(?:plan|build|create|make|organi[sz]e|sort|put together|map out|give)(?: (?:me|us|out))?(?: (?:a|an|my|our|the))?(?: \w+){0,3}? (?:plan|day|morning|afternoon|itinerary|outing|saturday|sunday|weekend)\b/;
const MANY_DAYS = /\b(?:weekend|two days|three days|\d nights?|week)\b/;
const SURPRISE = /^(?:surprise me|dealers choice|you (?:pick|choose|decide))\b/;
// Whole-turn forms leave both options implicit. An explicit subject should still use normal retrieval.
const BARE_COMPARISON = [
  /^(?:which (?:one |of (?:these|those|them) )?(?:is )?(?:better|best)|whats better)$/,
  /^(?:(?:can|could|would) you )?compare (?:the two|them|these(?: two)?|those(?: two)?)$/,
  /^which(?: one| of (?:the two|these(?: two)?|those(?: two)?|them))? (?:would|do) you (?:pick|choose|prefer|recommend)$/,
];
// Follow-up only. Named questions about sources continue through ordinary retrieval.
const ASKS_FOR_SOURCES = [
  /^(?:whats|what is|what are|wheres) (?:your |the )?sources?(?: for (?:that|this)(?: recommendation| pick| claim)?)?$/,
  /^what (?:backs|supports) (?:this|that|your|the) (?:recommendation|pick|claim|advice)$/,
  /^(?:what|which) (?:sources?|guides?|pages?) (?:backs?|supports?) (?:that|this|your|the)(?: recommendation| pick| claim| advice)?$/,
  /^(?:where did you (?:get|find) (?:that|this)(?: from)?|how do you know(?: that)?|(?:can|could) you (?:cite|show|link)(?: me)? (?:your|the) sources?|sources?)$/,
];
const ELSEWHERE = /^(?:somewhere else|another town|a different town)$/;
const RAINY = /\b(?:rainy day rescue|rainy day plan|its raining|if it rains|wet day|indoor version|under a roof)\b/;
const CRITIC = /\b(?:talk me out of (?:it|this)|rate my plan|critique my plan|what do you think of (?:my|this|our) plan|is (?:this|that) too much)\b/;
const ARGUE = /\bsettle (?:an|the|this|our) argument\b/;
const AROUND = /\b(?:build|plan) a day around (?:this|here|it)\b/;
const GOES_WITH = /\bwhat goes with (?:this|it|here)\b/;
const NIGHT = /\b(?:night ?life|night out|after dark|late night|cocktails?|bars)\b|\ba bar\b/;
const FIX = /^fix it for me$/;
// A question about her. The matcher would otherwise search the guides for "hat" and find a restaurant's chef's hats.
const SAYS_OWNER = /\b(?:i (?:own|run|manage)|(?:its|this is|thats) (?:my|our) (?:venue|business|restaurant|winery|cafe|pub|place|listing|cellar door|shop|brewery)|im the (?:owner|manager)|were the owners?|(?:claim|update|change|fix|edit|remove) (?:my|our) (?:listing|page|business)|(?:add|list) my business|get (?:my business |us |me )?listed)\b/;
const SAYS_WRONG = /\b(?:(?:thats|that is|this is|its|it is|youre|you are|(?:the |that |this |your )?(?:listing|page|info|information|address|number|details) (?:is|are)) (?:wrong|incorrect|out of date|outdated|not right)|(?:has|have|is|its|theyve|they have|it) (?:closed down|shut down|permanently closed|closed for good)|no longer (?:open|there|exists?|trading|operating)|report (?:a |an )?(?:error|mistake|problem|correction)|wrong (?:address|phone|number|hours|name|photo|details)|needs? (?:fixing|correcting|updating))\b/;
const HERSELF = /\b(?:(?:your|the|that) hat|whats with the hat|your notebook|who are you|what are you|what do you (?:actually )?do|are you (?:real|human|an? (?:real |actual )?(?:bot|robot|person|human|machine|ai))|your name)\b/;
const KIDS = /\b(?:kids?|children|toddlers?|bab(?:y|ies)|little ones?)\b/;

const PERSON = '(?:mum|mom|mother|dad|father|nan|nana|nanna|gran|grandma|grandpa|pop|wife|husband|partner|girlfriend|boyfriend|sister|brother|daughter|son|best friend|mate|boss)';
const NTH = '\\d{1,3}(?:st|nd|rd|th)';
const OCCASIONS = [
  new RegExp(`\\b((?:(?:my|our) )?${PERSON}[’']s (?:${NTH}(?: birthday)?|birthday|anniversary|retirement|visit))\\b`, 'i'),
  new RegExp(`\\b((?:(?:my|our) )?(?:${NTH} )?(?:wedding )?anniversary|(?:${NTH} )birthday|(?:my|our) birthday|honeymoon|babymoon|(?:hen|buck)[’']?s (?:do|party|weekend|night)|first date)\\b`, 'i'),
];
/** Something to bring up again later, in the reader's own words. */
export function occasion(text) {
  for (const pattern of OCCASIONS) {
    const found = String(text).match(pattern)?.[1];
    if (!found) continue;
    const said = found.trim().replace(/^(?:my|our) /i, 'your ').slice(0, 48);
    return /^(?:your |the )/i.test(said) || new RegExp(`^${PERSON}`, 'i').test(said) ? said : `the ${said}`;
  }
  return null;
}

function readBrief(bare, index, context) {
  const brief = {};
  for (const [who, pattern] of WHO) if (pattern.test(bare)) { brief.who = who; break; }
  for (const [long, pattern] of LONG) if (pattern.test(bare)) { brief.len = long; break; }
  const place = parseQuestion(bare, index, context).place;
  if (place) brief.place = place.slug;
  else if (AUTO.test(bare)) brief.place = null;
  return brief;
}

// ── Putting a day in order ─────────────────────────────────────────────────
const footer = (index) => `From Peninsula Insider pages as published on ${sayDay(melbourneDay(new Date(index.generatedAt)))}.`;
const placeName = (index, slug) => index.places.find((place) => place.slug === slug)?.name || '';

function pool(index, role, brief, seed, town) {
  const who = WHO_WORD[brief.who];
  let test = ROLES[role].test;
  // With children along, the afternoon is something to do before it is a tasting.
  if (role === 'after' && brief.who === 'family') test = (record) => record.k === 'do';
  let found = index.records.filter((record) => isStop(record) && record.p === town && test(record));
  if (role === 'table' && !found.length) found = index.records.filter((record) => isStop(record) && record.p === town && record.k === 'eat');
  if (role === 'after' && !found.length) found = index.records.filter((record) => isStop(record) && record.p === town && (record.k === 'wine' || record.k === 'do'));
  if (brief.rainy) found = found.filter((record) => record.k !== 'do' || underRoof(record));
  const rank = (record) => (who && words(record).includes(` ${who} `) ? 0 : 1);
  return found.sort((a, b) => rank(a) - rank(b) || daySeed(seed + a.u) - daySeed(seed + b.u)).map((record) => record.u);
}

function rolesFor(brief, anchor) {
  const roles = [...LENGTHS[brief.len] || LENGTHS.half];
  const fixed = anchor && roleOf(anchor);
  if (fixed && !roles.includes(fixed)) roles.push(fixed);
  return ORDER.filter((role) => roles.includes(role));
}

/** One page per part of the day in one town, never the same page twice. */
function fillSlots(index, roles, brief, seed, town, anchor) {
  const used = new Set(anchor ? [anchor.u] : []);
  const slots = [];
  const missing = [];
  for (const role of roles) {
    if (anchor && roleOf(anchor) === role) { slots.push({ role, label: ROLES[role].label, pool: [anchor.u], at: 0, locked: true }); continue; }
    const paths = pool(index, role, brief, seed, town).filter((path) => !used.has(path));
    if (!paths.length) { missing.push(role); continue; }
    used.add(paths[0]);
    slots.push({ role, label: ROLES[role].label, pool: paths.slice(0, 8), at: 0 });
  }
  return { slots, missing };
}

/** Her pick of town: one of those where the most parts of the day can be filled. */
function chooseTown(index, roles, brief, seed) {
  let best = [];
  let most = 0;
  for (const place of index.places) {
    const filled = fillSlots(index, roles, brief, seed, place.slug, null).slots.length;
    if (filled > most) { most = filled; best = []; }
    if (filled === most && filled) best.push(place.slug);
  }
  return best.sort((a, b) => daySeed(seed + a) - daySeed(seed + b))[0] || null;
}

/** A plan as plain data: which pages could fill each part of the day, and which one is showing. */
function compose(index, brief, today) {
  const seed = `${today}:${brief.salt || 0}:`;
  const byPath = new Map(index.records.map((record) => [record.u, record]));
  const anchor = brief.anchor ? byPath.get(brief.anchor) : null;
  const roles = rolesFor(brief, anchor);
  const town = brief.place || anchor?.p || chooseTown(index, roles, brief, seed);
  if (!town) return null;
  let { slots, missing } = fillSlots(index, roles, brief, seed, town, anchor);
  // A short plan that cannot be filled borrows the next part of the day
  // rather than giving up on a town our guides do cover.
  for (const extra of ORDER) {
    if (slots.length >= 2) break;
    if (roles.includes(extra)) continue;
    roles.push(extra);
    roles.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    ({ slots, missing } = fillSlots(index, roles, brief, seed, town, anchor));
  }
  return { brief: { ...brief, place: town }, title: `${TITLES[brief.len] || TITLES.half} ${placeName(index, town)}`, slots, missing };
}

const TRIP_KIND = { eat: 'venue', wine: 'venue', do: 'experience', event: 'event' };
/** A link the trip planner already understands (/me/trip/ imports it). */
export function tripLink(index, plan) {
  const byPath = new Map(index.records.map((record) => [record.u, record]));
  const items = plan.slots.map((slot) => byPath.get(slot.pool[slot.at])).filter((record) => record && TRIP_KIND[record.k])
    .map((record) => `${TRIP_KIND[record.k]}:${record.u.split('/').filter(Boolean).pop()}:day-1`);
  if (!items.length) return null;
  return `/me/trip/?i=${items.map(encodeURIComponent).join('|')}&d=day-1:${encodeURIComponent(encodeURIComponent(plan.title))}`;
}

function planView(index, plan) {
  const byPath = new Map(index.records.map((record) => [record.u, record]));
  // Her line for a stop belongs to the page it was written about, so it is
  // looked up by that page and disappears when the stop is swapped.
  // A plan with no cafe to start opens on its walk: "Then" would follow nothing.
  const stops = plan.slots.map((slot, at) => ({ label: at === 0 && slot.label === 'Then' ? 'First' : slot.label, card: card(byPath.get(slot.pool[slot.at])), swappable: !slot.locked && slot.pool.length > 1, line: plan.lines?.[slot.pool[slot.at]] || null }));
  const town = plan.brief?.place ? placeName(index, plan.brief.place) : '';
  const trip = tripLink(index, plan);
  return { title: plan.title, town, stops, trip };
}

function planReply(index, plan, lead, extra = {}) {
  const view = planView(index, plan);
  const town = view.town;
  const notes = [...(extra.notes || [])];
  for (const role of plan.missing || []) {
    // With children the afternoon is something to do, so that is what is missing.
    const what = role === 'after' && plan.brief.who === 'family' ? 'second thing to do' : ROLES[role].missing;
    const roof = plan.brief.rainy && (role === 'wander' || what === 'second thing to do') ? ' under a roof' : '';
    notes.push(`Our guides list no ${what} in ${town}${roof}, so that part is yours.`);
  }
  notes.push(PLAN_NOTES.order, footer(index));
  const guide = plan.brief?.place && index.records.find((record) => record.k === 'place' && record.u.endsWith(`/${plan.brief.place}/`));
  const links = [];
  if (guide) links.push({ href: guide.u, label: `Our guide to ${town}` });
  links.push({ href: '/explore/plans/', label: 'Browse ready-made plans' });
  const chips = extra.chips || [plan.brief?.rainy ? null : 'Rainy day rescue', plan.brief?.anchor ? null : 'Somewhere else', 'Start over'].filter(Boolean);
  return { kind: 'plan', mood: 'call', lead, aside: extra.aside || null, notes, cards: view.stops.map((stop) => stop.card), links, chips, plan: view };
}

function planTurn(index, pi, brief, today, leadKey, extra = {}) {
  const plan = compose(index, brief, today);
  const town = plan ? placeName(index, plan.brief.place) : brief.place ? placeName(index, brief.place) : '';
  if (!plan || plan.slots.length < 2) {
    const cards = plan ? planView(index, plan).stops.map((stop) => stop.card) : [];
    return {
      pi: { ...pi, interview: undefined, plan: undefined },
      reply: { kind: 'none', mood: 'brow', lead: town ? `Our guides are too thin on ${town} for a whole plan. I’d rather say so than pad it.` : 'Our guides are too thin for that plan. I’d rather say so than pad it.',
        notes: cards.length ? [footer(index)] : [], cards, links: [{ href: '/explore/plans/', label: 'Browse ready-made plans' }], chips: ['Somewhere else', 'Surprise me'] },
    };
  }
  const anchor = brief.anchor ? index.records.find((record) => record.u === brief.anchor) : null;
  const lines = PLAN_LEADS[leadKey] || PLAN_LEADS[brief.who] || PLAN_LEADS.any;
  const lead = fill(pick(lines, daySeed(today + plan.title + (brief.salt || 0))), { town, n: plan.slots.length, anchor: anchor?.t });
  const next = { ...pi, interview: undefined, await: undefined, plan };
  const reply = planReply(index, plan, lead, { ...extra, notes: [...(brief.notes || []), ...(extra.notes || [])] });
  // Once a visit, after the first plan, she mentions the newsletter.
  if (!pi.noted) { next.noted = true; reply.offer = NEWSLETTER; }
  return { pi: next, reply };
}

/** "Not that one": the next page our guides have for that part of the day. */
export function swapStop(index, state, at) {
  const plan = state?.pi?.plan;
  const slot = plan?.slots?.[at];
  if (!slot) return null;
  if (slot.locked || slot.pool.length < 2) return { state, plan: planView(index, plan), remark: SWAP_ONLY };
  const showing = new Set(plan.slots.map((other) => other.pool[other.at]));
  let next = slot.at;
  for (let tries = 0; tries < slot.pool.length; tries += 1) {
    next = (next + 1) % slot.pool.length;
    if (!showing.has(slot.pool[next])) break;
  }
  const swaps = (plan.swaps || 0) + 1;
  const changed = { ...plan, swaps, slots: plan.slots.map((other, i) => (i === at ? { ...other, at: next } : other)) };
  return { state: { ...state, pi: { ...state.pi, plan: changed } }, plan: planView(index, changed), remark: SWAP_LINES[(swaps - 1) % SWAP_LINES.length] };
}

// ── Her picks and lines from the platform (optional) ───────────────────────
const COMPOSE_OPTIONS = 3;
/**
 * What the platform is asked to choose from: for each part of the day, the
 * page showing now and the next few our guides have for it. It can only pick
 * from these, by position; see applyCompose.
 */
export function composeRequest(state) {
  const plan = state?.pi?.plan;
  if (!plan || plan.slots.length < 2) return null;
  return {
    title: plan.title,
    slots: plan.slots.map((slot) => ({
      label: slot.label,
      options: slot.locked ? [slot.pool[slot.at]] : [slot.pool[slot.at], ...slot.pool.filter((_, at) => at !== slot.at)].slice(0, COMPOSE_OPTIONS),
    })),
  };
}

/**
 * Takes the platform's reply for a request made with composeRequest. Nothing
 * in it is trusted: a pick must be one of the options that were sent for that
 * part of the day and must not repeat, a line is kept only for a page that
 * was picked, and anything else is ignored. Returns null when there is
 * nothing usable, so the plan stays exactly as the site built it.
 */
export function applyCompose(index, state, request, result) {
  const plan = state?.pi?.plan;
  if (!plan || !request || !result || !Array.isArray(result.picks) || result.picks.length !== plan.slots.length) return null;
  const used = new Set();
  const slots = plan.slots.map((slot, i) => {
    const pick = result.picks[i];
    const allowed = typeof pick === 'string' && request.slots[i]?.options.includes(pick) && slot.pool.includes(pick) && !used.has(pick);
    const path = allowed ? pick : slot.pool[slot.at];
    used.add(path);
    return { ...slot, at: slot.pool.indexOf(path) };
  });
  const lines = {};
  for (const slot of slots) {
    const path = slot.pool[slot.at];
    const line = result.lines?.[path];
    if (typeof line === 'string' && line.trim() && line.length <= 300) lines[path] = line.trim();
  }
  const opening = typeof result.opening === 'string' && result.opening.trim() && result.opening.length <= 400 ? result.opening.trim() : null;
  const changed = { ...plan, slots, lines };
  return { state: { ...state, pi: { ...state.pi, plan: changed } }, plan: planView(index, changed), opening };
}

// ── What she is given to talk from ─────────────────────────────────────────
const TALK_PAGES = 24;
const TALK_KINDS = ['eat', 'wine', 'stay', 'do', 'plan', 'place'];
const IDLE = new Set(['long', 'week', 'weekend', 'time', 'today', 'tomorrow', 'morning', 'afternoon', 'evening', 'night', 'big', 'little', 'new', 'old', 'first', 'last', 'bit', 'lot', 'start', 'end', 'hat', 'home', 'work', 'busy', 'tired', 'fine', 'well', 'sure', 'maybe', 'people', 'person', 'anyway', 'name']);
/**
 * The pages sent with a conversation turn. The matcher answers a question; a
 * conversation is looser than that ("it's our anniversary and she hates
 * crowds"), so this casts wider, in three layers:
 *   1. what the matcher found for this message;
 *   2. what was on screen from the turn before, so "which of those is
 *      quieter?" has the earlier picks to talk about;
 *   3. pages whose own words overlap anything the reader has said in the
 *      last few messages, favouring the town and the kind of place they
 *      named most recently.
 * It only chooses which pages she may read. What she says about them is
 * checked against their text on the platform.
 */
/**
 * A message that belongs to the thread before it: there is a thread, and on
 * its own this message names no town and no kind of place ("haven't decided",
 * "the first one", "somewhere quieter"). Whatever the matcher found on its
 * words alone is a coincidence of spelling, not the subject.
 */
export function isFollowUp(index, message, said = [], context = {}) {
  if (!said.length) return false;
  const parsed = parseQuestion(message, index, context);
  return !parsed.place && !parsed.kinds?.length;
}

/** The message names a town or a kind of place: it is a question the guides can be searched for. */
export function hasSubject(index, message, context = {}) {
  const parsed = parseQuestion(message, index, context);
  return Boolean(parsed.place || parsed.kinds?.length);
}

export function talkPages(index, message, said = [], reply = null, shownBefore = [], context = {}) {
  const now = (reply?.cards || []).map((item) => item.href);
  const follows = isFollowUp(index, message, said, context);
  const recent = [...said.slice(-4), message];
  // Words that say nothing about what is wanted on their own ("long week", "good day").
  const wanted = new Set(recent.flatMap((text) => questionWords(text)).filter((word) => !IDLE.has(word)));
  const before = [...new Set(said.slice(-4).flatMap((text) => questionWords(text)).filter((word) => !IDLE.has(word)))];
  let place = null;
  let kinds = null;
  for (const text of [...recent].reverse()) {
    const parsed = parseQuestion(text, index, context);
    place = place || parsed.place?.slug || null;
    kinds = kinds || parsed.kinds;
  }
  const loose = [];
  if (wanted.size || place) {
    for (const record of index.records) {
      if (!TALK_KINDS.includes(record.k)) continue;
      const own = new Set(record.kw.split(' '));
      let score = 0;
      for (const word of wanted) if (own.has(word)) score += 2;
      // Mid-thread, a page has to fit the thread too, not only this message's words.
      if (follows && !before.some((word) => own.has(word)) && !place && !kinds?.length) continue;
      if (place && (record.p === place || (record.k === 'place' && record.u.endsWith(`/${place}/`)))) score += 5;
      if (kinds?.includes(record.k)) score += 3;
      if (record.g) score -= 1;
      if (score >= 2) loose.push({ href: record.u, score, order: daySeed(record.u) });
    }
    loose.sort((a, b) => b.score - a.score || a.order - b.order);
  }
  // Mid-thread, she reads what was on screen and what the conversation has
  // been about. What the matcher found on this message's own words is left
  // out: "have decided" matching a guide titled "..., decided." is spelling,
  // not subject, and the platform searches the thread by meaning as well.
  const order = follows ? [...shownBefore, ...loose.map((item) => item.href)] : [...now, ...shownBefore, ...loose.map((item) => item.href)];
  return [...new Set(order)].slice(0, TALK_PAGES);
}

/**
 * Her reply opens by saying this is not hers to answer ("I don't give legal
 * advice", "Not one for me"). Nothing from the guides goes under a reply like
 * that: beaches under a question about camping law read as an answer to it.
 */
export function declines(say) {
  const opening = String(say || '').split(/(?<=[.!?])\s+/)[0].toLowerCase().replace(/’/g, "'");
  return /\b(?:i (?:don't|do not|can't|cannot|won't) (?:give|do|make|check|rule|say|tell|know|guess|quote)|not (?:one )?for me|not mine\b|isn't mine|not my (?:call|patch|place)|stays in my notebook)\b/.test(opening);
}

/** Tiles for the pages she named in a conversation turn, in her order. Same card() as everywhere else. */
export function cardsFor(index, hrefs) {
  const byPath = new Map(index.records.map((record) => [record.u, record]));
  return [...new Set(Array.isArray(hrefs) ? hrefs : [])].map((href) => byPath.get(href)).filter(Boolean).slice(0, 5).map(card);
}

// ── Three Strikes ──────────────────────────────────────────────────────────
// "Surprise me" is a game: one place at a time, three rejections with a
// reason, then her call stands. Each reason removes a slice of the guide, so
// the next offer is narrower. No model: the lines are hers (pi-lines.mjs) and
// the tile is the page's own words.
const STRIKE_YES = /^(?:go on(?: then)?|fine(?: going)?|ok(?:ay)?|yes|yep|yeah|sold|deal|perfect|love it|lets go|going|sounds good|that one|ill take it|you win)\b/;
const STRIKE_DONE = /\b(?:done (?:it|that)|been(?: there)?|did (?:it|that)|already|heaps|a hundred times|go there all the time|know it)\b/;
const STRIKE_FAR = /\b(?:too far|far|long drive|other side|wrong side|closer|nearer)\b/;
const STRIKE_KIND = [[/\b(?:winer\w*|wine|cellar doors?|vineyards?|tastings?|brewer\w*|distiller\w*)\b/, 'wine'], [/\b(?:eat\w*|food|restaurants?|lunch|dinner|cafes?|pubs?|hungry)\b/, 'eat'], [/\b(?:walks?|hikes?|beach\w*|galler\w*|lookouts?|activit\w*|outdoors?)\b/, 'do']];
const kindIn = (bare) => STRIKE_KIND.find(([pattern]) => pattern.test(bare))?.[1] || null;

function strikeOffer(index, game, context) {
  const done = new Set([...(context.done || []), ...game.offered]);
  const pool = index.records.filter((record) => isStop(record) && !done.has(record.u) && !game.noKinds.includes(record.k) && !game.noTowns.includes(record.p));
  if (!pool.length) return null;
  // Places with a picture and a "Best for" make better single offers; then the day's shuffle.
  const fit = (record) => (record.im ? 0 : 1) + ((record.f || []).some(([label]) => label === 'Best for') ? 0 : 1);
  // A different kind from the last offer when there is one, so two offers in a row are not alike.
  // One number per place, from three things only: its kind against the last offer, whether its
  // page has a picture and a "Best for", and the chat's shuffle. Nothing commercial is read.
  const last = game.lastKind;
  const ranked = pool.map((record) => ({ record, rank: (record.k === last ? 1e12 : 0) + fit(record) * 1e10 + daySeed(game.seed + record.u) }));
  return ranked.sort((a, b) => a.rank - b.rank)[0].record;
}

function strikeScore(game, accepted, forced) {
  const offers = game.offered.length;
  const rejected = game.rejected.map((item) => `${item.t} (${STRIKES.score.why[item.why]})`);
  return { offers, accepted, forced, strikes: game.rejected.length, line: [forced ? STRIKES.score.forced : fill(STRIKES.score.accepted, { nth: STRIKES.nth[offers - 1] || STRIKES.nth[3] }), rejected.length ? fill(STRIKES.score.rejected, { list: rejected.join(', ') }) : ''].filter(Boolean).join(' ') };
}

function strikeTurn(index, pi, bare, context, start) {
  const seed = `${context.today}:${Number.isInteger(context.shuffle) ? context.shuffle : 0}:${pi.salt || 0}:`;
  // What she has learned about this reader: from earlier games in this chat, and from the device between visits.
  context = { ...context, noKinds: [...new Set([...(context.noKinds || []), ...(pi.ledger?.noKinds || [])])], done: [...new Set([...(context.done || []), ...(pi.ledger?.done || [])])] };
  let game = start
    ? { seed, offered: [], rejected: [], noKinds: [...new Set([...(context.noKinds || []), ...(kindIn(bare.replace(/^surprise me/, '')) ? [kindIn(bare.replace(/^surprise me/, ''))] : [])])].slice(0, 2), noTowns: [], lastKind: null }
    : { ...pi.strikes, offered: [...pi.strikes.offered], rejected: [...pi.strikes.rejected], noKinds: [...pi.strikes.noKinds], noTowns: [...pi.strikes.noTowns] };
  const byPath = new Map(index.records.map((record) => [record.u, record]));
  const current = byPath.get(game.offered.at(-1));
  const chips = [STRIKES.chips.yes, STRIKES.chips.done, STRIKES.chips.far, STRIKES.chips.mood];
  const done = (lead, record, score) => ({
    pi: { ...pi, strikes: undefined, plan: undefined, salt: (pi.salt || 0) + 1, ledger: { noKinds: game.noKinds.slice(0, 2), done: [...new Set([...(pi.ledger?.done || []), ...game.rejected.filter((item) => item.why === 'done').map((item) => item.u)])].slice(-40) } },
    reply: { kind: 'strike', mood: 'wink', lead, notes: [footer(index)], cards: record ? [card(record)] : [], links: [], chips: [STRIKES.chips.again], strike: { over: true, ...score, learned: { done: game.rejected.filter((item) => item.why === 'done').map((item) => item.u), noKinds: game.noKinds } } },
  });

  let lead;
  if (!start && current) {
    if (STRIKE_YES.test(bare) && !STRIKE_DONE.test(bare)) {
      const n = game.offered.length;
      const forced = game.rejected.length >= 3;
      const line = forced ? pick(STRIKES.acceptFinal, daySeed(seed + n)) : n === 1 ? pick(STRIKES.acceptFirst, daySeed(seed)) : fill(pick(STRIKES.accept, daySeed(seed + n)), { nth: STRIKES.nth[n - 1] });
      return done(line, current, strikeScore(game, true, forced));
    }
    // After the third strike there is nothing left to reject: her call stands.
    if (game.rejected.length >= 3) return done(pick(STRIKES.acceptFinal, daySeed(seed)), current, strikeScore(game, false, true));
    const kind = kindIn(bare);
    const why = STRIKE_DONE.test(bare) ? 'done' : STRIKE_FAR.test(bare) ? 'far' : kind ? 'kind' : 'mood';
    game.rejected.push({ u: current.u, t: current.t, why });
    if (why === 'far' && current.p) game.noTowns.push(current.p);
    if (why === 'kind') game.noKinds = [...new Set([...game.noKinds, kind])];
    // "Not today" with no reason: move to a different kind of place, without banning this kind.
    game.lastKind = current.k;
    const left = 3 - game.rejected.length;
    const react = fill(pick(STRIKES[why], daySeed(seed + bare + game.rejected.length)), { town: placeName(index, current.p) || 'there', kind: STRIKES.kinds[why === 'kind' ? kind : current.k] });
    lead = left > 0 ? `${react} ${fill(pick(STRIKES.left, daySeed(seed + left)), { left: left === 1 ? 'one rejection' : 'two rejections' })}` : pick(STRIKES.final, daySeed(seed));
  } else {
    const kept = (context.noKinds || []).find((kind) => game.noKinds.includes(kind));
    lead = `${kept ? `${fill(STRIKES.remembered, { kind: STRIKES.kinds[kept] })} ` : ''}${pick(STRIKES.open, daySeed(seed))}`;
  }
  // If two kinds are ruled out and the third runs dry, the bans come off one at a time before she gives up.
  let record = strikeOffer(index, game, context);
  if (!record) return { pi: { ...pi, strikes: undefined }, reply: { kind: 'none', mood: 'brow', lead: STRIKES.beaten, notes: [], cards: [], links: [{ href: '/explore/plans/', label: 'Browse ready-made plans' }], chips: [STRIKES.chips.again], gap: 'strikes' } };
  game.offered.push(record.u);
  const final = game.rejected.length >= 3;
  return {
    pi: { ...pi, strikes: game, plan: undefined, interview: undefined },
    reply: { kind: 'strike', mood: final ? 'wink' : 'brow', lead, notes: start ? [STRIKES.rule] : [], cards: [card(record)], links: [], chips: final ? [STRIKES.chips.yes] : chips, strike: { over: false, strikes: game.rejected.length, offers: game.offered.length, final } },
  };
}

// ── The Tie-breaker ────────────────────────────────────────────────────────
// A group passes one phone around: three places, one of each kind, a vote
// each, and she counts. No model. The tiles are the pages' own words.
const TIE_START = /\b(?:tie ?breaker|group vote|take a vote|put it to (?:a|the) vote|lets vote|vote on it)\b/;
const TIE_STUCK = /^(?:we )?(?:cant|cannot) (?:decide|agree)\b/;
const TIE_COUNT = /^(?:count (?:them|it|up|the votes)|thats everyone|everyones voted|everyone has voted|tally)\b/;
export const startsVote = (bare) => TIE_START.test(bare) || (TIE_STUCK.test(bare) && bare.split(' ').length <= 6) || bare === normalise(TIEBREAK.chips.again);

function tieOptions(index, seed, context, town) {
  const done = new Set(context.done || []);
  const all = index.records.filter((record) => isStop(record) && !done.has(record.u));
  const local = town ? all.filter((record) => record.p === town) : [];
  // One of each kind, so the vote is a real choice. A named town is kept only if it can offer all three.
  const pool = ['eat', 'wine', 'do'].every((kind) => local.some((record) => record.k === kind)) ? local : all;
  // One number per place: whether its page has a picture, then the chat's shuffle. Nothing commercial is read.
  const first = (kind) => pool.filter((record) => record.k === kind)
    .map((record) => ({ record, rank: (record.im ? 0 : 1e10) + daySeed(seed + record.u) }))
    .sort((a, b) => a.rank - b.rank)[0]?.record;
  return { options: ['eat', 'wine', 'do'].map(first).filter(Boolean), local: pool === local && local.length > 0 };
}

function tieTurn(index, pi, asked, bare, context, start) {
  const seed = `${context.today}:${Number.isInteger(context.shuffle) ? context.shuffle : 0}:${pi.salt || 0}:vote:`;
  if (start) {
    const town = parseQuestion(asked, index, context).place?.slug || null;
    const { options, local } = tieOptions(index, seed, context, town);
    if (options.length < 3) return null;
    const lead = local ? fill(TIEBREAK.openTown, { town: placeName(index, town) }) : pick(TIEBREAK.open, daySeed(seed));
    return {
      pi: { ...pi, vote: { options: options.map((record) => ({ u: record.u, t: record.t })), tally: [0, 0, 0] }, strikes: undefined, plan: undefined, interview: undefined, salt: (pi.salt || 0) + 1 },
      reply: { kind: 'vote', mood: 'wink', lead, notes: [TIEBREAK.rule], cards: options.map(card), links: [], chips: [...options.map((record) => record.t), TIEBREAK.chips.count], vote: { over: false, total: 0 } },
    };
  }
  const game = { options: pi.vote.options, tally: [...pi.vote.tally] };
  const chips = [...game.options.map((option) => option.t), TIEBREAK.chips.count];
  const at = game.options.findIndex((option) => bare === normalise(option.t) || (bare.length >= 4 && normalise(option.t).includes(bare)) || bare.includes(normalise(option.t)));
  const total = () => game.tally.reduce((sum, n) => sum + n, 0);
  if (at >= 0) {
    game.tally[at] += 1;
    return {
      pi: { ...pi, vote: game },
      reply: { kind: 'vote', mood: 'think', lead: fill(pick(TIEBREAK.voted, daySeed(seed + total())), { place: game.options[at].t }), notes: [], cards: [], links: [], chips, vote: { over: false, total: total() } },
    };
  }
  if (!TIE_COUNT.test(bare) && bare !== normalise(TIEBREAK.chips.count)) return null;
  const top = Math.max(...game.tally);
  const leaders = game.tally.map((n, i) => (n === top ? i : -1)).filter((i) => i >= 0);
  // A tie, or no votes at all, is hers to break.
  const winner = leaders.length === 1 ? leaders[0] : leaders[daySeed(seed + game.tally.join('-')) % leaders.length];
  const score = [...game.tally].sort((a, b) => b - a).join(' to ');
  const place = game.options[winner].t;
  const lead = total() === 0 ? fill(TIEBREAK.none, { place })
    : leaders.length > 1 ? fill(TIEBREAK.tied, { place, score })
      : top === total() && total() > 1 ? fill(TIEBREAK.unanimous, { place })
        : fill(TIEBREAK.won, { place, score });
  const record = index.records.find((item) => item.u === game.options[winner].u);
  return {
    pi: { ...pi, vote: undefined },
    reply: { kind: 'vote', mood: 'call', lead, notes: [footer(index)], cards: record ? [card(record)] : [], links: [], chips: [TIEBREAK.chips.again, 'Plan my day'],
      vote: { over: true, total: total(), tied: leaders.length > 1, line: game.options.map((option, i) => `${option.t} ${game.tally[i]}`).join(' · ') } },
  };
}

// ── The three taps ─────────────────────────────────────────────────────────
function townChips(index) {
  const counts = new Map();
  for (const record of index.records) if (isStop(record)) counts.set(record.p, (counts.get(record.p) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([slug]) => placeName(index, slug)).filter(Boolean);
}
const nextStep = (brief) => (brief.who === undefined ? 'who' : brief.place === undefined ? 'where' : brief.len === undefined ? 'long' : null);

function interviewTurn(index, pi, brief, today, again = false, context = {}) {
  const step = nextStep(brief);
  // She has already said what she thinks of who is coming, so the plan opens without saying it again.
  if (!step) return planTurn(index, pi, brief, today, pi.interview ? 'any' : undefined);
  const script = INTERVIEW[step];
  const chips = step === 'where' ? [...townChips(index), YOU_PICK] : script.chips;
  // Which way she asks is settled by the chat's shuffle, so it differs between visits and holds within one.
  const seed = `${today}:${Number.isInteger(context.shuffle) ? context.shuffle : 0}:`;
  // She answers what she was just told before she asks the next thing.
  const was = pi.interview?.step;
  const told = again || !was || was === step ? '' : was === 'who' && INTERVIEW.heard[brief.who]
    ? pick(INTERVIEW.heard[brief.who], daySeed(seed + 'who'))
    : was === 'where' ? (brief.place ? fill(pick(INTERVIEW.heard.town, daySeed(seed + 'where')), { town: placeName(index, brief.place) }) : pick(INTERVIEW.heard.mine, daySeed(seed + 'where'))) : '';
  const asks = pick(script.asks, daySeed(seed + step));
  return {
    pi: { ...pi, interview: { brief, step, miss: again ? (pi.interview?.miss || 0) + 1 : 0 } },
    reply: { kind: 'interview', mood: 'think', lead: again ? script.again : `${told ? `${told} ` : ''}${asks}`, notes: [], cards: [], links: [], chips },
  };
}

// ── Modes ──────────────────────────────────────────────────────────────────
const COUNT = { one: 1, a: 1, an: 1, two: 2, couple: 2, three: 3, few: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const DRINKS = /^(?:winer|cellar|brewer|distiller|tasting)/;
const THINGS = /\b(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a couple of|a few|an?) )?(winer(?:y|ies)|cellar doors?|brewer(?:y|ies)|distiller(?:y|ies)|tastings?|restaurants?|lunch(?:es)?|dinner|breakfast|brunch|cafes?|beach(?:es)?|walks?|hikes?|markets?|galler(?:y|ies)|hot springs|spa|stops|places)\b/g;

function critique(index, pi, asked, bare) {
  const named = index.records.filter((record) => isStop(record) && normalise(record.t).split(' ').length >= 2 && ` ${bare} `.includes(` ${normalise(record.t)} `)).slice(0, 5);
  let drinks = named.filter((record) => record.k === 'wine').length;
  let total = named.length;
  let stated = 0;
  for (const [, amount, thing] of bare.matchAll(THINGS)) {
    const n = amount ? (/^\d+$/.test(amount) ? Number(amount) : COUNT[amount.replace(/^a (couple|few) of$/, '$1')] || 1) : 1;
    if (/^(?:stops|places)$/.test(thing)) { stated = Math.max(stated, n); continue; }
    total += n;
    if (DRINKS.test(thing)) drinks += n;
  }
  total = Math.max(total, stated);
  const towns = new Set(named.map((record) => record.p)).size;
  const lines = [];
  if (drinks >= 3) lines.push(CRITIQUE.drinks);
  if (KIDS.test(bare) && drinks >= 1) lines.push(CRITIQUE.kids);
  if (total >= 5) lines.push(fill(CRITIQUE.crowded, { n: total }));
  if (towns >= 3) lines.push(fill(CRITIQUE.spread, { n: towns }));
  if (/\bbefore lunch\b/.test(bare) && total >= 3) lines.push(CRITIQUE.early);
  const fine = !lines.length;
  const place = parseQuestion(asked, index).place?.slug || named[0]?.p;
  return {
    pi: { ...pi, await: undefined, fix: { who: KIDS.test(bare) ? 'family' : undefined, place: place ?? null, len: 'half' } },
    reply: { kind: 'critique', mood: fine ? 'call' : 'brow', lead: fine ? CRITIQUE.fine : lines.slice(0, 2).join(' '), notes: named.length ? [footer(index)] : [],
      cards: named.map(card), links: [], chips: fine ? ['Surprise me'] : [CRITIQUE.fix] },
  };
}

const WISH_LEAD = /^(?:and |well )?(?:i|we|he|she|they|my \w+|one of us|the other(?: one)?|the kids?|everyone else)\s+(?:wants?|would like|is after|are after|says?|fanc(?:y|ies)|am after)\s+(?:to (?:go (?:to|for)|do|have|eat at|see|visit)\s+)?/;
function argument(index, pi, asked, today) {
  const said = normalise(asked).replace(/^.*\bsettle (?:an|the|this|our) argument\b/, '').trim();
  let parts = said.split(/\s*(?:\bbut\b|\bvs\b|\bversus\b|\bwhile\b|\bwhereas\b)\s*/).filter(Boolean);
  if (parts.length < 2) parts = said.split(/\s+and\s+(?=(?:i|we|he|she|they|my|the other|the kids?|everyone)\b)/).filter(Boolean);
  if (parts.length < 2) parts = said.split(/\s+and\s+/).filter(Boolean);
  const wishes = parts.map((part) => ({ part, parsed: parseQuestion(part, index) })).filter((wish) => wish.parsed.kinds && !wish.parsed.kinds.includes('story')).slice(0, 2);
  if (wishes.length < 2) return { pi: { ...pi, await: 'argument' }, reply: { kind: 'interview', mood: 'think', lead: said ? ARGUMENT.again : ARGUMENT.ask, notes: [], cards: [], links: [], chips: [] } };

  const named = wishes.map((wish) => wish.parsed.place).find(Boolean) || null;
  const found = (wish, place) => {
    const filter = { kinds: wish.parsed.kinds, place, window: null, words: wish.parsed.words, boost: wish.parsed.boost };
    let result = select(index, filter, today);
    if (result.empty || result.partial) result = select(index, { ...filter, words: [] }, today);
    return result.records.filter((record) => !record.g).map((record) => record.u);
  };
  let town = named;
  if (!town) {
    const both = index.places.filter((place) => wishes.every((wish) => found(wish, place).length));
    town = both.sort((a, b) => daySeed(today + a.slug) - daySeed(today + b.slug))[0] || null;
  }
  let pools = wishes.map((wish) => found(wish, town));
  const apart = pools.some((paths) => !paths.length);
  if (apart) pools = wishes.map((wish) => found(wish, null));
  if (pools.some((paths) => !paths.length)) return { pi: { ...pi, await: 'argument' }, reply: { kind: 'interview', mood: 'think', lead: ARGUMENT.again, notes: [], cards: [], links: [], chips: [] } };
  if (pools[1][0] === pools[0][0] && pools[1].length > 1) pools[1] = pools[1].slice(1);
  const label = (wish) => `For “${wish.part.replace(WISH_LEAD, '').replace(/^(?:an?|the|some) /, '').slice(0, 36)}”`;
  const plan = {
    brief: { place: apart ? null : town.slug, argument: true },
    title: apart || !town ? 'One each' : `One each in ${town.name}`,
    slots: wishes.map((wish, i) => ({ role: 'wish', label: label(wish), pool: pools[i].slice(0, 8), at: 0 })),
    missing: [],
  };
  const lead = apart || !town ? ARGUMENT.apart : fill(ARGUMENT.both, { town: town.name });
  return { pi: { ...pi, await: undefined, plan }, reply: planReply(index, plan, lead, { chips: ['Start over'] }) };
}

function nightlife(index, asked, today) {
  const place = parseQuestion(asked, index).place;
  const found = index.records.filter((record) => (record.k === 'eat' || record.k === 'wine') && !record.g && EVENING.test(words(record)) && (!place || record.p === place.slug))
    .sort((a, b) => daySeed(today + a.u) - daySeed(today + b.u)).slice(0, 5);
  if (!found.length) {
    return { kind: 'none', mood: 'brow', lead: fill(NIGHTLIFE.none, { where: place ? ` in ${place.name}` : '' }), notes: [], cards: [], links: [{ href: '/whats-on/', label: 'See the full What’s On calendar' }], chips: ['Live music this weekend'] };
  }
  return { kind: 'nightlife', mood: 'brow', lead: NIGHTLIFE.lead, notes: [NIGHTLIFE.note, footer(index)], cards: found.map(card),
    links: [{ href: '/whats-on/', label: 'See the full What’s On calendar' }], chips: ['Live music this weekend', 'Breweries', 'Pubs'] };
}

function goesWith(index, anchor, today) {
  const found = [];
  for (const kind of ['eat', 'wine', 'do', 'stay']) {
    if (kind === anchor.k) continue;
    const same = index.records.filter((record) => record.k === kind && !record.g && record.p === anchor.p && record.u !== anchor.u)
      .sort((a, b) => daySeed(today + a.u) - daySeed(today + b.u));
    if (same[0]) found.push(same[0]);
  }
  if (!found.length) return { kind: 'none', mood: 'brow', lead: fill(WITH_THIS.none, { anchor: anchor.t }), notes: [], cards: [], links: [], chips: [] };
  return { kind: 'with', mood: 'call', lead: fill(WITH_THIS.lead, { anchor: anchor.t }), notes: [footer(index)], cards: found.map(card), links: [], chips: ['Build a day around this'] };
}

/** The page the reader is on, when it is one a day can be built around. */
export function pageAnchor(index, pagePath) {
  const record = pagePath ? index.records.find((item) => item.u === pagePath) : null;
  return record && !record.g && record.p && ['eat', 'wine', 'do', 'stay'].includes(record.k) ? record : null;
}
/** Chips offered on a venue page. */
export function pageOffers(index, pagePath, today = melbourneDay()) {
  const anchor = pageAnchor(index, pagePath);
  if (!anchor) return null;
  // Offer a day only where the guides can fill one, and company only where there is some.
  const day = roleOf(anchor) && (compose(index, { who: 'any', place: anchor.p, len: 'half', anchor: anchor.u }, today)?.slots.length || 0) >= 2;
  const company = goesWith(index, anchor, today).cards.length > 0;
  const chips = [...(day ? ['Build a day around this'] : []), ...(company ? ['What goes with this'] : [])];
  return chips.length ? { title: anchor.t, chips } : null;
}

// ── Her lines over the matcher's own replies ───────────────────────────────
function decorate(out, asked, bare, index, context) {
  const reply = out.reply;
  const parsed = parseQuestion(asked, index, context);
  const seed = daySeed(bare);
  if (reply.kind === 'live') {
    const topic = parsed.flags.price && !parsed.flags.live ? 'price' : REFUSAL_TOPICS.find(([, pattern]) => pattern.test(bare))?.[0] || 'hours';
    return { ...out, reply: { ...reply, mood: 'brow', lead: pick(REFUSALS[topic], seed), notes: [reply.lead, ...reply.notes] } };
  }
  if (reply.kind === 'topic') return { ...out, reply: { ...reply, mood: 'brow', lead: pick(REFUSALS.dogs, seed), notes: [reply.lead, ...reply.notes] } };
  if (reply.kind === 'results' && out.state?.filter?.kinds?.[0] === 'wine' && KIDS.test(bare)) return { ...out, reply: { ...reply, aside: REACTIONS.kidsWine } };
  return out;
}

/**
 * One turn of the conversation. Same contract as ask(): returns
 * { reply, state }, and `state` is plain JSON that goes back in next turn.
 * `context.persona === false` gives the plain matcher.
 * @param {any} index
 * @param {string} question
 * @param {any} [state]
 * @param {Record<string, any>} [context]
 * @returns {any}
 */
export function converse(index, question, state = null, context = {}) {
  if (context.persona === false) return ask(index, question, state, context);
  const asked = typeof question === 'string' ? question.trim() : '';
  if (!asked || asked.length > ASK_MAX_LENGTH) return null;
  const today = context.today || melbourneDay(context.now);
  const bare = normalise(asked);
  if (/^(?:start over|start again|reset|new question|clear)$/.test(bare)) return ask(index, asked, null, context);

  let pi = { ...(state?.pi || {}) };
  const base = state ? { ...state } : {};
  const said = occasion(asked);
  const recalled = !said && pi.memory && !pi.memory.used ? pi.memory.said : null;
  if (said) pi.memory = { said, used: false };

  const finish = (result) => {
    const next = { ...result.pi };
    const reply = { ...result.reply };
    // Bring back what they told her earlier, once, when there is something to show.
    if (recalled && reply.cards?.length && !reply.aside) {
      reply.aside = fill(pick(CALLBACKS, daySeed(recalled + bare)), { said: recalled });
      next.memory = { ...next.memory, used: true };
    }
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
    const kept = result.state === undefined ? base : result.state;
    const merged = { ...(kept || {}), pi: next };
    return { reply, state: Object.keys(next).length || kept ? merged : null };
  };
  // What she will not do for this plan, said once at the top of its notes.
  const caveats = () => {
    const flags = parseQuestion(asked, index, context).flags;
    return [MANY_DAYS.test(bare) ? PLAN_NOTES.oneDay : null, flags.price ? pick(REFUSALS.price, daySeed(bare)) : null].filter(Boolean);
  };

  if (ASKS_FOR_SOURCES.some(pattern => pattern.test(bare))) {
    const links = cardsFor(index, context.previousOptions).map(({ href, title }) => ({ href, label: title }));
    const lead = !links.length ? 'Which recommendation do you mean? Give me the place or event name so I can look for its guide.'
      : links.length === 1 ? 'This is the published Peninsula Insider guide for the pick I showed you.'
      : 'These are the published Peninsula Insider guides for the picks I showed you.';
    return finish({ pi, reply: { kind: 'sources', lead, notes: [], cards: [], links, chips: [] } });
  }

  // Only the options the reader saw on the preceding reply can ground a bare comparison.
  if (BARE_COMPARISON.some(pattern => pattern.test(bare))) {
    const cards = cardsFor(index, context.previousOptions);
    const pair = cards.length === 2;
    const lead = pair ? 'Here are the two guide entries. What matters most to you when choosing between them?'
      : cards.length === 1 ? `What would you like to compare ${cards[0].title} with?` : 'Which two places or options would you like me to compare?';
    return finish({ pi, reply: { kind: 'comparison', lead, notes: pair ? [footer(index)] : [], cards: pair ? cards : [], links: [], chips: [] } });
  }

  // The Tie-breaker. While a vote is open a place's name is a vote and "count"
  // ends it. Anything else leaves the vote behind.
  if (pi.vote) {
    const moved = tieTurn(index, pi, asked, bare, { ...context, today }, false);
    if (moved) return finish(moved);
    pi = { ...pi, vote: undefined };
  }
  if (!pi.interview && !pi.await && startsVote(bare)) {
    const opened = tieTurn(index, pi, asked, bare, { ...context, today }, true);
    if (opened) return finish(opened);
  }
  // Support: a page is wrong, or the reader runs the place. She hands over to
  // the editors' correction form (which gives a reference) or the business
  // desk, and takes no details herself. Only the page address goes in the link.
  if (!pi.interview && !pi.await && !pi.strikes && (SAYS_OWNER.test(bare) || SAYS_WRONG.test(bare))) {
    const owner = SAYS_OWNER.test(bare);
    const here = typeof context.pagePath === 'string' && index.records.some((record) => record.u === context.pagePath) ? context.pagePath : null;
    const links = owner
      ? [{ href: '/partners/', label: SUPPORT.links.owner }, { href: '/contact/#business', label: SUPPORT.links.update }]
      : [{ href: here ? `/contact/?page=${encodeURIComponent('https://peninsulainsider.com.au' + here)}#correction` : '/contact/#correction', label: here ? SUPPORT.links.wrongHere : SUPPORT.links.wrong }];
    return finish({ pi, reply: { kind: 'support', mood: owner ? 'wink' : 'think', lead: pick(owner ? SUPPORT.owner : SUPPORT.wrong, daySeed(bare)), notes: [], cards: [], links, chips: [], support: owner ? 'owner' : 'wrong' } });
  }
  // About her: no pages go with it, so she answers as herself and names nowhere.
  if (HERSELF.test(bare) && !pi.interview && !pi.await && !pi.strikes) {
    return finish({ pi, reply: { kind: 'help', mood: 'wink', lead: pick(ABOUT_HER, daySeed(bare)), notes: [], cards: [], links: [], chips: ['Plan my day', 'Surprise me'] } });
  }
  if (pi.await === 'critique') return finish(critique(index, pi, asked, bare));
  if (pi.await === 'argument' && !PLAN.test(bare)) return finish(argument(index, pi, asked, today));

  if (pi.interview) {
    const { brief, step, miss } = pi.interview;
    const heard = readBrief(bare, index, context);
    if (step === 'long' && heard.len === undefined && /\bday\b/.test(bare)) heard.len = 'day';
    const answered = step === 'who' ? heard.who !== undefined : step === 'where' ? heard.place !== undefined : heard.len !== undefined;
    if (answered) return finish(interviewTurn(index, pi, { ...brief, ...heard }, today, false, context));
    // Not an answer. If it is a question the guides can answer, answer that instead.
    const out = ask(index, asked, state, context);
    if (out?.reply.cards.length) { delete pi.interview; return finish({ pi, ...decorate(out, asked, bare, index, context) }); }
    if (!miss) return finish(interviewTurn(index, pi, brief, today, true, context));
    const fallback = { who: 'any', where: null, long: 'half' }[step];
    return finish(interviewTurn(index, pi, { ...brief, [step === 'where' ? 'place' : step === 'long' ? 'len' : 'who']: fallback }, today, false, context));
  }

  const anchor = pageAnchor(index, context.pagePath);
  if (CRITIC.test(bare)) {
    const rest = bare.replace(CRITIC, '').trim();
    if (rest.split(' ').length >= 3) return finish(critique(index, pi, asked, bare));
    return finish({ pi: { ...pi, await: 'critique' }, reply: { kind: 'interview', mood: 'brow', lead: CRITIQUE.ask, notes: [], cards: [], links: [], chips: [] } });
  }
  if (ARGUE.test(bare)) return finish(argument(index, pi, asked, today));
  if (FIX.test(bare) && pi.fix) return finish(planTurn(index, { ...pi, fix: undefined }, { who: 'any', ...pi.fix, salt: (pi.salt || 0) }, today));
  // Three Strikes. "Surprise me" starts a game; while one is open, a short
  // reply is a move in it. A real question (a town, a kind of place, a plan)
  // leaves the game.
  if (SURPRISE.test(bare) || bare === normalise(STRIKES.chips.again)) return finish(strikeTurn(index, { ...pi, strikes: undefined }, bare, { ...context, today }, true));
  if (pi.strikes && bare.split(' ').length <= 8 && !PLAN.test(bare) && !CRITIC.test(bare) && !ARGUE.test(bare) && !RAINY.test(bare) && !(parseQuestion(asked, index, context).place)) return finish(strikeTurn(index, pi, bare, { ...context, today }, false));
  if (pi.strikes) pi = { ...pi, strikes: undefined };
  if (ELSEWHERE.test(bare) && pi.plan?.brief && !pi.plan.brief.argument) {
    const salt = (pi.salt || 0) + 1;
    const was = pi.plan.brief;
    // Keep asking for another town until it is one, within reason.
    for (let tries = 0; tries < 6; tries += 1) {
      const turn = planTurn(index, { ...pi, salt: salt + tries }, { ...was, place: null, anchor: undefined, salt: salt + tries }, today, was.rainy ? 'rainy' : undefined);
      if (turn.pi.plan?.brief.place !== was.place || tries === 5) return finish(turn);
    }
  }
  if (RAINY.test(bare)) {
    const was = pi.plan?.brief && !pi.plan.brief.argument ? pi.plan.brief : null;
    return finish(planTurn(index, pi, was ? { ...was, rainy: true } : { who: 'any', place: readBrief(bare, index, context).place ?? null, len: 'half', rainy: true }, today, 'rainy'));
  }
  if (AROUND.test(bare)) {
    if (anchor && roleOf(anchor)) return finish(planTurn(index, pi, { who: 'any', place: anchor.p, len: 'half', anchor: anchor.u }, today, 'anchor'));
    return finish(interviewTurn(index, pi, readBrief(bare, index, context), today, false, context));
  }
  if (GOES_WITH.test(bare) && anchor) return finish({ pi, reply: goesWith(index, anchor, today) });
  if (NIGHT.test(bare)) return finish({ pi, reply: nightlife(index, asked, today) });
  if (PLAN.test(bare) || /^plan my day$/.test(bare)) {
    const notes = caveats();
    return finish(interviewTurn(index, pi, { ...readBrief(bare, index, context), ...(notes.length ? { notes } : {}) }, today, false, context));
  }

  const out = ask(index, asked, state, context);
  if (!out) return null;
  const done = decorate(out, asked, bare, index, context);
  return finish({ pi, reply: done.reply, state: done.state });
}
