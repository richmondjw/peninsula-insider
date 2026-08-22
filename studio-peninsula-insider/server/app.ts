import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { ArtifactEditSchema, ArtifactUpdateSchema, ReviewDecisionSchema, SourceConfirmationInputSchema } from '../shared/contracts.js';
import { buildArtifactHandoff, buildPatch, FIXTURE_ID, runFixture, runUrlArticleFixture, URL_ARTICLE_FIXTURE_ID } from './fixture-runner.js';
import { NEWSLETTER_SOCIAL_FIXTURE_ID, runNewsletterSocialFixture } from './newsletter-social-fixtures.js';
import {
  EXPLAINER_FIXTURE_ID,
  PODCAST_FIXTURE_ID,
  SHORT_VIDEO_FIXTURE_ID,
  runPreproductionFixture,
} from './preproduction-fixtures.js';
import type { RealUrlCoordinator } from './real-url-coordinator.js';
import { CaptureSourceMismatchError } from './real-url-coordinator.js';
import {
  CaptureBusyError,
  CaptureProjectionConflictError,
  CaptureRefreshTargetError,
  FileFoundryStore,
  RunRefreshInProgressError,
  VersionConflictError,
} from './store.js';
import {
  createTeamWorkbench,
  isProtectedTeamMethod,
  resolveTeamWorkbenchConfig,
  type TeamWorkbench,
  type TeamWorkbenchConfig,
  type TeamWorkbenchIdentityOptions,
} from './team-workbench.js';

const CreateRunBaseSchema = z.object({
  actor: z.string().min(1).default('local-editor'),
  idempotencyKey: z.string().min(1).optional(),
});
const CreateRunSchema = z.discriminatedUnion('fixtureId', [
  CreateRunBaseSchema.extend({ fixtureId: z.literal(FIXTURE_ID), fixtureVariant: z.literal('complete').default('complete') }),
  CreateRunBaseSchema.extend({ fixtureId: z.literal(URL_ARTICLE_FIXTURE_ID), fixtureVariant: z.enum(['complete', 'text_only', 'partial_optional_failure']).default('complete') }),
  CreateRunBaseSchema.extend({ fixtureId: z.literal(NEWSLETTER_SOCIAL_FIXTURE_ID), fixtureVariant: z.enum(['complete', 'missing_authoritative_inputs', 'rights_not_cleared']).default('complete') }),
  CreateRunBaseSchema.extend({ fixtureId: z.literal(EXPLAINER_FIXTURE_ID), fixtureVariant: z.enum(['complete', 'partial_optional_failure']).default('complete') }),
  CreateRunBaseSchema.extend({ fixtureId: z.literal(PODCAST_FIXTURE_ID), fixtureVariant: z.enum(['complete', 'partial_optional_failure']).default('complete') }),
  CreateRunBaseSchema.extend({ fixtureId: z.literal(SHORT_VIDEO_FIXTURE_ID), fixtureVariant: z.enum(['complete', 'partial_optional_failure']).default('complete') }),
]);

const UrlCaptureSchema = z.object({
  url: z.string().min(1).max(2_048),
  actor: z.string().min(1).max(120).default('local-editor'),
  idempotencyKey: z.string().min(1).max(256).optional(),
});

const UrlRefreshSchema = UrlCaptureSchema.extend({ expectedVersion: z.number().int().positive() });

function parseSafeLocalHost(request: express.Request, expectedHost?: string): URL | undefined {
  const host = request.get('host') ?? '';
  let hostUrl: URL;
  try { hostUrl = new URL(`http://${host}`); } catch { return undefined; }
  if (!['127.0.0.1', 'localhost'].includes(hostUrl.hostname)) return undefined;
  if (expectedHost && hostUrl.host !== expectedHost) return undefined;
  return hostUrl;
}

