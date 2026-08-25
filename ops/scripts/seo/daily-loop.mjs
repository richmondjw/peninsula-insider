// Recommendation-only SEO operating loop.
// Run after `npm run pull`: `npm run daily-loop`.
// It does not publish, edit pages/links, conduct outreach, or spend money.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, PRIORITY_URLS, WATCH_ONLY_LEGACY_URLS } from './config.mjs';

const MODE = 'recommendation-only-shadow';
const BUSINESS_DAYS = 10;
const args = process.argv.slice(2);
const option = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const date = option('--date') || new Date().toISOString().slice(0, 10);
const snapshotOption = option('--snapshot');
const dryRun = args.includes('--dry-run');
const dailyDir = path.join(PATHS.dataDir, 'daily');
const queueDir = path.join(PATHS.reportsDir, 'action-queue');
const priorityStateFile = path.join(PATHS.dataDir, 'priority-state.json');
const actionLedgerFile = path.join(PATHS.dataDir, 'action-ledger.json');

function canonical(value) {
  const url = new URL(value);
  url.protocol = 'https:';
  url.hostname = url.hostname.replace(/^www\./, '');
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname === '/' ? '/' : `${url.pathname.replace(/\/+$/, '')}/`;
  return url.toString();
}

function pathname(value) { return new URL(value).pathname; }

function addBusinessDays(value, count) {
  const result = new Date(`${value}T00:00:00Z`);
  let added = 0;
  while (added < count) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday > 0 && weekday < 6) added += 1;
  }
  return result.toISOString().slice(0, 10);
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function latestSnapshot() {
  const entries = (await fs.readdir(PATHS.dataDir))
    .filter((entry) => /^\d{4}-\d{2}-\d{2}\.json$/.test(entry)).sort();
  if (!entries.length) throw new Error(`No GSC snapshot found in ${PATHS.dataDir}`);
  return path.join(PATHS.dataDir, entries.at(-1));
}

