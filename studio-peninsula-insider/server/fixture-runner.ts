import { createHash } from 'node:crypto';
import type { z } from 'zod';
import {
  ArticleDraftPayloadSchema,
  ArticleMetadataPayloadSchema,
  ArtifactVersionSchema,
  AskAnswerPayloadSchema,
  ClaimSchema,
  FoundryRunSchema,
  InternalLinkPlanPayloadSchema,
  LegacyFoundryRunSchema,
  QuickNoteSchema,
  RecipeDefinitionSchema,
  SeoMetadataProposalPayloadSchema,
  type ArtifactVersion,
  type ArtifactDependency,
  type Claim,
  type ClaimSetVersion,
  type FoundryRun,
  type GateResult,
  type LegacyFoundryRun,
  type RecipeDefinition,
} from '../shared/contracts.js';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const hashValue = (value: unknown) => hash(JSON.stringify(value));

export function resolveArtifactPath(payload: unknown, path: string): unknown {
  if (path === '$') return payload;
  const paragraph = path.match(/^\$\.body::paragraph\[(\d+)\]$/);
  if (paragraph) {
    if (!payload || typeof payload !== 'object' || typeof (payload as { body?: unknown }).body !== 'string') return undefined;
    return (payload as { body: string }).body.split(/\n\s*\n/)[Number(paragraph[1])];
  }
  if (!path.startsWith('$.')) return undefined;
  const tokens = path.slice(2).match(/[^.\[\]]+|\[(\d+)\]/g);
  if (!tokens) return undefined;
  let current: unknown = payload;
  for (const token of tokens) {
    const index = token.match(/^\[(\d+)\]$/);
    if (index) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(index[1])];
    } else {
      if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[token];
    }
  }
  return current;
}

function bindClaimUsage<T extends Array<{ segmentId: string; path: string; claimIds: string[] }>>(payload: unknown, usage: T) {
  return usage.map((item) => ({ ...item, contentHash: hashValue(resolveArtifactPath(payload, item.path)) }));
}

export const FIXTURE_ID = 'red-hill-winter-lunch';
export const URL_ARTICLE_FIXTURE_ID = 'red-hill-url-article';

const PRICE_PATTERN = /(?:\$\s?\d|\bAUD\b|\bprice(?:d|s|band)?\b)/i;

export const QUICK_NOTE_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1',
  id: 'quick_note_v1',
  version: 1,
  label: 'Quick note',
  sourceKinds: ['url'],
  artifacts: [{
    key: 'quick-note',
    type: 'quick_note',
    required: true,
    dependsOnKeys: [],
    targetContract: 'astro.quick-notes.v1',
  }],
  textOnlyAllowed: true,
  externalCalls: false,
});

export const URL_ARTICLE_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1',
  id: 'url_article_v1',
  version: 1,
  label: 'URL article and Ask pack',
  sourceKinds: ['url'],
  artifacts: [
    { key: 'article-draft', type: 'article_draft', required: true, dependsOnKeys: [], targetContract: 'astro.articles.body.v1' },
    { key: 'article-metadata', type: 'article_metadata', required: true, dependsOnKeys: ['article-draft'], targetContract: 'astro.articles.frontmatter.v2026-08-21' },
    { key: 'ask-answer', type: 'ask_answer', required: true, dependsOnKeys: [], targetContract: 'concierge.ask.response.v1' },
    { key: 'internal-link-plan', type: 'internal_link_plan', required: false, dependsOnKeys: ['article-draft'], targetContract: 'internal.link-plan.v1' },
    { key: 'seo-metadata', type: 'seo_metadata_proposal', required: false, dependsOnKeys: ['article-draft'], targetContract: 'astro.base-layout.meta.v1' },
  ],
  textOnlyAllowed: true,
  externalCalls: false,
});

function gate(
  gateName: GateResult['gate'],
  passed: boolean,
  detail: string,
  claimIds: string[] = [],
  blocking = true,
): GateResult {
  return passed
    ? { gate: gateName, scope: 'artifact', passed: true, blocking: false, detail, claimIds }
    : { gate: gateName, scope: 'artifact', passed: false, blocking, detail, claimIds };
}

function claimIsUsable(claim: Claim | undefined, asOf: string): boolean {
  return Boolean(
    claim
    && !claim.restrictedFromArtifacts
    && ['supported', 'approved'].includes(claim.verification)
    && claim.evidence.length > 0
    && (!claim.expiresAt || claim.expiresAt > asOf),
  );
}

