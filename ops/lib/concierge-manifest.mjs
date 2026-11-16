// Pure snapshot admission contract; storage must enforce the same transition atomically.
import {createHash} from 'node:crypto';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const nonempty = x => typeof x === 'string' && x.length > 0;
const instant = x => nonempty(x) && Number.isFinite(Date.parse(x));
const fields = ['indexSchema','embeddingModel','promptRevision','appRevision'];
export const bundleKey = bundle => hash(fields.map(k => bundle?.[k]));

export function validateManifest(m) {
  const errors = [];
  if (!m || m.schemaVersion !== 1) return ['manifest-schema'];
  for (const key of ['id','sourceRevision','sourceDigest']) if (!nonempty(m[key])) errors.push('missing-' + key);
  if (!fields.every(k => nonempty(m.bundle?.[k]))) errors.push('bundle-incomplete');
  if (!instant(m.sourceVerifiedAt) || !instant(m.contentPublishedAt) || !instant(m.ingestedAt) || !instant(m.retrievedAt)) errors.push('freshness-incomplete');
  if (Date.parse(m.retrievedAt) < Date.parse(m.ingestedAt)) errors.push('retrieved-before-ingested');
  if (m.state !== 'complete' || m.failures?.length || m.lockHeld !== true) errors.push('incomplete-or-failed');
  if (!Array.isArray(m.sourceRecords) || !Array.isArray(m.outcomes) || !Array.isArray(m.indexRows) || !Array.isArray(m.pages)) return [...errors, 'inventory-schema'];
  if (![...m.sourceRecords,...m.outcomes,...m.indexRows,...m.pages].every(r=>r && typeof r==='object' && !Array.isArray(r))) return [...errors,'record-schema'];
  if (!Array.isArray(m.failures)) errors.push('failure-ledger-missing');
  if (m.sourceDigest !== hash(m.sourceRecords)) errors.push('source-digest');
  const ids = m.sourceRecords.map(r => r.id), rowIds = m.indexRows.map(r => r.id), outcomeIds = m.outcomes.map(r => r.id);
  for (const [name, values] of [['source',ids],['index',rowIds],['outcome',outcomeIds]]) if (values.some(x => !nonempty(x)) || new Set(values).size !== values.length) errors.push(name + '-duplicates-or-missing-id');
  const source = new Map(m.sourceRecords.map(r => [r.id,r])), rows = new Map(m.indexRows.map(r => [r.id,r]));
  if (outcomeIds.length !== ids.length || ids.some(id => !outcomeIds.includes(id)) || outcomeIds.some(id => !source.has(id))) errors.push('unaccounted-source');
  for (const r of m.sourceRecords) if (!nonempty(r.revision) || !nonempty(r.effectiveRevision) || !['index','exclude'].includes(r.admission) || (r.admission === 'exclude' && !nonempty(r.exclusionReason))) errors.push('source-contract');
  for (const outcome of m.outcomes) {
    const r = source.get(outcome.id); if (!r) continue;
    if (outcome.status === 'failed') { errors.push('record-failed'); continue; }
    if (outcome.status === 'excluded') {
      if (r.admission !== 'exclude' || outcome.reason !== r.exclusionReason || rows.has(r.id)) errors.push('unjustified-exclusion');
    } else if (outcome.status === 'indexed') {
      const row = rows.get(r.id);
      if (r.admission !== 'index' || !row || row.revision !== r.effectiveRevision || outcome.revision !== r.effectiveRevision) errors.push('revision-or-admission-mismatch');
    } else errors.push('unknown-outcome');
  }
  if (rowIds.some(id => !source.has(id))) errors.push('stale-or-unexpected-index-row');
  // Every page is bound to the same snapshot and stable ordered ID inventory.
  const pageIds = m.pages.flatMap(p => Array.isArray(p.ids) ? p.ids : []);
  if (!m.pages.length || m.pages[0].cursor !== null || m.pages.at(-1).nextCursor !== null ||
      m.pages.some((p,i) => p.snapshot !== m.sourceRevision || !Array.isArray(p.ids) || (i > 0 && (p.cursor == null || p.cursor !== m.pages[i-1].nextCursor))) ||
      new Set(m.pages.map(p => p.cursor)).size !== m.pages.length || JSON.stringify(pageIds) !== JSON.stringify(ids)) errors.push('pagination-not-exhaustive');
  if (!Array.isArray(m.previousIndexedIds) || !Array.isArray(m.removedIds) ||
      [m.previousIndexedIds,m.removedIds].some(ids=>ids.some(id=>!nonempty(id))||new Set(ids).size!==ids.length)) errors.push('deletion-schema');
  else {
    const removed = m.previousIndexedIds.filter(id => !rowIds.includes(id)).sort();
    if (JSON.stringify(removed) !== JSON.stringify([...m.removedIds].sort())) errors.push('deletion-accounting');
  }
  return [...new Set(errors)];
}

export function cacheKey(m) { return hash([m.id,m.sourceDigest,bundleKey(m.bundle)]); }
export function promote(previous, candidate) {
  const errors = validateManifest(candidate);
  if(previous!==null&&validateManifest(previous).length)errors.push('invalid-predecessor');
  if(errors.length) return {active:previous,promoted:false,errors};
  // A replay of the exact active immutable snapshot is an idempotent no-op.
  // A reused ID with different bytes is never a retry.
  if(previous && candidate.id===previous.id) return hash(candidate)===hash(previous)
    ? {active:previous,promoted:true,errors:[]}
    : {active:previous,promoted:false,errors:['snapshot-id-reused']};
  const previousIds=previous?previous.indexRows.map(r=>r.id).sort():[];
  if(candidate.previousManifestDigest!==(previous?hash(previous):null)||
    JSON.stringify([...candidate.previousIndexedIds].sort())!==JSON.stringify(previousIds)) errors.push('predecessor-binding');
  if (errors.length) return { active: previous, promoted: false, errors };
  // Return a detached, immutable-by-contract copy; no mutation of the old snapshot.
  return { active: structuredClone(candidate), promoted: true, errors: [] };
}
export function rollback(current, previous, receipt) {
  if (validateManifest(previous).length || receipt?.bundleKey !== bundleKey(previous.bundle) ||
      receipt?.manifestDigest !== hash(previous) || receipt?.invalidateCacheKey !== cacheKey(current)) return { active: current, rolledBack: false };
  return { active: structuredClone(previous), rolledBack: true };
}
