import { createHash } from 'node:crypto';
import {
  ArticleDraftPayloadSchema,
  ArticleMetadataPayloadSchema,
  AskAnswerPayloadSchema,
  CaptureRevisionSummarySchema,
  ClaimSchema,
  ClaimSetVersionSchema,
  FoundryRunSchema,
  REAL_URL_ASK_PROVENANCE_TEMPLATE,
  QuickNoteSchema,
  SourceConfirmationSchema,
  StoryAngleSchema,
  type ArtifactDependency,
  type ArtifactVersion,
  type CaptureRevisionSummary,
  type Claim,
  type FoundryRun,
  type SourceConfirmationInput,
} from '../shared/contracts.js';
import type { CaptureRecord } from '../shared/capture-contracts.js';
import { containsEmDash, containsPriceLanguage } from '../shared/editorial-laws.js';
import { createEvidenceLocator } from './capture/extractor.js';
import { withRealUrlOriginAuthority } from './origin-authority.js';
import {
  URL_ARTICLE_RECIPE,
  evaluateArtifactGates,
  evaluateQuickNoteGates,
  hashValue,
  resolveArtifactPath,
  withArtifactHash,
} from './fixture-runner.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const PROMPT_PATTERN = /\b(?:ignore (?:all|any|the) previous instructions|system prompt|developer message|assistant:)\b/i;
const MAX_CLAIMS = 12;

function restrictionFor(text: string): string | undefined {
  if (containsPriceLanguage(text)) return 'PI outputs do not publish prices, cost, fee, charge or free wording.';
  if (containsEmDash(text)) return 'PI outputs do not publish em dashes.';
  if (PROMPT_PATTERN.test(text)) return 'Instruction-like source text remains inert and is held from artifacts.';
  return undefined;
}

export function summarizeCapture(record: CaptureRecord): CaptureRevisionSummary {
  const source = record.sourceRevision;
  const extraction = record.extractionRevision;
  const restrictedBlocks = extraction?.blocks.filter((block) => restrictionFor(block.text)).length ?? 0;
  return CaptureRevisionSummarySchema.parse({
    attemptId: record.attempt.id,
    requestFingerprint: record.attempt.requestFingerprint,
    requestedUrl: record.attempt.requestedUrl,
    state: record.attempt.state,
    createdAt: record.attempt.createdAt,
    completedAt: record.attempt.completedAt,
    events: record.attempt.events.map(({ state, at }) => ({ state, at })),
    redirects: record.attempt.redirects,
    outcomeReason: record.attempt.outcomeReason ? { code: record.attempt.outcomeReason.code } : undefined,
    failure: record.attempt.failure ? { stage: record.attempt.failure.stage, code: record.attempt.failure.code } : undefined,
    sourceRevision: source ? {
      id: source.id,
      canonicalUrl: source.canonicalUrl,
      capturedAt: source.capturedAt,
      status: source.status,
      mediaType: source.mediaType,
      charset: source.charset,
      contentEncoding: source.contentEncoding,
      redirects: source.redirects.map((redirect) => ({ url: redirect.url, status: redirect.status, location: redirect.location })),
      contentHash: source.contentBlobHash,
      wireBytes: source.wireBytes,
      decodedBytes: source.decodedBytes,
    } : undefined,
    extractionRevision: extraction ? {
      id: extraction.id,
      extractedAt: extraction.extractedAt,
      extractorVersion: extraction.extractorVersion,
      contentHash: extraction.extractedTextBlobHash,
      blockCount: extraction.blocks.length,
    } : undefined,
    restrictions: [
      'HTTPS on port 443 only; private and special-use destinations are blocked.',
      'Only inert text extraction is retained; scripts and subresources are never executed or fetched.',
      'Extraction is bounded to 256 text segments and 4,000 characters per segment.',
      'Every stored query value is redacted from operator-visible URLs.',
      ...(restrictedBlocks > 0 ? [`${restrictedBlocks} extracted block${restrictedBlocks === 1 ? ' was' : 's were'} held from artifact materialisation.`] : []),
    ],
  });
}

