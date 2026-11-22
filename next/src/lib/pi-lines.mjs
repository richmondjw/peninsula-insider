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
  // Each question has a few ways of being asked, so a second visit does not read like a form.
  // `ask` stays as the first of them. Every line is about the reader, never a place.
  who: { ask: 'Before I plan anything: who’s coming?', again: 'Humour me. Who’s coming?',
    asks: ['Before I plan anything: who’s coming?', 'Hand it over, then. Who am I planning for?', 'Good. I like being in charge. Who’s coming?', 'I’ll take it from here. First: who’s in the car?'],
    chips: ['Just the two of us', 'Kids in tow', 'A group', 'Just me'] },
  where: { ask: 'Whereabouts? Or leave it to me.', again: 'A town, or say “you pick”.',
    asks: ['Whereabouts? Or leave it to me.', 'Where are we pointing the car? Or say “you pick” and I will.', 'Got a town in mind, or do I get to choose?'] },
  long: { ask: 'And how much of the day do I get?', again: 'Morning, half a day or the whole day?',
    asks: ['And how much of the day do I get?', 'Last one. How long have I got you for?', 'How much of the day are you giving me?'],
    chips: ['Just the morning', 'Half a day', 'The whole day'] },
  // What she says to the answer she has just been given, before her next question.
  heard: {
    couple: ['Two of you. Easy. Nobody to herd.', 'Just the two of you. Good, I can be ambitious.', 'A pair. That I can work with.'],
    family: ['Kids in tow. Brave. I’ll keep it short and near a snack.', 'Children. Noted, and respected. Fewer stops, then.', 'Small people. I’ll plan around the meltdowns.'],
    group: ['A group. Someone will be late. I’ll plan for that.', 'A group, so somebody will have opinions. I’ll ignore most of them.', 'Several of you. I’ll keep it simple enough to survive a committee.'],
    solo: ['Just you. No negotiating. My favourite kind.', 'On your own. Good. Nobody to slow us down.', 'Solo. Then we do exactly what’s worth doing.'],
    town: ['{town}. Fine choice, I’ll allow it.', '{town} it is. I have thoughts.', '{town}. Good, that narrows my notebook nicely.'],
    mine: ['My pick, then. You won’t regret that. Probably.', 'Leaving it to me. Sensible.', 'I choose. Excellent. I was going to anyway.'],
  },
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
// ── About herself ──────────────────────────────────────────────────────────
// "What's with the hat?" is a question about her, not a search for hats. These
// are what she says if the conversation service is not there to answer in her
// own words. About herself only: no place, and no claim to have been anywhere.
export const ABOUT_HER = [
  'The hat keeps the wind off the bay out of my notebook. What are we planning?',
  'I’m PI. I keep the notebook and I make the call. What are you after?',
  'The one with the hat and the opinions. Ask me where to go.',
];

// ── Support ────────────────────────────────────────────────────────────────
// A reader says a page is wrong, or says they run the place. She does not
// argue and does not take the details herself: the editors' correction form
// gives a reference, and the business desk is a separate door.
export const SUPPORT = {
  wrong: [
    'Then I want it fixed. Tell the editors exactly what is wrong and they give you a reference to hold them to.',
    'Good catch, if you’re right. I don’t take corrections myself. The editors do, and you get a reference.',
  ],
  owner: [
    'Then you want the business desk, not me. I only do the recommending, and that part is not for sale.',
    'Yours, is it? The business desk looks after listings. I stay out of it, so my picks stay mine.',
  ],
  links: { wrong: 'Report a correction', wrongHere: 'Report a correction to this page', owner: 'For Peninsula businesses', update: 'Update my listing' },
};

