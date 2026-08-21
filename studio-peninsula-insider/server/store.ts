import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  ArticleDraftPayloadSchema,
  ArticleMetadataPayloadSchema,
  ArtifactPackFoundryRunV2Schema,
  ArtifactUpdateSchema,
  ArtifactVersionSchema,
  AskAnswerPayloadSchema,
  CaptureProjectionSchema,
  FoundryRunSchema,
  FIXTURE_ASK_PROVENANCE_TEMPLATE,
  InternalLinkPlanPayloadSchema,
  LegacyFoundryRunSchema,
  LegacySingleArtifactRealUrlRunV2Schema,
  InsiderNoteIssuePayloadSchema,
  InsiderNoteSubjectSetPayloadSchema,
  InstagramCaptionPayloadSchema,
  InstagramCarouselScriptPayloadSchema,
  InstagramFirstCommentPayloadSchema,
  LinkedInPostPayloadSchema,
  LegacyStoredArtifactReviewDecisionSchema,
  QuickNoteSchema,
  REAL_URL_ASK_PROVENANCE_TEMPLATE,
  SeoMetadataProposalPayloadSchema,
  SocialMediaBriefPayloadSchema,
  SourceConfirmationInputSchema,
  StoryAngleSchema,
  type ArtifactEdit,
  type ArtifactDependency,
  type ArtifactUpdate,
  type ArtifactVersion,
  type CaptureProjection,
  type FoundryRun,
  type GateResult,
  type LegacySingleArtifactRealUrlRunV2,
  type ReviewDecision,
  type SourceConfirmationInput,
} from '../shared/contracts.js';
import type { CaptureRecord } from '../shared/capture-contracts.js';
import { isPreproductionArtifactType, parsePreproductionPayload } from '../shared/preproduction-contracts.js';
import {
  QUICK_NOTE_RECIPE,
  URL_ARTICLE_RECIPE,
  artifactDependenciesCurrent,
  assertKnownFrozenFixtureOrigin,
  assertArtifactPublicLineage,
  buildPublicFieldLineage,
  evaluateArtifactGates,
  evaluateQuickNoteGates,
  hashValue,
  migrateArtifactPackV2Run,
  migrateLegacyRun,
  resolveArtifactPath,
  socialMediaRightsBindingHash,
  withArtifactHash,
} from './fixture-runner.js';
import { NEWSLETTER_SOCIAL_RECIPE, runNewsletterSocialFixture } from './newsletter-social-fixtures.js';
import {
  EXPLAINER_RECIPE,
  PODCAST_RECIPE,
  SHORT_VIDEO_RECIPE,
  runPreproductionFixture,
  type PreproductionFamily,
} from './preproduction-fixtures.js';
import {
  buildRealUrlRun,
  confirmRealUrlRun,
  deriveRealUrlClaims,
  refreshRealUrlRun,
  staleRealUrlRunForNoStory,
  summarizeCapture,
} from './real-url-runner.js';
import type { ImmutableCaptureResolver } from './real-url-integrity.js';
import {
  ArtifactReviewReceiptSchema,
  FileReviewReceiptRepository,
  LegacyReviewReceiptV1Schema,
  assertArtifactReceiptMatchesCurrentRun,
  buildArtifactReviewReceipt,
  buildLegacyReviewReceipt,
  type ReviewReceipt,
} from './review-receipts.js';
import {
  FileRunOriginAuthorityRepository,
  assertOriginAuthorityMatches,
  buildFixtureOriginAuthorityReceipt,
  buildRealUrlOriginAuthorityReceipt,
  withFixtureOriginAuthority,
  withRealUrlOriginAuthority,
} from './origin-authority.js';
import { evaluateArtifactFormatGates } from './newsletter-social-fixtures.js';
import { evaluatePreproductionGates, mediaRightsBindingHash } from './preproduction-policy.js';

interface StoreFile {
  schemaVersion: 'pi.foundry-file-store.v3';
  runs: FoundryRun[];
  captureProjections: CaptureProjection[];
}

type StoredSchemaVersion = 'pi.foundry-file-store.v1' | 'pi.foundry-file-store.v2' | 'pi.foundry-file-store.v3';

function contained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot);
}

function blockingGateFailed(artifact: ArtifactVersion): boolean {
  return artifact.gateResults.some((result) => !result.passed && result.blocking);
}

function requiredArtifactIds(run: FoundryRun): Set<string> {
  const requiredKeys = new Set(run.recipe.artifacts.filter((requirement) => requirement.required).map((requirement) => requirement.key));
  return new Set(run.artifactPack.completed.filter((artifact) => requiredKeys.has(artifact.key)).map((artifact) => artifact.id));
}

function deriveRunStatus(run: FoundryRun): FoundryRun['status'] {
  const requiredKeys = new Set(run.recipe.artifacts.filter((requirement) => requirement.required).map((requirement) => requirement.key));
  const completedKeys = new Set(run.artifactPack.completed.map((artifact) => artifact.key));
  const missingRequired = [...requiredKeys].some((key) => !completedKeys.has(key));
  const requiredFailure = run.artifactPack.failed.some((failure) => failure.required)
    || run.artifactPack.completed.some((artifact) => requiredKeys.has(artifact.key) && blockingGateFailed(artifact));
  if (run.blockers.length > 0 || missingRequired || requiredFailure) return 'needs_revision';
  const requiredIds = requiredArtifactIds(run);
  if (run.artifactPack.reviews.some((review) => review.status === 'current' && review.decision === 'rejected' && requiredIds.has(review.artifactId))) return 'needs_revision';
  if (run.recipe.id === QUICK_NOTE_RECIPE.id && run.artifact) {
    const review = run.artifactPack.reviews.find((candidate) => candidate.artifactId === run.artifact?.id && candidate.status === 'current');
    if (review?.decision === 'accepted') return 'accepted';
    if (review?.decision === 'rejected') return 'rejected';
  }
  return 'ready_for_review';
}

function parsePayloadForArtifact(artifact: ArtifactVersion, payload: unknown): ArtifactVersion['payload'] {
  switch (artifact.type) {
    case 'quick_note': return QuickNoteSchema.parse(payload);
    case 'article_draft': return ArticleDraftPayloadSchema.parse(payload);
    case 'article_metadata': return ArticleMetadataPayloadSchema.parse(payload);
    case 'ask_answer': return AskAnswerPayloadSchema.parse(payload);
    case 'internal_link_plan': return InternalLinkPlanPayloadSchema.parse(payload);
    case 'seo_metadata_proposal': return SeoMetadataProposalPayloadSchema.parse(payload);
    case 'insider_note_issue': return InsiderNoteIssuePayloadSchema.parse(payload);
    case 'insider_note_subject_set': return InsiderNoteSubjectSetPayloadSchema.parse(payload);
    case 'linkedin_post': return LinkedInPostPayloadSchema.parse(payload);
    case 'instagram_caption': return InstagramCaptionPayloadSchema.parse(payload);
    case 'instagram_first_comment': return InstagramFirstCommentPayloadSchema.parse(payload);
    case 'instagram_carousel_script': return InstagramCarouselScriptPayloadSchema.parse(payload);
    case 'social_media_brief': return SocialMediaBriefPayloadSchema.parse(payload);
    default:
      if (isPreproductionArtifactType(artifact.type)) return parsePreproductionPayload(artifact.type, payload);
      throw new Error(`Unsupported artifact type ${(artifact as ArtifactVersion).type}`);
  }
}

