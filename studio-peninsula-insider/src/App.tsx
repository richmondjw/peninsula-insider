import { useEffect, useState } from 'react';
import type { FoundryRun } from '../shared/contracts';
import type { IntakeAttempt, SourceCapture } from '../shared/intake-contracts';

const FIXTURE_ID = 'red-hill-winter-lunch';
type QuickNoteRun = FoundryRun & { artifact: NonNullable<FoundryRun['artifact']>; claims: NonNullable<FoundryRun['claims']> };

function asQuickNoteRun(run: FoundryRun): QuickNoteRun | null {
  if (!run.artifact || run.artifact.type !== 'quick_note') return null;
  return { ...run, claims: run.claims ?? run.claimSet.claims, artifact: run.artifact };
}

function localTime(value: string): string {
  return new Date(value).toLocaleString('en-AU');
}

function freshness(capture: SourceCapture, now: number): string {
  if (!capture.capturedAt) return 'not captured';
  const ageMinutes = Math.max(0, Math.round((now - new Date(capture.capturedAt).getTime()) / 60000));
  const age = ageMinutes < 60 ? `${ageMinutes} min old` : `${Math.round(ageMinutes / 60)} h old`;
  if (!capture.freshUntil) return age;
  const expired = new Date(capture.freshUntil).getTime() <= now;
  return `${age} · ${expired ? 'stale, refresh before use' : `fresh until ${localTime(capture.freshUntil)}`}`;
}