export function deriveRealUrlClaims(record: CaptureRecord): Claim[] {
  if (!record.sourceRevision || !record.extractionRevision) return [];
  return ClaimSchema.array().parse(record.extractionRevision.blocks.slice(0, MAX_CLAIMS).map((block) => {
    const evidence = createEvidenceLocator(record.extractionRevision!, block.locator);
    const restrictionReason = restrictionFor(block.text);
    return {
      id: `claim-${hash(`${record.extractionRevision!.id}:${block.locator}`).slice(0, 20)}`,
      text: block.text,
      origin: 'external_fact',
      verification: 'supported',
      evidence: [{
        sourceItemId: record.sourceRevision!.id,
        sourceRevisionId: evidence.sourceRevisionId,
        extractionRevisionId: evidence.extractionRevisionId,
        locatorType: evidence.locatorType,
        locator: evidence.locator,
        excerpt: evidence.excerpt,
        excerptHash: evidence.excerptHash,
        capturedAt: record.sourceRevision!.capturedAt,
      }],
      restrictedFromArtifacts: Boolean(restrictionReason),
      restrictionReason,
    };
  }));
}

function claimSetFor(record: CaptureRecord, claims: Claim[], actor: string) {
  if (!record.sourceRevision || !record.extractionRevision) throw new Error('Claim-set construction requires immutable revisions');
  return ClaimSetVersionSchema.parse({
    schemaVersion: 'pi.claim-set.v1', id: `claim-set-${record.extractionRevision.id}`, version: 1,
    contentHash: hashValue(claims), createdAt: record.sourceRevision.capturedAt,
    lockedAt: record.attempt.completedAt, lockedBy: actor, claims,
  });
}

function initialAngle(record: CaptureRecord, selected: Claim[]) {
  if (!record.extractionRevision) throw new Error('Angle construction requires an extraction revision');
  return StoryAngleSchema.parse({
    id: `angle-${record.extractionRevision.id}`, version: 1,
    label: 'Source-led draft awaiting human confirmation',
    framing: 'A bounded internal draft assembled only from immutable source assertions. Human classification, claim selection and angle confirmation are still required.',
    evidenceClaimIds: selected.map((claim) => claim.id), selectedBy: 'deterministic-real-url-policy',
  });
}

function claimSetDependency(run: Pick<FoundryRun, 'claimSet'>): ArtifactDependency {
  return { kind: 'claim_set', id: run.claimSet.id, version: run.claimSet.version, contentHash: run.claimSet.contentHash };
}

function angleDependency(run: Pick<FoundryRun, 'angle'>): ArtifactDependency {
  return { kind: 'angle', id: run.angle.id, version: run.angle.version, contentHash: hashValue(run.angle) };
}

function captureSourceDependency(run: FoundryRun, claimIds: string[]): Extract<ArtifactDependency, { kind: 'capture_source' }> {
  if (!run.capture) throw new Error('Capture-source dependency requires a real URL run');
  const revision = run.capture.revisions.find((candidate) => candidate.attemptId === run.capture?.artifactAttemptId);
  if (!revision?.sourceRevision || !revision.extractionRevision) throw new Error('Capture-source dependency requires immutable revisions');
  const selectedClaims = claimIds.map((claimId) => {
    const claim = run.claimSet.claims.find((candidate) => candidate.id === claimId);
    if (!claim) throw new Error(`Selected claim ${claimId} is unavailable`);
    return claim;
  });
  const selectedClaimsHash = hashValue(selectedClaims);
  const snapshot = {
    attemptId: revision.attemptId,
    requestFingerprint: revision.requestFingerprint,
    sourceRevisionId: revision.sourceRevision.id,
    extractionRevisionId: revision.extractionRevision.id,
    selectedClaimIds: claimIds,
    selectedClaimsHash,
  };
  return { kind: 'capture_source', id: revision.sourceRevision.id, version: 1, contentHash: hashValue(snapshot), ...snapshot };
}