function collectEmbeddedClaimReferences(value: unknown, path = '$'): Array<{ path: string; claimIds: string[] }> {
  if (Array.isArray(value)) return value.flatMap((item, index) => collectEmbeddedClaimReferences(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    const itemPath = `${path}.${key}`;
    if (/claimIds$/i.test(key) && Array.isArray(item)) {
      return [{ path: itemPath, claimIds: item.filter((claimId): claimId is string => typeof claimId === 'string') }];
    }
    return collectEmbeddedClaimReferences(item, itemPath);
  });
}

function containsPropertyNamed(value: unknown, property: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsPropertyNamed(item, property));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => key === property || containsPropertyNamed(item, property));
}

function staleReview(review: FoundryRun['artifactPack']['reviews'][number], at: string, reason: 'artifact_edited' | 'dependency_changed' | 'source_refreshed' | 'review_superseded' | 'gate_re_evaluated') {
  return review.status === 'current' ? { ...review, status: 'stale' as const, staleReason: reason, staledAt: at } : review;
}

type LegacyReviewReceipt = Extract<ReviewReceipt, { schemaVersion: 'pi.review-receipt.v1' }>;

function legacyReceiptDependencySnapshot(receipt: LegacyReviewReceipt): ArtifactDependency[] {
  const angle = StoryAngleSchema.safeParse({
    ...(typeof receipt.angle === 'object' && receipt.angle !== null ? receipt.angle : {}),
    version: 1,
  });
  if (!angle.success) throw new Error('Legacy sealed review receipt contains an unreconcilable angle snapshot');
  return [{ kind: 'angle', id: angle.data.id, version: angle.data.version, contentHash: hashValue(angle.data) }];
}

export class VersionConflictError extends Error {}
export class CaptureProjectionConflictError extends Error {}
export class CaptureBusyError extends Error {}
export class CaptureRefreshTargetError extends Error {}
export class RunRefreshInProgressError extends Error {}

export class FileFoundryStore {
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly filePath: string;
  private readonly root: string;
  private readonly reviewReceipts: FileReviewReceiptRepository;
  private readonly originAuthorities: FileRunOriginAuthorityRepository;

  constructor(
    filePath: string,
    allowedRoot = dirname(filePath),
    private readonly immutableCaptureResolver?: ImmutableCaptureResolver,
    private readonly evaluationClock: () => string = () => new Date().toISOString(),
  ) {
    this.root = resolve(allowedRoot);
    this.filePath = resolve(filePath);
    if (!contained(this.root, this.filePath)) throw new Error('Foundry store path must remain inside its configured data root');
    this.reviewReceipts = new FileReviewReceiptRepository(resolve(this.root, 'review-receipts'), this.root);
    this.originAuthorities = new FileRunOriginAuthorityRepository(resolve(this.root, 'origin-authority'), this.root);
  }

  hasImmutableCaptureResolver(): boolean { return Boolean(this.immutableCaptureResolver); }

  private evaluationAsOf(): string {
    const asOf = this.evaluationClock();
    if (!Number.isFinite(Date.parse(asOf))) throw new Error('Foundry evaluation clock must return an ISO timestamp');
    return new Date(asOf).toISOString();
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release = () => {};
    this.mutationQueue = new Promise<void>((resolveQueue) => { release = resolveQueue; });
    await previous;
    try { return await operation(); } finally { release(); }
  }

  private async safeExistingFile(): Promise<string> {
    const metadata = await lstat(this.filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) throw new Error('Foundry store must be a private regular file');
    const [realRoot, realFile] = await Promise.all([realpath(this.root), realpath(this.filePath)]);
    if (!contained(realRoot, realFile)) throw new Error('Foundry store escaped its configured data root');
    return realFile;
  }

  private gatesForArtifact(run: FoundryRun, artifact: ArtifactVersion, asOf: string): GateResult[] {
    let gates = artifact.type === 'quick_note'
      ? evaluateQuickNoteGates(artifact.payload, run.claimSet.claims, artifact.claimIds, asOf)
      : evaluateArtifactGates(
        artifact.payload,
        run.claimSet.claims,
        artifact.factualSegmentIds,
        artifact.claimUsage,
        asOf,
        artifact.type === 'ask_answer'
          ? { gate: 'ask_answer_contract', schema: AskAnswerPayloadSchema }
          : artifact.type === 'article_metadata' && artifact.payload.astroPatchReady
            ? { gate: 'astro_article_contract', schema: ArticleMetadataPayloadSchema }
            : undefined,
        artifact.type,
      );
    if (['insider_note_issue', 'insider_note_subject_set', 'linkedin_post', 'instagram_caption', 'instagram_first_comment', 'instagram_carousel_script', 'social_media_brief'].includes(artifact.type)) {
      gates.push(...evaluateArtifactFormatGates(artifact.type, artifact.payload, run.claimSet.claims, asOf));
    }
    if (isPreproductionArtifactType(artifact.type)) {
      gates.push(...evaluatePreproductionGates(parsePreproductionPayload(artifact.type, artifact.payload), artifact.dependencies));
    }
    gates = gates.filter((gate) => !['dependency_current', 'field_lineage_complete', 'human_confirmation_current', 'astro_patch_ready'].includes(gate.gate));
    let lineageCurrent = true;
    try { assertArtifactPublicLineage(artifact, run.claimSet.claims); } catch { lineageCurrent = false; }
    gates.push(lineageCurrent
      ? { gate: 'field_lineage_complete', scope: 'artifact', passed: true, blocking: false, detail: 'Every public field is hash-bound to immutable claims or an explicit system template.', claimIds: [] }
      : { gate: 'field_lineage_complete', scope: 'artifact', passed: false, blocking: true, detail: 'One or more public fields has missing, substituted or incomplete immutable lineage.', claimIds: [] });
    if (run.capture) {
      const confirmationCurrent = Boolean(run.sourceConfirmation && run.sourceConfirmation.captureAttemptId === run.capture.currentAttemptId);
      gates.push(confirmationCurrent
        ? { gate: 'human_confirmation_current', scope: 'artifact', passed: true, blocking: false, detail: 'Human source, claim-set and angle confirmation binds the current immutable source.', claimIds: run.sourceConfirmation!.confirmedClaimIds }
        : { gate: 'human_confirmation_current', scope: 'artifact', passed: false, blocking: true, detail: 'The current source requires human classification, claim selection and angle confirmation.', claimIds: [] });
    }
    const dependenciesCurrent = artifactDependenciesCurrent(run, artifact);
    gates.push(dependenciesCurrent
      ? { gate: 'dependency_current', scope: 'artifact', passed: true, blocking: false, detail: 'All claim, angle, source, artifact and rights dependencies are current.', claimIds: [] }
      : { gate: 'dependency_current', scope: 'artifact', passed: false, blocking: true, detail: 'A claim, angle, source, artifact or rights dependency is stale.', claimIds: [] });
    if (artifact.type === 'article_metadata') {
      const patchReady = artifact.payload.astroPatchReady && artifactDependenciesCurrent(run, artifact);
      gates.push(patchReady
        ? { gate: 'astro_patch_ready', scope: 'artifact', passed: true, blocking: false, detail: 'Exact hero asset, placement, rights and release binding is current.', claimIds: [] }
        : { gate: 'astro_patch_ready', scope: 'artifact', passed: false, blocking: false, detail: 'Text handoff remains allowed; Astro patch export waits for exact hero rights binding.', claimIds: [] });
    }
    return gates;
  }

