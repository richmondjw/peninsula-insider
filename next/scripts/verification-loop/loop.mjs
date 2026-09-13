/**
 * loop.mjs - the loop itself.
 *
 *   select   by consequence and expiry, bounded, deterministic
 *   research read the cited source, capture the artifact and its digest
 *   compose  turn signals into a field-level patch, through the guard
 *   critique verify each op against the source, independently
 *   check    deterministic post-conditions over the whole run
 *   escalate anything unresolved, conflicting or consequential
 *
 * In report-only the patch IS the output. Nothing applies it, and no code path
 * exists that could: the modules this file imports open no file for writing,
 * and report.mjs is the only writer in the directory, refusing any path
 * outside the reports tree. The value of the run is two things a write-scope
 * decision needs and cannot get any other way: a queue a person can work, and
 * a count of how often the loop's judgement was wrong when a person checked.
 *
 * WHY THE ESCALATION HAS A QUESTION AND A DEFAULT
 * ----------------------------------------------
 * Because a queue of notifications is a queue nobody works. Every escalation
 * here states the specific decision and what happens if nobody takes it, which
 * is the same contract the Asana board applies to anything that reaches a
 * human. A finding that cannot be phrased that way is a finding the loop has
 * not thought through, and the deterministic gate fails the run over it.
 */

import { detect } from './detect.mjs';
import { adjudicate, critique } from './critic.mjs';
import { composePatch, draftFromSignals } from './compose.mjs';
import { backlogProfile, scoreCorpus, selectWorklist, consequenceOf } from './select.mjs';
import { blindSpots } from './corpus.mjs';
import { mapWithConcurrency } from './fetch-source.mjs';
import { toIsoDay } from '../../src/lib/claim-state.mjs';

/** Every URL the corpus cites. Also the outbound allow-set. */
export function allCitedUrls(corpus) {
  const urls = new Set();
  for (const row of corpus.evidence) {
    if (typeof row.url === 'string' && /^https?:\/\//i.test(row.url) && !row.url.includes('|')) {
      urls.add(row.url);
    }
  }
  return urls;
}

/**
 * Which cited source to read for a claim.
 *
 * The most authoritative kind for the class wins, per
 * src/data/source-precedence.json. Reading the organiser before the ticketing
 * reseller is not a nicety: the reseller keeps a page up long after the
 * organiser has pulled the event, which is the exact failure the freshness
 * checker was written for.
 */
export function preferredSource(entry, precedence) {
  const order = precedence?.classes?.[entry.claim.claimClass]?.precedence ?? [];
  const rank = (kind) => {
    const at = order.indexOf(kind);
    return at === -1 ? order.length : at;
  };
  return [...entry.sources].sort(
    (a, b) => rank(a.publisher?.kind) - rank(b.publisher?.kind) || a.url.localeCompare(b.url)
  )[0];
}

/**
 * Images asserting something the record cannot support.
 *
 * Not part of the claim registry: nothing in the corpus files a claim about a
 * photograph. That absence is the point. A depiction or a permitted use is an
 * assertion about somebody else's rights, and scripts/audit-media-provenance.mjs
 * exists because dozens of records credited this publication for photographs it
 * did not license. The loop surfaces them and, critically, refuses to resolve
 * them: a licence cannot be discovered by reading a web page, so the composer
 * declines every draft that tries.
 */
export function mediaFindings(corpus) {
  const filled = (value) => typeof value === 'string' && value.trim().length > 0;
  const hasProvenance = (image) =>
    filled(image?.creator) || filled(image?.sourceUrl) || filled(image?.permission);
  const out = [];

  for (const record of corpus.records.values()) {
    for (const [field, image] of imagesOf(record.data)) {
      if (!image || typeof image !== 'object') continue;
      if (image.depictionStatus === 'actual' && !hasProvenance(image)) {
        out.push({
          record: `${record.type}/${record.slug}`,
          field,
          why: 'the record asserts the photograph shows this entity while recording no creator, source or permission',
          rule: 'actual-without-provenance',
        });
      }
      if (Array.isArray(image.permittedUses) && image.permittedUses.length > 0 && !filled(image.permission)) {
        out.push({
          record: `${record.type}/${record.slug}`,
          field,
          why: 'the record lists permitted channels with no recorded permission they could come from',
          rule: 'permitted-use-without-permission',
        });
      }
    }
  }
  return out;
}

