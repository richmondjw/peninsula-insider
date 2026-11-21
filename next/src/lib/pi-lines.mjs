/**
 * PI's own lines.
 *
 * Everything here was written by a person, not generated. The rule that makes
 * it safe to be funny: a line may be about the reader, about their plan, or
 * about PI herself. It may never state a fact about a venue, a town, a price,
 * an opening time or a date. Words in {braces} are filled only with the
 * reader's own words, a town name from the index, or a count of stops.
 * BRAND-PI.md is the voice: dry, short, no em dashes, no gushing, and she
 * never claims to have been anywhere.
 */

/** What she says instead of checking something she cannot check. */
export const REFUSALS = {
  hours: [
    'I don’t do opening hours. They change the moment I write them down.',
    'Opening hours are between a venue and its front door. I stay out of it.',
    'If I told you it was open and it wasn’t, you’d never ask me anything again.',
  ],
  booking: [
    'I can’t see a booking sheet from here. Nobody lets me near one.',
    'Whether there’s a table left is between you and the person holding the diary.',
  ],
  status: [
    'Whether it’s still on is the organiser’s call, and they don’t ring me first.',
    'I only know what our page said when it was published. Plans change without telling me.',
  ],
  weather: [
    'I don’t do weather. Pack for two seasons and blame me for neither.',
    'The sky doesn’t check with me first.',
  ],
  tides: ['Tides keep their own notebook, and I’m not allowed to read it.'],
  // No jokes where being wrong could hurt someone.
  safety: ['I don’t make the call on what’s safe in the water or on a track. Ask the people whose job it is.'],
  access: ['I won’t guess at steps, ramps or parking. Get that wrong and somebody’s day is ruined.'],
  dietary: ['Allergies and diets are a question for the kitchen. They know what’s in the pan and I don’t.'],
  price: [
    'I don’t do prices. They go up while I’m typing.',
    'Money talk happens at the venue. I only do the where.',
  ],
  // Plain, like safety: a wrong answer here costs the reader, not me.
  rules: ['What’s legal or permitted isn’t mine to rule on. Ask the council or whoever manages the land.'],
  dogs: ['Dogs are welcome in my notebook. Whether they’re welcome at the table is the venue’s call.'],
};

/** Which refusal a question is asking for. First match wins. */
export const REFUSAL_TOPICS = [
  ['rules', /\b(?:legal(?:ly)?|illegal|against the law|lawful|by ?laws?|permits?|licen[cs]es?|fined|allowed|permitted)\b/],
  ['safety', /\b(?:safe(?:ty)?|danger(?:ous)?|swim(?:ming)?|surf(?:ing)?|rips?|fire danger|fire ban|flood(?:ing|ed)?|landslips?)\b/],
  ['access', /\b(?:wheelchairs?|accessib(?:le|ility)|step ?free|prams?|strollers?|mobility|parking)\b/],
  ['dietary', /\b(?:allerg(?:y|ies|en|ens)|gluten|coeliac|celiac|vegan|halal|kosher)\b/],
  ['tides', /\btides?\b/],
  ['weather', /\b(?:weather|forecast|rain(?:ing)?)\b/],
  ['status', /\b(?:cancel(?:led|ed|lation|lations)?|called off|postponed|track conditions?|park conditions?)\b/],
  ['booking', /\b(?:sold out|availab(?:le|ility)|book(?:ed)? out|tickets? left)\b/],
];

export const INTERVIEW = {
  who: { ask: 'Before I plan anything: who’s coming?', again: 'Humour me. Who’s coming?',
    chips: ['Just the two of us', 'Kids in tow', 'A group', 'Just me'] },
  where: { ask: 'Whereabouts? Or leave it to me.', again: 'A town, or say “you pick”.' },
  long: { ask: 'And how much of the day do I get?', again: 'Morning, half a day or the whole day?',
    chips: ['Just the morning', 'Half a day', 'The whole day'] },
};
export const YOU_PICK = 'You pick';

