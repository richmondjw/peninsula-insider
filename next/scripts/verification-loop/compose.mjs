/**
 * compose.mjs - the constrained patch composer, and the fabrication guard.
 *
 * THE SHAPE OF THE LOOP
 * --------------------
 * A researcher proposes. The composer constrains. A critic verifies against
 * the source. Deterministic checks gate. A human decides.
 *
 * In this stage the researcher is the deterministic detector set in
 * detect.mjs, because a model-backed researcher is a write-scope question and
 * that decision has not been taken. But the interface is the one a model-backed
 * researcher would use: `composePatch` takes DRAFTS, a list of field-level
 * changes somebody wants made, and returns the subset that survives the guard
 * plus a refusal for every one that did not. That is deliberate. The guard,
 * not the researcher, is the component a write stage has to trust, so the
 * guard is what this stage builds and what the fixtures attack.
 *
 * WHAT THE GUARD REFUSES, AND WHY EACH ONE IS ITS OWN RULE
 * -------------------------------------------------------
 * A VISIT, A REVIEW OR AN EXPERIENCE. The editorial method is research plus an
 * accountable view, not "an editor stood in every room", and
 * scripts/lint-firsthand-claims.mjs exists because that claim has come back
 * twice in this corpus. An automated loop that can write prose is one bad
 * generation away from a third recurrence, and this time it would arrive at
 * volume. The vocabulary here is the same vocabulary that lint carries, so the
 * two cannot drift into disagreeing about what a first-hand claim is.
 *
 * A CHECK DATE. This is the rule PI-006 names explicitly and it is the least
 * intuitive one, so it gets the longest comment. A successful fetch is
 * evidence that a page responded. It is not evidence that anybody read the
 * page and agreed with it. The moment a 200 is allowed to bump a verification
 * date, every record in the corpus acquires a fresh-looking date backed by
 * nothing, and the field stops meaning what its name says. The existing
 * safeguard audit found the same rot arriving the slow way: 88 of 138 venues
 * carrying one identical bulk lastVerified stamp. Automating the stamp is that
 * failure with a cron behind it. So no op may target a date field, and a
 * confirmed fetch produces a PROPOSED evidence row for a human to accept,
 * never a recorded one.
 *
 * A LICENCE, A PERMISSION OR A DEPICTION. Media rights are the same class of
 * error: a credit is display text and establishes nothing, and
 * scripts/audit-media-provenance.mjs exists because dozens of records credited
 * this publication for photographs it did not license. A loop cannot discover
 * a licence by reading a page, so it may never write one.
 *
 * A FIGURE. No prices, ever. The composer refuses any value carrying a
 * currency figure, so a rate finding can escalate without a number riding
 * along into a committed report.
 */

/**
 * Field paths no composed op may target, matched on the last segment so
 * `images[0].permission` and `permission` are the same rule.
 *
 * Date fields first: these are the check dates. Every one of them is a record
 * of a human act, and nothing automated may assert one.
 */
export const FORBIDDEN_FIELDS = Object.freeze([
  'lastCheckedDate',
  'lastVerified',
  'lastReviewed',
  'verifiedAt',
  'verifiedBy',
  'checkedAt',
  'retrievedAt',
  'discoveredAt',
  'reviewedAt',
  'provenanceReview',
  // Rights. A loop cannot read a licence off a page.
  'license',
  'licence',
  'permission',
  'permittedUses',
  'creator',
  'credit',
  'depictionStatus',
  'depicts',
  // Editorial voice. A machine does not get a byline or a verdict.
  'verdict',
  'author',
  'byline',
  'rating',
  'review',
]);

const FORBIDDEN_SET = new Set(FORBIDDEN_FIELDS.map((field) => field.toLowerCase()));

/** Last segment of a field path: `images[0].permission` -> `permission`. */
export function leafOf(fieldPath) {
  const tail = String(fieldPath ?? '').split('.').pop() ?? '';
  return tail.replace(/\[\d+\]$/, '').toLowerCase();
}

/**
 * First-person presence, review and experience claims.
 *
 * Mirrors the five rules in scripts/lint-firsthand-claims.mjs. That script is
 * the canonical statement of what this publication treats as an unsupported
 * method claim; these patterns cover the same ground for the narrower job of
 * inspecting a single proposed value rather than a whole corpus. If the lint
 * gains a rule, this list should gain it too.
 */
const FABRICATION_RULES = Object.freeze([
  {
    id: 'editorial-visit',
    why: 'asserts the publication was physically present',
    test: /\b(?:we|our\s+(?:editors?|team|writers?)|i)\s+(?:have\s+)?(?:visited|dropped\s+in|called\s+in|stayed|ate|eaten|dined|drank|sat|stood|walked\s+in|swam|tasted)\b/i,
  },
  {
    id: 'universal-visit',
    why: 'asserts every item on a list was physically visited',
    test: /\b(?:every|each|all)\s+\w*\s*(?:entry|venue|place|pick|listing|one)\b[^.!?]{0,40}\b(?:visited|inspected|tasted|eaten\s+at|checked\s+in\s+person)\b/i,
  },
  {
    id: 'method-claim',
    why: 'fixed first-hand method idiom',
    test: /\b(?:personally\s+(?:visited|checked|verified|tasted)|visited\s+every|boots\s+on\s+the\s+ground|drunk\s+at\s+the\s+source|no\s+entry\s+appears\s+here\s+without\s+a\s+visit)\b/i,
  },
  {
    id: 'firsthand',
    why: '"first-hand" used to describe how the recommendation was formed',
    test: /\bfirst[\s-]?hand\b[^.!?]{0,30}\b(?:research|visit|check|verif\w+|experience|account)\b|\b(?:research|visit|check|verif\w+)\w*\b[^.!?]{0,20}\bfirst[\s-]?hand\b/i,
  },
  {
    id: 'in-person',
    why: 'verification claimed to have happened in person',
    test: /\b(?:visit\w*|verif\w+|check\w*|inspect\w+|review\w*|tast\w+)\b[^.!?]{0,25}\bin\s+person\b/i,
  },
  {
    id: 'experience',
    why: 'narrates an experience the loop cannot have had',
    test: /\b(?:when\s+we\s+(?:were|went|arrived)|on\s+our\s+(?:visit|last\s+visit)|the\s+morning\s+we|we\s+found\s+the)\b/i,
  },
]);