/** Walk a record for anything image-shaped, returning [fieldPath, image]. */
function* imagesOf(node, prefix = '') {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const [index, child] of node.entries()) yield* imagesOf(child, `${prefix}[${index}]`);
    return;
  }
  if (typeof node.src === 'string' || typeof node.depictionStatus === 'string') {
    yield [prefix || 'image', node];
  }
  for (const [key, child] of Object.entries(node)) {
    if (child && typeof child === 'object') yield* imagesOf(child, prefix ? `${prefix}.${key}` : key);
  }
}

const QUESTIONS = {
  contradicted: 'The cited source disagrees with the record. Correct the record, or record why the source is wrong?',
  inconclusive: 'The cited source no longer identifies this subject. Repoint the citation, or retire the claim?',
  'inconclusive:data-endpoint':
    'The citation is a data endpoint, not a page, so no prose check can ever reach a verdict on it. Cite a readable page, or move this claim class to a checker that reads the feed?',
  unreachable: 'The cited source cannot be reached. Replace the citation, or retire the claim?',
  'unreachable:error':
    'The cited source failed after bounded retries, which may be transient. Leave it for the next run, or repoint the citation now?',
  blocked: 'The cited source refuses automated clients, so this claim can never be checked this way. Accept manual re-checks, or cite a readable source?',
  media: 'The record asserts a depiction or a permitted use with nothing recorded behind it. Record the permission, or withdraw the assertion?',
};

const DEFAULTS = {
  contradicted: 'no change is made and the claim stays unsupported',
  inconclusive: 'no change is made and the claim stays unsupported',
  unreachable: 'no change is made and the claim stays unsupported',
  blocked: 'no change is made and the claim stays unsupported',
  media: 'no change is made and the assertion stays on the record',
};

/**
 * Run the loop.
 *
 * `draftsForClaim` is the seam a model-backed researcher would arrive
 * through. Production passes none, so this stage's drafts come only from the
 * deterministic detectors. The fixtures pass one, because the component a
 * write stage has to trust is the guard, not the researcher, and a guard is
 * only tested by something trying to get past it.
 */