export function evaluateArtifactGates(
  payload: unknown,
  claims: Claim[],
  factualSegmentIds: string[],
  claimUsage: ArtifactVersion['claimUsage'],
  asOf: string,
  contract?: { gate: 'astro_article_contract' | 'ask_answer_contract'; schema: z.ZodType },
): GateResult[] {
  const publicCopy = JSON.stringify(payload);
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const usageBySegment = new Map(claimUsage.map((usage) => [usage.segmentId, usage]));
  const usedClaimIds = [...new Set(claimUsage.flatMap((usage) => usage.claimIds))];
  const uniqueSegments = new Set(factualSegmentIds);
  const completeUsage = uniqueSegments.size === factualSegmentIds.length
    && claimUsage.length === factualSegmentIds.length
    && claimUsage.every((usage) => uniqueSegments.has(usage.segmentId))
    && factualSegmentIds.every((segmentId) => {
    const usage = usageBySegment.get(segmentId);
    if (!usage || usage.claimIds.length === 0) return false;
    const value = resolveArtifactPath(payload, usage.path);
    return value !== undefined && value !== null && value !== '' && usage.contentHash === hashValue(value);
  });
  const paragraphUsages = claimUsage.filter((usage) => /^\$\.body::paragraph\[\d+\]$/.test(usage.path));
  const paragraphCoverage = paragraphUsages.length === 0 || (
    payload !== null
    && typeof payload === 'object'
    && typeof (payload as { body?: unknown }).body === 'string'
    && (payload as { body: string }).body.split(/\n\s*\n/).length === paragraphUsages.length
    && paragraphUsages.every((usage, index) => usage.path === `$.body::paragraph[${index}]`)
  );
  const lineageComplete = completeUsage && paragraphCoverage;
  const supportedClaims = usedClaimIds.length > 0 && usedClaimIds.every((claimId) => claimIsUsable(claimsById.get(claimId), asOf));
  const results: GateResult[] = [
    gate('no_price', !PRICE_PATTERN.test(publicCopy), 'Public artifact content must not contain pricing.'),
    gate('no_em_dash', !/—/.test(publicCopy), 'Public artifact content must not contain em dashes; en dashes remain valid for ranges.'),
    gate('claim_usage_complete', lineageComplete, lineageComplete ? 'Every factual segment resolves to current content and maps to at least one claim.' : 'A factual segment is missing, changed, unresolved or lacks a claim mapping.', usedClaimIds),
    gate('supported_claims_only', supportedClaims, supportedClaims ? 'Every used claim is current, supported, evidenced and unrestricted.' : 'A used claim is missing, expired, unsupported, unevidenced or restricted.', usedClaimIds),
    gate('dependency_current', true, 'Every dependency points to the current locked version.'),
  ];
  if (contract) {
    const parsed = contract.schema.safeParse(payload);
    results.push(gate(contract.gate, parsed.success, parsed.success ? 'Payload matches the target contract.' : 'Payload does not match the target contract.'));
  }
  return results;
}

export function evaluateQuickNoteGates(
  payload: { headline: string; dek?: string; body: string },
  claims: Claim[],
  claimIds: string[],
): GateResult[] {
  return evaluateArtifactGates(
    payload,
    claims,
    ['quick-note-copy'],
    bindClaimUsage(payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds }]),
    '2026-08-21T05:00:00.000Z',
  );
}