  private normalizeDerivedStatus(runInput: FoundryRun, asOf: string): FoundryRun {
    const run = FoundryRunSchema.parse({ ...runInput, evaluationAsOf: asOf });
    const completed = run.artifactPack.completed.map((artifact) => ArtifactVersionSchema.parse({
      ...artifact,
      gateResults: this.gatesForArtifact(run, artifact, asOf),
    }));
    const byId = new Map(completed.map((artifact) => [artifact.id, artifact]));
    const reviews = run.artifactPack.reviews.map((review) => {
      if (review.status === 'stale') return review;
      const artifact = byId.get(review.artifactId);
      if (!artifact) return staleReview(review, asOf, 'dependency_changed');
      if (artifact.version !== review.artifactVersion || JSON.stringify(artifact.dependencies) !== JSON.stringify(review.dependencySnapshot)) {
        return staleReview(review, asOf, 'dependency_changed');
      }
      if (blockingGateFailed(artifact)) return staleReview(review, asOf, 'gate_re_evaluated');
      return review;
    });
    const quick = run.artifact
      ? completed.find((artifact) => artifact.id === run.artifact?.id && artifact.type === 'quick_note')
      : completed.find((artifact) => artifact.type === 'quick_note' && run.capture);
    const quickReview = quick && reviews.find((review) => review.artifactId === quick.id && review.status === 'current');
    const normalized = FoundryRunSchema.parse({
      ...run,
      artifact: quick,
      review: quickReview ? {
        decision: quickReview.decision,
        reviewer: quickReview.reviewer,
        note: quickReview.note,
        decidedAt: quickReview.decidedAt,
        receiptHash: quickReview.receiptHash!,
      } : undefined,
      artifactPack: { ...run.artifactPack, completed, reviews },
    });
    return FoundryRunSchema.parse({ ...normalized, status: deriveRunStatus(normalized) });
  }

  private async validateImmutableRun(run: FoundryRun): Promise<CaptureRecord | undefined> {
    for (const artifact of run.artifactPack.completed) {
      if (artifact.contentHash !== hashValue(artifact.payload)) throw new Error('Artifact content hash does not match its exact public payload');
      assertArtifactPublicLineage(artifact, run.claimSet.claims);
    }
    const askArtifacts = run.artifactPack.completed.filter((artifact) => artifact.type === 'ask_answer');
    const expectedAskTemplate = run.capture ? REAL_URL_ASK_PROVENANCE_TEMPLATE : FIXTURE_ASK_PROVENANCE_TEMPLATE;
    if (askArtifacts.some((artifact) => artifact.payload.provenance_footer !== expectedAskTemplate)) {
      throw new Error('Ask provenance template does not match the run source authority');
    }
    if (run.capture && askArtifacts.length > 0
        && (!run.sourceConfirmation || run.sourceConfirmation.captureAttemptId !== run.capture.currentAttemptId)) {
      throw new Error('Real URL Ask artifacts require current human confirmation of the immutable capture');
    }
    if (!run.capture) return undefined;
    if (!this.immutableCaptureResolver) throw new Error('Real URL runs require an immutable capture resolver');
    let artifactRecord: CaptureRecord | undefined;
    for (const summary of run.capture.revisions) {
      const record = await this.immutableCaptureResolver.get(summary.attemptId);
      if (!record || JSON.stringify(summarizeCapture(record)) !== JSON.stringify(summary)) throw new Error('Mutable capture summary does not match its immutable manifest');
      if (summary.attemptId === run.capture.artifactAttemptId) artifactRecord = record;
    }
    if (!artifactRecord?.sourceRevision || !artifactRecord.extractionRevision) throw new Error('Artifact capture dependency is unavailable');
    const immutableClaims = deriveRealUrlClaims(artifactRecord);
    if (JSON.stringify(immutableClaims) !== JSON.stringify(run.claimSet.claims)
        || run.claimSet.contentHash !== hashValue(run.claimSet.claims)) {
      throw new Error('Mutable claim set does not reproduce from the immutable extraction');
    }
    const source = run.bundle.sourceItems.find((candidate) => candidate.id === artifactRecord!.sourceRevision!.id);
    if (!source || source.contentHash !== artifactRecord.sourceRevision.contentBlobHash || source.uri !== artifactRecord.sourceRevision.canonicalUrl) {
      throw new Error('Mutable intake source does not match the immutable source revision');
    }
    if (run.sourceConfirmation) {
      const selected = run.sourceConfirmation.confirmedClaimIds.map((claimId) => run.claimSet.claims.find((claim) => claim.id === claimId));
      if (selected.some((claim) => !claim)
          || JSON.stringify(run.sourceConfirmation.confirmedClaimHashes) !== JSON.stringify(selected.map((claim) => hashValue(claim)))
          || run.sourceConfirmation.requestFingerprint !== artifactRecord.attempt.requestFingerprint
          || run.sourceConfirmation.sourceRevisionId !== artifactRecord.sourceRevision.id
          || run.sourceConfirmation.extractionRevisionId !== artifactRecord.extractionRevision.id
          || run.sourceConfirmation.angleHash !== hashValue(run.angle)) {
        throw new Error('Mutable human confirmation does not bind the immutable source, selected claims and angle');
      }
    }
    return artifactRecord;
  }

  private async validateOriginAuthority(run: FoundryRun): Promise<void> {
    const receipt = await this.originAuthorities.get(run.originAuthorityReceiptHash);
    if (!receipt) throw new Error('Run origin authority receipt is unavailable');
    let originRecord: CaptureRecord | undefined;
    if (receipt.origin.mode === 'real_url') {
      if (!this.immutableCaptureResolver) throw new Error('Real URL origin authority requires an immutable capture resolver');
      originRecord = await this.immutableCaptureResolver.get(receipt.origin.sourceHead.attemptId);
    }
    assertOriginAuthorityMatches(run, receipt, originRecord);
  }

  private async sealProvenOriginAuthority(run: FoundryRun, immutableRecord?: CaptureRecord): Promise<void> {
    const receipt = run.capture
      ? (() => {
        if (!immutableRecord || immutableRecord.attempt.id !== run.capture.artifactAttemptId) {
          throw new Error('Captured run origin cannot be sealed without its exact immutable artifact attempt');
        }
        if (JSON.stringify(run.recipe) !== JSON.stringify(URL_ARTICLE_RECIPE)) {
          throw new Error('Captured run origin cannot be sealed with an unknown recipe authority');
        }
        return buildRealUrlOriginAuthorityReceipt(run, immutableRecord);
      })()
      : (() => {
        assertKnownFrozenFixtureOrigin(run);
        return buildFixtureOriginAuthorityReceipt(run);
      })();
    const receiptHash = await this.originAuthorities.put(receipt);
    if (receiptHash !== run.originAuthorityReceiptHash) throw new Error('Run origin authority hash does not match its proven external authority');
  }

