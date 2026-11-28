import { normalise, parseQuestion } from './ask-guide.mjs';

// Recognise the form of a conversation, independently of which city, idea or object it is about.
const OPENS_DISCUSSION = /^(?:tell me about|talk to me about|(?:can|could) we (?:talk|chat|discuss)|lets (?:talk|discuss)|explain|describe|imagine|suppose|what if|why|how (?:does|do|can|would|is)|what (?:does|do|makes|is|are|would|might|can)|whats|what about|can|could|does|is|are|would|do you (?:think|like|prefer|believe|know)|have you (?:heard|thought)|im (?:curious|wondering)|i wonder)\b/;
const LOCAL_OR_OPERATIONAL = /\b(?:peninsula|nearby|near me|around here|recommend|recommendation|booking|book|reserve|reservation|listing|partner desk|partner portal|opening|open now|tickets?|available|availability|prices?|forecast|weather|tides?|sources?|wheelchair|accessibility|allerg\w*|safe(?:ty)?|emergency|latest|current|today|tomorrow|weekend|itinerary|local guide|your (?:prompt|instructions)|vote for)\b/;
const LOCAL_REFERENCE = /\b(?:the (?:first|second|last|other) one|those|these|instead|quieter|somewhere else|something else|the (?:place|venue|plan|guide) you)\b/;
const LOCAL_REPLY = new Set(['none','help','results']);

export function isGeneralDiscussion(index, question, reply, previousKind) {
  if (!LOCAL_REPLY.has(reply.kind) || reply.mood) return false;
  const text = normalise(question);
  if (LOCAL_OR_OPERATIONAL.test(text)) return false;
  const parsed = parseQuestion(question, index);
  if (parsed.place || parsed.window || parsed.flags.live || parsed.flags.price || parsed.flags.dogs || parsed.flags.nearMe) return false;
  const explicitTopic = /^(?:(?:can|could) we (?:talk|chat|discuss)|lets (?:talk|discuss)|explain|imagine|suppose)\b/.test(text);
  if (parsed.kinds?.length && !explicitTopic) return false;
  if (index.records.some(record => {
    const title = normalise(record.t);
    return title.length > 2 && (' ' + text + ' ').includes(' ' + title + ' ');
  })) return false;
  if (previousKind && previousKind !== 'discussion' && (LOCAL_REFERENCE.test(text) || /^(?:is|was|does|can|could|would|how is) (?:it|that|this)\b/.test(text))) return false;
  return previousKind === 'discussion' || OPENS_DISCUSSION.test(text);
}
