import { useEffect, useMemo, useState } from 'react';
import type { ArtifactVersion, FoundryRun } from '../shared/contracts';

const FIXTURES = [
  { id: 'red-hill-winter-lunch', label: 'Quick note' },
  { id: 'red-hill-url-article', label: 'Article + Ask' },
  { id: 'red-hill-newsletter-social', label: 'Insider Note + social' },
] as const;

function titleFor(type: ArtifactVersion['type']) {
  return type.replaceAll('_', ' ');
}

function currentReview(run: FoundryRun, artifact: ArtifactVersion) {
  return run.artifactPack.reviews.find((review) => (
    review.artifactId === artifact.id && review.artifactVersion === artifact.version && review.status === 'current'
  ));
}

function ArtifactPreview({ artifact }: { artifact: ArtifactVersion }) {
  if (artifact.type === 'insider_note_issue') {
    return <div className="position-list">
      {artifact.payload.positions.map((position) => <article className="position" key={position.id}>
        <div><span>{String(position.position).padStart(2, '0')}</span><strong>{position.key.replaceAll('_', ' ')}</strong></div>
        <small>{position.id}</small>
        <pre>{JSON.stringify(position, null, 2)}</pre>
      </article>)}
    </div>;
  }
  if (artifact.type === 'insider_note_subject_set') {
    return <div>
      <div className="authority-note">No pair is selected. Selection authority: James only.</div>
      <div className="subject-grid">{artifact.payload.pairs.map((pair) => <article key={pair.id}>
        <small>{pair.id}</small><strong>{pair.subject}</strong><p>{pair.previewText}</p>
      </article>)}</div>
    </div>;
  }
  return <pre className="payload-preview">{JSON.stringify(artifact.payload, null, 2)}</pre>;
}

