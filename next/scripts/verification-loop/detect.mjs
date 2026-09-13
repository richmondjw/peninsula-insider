/**
 * detect.mjs - the deterministic signal extractors.
 *
 * These read a fetched page and pull out the handful of things a claim can be
 * contradicted by. They are deliberately dull. Nothing here decides anything:
 * a detector reports what it found and where it found it, and the adjudication
 * happens in critic.mjs against the same text, independently.
 *
 * Two properties matter more than coverage.
 *
 * FIRST, EVERY HIT CARRIES ITS QUOTE. A finding a human cannot check in one
 * glance is a finding they will either rubber-stamp or ignore, and both are
 * worse than no finding. So each detector returns the matched span, bounded,
 * and the report prints it.
 *
 * SECOND, NO FIGURE EVER LEAVES THIS FILE. This publication carries no prices,
 * ever, and `npm run lint:no-pricing` blocks the build over a dollar figure in
 * content. A rate-change detector that printed the new rate into a committed
 * report would be smuggling one in through the back. So the rate detector
 * answers whether a rate moved, and refuses to say what to. That is the
 * correct amount of information anyway: a human has to open the page to act on
 * it, and this publication would not print the number if they did.
 */

import { createHash } from 'node:crypto';

/** Strip tags, scripts and entities down to readable text. */
export function textOf(html) {
  return String(html ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * House style, applied at the boundary rather than downstream.
 *
 * Every quote in this file comes from somebody else's web page, and other
 * people's pages carry em-dashes and dollar figures. Both are hard BRAND-PI
 * rules, and a quote is still a committed string in a committed report. So the
 * redaction happens here, where quotes are cut, and not in the report writer:
 * that way no figure and no em-dash ever leaves this module, which is what the
 * header claims and what the deterministic gate re-checks.
 */
export function redact(quote) {
  return String(quote ?? '')
    .replace(/(?:\$|AUD\s?|A\$)\s?\d[\d,]*(?:\.\d{2})?/g, '[figure redacted]')
    .replace(/\u2014/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

const span = (match, text, width = 160) => {
  const start = Math.max(0, match.index - Math.floor(width / 3));
  return redact(text.slice(start, start + width));
};

function hits(pattern, text, limit = 3) {
  const out = [];
  const rx = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let match;
  while ((match = rx.exec(text)) && out.length < limit) {
    out.push(span(match, text));
    if (match.index === rx.lastIndex) rx.lastIndex += 1;
  }
  return out;
}

/**
 * Cancellation and postponement. The core of this pattern is lifted from
 * scripts/check-event-source-freshness.py, which has been running it against
 * live organiser pages since August; the additions are the withdrawal verbs
 * that script does not carry.
 */
const CANCELLED = /\b(?:event|festival|market|session|programme?|show|concert|screening|tour|race|regatta)\b[\s\S]{0,80}?\b(?:is\s+)?(?:cancelled|canceled|postponed|called\s+off|will\s+not\s+(?:go\s+ahead|proceed|be\s+held)|no\s+longer\s+(?:going\s+ahead|available|running))\b/i;
const CANCELLED_LEAD = /\b(?:cancelled|canceled|postponed|called\s+off)\b[\s\S]{0,60}?\b(?:event|festival|market|session|programme?|show|concert|screening|for\s+\d{4})\b/i;

/** A page that is still 200 but no longer carries the thing it cited. */
const WITHDRAWN = /\b(?:this\s+(?:event|page|listing|product)\s+(?:is\s+)?(?:no\s+longer\s+available|has\s+ended|has\s+been\s+removed)|tickets?\s+are\s+no\s+longer\s+available|sales\s+have\s+ended|event\s+has\s+(?:passed|ended|finished)|page\s+not\s+found|sorry,?\s+(?:this|that)\s+page)\b/i;

/** Permanent closure of a business, as distinct from an event being pulled. */
const CLOSED_PERMANENTLY = /\b(?:permanently\s+closed|closed\s+permanently|has\s+(?:now\s+)?closed\s+(?:its\s+doors|permanently)|ceased\s+trading|no\s+longer\s+trading|under\s+new\s+ownership\s+and\s+closed)\b/i;

/** Access restriction language on an authority page. */
const RESTRICTED = /\b(?:track|trail|beach|boat\s+ramp|car\s?park|road|reserve|jetty|pier|area)\b[\s\S]{0,60}?\b(?:closed|closure|restricted|out\s+of\s+bounds|do\s+not\s+enter|no\s+access)\b/i;

/**
 * Opening hours. Matches "9am to 5pm", "9:00-17:00", "10.30am till late".
 * Normalised to 24-hour ranges so a record saying "9am-5pm" and a page saying
 * "09:00 - 17:00" are the same fact.
 */
const HOUR_RANGE =
  /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|to|till|until|\u2013)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/gi;

function to24(hour, minute, meridiem) {
  let h = Number(hour);
  if (meridiem) {
    const m = meridiem.toLowerCase();
    if (m === 'pm' && h < 12) h += 12;
    if (m === 'am' && h === 12) h = 0;
  }
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(minute ?? '00').padStart(2, '0')}`;
}

export function hourRanges(text) {
  const out = new Set();
  const quotes = [];
  const rx = new RegExp(HOUR_RANGE.source, HOUR_RANGE.flags);
  let match;
  while ((match = rx.exec(text))) {
    const trailing = match[6] ?? match[3];
    const from = to24(match[1], match[2], match[3] ?? (trailing && Number(match[1]) < 12 ? 'am' : null));
    const to = to24(match[4], match[5], trailing);
    if (!from || !to) continue;
    out.add(`${from}-${to}`);
    if (quotes.length < 3) quotes.push(span(match, text));
  }
  return { ranges: [...out].sort(), quotes };
}

/**
 * Rate tokens, counted and digested, never printed.
 *
 * The digest is of the normalised figure, so two runs can tell whether the
 * same rate is still on the page without either run ever recording what it is.
 */
const MONEY = /(?:\$|AUD\s?|A\$)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

export function rateFingerprint(text) {
  const values = [];
  const rx = new RegExp(MONEY.source, MONEY.flags);
  let match;
  while ((match = rx.exec(text))) {
    values.push(String(Number(match[1].replace(/,/g, ''))));
  }
  const unique = [...new Set(values)].sort();
  return {
    count: values.length,
    distinct: unique.length,
    // A digest per distinct figure. Set comparison across two fingerprints
    // tells you a rate moved; nothing in here tells you to what.
    digests: unique.map((value) => createHash('sha256').update(value).digest('hex').slice(0, 12)),
  };
}

/** ISO and common Australian date forms, normalised to ISO days. */
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function datesOn(text) {
  const out = new Set();
  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    out.add(`${match[1]}-${match[2]}-${match[3]}`);
  }
  for (const match of text.matchAll(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/g
  )) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
    if (!month) continue;
    out.add(`${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`);
  }
  for (const match of text.matchAll(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g
  )) {
    const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
    if (!month) continue;
    out.add(`${match[3]}-${String(month).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`);
  }
  return [...out].sort();
}

/**
 * Is the page even about this entity?
 *
 * The single most common way an automated check reaches a confident wrong
 * answer: a citation that has been redirected to a homepage, a category page
 * or a "we have moved" shell. If the entity's own name is not on the page, no
 * verdict stronger than "inconclusive" is available, whatever else the page
 * says.
 */
export function entityIdentity(text, tokens) {
  const haystack = text.toLowerCase();
  const wanted = tokens
    .flatMap((token) => String(token ?? '').split(/[^a-z0-9]+/i))
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 4 && !STOP.has(word));
  if (wanted.length === 0) return { matched: [], missed: [], score: 0, sufficient: false };
  const unique = [...new Set(wanted)];
  const matched = unique.filter((word) => haystack.includes(word));
  const score = matched.length / unique.length;
  return {
    matched,
    missed: unique.filter((word) => !matched.includes(word)),
    score: Number(score.toFixed(3)),
    // One distinctive word is weak; a third of a multi-word name is the line
    // at which the page is plausibly about the thing.
    sufficient: matched.length > 0 && score >= 0.34,
  };
}

const STOP = new Set([
  'the', 'and', 'with', 'live', 'from', 'that', 'this', 'peninsula', 'mornington',
  'victoria', 'event', 'events', 'note', 'editor', 'sessions', 'session', 'weekend',
  '2026', '2025', '2024',
]);

/**
 * Run every detector over one artifact. Pure, and it never sees the claim's
 * own summary of the source, only the source.
 */
export function detect(artifactText) {
  const text = textOf(artifactText);
  const hours = hourRanges(text);
  return {
    text,
    length: text.length,
    cancelled: {
      hit: CANCELLED.test(text) || CANCELLED_LEAD.test(text),
      quotes: [...hits(CANCELLED, text), ...hits(CANCELLED_LEAD, text)].slice(0, 3),
    },
    withdrawn: { hit: WITHDRAWN.test(text), quotes: hits(WITHDRAWN, text) },
    closedPermanently: { hit: CLOSED_PERMANENTLY.test(text), quotes: hits(CLOSED_PERMANENTLY, text) },
    restricted: { hit: RESTRICTED.test(text), quotes: hits(RESTRICTED, text) },
    hours,
    rates: rateFingerprint(text),
    dates: datesOn(text),
  };
}
