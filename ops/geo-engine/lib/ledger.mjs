// The optimisation ledger — the system's durable memory.
//
// Without this the engine rediscovers the same problem every morning and reports
// it as new. The ledger records what was seen, what was recommended, what was
// changed, what James decided, what is still awaiting measurement, and what the
// measurement eventually showed.

import path from 'node:path';
import { STATE_DIR, daysBetween, readJson, round, writeJson } from './util.mjs';

const DEFAULT = () => ({
  version: 1,
  createdAt: new Date().toISOString(),
  runs: [],
  issues: {},          // stable issue id -> lifecycle record
  interventions: [],   // every change the engine made or proposed
  decisions: [],       // human accept/reject decisions
  lessons: [],
});

export class Ledger {
  constructor(file = path.join(STATE_DIR, 'ledger.json')) {
    this.file = file;
    this.data = readJson(file, null) ?? DEFAULT();
  }

  /** Split current findings into genuinely new, still-open and newly resolved. */
  reconcileIssues(opportunities, runId, today) {
    const seen = new Set();
    const isNew = [];
    const recurring = [];

    for (const opp of opportunities) {
      seen.add(opp.id);
      const prior = this.data.issues[opp.id];
      if (!prior) {
        this.data.issues[opp.id] = {
          id: opp.id, urlPath: opp.urlPath, rule: opp.rule,
          firstSeenAt: today, lastSeenAt: today, seenCount: 1,
          status: 'open', runsObserved: [runId], resolvedAt: null,
        };
        isNew.push(opp);
      } else {
        prior.lastSeenAt = today;
        prior.seenCount += 1;
        prior.status = 'open';
        prior.resolvedAt = null;
        if (prior.runsObserved.length < 50) prior.runsObserved.push(runId);
        recurring.push({ ...opp, firstSeenAt: prior.firstSeenAt, seenCount: prior.seenCount });
      }
    }

    const resolved = [];
    for (const [id, issue] of Object.entries(this.data.issues)) {
      if (seen.has(id) || issue.status === 'resolved') continue;
      issue.status = 'resolved';
      issue.resolvedAt = today;
      resolved.push(issue);
    }

    return { isNew, recurring, resolved };
  }

  /** Record an intervention as an experiment with a measurement window. */
  recordIntervention(entry) {
    const record = {
      id: `${entry.runId}:${entry.urlPath}:${entry.action}`,
      date: entry.date,
      runId: entry.runId,
      urlPath: entry.urlPath,
      problem: entry.problem,
      action: entry.action,
      mode: entry.mode,                       // 'applied' | 'recommended'
      scoresBefore: entry.scoresBefore ?? null,
      measurementEligibility: entry.searchBefore && entry.searchBefore.impressions >= 50 && entry.searchBefore.clicks >= 10
        ? 'search_comparison' : 'technical_only_sparse_baseline',
      changeMade: entry.changeMade ?? null,
      expectedOutcome: entry.expectedOutcome ?? null,
      measurementWindowDays: entry.measurementWindowDays ?? 28,
      searchBefore: entry.searchBefore ?? null,
      searchAfter: null,
      geoBefore: entry.geoBefore ?? null,
      geoAfter: null,
      deployedSha: entry.deployedSha ?? null,
      deployedAt: entry.deployedAt ?? null,
      searchWindowBefore: entry.searchWindowBefore ?? null,
      result: entry.mode === 'deployed' && entry.deployedSha ? 'awaiting_measurement' : 'not_deployed',
      lesson: null,
      confidence: entry.confidence ?? null,
      provider: entry.provider ?? null,
      rollback: entry.rollback ?? null,
    };
    this.data.interventions.push(record);
    return record;
  }

  lastInterventionFor(urlPath) {
    let latest = null;
    for (const i of this.data.interventions) {
      if (i.urlPath !== urlPath || i.mode !== 'deployed' || !i.deployedSha) continue;
      if (!latest || i.date >= latest.date) latest = i;
    }
    return latest;
  }

  /** Interventions whose observation window has elapsed and can now be judged. */
  dueForMeasurement(today) {
    return this.data.interventions.filter((i) => {
      if (i.mode !== 'deployed' || !i.deployedSha || !i.deployedAt || i.result !== 'awaiting_measurement') return false;
      const elapsed = daysBetween(i.deployedAt, today);
      return elapsed !== null && elapsed >= (i.measurementWindowDays ?? 28);
    });
  }