function requireSafeLocalMutation(expectedHost?: string) {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const hostUrl = parseSafeLocalHost(request, expectedHost);
    if (!hostUrl) return response.status(403).json({ error: { code: 'local_origin_required' } });
    const origin = request.get('origin');
    if (origin) {
      let originUrl: URL;
      try { originUrl = new URL(origin); } catch { return response.status(403).json({ error: { code: 'same_origin_required' } }); }
      if (originUrl.protocol !== 'http:' || originUrl.host !== hostUrl.host) {
        return response.status(403).json({ error: { code: 'same_origin_required' } });
      }
    }
    if (request.get('x-foundry-csrf') !== '1') return response.status(403).json({ error: { code: 'csrf_header_required' } });
    return next();
  };
}

function safeCaptureError(error: unknown): { status: number; code: string } {
  if (error instanceof CaptureProjectionConflictError) return { status: 409, code: 'idempotency_conflict' };
  if (error instanceof CaptureBusyError) return { status: 409, code: 'capture_busy' };
  if (error instanceof VersionConflictError) return { status: 409, code: 'workflow_version_conflict' };
  if (error instanceof RunRefreshInProgressError) return { status: 409, code: 'source_refresh_in_progress' };
  if (error instanceof CaptureRefreshTargetError || error instanceof CaptureSourceMismatchError) return { status: 400, code: 'source_mismatch' };
  const policyCode = (error as { code?: unknown }).code;
  if (typeof policyCode === 'string' && /^[a-z][a-z0-9_]{1,79}$/.test(policyCode)) return { status: 400, code: policyCode };
  return { status: 400, code: 'invalid_capture_request' };
}