  private async validateReviewReceipts(run: FoundryRun): Promise<void> {
    for (const review of run.artifactPack.reviews) {
      if (!review.receiptHash) {
        if (review.status === 'stale' && review.staleReason === 'legacy_unsealed') continue;
        throw new Error('Artifact review receipt is unavailable');
      }
      const receipt = await this.reviewReceipts.get(review.receiptHash);
      if (!receipt || receipt.runId !== run.id || receipt.decision !== review.decision
          || receipt.reviewer !== review.reviewer || receipt.decidedAt !== review.decidedAt || receipt.note !== review.note) {
        throw new Error('Artifact review receipt is unavailable or does not match its decision');
      }
      if (receipt.schemaVersion === 'pi.review-receipt.v1') {
        if (review.status !== 'stale' || review.staleReason !== 'schema_migrated') throw new Error('Legacy receipts are historical only');
        if (receipt.artifactId !== review.artifactId || receipt.artifactVersion !== review.artifactVersion
            || JSON.stringify(legacyReceiptDependencySnapshot(receipt)) !== JSON.stringify(review.dependencySnapshot)) {
          throw new Error('Legacy review receipt metadata does not match its historical review');
        }
      } else if (receipt.artifact.id !== review.artifactId || receipt.artifact.version !== review.artifactVersion
          || receipt.evaluationAsOf !== review.evaluationAsOf
          || receipt.runVersion !== review.reviewedRunVersion
          || receipt.artifactPackVersion !== review.reviewedArtifactPackVersion) {
        throw new Error('Artifact review receipt metadata does not match its stored review');
      }
    }
    for (const review of run.artifactPack.reviews.filter((candidate) => candidate.status === 'current')) {
      const artifact = run.artifactPack.completed.find((candidate) => candidate.id === review.artifactId);
      const receipt = await this.reviewReceipts.get(review.receiptHash!);
      if (!artifact || !receipt) throw new Error('Current artifact receipt cannot resolve its artifact');
      assertArtifactReceiptMatchesCurrentRun(run, artifact, receipt);
    }
  }

  private async migrateSingleArtifactRun(legacy: LegacySingleArtifactRealUrlRunV2, asOf: string): Promise<FoundryRun> {
    const migrationRecipe = legacy.capture ? URL_ARTICLE_RECIPE : QUICK_NOTE_RECIPE;
    const claims = legacy.claims;
    const claimSet = {
      schemaVersion: 'pi.claim-set.v1' as const,
      id: `claim-set-${legacy.id}`,
      version: 1,
      contentHash: hashValue(claims),
      createdAt: legacy.createdAt,
      lockedAt: legacy.updatedAt,
      lockedBy: legacy.bundle.submittedBy,
      claims,
    };
    const angle = { ...legacy.angle, version: 1 };
    const claimUsage = [{ segmentId: 'quick-note-copy', path: '$', claimIds: legacy.artifact.claimIds, contentHash: hashValue(legacy.artifact.payload) }];
    const gateResults = evaluateQuickNoteGates(legacy.artifact.payload, claims, legacy.artifact.claimIds, asOf);
    gateResults.push({ gate: 'human_confirmation_current', scope: 'artifact', passed: false, blocking: true, detail: 'The migrated single-artifact source requires a new V1 human confirmation.', claimIds: [] });
    const artifact = withArtifactHash({
      id: legacy.artifact.id, key: 'quick-note', version: legacy.artifact.version, type: 'quick_note' as const,
      angleId: angle.id, angleVersion: angle.version, factualSegmentIds: ['quick-note-copy'], claimUsage,
      claimIds: legacy.artifact.claimIds,
      dependencies: [
        { kind: 'claim_set' as const, id: claimSet.id, version: claimSet.version, contentHash: claimSet.contentHash },
        { kind: 'angle' as const, id: angle.id, version: angle.version, contentHash: hashValue(angle) },
      ],
      payload: legacy.artifact.payload,
      gateResults,
    }, claims);
    const history = [...legacy.reviewHistory];
    if (legacy.review && !history.some((entry) => entry.receiptHash === legacy.review?.receiptHash)) {
      history.push({ ...legacy.review, validity: 'current' });
    }
    const reviews = [] as FoundryRun['artifactPack']['reviews'];
    for (const entry of history) {
      if (entry.receiptHash) {
        const receipt = await this.reviewReceipts.get(entry.receiptHash);
        const legacyReceipt = LegacyReviewReceiptV1Schema.safeParse(receipt);
        if (!legacyReceipt.success
            || legacyReceipt.data.runId !== legacy.id || legacyReceipt.data.artifactId !== legacy.artifact.id
            || legacyReceipt.data.decision !== entry.decision || legacyReceipt.data.reviewer !== entry.reviewer
            || legacyReceipt.data.note !== entry.note || legacyReceipt.data.decidedAt !== entry.decidedAt
            || legacyReceipt.data.runVersion >= legacy.version
            || legacyReceipt.data.artifactVersion > legacy.artifact.version) {
          throw new Error('Legacy sealed review receipt failed migration validation');
        }
        const historicalDependencies = legacyReceiptDependencySnapshot(legacyReceipt.data);
        if (legacyReceipt.data.artifactVersion === legacy.artifact.version) {
          const currentArtifactSnapshot = {
            artifactId: legacy.artifact.id,
            artifactVersion: legacy.artifact.version,
            claimIds: legacy.artifact.claimIds,
            angle: legacy.angle,
            payload: legacy.artifact.payload,
            sourceReview: legacy.artifact.sourceReview ?? null,
            contentLineage: legacy.artifact.contentLineage ?? null,
            targetPath: legacy.artifact.targetPath ?? null,
            gateResults: legacy.artifact.gateResults,
          };
          const reviewedArtifactSnapshot = {
            artifactId: legacyReceipt.data.artifactId,
            artifactVersion: legacyReceipt.data.artifactVersion,
            claimIds: legacyReceipt.data.claimIds,
            angle: legacyReceipt.data.angle,
            payload: legacyReceipt.data.payload,
            sourceReview: legacyReceipt.data.sourceReview,
            contentLineage: legacyReceipt.data.contentLineage,
            targetPath: legacyReceipt.data.targetPath,
            gateResults: legacyReceipt.data.gateResults,
          };
          if (JSON.stringify(currentArtifactSnapshot) !== JSON.stringify(reviewedArtifactSnapshot)) {
            throw new Error('Legacy sealed review receipt conflicts with the same artifact version');
          }
        }
        if (legacy.review?.receiptHash === entry.receiptHash
            && JSON.stringify(buildLegacyReviewReceipt(legacy)) !== JSON.stringify(legacyReceipt.data)) {
          throw new Error('Legacy current review receipt does not match its exact reviewed snapshot');
        }
        reviews.push({
          id: `review-${entry.receiptHash.slice(0, 16)}`, artifactId: artifact.id, artifactVersion: legacyReceipt.data.artifactVersion,
          decision: entry.decision, reviewer: entry.reviewer, note: entry.note, decidedAt: entry.decidedAt,
          status: 'stale', dependencySnapshot: historicalDependencies, authority: 'draft_handoff_only',
          receiptHash: entry.receiptHash, staleReason: 'schema_migrated', staledAt: entry.staledAt ?? legacy.updatedAt,
          supersededByAttemptId: entry.supersededByAttemptId,
        });
      } else {
        reviews.push({
          id: `review-${hashValue(entry).slice(0, 16)}`, artifactId: artifact.id, artifactVersion: artifact.version,
          decision: entry.decision, reviewer: entry.reviewer, note: entry.note, decidedAt: entry.decidedAt,
          status: 'stale', dependencySnapshot: artifact.dependencies, authority: 'draft_handoff_only',
          staleReason: 'legacy_unsealed', staledAt: legacy.updatedAt,
        });
      }
    }
    const candidate = {
      schemaVersion: 'pi.foundry-run.v3', id: legacy.id, idempotencyKey: legacy.idempotencyKey,
      version: legacy.version, status: 'needs_revision', createdAt: legacy.createdAt, updatedAt: legacy.updatedAt, evaluationAsOf: asOf,
      bundle: legacy.bundle, recipe: migrationRecipe, claimSet, claims, angle, artifact,
      artifactPack: {
        schemaVersion: 'pi.artifact-pack.v2', id: `pack-${legacy.id}`, version: Math.max(1, legacy.artifact.version),
        recipeId: migrationRecipe.id, recipeVersion: migrationRecipe.version,
        claimSetRef: { id: claimSet.id, version: claimSet.version, contentHash: claimSet.contentHash },
        angleRef: { id: angle.id, version: angle.version }, status: legacy.capture ? 'partial' : 'complete', completed: [artifact], failed: [],
        omitted: legacy.capture ? [
          { key: 'article-draft', type: 'article_draft', reason: 'awaiting_human_confirmation', detail: 'A new V1 source confirmation is required.' },
          { key: 'article-metadata', type: 'article_metadata', reason: 'awaiting_human_confirmation', detail: 'A new V1 source confirmation is required.' },
          { key: 'ask-answer', type: 'ask_answer', reason: 'awaiting_human_confirmation', detail: 'A new V1 source confirmation is required.' },
          { key: 'internal-link-plan', type: 'internal_link_plan', reason: 'not_requested', detail: 'Optional plan is outside V1.' },
          { key: 'seo-metadata', type: 'seo_metadata_proposal', reason: 'not_requested', detail: 'Optional proposal is outside V1.' },
        ] : [], reviews,
      },
      blockers: [...new Set([...legacy.blockers, 'Schema migration requires a new human source, claim-set and angle confirmation.'])],
      capture: legacy.capture,
      audit: [...legacy.audit, { at: legacy.updatedAt, actor: 'store-migration', type: 'single_artifact_schema_migrated', detail: 'Migrated #325 single-artifact state; sealed receipts remain historical and cannot authorise V1 exports.' }],
    };
    if (legacy.capture) {
      if (!this.immutableCaptureResolver) throw new Error('Captured legacy origin cannot be sealed without an immutable capture resolver');
      const record = await this.immutableCaptureResolver.get(legacy.capture.artifactAttemptId);
      if (!record) throw new Error('Captured legacy origin immutable authority is unavailable');
      return FoundryRunSchema.parse(withRealUrlOriginAuthority(candidate, record));
    }
    return FoundryRunSchema.parse(withFixtureOriginAuthority(candidate));
  }