function bindUsage(payload: unknown, entries: Array<{ segmentId: string; path: string; claimIds: string[] }>) {
  return entries.map((entry) => ({ ...entry, contentHash: hashValue(resolveArtifactPath(payload, entry.path)) }));
}

function quickNotePayload(run: FoundryRun, claimIds: string[], sourceKind: 'unclassified-web' | NonNullable<FoundryRun['sourceConfirmation']>['sourceKind']) {
  const claims = claimIds.map((claimId) => run.claimSet.claims.find((claim) => claim.id === claimId)).filter((claim): claim is Claim => Boolean(claim));
  const revision = run.capture?.revisions.find((candidate) => candidate.attemptId === run.capture?.artifactAttemptId);
  if (!revision?.sourceRevision || claims.length === 0) throw new Error('Quick Note materialisation requires selected immutable claims');
  return QuickNoteSchema.parse({
    headline: claims[0].text.slice(0, 140),
    dek: (claims[1]?.text ?? claims[0].text).slice(0, 320),
    section: 'note', tag: 'editor-note', publishedAt: revision.sourceRevision.capturedAt,
    expiresAt: new Date(Date.parse(revision.sourceRevision.capturedAt) + 30 * 86_400_000).toISOString(),
    sources: [{ kind: sourceKind, url: revision.sourceRevision.canonicalUrl, checkedAt: revision.sourceRevision.capturedAt }],
    status: 'draft', body: claims.map((claim) => claim.text).join('\n\n'),
  });
}

function materializeQuickNote(run: FoundryRun, claimIds: string[], version: number): ArtifactVersion {
  const payload = quickNotePayload(run, claimIds, run.sourceConfirmation?.sourceKind ?? 'unclassified-web');
  const usage = bindUsage(payload, [
    { segmentId: 'quick-note-headline', path: '$.headline', claimIds: [claimIds[0]] },
    { segmentId: 'quick-note-dek', path: '$.dek', claimIds: [claimIds[1] ?? claimIds[0]] },
    { segmentId: 'quick-note-source-kind', path: '$.sources[0].kind', claimIds },
    { segmentId: 'quick-note-source-url', path: '$.sources[0].url', claimIds },
    { segmentId: 'quick-note-source-checked', path: '$.sources[0].checkedAt', claimIds },
    ...claimIds.map((claimId, index) => ({ segmentId: `quick-note-claim-${index + 1}`, path: `$.body::paragraph[${index}]`, claimIds: [claimId] })),
  ]);
  const gates = evaluateQuickNoteGates(payload, run.claimSet.claims, claimIds, run.evaluationAsOf);
  gates.push(run.sourceConfirmation
    ? { gate: 'human_confirmation_current', scope: 'artifact', passed: true, blocking: false, detail: 'Human source classification, claim selection and angle confirmation bind the current immutable capture.', claimIds }
    : { gate: 'human_confirmation_current', scope: 'artifact', passed: false, blocking: true, detail: 'Human source classification, claim selection and angle confirmation are required before review.', claimIds });
  return withArtifactHash({
    id: `artifact-quick-${hash(run.id).slice(0, 20)}`, key: 'quick-note', version, type: 'quick_note' as const,
    angleId: run.angle.id, angleVersion: run.angle.version,
    factualSegmentIds: usage.map((entry) => entry.segmentId), claimUsage: usage, claimIds,
    dependencies: [claimSetDependency(run), angleDependency(run), captureSourceDependency(run, claimIds)],
    payload, gateResults: gates,
  }, run.claimSet.claims);
}