// ── The Tie-breaker ────────────────────────────────────────────────────────
// A group that cannot agree passes one phone around. Three places, one vote
// each, and she counts. A tie is hers to break. Blanks: {place}, {n}, {score}.
export const TIEBREAK = {
  rule: 'Pass the phone. One vote each, no campaigning. Tell me when everyone has voted and I count.',
  open: [
    'A group that can’t agree. My favourite kind. Three on the table.',
    'Democracy, then. It rarely works, but let’s watch. Three on the table.',
  ],
  openTown: 'Three in {town}, so nobody can complain about the drive.',
  voted: [
    'One for {place}. Next voter.',
    '{place} gets a vote. Pass it on.',
    'Noted, {place}. Who’s next?',
  ],
  won: '{place}, {score}. The losers may sulk in the car.',
  unanimous: '{place}, and nobody argued. I don’t believe you needed me.',
  tied: 'A tie, {score}. So it’s my call, which is how I like it. {place}.',
  none: 'Nobody voted. Typical. My call, then: {place}.',
  chips: { count: 'Count the votes', again: 'Vote again' },
};

// ── Three Strikes ──────────────────────────────────────────────────────────
// "Surprise me": one place at a time, three rejections, then her call stands.
// Every line is about the reader and the game. Blanks: {town}, {kind}, {n},
// {nth} ("second"), {left}. None states a fact about a place.
export const STRIKES = {
  rule: 'One place at a time. You get three rejections, and you have to say why. After that it’s my call and you’re going.',
  open: [
    'Terms accepted. First offer, and I’m not opening with my best.',
    'Good. I prefer it when you don’t get a say. First offer.',
    'Finally, someone who trusts me. Briefly. First offer.',
    'No brief, no excuses. Here’s where I’d send you.',
  ],
  remembered: 'Still no {kind}, I assume. I kept a note.',
  done: [
    'Of course you have. That tells me what you are. Next.',
    'Noted. You get around. Try this instead.',
    'Good. Then I can stop being polite. Next offer.',
  ],
  far: [
    'Fine. Nothing in {town}. I had hopes for you.',
    'Not {town}, then. Staying closer.',
    '{town} is off the list. Your loss, but it’s your petrol.',
  ],
  kind: [
    'No more {kind}. Understood, and frankly a relief.',
    'Striking every one of the {kind}. That narrows it nicely.',
    'So it’s not a day for {kind}. I can work with that.',
  ],
  mood: [
    'Not the mood. All right. Something else entirely.',
    'You’re difficult. I’m starting to enjoy it.',
    'That’s a no with no reason, which I’ll allow once. Different direction.',
  ],
  left: ['You have {left} left.', 'That leaves you {left}.'],
  final: [
    'That’s three. My call now, and you’re going.',
    'Three strikes. You had your say. This is where you’re going.',
    'Out of rejections. This one I kept back for exactly this.',
  ],
  accept: [
    'Accepted on the {nth} offer. I knew you’d come round.',
    'Sold on the {nth}. You’re easier than you pretend.',
    'The {nth} offer. Good instinct, eventually.',
  ],
  acceptFirst: ['First offer. I like you already.', 'Taken on the first offer. Either I’m good or you’re hungry.'],
  acceptFinal: ['Wise. You didn’t have a choice, but still.', 'Good. It was never really a question.'],
  beaten: 'You’ve beaten the notebook. That doesn’t happen often. Tell the editors what’s missing.',
  chips: { done: 'Done it', far: 'Too far', mood: 'Not today', yes: 'Go on then', again: 'Play again' },
  nth: ['first', 'second', 'third', 'final'],
  kinds: { eat: 'places to eat', wine: 'wineries and cellar doors', do: 'things to do' },
  score: { accepted: 'Accepted on the {nth} offer.', forced: 'Three strikes. PI’s call stood.', rejected: 'Rejected: {list}.', why: { done: 'done it', far: 'too far', kind: 'not that kind of day', mood: 'not the mood' } },
};

export function pick(lines, seed) {
  const list = Array.isArray(lines) ? lines : [lines];
  return list[Math.abs(seed) % list.length];
}
export const fill = (line, values) => line.replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? ''));
