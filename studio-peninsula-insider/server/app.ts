import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { ArtifactEditSchema, ArtifactUpdateSchema, ReviewDecisionSchema } from '../shared/contracts.js';
import { SourceRefreshRequestSchema, UrlIntakeRequestSchema } from '../shared/intake-contracts.js';
import { CaptureDisabledError, CaptureIdempotencyConflictError } from './capture/kernel.js';
import { buildPatch, FIXTURE_ID, runFixture, runUrlArticleFixture, URL_ARTICLE_FIXTURE_ID } from './fixture-runner.js';
import { IntakeNotFoundError, IntakeRequestError, type UrlIntakeService } from './intake/service.js';
import { FileFoundryStore, VersionConflictError } from './store.js';

const CreateRunSchema = z.object({
  fixtureId: z.enum([FIXTURE_ID, URL_ARTICLE_FIXTURE_ID]),
  actor: z.string().min(1).default('local-editor'),
  idempotencyKey: z.string().min(1).optional(),
  fixtureVariant: z.enum(['complete', 'text_only', 'partial_optional_failure']).default('complete'),
});

export function createApp(
  store: FileFoundryStore,
  options: { staticDir?: string; intake?: UrlIntakeService } = {},
) {
  // Absent or flag-off intake keeps the real-URL capability unavailable rather than merely
  // unused: the routes answer 404 and nothing can reach the sealed kernel.
  const intake = options.intake?.enabled ? options.intake : undefined;
  const app = express();
  app.disable('x-powered-by');
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

  app.get('/api/health', (_request, response) => response.json({
    ok: true,
    service: 'pi-content-foundry',
    mode: intake ? 'fixture-and-local-url' : 'fixture-only',
  }));
  app.get('/api/capabilities', (_request, response) => response.json({
    sourceTypes: intake ? ['frozen_fixture', 'local_real_url'] : ['frozen_fixture'],
    realUrlCapture: Boolean(intake),
    recipes: ['quick_note_v1', 'url_article_v1'],
    artifactTypes: ['quick_note', 'article_draft', 'article_metadata', 'ask_answer', 'internal_link_plan', 'seo_metadata_proposal'],
    publicationAdapters: ['downloadable_patch'],
    externalCalls: Boolean(intake),
    productionMutation: false,
  }));

  function requireIntake(): UrlIntakeService {
    if (!intake) throw new CaptureDisabledError('Real URL capture is disabled');
    return intake;
  }

  app.get('/api/foundry/intake', async (_request, response, next) => {
    try {
      response.json({ enabled: Boolean(intake), attempts: intake ? await intake.list() : [] });
    } catch (error) { next(error); }
  });

  app.post('/api/foundry/intake/url', async (request, response, next) => {
    try {
      const service = requireIntake();
      const input = UrlIntakeRequestSchema.parse(request.body);
      const result = await service.submit({
        url: input.url,
        actor: input.actor,
        idempotencyKey: request.header('Idempotency-Key') ?? input.idempotencyKey,
      });
      const created = Boolean(result.run) && !result.replayed;
      return response.status(created ? 201 : 200).json({ attempt: result.attempt, run: result.run ?? null });
    } catch (error) { return next(error); }
  });

  app.post('/api/foundry/runs/:id/refresh', async (request, response, next) => {
    try {
      const service = requireIntake();
      const input = SourceRefreshRequestSchema.parse(request.body);
      const result = await service.refresh(request.params.id, {
        actor: input.actor,
        expectedVersion: input.expectedVersion,
        idempotencyKey: request.header('Idempotency-Key') ?? input.idempotencyKey,
        url: input.url,
      });
      return response.json({ attempt: result.attempt, run: result.run ?? null });
    } catch (error) { return next(error); }
  });

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
      const run = input.fixtureId === FIXTURE_ID
        ? runFixture(input.actor, idempotencyKey)
        : runUrlArticleFixture(input.actor, idempotencyKey, {
          includeClearedHero: input.fixtureVariant === 'complete',
          failOptionalDerivative: input.fixtureVariant === 'partial_optional_failure' ? 'seo_metadata_proposal' : undefined,
          omitPlans: input.fixtureVariant === 'text_only',
        });
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
      return next(error);
    }
  });

  app.put('/api/foundry/runs/:id/artifact', async (request, response, next) => {
    try {
      const edit = ArtifactEditSchema.parse(request.body);
      return response.json(await store.updateArtifact(request.params.id, edit));
    } catch (error) {
      if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
      return next(error);
    }
  });

  app.put('/api/foundry/runs/:id/artifacts/:artifactId', async (request, response, next) => {
    try {
      const update = ArtifactUpdateSchema.parse(request.body);
      return response.json(await store.updatePackArtifact(request.params.id, request.params.artifactId, update));
    } catch (error) {
      if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
      return next(error);
    }
  });

  app.get('/api/foundry/runs/:id/patch', async (request, response, next) => {
    try {
      const run = await store.get(request.params.id);
      if (!run) return response.status(404).json({ error: 'Run not found' });
      const patch = buildPatch(run);
      response.type('text/x-diff');
      response.setHeader('Content-Disposition', `attachment; filename="${run.id}.patch"`);
      return response.send(patch);
    } catch (error) { return next(error); }
  });

  if (options.staticDir) {
    app.use(express.static(options.staticDir, { index: false, fallthrough: true }));
    app.get('*', (request, response, next) => {
      if (request.path.startsWith('/api/')) return next();
      return response.sendFile('index.html', { root: options.staticDir });
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Invalid request', issues: error.issues });
    if (error instanceof CaptureDisabledError) {
      return response.status(404).json({ error: 'Real URL capture is disabled', code: 'real_url_capture_disabled' });
    }
    if (error instanceof CaptureIdempotencyConflictError) return response.status(409).json({ error: error.message });
    if (error instanceof VersionConflictError) return response.status(409).json({ error: error.message });
    if (error instanceof IntakeNotFoundError) return response.status(404).json({ error: error.message });
    if (error instanceof IntakeRequestError) return response.status(400).json({ error: error.message });
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return response.status(400).json({ error: message });
  });

  return app;
}