function materializeConfirmedPack(run: FoundryRun): ArtifactVersion[] {
  const confirmation = run.sourceConfirmation;
  if (!confirmation) throw new Error('Article and Ask materialisation requires a current human confirmation');
  const claimIds = confirmation.confirmedClaimIds;
  const claims = claimIds.map((claimId) => run.claimSet.claims.find((claim) => claim.id === claimId)).filter((claim): claim is Claim => Boolean(claim));
  const captureDependency = captureSourceDependency(run, claimIds);
  const common: ArtifactDependency[] = [claimSetDependency(run), angleDependency(run), captureDependency];
  const currentByType = new Map(run.artifactPack.completed.map((artifact) => [artifact.type, artifact]));
  const quick = materializeQuickNote(run, claimIds, (currentByType.get('quick_note')?.version ?? 0) + 1);
  const hostname = new URL(run.bundle.sourceItems[0].uri!).hostname.replace(/^www\./, '').split('.')[0].replace(/[^a-z0-9]+/g, '-');
  const slug = `${hostname || 'source'}-${captureDependency.sourceRevisionId.slice(-8)}`;
  const articlePayload = ArticleDraftPayloadSchema.parse({ slug, body: claims.map((claim) => claim.text).join('\n\n') });
  const articleUsage = bindUsage(articlePayload, claims.map((claim, index) => ({ segmentId: `article-claim-${index + 1}`, path: `$.body::paragraph[${index}]`, claimIds: [claim.id] })));
  const article = withArtifactHash({
    id: currentByType.get('article_draft')?.id ?? `artifact-article-${hash(run.id).slice(0, 20)}`, key: 'article-draft',
    version: (currentByType.get('article_draft')?.version ?? 0) + 1, type: 'article_draft' as const,
    angleId: run.angle.id, angleVersion: run.angle.version,
    factualSegmentIds: articleUsage.map((entry) => entry.segmentId), claimUsage: articleUsage, dependencies: common,
    payload: articlePayload,
    gateResults: evaluateArtifactGates(articlePayload, run.claimSet.claims, articleUsage.map((entry) => entry.segmentId), articleUsage, run.evaluationAsOf),
  }, run.claimSet.claims);
  const metadataPayload = ArticleMetadataPayloadSchema.parse({
    title: claims[0].text, dek: claims.slice(0, 2).map((claim) => claim.text).join(' ').slice(0, 320),
    author: 'editorial', houseByline: true, publishedAt: confirmation.confirmedAt.slice(0, 10), astroPatchReady: false,
    format: 'service', tags: [], relatedVenues: [], relatedExperiences: [], relatedPlaces: [], relatedArticles: [], relatedItineraries: [],
    featured: false, status: 'draft', lastVerified: confirmation.confirmedAt.slice(0, 10),
    aiSummary: claims.map((claim) => claim.text), faq: [], sitemapExclude: true, section: 'journal',
  });
  const metadataUsage = bindUsage(metadataPayload, [
    { segmentId: 'metadata-title', path: '$.title', claimIds: [claims[0].id] },
    { segmentId: 'metadata-dek', path: '$.dek', claimIds: claims.slice(0, 2).map((claim) => claim.id) },
    ...claims.map((claim, index) => ({ segmentId: `metadata-summary-${index + 1}`, path: `$.aiSummary[${index}]`, claimIds: [claim.id] })),
  ]);
  const metadataGates = evaluateArtifactGates(metadataPayload, run.claimSet.claims, metadataUsage.map((entry) => entry.segmentId), metadataUsage, run.evaluationAsOf);
  metadataGates.push({ gate: 'astro_patch_ready', scope: 'artifact', passed: false, blocking: false, detail: 'Text review and handoff are ready; Astro patch export waits for an exact hero rights binding.', claimIds: [] });
  const metadata = withArtifactHash({
    id: currentByType.get('article_metadata')?.id ?? `artifact-metadata-${hash(run.id).slice(0, 20)}`, key: 'article-metadata',
    version: (currentByType.get('article_metadata')?.version ?? 0) + 1, type: 'article_metadata' as const,
    angleId: run.angle.id, angleVersion: run.angle.version,
    factualSegmentIds: metadataUsage.map((entry) => entry.segmentId), claimUsage: metadataUsage,
    dependencies: [...common, { kind: 'artifact', id: article.id, version: article.version, contentHash: article.contentHash }],
    payload: metadataPayload, gateResults: metadataGates,
  }, run.claimSet.claims);
  const askPayload = AskAnswerPayloadSchema.parse({
    answer: claims.map((claim) => claim.text).join(' '), recommendations: [], follow_on: [],
    provenance_footer: REAL_URL_ASK_PROVENANCE_TEMPLATE,
  });
  const askUsage = bindUsage(askPayload, [{ segmentId: 'ask-answer', path: '$.answer', claimIds }]);
  const ask = withArtifactHash({
    id: currentByType.get('ask_answer')?.id ?? `artifact-ask-${hash(run.id).slice(0, 20)}`, key: 'ask-answer',
    version: (currentByType.get('ask_answer')?.version ?? 0) + 1, type: 'ask_answer' as const,
    angleId: run.angle.id, angleVersion: run.angle.version,
    factualSegmentIds: askUsage.map((entry) => entry.segmentId), claimUsage: askUsage, dependencies: common,
    payload: askPayload,
    gateResults: evaluateArtifactGates(askPayload, run.claimSet.claims, askUsage.map((entry) => entry.segmentId), askUsage, run.evaluationAsOf, { gate: 'ask_answer_contract', schema: AskAnswerPayloadSchema }),
  }, run.claimSet.claims);
  return [quick, article, metadata, ask];
}

