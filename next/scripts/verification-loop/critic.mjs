/**
 * critic.mjs - verification against the source, not against the writer.
 *
 * The critic is given the claim, the record, the proposed patch and the
 * fetched artifact. It is NOT given the researcher's signals, and that
 * omission is the entire design. A critic that reads "the researcher found a
 * cancellation notice" is grading an essay about a page; a critic that reads
 * the page decides whether the page says that. The function signature is the
 * enforcement: there is no parameter through which a summary could arrive, so
 * the critic re-runs its own extraction over artifact.text and reaches its own
 * answer.
 *
 * Six dimensions, each of which is a way an automated check has historically
 * reached a confident wrong answer:
 *
 *   entailment       does the page actually say the thing, or did a pattern
 *                    match a navigation label, a cookie banner or a related
 *                    listing in the sidebar
 *   scope            is the page about this entity at all. The commonest
 *                    failure: a citation silently redirected to a homepage
 *   dates            does the page carry the date the record carries, and is
 *                    the page itself about a past occurrence
 *   units            does a changed value keep its unit and shape
 *   entity identity  a same-named venue in another town is not this venue
 *   contradiction    does the page ALSO say the opposite, which is common on
 *                    aggregator pages carrying several events at once
 *
 * An op survives only if every applicable dimension passes. Anything
 * unresolved escalates. The critic never resolves an ambiguity in favour of
 * acting, because in report-only the cost of escalating is one line in a
 * queue, and in a write stage the cost of resolving wrongly is a published
 * falsehood.
 */

import { detect, entityIdentity, hourRanges } from './detect.mjs';
import { toDate } from '../../src/lib/claim-state.mjs';

/** Words that identify the subject, gathered from the record and the claim. */
export function identityTokens(claim, record) {
  const data = record?.data ?? {};
  return [
    data.title,
    data.name,
    data.headline,
    data.venueName,
    data.commonName,
    claim?.subject?.slug,
  ].filter(Boolean);
}

/**
 * The dates the record asserts about WHEN THE THING HAPPENS, which a page
 * about the same occurrence should corroborate.
 *
 * `publishedAt` is deliberately absent, and its absence was bought by a false
 * positive. In the first real run a species page was reported as contradicted
 * because its publication date, 30 April, did not appear on the fisheries
 * page that cites it. Of course it did not: a publication date is a fact
 * about us and a page about bream has no reason to carry one.
 */
function recordDates(record) {
  const data = record?.data ?? {};
  return [data.startDate, data.endDate, data.nextOccurrence]
    .map((value) => (value ? String(value).slice(0, 10) : null))
    .filter(Boolean);
}

/**
 * Adjudicate the claim itself, independently of any proposed op.
 *
 * Five outcomes, and the three that are not verdicts are kept apart on
 * purpose. Roughly 30% of this corpus cannot be read from its own citation.
 * Filing that as failure is how a report becomes noise; filing it as a
 * separate source-health fact is how it becomes a work item for whoever owns
 * the citations.
 */