function fixtureSource(actor: string) {
  const capturedAt = '2026-08-21T05:00:00.000Z';
  const sourceUrl = 'https://example.test/red-hill-winter-lunch';
  const sourceId = 'source-url-red-hill';
  const rawClaims = [
    { id: 'claim-location', text: 'The venue is in Red Hill.', origin: 'external_fact', verification: 'supported', locator: 'p:1' },
    { id: 'claim-date', text: 'The winter lunch is available on Saturday 29 August.', origin: 'external_fact', verification: 'supported', locator: 'p:2' },
    { id: 'claim-booking', text: 'Booking is required for the winter lunch.', origin: 'external_fact', verification: 'supported', locator: 'p:3' },
    { id: 'claim-observation', text: 'The covered dining room suits a wet-weather lunch.', origin: 'first_party_observation', verification: 'approved', locator: 'note:1' },
  ] as const;
  const evidence = (excerpt: string, locator: string) => [{
    sourceItemId: sourceId,
    locatorType: 'paragraph' as const,
    locator,
    excerpt,
    excerptHash: hash(excerpt),
    capturedAt,
  }];
  const claims = ClaimSchema.array().parse([
    ...rawClaims.map((claim) => ({ ...claim, evidence: evidence(claim.text, claim.locator), restrictedFromArtifacts: false })),
    { id: 'claim-expired', text: 'A preview service ran on Friday 14 August.', origin: 'external_fact', verification: 'supported', evidence: evidence('A preview service ran on Friday 14 August.', 'p:4'), expiresAt: '2026-08-15T00:00:00.000Z', restrictedFromArtifacts: false },
    { id: 'claim-unsupported', text: 'This is the Peninsula\'s best lunch.', origin: 'inference', verification: 'unsupported', evidence: [], restrictedFromArtifacts: true, restrictionReason: 'No independent evidence supports the superlative.' },
    { id: 'claim-price', text: 'The set menu is $95.', origin: 'external_fact', verification: 'supported', evidence: evidence('The set menu is $95.', 'p:5'), restrictedFromArtifacts: true, restrictionReason: 'PI outputs do not publish prices.' },
  ]);
  const claimSet: ClaimSetVersion = {
    schemaVersion: 'pi.claim-set.v1',
    id: 'claim-set-red-hill-winter-lunch',
    version: 1,
    contentHash: hashValue(claims),
    createdAt: capturedAt,
    lockedAt: capturedAt,
    lockedBy: actor,
    claims,
  };
  const bundle = {
    schemaVersion: 'pi.intake-bundle.v1' as const,
    id: `bundle-${FIXTURE_ID}`,
    title: 'Red Hill winter lunch fixture',
    submittedBy: actor,
    capturedAt,
    sourceItems: [{ id: sourceId, kind: 'url' as const, uri: sourceUrl, contentHash: hash(claims.map((claim) => claim.text).join('\n')), capturedAt }],
  };
  const angle = {
    id: 'angle-rainy-lunch',
    version: 1,
    label: 'Rainy-day lunch',
    framing: 'A practical, locally grounded wet-weather lunch option.',
    evidenceClaimIds: ['claim-location', 'claim-date', 'claim-observation'],
    selectedBy: 'fixture-policy',
  };
  return { capturedAt, sourceUrl, claims, claimSet, bundle, angle };
}

function claimSetDependency(claimSet: ClaimSetVersion) {
  return { kind: 'claim_set' as const, id: claimSet.id, version: claimSet.version, contentHash: claimSet.contentHash };
}

function angleDependency(angle: { id: string; version: number; label: string; framing: string; evidenceClaimIds: string[] }) {
  return { kind: 'angle' as const, id: angle.id, version: angle.version, contentHash: hashValue(angle) };
}

function withArtifactHash<T extends Omit<ArtifactVersion, 'contentHash'>>(artifact: T): ArtifactVersion {
  return ArtifactVersionSchema.parse({ ...artifact, contentHash: hashValue(artifact.payload) });
}

export function artifactDependenciesCurrent(
  run: FoundryRun,
  artifact: ArtifactVersion,
  visiting: Set<string> = new Set([artifact.id]),
): boolean {
  if (artifact.contentHash !== hashValue(artifact.payload)
    || artifact.angleId !== run.angle.id
    || artifact.angleVersion !== run.angle.version) return false;
  const claimSetDependencies = artifact.dependencies.filter((dependency) => dependency.kind === 'claim_set');
  const angleDependencies = artifact.dependencies.filter((dependency) => dependency.kind === 'angle');
  if (claimSetDependencies.length !== 1 || angleDependencies.length !== 1) return false;
  const mediaDependencies = artifact.dependencies.filter((dependency) => dependency.kind === 'media_rights');
  if (artifact.type === 'article_metadata') {
    if (artifact.payload.astroPatchReady !== Boolean(artifact.payload.heroImage && mediaDependencies.length === 1)) return false;
  } else if (mediaDependencies.length > 0) return false;

  const completedById = new Map(run.artifactPack.completed.map((candidate) => [candidate.id, candidate]));
  const dependencyCurrent = (dependency: ArtifactDependency): boolean => {
    switch (dependency.kind) {
      case 'claim_set':
        return dependency.id === run.claimSet.id
          && dependency.version === run.claimSet.version
          && dependency.contentHash === run.claimSet.contentHash
          && run.claimSet.contentHash === hashValue(run.claimSet.claims);
      case 'angle':
        return dependency.id === run.angle.id
          && dependency.version === run.angle.version
          && dependency.contentHash === hashValue(run.angle);
      case 'media_rights':
        return artifact.type === 'article_metadata'
          && Boolean(artifact.payload.heroImage)
          && dependency.status === 'cleared'
          && dependency.contentHash === hashValue(artifact.payload.heroImage);
      case 'artifact': {
        const target = completedById.get(dependency.id);
        if (!target || visiting.has(target.id)) return false;
        if (dependency.version !== target.version || dependency.contentHash !== target.contentHash) return false;
        return artifactDependenciesCurrent(run, target, new Set(visiting).add(target.id));
      }
    }
  };
  return artifact.dependencies.every(dependencyCurrent);
}

