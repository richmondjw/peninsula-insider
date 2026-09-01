import { createHash } from 'node:crypto';
import type { FoundryRun } from '../shared/contracts.js';
import { ClaimSchema, FoundryRunSchema, QuickNoteSchema, type Claim } from '../shared/contracts.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export const FIXTURE_ID = 'red-hill-winter-lunch';

export function evaluateQuickNoteGates(
  payload: { headline: string; dek?: string; body: string },
  claims: Claim[],
  claimIds: string[],
) {
  const publicCopy = `${payload.headline} ${payload.dek ?? ''} ${payload.body}`;
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const supportedClaimsPassed = claimIds.length > 0 && claimIds.every((claimId) => {
    const claim = claimsById.get(claimId);
    return Boolean(
      claim
      && !claim.restrictedFromArtifacts
      && ['supported', 'approved'].includes(claim.verification)
      && claim.evidence.length > 0,
    );
  });
  return [
    { gate: 'no_price', passed: !/(?:\$\s?\d|\bAUD\b|\bprice(?:d|s)?\b)/i.test(publicCopy), detail: 'Public copy must not contain pricing.' },
    { gate: 'no_em_dash', passed: !/—/.test(publicCopy), detail: 'Public copy must not contain em dashes; en dashes remain valid for ranges.' },
    { gate: 'supported_claims_only', passed: supportedClaimsPassed, detail: supportedClaimsPassed ? 'Every selected claim is supported, evidenced and unrestricted.' : 'A selected claim is missing, unsupported, unevidenced or restricted.' },
  ];
}

export function runFixture(actor: string, idempotencyKey: string): FoundryRun {
  const capturedAt = '2026-08-21T05:00:00.000Z';
  const sourceUrl = 'https://example.test/red-hill-winter-lunch';
  const sourceId = 'source-url-red-hill';
  const locationClaim = 'The venue is in Red Hill.';
  const dateClaim = 'The winter lunch is available on Saturday 29 August.';
  const observation = 'The covered dining room suits a wet-weather lunch.';
  const unsupported = 'This is the Peninsula\'s best lunch.';
  const restrictedPrice = 'The set menu is $95.';

  const evidence = (excerpt: string, locator: string) => [{
    sourceItemId: sourceId,
    locatorType: 'paragraph' as const,
    locator,
    excerpt,
    excerptHash: hash(excerpt),
    capturedAt,
  }];

  const body = 'A covered dining room makes this Red Hill lunch a useful wet-weather option. The winter lunch is listed for Saturday 29 August, with booking required.';
  const claims = ClaimSchema.array().parse([
    { id: 'claim-location', text: locationClaim, origin: 'external_fact', verification: 'supported', evidence: evidence(locationClaim, 'p:1'), restrictedFromArtifacts: false },
    { id: 'claim-date', text: dateClaim, origin: 'external_fact', verification: 'supported', evidence: evidence(dateClaim, 'p:2'), restrictedFromArtifacts: false },
    { id: 'claim-observation', text: observation, origin: 'first_party_observation', verification: 'approved', evidence: evidence(observation, 'note:1'), restrictedFromArtifacts: false },
    { id: 'claim-unsupported', text: unsupported, origin: 'inference', verification: 'unsupported', evidence: [], restrictedFromArtifacts: true, restrictionReason: 'No independent evidence supports the superlative.' },
    { id: 'claim-price', text: restrictedPrice, origin: 'external_fact', verification: 'supported', evidence: evidence(restrictedPrice, 'p:3'), restrictedFromArtifacts: true, restrictionReason: 'PI outputs do not publish prices.' },
  ]);
  const artifactClaimIds = ['claim-location', 'claim-date', 'claim-observation'];
  const payload = QuickNoteSchema.parse({
    headline: 'A wet-weather lunch option in Red Hill',
    dek: 'A covered dining room and a confirmed Saturday service make this one to keep for a rainy Peninsula day.',
    section: 'eat',
    tag: 'event',
    publishedAt: '2026-08-21T05:00:00.000Z',
    expiresAt: '2026-08-30T00:00:00.000Z',
    verifiedAt: capturedAt,
    verifiedBy: actor,
    sources: [{ kind: 'venue-site', url: sourceUrl, checkedAt: capturedAt }],
    status: 'draft',
    body,
  });

  const gateResults = evaluateQuickNoteGates(payload, claims, artifactClaimIds);

  return FoundryRunSchema.parse({
    id: `run-${hash(idempotencyKey).slice(0, 12)}`,
    idempotencyKey,
    version: 1,
    status: 'ready_for_review',
    createdAt: capturedAt,
    updatedAt: capturedAt,
    bundle: {
      schemaVersion: 'pi.intake-bundle.v1',
      id: `bundle-${FIXTURE_ID}`,
      title: 'Red Hill winter lunch fixture',
      submittedBy: actor,
      capturedAt,
      sourceItems: [{ id: sourceId, kind: 'url', uri: sourceUrl, contentHash: hash([locationClaim, dateClaim, observation, unsupported, restrictedPrice].join('\n')), capturedAt }],
    },
    claims,
    angle: {
      id: 'angle-rainy-lunch',
      label: 'Rainy-day lunch',
      framing: 'A practical, locally grounded wet-weather lunch option.',
      evidenceClaimIds: ['claim-location', 'claim-date', 'claim-observation'],
      selectedBy: 'fixture-policy',
    },
    artifact: {
      id: 'artifact-quick-note-red-hill',
      version: 1,
      type: 'quick_note',
      claimIds: artifactClaimIds,
      angleId: 'angle-rainy-lunch',
      payload,
      gateResults,
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: 'Deterministic fixture reached review without external calls.' }],
  });
}