/** Any currency figure at all. */
const FIGURE = /(?:\$|AUD\s?|A\$)\s?\d/;

/** ISO-ish date, used to catch a date smuggled into a non-date field. */
const DATE_VALUE = /^\s*\d{4}-\d{2}-\d{2}(?:[T\s]|$)/;

/**
 * Inspect one proposed op. Returns null when it is allowed, or a refusal.
 *
 * Order matters only for the message a human reads; an op failing two rules is
 * refused either way.
 */
export function refuse(op) {
  const leaf = leafOf(op?.path);
  const value = typeof op?.to === 'string' ? op.to : JSON.stringify(op?.to ?? null);

  if (FORBIDDEN_SET.has(leaf)) {
    const isDate = /date|verified|checked|retrieved|discovered|reviewed/i.test(leaf);
    return {
      rule: isDate ? 'no-check-date' : 'no-rights-or-voice',
      field: op.path,
      why: isDate
        ? 'a fetch proves a page responded, not that anybody read it and agreed; only a human may move a verification date'
        : 'rights, credit and editorial voice cannot be derived from reading a page',
    };
  }

  if (DATE_VALUE.test(value) && /date|since|from|until/i.test(leaf)) {
    return {
      rule: 'no-check-date',
      field: op.path,
      why: 'a date-shaped value on a date-shaped field is a check date under another name',
    };
  }

  for (const rule of FABRICATION_RULES) {
    if (rule.test.test(value)) {
      return { rule: 'no-fabricated-experience', field: op.path, why: rule.why, detector: rule.id };
    }
  }

  if (FIGURE.test(value)) {
    return {
      rule: 'no-figures',
      field: op.path,
      why: 'this publication carries no prices, so no composed value may contain one',
    };
  }

  if (!Array.isArray(op?.sources) || op.sources.length === 0) {
    return {
      rule: 'no-unsourced-change',
      field: op.path,
      why: 'every proposed change must name the fetched artifact it came from',
    };
  }

  return null;
}

/**
 * Run the drafts through the guard.
 *
 * Returns the surviving ops and every refusal. The refusals are not noise to
 * be swallowed: they are the evidence a write-scope decision is taken on, so
 * they are counted, reported and asserted in the tests.
 */
export function composePatch({ claim, drafts }) {
  const ops = [];
  const refusals = [];
  for (const draft of drafts ?? []) {
    const refusal = refuse(draft);
    if (refusal) {
      refusals.push({ claimId: claim?.claimId ?? null, ...refusal, proposed: summarise(draft) });
      continue;
    }
    ops.push({ ...draft, applied: false });
  }
  return { claimId: claim?.claimId ?? null, ops, refusals };
}

/**
 * A refusal has to say what was refused without reprinting the thing. A
 * fabricated first-person sentence quoted in full in a committed report is the
 * sentence, sitting in the repository, one copy-paste from publication.
 */
function summarise(draft) {
  const value = typeof draft?.to === 'string' ? draft.to : JSON.stringify(draft?.to ?? null);
  return {
    path: draft?.path ?? null,
    reason: draft?.reason ?? null,
    valueLength: value.length,
    valuePreview: value.slice(0, 60).replace(/\s+/g, ' '),
  };
}

/**
 * The deterministic researcher for this stage.
 *
 * Turns detector signals into draft ops. It proposes only changes a page can
 * actually establish: that an event was pulled, that a venue says it has
 * closed, that an access restriction is posted. Everything else it leaves
 * alone, and the things it deliberately does NOT propose are as much the
 * design as the things it does.
 */
export function draftFromSignals({ claim, record, signals, artifact }) {
  const cite = [{ url: artifact.url, digest: artifact.digest, fetchedAt: artifact.fetchedAt }];
  const drafts = [];
  const claimClass = claim.claimClass;

  if ((claimClass === 'event-status' || claimClass === 'event-schedule') && signals.cancelled.hit) {
    drafts.push({
      path: 'cancelled',
      from: record?.data?.cancelled ?? false,
      to: true,
      reason: 'the cited source states the event is cancelled or postponed',
      quotes: signals.cancelled.quotes,
      consequential: true,
      sources: cite,
    });
  }

  if (claimClass === 'trading-status' && signals.closedPermanently.hit) {
    drafts.push({
      path: 'tradingStatus',
      from: record?.data?.tradingStatus ?? null,
      to: 'closed',
      reason: 'the cited source states the business has closed permanently',
      quotes: signals.closedPermanently.quotes,
      consequential: true,
      sources: cite,
    });
  }

  // Opening hours, rates and access restrictions are detected but never
  // drafted as a change. A page can tell you the recorded hours disagree with
  // it; it cannot tell you which is right, because the page may be the stale
  // one. Those become escalations with a quote attached, which is the honest
  // output, and the reason the escalation path exists at all.
  return drafts;
}