function staleCaptureDependentReviews(run: FoundryRun, at: string, attemptId: string) {
  const captureDependent = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const artifact of run.artifactPack.completed) {
      if (captureDependent.has(artifact.id)) continue;
      if (artifact.dependencies.some((dependency) => dependency.kind === 'capture_source'
          || (dependency.kind === 'artifact' && captureDependent.has(dependency.id)))) {
        captureDependent.add(artifact.id);
        changed = true;
      }
    }
  }
  return run.artifactPack.reviews.map((review) => review.status === 'current' && captureDependent.has(review.artifactId) ? {
    ...review, status: 'stale' as const, staleReason: 'source_refreshed' as const,
    staledAt: at, supersededByAttemptId: attemptId,
  } : review);
}

export function buildRealUrlRun(record: CaptureRecord, actor: string, workflowIdempotencyKey: string): FoundryRun {
  if (record.attempt.state !== 'extracted' || !record.sourceRevision || !record.extractionRevision) throw new Error('Only extracted captures can create a Foundry run');
  const claims = deriveRealUrlClaims(record);
  const usableClaims = claims.filter((claim) => !claim.restrictedFromArtifacts && claim.verification === 'supported' && claim.evidence.length > 0).slice(0, 3);
  const selected = usableClaims.length > 0 ? usableClaims : claims.slice(0, 1);
  const blockers = usableClaims.length > 0 ? ['Human source classification, claim selection and angle confirmation are required.'] : ['No extracted block is safe for artifact materialisation.'];
  const claimSet = claimSetFor(record, claims, actor);
  const angle = initialAngle(record, selected);
  const summary = summarizeCapture(record);
  const shell = FoundryRunSchema.parse(withRealUrlOriginAuthority({
    schemaVersion: 'pi.foundry-run.v3', id: `run-${hash(record.attempt.id).slice(0, 24)}`,
    idempotencyKey: workflowIdempotencyKey, version: 1, status: 'needs_revision',
    createdAt: record.attempt.createdAt, updatedAt: record.attempt.completedAt, evaluationAsOf: record.attempt.completedAt,
    bundle: {
      schemaVersion: 'pi.intake-bundle.v1', id: `bundle-${record.sourceRevision.id}`,
      title: `Captured source: ${new URL(record.sourceRevision.canonicalUrl).hostname}`,
      submittedBy: actor, capturedAt: record.sourceRevision.capturedAt,
      sourceItems: [{ id: record.sourceRevision.id, kind: 'url', uri: record.sourceRevision.canonicalUrl, contentHash: record.sourceRevision.contentBlobHash, capturedAt: record.sourceRevision.capturedAt }],
    },
    recipe: URL_ARTICLE_RECIPE, claimSet, claims, angle,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v2', id: `pack-${hash(record.attempt.id).slice(0, 20)}`, version: 1,
      recipeId: URL_ARTICLE_RECIPE.id, recipeVersion: URL_ARTICLE_RECIPE.version,
      claimSetRef: { id: claimSet.id, version: claimSet.version, contentHash: claimSet.contentHash },
      angleRef: { id: angle.id, version: angle.version }, status: 'partial', completed: [], failed: [],
      omitted: [
        { key: 'article-draft', type: 'article_draft', reason: 'awaiting_human_confirmation', detail: 'Human claim-set and angle lock is required.' },
        { key: 'article-metadata', type: 'article_metadata', reason: 'awaiting_human_confirmation', detail: 'Human claim-set and angle lock is required.' },
        { key: 'ask-answer', type: 'ask_answer', reason: 'awaiting_human_confirmation', detail: 'Human claim-set and angle lock is required.' },
        { key: 'internal-link-plan', type: 'internal_link_plan', reason: 'not_requested', detail: 'Optional plan is outside this V1 slice.' },
        { key: 'seo-metadata', type: 'seo_metadata_proposal', reason: 'not_requested', detail: 'Optional proposal is outside this V1 slice.' },
      ], reviews: [],
    },
    blockers, capture: { mode: 'real_url', currentAttemptId: record.attempt.id, artifactAttemptId: record.attempt.id, revisions: [summary] },
    audit: [{ at: record.attempt.completedAt, actor, type: 'real_url_capture_created', detail: `Captured immutable attempt ${record.attempt.id}; Article and Ask remain locked pending human confirmation.` }],
  }, record));
  const quick = materializeQuickNote(shell, selected.map((claim) => claim.id), 1);
  return FoundryRunSchema.parse({ ...shell, artifact: quick, artifactPack: { ...shell.artifactPack, completed: [quick] } });
}

