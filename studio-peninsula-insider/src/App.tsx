import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ArtifactVersion, CaptureProjection, FoundryRun } from '../shared/contracts';
import { patchReadiness } from '../shared/patch-readiness';
import { focusTabAtIndex, nextArtifactTabIndex, rovingTabIndex } from '../shared/artifact-tabs';
import {
  focusReviewTarget,
  reviewFocusAfterFailure,
  reviewFocusAfterSuccess,
  shouldRestoreReviewFocus,
  type BoundReviewFocus,
  type ReviewFocusTargetContext,
} from '../shared/review-focus';
import {
  EMPTY_LIVE_STATUS,
  MEDIA_WAIT_MESSAGE,
  fixtureReadyStatus,
  liveStatusAnnouncement,
  mediaWaitStatus,
  nextLiveStatus,
  reviewResultStatus,
} from '../shared/live-status';

const TERMINAL_CAPTURE_STATES = new Set(['extracted', 'held', 'no_story', 'failed']);
const SOURCE_KINDS = ['web', 'venue-site', 'press', 'social', 'gov', 'partner'] as const;

const FIXTURE_RECIPES = [
  { id: 'quick_note_v1', label: 'Quick Note', fixtureId: 'red-hill-winter-lunch', description: 'One compact, patchable editorial note.', variants: [{ id: 'complete', label: 'Complete' }] },
  { id: 'url_article_v1', label: 'Article', fixtureId: 'red-hill-url-article', description: 'Quick Note, article, metadata, Ask and optional derivatives.', variants: [{ id: 'complete', label: 'Complete' }, { id: 'text_only', label: 'Text only' }, { id: 'partial_optional_failure', label: 'Optional failure' }] },
  { id: 'newsletter_social_v1', label: 'Newsletter + social', fixtureId: 'red-hill-newsletter-social', description: 'Eleven-position Insider Note plus draft-only social derivatives.', variants: [{ id: 'complete', label: 'Complete' }, { id: 'missing_authoritative_inputs', label: 'Missing inputs' }, { id: 'rights_not_cleared', label: 'Rights not cleared' }] },
  { id: 'explainer_preproduction_v1', label: 'Explainer', fixtureId: 'red-hill-explainer-preproduction', description: 'Five governed text and visual-planning artifacts.', variants: [{ id: 'complete', label: 'Complete' }, { id: 'partial_optional_failure', label: 'Optional failure' }] },
  { id: 'podcast_preproduction_v1', label: 'Podcast', fixtureId: 'red-hill-podcast-preproduction', description: 'Seven evidence, interview and script handoff artifacts.', variants: [{ id: 'complete', label: 'Complete' }, { id: 'partial_optional_failure', label: 'Optional failure' }] },
  { id: 'short_video_preproduction_v1', label: 'Short video', fixtureId: 'red-hill-short-video-preproduction', description: 'Nine script, scene, overlay and platform handoff artifacts.', variants: [{ id: 'complete', label: 'Complete' }, { id: 'partial_optional_failure', label: 'Optional failure' }] },
] as const;

interface Capabilities {
  realUrlCapture?: { enabled?: boolean };
  providerCalls?: boolean;
  modelCalls?: boolean;
  publishing?: boolean;
}

const captureCopy: Record<string, string> = {
  queued: 'Capture queued locally.',
  capturing: 'Checking the public destination and capturing one page.',
  captured: 'Source stored as an immutable revision.',
  extracting: 'Extracting inert text. Scripts and subresources are not run.',
  extracted: 'Evidence is ready for human classification.',
  held: 'Capture held by the safety policy.',
  no_story: 'Captured safely, but no usable story text was found.',
  failed: 'Capture failed safely. No automatic retry was made.',
};

function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function safeApiError(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | undefined)?.error;
  if (typeof error === 'string') return error;
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? `${fallback} Code: ${code}` : fallback;
}

function artifactLabel(artifact: ArtifactVersion): string {
  if (artifact.type === 'video_script' && artifact.payload.kind === 'video_script') return `${artifact.payload.targetSeconds}-second video script`;
  return artifact.type.replaceAll('_', ' ');
}

function payloadPreview(artifact: ArtifactVersion): string {
  if (artifact.type === 'quick_note') return [artifact.payload.headline, artifact.payload.dek, artifact.payload.body].filter(Boolean).join('\n\n');
  if (artifact.type === 'article_draft') return artifact.payload.body;
  if (artifact.type === 'ask_answer') return artifact.payload.answer;
  return JSON.stringify(artifact.payload, null, 2);
}

