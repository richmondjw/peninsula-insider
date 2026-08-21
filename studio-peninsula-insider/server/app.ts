import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { ArtifactEditSchema, ArtifactUpdateSchema, ReviewDecisionSchema } from '../shared/contracts.js';
import { buildPatch, FIXTURE_ID, runFixture, runUrlArticleFixture, URL_ARTICLE_FIXTURE_ID } from './fixture-runner.js';
import {
  EXPLAINER_FIXTURE_ID,
  PODCAST_FIXTURE_ID,
  runPreproductionFixture,
  SHORT_VIDEO_FIXTURE_ID,
} from './preproduction-fixtures.js';
import { FileFoundryStore, VersionConflictError } from './store.js';

const CreateRunSchema = z.object({
  fixtureId: z.enum([FIXTURE_ID, URL_ARTICLE_FIXTURE_ID, EXPLAINER_FIXTURE_ID, PODCAST_FIXTURE_ID, SHORT_VIDEO_FIXTURE_ID]),
  actor: z.string().min(1).default('local-editor'),
  idempotencyKey: z.string().min(1).optional(),
  fixtureVariant: z.enum(['complete', 'text_only', 'partial_optional_failure']).default('complete'),
});

export function createApp(store: FileFoundryStore, options: { staticDir?: string } = {}) {
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

  app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'pi-content-foundry', mode: 'fixture-only' }));
  app.get('/api/capabilities', (_request, response) => response.json({
    sourceTypes: ['frozen_fixture'],
    recipes: ['quick_note_v1', 'url_article_v1', 'explainer_preproduction_v1', 'podcast_preproduction_v1', 'short_video_preproduction_v1'],
    artifactTypes: [
      'quick_note', 'article_draft', 'article_metadata', 'ask_answer', 'internal_link_plan', 'seo_metadata_proposal',
      'explainer_core', 'explainer_faq', 'explainer_carousel', 'explainer_voiceover', 'explainer_visualisation',
      'podcast_evidence_dossier', 'podcast_angle', 'podcast_run_sheet', 'podcast_interview_guide', 'podcast_script', 'podcast_show_notes', 'podcast_chapters',
      'video_hooks', 'video_script', 'video_shot_list', 'video_scenes', 'video_overlays', 'video_subtitles', 'video_thumbnail', 'video_platform_captions',
    ],
    publicationAdapters: ['downloadable_patch'],
    externalCalls: false,
    productionMutation: false,
    recording: false,
    rendering: false,
    scheduling: false,
    sending: false,
    publishing: false,
    syntheticVoice: false,
  }));

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
        : input.fixtureId === URL_ARTICLE_FIXTURE_ID
          ? runUrlArticleFixture(input.actor, idempotencyKey, {
          includeClearedHero: input.fixtureVariant === 'complete',
          failOptionalDerivative: input.fixtureVariant === 'partial_optional_failure' ? 'seo_metadata_proposal' : undefined,
          omitPlans: input.fixtureVariant === 'text_only',
          })
          : runPreproductionFixture(
            input.fixtureId === EXPLAINER_FIXTURE_ID ? 'explainer' : input.fixtureId === PODCAST_FIXTURE_ID ? 'podcast' : 'short_video',
            input.actor,
            idempotencyKey,
            { failOptionalDerivative: input.fixtureVariant === 'partial_optional_failure' },
          );
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
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return response.status(400).json({ error: message });
  });

  return app;
}