function CaptureProvenance({ capture, index, total }: { capture: SourceCapture; index: number; total: number }) {
  const now = Date.now();
  return (
    <details className="evidence-detail" open={index === total - 1}>
      <summary>
        Revision {index + 1} of {total} · {capture.state.replaceAll('_', ' ')} · {capture.sourceRevisionId ?? 'no source revision'}
      </summary>
      <div className="evidence-item">
        <dl className="provenance">
          <div><dt>Source</dt><dd>{capture.requestedUrl}</dd></div>
          {capture.canonicalUrl && capture.canonicalUrl !== capture.requestedUrl
            && <div><dt>Resolved</dt><dd>{capture.canonicalUrl}</dd></div>}
          <div><dt>Captured</dt><dd>{capture.capturedAt ? localTime(capture.capturedAt) : 'never'}</dd></div>
          <div><dt>Freshness</dt><dd>{freshness(capture, now)}</dd></div>
          <div><dt>Attempt</dt><dd>{capture.attemptId}</dd></div>
          {capture.httpStatus !== undefined && <div><dt>Response</dt><dd>
            HTTP {capture.httpStatus} · {capture.mediaType} · {capture.charset} · {capture.contentEncoding}
          </dd></div>}
          <div><dt>Redirects</dt><dd>
            {capture.redirects.length === 0
              ? 'none'
              : capture.redirects.map((hop) => <span className="hop" key={`${hop.from}-${hop.to}`}>{hop.from} → {hop.status} → {hop.to}</span>)}
          </dd></div>
          <div><dt>Extracted</dt><dd>
            {capture.extractedBlockCount} block{capture.extractedBlockCount === 1 ? '' : 's'} · {capture.claimCount} claim{capture.claimCount === 1 ? '' : 's'}
            {capture.decodedBytes !== undefined ? ` · ${capture.decodedBytes} decoded bytes` : ''}
          </dd></div>
          {capture.extractionRevisionId && <div><dt>Extraction</dt><dd>{capture.extractionRevisionId}</dd></div>}
          {capture.contentBlobHash && <div><dt>Content</dt><dd>sha256:{capture.contentBlobHash}</dd></div>}
          {Object.entries(capture.responseHeaders).map(([name, value]) => (
            <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        {capture.restrictions.length > 0 && <div className="restriction">
          {capture.restrictions.map((restriction) => (
            <div key={restriction.code}>{restriction.code.replaceAll('_', ' ')}: {restriction.detail} ({restriction.blockCount})</div>
          ))}
        </div>}
        {capture.outcomeReason && <div className="restriction">{capture.outcomeReason.code}: {capture.outcomeReason.detail}</div>}
        {capture.failure && <div className="restriction">
          {capture.failure.stage} failure {capture.failure.code}: {capture.failure.message}
        </div>}
      </div>
    </details>
  );
}

export function App() {
  const [run, setRun] = useState<QuickNoteRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({ headline: '', dek: '', body: '' });
  const [realUrls, setRealUrls] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [attempts, setAttempts] = useState<IntakeAttempt[]>([]);

  async function loadIntake() {
    const response = await fetch('/api/foundry/intake');
    const body = await response.json() as { enabled?: boolean; attempts?: IntakeAttempt[] };
    setRealUrls(Boolean(body.enabled));
    setAttempts(body.attempts ?? []);
  }

  useEffect(() => {
    fetch('/api/foundry/runs')
      .then((response) => response.json())
      .then((data: { runs?: FoundryRun[] }) => {
        const quickNote = data.runs?.map(asQuickNoteRun).find((item): item is QuickNoteRun => Boolean(item));
        setRun(quickNote ?? null);
      })
      .catch(() => setError('The local API is not available yet.'));
    loadIntake().catch(() => setRealUrls(false));
  }, []);

  useEffect(() => {
    if (!run) return;
    setDraft({
      headline: run.artifact.payload.headline,
      dek: run.artifact.payload.dek ?? '',
      body: run.artifact.payload.body,
    });
  }, [run?.id, run?.artifact.version]);

  async function guard(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request failed.');
    } finally { setBusy(false); }
  }

  async function startRun() {
    setNotice('');
    return guard(async () => {
      const response = await fetch('/api/foundry/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: FIXTURE_ID, actor: 'local-editor', idempotencyKey: 'fixture-red-hill-v1' }),
      });
      if (!response.ok) throw new Error('The fixture run could not start.');
      const created = asQuickNoteRun(await response.json());
      if (!created) throw new Error('The quick-note fixture returned an incompatible artifact pack.');
      setRun(created);
    });
  }

  async function captureUrl() {
    setNotice('');
    return guard(async () => {
      const response = await fetch('/api/foundry/intake/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl.trim(), actor: 'local-editor' }),
      });
      const body = await response.json() as { error?: string; attempt?: IntakeAttempt; run?: FoundryRun | null };
      if (!response.ok) throw new Error(body.error ?? 'The capture could not be started.');
      await loadIntake();
      const captured = body.run ? asQuickNoteRun(body.run) : null;
      if (captured) {
        setRun(captured);
        setSourceUrl('');
        setNotice(`Captured source revision ${body.attempt?.capture?.sourceRevisionId ?? ''} and drafted a quick note for review.`);
        return;
      }
      setNotice(`Capture finished in state "${body.attempt?.state ?? 'unknown'}" with no draft. The audit record below records why.`);
    });
  }

  async function refreshSource() {
    if (!run) return;
    setNotice('');
    return guard(async () => {
      const response = await fetch(`/api/foundry/runs/${run.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json() as { error?: string; attempt?: IntakeAttempt; run?: FoundryRun | null };
      if (!response.ok) throw new Error(body.error ?? 'The refresh could not run.');
      await loadIntake();
      const refreshed = body.run ? asQuickNoteRun(body.run) : null;
      if (!refreshed) {
        setNotice(`Refresh finished in state "${body.attempt?.state ?? 'unknown'}"; the existing revision and review were left untouched.`);
        return;
      }
      setRun(refreshed);
      setNotice('A new immutable source revision was captured. Every review decision that depended on the previous revision is now stale.');
    });
  }

  async function decide(decision: 'accepted' | 'rejected') {
    if (!run) return;
    return guard(async () => {
      const response = await fetch(`/api/foundry/runs/${run.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewer: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Review decision failed.');
      const reviewed = asQuickNoteRun(body);
      if (!reviewed) throw new Error('The reviewed run is not quick-note compatible.');
      setRun(reviewed);
    });
  }

  async function saveDraft() {
    if (!run) return;
    return guard(async () => {
      const response = await fetch(`/api/foundry/runs/${run.id}/artifact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, editor: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The draft could not be saved.');
      const saved = asQuickNoteRun(body);
      if (!saved) throw new Error('The saved run is not quick-note compatible.');
      setRun(saved);
    });
  }

  const sourceById = new Map(run?.bundle.sourceItems.map((source) => [source.id, source]) ?? []);
  const captures = run?.captures ?? [];
  const draftDirty = Boolean(run && (
    draft.headline !== run.artifact.payload.headline
    || draft.dek !== (run.artifact.payload.dek ?? '')
    || draft.body !== run.artifact.payload.body
  ));
  const reviewBlocked = Boolean(run && (
    run.blockers.length > 0 || run.artifact.gateResults.some((gate) => !gate.passed)
  ));

  return (
    <main>
      <header className="masthead">
        <div className="wordmark"><span>Peninsula</span> <strong>Insider</strong></div>
        <div className="environment">PRIVATE WORKBENCH · {realUrls ? 'LOCAL REAL URL MODE' : 'FIXTURE MODE'}</div>
      </header>

      <section className="hero">
        <p className="eyebrow">Content Foundry v0.2</p>
        <h1>Evidence first. One source, many useful outputs.</h1>
        <p>Start with a frozen local fixture or one locally captured URL, inspect every claim and its provenance, then make a human review decision. Nothing publishes from this screen.</p>
        <button onClick={startRun} disabled={busy}>{run ? 'Replay fixture safely' : 'Run the first fixture'}</button>
      </section>

      <section className="panel intake-panel">
        <div className="panel-heading">
          <h2 className="eyebrow">Real URL intake</h2>
          <span>{realUrls ? 'Enabled locally' : 'Disabled'}</span>
        </div>
        {!realUrls && <p className="intake-off">
          Real URL capture is off. It stays unavailable unless <code>FOUNDRY_REAL_URLS_ENABLED=1</code> is set for a
          loopback-only local process. Nothing on this screen can reach the network while it is off.
        </p>}
        {realUrls && <>
          <label className="editor-field">
            <span>HTTPS source URL</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </label>
          <div className="actions">
            <button onClick={captureUrl} disabled={busy || sourceUrl.trim().length === 0}>Capture this source</button>
          </div>
        </>}
        {attempts.length > 0 && <div className="intake-ledger">
          {attempts.map((attempt) => <div className={`intake-row ${attempt.state}`} key={attempt.id}>
            <span className={`pill ${attempt.state}`}>{attempt.state.replaceAll('_', ' ')}</span>
            <span className="intake-url">{attempt.auditUrl ?? 'unparsable submission'}</span>
            <span className="intake-detail">
              {attempt.intent === 'refresh' ? 'refresh · ' : ''}
              {localTime(attempt.updatedAt)}
              {attempt.failure ? ` · ${attempt.failure.stage}/${attempt.failure.code}` : ''}
              {attempt.outcomeReason ? ` · ${attempt.outcomeReason.code}` : ''}
              {attempt.capture?.sourceRevisionId ? ` · ${attempt.capture.sourceRevisionId}` : ' · no source revision'}
            </span>
          </div>)}
        </div>}
      </section>

      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice unsaved" role="status">{notice}</div>}
      {!run && <section className="empty"><h2>No run yet</h2><p>The first deterministic package is ready to prove the full review spine.</p></section>}

      {run && <>
        <section className="runbar" aria-live="polite">
          <div><span>RUN</span><strong>{run.id}</strong></div>
          <div><span>STATUS</span><strong className={`status ${run.status}`}>{run.status.replaceAll('_', ' ')}</strong></div>
          <div><span>VERSION</span><strong>{run.version}</strong></div>
          <div><span>SOURCE</span><strong>{captures.length > 0 ? `Captured URL · revision ${captures.length}` : 'Frozen fixture'}</strong></div>
        </section>

        <div className="workspace-grid">
          <section className="panel">
            <div className="panel-heading"><h2 className="eyebrow">Claim ledger</h2><span>{run.claims.length} claims</span></div>
            {captures.length > 0 && <div className="capture-provenance">
              <h3 className="section-label">Capture provenance</h3>
              {captures.map((capture, index) => (
                <CaptureProvenance key={capture.attemptId} capture={capture} index={index} total={captures.length} />
              ))}
              <div className="actions">
                <button className="secondary" onClick={refreshSource} disabled={busy || !realUrls}>Refresh source</button>
              </div>
            </div>}
            {run.claims.map((claim) => <article className="claim" key={claim.id}>
              <div className="claim-top"><span className={`pill ${claim.verification}`}>{claim.verification}</span>{claim.restrictedFromArtifacts && <span className="pill restricted">held</span>}</div>
              <p>{claim.text}</p>
              <small>{claim.origin.replaceAll('_', ' ')} · {claim.evidence.length} evidence locator{claim.evidence.length === 1 ? '' : 's'}</small>
              {claim.evidence.length > 0 && <details className="evidence-detail">
                <summary>Inspect evidence</summary>
                {claim.evidence.map((item) => {
                  const source = sourceById.get(item.sourceItemId);
                  return <div className="evidence-item" key={`${item.sourceItemId}-${item.locator}`}>
                    <blockquote>{item.excerpt}</blockquote>
                    <dl>
                      <div><dt>Locator</dt><dd>{item.locatorType}: {item.locator}</dd></div>
                      <div><dt>Captured</dt><dd>{localTime(item.capturedAt)}</dd></div>
                      <div><dt>Source</dt><dd>{source?.uri ? <a href={source.uri} target="_blank" rel="noreferrer">{source.uri}</a> : item.sourceItemId}</dd></div>
                    </dl>
                  </div>;
                })}
              </details>}
              {claim.restrictionReason && <div className="restriction">{claim.restrictionReason}</div>}
            </article>)}
          </section>

          <section className="panel artifact-panel">
            <div className="panel-heading"><h2 className="eyebrow">Quick-note draft</h2><span>Draft only</span></div>
            <p className="section-label">{run.artifact.payload.section} · {run.artifact.payload.tag}</p>
            <label className="editor-field">
              <span>Headline</span>
              <textarea rows={2} value={draft.headline} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>Dek</span>
              <textarea rows={3} value={draft.dek} onChange={(event) => setDraft({ ...draft, dek: event.target.value })} />
            </label>
            <label className="editor-field body-field">
              <span>Body</span>
              <textarea rows={7} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
            </label>
            <div className="gates">
              {run.artifact.gateResults.map((gate) => <div key={gate.gate} className={gate.passed ? 'gate pass' : 'gate fail'}>
                <strong>{gate.passed ? 'PASS' : 'BLOCK'}</strong><span>{gate.gate.replaceAll('_', ' ')}</span>
              </div>)}
            </div>
            {draftDirty && <div className="notice unsaved" role="status">Unsaved changes are not reviewed. Save them before approving a draft handoff.</div>}
            <div className="actions">
              <button className="secondary" onClick={saveDraft} disabled={busy || !draftDirty}>Save changes</button>
              <button className="secondary" onClick={() => decide('rejected')} disabled={busy}>Reject</button>
              <button onClick={() => decide('accepted')} disabled={busy || draftDirty || reviewBlocked}>Approve draft handoff</button>
            </div>
            {run.status === 'accepted' && !draftDirty && <a className="download" href={`/api/foundry/runs/${run.id}/patch`}>Download reviewed patch</a>}
          </section>
        </div>
      </>}
    </main>
  );
}
