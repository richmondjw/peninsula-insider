import { useEffect, useMemo, useRef, useState } from 'react';
import type { CaptureProjection, FoundryRun } from '../shared/contracts';

const FIXTURE_ID = 'red-hill-winter-lunch';
const TERMINAL_CAPTURE_STATES = new Set(['extracted', 'held', 'no_story', 'failed']);
const SOURCE_KINDS = ['web', 'venue-site', 'press', 'social', 'gov', 'partner'] as const;

interface Capabilities {
  realUrlCapture?: { enabled?: boolean };
  externalCalls?: boolean;
}

const captureCopy: Record<string, string> = {
  queued: 'Capture queued locally.',
  capturing: 'Checking the public destination and capturing one page.',
  captured: 'Source stored as an immutable revision.',
  extracting: 'Extracting inert text. Scripts and subresources are not run.',
  extracted: 'Evidence is ready for review.',
  held: 'Capture held by the safety policy.',
  no_story: 'Captured safely, but no usable story text was found.',
  failed: 'Capture failed safely. No automatic retry was made.',
};

function safeFailureCopy(code?: string): string {
  if (!code) return 'The source could not be processed safely.';
  if (code.startsWith('redirect_')) return 'A redirect left the allowed public HTTPS boundary.';
  if (['https_required', 'port_blocked', 'credentials_blocked', 'special_use_hostname', 'non_public_address', 'source_mismatch'].includes(code)) {
    return 'This URL is outside the local capture policy.';
  }
  if (code.startsWith('dns_')) return 'The public destination could not be verified.';
  if (code.includes('timeout') || ['transport_failed', 'http_status'].includes(code)) return 'The source did not respond within capture limits.';
  if (code.includes('oversize')) return 'The response exceeded the safe capture limit.';
  if (code.includes('media_type') || code.includes('charset')) return 'The response format is not supported by the inert extractor.';
  return 'The source could not be processed safely.';
}

function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function safeApiError(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | undefined)?.error;
  if (typeof error === 'string') return error;
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? `${fallback} Code: ${code}` : fallback;
}