  /**
   * Close out an experiment. Sparse or missing data is recorded as
   * inconclusive rather than being talked up into a win.
   */
  measure(interventionId, { searchAfter, geoAfter, window }) {
    const rec = this.data.interventions.find((i) => i.id === interventionId);
    if (!rec || rec.mode !== 'deployed' || !rec.deployedSha || rec.result !== 'awaiting_measurement') return null;
    // Require a complete non-overlapping, same-length post-deployment window.
    const beforeWindow = rec.searchWindowBefore;
    if (!beforeWindow || !window || window.start_date <= rec.deployedAt.slice(0, 10)
      || beforeWindow.end_date >= rec.deployedAt.slice(0, 10)
      || daysBetween(window.start_date, window.end_date) !== daysBetween(beforeWindow.start_date, beforeWindow.end_date)
      || daysBetween(window.start_date, window.end_date) < rec.measurementWindowDays - 1) return null;
    rec.searchWindowAfter = window;
    rec.searchAfter = searchAfter ?? null;
    rec.geoAfter = geoAfter ?? null;

    const before = rec.searchBefore;
    if (!before || !searchAfter || (before.impressions ?? 0) < 50 || (searchAfter.impressions ?? 0) < 50 || before.clicks < 10 || searchAfter.clicks < 10) {
      rec.result = 'inconclusive';
      rec.lesson = 'Insufficient search volume in the observation window to judge this change.';
    } else {
      const delta = (searchAfter.clicks ?? 0) - (before.clicks ?? 0);
      const relative = before.clicks ? delta / before.clicks : 0;
      if (relative > 0.1) { rec.result = 'improved'; rec.lesson = `Observed clicks up ${round(relative * 100, 1)}%; association, not proof of causation.`; }
      else if (relative < -0.1) { rec.result = 'regressed'; rec.lesson = `Observed clicks down ${round(Math.abs(relative) * 100, 1)}%; association, not proof of causation.`; }
      else { rec.result = 'no_change'; rec.lesson = 'No material movement over the window.'; }
    }
    if (rec.lesson) this.data.lessons.push({ date: new Date().toISOString().slice(0, 10), action: rec.action, result: rec.result, lesson: rec.lesson });
    return rec;
  }

  /** Multiplier applied to future opportunities of an action that keeps failing. */
  successRateFor(action) {
    const rows = this.data.interventions.filter((i) => i.action === action && i.mode === 'deployed' && i.deployedSha && ['improved', 'regressed', 'no_change'].includes(i.result));
    if (!rows.length) return null;
    const wins = rows.filter((r) => r.result === 'improved').length;
    return { samples: rows.length, successRate: round(wins / rows.length, 3) };
  }

  recordDecision(entry) {
    this.data.decisions.push({ at: new Date().toISOString(), ...entry });
  }

  startRun(run) {
    this.data.runs.push(run);
    if (this.data.runs.length > 400) this.data.runs = this.data.runs.slice(-400);
    return run;
  }

  awaitingMeasurement() {
    return this.data.interventions.filter((i) => i.mode === 'deployed' && i.deployedSha && i.result === 'awaiting_measurement');
  }

  stats() {
    const open = Object.values(this.data.issues).filter((i) => i.status === 'open');
    const resolved = Object.values(this.data.issues).filter((i) => i.status === 'resolved');
    const measured = this.data.interventions.filter((i) => i.mode === 'deployed' && i.deployedSha && ['improved','regressed','no_change','inconclusive'].includes(i.result));
    return {
      runs: this.data.runs.length,
      openIssues: open.length,
      resolvedIssues: resolved.length,
      interventions: this.data.interventions.length,
      applied: this.data.interventions.filter((i) => i.mode === 'applied').length,
      recommended: this.data.interventions.filter((i) => i.mode === 'recommended').length,
      awaitingMeasurement: this.awaitingMeasurement().length,
      measured: measured.length,
      improved: measured.filter((i) => i.result === 'improved').length,
      lessons: this.data.lessons.length,
    };
  }

  save() {
    // Keep the ledger reviewable: bound the unbounded lists.
    if (this.data.interventions.length > 2000) this.data.interventions = this.data.interventions.slice(-2000);
    if (this.data.lessons.length > 500) this.data.lessons = this.data.lessons.slice(-500);
    this.data.updatedAt = new Date().toISOString();
    return writeJson(this.file, this.data);
  }
}