export function buildPatch(run: FoundryRun): string {
  if (run.status !== 'accepted') throw new Error('Artifact must be accepted before patch export');
  const note = run.artifact.payload;
  const publicCopy = `${note.headline} ${note.dek ?? ''} ${note.body}`;
  if (run.blockers.length > 0 || run.artifact.gateResults.some((gate) => !gate.passed)) throw new Error('Artifact has unresolved gates');
  if (note.tag === 'pricing' || /(?:\$\s?\d|\bAUD\b|\bprice(?:d|s)?\b)/i.test(publicCopy)) throw new Error('PI outputs cannot contain pricing');
  if (/—/.test(publicCopy)) throw new Error('PI outputs cannot contain em dashes');
  const slug = '2026-08-21-red-hill-wet-weather-lunch.md';
  const content = [
    '---',
    `headline: ${JSON.stringify(note.headline)}`,
    `dek: ${JSON.stringify(note.dek ?? '')}`,
    `section: ${note.section}`,
    `tag: ${note.tag}`,
    `publishedAt: ${note.publishedAt}`,
    `expiresAt: ${note.expiresAt}`,
    ...(note.verifiedAt ? [`verifiedAt: ${note.verifiedAt}`] : []),
    ...(note.verifiedBy ? [`verifiedBy: ${JSON.stringify(note.verifiedBy)}`] : []),
    'sources:',
    ...note.sources.flatMap((source) => [
      `  - kind: ${source.kind}`,
      ...(source.url ? [`    url: ${source.url}`] : []),
      ...(source.checkedAt ? [`    checkedAt: ${source.checkedAt}`] : []),
    ]),
    'status: draft',
    '---',
    '',
    ...note.body.split(/\r?\n/),
  ];
  return [
    `diff --git a/next/src/content/quick-notes/${slug} b/next/src/content/quick-notes/${slug}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/next/src/content/quick-notes/${slug}`,
    `@@ -0,0 +1,${content.length} @@`,
    ...content.map((line) => `+${line}`),
    '',
  ].join('\n');
}