export function confirmRealUrlRun(run: FoundryRun, record: CaptureRecord, input: SourceConfirmationInput, at: string): FoundryRun {
  if (!run.capture || !record.sourceRevision || !record.extractionRevision
      || run.capture.currentAttemptId !== record.attempt.id || run.capture.artifactAttemptId !== record.attempt.id) {
    throw new Error('Human confirmation requires the current immutable source head');
  }
  if (run.version !== input.expectedVersion) throw new Error(`Expected version ${input.expectedVersion}; current version is ${run.version}`);
  const selectedClaims = input.claimIds.map((claimId) => run.claimSet.claims.find((claim) => claim.id === claimId));
  if (selectedClaims.some((claim) => !claim || claim.restrictedFromArtifacts || claim.verification !== 'supported' || claim.evidence.length === 0)) {
    throw new Error('Human confirmation may select only current, supported, evidenced and unrestricted claims');
  }
  const angle = StoryAngleSchema.parse({ ...run.angle, version: run.angle.version + 1, label: input.angleLabel, framing: input.angleFraming, evidenceClaimIds: input.claimIds, selectedBy: input.confirmer });
  const confirmation = SourceConfirmationSchema.parse({
    schemaVersion: 'pi.source-confirmation.v1', sourceKind: input.sourceKind,
    confirmedClaimIds: input.claimIds, confirmedClaimHashes: selectedClaims.map((claim) => hashValue(claim)),
    claimSetId: run.claimSet.id, claimSetVersion: run.claimSet.version, claimSetHash: run.claimSet.contentHash,
    angleId: angle.id, angleVersion: angle.version, angleHash: hashValue(angle),
    captureAttemptId: record.attempt.id, requestFingerprint: record.attempt.requestFingerprint,
    sourceRevisionId: record.sourceRevision.id, extractionRevisionId: record.extractionRevision.id,
    confirmedBy: input.confirmer, confirmedAt: at,
  });
  const confirmedShell = FoundryRunSchema.parse({
    ...run, version: run.version + 1, updatedAt: at, evaluationAsOf: at, status: 'ready_for_review',
    angle, sourceConfirmation: confirmation, blockers: [], artifact: undefined, review: undefined,
    artifactPack: {
      ...run.artifactPack, version: run.artifactPack.version + 1, angleRef: { id: angle.id, version: angle.version },
      completed: [], omitted: run.artifactPack.omitted.filter((omission) => omission.reason !== 'awaiting_human_confirmation'), reviews: run.artifactPack.reviews,
    },
    audit: [...run.audit, { at, actor: input.confirmer, type: 'source_confirmation_locked', detail: `Locked ${input.claimIds.length} immutable claims and angle version ${angle.version} before Article and Ask materialisation.` }],
  });
  const completed = materializeConfirmedPack(confirmedShell);
  const quick = completed.find((artifact) => artifact.type === 'quick_note');
  return FoundryRunSchema.parse({ ...confirmedShell, artifact: quick, artifactPack: { ...confirmedShell.artifactPack, status: 'partial', completed } });
}