export function runFixture(actor: string, idempotencyKey: string): FoundryRun {
  const { capturedAt, sourceUrl, claims, claimSet, bundle, angle } = fixtureSource(actor);
  const payload = QuickNoteSchema.parse({
    headline: 'A wet-weather lunch option in Red Hill',
    dek: 'A covered dining room and a confirmed Saturday service make this one to keep for a rainy Peninsula day.',
    section: 'eat',
    tag: 'event',
    publishedAt: capturedAt,
    expiresAt: '2026-08-30T00:00:00.000Z',
    verifiedAt: capturedAt,
    verifiedBy: actor,
    sources: [{ kind: 'venue-site', url: sourceUrl, checkedAt: capturedAt }],
    status: 'draft',
    body: 'A covered dining room makes this Red Hill lunch a useful wet-weather option. The winter lunch is listed for Saturday 29 August, with booking required.',
  });
  const claimIds = ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'];
  const artifact = withArtifactHash({
    id: 'artifact-quick-note-red-hill',
    key: 'quick-note',
    version: 1,
    type: 'quick_note' as const,
    angleId: angle.id,
    angleVersion: angle.version,
    factualSegmentIds: ['quick-note-copy'],
    claimUsage: bindClaimUsage(payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds }]),
    claimIds,
    dependencies: [claimSetDependency(claimSet), angleDependency(angle)],
    payload,
    gateResults: evaluateQuickNoteGates(payload, claims, claimIds),
  });
  return FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: `run-${hash(idempotencyKey).slice(0, 12)}`,
    idempotencyKey,
    version: 1,
    status: 'ready_for_review',
    createdAt: capturedAt,
    updatedAt: capturedAt,
    bundle,
    recipe: QUICK_NOTE_RECIPE,
    claimSet,
    claims,
    angle,
    artifact,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1',
      id: `pack-${hash(idempotencyKey).slice(0, 12)}`,
      version: 1,
      recipeId: QUICK_NOTE_RECIPE.id,
      recipeVersion: QUICK_NOTE_RECIPE.version,
      claimSetRef: claimSetDependency(claimSet),
      angleRef: { id: angle.id, version: angle.version },
      status: 'complete',
      completed: [artifact],
      failed: [],
      omitted: [],
      reviews: [],
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: 'Deterministic quick-note fixture reached review without external calls.' }],
  });
}

export function migrateLegacyRun(input: unknown): FoundryRun {
  const legacy: LegacyFoundryRun = LegacyFoundryRunSchema.parse(input);
  const claimSet: ClaimSetVersion = {
    schemaVersion: 'pi.claim-set.v1',
    id: `claim-set-${legacy.id}`,
    version: 1,
    contentHash: hashValue(legacy.claims),
    createdAt: legacy.createdAt,
    lockedAt: legacy.createdAt,
    lockedBy: legacy.bundle.submittedBy,
    claims: legacy.claims,
  };
  const dependency = claimSetDependency(claimSet);
  const selectedAngleDependency = angleDependency({ ...legacy.angle, version: 1 });
  const knownGates = new Set<GateResult['gate']>(['no_price', 'no_em_dash', 'supported_claims_only']);
  const gateResults = legacy.artifact.gateResults.map((result) => {
    if (!knownGates.has(result.gate as GateResult['gate'])) throw new Error(`Unsupported legacy gate ${result.gate}`);
    return gate(result.gate as GateResult['gate'], result.passed, result.detail, legacy.artifact.claimIds);
  });
  const artifact = withArtifactHash({
    id: legacy.artifact.id,
    key: 'quick-note',
    version: legacy.artifact.version,
    type: 'quick_note' as const,
    angleId: legacy.artifact.angleId,
    angleVersion: 1,
    factualSegmentIds: ['quick-note-copy'],
    claimUsage: bindClaimUsage(legacy.artifact.payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds: legacy.artifact.claimIds }]),
    claimIds: legacy.artifact.claimIds,
    dependencies: [dependency, selectedAngleDependency],
    payload: legacy.artifact.payload,
    gateResults,
  });
  const reviews = legacy.review ? [{
    id: `review-${hashValue([legacy.id, legacy.review]).slice(0, 16)}`,
    artifactId: artifact.id,
    artifactVersion: artifact.version,
    decision: legacy.review.decision,
    reviewer: legacy.review.reviewer,
    note: legacy.review.note,
    decidedAt: legacy.review.decidedAt,
    status: 'current' as const,
    dependencySnapshot: artifact.dependencies,
    authority: 'draft_handoff_only' as const,
  }] : [];
  return FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: legacy.id,
    idempotencyKey: legacy.idempotencyKey,
    version: legacy.version,
    status: legacy.status,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    bundle: legacy.bundle,
    recipe: QUICK_NOTE_RECIPE,
    claimSet,
    claims: legacy.claims,
    angle: { ...legacy.angle, version: 1 },
    artifact,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1',
      id: `pack-${legacy.id}`,
      version: Math.max(1, legacy.artifact.version),
      recipeId: QUICK_NOTE_RECIPE.id,
      recipeVersion: QUICK_NOTE_RECIPE.version,
      claimSetRef: dependency,
      angleRef: { id: legacy.angle.id, version: 1 },
      status: 'complete',
      completed: [artifact],
      failed: [],
      omitted: [],
      reviews,
    },
    blockers: legacy.blockers,
    review: legacy.review,
    audit: [...legacy.audit, {
      at: legacy.updatedAt,
      actor: 'store-migration',
      type: 'legacy_run_migrated',
      detail: 'Loaded the v0.1 quick-note snapshot into the v2 artifact-pack contract.',
    }],
  });
}