export function App() {
  const [run, setRun] = useState<FoundryRun | null>(null);
  const [busyArtifactId, setBusyArtifactId] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ headline: '', dek: '', body: '' });

  useEffect(() => {
    fetch('/api/foundry/runs')
      .then((response) => response.json())
      .then((data: { runs?: FoundryRun[] }) => setRun(data.runs?.[0] ?? null))
      .catch(() => setError('The local API is not available yet.'));
  }, []);

  const quickArtifact = run?.artifact?.type === 'quick_note' ? run.artifact : null;
  useEffect(() => {
    if (!quickArtifact) return;
    setDraft({ headline: quickArtifact.payload.headline, dek: quickArtifact.payload.dek ?? '', body: quickArtifact.payload.body });
  }, [run?.id, quickArtifact?.version]);

  const sourceById = useMemo(() => new Map(run?.bundle.sourceItems.map((source) => [source.id, source]) ?? []), [run]);
  const draftDirty = Boolean(quickArtifact && (
    draft.headline !== quickArtifact.payload.headline
    || draft.dek !== (quickArtifact.payload.dek ?? '')
    || draft.body !== quickArtifact.payload.body
  ));

  async function startRun(fixtureId: typeof FIXTURES[number]['id'], fixtureVariant = 'complete') {
    setBusyArtifactId('run'); setError('');
    try {
      const response = await fetch('/api/foundry/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId, fixtureVariant, actor: 'local-editor', idempotencyKey: `${fixtureId}-${fixtureVariant}-${crypto.randomUUID()}` }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The fixture run could not start.');
      setRun(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The fixture run failed.'); }
    finally { setBusyArtifactId(''); }
  }

  async function decide(artifact: ArtifactVersion, decision: 'accepted' | 'rejected') {
    if (!run) return;
    setBusyArtifactId(artifact.id); setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId: artifact.id, decision, reviewer: 'local-editor', expectedVersion: run.version, expectedArtifactVersion: artifact.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Review decision failed.');
      setRun(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review decision failed.'); }
    finally { setBusyArtifactId(''); }
  }

  async function saveQuickDraft() {
    if (!run || !quickArtifact) return;
    setBusyArtifactId(quickArtifact.id); setError('');
    try {
      const response = await fetch(`/api/foundry/runs/${run.id}/artifact`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, editor: 'local-editor', expectedVersion: run.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The draft could not be saved.');
      setRun(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The draft could not be saved.'); }
    finally { setBusyArtifactId(''); }
  }

  return <main>
    <header className="masthead">
      <div className="wordmark"><span>Peninsula</span> <strong>Insider</strong></div>
      <div className="environment">PRIVATE WORKBENCH · FIXTURE MODE</div>
    </header>

    <section className="hero">
      <p className="eyebrow">Content Foundry v0.3</p>
      <h1>One evidence spine. Every draft reviewed on its own.</h1>
      <p>Build a governed fixture pack, inspect its lineage, and approve only safe draft handoffs. Nothing schedules, sends or publishes from this screen.</p>
      <div className="fixture-actions">{FIXTURES.map((fixture) => <button key={fixture.id} onClick={() => startRun(fixture.id)} disabled={Boolean(busyArtifactId)}>{fixture.label}</button>)}</div>
    </section>

    {error && <div className="notice error" role="alert">{error}</div>}
    {!run && <section className="empty"><h2>No run yet</h2><p>Choose a deterministic package to prove its review spine.</p></section>}

    {run && <>
      <section className="runbar" aria-live="polite">
        <div><span>RUN</span><strong>{run.id}</strong></div>
        <div><span>RECIPE</span><strong>{run.recipe.label}</strong></div>
        <div><span>STATUS</span><strong className={`status ${run.status}`}>{run.status.replaceAll('_', ' ')}</strong></div>
        <div><span>EXTERNAL CALLS</span><strong>None</strong></div>
      </section>

      <div className="workspace-grid">
        <section className="panel claims-panel">
          <div className="panel-heading"><h2 className="eyebrow">Claim ledger</h2><span>{run.claimSet.claims.length} claims</span></div>
          {run.claimSet.claims.map((claim) => <article className="claim" key={claim.id}>
            <div className="claim-top"><span className={`pill ${claim.verification}`}>{claim.verification}</span>{claim.restrictedFromArtifacts && <span className="pill restricted">held</span>}</div>
            <p>{claim.text}</p>
            <small>{claim.origin.replaceAll('_', ' ')} · {claim.evidence.length} evidence locator{claim.evidence.length === 1 ? '' : 's'}</small>
            {claim.evidence.length > 0 && <details className="evidence-detail"><summary>Inspect evidence</summary>
              {claim.evidence.map((item) => {
                const source = sourceById.get(item.sourceItemId);
                return <div className="evidence-item" key={`${item.sourceItemId}-${item.locator}`}>
                  <blockquote>{item.excerpt}</blockquote>
                  <dl><div><dt>Locator</dt><dd>{item.locatorType}: {item.locator}</dd></div><div><dt>Captured</dt><dd>{new Date(item.capturedAt).toLocaleString('en-AU')}</dd></div><div><dt>Source</dt><dd>{source?.uri ? <a href={source.uri} target="_blank" rel="noreferrer">{source.uri}</a> : item.sourceItemId}</dd></div></dl>
                </div>;
              })}
            </details>}
            {claim.restrictionReason && <div className="restriction">{claim.restrictionReason}</div>}
          </article>)}
        </section>

        <section className="artifact-stack" aria-label="Artifact review panels">
          {run.artifactPack.completed.map((artifact) => {
            const review = currentReview(run, artifact);
            const blocked = artifact.gateResults.some((gate) => !gate.passed && gate.blocking);
            const isQuick = artifact.type === 'quick_note' && quickArtifact?.id === artifact.id;
            return <article className="panel artifact-panel" key={artifact.id}>
              <div className="panel-heading"><h2>{titleFor(artifact.type)}</h2><span>v{artifact.version} · {review ? review.decision : 'unreviewed'}</span></div>
              <div className="artifact-meta"><span>{artifact.key}</span><span>{artifact.claimUsage.length} lineage bindings</span><span>Draft only</span></div>
              {isQuick ? <>
                <label className="editor-field"><span>Headline</span><textarea rows={2} value={draft.headline} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} /></label>
                <label className="editor-field"><span>Dek</span><textarea rows={3} value={draft.dek} onChange={(event) => setDraft({ ...draft, dek: event.target.value })} /></label>
                <label className="editor-field body-field"><span>Body</span><textarea rows={7} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
              </> : <ArtifactPreview artifact={artifact} />}
              <div className="gates">{artifact.gateResults.map((gate) => <div key={gate.gate} className={gate.passed ? 'gate pass' : gate.blocking ? 'gate fail' : 'gate warn'}><strong>{gate.passed ? 'PASS' : gate.blocking ? 'BLOCK' : 'WAIT'}</strong><span>{gate.gate.replaceAll('_', ' ')}</span></div>)}</div>
              {isQuick && draftDirty && <div className="notice unsaved" role="status">Unsaved changes are not reviewed. Save them before approving a draft handoff.</div>}
              <div className="actions">
                {isQuick && <button className="secondary" onClick={saveQuickDraft} disabled={Boolean(busyArtifactId) || !draftDirty}>Save changes</button>}
                <button className="secondary" onClick={() => decide(artifact, 'rejected')} disabled={Boolean(busyArtifactId)}>Reject</button>
                <button onClick={() => decide(artifact, 'accepted')} disabled={Boolean(busyArtifactId) || blocked || (isQuick && draftDirty)}>Approve draft handoff</button>
              </div>
              {review?.decision === 'accepted' && <a className="download" href={`/api/foundry/runs/${run.id}/artifacts/${artifact.id}/handoff`}>Download reviewed draft handoff</a>}
              {isQuick && run.status === 'accepted' && !draftDirty && <a className="download secondary-download" href={`/api/foundry/runs/${run.id}/patch`}>Download reviewed patch</a>}
            </article>;
          })}
        </section>
      </div>
    </>}
  </main>;
}