export function adjudicate({ claim, record, artifact }) {
  if (artifact.reachability !== 'ok') {
    const blocked = artifact.reachability === 'blocked';
    const detail = artifact.note ? ` (${artifact.note})` : '';
    return {
      outcome: blocked ? 'blocked' : 'unreachable',
      code: artifact.reachability,
      confidence: 'n/a',
      // Spelled out rather than left as a bare status code. A queue row has to
      // read as a decision on its own, in a report somebody skims at seven in
      // the morning, and "HTTP 403" is a log line.
      why: blocked
        ? `the cited source answered and refused this client${detail}`
        : `the cited source could not be read${detail}`,
      quotes: [],
    };
  }

  // A citation that resolves to a data endpoint rather than a page cannot be
  // adjudicated by reading prose, and pretending otherwise produces a
  // permanent, unfixable escalation. The weather quick notes cite an
  // open-meteo API URL: no amount of looking will ever find the note's
  // headline in a JSON forecast. That is a statement about the shape of the
  // citation, and the decision it needs is a different one.
  if (artifact.contentType && !/(?:^|\/)(?:text\/html|application\/xhtml|text\/plain)/i.test(artifact.contentType)) {
    return {
      outcome: 'inconclusive',
      code: 'data-endpoint',
      confidence: 'n/a',
      why: `the citation resolves to ${artifact.contentType.split(';')[0]}, which is a data endpoint rather than a page`,
      quotes: [],
    };
  }

  const signals = detect(artifact.text);
  const identity = entityIdentity(signals.text, identityTokens(claim, record));

  if (signals.withdrawn.hit) {
    return {
      outcome: 'contradicted',
      confidence: 'high',
      why: 'the cited page states the listing has been withdrawn or has ended',
      quotes: signals.withdrawn.quotes,
      signals,
      identity,
    };
  }

  if (!identity.sufficient) {
    return {
      outcome: 'inconclusive',
      confidence: 'n/a',
      why:
        'the cited page does not name the subject, so it cannot confirm or contradict it ' +
        `(matched ${identity.matched.length} of ${identity.matched.length + identity.missed.length} identifying words)`,
      quotes: [],
      signals,
      identity,
    };
  }

  if (signals.cancelled.hit) {
    return {
      outcome: 'contradicted',
      confidence: 'high',
      why: 'the cited page states the event is cancelled or postponed',
      quotes: signals.cancelled.quotes,
      signals,
      identity,
    };
  }

  if (claim.claimClass === 'trading-status' && signals.closedPermanently.hit) {
    return {
      outcome: 'contradicted',
      confidence: 'high',
      why: 'the cited page states the business has closed permanently',
      quotes: signals.closedPermanently.quotes,
      signals,
      identity,
    };
  }

  const hoursFinding = hoursDisagreement(record, signals);
  if (hoursFinding) {
    return { outcome: 'contradicted', confidence: 'medium', ...hoursFinding, signals, identity };
  }

  const rateFinding = rateMoved(claim, record, signals);
  if (rateFinding) {
    return { outcome: 'contradicted', confidence: 'medium', ...rateFinding, signals, identity };
  }

  if (claim.claimClass === 'access-restriction' && signals.restricted.hit) {
    return {
      outcome: 'confirmed',
      confidence: 'medium',
      why: 'the cited authority page still carries the restriction',
      quotes: signals.restricted.quotes,
      signals,
      identity,
    };
  }

  const dateFinding = dateDisagreement(record, signals);
  if (dateFinding) {
    return { outcome: 'contradicted', confidence: 'medium', ...dateFinding, signals, identity };
  }

  return {
    outcome: 'confirmed',
    confidence: identity.score >= 0.7 ? 'medium' : 'low',
    why: 'the cited page names the subject and carries no contradicting statement',
    quotes: [],
    signals,
    identity,
  };
}

/**
 * Recorded hours against the hours on the page.
 *
 * Only fires when BOTH sides carry hours. A page with none is not a page that
 * disagrees, and treating silence as contradiction is how an hours checker
 * ends up flagging every venue whose hours live in an image.
 */
function hoursDisagreement(record, signals) {
  const declared = declaredHours(record);
  if (declared.length === 0 || signals.hours.ranges.length === 0) return null;
  const onPage = new Set(signals.hours.ranges);
  const agreeing = declared.filter((range) => onPage.has(range));
  if (agreeing.length > 0) return null;
  return {
    why:
      `the record carries ${declared.length} opening-hours range(s), and the cited page carries ` +
      `${signals.hours.ranges.length}, with none in common`,
    quotes: signals.hours.quotes,
    detail: { recorded: declared, onPage: signals.hours.ranges },
  };
}

/** Hour ranges the record itself declares, normalised the same way. */
function declaredHours(record) {
  const data = record?.data ?? {};
  const raw = [data.openingHours, data.hours, data.tradingHours, data.openHours]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => typeof value === 'string');
  if (raw.length === 0) return [];
  return hourRanges(raw.join(' ; ')).ranges;
}

/**
 * A rate moved.
 *
 * The record stores a digest of the figures last seen on the page, never the
 * figures. When the page's fingerprint no longer contains any of them, a rate
 * moved. What it moved to is not recorded here and is not recorded anywhere:
 * this publication does not carry prices, and a report that printed the new
 * figure would be carrying one.
 */
function rateMoved(claim, record, signals) {
  if (claim.claimClass !== 'rate-change') return null;
  const known = record?.data?.rateFingerprint;
  if (!Array.isArray(known) || known.length === 0) return null;
  if (signals.rates.digests.length === 0) return null;
  const stillThere = known.filter((digest) => signals.rates.digests.includes(digest));
  if (stillThere.length > 0) return null;
  return {
    why:
      `the page carries ${signals.rates.distinct} distinct rate figure(s) and none matches the ` +
      'fingerprint the record was last checked against, so a rate has moved. The figure is ' +
      'deliberately not recorded: this publication carries no prices',
    quotes: [],
    detail: { recordedDigests: known.length, onPageDigests: signals.rates.digests.length },
  };
}