export function runUrlArticleFixture(
  actor: string,
  idempotencyKey: string,
  options: { failOptionalDerivative?: 'seo_metadata_proposal'; omitPlans?: boolean; includeClearedHero?: boolean } = {},
): FoundryRun {
  const { capturedAt, claims, claimSet, bundle, angle } = fixtureSource(actor);
  const dependency = claimSetDependency(claimSet);
  const selectedAngleDependency = angleDependency(angle);
  const articlePayload = ArticleDraftPayloadSchema.parse({
    slug: 'red-hill-wet-weather-lunch',
    body: [
      'A covered dining room gives this Red Hill lunch genuine wet-weather utility.',
      '',
      'The winter lunch is listed for Saturday 29 August, with booking required.',
      '',
      'That combination makes it a practical option when a Peninsula day needs an indoor anchor.',
    ].join('\n'),
  });
  const articleUsage = bindClaimUsage(articlePayload, [
    { segmentId: 'article-location', path: '$.body::paragraph[0]', claimIds: ['claim-location', 'claim-observation'] },
    { segmentId: 'article-date', path: '$.body::paragraph[1]', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'article-utility', path: '$.body::paragraph[2]', claimIds: ['claim-observation'] },
  ]);
  const article = withArtifactHash({
    id: 'artifact-article-red-hill', key: 'article-draft', version: 1, type: 'article_draft' as const,
    angleId: angle.id, angleVersion: angle.version,
    factualSegmentIds: articleUsage.map((usage) => usage.segmentId), claimUsage: articleUsage,
    dependencies: [dependency, selectedAngleDependency], payload: articlePayload,
    gateResults: evaluateArtifactGates(articlePayload, claims, articleUsage.map((usage) => usage.segmentId), articleUsage, capturedAt),
  });
  const articleDependency = { kind: 'artifact' as const, id: article.id, version: article.version, contentHash: article.contentHash };
  const clearedHero = options.includeClearedHero ? {
    src: '/images/sourced/place-red-hill-01.webp',
    alt: 'Red Hill hinterland in late autumn',
    credit: 'Peninsula Insider',
    license: 'other-licensed' as const,
  } : undefined;
  const metadataPayload = ArticleMetadataPayloadSchema.parse({
    title: 'A wet-weather lunch option in Red Hill',
    dek: 'A covered dining room and a confirmed Saturday service make this a practical rainy-day anchor.',
    author: 'editorial',
    houseByline: true,
    publishedAt: '2026-08-21',
    heroImage: clearedHero,
    astroPatchReady: Boolean(clearedHero),
    format: 'service',
    tags: ['red-hill', 'eat', 'rainy-day'],
    relatedVenues: [], relatedExperiences: [], relatedPlaces: [], relatedArticles: [], relatedItineraries: [],
    readingTimeMinutes: 2, featured: false, status: 'draft', lastVerified: '2026-08-21',
    aiSummary: ['Covered dining makes this a useful wet-weather lunch.', 'The listed service is Saturday 29 August.'],
    faq: [{ question: 'When is the Red Hill winter lunch available?', answer: 'The fixture source lists Saturday 29 August, with booking required.' }],
    sitemapExclude: true,
    section: 'journal',
    clusterLinks: [{ label: 'Explore Red Hill', href: '/explore/places/red-hill/' }],
  });
  const metadataUsage = bindClaimUsage(metadataPayload, [
    { segmentId: 'metadata-dek', path: '$.dek', claimIds: ['claim-location', 'claim-date', 'claim-observation'] },
    { segmentId: 'metadata-summary-1', path: '$.aiSummary[0]', claimIds: ['claim-observation'] },
    { segmentId: 'metadata-summary-2', path: '$.aiSummary[1]', claimIds: ['claim-date'] },
    { segmentId: 'metadata-faq-answer', path: '$.faq[0].answer', claimIds: ['claim-date', 'claim-booking'] },
  ]);
  const metadataGates = evaluateArtifactGates(
    metadataPayload,
    claims,
    metadataUsage.map((usage) => usage.segmentId),
    metadataUsage,
    capturedAt,
    clearedHero ? { gate: 'astro_article_contract', schema: ArticleMetadataPayloadSchema } : undefined,
  );
  metadataGates.push(gate(
    'astro_patch_ready',
    Boolean(clearedHero),
    clearedHero ? 'A separately rights-cleared hero placement makes the Astro patch adapter available.' : 'Text artifacts remain reviewable, but Astro patch export waits for a rights-cleared hero placement.',
    [],
    false,
  ));
  const metadataDependencies: ArtifactVersion['dependencies'] = [dependency, selectedAngleDependency, articleDependency];
  if (clearedHero) {
    metadataDependencies.push({
      kind: 'media_rights' as const,
      id: 'rights-place-red-hill-01',
      version: 1,
      contentHash: hashValue(clearedHero),
      status: 'cleared' as const,
    });
  }
  const metadata = withArtifactHash({
    id: 'artifact-article-metadata-red-hill', key: 'article-metadata', version: 1, type: 'article_metadata' as const,
    angleId: angle.id, angleVersion: angle.version,
    factualSegmentIds: metadataUsage.map((usage) => usage.segmentId), claimUsage: metadataUsage,
    dependencies: metadataDependencies, payload: metadataPayload,
    gateResults: metadataGates,
  });
  const askPayload = AskAnswerPayloadSchema.parse({
    answer: 'For a rainy Red Hill lunch, this covered dining room is a practical option. The fixture source lists the winter lunch for Saturday 29 August, with booking required.',
    recommendations: [{
      title: 'Red Hill wet-weather lunch',
      href: '/journal/red-hill-wet-weather-lunch/',
      why: 'Covered dining and a confirmed Saturday service make it useful in wet weather.',
      venue_type: 'restaurant',
      region: 'red-hill',
    }],
    follow_on: ['What else works in Red Hill when it rains?'],
    provenance_footer: 'Drafted from a locked Peninsula Insider fixture claim set. Verify live details before visiting.',
  });
  const askUsage = bindClaimUsage(askPayload, [
    { segmentId: 'ask-answer', path: '$.answer', claimIds: ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'] },
    { segmentId: 'ask-recommendation', path: '$.recommendations[0].why', claimIds: ['claim-date', 'claim-booking', 'claim-observation'] },
  ]);
  const ask = withArtifactHash({
    id: 'artifact-ask-red-hill', key: 'ask-answer', version: 1, type: 'ask_answer' as const,
    angleId: angle.id, angleVersion: angle.version,
    factualSegmentIds: askUsage.map((usage) => usage.segmentId), claimUsage: askUsage,
    dependencies: [dependency, selectedAngleDependency], payload: askPayload,
    gateResults: evaluateArtifactGates(askPayload, claims, askUsage.map((usage) => usage.segmentId), askUsage, capturedAt, { gate: 'ask_answer_contract', schema: AskAnswerPayloadSchema }),
  });
  const completed: ArtifactVersion[] = [article, metadata, ask];
  const failed = [];
  const omitted = [];
  if (options.omitPlans) {
    omitted.push(
      { key: 'internal-link-plan', type: 'internal_link_plan' as const, reason: 'not_requested' as const, detail: 'Optional plan was not requested.' },
      { key: 'seo-metadata', type: 'seo_metadata_proposal' as const, reason: 'not_requested' as const, detail: 'Optional proposal was not requested.' },
    );
  } else {
    const linkPayload = InternalLinkPlanPayloadSchema.parse({ links: [{ label: 'Explore Red Hill', href: '/explore/places/red-hill/', placement: 'After the second paragraph' }] });
    const linkUsage = bindClaimUsage(linkPayload, [{ segmentId: 'link-label', path: '$.links[0].label', claimIds: ['claim-location'] }]);
    completed.push(withArtifactHash({
      id: 'artifact-links-red-hill', key: 'internal-link-plan', version: 1, type: 'internal_link_plan' as const,
      angleId: angle.id, angleVersion: angle.version, factualSegmentIds: ['link-label'], claimUsage: linkUsage,
      dependencies: [dependency, selectedAngleDependency, articleDependency], payload: linkPayload,
      gateResults: evaluateArtifactGates(linkPayload, claims, ['link-label'], linkUsage, capturedAt),
    }));
    if (options.failOptionalDerivative === 'seo_metadata_proposal') {
      failed.push({
        key: 'seo-metadata', type: 'seo_metadata_proposal' as const, required: false,
        code: 'fixture_derivative_failure' as const,
        detail: 'Synthetic fixture failure proves independent derivative handling.', attemptedAt: capturedAt,
      });
    } else {
      const seoPayload = SeoMetadataProposalPayloadSchema.parse({
        title: 'Red Hill wet-weather lunch option',
        description: 'A covered Red Hill dining room with a winter lunch listed for Saturday 29 August.',
        canonicalPath: '/journal/red-hill-wet-weather-lunch/',
      });
      const seoUsage = bindClaimUsage(seoPayload, [{ segmentId: 'seo-description', path: '$.description', claimIds: ['claim-location', 'claim-date', 'claim-observation'] }]);
      completed.push(withArtifactHash({
        id: 'artifact-seo-red-hill', key: 'seo-metadata', version: 1, type: 'seo_metadata_proposal' as const,
        angleId: angle.id, angleVersion: angle.version, factualSegmentIds: ['seo-description'], claimUsage: seoUsage,
        dependencies: [dependency, selectedAngleDependency, articleDependency], payload: seoPayload,
        gateResults: evaluateArtifactGates(seoPayload, claims, ['seo-description'], seoUsage, capturedAt),
      }));
    }
  }
  return FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: `run-${hash(idempotencyKey).slice(0, 12)}`,
    idempotencyKey,
    version: 1,
    status: 'ready_for_review',
    createdAt: capturedAt,
    updatedAt: capturedAt,
    bundle: { ...bundle, id: `bundle-${URL_ARTICLE_FIXTURE_ID}`, title: 'Red Hill URL article fixture' },
    recipe: URL_ARTICLE_RECIPE,
    claimSet,
    angle,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1', id: `pack-${hash(idempotencyKey).slice(0, 12)}`, version: 1,
      recipeId: URL_ARTICLE_RECIPE.id, recipeVersion: URL_ARTICLE_RECIPE.version,
      claimSetRef: dependency, angleRef: { id: angle.id, version: angle.version },
      status: failed.length > 0 || omitted.length > 0 ? 'partial' : 'complete',
      completed, failed, omitted, reviews: [],
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: 'Deterministic URL article pack reached review without external calls.' }],
  });
}

