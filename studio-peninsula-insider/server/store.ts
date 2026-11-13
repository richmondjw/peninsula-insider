import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import {
  ArticleDraftPayloadSchema,
  ArticleMetadataPayloadSchema,
  ArtifactUpdateSchema,
  ArtifactVersionSchema,
  AskAnswerPayloadSchema,
  FoundryRunSchema,
  InternalLinkPlanPayloadSchema,
  QuickNoteSchema,
  SeoMetadataProposalPayloadSchema,
  type ArtifactEdit,
  type ArtifactUpdate,
  type ArtifactVersion,
  type FoundryRun,
  type GateResult,
  type ReviewDecision,
} from '../shared/contracts.js';
import { artifactDependenciesCurrent, evaluateArtifactGates, evaluateQuickNoteGates, hashValue, migrateLegacyRun } from './fixture-runner.js';

interface StoreFile {
  schemaVersion: 'pi.foundry-file-store.v1';
  runs: FoundryRun[];
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
  const requiredFailure = run.artifactPack.failed.some((failure) => failure.required)
    || run.artifactPack.completed.some((artifact) => requiredKeys.has(artifact.key) && blockingGateFailed(artifact));
  if (run.blockers.length > 0 || requiredFailure) return 'needs_revision';

  const requiredIds = requiredArtifactIds(run);
  const requiredRejected = run.artifactPack.reviews.some((review) => (
    review.status === 'current' && review.decision === 'rejected' && requiredIds.has(review.artifactId)
  ));
  if (requiredRejected) return 'needs_revision';

  // Run-level accepted is retained only for the single-artifact v0.1 contract.
  if (run.recipe.id === 'quick_note_v1' && run.artifact) {
    const current = run.artifactPack.reviews.find((review) => review.artifactId === run.artifact?.id && review.status === 'current');
    if (current?.decision === 'accepted') return 'accepted';
    if (current?.decision === 'rejected') return 'rejected';
  }
  return 'ready_for_review';
}

function normalizeDerivedStatus(run: FoundryRun): FoundryRun {
  const asOf = new Date().toISOString();
  const completed = run.artifactPack.completed.map((artifact) => {
    const current = artifactDependenciesCurrent(run, artifact);
    const evaluatedGates = gatesForUpdatedArtifact(
      run, artifact, artifact.payload, artifact.factualSegmentIds, artifact.claimUsage, asOf,
    );
    const gateResults = evaluatedGates.map((evaluated) => {
      if (artifact.type !== 'quick_note') return evaluated;
      const storedFailure = artifact.gateResults.find((stored) => stored.gate === evaluated.gate && !stored.passed);
      return storedFailure ?? evaluated;
    }).filter((result) => result.gate !== 'dependency_current');
    gateResults.push(current
      ? {
        gate: 'dependency_current', scope: 'artifact', passed: true, blocking: false,
        detail: 'Claim-set, angle, artifact and media-rights dependencies match their current snapshots.', claimIds: [],
      }
      : {
        gate: 'dependency_current', scope: 'artifact', passed: false, blocking: true,
        detail: 'One or more claim-set, angle, artifact or media-rights dependencies are stale; regenerate this artifact.', claimIds: [],
      });
    return ArtifactVersionSchema.parse({ ...artifact, gateResults });
  });
  const currentById = new Map(completed.map((artifact) => [artifact.id, artifact]));
  const reviews = run.artifactPack.reviews.map((review) => {
    if (review.status === 'stale') return review;
    const artifact = currentById.get(review.artifactId);
    const snapshotMatches = artifact
      && review.artifactVersion === artifact.version
      && JSON.stringify(review.dependencySnapshot) === JSON.stringify(artifact.dependencies)
      && !blockingGateFailed(artifact);
    return snapshotMatches ? review : { ...review, status: 'stale' as const };
  });
  const compatibilityArtifact = run.artifact
    ? completed.find((artifact) => artifact.id === run.artifact?.id && artifact.type === 'quick_note')
    : undefined;
  const compatibilityReviewCurrent = compatibilityArtifact && reviews.some((review) => (
    review.artifactId === compatibilityArtifact.id && review.status === 'current'
  ));
  const normalized = FoundryRunSchema.parse({
    ...run,
    artifact: compatibilityArtifact,
    review: compatibilityReviewCurrent ? run.review : undefined,
    artifactPack: { ...run.artifactPack, completed, reviews },
  });
  return FoundryRunSchema.parse({ ...normalized, status: deriveRunStatus(normalized) });
}