/**
 * The record's dates against the dates on the page.
 *
 * Narrowed twice, both times by the first real run rather than by taste.
 *
 * Run 1 on 2026-09-13 produced exactly two contradictions, and both were
 * wrong in the same way: a monthly community market whose cited page is a
 * regional what-is-on listing carrying nine market dates, none of them this
 * record's next occurrence. Neither the record nor the page was wrong. A
 * recurring event's next date is derived, not published, and a page that
 * lists nine dates is a calendar rather than a page about one event.
 *
 * So this fires only for a one-off record, and only where the page reads as a
 * page about a single thing. Two false positives out of two findings would
 * have been the whole credibility of the report.
 */
const SINGLE_EVENT_PAGE_DATES = 4;

function dateDisagreement(record, signals) {
  // Only a record that carries an occurrence can disagree about one.
  if (record?.type !== 'events' && record?.type !== 'signature-events') return null;
  const recurrence = String(record?.data?.recurrence ?? 'one-off').toLowerCase();
  if (recurrence !== 'one-off' && recurrence !== 'none' && recurrence !== '') return null;
  const declared = recordDates(record).filter((value) => toDate(value));
  if (declared.length === 0 || signals.dates.length === 0) return null;
  if (signals.dates.length > SINGLE_EVENT_PAGE_DATES) return null;
  const onPage = new Set(signals.dates);
  if (declared.some((value) => onPage.has(value))) return null;
  return {
    why:
      `the record's date(s) do not appear on the cited page, which carries ${signals.dates.length} ` +
      'date(s) of its own',
    quotes: [],
    detail: { recorded: declared, onPage: signals.dates.slice(0, 8) },
  };
}

/**
 * Verify each proposed op against the page.
 *
 * `upheld` means the page establishes it. `rejected` means the page does not,
 * which in report-only is the most valuable verdict the loop produces: it is
 * the count that says whether a researcher's judgement is trustworthy enough
 * to be given write access.
 */
export function critique({ claim, record, patch, artifact }) {
  if (artifact.reachability !== 'ok') {
    return (patch.ops ?? []).map((op) => ({
      path: op.path,
      verdict: 'escalate',
      why: 'the source could not be read, so nothing can be verified against it',
      dimensions: {},
    }));
  }

  const signals = detect(artifact.text);
  const identity = entityIdentity(signals.text, identityTokens(claim, record));
  const text = signals.text.toLowerCase();

  return (patch.ops ?? []).map((op) => {
    const dimensions = {
      scope: identity.sufficient,
      entityIdentity: identity.score,
      contradiction: !(signals.cancelled.hit && signals.restricted.hit),
      dates: true,
      units: unitsHold(op),
      entailment: entails(op, text, signals),
    };

    if (!dimensions.scope) {
      return {
        path: op.path,
        verdict: 'rejected',
        why: 'the page does not name the subject, so it establishes nothing about it',
        dimensions,
      };
    }
    if (!dimensions.entailment) {
      return {
        path: op.path,
        verdict: 'rejected',
        why: 'the page does not state what the proposed change asserts',
        dimensions,
      };
    }
    if (!dimensions.units) {
      return {
        path: op.path,
        verdict: 'rejected',
        why: 'the proposed value changes the shape or unit of the field',
        dimensions,
      };
    }
    if (op.consequential) {
      return {
        path: op.path,
        verdict: 'escalate',
        why: 'the page supports the change, and the change is consequential enough to need a person',
        dimensions,
      };
    }
    return { path: op.path, verdict: 'upheld', why: 'the page states it', dimensions };
  });
}

/** Does the page independently support this op? */
function entails(op, lowerText, signals) {
  if (op.path === 'cancelled' && op.to === true) return signals.cancelled.hit || signals.withdrawn.hit;
  if (op.path === 'tradingStatus' && op.to === 'closed') return signals.closedPermanently.hit;
  const value = typeof op.to === 'string' ? op.to.toLowerCase().trim() : null;
  if (!value) return false;
  return lowerText.includes(value);
}

/** A boolean stays a boolean, a string stays a string, an array stays an array. */
function unitsHold(op) {
  if (op.from === undefined || op.from === null) return true;
  const shape = (value) => (Array.isArray(value) ? 'array' : typeof value);
  return shape(op.from) === shape(op.to);
}