function acceptedCurrentReview(run: FoundryRun, artifact: ArtifactVersion): boolean {
  return run.artifactPack.reviews.some((review) => (
    review.artifactId === artifact.id
    && review.artifactVersion === artifact.version
    && review.decision === 'accepted'
    && review.status === 'current'
    && JSON.stringify(review.dependencySnapshot) === JSON.stringify(artifact.dependencies)
    && artifactDependenciesCurrent(run, artifact)
  ));
}

function diffForNewFile(path: string, content: string[]): string {
  const patch = [
    `diff --git a/${path} b/${path}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${path}`,
    `@@ -0,0 +1,${content.length} @@`,
    ...content.map((line) => `+${line}`),
    '',
  ].join('\n');
  if (!validateNewFilePatch(patch)) throw new Error('Generated patch failed structural validation');
  return patch;
}

export function validateNewFilePatch(patch: string): boolean {
  const lines = patch.split('\n');
  if (!lines[0]?.startsWith('diff --git a/') || lines[1] !== 'new file mode 100644' || lines[2] !== '--- /dev/null') return false;
  if (!lines[3]?.startsWith('+++ b/')) return false;
  const hunkIndex = lines.findIndex((line) => /^@@ -0,0 \+1,\d+ @@$/.test(line));
  if (hunkIndex !== 4) return false;
  const expected = Number(lines[hunkIndex].match(/\+1,(\d+)/)?.[1]);
  const additions = lines.slice(hunkIndex + 1).filter((line) => line.startsWith('+'));
  return Number.isInteger(expected) && expected > 0 && additions.length === expected;
}