async function writeImmutable(file, content) {
  try { await fs.writeFile(file, content, { encoding: 'utf8', flag: 'wx' }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Refusing to overwrite immutable output: ${file}`);
    throw error;
  }
}

function candidate(values) {
  return {
    mode: MODE,
    status: 'candidate_requires_editorial_or_human_gate',
    alternativesLost: 'Shadow mode is a queueing aid, not permission for production edits.',
    ...values,
  };
}

function seededActions() {
  const evaluationDate = addBusinessDays(date, 14);
  return [
    candidate({
      id: 'SEO-HOT-SPRINGS-RECIPROCAL-LINK', priority: 'high', score: 82, cluster: 'hot-springs', type: 'internal-link',
      evidence: 'Approved strategy identifies the Alba comparison as the high-performing decision article needing a reader-useful reciprocal link to the hot-springs guide.',
      proposedChange: 'Editorially review a prominent contextual link from /journal/peninsula-hot-springs-vs-alba/ to /explore/hot-springs/.',
      hypothesis: 'A contextual reciprocal link will consolidate topical authority toward the hot-springs guide without reducing the comparison article’s decision value.',
      expectedMetric: 'Guide impressions, position and CTR for hot-springs queries.', evaluationDate,
    }),
    candidate({
      id: 'SEO-DOG-FRIENDLY-CANONICAL-HUB-BRIEF', priority: 'high', score: 78, cluster: 'dog-friendly', type: 'content-consolidation-brief',
      evidence: 'Approved strategy requires one general dog-friendly hub, distinct winery/food/stay sub-intents, and links into that hub.',
      proposedChange: 'Create an editorial consolidation brief proposing /journal/dog-friendly-mornington-peninsula/ as canonical, with related pages mapped for review.',
      hypothesis: 'A reviewed general hub with distinct supporting sub-intents will reduce broad-query cannibalisation.',
      expectedMetric: 'Share of impressions and rankings for broad dog-friendly Mornington Peninsula queries.', evaluationDate,
    }),
  ];
}

function snapshotActions(snapshot) {
  const evaluationDate = addBusinessDays(date, 14);
  return (snapshot.pages || []).flatMap((row) => {
    const rawUrl = row.keys?.[0];
    if (!rawUrl || (row.impressions || 0) < 30 || (row.ctr || 0) >= 0.02 || row.position < 8 || row.position > 20) return [];
    const url = canonical(rawUrl);
    return [candidate({
      id: `SEO-CTR-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 10)}`,
      priority: 'normal', score: Math.min(75, Math.round(20 + row.impressions / 10 + (20 - row.position) * 2)), cluster: 'snapshot-derived', type: 'serp-ctr-experiment',
      evidence: `${pathname(url)} has ${row.impressions} impressions, ${(row.ctr * 100).toFixed(2)}% CTR and average position ${row.position.toFixed(1)} in the 28-day snapshot.`,
      proposedChange: `Review title, description and answer format for ${pathname(url)}.`,
      hypothesis: 'One focused snippet or answer-format change can lift CTR while position is monitored as a guardrail.',
      expectedMetric: 'CTR over two comparable 7-day windows.', evaluationDate,
    })];
  });
}

function priorityUrls(snapshot) {
  const inspections = new Map(Object.entries(snapshot.inspections || {}).map(([url, result]) => [canonical(url), result]));
  const metrics = new Map();
  for (const row of snapshot.pages || []) {
    if (!row.keys?.[0]) continue;
    const key = canonical(row.keys[0]);
    const total = metrics.get(key) || { clicks: 0, impressions: 0, positionWeight: 0 };
    total.clicks += row.clicks || 0;
    total.impressions += row.impressions || 0;
    total.positionWeight += (row.position || 0) * (row.impressions || 0);
    metrics.set(key, total);
  }
  return PRIORITY_URLS.map((rawUrl) => {
    const url = canonical(rawUrl);
    const inspection = inspections.get(url);
    const index = inspection?.indexStatusResult;
    const googleCanonical = index?.googleCanonical ? canonical(index.googleCanonical) : null;
    const userCanonical = index?.userCanonical ? canonical(index.userCanonical) : null;
    const page = metrics.get(url);
    return {
      url, inspected: Boolean(inspection), indexation: index?.verdict || 'NOT_OBSERVED', coverage: index?.coverageState || null,
      canonicalAgreement: inspection ? (!googleCanonical || googleCanonical === url) && (!userCanonical || userCanonical === url) : 'NOT_OBSERVED',
      metrics: page ? { clicks: page.clicks, impressions: page.impressions, ctr: page.clicks / page.impressions, position: page.positionWeight / page.impressions } : null,
    };
  });
}

function markdown(scorecard) {
  const lines = [
    `# SEO action queue — ${scorecard.date}`, '',
    `Mode: **${MODE}**. Recommendations only: no publishing, content/link edits, outreach or spend.`, '',
    `Source snapshot: \`${scorecard.source.file}\` (data date ${scorecard.source.runDate || 'unknown'}).`,
    `Shadow window: ${scorecard.shadowWindow.startsOn} to ${scorecard.shadowWindow.endsOn} (${BUSINESS_DAYS} business days).`, '',
    '## Recommended candidates', '',
  ];
  for (const item of scorecard.actions) {
    lines.push(`### ${item.id} (${item.priority}, score ${item.score})`, '', `- Status: ${item.status}`, `- Cluster: ${item.cluster}`, `- Evidence: ${item.evidence}`, `- Proposed change: ${item.proposedChange}`, `- Hypothesis: ${item.hypothesis}`, `- Expected metric: ${item.expectedMetric}`, `- Evaluation date: ${item.evaluationDate}`, `- Why alternatives lost: ${item.alternativesLost}`, '');
  }
  lines.push('## Priority URL guardrail', '', '| Canonical URL | Indexation | Canonical agreement |', '|---|---|---|');
  for (const item of scorecard.priorityUrls) lines.push(`| \`${pathname(item.url)}\` | ${item.indexation} | ${item.canonicalAgreement} |`);
  lines.push('', `Watch-only legacy redirects, excluded from KPI loss: ${WATCH_ONLY_LEGACY_URLS.map((url) => `\`${pathname(url)}\``).join(', ')}.`, '');
  return lines.join('\n');
}

async function main() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date must be YYYY-MM-DD');
  const snapshotFile = snapshotOption ? path.resolve(snapshotOption) : await latestSnapshot();
  const rawSnapshot = await fs.readFile(snapshotFile, 'utf8');
  const snapshot = JSON.parse(rawSnapshot);
  const actions = [...seededActions(), ...snapshotActions(snapshot)].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const scorecard = {
    schemaVersion: 1, date, generatedAt: new Date().toISOString(), mode: MODE,
    source: { file: path.relative(path.resolve(PATHS.dataDir, '..', '..'), snapshotFile), runDate: snapshot.runDate, sha256: crypto.createHash('sha256').update(rawSnapshot).digest('hex') },
    shadowWindow: { startsOn: date, endsOn: addBusinessDays(date, BUSINESS_DAYS) },
    priorityUrls: priorityUrls(snapshot), watchOnlyLegacyUrls: WATCH_ONLY_LEGACY_URLS.map(canonical), actions,
    safeguards: ['No publishing', 'No content or link edits', 'No outreach', 'No spend', 'PI editorial/publish gate required'],
  };
  const previousState = await readJson(priorityStateFile, { history: [] });
  const legacyLedger = await readJson(actionLedgerFile, { schemaVersion: 1, actions: {} });
  // Earlier shadow-mode prototypes used `urls` and an array ledger. Preserve
  // their data while migrating forward, rather than treating it as a failure.
  const ledger = {
    schemaVersion: 1,
    actions: Array.isArray(legacyLedger.actions)
      ? Object.fromEntries(legacyLedger.actions.map((item) => [item.id, item]))
      : (legacyLedger.actions || {}),
  };
  for (const item of actions) ledger.actions[item.id] = { ...item, lastSeen: date };
  const priorHistory = Array.isArray(previousState.history) ? previousState.history : [];
  const state = { schemaVersion: 1, mode: MODE, updatedAt: scorecard.generatedAt, latestScorecard: `daily/${date}.json`, priorityUrls: scorecard.priorityUrls, history: [...priorHistory, { date, scorecard: `daily/${date}.json` }].slice(-90) };
  if (dryRun) {
    console.log(JSON.stringify(scorecard, null, 2));
    return;
  }
  await fs.mkdir(dailyDir, { recursive: true });
  await fs.mkdir(queueDir, { recursive: true });
  await writeImmutable(path.join(dailyDir, `${date}.json`), `${JSON.stringify(scorecard, null, 2)}\n`);
  await writeImmutable(path.join(dailyDir, `${date}.md`), `${markdown(scorecard)}\n`);
  await writeImmutable(path.join(queueDir, `${date}.md`), `${markdown(scorecard)}\n`);
  await fs.writeFile(priorityStateFile, `${JSON.stringify(state, null, 2)}\n`);
  await fs.writeFile(actionLedgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`Shadow scorecard: ${path.join(dailyDir, `${date}.json`)}`);
  console.log(`Action queue: ${path.join(queueDir, `${date}.md`)}`);
}

main().catch((error) => { console.error(`daily-loop failed: ${error.message}`); process.exitCode = 1; });