export function createApp(store: FileFoundryStore, options: {
  staticDir?: string;
  realUrlsEnabled?: boolean;
  coordinator?: RealUrlCoordinator;
  expectedHost?: string;
  teamWorkbench?: TeamWorkbenchConfig;
  identity?: TeamWorkbenchIdentityOptions;
} = {}) {
  const realUrlsEnabled = options.realUrlsEnabled ?? false;
  const team: TeamWorkbench = createTeamWorkbench(
    options.teamWorkbench ?? resolveTeamWorkbenchConfig({}),
    options.identity ?? {},
  );
  if (realUrlsEnabled && !options.coordinator) throw new Error('Real URL capture requires the sealed coordinator');
  if (realUrlsEnabled && !store.hasImmutableCaptureResolver()) throw new Error('Real URL capture requires immutable manifest validation');
  const app = express();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    if (!parseSafeLocalHost(request, options.expectedHost)) return response.status(403).json({ error: { code: 'local_host_required' } });
    return next();
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
      },
    },
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  if (team.requireVerifiedIdentity) {
    const identityGuard = team.requireVerifiedIdentity;
    app.use('/api', (request, response, next) => (
      isProtectedTeamMethod(request.method) ? identityGuard(request, response, next) : next()
    ));
  }
  if (realUrlsEnabled) {
    const mutationGuard = requireSafeLocalMutation(options.expectedHost);
    app.use('/api', (request, response, next) => (
      ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ? next() : mutationGuard(request, response, next)
    ));
  }

  app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'pi-content-foundry', mode: realUrlsEnabled ? 'local-real-url-enabled' : 'fixture-only' }));
  app.get('/api/capabilities', (_request, response) => response.json({
    sourceTypes: realUrlsEnabled ? ['frozen_fixture', 'https_url'] : ['frozen_fixture'],
    recipes: ['quick_note_v1', 'url_article_v1', 'newsletter_social_v1', 'explainer_preproduction_v1', 'podcast_preproduction_v1', 'short_video_preproduction_v1'],
    artifactTypes: ['quick_note', 'article_draft', 'article_metadata', 'ask_answer', 'internal_link_plan', 'seo_metadata_proposal', 'insider_note_issue', 'insider_note_subject_set', 'linkedin_post', 'instagram_caption', 'instagram_first_comment', 'instagram_carousel_script', 'social_media_brief', 'explainer_core', 'explainer_faq', 'explainer_carousel', 'explainer_voiceover', 'explainer_visualisation', 'podcast_evidence_dossier', 'podcast_angle', 'podcast_run_sheet', 'podcast_interview_guide', 'podcast_script', 'podcast_show_notes', 'podcast_chapters', 'video_hooks', 'video_script', 'video_shot_list', 'video_scenes', 'video_overlays', 'video_subtitles', 'video_thumbnail', 'video_platform_captions'],
    publicationAdapters: ['downloadable_patch'],
    directReleaseAdapters: [],
    teamMode: team.capabilities.mode,
    teamWorkbench: team.capabilities,
    externalCalls: realUrlsEnabled,
    providerCalls: false,
    modelCalls: false,
    publishing: false,
    sending: false,
    scheduling: false,
    recording: false,
    rendering: false,
    syntheticMediaGeneration: false,
    productionMutation: false,
    realUrlCapture: {
      enabled: realUrlsEnabled,
      scope: 'one_human_submitted_https_page',
      crawling: false,
      automaticRetry: false,
      persistedUrlQueries: 'values_redacted',
    },
  }));

  if (realUrlsEnabled && options.coordinator) {
    app.get('/api/foundry/captures', async (_request, response, next) => {
      try { return response.json({ captures: await store.listCaptureProjections() }); } catch (error) { return next(error); }
    });
    app.get('/api/foundry/captures/:id', async (request, response, next) => {
      try {
        const projection = await store.getCaptureProjection(request.params.id);
        return projection ? response.json(projection) : response.status(404).json({ error: { code: 'capture_not_found' } });
      } catch (error) { return next(error); }
    });
    app.post('/api/foundry/captures', async (request, response) => {
      try {
        const input = UrlCaptureSchema.parse(request.body);
        const idempotencyKey = request.header('Idempotency-Key') ?? input.idempotencyKey;
        if (!idempotencyKey) return response.status(400).json({ error: { code: 'idempotency_key_required' } });
        const result = await options.coordinator!.submit({ ...input, idempotencyKey });
        return response.status(result.created ? 202 : 200).json(result.projection);
      } catch (error) {
        if (error instanceof z.ZodError) return response.status(400).json({ error: { code: 'invalid_capture_request' } });
        const safe = safeCaptureError(error);
        return response.status(safe.status).json({ error: { code: safe.code } });
      }
    });
    app.post('/api/foundry/runs/:id/refresh', async (request, response) => {
      try {
        const input = UrlRefreshSchema.parse(request.body);
        const idempotencyKey = request.header('Idempotency-Key') ?? input.idempotencyKey;
        if (!idempotencyKey) return response.status(400).json({ error: { code: 'idempotency_key_required' } });
        const result = await options.coordinator!.submit({
          ...input,
          idempotencyKey,
          refreshRunId: request.params.id,
          expectedRunVersion: input.expectedVersion,
        });
        return response.status(result.created ? 202 : 200).json(result.projection);
      } catch (error) {
        if (error instanceof z.ZodError) return response.status(400).json({ error: { code: 'invalid_capture_request' } });
        const safe = safeCaptureError(error);
        return response.status(safe.status).json({ error: { code: safe.code } });
      }
    });
  }

  app.get('/api/foundry/runs', async (_request, response, next) => {
    try { response.json({ runs: await store.list() }); } catch (error) { next(error); }
  });

  app.post('/api/foundry/runs', async (request, response, next) => {
    try {
      const input = CreateRunSchema.parse(request.body);
      const idempotencyKey = request.header('Idempotency-Key') ?? input.idempotencyKey;
      if (!idempotencyKey) return response.status(400).json({ error: 'Idempotency-Key is required' });
      const existing = await store.getByIdempotencyKey(idempotencyKey);
      if (existing) return response.status(200).json(existing);
      const run = (() => {
        if (input.fixtureId === FIXTURE_ID) return runFixture(input.actor, idempotencyKey);
        if (input.fixtureId === URL_ARTICLE_FIXTURE_ID) return runUrlArticleFixture(input.actor, idempotencyKey, {
          includeClearedHero: input.fixtureVariant === 'complete',
          failOptionalDerivative: input.fixtureVariant === 'partial_optional_failure' ? 'seo_metadata_proposal' : undefined,
          omitPlans: input.fixtureVariant === 'text_only',
        });
        if (input.fixtureId === NEWSLETTER_SOCIAL_FIXTURE_ID) return runNewsletterSocialFixture(input.actor, idempotencyKey, {
          omitAuthoritativeInputs: input.fixtureVariant === 'missing_authoritative_inputs',
          clearInstagramRights: input.fixtureVariant !== 'rights_not_cleared',
        });
        const family = input.fixtureId === EXPLAINER_FIXTURE_ID ? 'explainer' : input.fixtureId === PODCAST_FIXTURE_ID ? 'podcast' : 'short_video';
        return runPreproductionFixture(family, input.actor, idempotencyKey, { failOptionalDerivative: input.fixtureVariant === 'partial_optional_failure' });
      })();
      const created = await store.create(run);
      return response.status(201).json(created);
    } catch (error) { return next(error); }
  });

  app.get('/api/foundry/runs/:id', async (request, response, next) => {
    try {
      const run = await store.get(request.params.id);
      if (!run) return response.status(404).json({ error: 'Run not found' });
      return response.json(run);
    } catch (error) { return next(error); }
  });

  app.put('/api/foundry/runs/:id/review', async (request, response, next) => {
    try {
      const decision = ReviewDecisionSchema.parse(request.body);
      return response.json(await store.review(request.params.id, decision));
    } catch (error) {
      if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  app.put('/api/foundry/runs/:id/artifact', async (request, response, next) => {
    try {
      const edit = ArtifactEditSchema.parse(request.body);
      return response.json(await store.updateArtifact(request.params.id, edit));
    } catch (error) {
      if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  app.put('/api/foundry/runs/:id/artifacts/:artifactId', async (request, response, next) => {
    try {
      const update = ArtifactUpdateSchema.parse(request.body);
      return response.json(await store.updatePackArtifact(request.params.id, request.params.artifactId, update));
    } catch (error) {
      if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  app.put('/api/foundry/runs/:id/source-confirmation', async (request, response, next) => {
    try {
      return response.json(await store.confirmSource(request.params.id, SourceConfirmationInputSchema.parse(request.body)));
    } catch (error) {
      if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  app.get('/api/foundry/runs/:id/artifacts/:artifactId/handoff', async (request, response, next) => {
    try {
      const { run, artifact } = await store.validateArtifactForHandoff(request.params.id, request.params.artifactId);
      response.type('application/json');
      response.setHeader('Content-Disposition', `attachment; filename="${run.id}-${artifact.id}.json"`);
      return response.send(buildArtifactHandoff(run, artifact.id));
    } catch (error) {
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  app.get('/api/foundry/runs/:id/artifacts/:artifactId/patch', async (request, response, next) => {
    try {
      const { run, artifact } = await store.validateArtifactForHandoff(request.params.id, request.params.artifactId);
      const patch = buildPatch(run, artifact.id);
      response.type('text/x-diff');
      response.setHeader('Content-Disposition', `attachment; filename="${run.id}-${artifact.id}.patch"`);
      return response.send(patch);
    } catch (error) {
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  app.get('/api/foundry/runs/:id/patch', async (request, response, next) => {
    try {
      const { run } = await store.validateForExport(request.params.id);
      const patch = buildPatch(run);
      response.type('text/x-diff');
      response.setHeader('Content-Disposition', `attachment; filename="${run.id}.patch"`);
      return response.send(patch);
    } catch (error) {
      if (error instanceof RunRefreshInProgressError) return response.status(409).json({ error: { code: 'source_refresh_in_progress' } });
      return next(error);
    }
  });

  if (options.staticDir) {
    app.use(express.static(options.staticDir, { index: false, fallthrough: true }));
    app.get('*', (request, response, next) => {
      if (request.path.startsWith('/api/')) return next();
      return response.sendFile('index.html', { root: options.staticDir });
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (realUrlsEnabled) return response.status(400).json({ error: { code: error instanceof z.ZodError ? 'invalid_request' : 'request_failed' } });
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Invalid request', issues: error.issues });
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return response.status(400).json({ error: message });
  });

  return app;
}