function assertArtifactReady(run: FoundryRun, artifact: ArtifactVersion): void {
  if (artifact.gateResults.some((result) => !result.passed && result.blocking)) throw new Error(`Artifact ${artifact.id} has unresolved gates`);
  const freshGates = artifact.type === 'quick_note'
    ? evaluateQuickNoteGates(artifact.payload, run.claimSet.claims, artifact.claimIds)
    : evaluateArtifactGates(
      artifact.payload,
      run.claimSet.claims,
      artifact.factualSegmentIds,
      artifact.claimUsage,
      new Date().toISOString(),
      artifact.type === 'ask_answer'
        ? { gate: 'ask_answer_contract', schema: AskAnswerPayloadSchema }
        : artifact.type === 'article_metadata' && artifact.payload.astroPatchReady
          ? { gate: 'astro_article_contract', schema: ArticleMetadataPayloadSchema }
          : undefined,
    );
  if (freshGates.some((result) => !result.passed && result.blocking)) throw new Error(`Artifact ${artifact.id} failed fresh export gates`);
  if (!artifactDependenciesCurrent(run, artifact)) throw new Error(`Artifact ${artifact.id} has stale dependencies`);
  if (!acceptedCurrentReview(run, artifact)) throw new Error(`Artifact ${artifact.id} requires a current accepted draft-handoff review`);
  const publicCopy = JSON.stringify(artifact.payload);
  if (PRICE_PATTERN.test(publicCopy)) throw new Error('PI outputs cannot contain pricing');
  if (/—/.test(publicCopy)) throw new Error('PI outputs cannot contain em dashes');
}

