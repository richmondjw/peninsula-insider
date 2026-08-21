import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ArtifactVersion, CaptureProjection, FoundryRun } from '../shared/contracts';
import { patchReadiness } from '../shared/patch-readiness';
import { nextArtifactTabIndex } from '../shared/artifact-tabs';

const FIXTURE_ID = 'red-hill-url-article';
const TERMINAL_CAPTURE_STATES = new Set(['extracted', 'held', 'no_story', 'failed']);
const SOURCE_KINDS = ['web', 'venue-site', 'press', 'social', 'gov', 'partner'] as const;

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
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [url, setUrl] = useState('');
  const [sourceKind, setSourceKind] = useState('');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [angleLabel, setAngleLabel] = useState('Source-led local explainer');
  const [angleFraming, setAngleFraming] = useState('A bounded internal draft assembled only from the selected immutable source assertions.');
  const urlInput = useRef<HTMLInputElement>(null);

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

  function upsertRun(updated: FoundryRun) {
    setRuns((current) => [updated, ...current.filter((candidate) => candidate.id !== updated.id)]);
    setActiveRunId(updated.id);
    setActiveArtifactId((current) => updated.artifactPack.completed.some((artifact) => artifact.id === current)
      ? current : updated.artifactPack.completed[0]?.id ?? '');
  }

  function navigateArtifactTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!run || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = nextArtifactTabIndex(index, run.artifactPack.completed.length, event.key as 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End');
    setActiveArtifactId(run.artifactPack.completed[next].id);
    window.requestAnimationFrame(() => document.getElementById(`artifact-tab-${next}`)?.focus());
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
        body: JSON.stringify({ fixtureId: FIXTURE_ID, fixtureVariant: 'complete', actor: 'local-editor', idempotencyKey: 'fixture-url-article-v1' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'The fixture run could not start.'));
      upsertRun(body);
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Source confirmation failed.'); }
    finally { setOperation(''); }
  }

  async function decide(decision: 'accepted' | 'rejected') {
    if (!run || !activeArtifact) return;
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
      upsertRun(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review decision failed.'); }
    finally { setOperation(''); }
  }

  const sourceById = new Map(run?.bundle.sourceItems.map((source) => [source.id, source]) ?? []);
  const currentRevision = useMemo(() => run?.capture?.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId), [run]);
  const confirmationCurrent = Boolean(run?.sourceConfirmation && run.capture?.currentAttemptId === run.sourceConfirmation.captureAttemptId);

  return <main>
    <header className="masthead">
      <div className="wordmark"><span>Peninsula</span> <strong>Insider</strong></div>
      <div className="environment">PRIVATE WORKBENCH · LOOPBACK ONLY · NO PUBLISH</div>
    </header>

    <section className="hero">
      <p className="eyebrow">Content Foundry V1</p>
      <h1>One captured source. A reviewable content pack.</h1>
      <p>Lock source classification, claims and angle before Article or Ask materialises. Review stays human and per artifact. Nothing publishes from this screen.</p>
    </section>

    <section className="intake panel" aria-labelledby="source-intake-title">
      <div className="panel-heading"><h2 id="source-intake-title">Source intake</h2><span className={`capability ${realUrlsEnabled ? 'on' : 'off'}`}>Real URL capture {realUrlsEnabled ? 'on' : 'off'}</span></div>
      <div className="intake-grid">
        <div><h3>Frozen artifact pack</h3><p>Deterministic and offline. Includes exact hero rights for safe patch-adapter testing.</p>
          <button className="secondary" onClick={startFixture} disabled={Boolean(operation)}>{operation === 'fixture' ? 'Starting…' : 'Run fixture'}</button></div>
        <form onSubmit={(event) => { event.preventDefault(); void submitCapture(false); }}>
          <h3>Real URL capture</h3><label className="url-field" htmlFor="source-url">HTTPS source URL</label>
          <div className="url-row"><input ref={urlInput} id="source-url" type="url" required inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={url} onChange={(event) => setUrl(event.target.value)} disabled={!realUrlsEnabled || Boolean(activeCapture)} placeholder="https://example.com/page" />
            <button type="submit" disabled={!realUrlsEnabled || Boolean(operation) || Boolean(activeCapture)}>{operation === 'capture' ? 'Starting…' : 'Capture URL'}</button></div>
          <p>{realUrlsEnabled ? 'HTTPS only, port 443. One page. Saved query values are redacted.' : 'Real URL capture is off by default. Enable only in the native loopback runtime.'}</p>
        </form>
      </div>
    </section>

    {error && <div className="notice error" role="alert">{error}</div>}
    {pollError && <div className="notice warning" role="status">{pollError}</div>}
    {activeCapture && <div className="capture-live" role="status" aria-live="polite"><strong>{captureCopy[activeCapture.state]}</strong></div>}
    {loading && <section className="empty" role="status"><h2>Loading Workbench</h2><p>Reading local run and capture ledgers.</p></section>}
    {!loading && !run && <section className="empty"><h2>No run yet</h2><p>Use the fixture, or enable bounded local URL capture.</p></section>}

    {run && <>
      <div className="run-select-row"><label htmlFor="active-run">Visible run</label><select id="active-run" value={run.id} onChange={(event) => setActiveRunId(event.target.value)}>
        {runs.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.capture ? 'URL' : 'Fixture'} · {candidate.id}</option>)}
      </select></div>
      <section className="runbar" aria-live="polite">
        <div><span>RUN</span><strong>{run.id}</strong></div><div><span>STATUS</span><strong className={`status ${run.status}`}>{run.status.replaceAll('_', ' ')}</strong></div>
        <div><span>PACK</span><strong>v{run.artifactPack.version} · {run.artifactPack.completed.length} artifacts</strong></div><div><span>AI / PUBLISH</span><strong>Off / Off</strong></div>
      </section>

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
          <div className="artifact-tabs" role="tablist" aria-label="Artifact pack">{run.artifactPack.completed.map((artifact, index) => <button role="tab" id={`artifact-tab-${index}`}
            aria-controls={`artifact-panel-${index}`} aria-selected={activeArtifact?.id === artifact.id} tabIndex={activeArtifact?.id === artifact.id ? 0 : -1}
            className={activeArtifact?.id === artifact.id ? 'secondary active' : 'secondary'} key={artifact.id} onKeyDown={(event) => navigateArtifactTabs(event, index)}
            onClick={() => setActiveArtifactId(artifact.id)}>{artifactLabel(artifact)}</button>)}</div>
          <div role="tabpanel" id={`artifact-panel-${Math.max(0, activeArtifactIndex)}`} aria-labelledby={`artifact-tab-${Math.max(0, activeArtifactIndex)}`}>
          {activeArtifact ? <><p className="section-label">{activeArtifact.id} · v{activeArtifact.version}</p><pre className="artifact-preview">{payloadPreview(activeArtifact)}</pre>
            <div className="gates">{activeArtifact.gateResults.map((gate) => <div key={gate.gate} className={gate.passed ? 'gate pass' : gate.blocking ? 'gate fail' : 'gate'}><strong>{gate.passed ? 'PASS' : gate.blocking ? 'BLOCK' : 'WAIT'}</strong><span>{gate.gate.replaceAll('_', ' ')}</span></div>)}</div>
            {currentReview && <div className={`notice ${currentReview.decision === 'accepted' ? '' : 'warning'}`}>Current {currentReview.decision} review · receipt {currentReview.receiptHash?.slice(0, 12)}…</div>}
            <div className="actions"><button className="secondary" onClick={() => decide('rejected')} disabled={Boolean(operation) || Boolean(activeCapture)}>Reject</button>
              <button onClick={() => decide('accepted')} disabled={Boolean(operation) || Boolean(activeCapture) || activeBlockingGates.length > 0}>Approve draft handoff</button></div>
            {currentReview?.decision === 'accepted' && <a className="download" href={`/api/foundry/runs/${run.id}/artifacts/${activeArtifact.id}/handoff`}>Download reviewed text handoff</a>}
            {activeArtifact.type === 'quick_note' && currentReview?.decision === 'accepted' && <a className="download" href={`/api/foundry/runs/${run.id}/artifacts/${activeArtifact.id}/patch`}>Download reviewed Quick Note patch</a>}
            {activeArtifact.type === 'article_metadata' && patchState && <div className="patch-action" role="status">
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