function parseStoredRun(input: unknown): FoundryRun {
  const current = FoundryRunSchema.safeParse(input);
  return normalizeDerivedStatus(current.success ? current.data : migrateLegacyRun(input));
}

function parsePayloadForArtifact(artifact: ArtifactVersion, payload: unknown): ArtifactVersion['payload'] {
  switch (artifact.type) {
    case 'quick_note': return QuickNoteSchema.parse(payload);
    case 'article_draft': return ArticleDraftPayloadSchema.parse(payload);
    case 'article_metadata': return ArticleMetadataPayloadSchema.parse(payload);
    case 'ask_answer': return AskAnswerPayloadSchema.parse(payload);
    case 'internal_link_plan': return InternalLinkPlanPayloadSchema.parse(payload);
    case 'seo_metadata_proposal': return SeoMetadataProposalPayloadSchema.parse(payload);
  }
}

function gatesForUpdatedArtifact(
  run: FoundryRun,
  artifact: ArtifactVersion,
  payload: unknown,
  factualSegmentIds: string[],
  claimUsage: ArtifactVersion['claimUsage'],
  asOf = run.updatedAt,
): GateResult[] {
  if (artifact.type === 'quick_note') {
    const note = QuickNoteSchema.parse(payload);
    return evaluateQuickNoteGates(note, run.claimSet.claims, claimUsage.flatMap((usage) => usage.claimIds), asOf);
  }
  const contract = artifact.type === 'ask_answer'
    ? { gate: 'ask_answer_contract' as const, schema: AskAnswerPayloadSchema }
    : artifact.type === 'article_metadata' && ArticleMetadataPayloadSchema.parse(payload).astroPatchReady
      ? { gate: 'astro_article_contract' as const, schema: ArticleMetadataPayloadSchema }
      : undefined;
  const results = evaluateArtifactGates(
    payload,
    run.claimSet.claims,
    factualSegmentIds,
    claimUsage,
    asOf,
    contract,
  );
  if (artifact.type === 'article_metadata') {
    const metadata = ArticleMetadataPayloadSchema.parse(payload);
    results.push(metadata.astroPatchReady
      ? { gate: 'astro_patch_ready', scope: 'artifact', passed: true, blocking: false, detail: 'A separately rights-cleared hero placement makes the Astro patch adapter available.', claimIds: [] }
      : { gate: 'astro_patch_ready', scope: 'artifact', passed: false, blocking: false, detail: 'Text artifacts remain reviewable, but Astro patch export waits for a rights-cleared hero placement.', claimIds: [] });
  }
  return results;
}

export class VersionConflictError extends Error {}