export async function runLoop({
  corpus,
  now,
  limit = 25,
  concurrency = 3,
  fetchSource,
  draftsForClaim = null,
  mode = 'report-only',
}) {
  const asAt = toIsoDay(now) ?? toIsoDay(new Date());
  const scored = scoreCorpus(corpus, now);
  const worklist = selectWorklist(scored, { limit });
  const allowedUrls = allCitedUrls(corpus);

  const items = await mapWithConcurrency(worklist, concurrency, async (entry) => {
    const source = preferredSource(entry, corpus.precedence);
    const artifact = await fetchSource(source.url);

    // The researcher reads the page. The critic reads it again, separately,
    // and never sees this.
    const signals = artifact.reachability === 'ok' ? detect(artifact.text) : null;
    const drafts = [
      ...(signals ? draftFromSignals({ claim: entry.claim, record: entry.record, signals, artifact }) : []),
      ...(draftsForClaim ? draftsForClaim(entry, artifact) : []),
    ];
    const patch = composePatch({ claim: entry.claim, drafts });
    const adjudication = adjudicate({ claim: entry.claim, record: entry.record, artifact });
    const verdicts = critique({ claim: entry.claim, record: entry.record, patch, artifact });

    // A confirmation does not record anything. It proposes a row for a person
    // to accept, and the date that row would carry is named as a consequence
    // of acceptance rather than written as a fact. The distinction is the
    // whole of the check-date rule: a fetch establishes that a page responded,
    // and only a person can establish that somebody read it and agreed.
    const proposedEvidence =
      adjudication.outcome === 'confirmed'
        ? [
            {
              claim: entry.claim.claimId,
              stance: 'supports',
              url: artifact.url,
              sourceDigest: artifact.digest,
              wouldCarryRetrievedAt: asAt,
              recorded: false,
              requiresHuman: true,
              note: 'proposed by the report-only verification loop; accepting it is a human act',
            },
          ]
        : [];

    return {
      claimId: entry.claim.claimId,
      claimClass: entry.claim.claimClass,
      consequence: entry.consequence,
      riskScore: entry.riskScore,
      state: entry.state,
      overdueDays: entry.overdueDays,
      ageBand: entry.ageBand,
      subject: `${entry.claim.subject.type}/${entry.claim.subject.slug}`,
      source: { url: source.url, publisher: source.publisher?.kind ?? 'unknown' },
      artifact: {
        url: artifact.url,
        finalUrl: artifact.finalUrl,
        status: artifact.status,
        reachability: artifact.reachability,
        digest: artifact.digest,
        bytes: artifact.bytes,
        attempts: artifact.attempts,
        note: artifact.note,
      },
      attempts: [{ url: artifact.url, reachability: artifact.reachability, status: artifact.status }],
      adjudication: {
        outcome: adjudication.outcome,
        confidence: adjudication.confidence,
        code: adjudication.code ?? null,
        why: adjudication.why,
        quotes: adjudication.quotes ?? [],
        detail: adjudication.detail ?? null,
        identityScore: adjudication.identity?.score ?? null,
      },
      patch: { ops: patch.ops, refusals: patch.refusals },
      verdicts,
      proposedEvidence,
    };
  });

  const escalations = [];
  for (const item of items) {
    const outcome = item.adjudication.outcome;
    if (outcome === 'confirmed') continue;
    escalations.push({
      kind: outcome,
      claimId: item.claimId,
      claimClass: item.claimClass,
      consequence: item.consequence,
      subject: item.subject,
      source: item.source.url,
      why: item.adjudication.why,
      quotes: item.adjudication.quotes,
      proposedOps: item.patch.ops.map((op) => ({ path: op.path, to: op.to, reason: op.reason })),
      question:
        QUESTIONS[`${outcome}:${item.adjudication.code ?? ''}`] ??
        QUESTIONS[outcome] ??
        QUESTIONS.contradicted,
      defaultIfNoAnswer: DEFAULTS[outcome] ?? DEFAULTS.contradicted,
    });
  }
  for (const finding of mediaFindings(corpus)) {
    escalations.push({
      kind: 'media',
      claimId: null,
      claimClass: 'media-rights',
      consequence: 'high',
      subject: finding.record,
      source: null,
      why: finding.why,
      quotes: [],
      proposedOps: [],
      question: QUESTIONS.media,
      defaultIfNoAnswer: DEFAULTS.media,
    });
  }

  const counts = (list, key) =>
    list.reduce((acc, item) => {
      const value = typeof key === 'function' ? key(item) : item[key];
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});

  return {
    ticket: 'PI-006',
    stage: 'report-only',
    mode,
    asAt,
    generator: 'next/scripts/run-verification-loop.mjs',
    writes: {
      contentRecords: 'none, by construction: no module in the loop opens a content file for writing',
      externalSystems: 'none: one HTTP GET per cited source URL and nothing else leaves the process',
    },
    registry: {
      claims: corpus.claims.length,
      evidence: corpus.evidence.length,
      byState: counts(scored, 'state'),
      byConsequence: counts(scored, (entry) => consequenceOf(entry.claim.claimClass)),
    },
    backlog: backlogProfile(scored),
    blindSpots: blindSpots(corpus),
    worklist: {
      limit,
      selected: worklist.length,
      eligible: scored.filter((entry) => entry.exposure === 1 && entry.researchable).length,
    },
    adjudication: counts(items, (item) => item.adjudication.outcome),
    sourceHealth: counts(items, (item) => item.artifact.reachability),
    refusals: items.flatMap((item) => item.patch.refusals),
    // Each proposed op carries the critic's verdict on it. A patch table
    // without that column reads as a list of recommendations, which is the
    // single most misleading thing this report could publish: the loop
    // proposed the venue rename AND the critic threw it out, and both halves
    // are the finding.
    proposedOps: items.flatMap((item) =>
      item.patch.ops.map((op) => ({
        claimId: item.claimId,
        verdict: item.verdicts.find((verdict) => verdict.path === op.path)?.verdict ?? 'unreviewed',
        ...op,
      }))
    ),
    verdictCounts: counts(items.flatMap((item) => item.verdicts), 'verdict'),
    escalations,
    items,
  };
}
