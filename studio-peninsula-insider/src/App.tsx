import { useEffect, useState } from 'react';
import type { FoundryRun } from '../shared/contracts';

const FIXTURE_ID = 'red-hill-winter-lunch';

export function App() {
  const [run, setRun] = useState<FoundryRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ headline: '', dek: '', body: '' });

  useEffect(() => {
    fetch('/api/foundry/runs')
      .then((response) => response.json())
      .then((data) => setRun(data.runs?.[0] ?? null))
      .catch(() => setError('The local API is not available yet.'));
  }, []);

  useEffect(() => {
    if (!run) return;
    setDraft({
      headline: run.artifact.payload.headline,
      dek: run.artifact.payload.dek ?? '',
      body: run.artifact.payload.body,
    });
  }, [run?.id, run?.artifact.version]);

  async function startRun() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/foundry/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: FIXTURE_ID, actor: 'local-editor', idempotencyKey: 'fixture-red-hill-v1' }),
      });
      if (!response.ok) throw new Error('The fixture run could not start.');
      setRun(await response.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The fixture run failed.');
    } finally { setBusy(false); }
  }

  async function decide(decision: 'accepted' | 'rejected') {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewer: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Review decision failed.');
      setRun(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review decision failed.');
    } finally { setBusy(false); }
  }

  async function saveDraft() {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/artifact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, editor: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The draft could not be saved.');
      setRun(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The draft could not be saved.');
    } finally { setBusy(false); }
  }

  const sourceById = new Map(run?.bundle.sourceItems.map((source) => [source.id, source]) ?? []);
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
        <div className="environment">PRIVATE WORKBENCH · FIXTURE MODE</div>
      </header>

      <section className="hero">
        <p className="eyebrow">Content Foundry v0.1</p>
        <h1>Evidence first. One source, many useful outputs.</h1>
        <p>Start with a frozen local fixture, inspect every claim, then make a human review decision. Nothing publishes from this screen.</p>
        <button onClick={startRun} disabled={busy}>{run ? 'Replay fixture safely' : 'Run the first fixture'}</button>
      </section>

      {error && <div className="notice error" role="alert">{error}</div>}
      {!run && <section className="empty"><h2>No run yet</h2><p>The first deterministic package is ready to prove the full review spine.</p></section>}

      {run && <>
        <section className="runbar" aria-live="polite">
          <div><span>RUN</span><strong>{run.id}</strong></div>
          <div><span>STATUS</span><strong className={`status ${run.status}`}>{run.status.replaceAll('_', ' ')}</strong></div>
          <div><span>VERSION</span><strong>{run.version}</strong></div>
          <div><span>EXTERNAL CALLS</span><strong>None</strong></div>
        </section>

        <div className="workspace-grid">
          <section className="panel">
            <div className="panel-heading"><h2 className="eyebrow">Claim ledger</h2><span>{run.claims.length} claims</span></div>
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
                      <div><dt>Captured</dt><dd>{new Date(item.capturedAt).toLocaleString('en-AU')}</dd></div>
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