  private async parseStoredRun(input: unknown, storeVersion: StoredSchemaVersion, asOf: string): Promise<FoundryRun> {
    const current = FoundryRunSchema.safeParse(input);
    if (current.success) return this.normalizeDerivedStatus(current.data, asOf);
    if (input && typeof input === 'object' && (input as { schemaVersion?: unknown }).schemaVersion === 'pi.foundry-run.v3') {
      throw new Error('Current Foundry v3 run is missing or has an invalid origin authority receipt reference');
    }
    const acceptedLane = z.object({
      schemaVersion: z.literal('pi.foundry-run.v2'),
      idempotencyKey: z.string().min(1),
      updatedAt: z.string().datetime(),
      bundle: z.object({ id: z.string().min(1), submittedBy: z.string().min(1) }).passthrough(),
      recipe: z.object({ id: z.string().min(1) }).passthrough(),
      artifactPack: z.object({ reviews: z.array(z.unknown()).default([]) }).passthrough(),
    }).passthrough().safeParse(input);
    if (acceptedLane.success) {
      const pairs: Array<{
        recipeId: string;
        bundleId: string;
        build: (actor: string, idempotencyKey: string) => FoundryRun;
      }> = [
        { recipeId: NEWSLETTER_SOCIAL_RECIPE.id, bundleId: 'bundle-red-hill-newsletter-social', build: runNewsletterSocialFixture },
        ...([
          ['explainer', EXPLAINER_RECIPE.id, 'bundle-red-hill-explainer-preproduction'],
          ['podcast', PODCAST_RECIPE.id, 'bundle-red-hill-podcast-preproduction'],
          ['short_video', SHORT_VIDEO_RECIPE.id, 'bundle-red-hill-short-video-preproduction'],
        ] as const).map(([family, recipeId, bundleId]) => ({
          recipeId,
          bundleId,
          build: (actor: string, idempotencyKey: string) => runPreproductionFixture(family as PreproductionFamily, actor, idempotencyKey),
        })),
      ];
      const pair = pairs.find((candidate) => candidate.recipeId === acceptedLane.data.recipe.id
        && candidate.bundleId === acceptedLane.data.bundle.id);
      if (pair) {
        const reconstructed = pair.build(acceptedLane.data.bundle.submittedBy, acceptedLane.data.idempotencyKey);
        const currentArtifacts = new Map(reconstructed.artifactPack.completed.map((artifact) => [artifact.id, artifact]));
        const historicalReviews = acceptedLane.data.artifactPack.reviews.flatMap((rawReview) => {
          const review = LegacyStoredArtifactReviewDecisionSchema.safeParse(rawReview);
          if (!review.success || !currentArtifacts.has(review.data.artifactId)) return [];
          return [{
            ...review.data,
            status: 'stale' as const,
            staleReason: 'legacy_unsealed' as const,
            staledAt: acceptedLane.data.updatedAt,
          }];
        });
        const migrated = FoundryRunSchema.parse({
          ...reconstructed,
          artifactPack: { ...reconstructed.artifactPack, reviews: historicalReviews },
          audit: [...reconstructed.audit, {
            at: acceptedLane.data.updatedAt,
            actor: 'store-migration',
            type: 'accepted_lane_fixture_reconstructed',
            detail: 'Reconstructed the exact frozen V1 recipe and bundle; prior unsealed reviews remain stale historical records only.',
          }],
        });
        const normalized = this.normalizeDerivedStatus(migrated, asOf);
        await this.sealProvenOriginAuthority(normalized);
        return normalized;
      }
    }
    const packV2 = ArtifactPackFoundryRunV2Schema.safeParse(input);
    if (packV2.success) {
      const migrated = this.normalizeDerivedStatus(migrateArtifactPackV2Run(packV2.data), asOf);
      await this.sealProvenOriginAuthority(migrated);
      return migrated;
    }
    const legacy = LegacyFoundryRunSchema.safeParse(input);
    const looksLikeSingleArtifactV2 = Boolean(input && typeof input === 'object'
      && ('reviewHistory' in input || 'capture' in input));
    if (legacy.success && !looksLikeSingleArtifactV2) {
      const migrated = this.normalizeDerivedStatus(migrateLegacyRun(legacy.data), asOf);
      await this.sealProvenOriginAuthority(migrated);
      return migrated;
    }
    const single = LegacySingleArtifactRealUrlRunV2Schema.safeParse(input);
    if (single.success) {
      const migrated = this.normalizeDerivedStatus(await this.migrateSingleArtifactRun(single.data, asOf), asOf);
      const record = await this.validateImmutableRun(migrated);
      await this.sealProvenOriginAuthority(migrated, record);
      return migrated;
    }
    if (legacy.success) {
      const migrated = this.normalizeDerivedStatus(migrateLegacyRun(legacy.data), asOf);
      await this.sealProvenOriginAuthority(migrated);
      return migrated;
    }
    throw new Error(`Unsupported Foundry run schema in ${storeVersion}`);
  }