export function refreshRealUrlRun(run: FoundryRun, record: CaptureRecord, actor: string): FoundryRun {
  if (!run.capture) throw new Error('Only real URL runs can be refreshed');
  if (run.capture.currentAttemptId === record.attempt.id) return run;
  const refreshed = buildRealUrlRun(record, actor, run.idempotencyKey);
  const at = record.attempt.completedAt;
  const staleReviews = staleCaptureDependentReviews(run, at, record.attempt.id);
  const quick = refreshed.artifactPack.completed.find((artifact) => artifact.type === 'quick_note');
  const oldQuick = run.artifactPack.completed.find((artifact) => artifact.type === 'quick_note');
  const versionedQuick = quick ? withArtifactHash({ ...quick, id: oldQuick?.id ?? quick.id, version: (oldQuick?.version ?? 0) + 1 }, refreshed.claimSet.claims) : undefined;
  return FoundryRunSchema.parse({
    ...refreshed, id: run.id, originAuthorityReceiptHash: run.originAuthorityReceiptHash,
    idempotencyKey: run.idempotencyKey, version: run.version + 1, createdAt: run.createdAt,
    artifact: versionedQuick,
    artifactPack: { ...refreshed.artifactPack, id: run.artifactPack.id, version: run.artifactPack.version + 1, completed: versionedQuick ? [versionedQuick] : [], reviews: staleReviews },
    capture: { mode: 'real_url', currentAttemptId: record.attempt.id, artifactAttemptId: record.attempt.id, revisions: [...run.capture.revisions, summarizeCapture(record)] },
    audit: [...run.audit, { at, actor, type: 'source_refreshed', detail: `Source refresh advanced to immutable attempt ${record.attempt.id}; only capture-dependent artifact reviews were staled.` }],
  });
}

export function staleRealUrlRunForNoStory(run: FoundryRun, record: CaptureRecord, actor: string): FoundryRun {
  if (!run.capture || record.attempt.state !== 'no_story' || !record.sourceRevision || !record.extractionRevision) throw new Error('No-story staleness requires complete immutable revisions');
  if (run.capture.currentAttemptId === record.attempt.id) return run;
  const at = record.attempt.completedAt;
  return FoundryRunSchema.parse({
    ...run, version: run.version + 1, status: 'needs_revision', updatedAt: at, evaluationAsOf: at,
    sourceConfirmation: undefined, review: undefined,
    blockers: [...new Set([...run.blockers, 'The refreshed source contained no extractable story text; prior artifacts remain visible but stale.'])],
    artifactPack: { ...run.artifactPack, version: run.artifactPack.version + 1, reviews: staleCaptureDependentReviews(run, at, record.attempt.id) },
    capture: { ...run.capture, currentAttemptId: record.attempt.id, revisions: [...run.capture.revisions, summarizeCapture(record)] },
    audit: [...run.audit, { at, actor, type: 'source_refreshed_no_story', detail: `Source head advanced to no-story attempt ${record.attempt.id}; capture-dependent reviews were staled.` }],
  });
}