export function buildPatch(run: FoundryRun): string {
  if (run.blockers.length > 0) throw new Error('Run has unresolved blockers');
  if (run.recipe.id === QUICK_NOTE_RECIPE.id) {
    if (!run.artifact) throw new Error('Quick-note compatibility artifact is missing');
    assertArtifactReady(run, run.artifact);
    const note = run.artifact.payload;
    const path = 'next/src/content/quick-notes/2026-08-21-red-hill-wet-weather-lunch.md';
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
    return diffForNewFile(path, content);
  }

  const article = run.artifactPack.completed.find((item) => item.type === 'article_draft');
  const metadata = run.artifactPack.completed.find((item) => item.type === 'article_metadata');
  if (!article || article.type !== 'article_draft' || !metadata || metadata.type !== 'article_metadata') {
    throw new Error('Article draft and metadata are required for patch export');
  }
  assertArtifactReady(run, article);
  assertArtifactReady(run, metadata);
  const meta = metadata.payload;
  if (!meta.astroPatchReady || !meta.heroImage) {
    throw new Error('Article patch export requires a separately rights-cleared hero placement');
  }
  const content = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `dek: ${JSON.stringify(meta.dek)}`,
    `author: ${JSON.stringify(meta.author)}`,
    `houseByline: ${meta.houseByline}`,
    `publishedAt: ${meta.publishedAt}`,
    'heroImage:',
    `  src: ${JSON.stringify(meta.heroImage.src)}`,
    `  alt: ${JSON.stringify(meta.heroImage.alt)}`,
    `  credit: ${JSON.stringify(meta.heroImage.credit)}`,
    `  license: ${JSON.stringify(meta.heroImage.license)}`,
    `format: ${JSON.stringify(meta.format)}`,
    `tags: ${JSON.stringify(meta.tags)}`,
    `relatedVenues: ${JSON.stringify(meta.relatedVenues)}`,
    `relatedExperiences: ${JSON.stringify(meta.relatedExperiences)}`,
    `relatedPlaces: ${JSON.stringify(meta.relatedPlaces)}`,
    `relatedArticles: ${JSON.stringify(meta.relatedArticles)}`,
    `relatedItineraries: ${JSON.stringify(meta.relatedItineraries)}`,
    ...(meta.readingTimeMinutes ? [`readingTimeMinutes: ${meta.readingTimeMinutes}`] : []),
    `featured: ${meta.featured}`,
    'status: draft',
    ...(meta.lastVerified ? [`lastVerified: ${meta.lastVerified}`] : []),
    ...(meta.clusterLinks ? [`clusterLinks: ${JSON.stringify(meta.clusterLinks)}`] : []),
    ...(meta.aiSummary ? [`aiSummary: ${JSON.stringify(meta.aiSummary)}`] : []),
    ...(meta.faq ? [
      'faq:',
      ...meta.faq.flatMap((item) => [`  - question: ${JSON.stringify(item.question)}`, `    answer: ${JSON.stringify(item.answer)}`]),
    ] : []),
    `sitemapExclude: ${meta.sitemapExclude}`,
    `section: ${meta.section}`,
    ...(meta.planShape ? [`planShape: ${meta.planShape}`] : []),
    '---',
    '',
    ...article.payload.body.split(/\r?\n/),
  ];
  return diffForNewFile(`next/src/content/articles/${article.payload.slug}.md`, content);
}
