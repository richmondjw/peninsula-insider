/** The only statements this pilot can return. Independently scoped against both
 * links on 20 November 2026. No inference, ranking, or current-access promise. */
const PARKS = 'https://www.parks.vic.gov.au/places-to-see/';
const PARK = PARKS + 'parks/mornington-peninsula-national-park';
export const ASK_EDITORIAL_MAX_LENGTH = 500;
export const ASK_EDITORIAL_MAX_TURNS = 12;

const FACTS = Object.freeze({
  boardwalk: Object.freeze({
    name: 'Cape Schanck Boardwalk',
    text: 'The Cape Schanck Boardwalk is a timber coastal boardwalk in Cape Schanck Lighthouse Reserve.',
    guide: '/explore/cape-schanck-boardwalk/',
    parks: PARKS + 'sites/cape-schanck-day-visitor-area',
  }),
  bushrangers: Object.freeze({
    name: 'Bushrangers Bay Walk',
    text: 'Bushrangers Bay Walk goes from the Cape Schanck Lighthouse precinct through coastal scrub to Bushrangers Bay.',
    guide: '/explore/bushrangers-bay-walk/',
    parks: PARKS + 'sites/bushrangers-bay-walk',
  }),
  coppins: Object.freeze({
    name: 'Coppins Track',
    text: 'Coppins Track is a coastal walking track near Sorrento, from the Ocean Beach area to Diamond Bay.',
    guide: '/explore/coppins-track/',
    parks: PARKS + 'sites/coppins-track',
  }),
});

export const ASK_EDITORIAL_EXAMPLES = Object.freeze([
  'What is the Cape Schanck Boardwalk?',
  'Tell me about Bushrangers Bay Walk',
  'Where is Coppins Track?',
]);

// Full-string, positive-only grammar. Any unsupported modifier, mixed intent,
// negation, injected instruction, or extra place falls through to Search.
const PREFIXES = ['', 'what is ', 'where is ', 'tell me about ', 'show me '];
const TOPICS = {
  boardwalk: ['cape schanck boardwalk', 'the cape schanck boardwalk', 'boardwalk at cape schanck', 'the boardwalk at cape schanck'],
  bushrangers: ['bushrangers bay walk', 'the bushrangers bay walk', 'bushranger\'s bay walk', 'bushrangers bay track'],
  coppins: ['coppins track', 'the coppins track', 'coppin\'s track', 'a coastal walk in sorrento', 'coastal walk in sorrento'],
};
const INTENTS = new Map(Object.entries(TOPICS).flatMap(([key, topics]) =>
  topics.flatMap(topic => PREFIXES.map(prefix => [prefix + topic, key]))));

const STATUS = /\b(?:today|tomorrow|tonight|now|current(?:ly)?|open|opening|clos(?:e|ed|ure|ures|ing)|hours?|cancel(?:led|ed|lation|lations)?|called off|reopen(?:ed|ing)?|track conditions?|park conditions?|low tide|high tide|tides?|flood(?:ing)?|weather|fire|safe(?:ty)?|danger(?:ous)?|swim(?:ming)?|surf(?:ing)?|waves?|rips?|cliffs?|landslips?|wheelchair|accessible|accessibility|access|stairs?|step[ -]?free|prams?|strollers?|mobility|fees?|parking|dogs?|permits?|distance|kilomet(?:re|er)s?|how long|how far)\b/u;

function normalize(input) {
  return input.normalize('NFKC').toLowerCase().replace(/[\u2018\u2019]/gu, "'")
    .trim().replace(/\s+/gu, ' ').replace(/[?!]+$/u, '').trimEnd();
}

function officialFor(query) {
  const sorrento = /\b(?:sorrento|coppin'?s|diamond bay)\b/u.test(query);
  const cape = /\b(?:cape schanck|bushrangers?|bushranger's)\b/u.test(query);
  const bushrangers = /\bbushrangers?'?s? bay\b/u.test(query);
  const boardwalk = /\bboardwalk\b/u.test(query);
  if (sorrento && !cape) return FACTS.coppins.parks;
  if (cape && !sorrento && bushrangers && !boardwalk) return FACTS.bushrangers.parks;
  if (cape && !sorrento && !bushrangers) return FACTS.boardwalk.parks;
  if (sorrento || cape || /\bmornington peninsula national park\b/u.test(query)) return PARK;
  return null;
}

export function editorialAskReply(question) {
  const query = typeof question === 'string' ? question.trim() : '';
  if (!query || query.length > ASK_EDITORIAL_MAX_LENGTH) return null;
  const normalized = normalize(query);
  const key = INTENTS.get(normalized);
  if (key) {
    const fact = FACTS[key];
    return { kind: 'fact', text: fact.text, links: [
      { href: fact.guide, label: 'Peninsula Insider guide: ' + fact.name },
      { href: fact.parks, label: 'Parks Victoria: trip information' },
    ] };
  }
  const search = { href: '/search/?' + new URLSearchParams({ q: query }), label: 'Search Peninsula Insider instead' };
  if (STATUS.test(normalized)) {
    const official = officialFor(normalized);
    return {
      kind: 'status',
      text: 'I don’t verify live conditions, cancellations or access needs. Check official information before you go, or search the site for more context.',
      links: official ? [{ href: official, label: 'Check Parks Victoria' }, search] : [search],
    };
  }
  return {
    kind: 'search',
    text: 'I only have editorial answers for Cape Schanck Boardwalk, Bushrangers Bay Walk and Coppins Track. Search can help with the rest.',
    links: [search],
  };
}