/** Her opening line on a plan. {n} is the number of stops, {town} the town. */
export const PLAN_LEADS = {
  couple: ['Just the two of you. Easy. Nobody to herd. Here’s {town}, {n} stops, in order.'],
  family: ['Kids in tow. Brave. I’ve kept {town} to {n} stops.'],
  group: ['A group. Someone will be late, so {town} is {n} stops and no more.'],
  solo: ['Just you. No negotiating. {town}, {n} stops.'],
  any: ['Right. {town}, {n} stops, in order. Argue with me after.'],
  surprise: ['Dealer’s choice. {town}, {n} stops. Don’t argue.', 'You asked for it. {town}, {n} stops.'],
  rainy: ['Same idea, under a roof where our guides have one. {town}, {n} stops.'],
  anchor: ['Built around {anchor}. {n} stops in {town}, and that one stays put.'],
};

export const SWAP_LINES = [
  'Fine. Second choice it is.',
  'Picky. I respect it.',
  'Changed, in pen. Don’t make me do it again.',
  'Back to an earlier one. I knew you would.',
];
export const SWAP_ONLY = 'That’s the only one our guides list for that part of the day. It stays.';

export const CRITIQUE = {
  ask: 'Go on then. Tell me the plan, all of it.',
  drinks: 'That’s a lot of cellar doors. Who’s driving? Decide before the first one.',
  crowded: '{n} stops in one day. That isn’t a day out, that’s a delivery run. Drop two.',
  kids: 'Tastings with small children. Brave. Take snacks and low expectations.',
  spread: 'That’s {n} towns. You’ll see a lot of windscreen.',
  early: 'All of that before lunch. Ambitious. I’ll say no more.',
  fine: 'Annoyingly, that’s sensible. I’ve nothing to add.',
  fix: 'Fix it for me',
};

export const ARGUMENT = {
  ask: 'Who wants what? One line will do: “I want a long lunch, they want a walk.”',
  again: 'I can settle it if each of you names a thing. A lunch, a walk, a winery.',
  both: 'Nobody wins outright. {town} has both, so you each get one and nobody sulks.',
  apart: 'No one town in our guides has both, so somebody is driving. You each still get one.',
};

/** Said about the Peninsula as a whole, so it was approved by the editor, not written by PI on the fly. */
export const NIGHTLIFE = {
  lead: 'Peninsula nightlife is mostly a second bottle and a clear sky. Here’s what our guides do have.',
  none: 'Peninsula nightlife is mostly a second bottle and a clear sky, and our guides have nothing closer than that{where}.',
  note: 'These are pages whose own words mention a bar, a pub, a brewery, a distillery or live music. I can’t tell you who is open late.',
};

export const WITH_THIS = { lead: 'Same town as {anchor}, different kind of stop.', none: 'Our guides list nothing else in the same town as {anchor}.' };

/** Later in the visit, she brings back something the reader said. {said} is the reader's own phrase. */
export const CALLBACKS = [
  'I haven’t forgotten {said}.',
  'Still planning around {said}, I assume.',
  'And yes, this is with {said} in mind.',
];

/** A dry remark on what was asked for, never on a place. */
export const REACTIONS = {
  kidsWine: 'Tastings with small children. Brave. I’ve said nothing.',
};

export const NEWSLETTER = { line: 'I write a weekly note too. Shorter than this, and I pick the stops.', label: 'Get The Insider Note', href: '/newsletter/' };

export const PLAN_NOTES = {
  order: 'The order is mine. I can’t check hours or bookings, so confirm each stop before you set out.',
  oneDay: 'I plan one day at a time.',
};

/** Picks one line. The same words on the same day get the same line. */
export function pick(lines, seed) {
  const list = Array.isArray(lines) ? lines : [lines];
  return list[Math.abs(seed) % list.length];
}
export const fill = (line, values) => line.replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? ''));
