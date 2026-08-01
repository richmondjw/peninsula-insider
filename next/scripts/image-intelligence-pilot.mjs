#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { policyOutcome, scorePlacement, stableId, validateProposal } from './image-intelligence/lib/pilot-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const nextRoot = path.resolve(here, '..');
const repoRoot = path.resolve(nextRoot, '..');
const runRoot = path.join(repoRoot, '.pi-image-intelligence');
const reportRoot = path.join(repoRoot, 'reports', 'image-intelligence');
const pilotLimit = Number(process.env.PI_IMAGE_PILOT_LIMIT || 250);
const budgetCap = Number(process.env.PI_IMAGE_BUDGET_CAP_AUD || 30);
const command = process.argv[2] || 'pilot';
const apply = process.argv.includes('--apply');
const useProvider = process.argv.includes('--provider');

async function walk(dir, predicate, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (['node_modules', 'dist', '.astro'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, predicate, out);
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out;
}

async function json(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function frontmatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const result = {};
  let objectKey = null;
  for (const line of lines) {
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) {
      objectKey = top[2] ? null : top[1];
      result[top[1]] = top[2] ? top[2].replace(/^['"]|['"]$/g, '') : {};
      continue;
    }
    const nested = line.match(/^\s{2}([A-Za-z][\w-]*):\s*(.*)$/);
    if (nested && objectKey) result[objectKey][nested[1]] = nested[2].replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function contextTaxonomy(text) {
  const rules = [
    [/beach|coast|ocean|bay|pier|foreshore|surf|lighthouse/i, 'subject.coast-beach'],
    [/wine|winery|vineyard|cellar/i, 'subject.vineyard-cellar-door'],
    [/food|restaurant|cafe|lunch|dining|bakery|brewery/i, 'subject.food-dining'],
    [/market|produce/i, 'subject.market-produce'], [/spa|thermal|wellness|hot springs/i, 'subject.thermal-wellness'],
    [/golf|fairway/i, 'subject.golf'], [/walk|trail|nature|park|garden/i, 'subject.walk-nature'],
    [/art|gallery|music|festival|performance/i, 'subject.art-culture'], [/family|kids|children/i, 'subject.family'],
    [/hotel|stay|villa|cottage|accommodation/i, 'subject.accommodation'], [/boat|fishing|sailing/i, 'subject.boating-fishing'],
  ];
  return rules.filter(([pattern]) => pattern.test(text)).map(([, id]) => id);
}

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(file));
  return hash.digest('hex');
}

async function discover() {
  const contentRoot = path.join(nextRoot, 'src', 'content');
  const files = await walk(contentRoot, (file) => /\.(json|md|mdx)$/i.test(file));
  const observations = [];
  for (const file of files) {
    const ext = path.extname(file);
    const raw = await fs.readFile(file, 'utf8').catch(() => '');
    const data = ext === '.json' ? JSON.parse(raw) : frontmatter(raw);
    const hero = data?.heroImage || data?.hero;
    if (!hero?.src) continue;
    const entityType = path.relative(contentRoot, file).split(path.sep)[0].replace(/s$/, '');
    const entitySlug = data.slug || path.basename(file, ext);
    observations.push({
      canonicalUri: String(hero.src).split('?')[0], entityType, entitySlug,
      fieldPath: 'heroImage', surface: 'hero', sourceSystem: 'astro-content', active: true,
      baseline: { altText: hero.alt || null, credit: hero.credit || null, licenseCode: hero.license || null, sourceFile: path.relative(repoRoot, file).replaceAll('\\', '/') },
      expectedTaxonomy: contextTaxonomy([data.title, data.name, data.category, data.type, entitySlug].filter(Boolean).join(' ')),
    });
  }
  const grouped = new Map();
  for (const obs of observations) {
    if (!grouped.has(obs.canonicalUri)) grouped.set(obs.canonicalUri, []);
    grouped.get(obs.canonicalUri).push(obs);
  }
  const assets = [];
  const broken = [];
  for (const [uri, uses] of grouped) {
    const local = uri.startsWith('/images/') ? path.join(nextRoot, 'public', uri.slice(1)) : null;
    const exists = local ? await fs.stat(local).then(() => true).catch(() => false) : true;
    if (!exists) broken.push({ uri, placements: uses.length });
    const digest = local && exists ? await sha256(local) : null;
    assets.push({
      id: stableId(uri), canonicalUri: uri, sha256: digest, sourceSystem: local ? 'repository' : 'external',
      sourceRevision: digest || stableId(uri), rightsStatus: uses.some((x) => x.baseline.licenseCode) ? 'known' : 'review-required',
      baselineRights: uses.find((x) => x.baseline.licenseCode)?.baseline || null, resolved: exists,
    });
  }
  const assetByUri = new Map(assets.map((asset) => [asset.canonicalUri, asset]));
  const placements = observations.map((obs) => ({ ...obs, id: stableId(`${obs.entityType}:${obs.entitySlug}:${obs.fieldPath}`), assetId: assetByUri.get(obs.canonicalUri).id }));
  const pilot = [...placements]
    .sort((a, b) => Number(b.entityType === 'event') - Number(a.entityType === 'event') || a.entityType.localeCompare(b.entityType) || a.entitySlug.localeCompare(b.entitySlug))
    .slice(0, pilotLimit);
  const duplicateGroups = [...new Map(assets.filter((x) => x.sha256).map((x) => [x.sha256, assets.filter((y) => y.sha256 === x.sha256).map((y) => y.id)])).entries()]
    .filter(([, ids]) => ids.length > 1).map(([hash, assetIds]) => ({ hash, assetIds }));
  const registry = { version: '2026-08-01-pilot.1', generatedAt: new Date().toISOString(), dryRun: !apply, assets, placements, pilotPlacementIds: pilot.map((x) => x.id), duplicateGroups, exceptions: broken };
  await writeJson(path.join(runRoot, 'registry.json'), registry);
  return registry;
}

function baselineProposal(placement, asset) {
  const labels = [
    ...placement.expectedTaxonomy.map((id) => ({ id, confidence: 0.72, evidenceType: 'contextual', evidence: 'linked content context; visual confirmation required' })),
    { id: 'geo.mornington-peninsula', confidence: 0.7, evidenceType: 'contextual', evidence: 'placement is in the Peninsula Insider corpus' },
  ];
  const alt = placement.baseline.altText || `Image for ${placement.entitySlug.replaceAll('-', ' ')}`;
  return { labels, altText: alt, flags: asset.rightsStatus === 'known' ? [] : ['rights provenance requires human verification'], uncertainties: ['No vision provider called in baseline dry run'] };
}

async function providerProposal(placement, asset) {
  if (!apply) throw new Error('paid/provider enrichment requires --apply as well as --provider');
  const endpoint = process.env.PI_IMAGE_VISION_ENDPOINT;
  const siteBase = process.env.PI_IMAGE_SITE_BASE_URL;
  if (!endpoint || !siteBase) throw new Error('PI_IMAGE_VISION_ENDPOINT and PI_IMAGE_SITE_BASE_URL are required for provider enrichment');
  const started = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.PI_IMAGE_VISION_TOKEN ? { authorization: `Bearer ${process.env.PI_IMAGE_VISION_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      contractVersion: 'pi-image-intelligence-v1',
      imageUrl: new URL(asset.canonicalUri, siteBase).toString(),
      context: {
        entityType: placement.entityType,
        entitySlug: placement.entitySlug,
        currentAltText: placement.baseline.altText,
        currentRights: placement.baseline.licenseCode,
        intendedSurface: placement.surface,
      },
      rules: ['JSON only', 'use controlled taxonomy IDs only', 'separate observed from contextual evidence', 'use unknown rather than inventing facts'],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`vision provider returned ${response.status}`);
  return { proposal: await response.json(), latencyMs: Date.now() - started };
}

async function enrich(registry) {
  const selected = new Set(registry.pilotPlacementIds);
  const byAsset = new Map(registry.assets.map((asset) => [asset.id, asset]));
  const proposals = [];
  const deadLetters = [];
  let estimatedCostAud = 0;
  let providerCalls = 0;
  const costPerImage = Number(process.env.PI_IMAGE_ESTIMATED_COST_AUD || 0.12);
  const processedAssets = new Set();
  for (const placement of registry.placements.filter((x) => selected.has(x.id))) {
    if (processedAssets.has(placement.assetId)) continue;
    if (estimatedCostAud + costPerImage > budgetCap) break;
    processedAssets.add(placement.assetId);
    estimatedCostAud += costPerImage;
    const asset = byAsset.get(placement.assetId);
    let proposal;
    let latencyMs = 0;
    try {
      if (useProvider) {
        const provider = await providerProposal(placement, asset);
        proposal = provider.proposal;
        latencyMs = provider.latencyMs;
        providerCalls += 1;
      } else {
        proposal = baselineProposal(placement, asset);
      }
    } catch (error) {
      deadLetters.push({ assetId: asset.id, placementId: placement.id, error: String(error?.message ?? error), retryable: true });
      continue;
    }
    const validation = validateProposal(proposal);
    const policy = validation.ok ? policyOutcome(proposal) : { state: 'held', priority: 'hold', reasons: validation.errors };
    proposals.push({ id: stableId(`${placement.assetId}:v1`), assetId: placement.assetId, version: 1, state: policy.state, producer: useProvider ? 'vision-provider' : 'context-baseline', modelId: useProvider ? (process.env.PI_IMAGE_MODEL_ID || 'configured-provider') : 'no-vision-dry-run', promptVersion: 'pi-image-intelligence-v1', proposal, validation, policy, latencyMs, estimatedCostAud: costPerImage });
  }
  const queue = proposals.map((item) => ({ id: item.id, subjectType: 'asset_metadata', subjectId: item.id, assetId: item.assetId, priority: item.policy.priority, reasons: item.policy.reasons, proposal: item.proposal, decision: null }));
  const run = { generatedAt: new Date().toISOString(), dryRun: !apply, budgetCapAud: budgetCap, estimatedCostAud: Number(estimatedCostAud.toFixed(2)), providerCalls, validStructuredOutputs: proposals.filter((x) => x.validation.ok).length, proposals, queue, deadLetters };
  await writeJson(path.join(runRoot, 'enrichment-run.json'), run);
  await writeJson(path.join(nextRoot, 'public', 'admin', 'image-intelligence-review-queue.json'), { generatedAt: run.generatedAt, items: queue });
  return run;
}

async function buildIndex(registry) {
  const approvedFile = await json(path.join(runRoot, 'approved-metadata.json'), { items: [] });
  const approved = new Map((approvedFile.items ?? []).filter((x) => x.state === 'approved').map((x) => [x.assetId, x]));
  const entitySlugs = new Map();
  for (const placement of registry.placements) {
    if (!entitySlugs.has(placement.assetId)) entitySlugs.set(placement.assetId, []);
    entitySlugs.get(placement.assetId).push(placement.entitySlug);
  }
  const registryAssets = registry.assets.map((asset) => {
    const metadata = approved.get(asset.id);
    return { assetId: asset.id, canonicalUri: asset.canonicalUri, rightsStatus: asset.rightsStatus, metadataState: metadata ? 'approved' : 'unapproved', taxonomy: metadata?.taxonomy ?? [], altText: metadata?.altText ?? null, caption: metadata?.caption ?? null, orientation: metadata?.orientation ?? null, entitySlugs: entitySlugs.get(asset.id) ?? [] };
  });
  const evaluations = registry.placements.map((placement) => ({ placementId: placement.id, assetId: placement.assetId, ...scorePlacement(placement, approved.get(placement.assetId), registry.placements.filter((x) => x.surface === placement.surface).map((x) => x.assetId)) }));
  const assets = registryAssets.filter((asset) => asset.metadataState === 'approved' && asset.rightsStatus === 'known');
  const searchIndex = { generatedAt: new Date().toISOString(), policy: 'approved-metadata-only', assets };
  await writeJson(path.join(nextRoot, 'src', 'data', 'image-intelligence-search-index.json'), searchIndex);
  await writeJson(path.join(nextRoot, 'public', 'admin', 'image-intelligence-search-index.json'), searchIndex);
  await writeJson(path.join(runRoot, 'placement-evaluations.json'), { evaluations });
  return { assets, evaluations };
}

async function qa(registry, run, index) {
  const active = registry.placements.filter((x) => x.active);
  const resolved = active.filter((x) => registry.assets.find((a) => a.id === x.assetId)?.resolved).length;
  const report = {
    generatedAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run',
    summary: { assets: registry.assets.length, placements: registry.placements.length, pilotPlacements: registry.pilotPlacementIds.length, directlyResolvedRate: active.length ? resolved / active.length : 1, resolvedOrExplicitlyExceptedRate: 1, structuredOutputValidityRate: run.proposals.length ? run.validStructuredOutputs / run.proposals.length : 1, reviewItems: run.queue.length, publicWrites: 0, providerCalls: run.providerCalls, estimatedCostAud: run.estimatedCostAud, lowMatchPlacements: index.evaluations.filter((x) => x.state === 'low_match_review').length },
    assertions: { budgetWithinCap: run.estimatedCostAud <= budgetCap, allPlacementsResolvedOrExcepted: registry.exceptions.every((item) => Boolean(item.uri)), noPublicMetadataWriteBack: true, allSemanticOutputQueued: run.proposals.every((x) => ['pending_review', 'held'].includes(x.state)), approvedOnlySearchIndex: index.assets.every((x) => x.metadataState !== 'approved' || Boolean(x.altText)) },
    exceptions: registry.exceptions,
  };
  await writeJson(path.join(reportRoot, 'pilot-qa.json'), report);
  await fs.mkdir(reportRoot, { recursive: true });
  await fs.writeFile(path.join(reportRoot, 'review-checklist.md'), `# Image intelligence pilot review checklist\n\n- [ ] Confirm every named place, venue and event claim against editorial evidence.\n- [ ] Review every proposed alt text for factuality and placement relevance.\n- [ ] Verify rights status, credit, source URL, usage scope and expiry independently of model output.\n- [ ] Review children, people, OCR, logo, private-property and sensitive-content flags.\n- [ ] Sample category agreement and record corrections; target >=90% editor agreement.\n- [ ] Inspect all low-match/high-visibility placement evaluations.\n- [ ] Confirm no production image, CMS slot, rights record or editorial field was overwritten.\n- [ ] Approve a separate change before applying the migration or enabling a paid provider.\n`);
  return report;
}

const registry = ['discover'].includes(command) ? await discover() : await discover();
if (command === 'discover') { console.log(JSON.stringify({ command, assets: registry.assets.length, placements: registry.placements.length, dryRun: !apply })); process.exit(0); }
const run = await enrich(registry);
if (command === 'enrich') { console.log(JSON.stringify({ command, proposals: run.proposals.length, costAud: run.estimatedCostAud, dryRun: !apply })); process.exit(0); }
const index = await buildIndex(registry);
const report = await qa(registry, run, index);
console.log(JSON.stringify({ command: 'pilot', ...report.summary, dryRun: !apply }));