export function App() {
  const [runs, setRuns] = useState<FoundryRun[]>([]);
  const [activeRunId, setActiveRunId] = useState('');
  const [captures, setCaptures] = useState<CaptureProjection[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<'fixture' | 'capture' | 'refresh' | 'save' | 'review' | ''>('');
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState({ headline: '', dek: '', body: '' });
  const [sourceKind, setSourceKind] = useState('');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [angleConfirmed, setAngleConfirmed] = useState(false);
  const urlInput = useRef<HTMLInputElement>(null);

  const realUrlsEnabled = capabilities?.realUrlCapture?.enabled === true;
  const run = runs.find((candidate) => candidate.id === activeRunId) ?? runs[0] ?? null;
  const activeCapture = captures.find((capture) => ['queued', 'capturing'].includes(capture.state));

  function upsertRun(updated: FoundryRun) {
    setRuns((current) => [updated, ...current.filter((candidate) => candidate.id !== updated.id)]);
    setActiveRunId(updated.id);
  }

  async function loadRuns(preferredRunId?: string) {
    const response = await fetch('/api/foundry/runs');
    if (!response.ok) throw new Error('The run ledger is unavailable.');
    const data = await response.json();
    const nextRuns: FoundryRun[] = data.runs ?? [];
    setRuns(nextRuns);
    setActiveRunId((current) => preferredRunId ?? current ?? nextRuns[0]?.id ?? '');
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
    ]).then(async ([rawCapabilityData, runData]) => {
      if (cancelled) return;
      const capabilityData = rawCapabilityData as Capabilities;
      setCapabilities(capabilityData);
      const nextRuns: FoundryRun[] = runData.runs ?? [];
      setRuns(nextRuns);
      setActiveRunId(nextRuns[0]?.id ?? '');
      if (capabilityData?.realUrlCapture?.enabled === true) {
        try { await loadCaptures(); } catch { setPollError('Status is temporarily unavailable. Retrying locally.'); }
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
      } catch { setPollError('Status is temporarily unavailable. Retrying locally.'); }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [realUrlsEnabled, captures.map((capture) => `${capture.id}:${capture.state}`).join('|')]);

  useEffect(() => {
    if (!run) return;
    setDraft({ headline: run.artifact.payload.headline, dek: run.artifact.payload.dek ?? '', body: run.artifact.payload.body });
    setSelectedClaimIds(run.artifact.sourceReview?.confirmedClaimIds ?? run.artifact.claimIds);
    setSourceKind(run.artifact.sourceReview?.sourceKind ?? '');
    setAngleConfirmed(Boolean(run.artifact.sourceReview?.angleConfirmed));
  }, [run?.id, run?.artifact.version]);

  async function startFixture() {
    setOperation('fixture'); setError('');
    try {
      const response = await fetch('/api/foundry/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1' },
        body: JSON.stringify({ fixtureId: FIXTURE_ID, actor: 'local-editor', idempotencyKey: 'fixture-red-hill-v1' }),
      });
      if (!response.ok) throw new Error('The fixture run could not start.');
      upsertRun(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The fixture run failed.'); }
    finally { setOperation(''); }
  }

  async function submitCapture(refresh = false) {
    if (!url.trim()) {
      setError('Enter one HTTPS source URL.');
      urlInput.current?.focus();
      return;
    }
    setOperation(refresh ? 'refresh' : 'capture'); setError('');
    try {
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1', 'Idempotency-Key': idempotencyKey(refresh ? 'refresh' : 'capture') },
        body: JSON.stringify({ url: url.trim(), actor: 'local-editor', ...(refresh && run ? { expectedVersion: run.version } : {}) }),
      };
      const response = refresh && run
        ? await fetch(`/api/foundry/runs/${run.id}/refresh`, requestOptions)
        : await fetch('/api/foundry/captures', requestOptions);
      const body = await response.json();
      if (!response.ok) throw new Error(`${safeFailureCopy(body.error?.code)} Code: ${body.error?.code ?? 'capture_failed'}`);
      setCaptures((current) => [body, ...current.filter((capture) => capture.id !== body.id)]);
      setUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The capture request failed safely.');
      urlInput.current?.focus();
    } finally { setOperation(''); }
  }

  async function decide(decision: 'accepted' | 'rejected') {
    if (!run) return;
    setOperation('review'); setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1' },
        body: JSON.stringify({ decision, reviewer: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'Review decision failed.'));
      upsertRun(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review decision failed.'); }
    finally { setOperation(''); }
  }

  async function saveDraft() {
    if (!run) return;
    setOperation('save'); setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/artifact`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Foundry-CSRF': '1' },
        body: JSON.stringify({
          ...(!run.capture ? draft : {}), editor: 'local-editor', expectedVersion: run.version,
          ...(run.capture ? { sourceKind, claimIds: selectedClaimIds, confirmAngle: angleConfirmed } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(safeApiError(body, 'The draft could not be saved.'));
      upsertRun(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The draft could not be saved.'); }
    finally { setOperation(''); }
  }

  const sourceById = new Map(run?.bundle.sourceItems.map((source) => [source.id, source]) ?? []);
  const draftDirty = Boolean(run && (draft.headline !== run.artifact.payload.headline
    || draft.dek !== (run.artifact.payload.dek ?? '') || draft.body !== run.artifact.payload.body));
  const sourceReviewDirty = Boolean(run?.capture && (
    sourceKind !== (run.artifact.sourceReview?.sourceKind ?? '')
    || angleConfirmed !== Boolean(run.artifact.sourceReview?.angleConfirmed)
    || selectedClaimIds.join('|') !== (run.artifact.sourceReview?.confirmedClaimIds ?? run.artifact.claimIds).join('|')
  ));
  const unsaved = draftDirty || sourceReviewDirty;
  const reviewBlocked = Boolean(run && (run.blockers.length > 0 || run.artifact.gateResults.some((gate) => !gate.passed)
    || (run.capture && run.capture.currentAttemptId !== run.capture.artifactAttemptId)));
  const currentRevision = useMemo(() => run?.capture?.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId), [run]);
  const artifactRevision = useMemo(() => run?.capture?.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId), [run]);
  const latestStaleReview = run?.reviewHistory.filter((entry) => entry.validity === 'stale').at(-1);

  return (
    <main>
      <header className="masthead">
        <div className="wordmark"><span>Peninsula</span> <strong>Insider</strong></div>
        <div className="environment">PRIVATE WORKBENCH · LOOPBACK ONLY · NO PUBLISH</div>
      </header>

      <section className="hero">
        <p className="eyebrow">Content Foundry v0.2</p>
        <h1>Evidence first. One source, many useful outputs.</h1>
        <p>Capture one bounded source, inspect every claim, then make a human review decision. Nothing publishes from this screen.</p>
      </section>

      <section className="intake panel" aria-labelledby="source-intake-title">
        <div className="panel-heading">
          <h2 id="source-intake-title">Source intake</h2>
          <span className={`capability ${realUrlsEnabled ? 'on' : 'off'}`}>Real URL capture {realUrlsEnabled ? 'on' : 'off'}</span>
        </div>
        <div className="intake-grid">
          <div>
            <h3>Frozen fixture</h3>
            <p>Deterministic and offline. Replays the original review workflow without an external call.</p>
            <button className="secondary" onClick={startFixture} disabled={Boolean(operation)}>{operation === 'fixture' ? 'Starting fixture...' : 'Run fixture'}</button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void submitCapture(false); }}>
            <h3>Real URL capture</h3>
            <label className="url-field" htmlFor="source-url">HTTPS source URL</label>
            <div className="url-row">
              <input ref={urlInput} id="source-url" type="url" required inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={url} onChange={(event) => setUrl(event.target.value)} disabled={!realUrlsEnabled || Boolean(activeCapture)}
                aria-describedby="source-url-help" aria-invalid={error.startsWith('Enter one HTTPS') || undefined} placeholder="https://example.com/page" />
              <button type="submit" disabled={!realUrlsEnabled || Boolean(operation) || Boolean(activeCapture)}>
                {operation === 'capture' ? 'Starting capture...' : 'Capture URL'}
              </button>
            </div>
            <p id="source-url-help">{realUrlsEnabled
              ? 'HTTPS only, port 443. One page. Redirects are checked. Saved query values are redacted.'
              : 'Real URL capture is off. Enable FOUNDRY_REAL_URLS_ENABLED=1 only in the native loopback runtime.'}</p>
          </form>
        </div>
      </section>

      {error && <div className="notice error" role="alert">{error}</div>}
      {pollError && <div className="notice warning" role="status">{pollError}</div>}
      {activeCapture && <div className="capture-live" role="status" aria-live="polite"><strong>{captureCopy[activeCapture.state]}</strong></div>}

      {realUrlsEnabled && captures.length > 0 && <section className="capture-history panel" aria-labelledby="capture-history-title">
        <div className="panel-heading"><h2 id="capture-history-title">Capture activity</h2><span>{captures.length} attempt{captures.length === 1 ? '' : 's'}</span></div>
        <div className="capture-list">
          {captures.map((capture) => {
            const code = capture.materializationFailure?.code ?? capture.summary?.failure?.code ?? capture.summary?.outcomeReason?.code ?? capture.failure?.code;
            return <article className={`capture-row state-${capture.state}`} key={capture.id}>
              <div><span className={`pill ${capture.state}`}>{capture.state.replaceAll('_', ' ')}</span><strong>{capture.materializationFailure
                ? 'Capture is immutable, but its workflow projection needs operator recovery.'
                : captureCopy[capture.state]}</strong></div>
              <p className="safe-url">{capture.requestedUrl}</p>
              {code && <p>{safeFailureCopy(code)} <code>{code}</code></p>}
              {!capture.summary?.sourceRevision && TERMINAL_CAPTURE_STATES.has(capture.state) && <small>No source revision was created.</small>}
            </article>;
          })}
        </div>
      </section>}

      {loading && <section className="empty" role="status"><h2>Loading Workbench</h2><p>Reading the local run and capture ledgers.</p></section>}
      {!loading && !run && <section className="empty"><h2>No run yet</h2><p>Use the frozen fixture, or enable the bounded local URL capability.</p></section>}

      {run && <>
        <div className="run-select-row">
          <label htmlFor="active-run">Visible run</label>
          <select id="active-run" value={run.id} onChange={(event) => setActiveRunId(event.target.value)}>
            {runs.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.capture ? 'URL' : 'Fixture'} · {candidate.id}</option>)}
          </select>
        </div>
        <section className="runbar" aria-live="polite">
          <div><span>RUN</span><strong>{run.id}</strong></div>
          <div><span>STATUS</span><strong className={`status ${run.status}`}>{run.status.replaceAll('_', ' ')}</strong></div>
          <div><span>VERSION</span><strong>{run.version}</strong></div>
          <div><span>NETWORK</span><strong>{run.capture ? 'One bounded HTTPS capture' : 'None'}</strong></div>
        </section>

        {run.capture && currentRevision && artifactRevision && <section className="provenance panel" aria-labelledby="provenance-title">
          <div className="panel-heading"><h2 id="provenance-title">Source provenance</h2><span>{run.capture.revisions.length} immutable revision{run.capture.revisions.length === 1 ? '' : 's'}</span></div>
          {latestStaleReview && <div className="notice warning">Review stale: the source head changed after this decision. Review current evidence and approve again.</div>}
          {run.capture.currentAttemptId !== run.capture.artifactAttemptId && <div className="notice warning">
            The current source head contains no usable story text. The draft still depends on the previous revision and cannot be approved or downloaded.
          </div>}
          <dl className="provenance-grid">
            <div><dt>Requested URL</dt><dd>{currentRevision.requestedUrl}</dd></div>
            <div><dt>Freshness</dt><dd>Current source head</dd></div>
            <div><dt>Captured</dt><dd>{new Date(currentRevision.completedAt).toLocaleString('en-AU')}</dd></div>
            <div><dt>Capture attempt</dt><dd>{currentRevision.attemptId}</dd></div>
            {currentRevision.sourceRevision && <>
              <div><dt>Canonical URL</dt><dd>{currentRevision.sourceRevision.canonicalUrl}</dd></div>
              <div><dt>Source revision</dt><dd>{currentRevision.sourceRevision.id}</dd></div>
              <div><dt>Response</dt><dd>{currentRevision.sourceRevision.status} · {currentRevision.sourceRevision.mediaType} · {currentRevision.sourceRevision.decodedBytes.toLocaleString()} bytes</dd></div>
              <div><dt>Content hash</dt><dd>{currentRevision.sourceRevision.contentHash}</dd></div>
            </>}
            {currentRevision.extractionRevision && <>
              <div><dt>Extraction revision</dt><dd>{currentRevision.extractionRevision.id}</dd></div>
              <div><dt>Extractor</dt><dd>{currentRevision.extractionRevision.extractorVersion} · {currentRevision.extractionRevision.blockCount} blocks</dd></div>
            </>}
            {artifactRevision.attemptId !== currentRevision.attemptId && <div><dt>Draft dependency</dt><dd>{artifactRevision.attemptId} · superseded</dd></div>}
          </dl>
          <details><summary>Capture timeline ({currentRevision.events.length} states)</summary>
            <ol>{currentRevision.events.map((event, index) => <li key={`${event.state}-${index}`}><strong>{event.state.replaceAll('_', ' ')}</strong> · {new Date(event.at).toLocaleString('en-AU')}</li>)}</ol>
          </details>
          {currentRevision.redirects.length > 0 && <details><summary>Redirect chain ({currentRevision.redirects.length})</summary>
            <ol>{currentRevision.redirects.map((redirect, index) => <li key={`${redirect.url}-${index}`}><code>{redirect.status}</code> {redirect.url} → {redirect.location}</li>)}</ol>
          </details>}
          <div className="restrictions"><h3>Restrictions</h3><ul>{currentRevision.restrictions.map((restriction) => <li key={restriction}>{restriction}</li>)}</ul></div>
          <div className="refresh-control">
            <p><strong>Capture new revision</strong><br />Creates a new immutable source revision. Any review tied to the current revision will become stale.</p>
            <button className="secondary" onClick={() => void submitCapture(true)} disabled={Boolean(operation) || Boolean(activeCapture) || !url.trim()}>
              {operation === 'refresh' ? 'Starting revision...' : 'Create revision using URL above'}
            </button>
          </div>
        </section>}

        <div className="workspace-grid">
          <section className="panel">
            <div className="panel-heading"><h2>Claim ledger</h2><span>{run.claims.length} claims</span></div>
            {run.capture && <p className="trust-note">Supported means reproduced from this captured source. It does not mean independently verified.</p>}
            {run.claims.map((claim) => <article className="claim" key={claim.id}>
              <div className="claim-top">
                {run.capture && <input type="checkbox" aria-label={`Select source assertion: ${claim.text.slice(0, 80)}`}
                  checked={selectedClaimIds.includes(claim.id)} disabled={claim.restrictedFromArtifacts}
                  onChange={(event) => setSelectedClaimIds((current) => event.target.checked ? [...current, claim.id] : current.filter((id) => id !== claim.id))} />}
                <span className={`pill ${claim.verification}`}>{run.capture ? 'source-supported' : claim.verification}</span>
                {claim.restrictedFromArtifacts && <span className="pill restricted">held</span>}
              </div>
              <p>{claim.text}</p>
              <small>{claim.origin.replaceAll('_', ' ')} · {claim.evidence.length} evidence locator{claim.evidence.length === 1 ? '' : 's'}</small>
              {claim.evidence.length > 0 && <details className="evidence-detail"><summary>Inspect inert evidence</summary>
                {claim.evidence.map((item) => {
                  const source = sourceById.get(item.sourceItemId);
                  return <div className="evidence-item" key={`${item.sourceItemId}-${item.locator}`}>
                    <blockquote>{item.excerpt}</blockquote>
                    <dl>
                      <div><dt>Locator</dt><dd>{item.locatorType}: {item.locator}</dd></div>
                      <div><dt>Captured</dt><dd>{new Date(item.capturedAt).toLocaleString('en-AU')}</dd></div>
                      {item.extractionRevisionId && <div><dt>Extraction</dt><dd>{item.extractionRevisionId}</dd></div>}
                      <div><dt>Source</dt><dd>{source?.uri ?? item.sourceItemId}</dd></div>
                    </dl>
                  </div>;
                })}
              </details>}
              {claim.restrictionReason && <div className="restriction">{claim.restrictionReason}</div>}
            </article>)}
          </section>

          <section className="panel artifact-panel">
            <div className="panel-heading"><h2>Quick-note draft</h2><span>Draft only</span></div>
            {run.capture && <div className="source-review">
              <p>Real-source public copy is locked to the selected immutable assertions. Change the claim selection, then save to regenerate every factual segment.</p>
              <label>Source classification<select value={sourceKind} onChange={(event) => setSourceKind(event.target.value)}>
                <option value="">Choose a source type</option>{SOURCE_KINDS.map((kind) => <option value={kind} key={kind}>{kind}</option>)}
              </select></label>
              <label className="confirm-row"><input type="checkbox" checked={angleConfirmed} onChange={(event) => setAngleConfirmed(event.target.checked)} />
                I confirm the selected source assertions and this source-led angle for human review.</label>
            </div>}
            <p className="section-label">{run.artifact.payload.section} · {run.artifact.payload.tag}</p>
            <label className="editor-field"><span>Headline</span><textarea rows={2} value={draft.headline} readOnly={Boolean(run.capture)} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} /></label>
            <label className="editor-field"><span>Dek</span><textarea rows={3} value={draft.dek} readOnly={Boolean(run.capture)} onChange={(event) => setDraft({ ...draft, dek: event.target.value })} /></label>
            <label className="editor-field body-field"><span>Body</span><textarea rows={7} value={draft.body} readOnly={Boolean(run.capture)} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
            <div className="gates">{run.artifact.gateResults.map((gate) => <div key={gate.gate} className={gate.passed ? 'gate pass' : 'gate fail'}>
              <strong>{gate.passed ? 'PASS' : 'BLOCK'}</strong><span>{gate.gate.replaceAll('_', ' ')}</span>
            </div>)}</div>
            {unsaved && <div className="notice unsaved" role="status">Unsaved changes are not reviewed. Save them before approving a draft handoff.</div>}
            <div className="actions">
              <button className="secondary" onClick={saveDraft} disabled={Boolean(operation) || !unsaved || (Boolean(run.capture) && (!sourceKind || !angleConfirmed || selectedClaimIds.length === 0))}>Save changes</button>
              <button className="secondary" onClick={() => decide('rejected')} disabled={Boolean(operation) || Boolean(activeCapture)}>Reject</button>
              <button onClick={() => decide('accepted')} disabled={Boolean(operation) || Boolean(activeCapture) || unsaved || reviewBlocked}>Approve draft handoff</button>
            </div>
            {run.status === 'accepted' && !activeCapture && !unsaved && !reviewBlocked && <a className="download" href={`/api/foundry/runs/${run.id}/patch`}>Download reviewed patch</a>}
          </section>
        </div>
      </>}
    </main>
  );
}