export function App() {
  const [runs, setRuns] = useState<FoundryRun[]>([]);
  const [activeRunId, setActiveRunId] = useState('');
  const [activeArtifactId, setActiveArtifactId] = useState('');
  const [captures, setCaptures] = useState<CaptureProjection[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState('');
  const [liveStatus, setLiveStatus] = useState(EMPTY_LIVE_STATUS);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [url, setUrl] = useState('');
  const [sourceKind, setSourceKind] = useState('');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [angleLabel, setAngleLabel] = useState('Source-led local explainer');
  const [angleFraming, setAngleFraming] = useState('A bounded internal draft assembled only from the selected immutable source assertions.');
  const [selectedRecipeId, setSelectedRecipeId] = useState<(typeof FIXTURE_RECIPES)[number]['id']>('url_article_v1');
  const [selectedFixtureVariant, setSelectedFixtureVariant] = useState('complete');
  const [pendingReviewFocus, setPendingReviewFocus] = useState<BoundReviewFocus | null>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const recipeTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const artifactTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const rejectActions = useRef(new Map<string, HTMLButtonElement>());
  const approveActions = useRef(new Map<string, HTMLButtonElement>());
  const acceptedHandoffs = useRef(new Map<string, HTMLAnchorElement>());
  const reviewRequestToken = useRef(0);
  const navigationEpoch = useRef(0);

  const realUrlsEnabled = capabilities?.realUrlCapture?.enabled === true;
  const run = runs.find((candidate) => candidate.id === activeRunId) ?? runs[0] ?? null;
  const claims = run?.claimSet.claims ?? [];
  const activeArtifact = run?.artifactPack.completed.find((artifact) => artifact.id === activeArtifactId)
    ?? run?.artifactPack.completed[0] ?? null;
  const activeArtifactIndex = run && activeArtifact ? run.artifactPack.completed.findIndex((artifact) => artifact.id === activeArtifact.id) : -1;
  const activeCapture = captures.find((capture) => ['queued', 'capturing'].includes(capture.state));
  const currentReview = activeArtifact && run?.artifactPack.reviews.find((review) => review.artifactId === activeArtifact.id && review.status === 'current');
  const activeBlockingGates = activeArtifact?.gateResults.filter((gate) => gate.blocking && !gate.passed) ?? [];
  const patchState = run ? patchReadiness(run, Boolean(activeCapture)) : null;
  const selectedRecipe = FIXTURE_RECIPES.find((recipe) => recipe.id === selectedRecipeId) ?? FIXTURE_RECIPES[1];

  function announceStatus(event: { key: string; message: string }) {
    setLiveStatus((current) => nextLiveStatus(current, event));
  }

  function upsertRun(updated: FoundryRun, activate = true) {
    setRuns((current) => [updated, ...current.filter((candidate) => candidate.id !== updated.id)]);
    if (!activate) return;
    setActiveRunId(updated.id);
    setActiveArtifactId((current) => updated.artifactPack.completed.some((artifact) => artifact.id === current)
      ? current : updated.artifactPack.completed[0]?.id ?? '');
  }

  function navigateArtifactTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!run || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = nextArtifactTabIndex(index, run.artifactPack.completed.length, event.key as 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End');
    navigationEpoch.current += 1;
    setActiveArtifactId(run.artifactPack.completed[next].id);
    focusTabAtIndex(artifactTabs.current, next);
  }

  function navigateRecipeTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = nextArtifactTabIndex(index, FIXTURE_RECIPES.length, event.key as 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End');
    navigationEpoch.current += 1;
    setSelectedRecipeId(FIXTURE_RECIPES[next].id);
    setSelectedFixtureVariant('complete');
    focusTabAtIndex(recipeTabs.current, next);
  }

  async function loadRuns(preferredRunId?: string) {
    const response = await fetch('/api/foundry/runs');
    if (!response.ok) throw new Error('The run ledger is unavailable.');
    const data = await response.json();
    const nextRuns: FoundryRun[] = data.runs ?? [];
    setRuns(nextRuns);
    setActiveRunId((current) => preferredRunId ?? (current || nextRuns[0]?.id || ''));
  }

  async function loadCaptures(): Promise<CaptureProjection[]> {
    const response = await fetch('/api/foundry/captures');
    if (!response.ok) throw new Error('Capture status is temporarily unavailable.');
    const data = await response.json();
    const nextCaptures: CaptureProjection[] = data.captures ?? [];
    setCaptures(nextCaptures);
    return nextCaptures;
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/capabilities').then((response) => response.ok ? response.json() : {}),
      fetch('/api/foundry/runs').then((response) => response.ok ? response.json() : { runs: [] }),
    ]).then(async ([rawCapabilities, runData]) => {
      if (cancelled) return;
      const nextCapabilities = rawCapabilities as Capabilities;
      const nextRuns: FoundryRun[] = runData.runs ?? [];
      setCapabilities(nextCapabilities);
      setRuns(nextRuns);
      setActiveRunId(nextRuns[0]?.id ?? '');
      setActiveArtifactId(nextRuns[0]?.artifactPack.completed[0]?.id ?? '');
      if (nextCapabilities.realUrlCapture?.enabled) {
        try { await loadCaptures(); } catch { setPollError('Capture status is temporarily unavailable. Retrying locally.'); }
      }
    }).catch(() => setError('The local Workbench API is not available yet.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!realUrlsEnabled || !captures.some((capture) => !TERMINAL_CAPTURE_STATES.has(capture.state))) return;
    const timer = window.setInterval(async () => {
      try {
        const next = await loadCaptures();
        setPollError('');
        const completed = next.find((capture) => capture.runId && TERMINAL_CAPTURE_STATES.has(capture.state));
        if (completed?.runId) await loadRuns(completed.runId);
      } catch { setPollError('Capture status is temporarily unavailable. Retrying locally.'); }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [realUrlsEnabled, captures.map((capture) => `${capture.id}:${capture.state}`).join('|')]);

  useEffect(() => {
    if (!run) return;
    setActiveArtifactId((current) => run.artifactPack.completed.some((artifact) => artifact.id === current)
      ? current : run.artifactPack.completed[0]?.id ?? '');
    setSourceKind(run.sourceConfirmation?.sourceKind ?? '');
    setSelectedClaimIds(run.sourceConfirmation?.confirmedClaimIds
      ?? run.artifactPack.completed.find((artifact) => artifact.type === 'quick_note')?.claimIds
      ?? []);
    setAngleLabel(run.sourceConfirmation ? run.angle.label : 'Source-led local explainer');
    setAngleFraming(run.sourceConfirmation ? run.angle.framing : 'A bounded internal draft assembled only from the selected immutable source assertions.');
  }, [run?.id, run?.version]);

  async function startFixture() {
    setOperation('fixture'); setError('');
    try {
      const response = await fetch('/api/foundry/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1' },
        body: JSON.stringify({
          fixtureId: selectedRecipe.fixtureId,
          fixtureVariant: selectedFixtureVariant,
          actor: 'local-editor',
          idempotencyKey: idempotencyKey(`fixture-${selectedRecipe.id}`),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'The fixture run could not start.'));
      upsertRun(body);
      announceStatus(fixtureReadyStatus(
        body.id,
        selectedRecipe.label,
        body.artifactPack?.completed?.length ?? 0,
        body.artifactPack?.failed ?? [],
      ));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The fixture run failed.'); }
    finally { setOperation(''); }
  }

  async function submitCapture(refresh = false) {
    if (!url.trim()) { setError('Enter one HTTPS source URL.'); urlInput.current?.focus(); return; }
    setOperation(refresh ? 'refresh' : 'capture'); setError('');
    try {
      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1', 'Idempotency-Key': idempotencyKey(refresh ? 'refresh' : 'capture') },
        body: JSON.stringify({ url: url.trim(), actor: 'local-editor', ...(refresh && run ? { expectedVersion: run.version } : {}) }),
      };
      const response = refresh && run ? await fetch(`/api/foundry/runs/${run.id}/refresh`, options) : await fetch('/api/foundry/captures', options);
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'The capture request failed safely.'));
      setCaptures((current) => [body, ...current.filter((capture) => capture.id !== body.id)]);
      setUrl('');
      announceStatus({ key: `capture:${body.id}:${body.state}`, message: refresh ? 'Source refresh queued locally.' : 'Source capture queued locally.' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The capture request failed safely.'); }
    finally { setOperation(''); }
  }

  async function confirmSource() {
    if (!run?.capture) return;
    setOperation('confirm'); setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/source-confirmation`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1' },
        body: JSON.stringify({ sourceKind, claimIds: selectedClaimIds, angleLabel, angleFraming, confirmer: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'Source confirmation failed.'));
      upsertRun(body);
      announceStatus({ key: `confirmation:${body.id}:${body.version}`, message: 'Source, claims and angle locked. The real-source V1 pack is ready for review.' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Source confirmation failed.'); }
    finally { setOperation(''); }
  }

  async function decide(decision: 'accepted' | 'rejected') {
    if (!run || !activeArtifact) return;
    const request: ReviewFocusTargetContext = {
      requestToken: reviewRequestToken.current + 1,
      runId: run.id,
      artifactId: activeArtifact.id,
      navigationEpoch: navigationEpoch.current,
    };
    reviewRequestToken.current = request.requestToken;
    setOperation('review'); setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1' },
        body: JSON.stringify({
          artifactId: activeArtifact.id, expectedArtifactVersion: activeArtifact.version,
          decision, reviewer: 'local-editor', expectedVersion: run.version,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'Review decision failed.'));
      upsertRun(body, false);
      announceStatus(reviewResultStatus(body.id, body.version, activeArtifact.id, artifactLabel(activeArtifact), decision));
      if (request.requestToken === reviewRequestToken.current) {
        setPendingReviewFocus({ ...request, target: reviewFocusAfterSuccess(decision) });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review decision failed.');
      if (request.requestToken === reviewRequestToken.current) {
        setPendingReviewFocus({ ...request, target: reviewFocusAfterFailure(decision) });
      }
    }
    finally { setOperation(''); }
  }

  const sourceById = new Map(run?.bundle.sourceItems.map((source) => [source.id, source]) ?? []);
  const currentRevision = useMemo(() => run?.capture?.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId), [run]);
  const confirmationCurrent = Boolean(run?.sourceConfirmation && run.capture?.currentAttemptId === run.sourceConfirmation.captureAttemptId);

  useEffect(() => {
    if (run && activeArtifact?.gateResults.some((gate) => gate.gate === 'media_render_ready' && !gate.passed && !gate.blocking)) {
      announceStatus(mediaWaitStatus(run.id, activeArtifact.id, activeArtifact.version, artifactLabel(activeArtifact)));
    }
  }, [run?.id, activeArtifact?.id, activeArtifact?.version]);

  useEffect(() => {
    if (operation || !pendingReviewFocus) return;
    if (shouldRestoreReviewFocus(pendingReviewFocus, {
      latestRequestToken: reviewRequestToken.current,
      runId: run?.id ?? null,
      artifactId: activeArtifact?.id ?? null,
      navigationEpoch: navigationEpoch.current,
    })) {
      focusReviewTarget(pendingReviewFocus.target, {
        acceptedHandoff: acceptedHandoffs.current.get(pendingReviewFocus.artifactId) ?? null,
        rejectAction: rejectActions.current.get(pendingReviewFocus.artifactId) ?? null,
        approveAction: approveActions.current.get(pendingReviewFocus.artifactId) ?? null,
      });
    }
    setPendingReviewFocus(null);
  }, [operation, pendingReviewFocus, run?.id, run?.version, activeArtifact?.id, currentReview?.decision]);

  return <main>
    <header className="masthead">
      <div className="wordmark"><span>Peninsula</span> <strong>Insider</strong></div>
      <div className="environment">PRIVATE WORKBENCH · LOOPBACK ONLY · NO PUBLISH</div>
    </header>

    <section className="hero">
      <p className="eyebrow">Content Foundry V1</p>
      <h1>One source. Every governed handoff.</h1>
      <p>Launch deterministic V1 recipe packs, or lock a real source before Article and Ask materialise. Review stays human and per artifact. Nothing records, renders, schedules, sends or publishes from this screen.</p>
    </section>

    <section className="intake panel" aria-labelledby="source-intake-title">
      <div className="panel-heading"><h2 id="source-intake-title">Source intake</h2><span className={`capability ${realUrlsEnabled ? 'on' : 'off'}`}>Real URL capture {realUrlsEnabled ? 'on' : 'off'}</span></div>
      <div className="intake-grid">
        <div className="fixture-launcher"><h3>Frozen recipe packs</h3><p>Deterministic and offline. Choose a governed lane and its exact test condition.</p>
          <div className="tab-rail"><div className="fixture-tabs" role="tablist" aria-label="Fixture recipe">{FIXTURE_RECIPES.map((recipe, index) => <button
            role="tab" id={`recipe-tab-${index}`} aria-controls="fixture-recipe-panel" aria-selected={selectedRecipe.id === recipe.id}
            ref={(element) => { recipeTabs.current[index] = element; }}
            tabIndex={rovingTabIndex(index, FIXTURE_RECIPES.findIndex((candidate) => candidate.id === selectedRecipe.id))} className={selectedRecipe.id === recipe.id ? 'secondary active' : 'secondary'}
            key={recipe.id} onKeyDown={(event) => navigateRecipeTabs(event, index)} onClick={() => { navigationEpoch.current += 1; setSelectedRecipeId(recipe.id); setSelectedFixtureVariant('complete'); }}
          >{recipe.label}</button>)}</div></div>
          <div id="fixture-recipe-panel" role="tabpanel" aria-labelledby={`recipe-tab-${FIXTURE_RECIPES.findIndex((recipe) => recipe.id === selectedRecipe.id)}`}>
            <p className="recipe-description">{selectedRecipe.description}</p>
            <label className="url-field" htmlFor="fixture-variant">Fixture condition</label>
            <select id="fixture-variant" value={selectedFixtureVariant} onChange={(event) => setSelectedFixtureVariant(event.target.value)}>
              {selectedRecipe.variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.label}</option>)}
            </select>
            <button className="secondary launch-button" onClick={startFixture} disabled={Boolean(operation)}>{operation === 'fixture' ? 'Starting…' : `Launch ${selectedRecipe.label}`}</button>
          </div></div>
        <form onSubmit={(event) => { event.preventDefault(); void submitCapture(false); }}>
          <h3>Real URL capture</h3><label className="url-field" htmlFor="source-url">HTTPS source URL</label>
          <div className="url-row"><input ref={urlInput} id="source-url" type="url" required inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={url} onChange={(event) => setUrl(event.target.value)} disabled={!realUrlsEnabled || Boolean(activeCapture)} placeholder="https://example.com/page" />
            <button type="submit" disabled={!realUrlsEnabled || Boolean(operation) || Boolean(activeCapture)}>{operation === 'capture' ? 'Starting…' : 'Capture URL'}</button></div>
          <p>{realUrlsEnabled ? 'HTTPS only, port 443. One page. Saved query values are redacted.' : 'Real URL capture is off by default. Enable only in the native loopback runtime.'}</p>
          <p className="scope-limit"><strong>V1 limit:</strong> real sources produce Quick Note, Article, metadata and Ask only. Newsletter, social, explainer, podcast and short-video lanes remain deterministic fixtures.</p>
        </form>
      </div>
    </section>

    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{liveStatusAnnouncement(liveStatus)}</div>
    {pollError && <div className="notice warning" role="status">{pollError}</div>}
    {activeCapture && <div className="capture-live" role="status" aria-live="polite"><strong>{captureCopy[activeCapture.state]}</strong></div>}
    {loading && <section className="empty" role="status"><h2>Loading Workbench</h2><p>Reading local run and capture ledgers.</p></section>}
    {!loading && !run && <section className="empty"><h2>No run yet</h2><p>Use the fixture, or enable bounded local URL capture.</p></section>}

    {run && <>
      <div className="run-select-row"><label htmlFor="active-run">Visible run</label><select id="active-run" value={run.id} onChange={(event) => { navigationEpoch.current += 1; setActiveRunId(event.target.value); }}>
        {runs.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.capture ? 'Real URL' : 'Fixture'} · {candidate.recipe.label} · {candidate.id}</option>)}
      </select></div>
      <section className="runbar">
        <div><span>RUN</span><strong>{run.id}</strong></div><div><span>STATUS</span><strong className={`status ${run.status}`}>{run.status.replaceAll('_', ' ')}</strong></div>
        <div><span>PACK</span><strong>v{run.artifactPack.version} · {run.artifactPack.completed.length} artifacts</strong></div><div><span>AI / PUBLISH</span><strong>Off / Off</strong></div>
      </section>

      {run.artifactPack.failed.length > 0 && <section className="notice warning pack-failures" aria-labelledby="pack-failures-title">
        <strong id="pack-failures-title">Partial pack: {run.artifactPack.failed.length} optional derivative failed</strong>
        <ul>{run.artifactPack.failed.map((failure) => <li key={`${failure.key}-${failure.attemptedAt}`}><span>{failure.key.replaceAll('-', ' ')}</span>: {failure.detail}</li>)}</ul>
      </section>}

      {run.capture && currentRevision && <section className="provenance panel" aria-labelledby="provenance-title">
        <div className="panel-heading"><h2 id="provenance-title">Source provenance</h2><span>{run.capture.revisions.length} immutable revision{run.capture.revisions.length === 1 ? '' : 's'}</span></div>
        <dl className="provenance-grid"><div><dt>Requested URL</dt><dd>{currentRevision.requestedUrl}</dd></div><div><dt>Capture attempt</dt><dd>{currentRevision.attemptId}</dd></div>
          {currentRevision.sourceRevision && <><div><dt>Source revision</dt><dd>{currentRevision.sourceRevision.id}</dd></div><div><dt>Content hash</dt><dd>{currentRevision.sourceRevision.contentHash}</dd></div></>}</dl>
        <div className="refresh-control"><p><strong>Capture a new revision</strong><br />Current source-dependent artifact reviews will become stale.</p>
          <button className="secondary" onClick={() => void submitCapture(true)} disabled={Boolean(operation) || Boolean(activeCapture) || !url.trim()}>{operation === 'refresh' ? 'Starting…' : 'Use URL above'}</button></div>
      </section>}

      {run.capture && <section className="panel source-review" aria-labelledby="confirmation-title">
        <div className="panel-heading"><h2 id="confirmation-title">Human source lock</h2><span className={`capability ${confirmationCurrent ? 'on' : 'off'}`}>{confirmationCurrent ? 'Current' : 'Required'}</span></div>
        <p>Choose the source class and supported assertions, then confirm the editorial angle. Article, metadata and Ask remain absent until this lock succeeds.</p>
        <label>Source classification<select value={sourceKind} onChange={(event) => setSourceKind(event.target.value)}><option value="">Choose a source type</option>{SOURCE_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <label>Angle label<input value={angleLabel} onChange={(event) => setAngleLabel(event.target.value)} /></label>
        <label>Angle framing<textarea rows={3} value={angleFraming} onChange={(event) => setAngleFraming(event.target.value)} /></label>
        <button onClick={confirmSource} disabled={Boolean(operation) || !sourceKind || !angleLabel.trim() || !angleFraming.trim() || selectedClaimIds.length === 0}>{operation === 'confirm' ? 'Locking…' : confirmationCurrent ? 'Reconfirm current source' : 'Lock source, claims and angle'}</button>
      </section>}

      <div className="workspace-grid">
        <section className="panel"><div className="panel-heading"><h2>Claim ledger</h2><span>{claims.length} assertions</span></div>
          {run.capture && <p className="trust-note">Source-supported means reproduced from this captured page. It does not mean independently verified.</p>}
          {claims.map((claim) => <article className="claim" key={claim.id}><div className="claim-top">
            {run.capture && <input type="checkbox" aria-label={`Select assertion: ${claim.text.slice(0, 80)}`} checked={selectedClaimIds.includes(claim.id)} disabled={claim.restrictedFromArtifacts}
              onChange={(event) => setSelectedClaimIds((current) => event.target.checked ? [...current, claim.id] : current.filter((id) => id !== claim.id))} />}
            <span className={`pill ${claim.verification}`}>{run.capture ? 'source-supported' : claim.verification}</span>{claim.restrictedFromArtifacts && <span className="pill restricted">held</span>}</div>
            <p>{claim.text}</p><small>{claim.origin.replaceAll('_', ' ')} · {claim.evidence.length} evidence locator{claim.evidence.length === 1 ? '' : 's'}</small>
            {claim.evidence.length > 0 && <details className="evidence-detail"><summary>Inspect immutable evidence</summary>{claim.evidence.map((item) => <div className="evidence-item" key={`${item.sourceItemId}-${item.locator}`}>
              <blockquote>{item.excerpt}</blockquote><dl><div><dt>Locator</dt><dd>{item.locatorType}: {item.locator}</dd></div><div><dt>Source</dt><dd>{sourceById.get(item.sourceItemId)?.uri ?? item.sourceItemId}</dd></div><div><dt>Excerpt hash</dt><dd>{item.excerptHash}</dd></div></dl>
            </div>)}</details>}{claim.restrictionReason && <div className="restriction">{claim.restrictionReason}</div>}</article>)}
        </section>

        <section className="panel artifact-panel"><div className="panel-heading"><h2>Artifact workbench</h2><span>Draft handoff only</span></div>
          <div className="tab-rail"><div className="artifact-tabs" role="tablist" aria-label="Artifact pack">{run.artifactPack.completed.map((artifact, index) => <button role="tab" id={`artifact-tab-${index}`}
            ref={(element) => { artifactTabs.current[index] = element; }}
            aria-controls={`artifact-panel-${index}`} aria-selected={activeArtifact?.id === artifact.id} tabIndex={rovingTabIndex(index, activeArtifactIndex)}
            className={activeArtifact?.id === artifact.id ? 'secondary active' : 'secondary'} key={artifact.id} onKeyDown={(event) => navigateArtifactTabs(event, index)}
            onClick={() => { navigationEpoch.current += 1; setActiveArtifactId(artifact.id); }}>{artifactLabel(artifact)}</button>)}</div></div>
          <div role="tabpanel" id={`artifact-panel-${Math.max(0, activeArtifactIndex)}`} aria-labelledby={`artifact-tab-${Math.max(0, activeArtifactIndex)}`}>
          {activeArtifact ? <><p className="section-label">{activeArtifact.id} · v{activeArtifact.version}</p><pre className="artifact-preview">{payloadPreview(activeArtifact)}</pre>
            <div className="gates">{activeArtifact.gateResults.map((gate) => <div key={gate.gate} className={gate.passed ? 'gate pass' : gate.blocking ? 'gate fail' : 'gate'}><strong>{gate.passed ? 'PASS' : gate.blocking ? 'BLOCK' : 'WAIT'}</strong><span>{gate.gate.replaceAll('_', ' ')}</span></div>)}</div>
            {activeArtifact.gateResults.some((gate) => gate.gate === 'media_render_ready' && !gate.passed && !gate.blocking) && <div className="notice media-wait">{MEDIA_WAIT_MESSAGE}</div>}
            {currentReview && <div className={`notice ${currentReview.decision === 'accepted' ? '' : 'warning'}`}>Current {currentReview.decision} review · receipt {currentReview.receiptHash?.slice(0, 12)}…</div>}
            <div className="actions"><button ref={(element) => { if (element) rejectActions.current.set(activeArtifact.id, element); else rejectActions.current.delete(activeArtifact.id); }} className="secondary" onClick={() => decide('rejected')} disabled={Boolean(operation) || Boolean(activeCapture)}>Reject</button>
              <button ref={(element) => { if (element) approveActions.current.set(activeArtifact.id, element); else approveActions.current.delete(activeArtifact.id); }} onClick={() => decide('accepted')} disabled={Boolean(operation) || Boolean(activeCapture) || activeBlockingGates.length > 0}>Approve draft handoff</button></div>
            {currentReview?.decision === 'accepted' && <a ref={(element) => { if (element) acceptedHandoffs.current.set(activeArtifact.id, element); else acceptedHandoffs.current.delete(activeArtifact.id); }} className="download" href={`/api/foundry/runs/${run.id}/artifacts/${activeArtifact.id}/handoff`}>Download reviewed text handoff</a>}
            {activeArtifact.type === 'quick_note' && currentReview?.decision === 'accepted' && <a className="download" href={`/api/foundry/runs/${run.id}/artifacts/${activeArtifact.id}/patch`}>Download reviewed Quick Note patch</a>}
            {activeArtifact.type === 'article_metadata' && patchState && <div className="patch-action">
              {patchState.ready
                ? <a className="download" href={`/api/foundry/runs/${run.id}/artifacts/${activeArtifact.id}/patch`}>Download reviewed Astro patch</a>
                : <button className="download" type="button" disabled aria-describedby="patch-blocked-reason">Astro patch unavailable</button>}
              <p id="patch-blocked-reason">{patchState.reason}</p>
            </div>}
          </> : <div className="empty"><h3>No materialised artifact</h3><p>Complete the human source lock to materialise the V1 pack.</p></div>}
          </div>
        </section>
      </div>
    </>}
  </main>;
}