export class FileFoundryStore {
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string, allowedRoot = dirname(filePath)) {
    const root = resolve(allowedRoot);
    this.filePath = resolve(filePath);
    const candidate = relative(root, this.filePath);
    if (candidate.startsWith('..') || isAbsolute(candidate)) {
      throw new Error('Foundry store path must remain inside its configured data root');
    }
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release = () => {};
    this.mutationQueue = new Promise<void>((resolveQueue) => { release = resolveQueue; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async read(): Promise<StoreFile> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as { schemaVersion?: string; runs?: unknown[] };
      if (parsed.schemaVersion !== 'pi.foundry-file-store.v1' || !Array.isArray(parsed.runs)) throw new Error('Unsupported Foundry store schema');
      return { schemaVersion: parsed.schemaVersion, runs: parsed.runs.map(parseStoredRun) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 'pi.foundry-file-store.v1', runs: [] };
      throw error;
    }
  }

  private async write(data: StoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      await rename(temporary, this.filePath);
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async list(): Promise<FoundryRun[]> {
    return (await this.read()).runs;
  }

  async get(id: string): Promise<FoundryRun | undefined> {
    return (await this.read()).runs.find((run) => run.id === id);
  }

  async getByIdempotencyKey(key: string): Promise<FoundryRun | undefined> {
    return (await this.read()).runs.find((run) => run.idempotencyKey === key);
  }

  async create(run: FoundryRun): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const existing = data.runs.find((item) => item.idempotencyKey === run.idempotencyKey);
      if (existing) return existing;
      const parsed = normalizeDerivedStatus(FoundryRunSchema.parse(run));
      data.runs.unshift(parsed);
      await this.write(data);
      return parsed;
    });
  }

  /**
   * Replaces a run's captured source with the next immutable revision inside one
   * serialised transaction. The caller supplies the already-built next run; read-time
   * reconciliation then stales every review decision that depended on the old revision.
   */
  async applySourceRefresh(
    id: string,
    expectedVersion: number,
    refresh: (previous: FoundryRun) => FoundryRun,
  ): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const previous = data.runs[index];
      if (previous.version !== expectedVersion) {
        throw new VersionConflictError(`Expected version ${expectedVersion}; current version is ${previous.version}`);
      }
      const updated = normalizeDerivedStatus(FoundryRunSchema.parse(refresh(previous)));
      data.runs[index] = updated;
      await this.write(data);
      return updated;
    });
  }

  async review(id: string, decision: ReviewDecision): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (run.version !== decision.expectedVersion) {
        throw new VersionConflictError(`Expected version ${decision.expectedVersion}; current version is ${run.version}`);
      }
      const artifactId = decision.artifactId ?? run.artifact?.id;
      if (!artifactId) throw new Error('artifactId is required for an artifact pack review');
      const artifact = run.artifactPack.completed.find((candidate) => candidate.id === artifactId);
      if (!artifact) throw new Error('Artifact not found in completed pack items');
      if (decision.expectedArtifactVersion && decision.expectedArtifactVersion !== artifact.version) {
        throw new VersionConflictError(`Expected artifact version ${decision.expectedArtifactVersion}; current version is ${artifact.version}`);
      }
      if (decision.decision === 'accepted' && blockingGateFailed(artifact)) {
        throw new Error('Artifact has unresolved blocking gates');
      }
      const now = new Date().toISOString();
      const reviews = run.artifactPack.reviews
        .map((review) => review.artifactId === artifact.id && review.status === 'current' ? { ...review, status: 'stale' as const } : review);
      reviews.push({
        id: `review-${randomUUID()}`,
        artifactId: artifact.id,
        artifactVersion: artifact.version,
        decision: decision.decision,
        reviewer: decision.reviewer,
        note: decision.note,
        decidedAt: now,
        status: 'current',
        dependencySnapshot: artifact.dependencies,
        authority: 'draft_handoff_only',
      });
      const candidate = FoundryRunSchema.parse({
        ...run,
        version: run.version + 1,
        updatedAt: now,
        artifactPack: { ...run.artifactPack, version: run.artifactPack.version + 1, reviews },
        review: run.artifact?.id === artifact.id ? {
          decision: decision.decision,
          reviewer: decision.reviewer,
          note: decision.note,
          decidedAt: now,
        } : run.review,
        audit: [...run.audit, {
          at: now,
          actor: decision.reviewer,
          type: 'artifact_review_decision',
          detail: `${decision.decision} draft handoff for artifact ${artifact.id}; publication authority was not granted.`,
        }],
      });
      const updated = normalizeDerivedStatus(candidate);
      data.runs[index] = updated;
      await this.write(data);
      return updated;
    });
  }

  async updateArtifact(id: string, edit: ArtifactEdit): Promise<FoundryRun> {
    const input = ArtifactUpdateSchema.parse({
      editor: edit.editor,
      expectedVersion: edit.expectedVersion,
      expectedArtifactVersion: 1,
      payload: undefined,
    });
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (!run.artifact) throw new Error('Compatibility edit endpoint supports quick-note runs only');
      input.expectedArtifactVersion = run.artifact.version;
      input.payload = QuickNoteSchema.parse({ ...run.artifact.payload, headline: edit.headline, dek: edit.dek, body: edit.body });
      const updated = this.applyArtifactUpdate(run, run.artifact.id, input);
      data.runs[index] = updated;
      await this.write(data);
      return updated;
    });
  }

  async updatePackArtifact(id: string, artifactId: string, rawUpdate: ArtifactUpdate): Promise<FoundryRun> {
    const update = ArtifactUpdateSchema.parse(rawUpdate);
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const updated = this.applyArtifactUpdate(data.runs[index], artifactId, update);
      data.runs[index] = updated;
      await this.write(data);
      return updated;
    });
  }

  private applyArtifactUpdate(run: FoundryRun, artifactId: string, update: ArtifactUpdate): FoundryRun {
    if (run.version !== update.expectedVersion) {
      throw new VersionConflictError(`Expected version ${update.expectedVersion}; current version is ${run.version}`);
    }
    const artifactIndex = run.artifactPack.completed.findIndex((candidate) => candidate.id === artifactId);
    if (artifactIndex < 0) throw new Error('Artifact not found');
    const current = run.artifactPack.completed[artifactIndex];
    if (current.version !== update.expectedArtifactVersion) {
      throw new VersionConflictError(`Expected artifact version ${update.expectedArtifactVersion}; current version is ${current.version}`);
    }
    let payload = parsePayloadForArtifact(current, update.payload);
    let dependencies = current.dependencies;
    let factualSegmentIds = update.factualSegmentIds;
    let claimUsage = update.claimUsage;
    if (current.type === 'quick_note') {
      factualSegmentIds = ['quick-note-copy'];
      claimUsage = [{
        segmentId: 'quick-note-copy', path: '$',
        claimIds: current.claimUsage.flatMap((usage) => usage.claimIds), contentHash: hashValue(payload),
      }];
    } else if (!factualSegmentIds || !claimUsage) {
      throw new Error('Non-quick artifact edits require factualSegmentIds and claimUsage to be replaced atomically with the payload');
    }
    if (current.type === 'article_metadata') {
      const metadata = ArticleMetadataPayloadSchema.parse(payload);
      const retainedMedia = current.dependencies.filter((dependency) => (
        dependency.kind === 'media_rights'
        && metadata.heroImage
        && dependency.contentHash === hashValue(metadata.heroImage)
      ));
      dependencies = [
        ...current.dependencies.filter((dependency) => dependency.kind !== 'media_rights'),
        ...retainedMedia,
      ];
      payload = ArticleMetadataPayloadSchema.parse({
        ...metadata,
        astroPatchReady: Boolean(metadata.heroImage && retainedMedia.length === 1),
      });
    }
    const changed = ArtifactVersionSchema.parse({
      ...current,
      version: current.version + 1,
      contentHash: hashValue(payload),
      payload,
      factualSegmentIds,
      claimUsage,
      dependencies,
      gateResults: gatesForUpdatedArtifact(run, current, payload, factualSegmentIds, claimUsage),
    });
    const completed = run.artifactPack.completed.map((artifact, index) => index === artifactIndex ? changed : artifact);
    const now = new Date().toISOString();
    const candidate = FoundryRunSchema.parse({
      ...run,
      version: run.version + 1,
      updatedAt: now,
      artifact: run.artifact?.id === changed.id && changed.type === 'quick_note' ? changed : run.artifact,
      review: run.artifact?.id === changed.id ? undefined : run.review,
      artifactPack: {
        ...run.artifactPack,
        version: run.artifactPack.version + 1,
        completed,
        reviews: run.artifactPack.reviews,
      },
      audit: [...run.audit, {
        at: now,
        actor: update.editor,
        type: 'artifact_edited',
        detail: `Edited artifact ${changed.id}; read-time dependency reconciliation invalidated its review and all transitive dependent reviews.`,
      }],
    });
    return normalizeDerivedStatus(candidate);
  }
}