  private async validateCaptureProjection(projection: CaptureProjection): Promise<void> {
    if (!projection.summary) return;
    if (!this.immutableCaptureResolver) throw new Error('Terminal capture projections require an immutable capture resolver');
    const record = await this.immutableCaptureResolver.get(projection.attemptId);
    if (!record || JSON.stringify(summarizeCapture(record)) !== JSON.stringify(projection.summary)) throw new Error('Mutable capture projection does not match the immutable manifest');
  }

  private async read(asOf = this.evaluationAsOf()): Promise<StoreFile> {
    try {
      const raw = await readFile(await this.safeExistingFile(), 'utf8');
      const parsed = JSON.parse(raw) as { schemaVersion?: string; runs?: unknown[]; captureProjections?: unknown[] };
      if (!['pi.foundry-file-store.v1', 'pi.foundry-file-store.v2', 'pi.foundry-file-store.v3'].includes(parsed.schemaVersion ?? '') || !Array.isArray(parsed.runs)) {
        throw new Error('Unsupported Foundry store schema');
      }
      const storeVersion = parsed.schemaVersion as StoredSchemaVersion;
      const runs = await Promise.all(parsed.runs.map((run) => this.parseStoredRun(run, storeVersion, asOf)));
      const captureProjections = (parsed.captureProjections ?? []).map((projection) => CaptureProjectionSchema.parse(projection));
      await Promise.all(runs.map((run) => this.validateImmutableRun(run)));
      await Promise.all(runs.map((run) => this.validateOriginAuthority(run)));
      await Promise.all(runs.map((run) => this.validateReviewReceipts(run)));
      await Promise.all(captureProjections.map((projection) => this.validateCaptureProjection(projection)));
      return { schemaVersion: 'pi.foundry-file-store.v3', runs, captureProjections };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 'pi.foundry-file-store.v3', runs: [], captureProjections: [] };
      throw error;
    }
  }

  private async syncParent(): Promise<void> {
    let handle;
    try { handle = await open(dirname(this.filePath), 'r'); await handle.sync(); }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EACCES', 'EINVAL', 'EISDIR', 'ENOTSUP', 'EPERM'].includes(code ?? '')) throw error;
    } finally { await handle?.close().catch(() => undefined); }
  }

  private async write(data: StoreFile): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await mkdir(dirname(this.filePath), { recursive: true });
    const [realRoot, realParent] = await Promise.all([realpath(this.root), realpath(dirname(this.filePath))]);
    if (!contained(realRoot, realParent)) throw new Error('Foundry store parent escaped its configured data root');
    try { await this.safeExistingFile(); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
      await rename(temporary, this.filePath); await this.syncParent();
    } catch (error) {
      await handle?.close().catch(() => undefined); await rm(temporary, { force: true }).catch(() => undefined); throw error;
    }
  }

  private refreshActive(data: StoreFile, runId: string): boolean {
    return data.captureProjections.some((projection) => projection.refreshRunId === runId && ['queued', 'capturing'].includes(projection.state));
  }

  async list(): Promise<FoundryRun[]> { return (await this.read()).runs; }
  async get(id: string): Promise<FoundryRun | undefined> { return (await this.read()).runs.find((run) => run.id === id); }
  async getByIdempotencyKey(key: string): Promise<FoundryRun | undefined> { return (await this.read()).runs.find((run) => run.idempotencyKey === key); }
  async listCaptureProjections(): Promise<CaptureProjection[]> { return (await this.read()).captureProjections; }
  async getCaptureProjection(id: string): Promise<CaptureProjection | undefined> { return (await this.read()).captureProjections.find((projection) => projection.id === id); }
  async getCaptureProjectionByIdempotencyKeyHash(keyHash: string): Promise<CaptureProjection | undefined> {
    return (await this.read()).captureProjections.find((projection) => projection.idempotencyKeyHash === keyHash);
  }

  async validateForExport(id: string): Promise<{ run: FoundryRun; immutableRecord?: CaptureRecord }> {
    return this.mutate(async () => {
      const data = await this.read();
      const run = data.runs.find((candidate) => candidate.id === id);
      if (!run) throw new Error('Run not found');
      if (this.refreshActive(data, id)) throw new RunRefreshInProgressError('Source refresh is in progress');
      await this.validateReviewReceipts(run);
      return { run, immutableRecord: await this.validateImmutableRun(run) };
    });
  }

  async validateArtifactForHandoff(id: string, artifactId: string): Promise<{ run: FoundryRun; artifact: ArtifactVersion }> {
    const validated = await this.validateForExport(id);
    const artifact = validated.run.artifactPack.completed.find((candidate) => candidate.id === artifactId);
    if (!artifact) throw new Error('Artifact not found');
    return { run: validated.run, artifact };
  }

  async create(run: FoundryRun): Promise<FoundryRun> {
    return this.mutate(async () => {
      const asOf = this.evaluationAsOf();
      const data = await this.read(asOf);
      const existing = data.runs.find((item) => item.idempotencyKey === run.idempotencyKey);
      if (existing) return existing;
      const parsed = this.normalizeDerivedStatus(FoundryRunSchema.parse(run), asOf);
      const immutableRecord = await this.validateImmutableRun(parsed);
      await this.sealProvenOriginAuthority(parsed, immutableRecord);
      await this.validateOriginAuthority(parsed);
      data.runs.unshift(parsed); await this.write(data); return parsed;
    });
  }

  async review(id: string, decision: ReviewDecision): Promise<FoundryRun> {
    return this.mutate(async () => {
      const asOf = this.evaluationAsOf();
      const data = await this.read(asOf);
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (this.refreshActive(data, id)) throw new RunRefreshInProgressError('Source refresh is in progress');
      if (run.version !== decision.expectedVersion) throw new VersionConflictError(`Expected version ${decision.expectedVersion}; current version is ${run.version}`);
      const artifactId = decision.artifactId ?? run.artifact?.id;
      if (!artifactId) throw new Error('artifactId is required');
      const artifact = run.artifactPack.completed.find((candidate) => candidate.id === artifactId);
      if (!artifact) throw new Error('Artifact not found');
      if (decision.expectedArtifactVersion && decision.expectedArtifactVersion !== artifact.version) {
        throw new VersionConflictError(`Expected artifact version ${decision.expectedArtifactVersion}; current version is ${artifact.version}`);
      }
      if (decision.decision === 'accepted' && blockingGateFailed(artifact)) throw new Error('Artifact has unresolved blocking gates');
      const receiptHash = await this.reviewReceipts.put(buildArtifactReviewReceipt(run, artifact, {
        decision: decision.decision, reviewer: decision.reviewer, note: decision.note, decidedAt: asOf,
      }));
      const reviews = run.artifactPack.reviews.map((review) => review.artifactId === artifact.id ? staleReview(review, asOf, 'review_superseded') : review);
      reviews.push({
        id: `review-${randomUUID()}`, artifactId: artifact.id, artifactVersion: artifact.version,
        decision: decision.decision, reviewer: decision.reviewer, note: decision.note, decidedAt: asOf,
        status: 'current', dependencySnapshot: artifact.dependencies, authority: 'draft_handoff_only',
        receiptHash, evaluationAsOf: asOf,
        reviewedRunVersion: run.version,
        reviewedArtifactPackVersion: run.artifactPack.version,
      });
      const candidate = FoundryRunSchema.parse({
        ...run, version: run.version + 1, updatedAt: asOf, evaluationAsOf: asOf,
        artifactPack: { ...run.artifactPack, version: run.artifactPack.version + 1, reviews },
        audit: [...run.audit, { at: asOf, actor: decision.reviewer, type: 'artifact_review_decision', detail: `${decision.decision} draft handoff for artifact ${artifact.id}; no publication authority was granted.` }],
      });
      const updated = this.normalizeDerivedStatus(candidate, asOf);
      data.runs[index] = updated; await this.write(data); return updated;
    });
  }

  async confirmSource(id: string, rawInput: SourceConfirmationInput): Promise<FoundryRun> {
    const input = SourceConfirmationInputSchema.parse(rawInput);
    return this.mutate(async () => {
      const asOf = this.evaluationAsOf();
      const data = await this.read(asOf);
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (this.refreshActive(data, id)) throw new RunRefreshInProgressError('Source refresh is in progress');
      if (!run.capture || !this.immutableCaptureResolver) throw new Error('Source confirmation is available only for immutable real URL runs');
      const record = await this.immutableCaptureResolver.get(run.capture.currentAttemptId);
      if (!record) throw new Error('Immutable current capture is unavailable');
      const updated = this.normalizeDerivedStatus(confirmRealUrlRun(run, record, input, asOf), asOf);
      data.runs[index] = updated; await this.write(data); return updated;
    });
  }

  async updateArtifact(id: string, edit: ArtifactEdit): Promise<FoundryRun> {
    return this.mutate(async () => {
      const asOf = this.evaluationAsOf();
      const data = await this.read(asOf);
      const run = data.runs.find((candidate) => candidate.id === id);
      if (!run) throw new Error('Run not found');
      if (!run.artifact) throw new Error('Compatibility edit endpoint supports Quick Note runs only');
      const update = ArtifactUpdateSchema.parse({
        editor: edit.editor, expectedVersion: edit.expectedVersion,
        expectedArtifactVersion: run.artifact.version,
        payload: QuickNoteSchema.parse({ ...run.artifact.payload, headline: edit.headline, dek: edit.dek, body: edit.body }),
      });
      return this.updateArtifactInside(data, run, run.artifact.id, update, asOf);
    });
  }

  async updatePackArtifact(id: string, artifactId: string, rawUpdate: ArtifactUpdate): Promise<FoundryRun> {
    const update = ArtifactUpdateSchema.parse(rawUpdate);
    return this.mutate(async () => {
      const asOf = this.evaluationAsOf();
      const data = await this.read(asOf);
      const run = data.runs.find((candidate) => candidate.id === id);
      if (!run) throw new Error('Run not found');
      return this.updateArtifactInside(data, run, artifactId, update, asOf);
    });
  }

  private async updateArtifactInside(data: StoreFile, run: FoundryRun, artifactId: string, update: ArtifactUpdate, asOf: string): Promise<FoundryRun> {
    if (this.refreshActive(data, run.id)) throw new RunRefreshInProgressError('Source refresh is in progress');
    if (run.capture) throw new Error('Real URL public fields are server-owned; use source confirmation or refresh');
    if (run.version !== update.expectedVersion) throw new VersionConflictError(`Expected version ${update.expectedVersion}; current version is ${run.version}`);
    const artifactIndex = run.artifactPack.completed.findIndex((candidate) => candidate.id === artifactId);
    if (artifactIndex < 0) throw new Error('Artifact not found');
    const current = run.artifactPack.completed[artifactIndex];
    if (current.version !== update.expectedArtifactVersion) throw new VersionConflictError(`Expected artifact version ${update.expectedArtifactVersion}; current version is ${current.version}`);
    if (current.type === 'insider_note_issue' && containsPropertyNamed(update.payload, 'image')) {
      throw new Error('Newsletter images are blocked until exact asset, placement, rights and release binding is implemented');
    }
    let payload = parsePayloadForArtifact(current, update.payload);
    const legacyEditableLineageTypes = new Set<ArtifactVersion['type']>([
      'quick_note', 'article_draft', 'article_metadata', 'ask_answer', 'internal_link_plan', 'seo_metadata_proposal',
    ]);
    if (!legacyEditableLineageTypes.has(current.type)
        && JSON.stringify(collectEmbeddedClaimReferences(payload)) !== JSON.stringify(collectEmbeddedClaimReferences(current.payload))) {
      throw new Error('Payload-declared claim references are immutable server-owned lineage metadata');
    }
    if (current.type === 'quick_note') {
      const next = QuickNoteSchema.parse(payload);
      if (JSON.stringify(next.sources.map((source) => source.note)) !== JSON.stringify(current.payload.sources.map((source) => source.note))) {
        throw new Error('Quick Note source notes are server-derived and cannot be edited');
      }
    }
    if (current.type === 'ask_answer') {
      const next = AskAnswerPayloadSchema.parse(payload);
      if (next.provenance_footer !== current.payload.provenance_footer) {
        throw new Error('Ask provenance footer is a server-derived template and cannot be edited');
      }
    }
    let dependencies = current.dependencies;
    if (current.type === 'article_metadata') {
      const metadata = ArticleMetadataPayloadSchema.parse(payload);
      const retained = current.dependencies.filter((dependency) => dependency.kind === 'media_rights'
        && metadata.heroBinding?.rights.id === dependency.id
        && metadata.heroBinding.rights.version === dependency.version
        && metadata.heroBinding.contentHash === dependency.contentHash
        && Boolean(metadata.heroImage)
        && metadata.heroBinding.asset.contentHash === hashValue(metadata.heroImage)
        && metadata.heroBinding.contentHash === hashValue({
          schemaVersion: metadata.heroBinding.schemaVersion,
          asset: metadata.heroBinding.asset,
          placementPath: metadata.heroBinding.placementPath,
          surface: metadata.heroBinding.surface,
          rights: metadata.heroBinding.rights,
          recognisablePeople: metadata.heroBinding.recognisablePeople,
          releaseIds: [...metadata.heroBinding.releaseIds].sort(),
        })
        && (!metadata.heroBinding.recognisablePeople || metadata.heroBinding.releaseIds.length > 0));
      dependencies = [...current.dependencies.filter((dependency) => dependency.kind !== 'media_rights'), ...retained];
      payload = ArticleMetadataPayloadSchema.parse({ ...metadata, astroPatchReady: Boolean(metadata.heroImage && metadata.heroBinding && retained.length === 1) });
    }
    if (current.type === 'social_media_brief') {
      const brief = SocialMediaBriefPayloadSchema.parse(payload);
      const retained = current.dependencies.filter((dependency) => dependency.kind === 'media_rights'
        && dependency.id === brief.placementRights.rightsId
        && dependency.version === brief.placementRights.rightsVersion
        && dependency.contentHash === socialMediaRightsBindingHash(brief)
        && dependency.status === 'cleared');
      dependencies = [...current.dependencies.filter((dependency) => dependency.kind !== 'media_rights'), ...retained];
    }
    if (isPreproductionArtifactType(current.type)) {
      const preproduction = parsePreproductionPayload(current.type, payload);
      const retained = current.dependencies.filter((dependency) => dependency.kind === 'media_rights'
        && preproduction.boundary.mediaAssignments.some((assignment) => (
          assignment.rights.id === dependency.id
          && assignment.rights.version === dependency.version
          && mediaRightsBindingHash(assignment) === dependency.contentHash
          && dependency.status === 'cleared'
        )));
      dependencies = [...current.dependencies.filter((dependency) => dependency.kind !== 'media_rights'), ...retained];
    }
    const claimUsage = legacyEditableLineageTypes.has(current.type)
      ? current.claimUsage.map((usage) => {
        const value = resolveArtifactPath(payload, usage.path);
        if (value === undefined || value === null || value === '') throw new Error(`Server lineage policy cannot resolve ${usage.path} after the edit`);
        return { ...usage, contentHash: hashValue(value) };
      })
      : current.claimUsage;
    const changed = withArtifactHash({
      ...current, version: current.version + 1, payload, claimUsage, dependencies,
      publicFieldLineage: buildPublicFieldLineage(current.type, payload, claimUsage, run.claimSet.claims),
      gateResults: current.gateResults,
    }, run.claimSet.claims, { completeClaimUsage: false });
    const completed = run.artifactPack.completed.map((artifact, index) => index === artifactIndex ? changed : artifact);
    const candidate = FoundryRunSchema.parse({
      ...run, version: run.version + 1, updatedAt: asOf, evaluationAsOf: asOf,
      artifact: run.artifact?.id === changed.id && changed.type === 'quick_note' ? changed : run.artifact,
      artifactPack: { ...run.artifactPack, version: run.artifactPack.version + 1, completed },
      audit: [...run.audit, { at: asOf, actor: update.editor, type: 'artifact_edited', detail: `Edited artifact ${changed.id}; server-derived lineage and transitive dependency reconciliation ran.` }],
    });
    const updated = this.normalizeDerivedStatus(candidate, asOf);
    const index = data.runs.findIndex((candidateRun) => candidateRun.id === run.id);
    data.runs[index] = updated; await this.write(data); return updated;
  }

  async createCaptureProjection(input: CaptureProjection): Promise<{ projection: CaptureProjection; created: boolean }> {
    return this.mutate(async () => {
      const projection = CaptureProjectionSchema.parse(input);
      const data = await this.read();
      const existing = data.captureProjections.find((item) => item.idempotencyKeyHash === projection.idempotencyKeyHash);
      if (existing) {
        if (existing.requestFingerprint !== projection.requestFingerprint || existing.operationFingerprint !== projection.operationFingerprint) {
          throw new CaptureProjectionConflictError('Idempotency key is bound to a different capture operation');
        }
        return { projection: existing, created: false };
      }
      if (data.captureProjections.some((item) => ['queued', 'capturing'].includes(item.state))) throw new CaptureBusyError('Only one local URL capture may run at a time');
      if (projection.operation === 'refresh') {
        const run = data.runs.find((item) => item.id === projection.refreshRunId);
        if (!run?.capture) throw new CaptureRefreshTargetError('Refresh target is not a real URL run');
        if (run.version !== projection.expectedRunVersion) throw new VersionConflictError(`Expected version ${projection.expectedRunVersion}; current version is ${run.version}`);
        const current = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId);
        if (!current || current.requestFingerprint !== projection.requestFingerprint) throw new CaptureRefreshTargetError('Refresh request does not match the exact source identity');
      }
      data.captureProjections.unshift(projection); await this.write(data); return { projection, created: true };
    });
  }

  async markCaptureProjectionCapturing(id: string, at: string): Promise<CaptureProjection> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.captureProjections.findIndex((projection) => projection.id === id);
      if (index < 0) throw new Error('Capture projection not found');
      const current = data.captureProjections[index];
      if (current.summary || current.state !== 'queued') return current;
      const updated = CaptureProjectionSchema.parse({ ...current, state: 'capturing', updatedAt: at });
      data.captureProjections[index] = updated; await this.write(data); return updated;
    });
  }

  async failCaptureProjection(id: string, code: string, at: string): Promise<CaptureProjection> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.captureProjections.findIndex((projection) => projection.id === id);
      if (index < 0) throw new Error('Capture projection not found');
      const current = data.captureProjections[index];
      if (current.summary) return current;
      const updated = CaptureProjectionSchema.parse({ ...current, state: 'failed', updatedAt: at, failure: { stage: 'storage', code } });
      data.captureProjections[index] = updated; await this.write(data); return updated;
    });
  }

  async finalizeCaptureProjection(id: string, record: CaptureRecord): Promise<{ projection: CaptureProjection; run?: FoundryRun }> {
    return this.mutate(async () => {
      const asOf = this.evaluationAsOf();
      const data = await this.read(asOf);
      const projectionIndex = data.captureProjections.findIndex((projection) => projection.id === id);
      if (projectionIndex < 0) throw new Error('Capture projection not found');
      const projection = data.captureProjections[projectionIndex];
      if (projection.attemptId !== record.attempt.id || projection.requestFingerprint !== record.attempt.requestFingerprint
          || projection.idempotencyKeyHash !== record.attempt.idempotencyKeyHash) throw new CaptureProjectionConflictError('Immutable capture record does not match its projection');
      if (projection.summary) return { projection, run: projection.runId ? data.runs.find((run) => run.id === projection.runId) : undefined };
      const summary = summarizeCapture(record);
      let run: FoundryRun | undefined;
      let materializationFailure: CaptureProjection['materializationFailure'];
      if (projection.refreshRunId) {
        const runIndex = data.runs.findIndex((item) => item.id === projection.refreshRunId);
        if (runIndex < 0) materializationFailure = { code: 'refresh_target_missing' };
        else {
          const current = data.runs[runIndex];
          if (!current.capture) materializationFailure = { code: 'refresh_target_invalid' };
          else {
            try {
              if (record.attempt.state === 'extracted') run = refreshRealUrlRun(current, record, projection.actor);
              if (record.attempt.state === 'no_story') run = staleRealUrlRunForNoStory(current, record, projection.actor);
              if (run) { run = this.normalizeDerivedStatus(run, asOf); data.runs[runIndex] = run; }
            } catch { materializationFailure = { code: 'workflow_materialization_failed' }; }
          }
        }
      } else if (record.attempt.state === 'extracted') {
        try {
          const candidate = this.normalizeDerivedStatus(buildRealUrlRun(record, projection.actor, `real-url:${projection.idempotencyKeyHash}`), asOf);
          await this.validateImmutableRun(candidate);
          await this.sealProvenOriginAuthority(candidate, record);
          run = data.runs.find((item) => item.idempotencyKey === candidate.idempotencyKey) ?? candidate;
          if (!data.runs.some((item) => item.id === run!.id)) data.runs.unshift(run);
        } catch { materializationFailure = { code: 'workflow_materialization_failed' }; }
      }
      const updated = CaptureProjectionSchema.parse({
        ...projection, state: record.attempt.state, updatedAt: record.attempt.completedAt, summary,
        runId: run?.id ?? projection.refreshRunId, failure: undefined, materializationFailure,
      });
      data.captureProjections[projectionIndex] = updated; await this.write(data); return { projection: updated, run };
    });
  }
}
