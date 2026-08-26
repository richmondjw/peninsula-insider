#!/usr/bin/env node
/**
 * publish-stall-check - detect content that is committed but not published.
 *
 * Why this exists
 * ---------------
 * On 2026-08-24..26 six discovered events sat unpublished for ~26h and five
 * more were destroyed outright. The chain was:
 *
 *   1. A local content engine commits "content(events): auto-publish N
 *      discovered event(s)" onto local main at ~20:01 UTC daily.
 *   2. It does not push. Nothing pushes for it.
 *   3. Every CI signal stayed green - because nothing reached CI. A stall is
 *      invisible to push-triggered workflows by construction.
 *   4. A later `git reset --hard origin/main` silently deleted the unpushed
 *      commits (2026-08-24: 5 events lost, confirmed 404 on the live site).
 *
 * So the detector cannot live only in CI, and cannot trust "CI is green".
 * It measures two things that a push-triggered workflow structurally cannot:
 *
 *   local-ahead  - content commits sitting unpushed on local main, with an
 *                  age threshold so the daily engine's own commit does not
 *                  page anyone during its normal publish window.
 *   local-behind - local main drifting behind origin, which is what makes a
 *                  destructive `reset --hard` tempting in the first place.
 *
 * Exit codes: 0 = healthy, 1 = stall detected, 2 = could not evaluate.
 */

import { execFileSync } from 'node:child_process';

const AHEAD_HOURS = Number(process.env.PI_STALL_AHEAD_HOURS ?? 3);
const BEHIND_LIMIT = Number(process.env.PI_STALL_BEHIND_LIMIT ?? 5);
const BRANCH = process.env.PI_STALL_BRANCH ?? 'main';
const REMOTE = process.env.PI_STALL_REMOTE ?? 'origin';
// Commits that actually publish reader-facing content. A stalled refactor is
// an annoyance; a stalled event is a reader who never sees the event.
const CONTENT_RE = /^(content|chore\(content\)|fix\(events\)|content\(events\))/;

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const findings = [];

let ahead = [];
let behind = 0;
try {
  // Read-only refresh so a stale local ref cannot mask a real stall. Skippable
  // for offline runs, CI checkouts that already fetched, and incident replays
  // that need the remote ref pinned to a historical state.
  if (process.env.PI_STALL_NO_FETCH !== '1') {
    try {
      git('fetch', REMOTE, BRANCH, '--quiet');
    } catch {
      // Offline is not a stall. Fall through and evaluate against the last
      // known remote ref rather than failing the check open.
    }
  }
  const range = `${REMOTE}/${BRANCH}..${BRANCH}`;
  ahead = git('log', '--format=%H%x1f%ct%x1f%s', range)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, ts, subject] = line.split('\x1f');
      return { sha, ts: Number(ts), subject };
    });
  behind = Number(git('rev-list', '--count', `${BRANCH}..${REMOTE}/${BRANCH}`));
} catch (err) {
  console.error(`publish-stall-check: could not evaluate ${BRANCH} vs ${REMOTE}/${BRANCH}`);
  console.error(String(err.message ?? err).split('\n')[0]);
  process.exit(2);
}

const nowSec = Math.floor(Date.now() / 1000);
const stale = ahead.filter((c) => (nowSec - c.ts) / 3600 >= AHEAD_HOURS);
const staleContent = stale.filter((c) => CONTENT_RE.test(c.subject));

if (staleContent.length) {
  const oldest = Math.max(...staleContent.map((c) => (nowSec - c.ts) / 3600));
  findings.push(
    `PUBLISH STALL: ${staleContent.length} unpushed content commit(s) on ${BRANCH}, ` +
      `oldest ${oldest.toFixed(1)}h (threshold ${AHEAD_HOURS}h). These readers' events are not live.`,
  );
  for (const c of staleContent) {
    findings.push(`    ${c.sha.slice(0, 10)}  ${((nowSec - c.ts) / 3600).toFixed(1)}h  ${c.subject}`);
  }
} else if (stale.length) {
  findings.push(
    `UNPUSHED WORK: ${stale.length} non-content commit(s) unpushed beyond ${AHEAD_HOURS}h ` +
      `(not reader-facing, but they are what a reset --hard would destroy).`,
  );
}

if (behind >= BEHIND_LIMIT) {
  findings.push(
    `DRIFT: ${BRANCH} is ${behind} commit(s) behind ${REMOTE}/${BRANCH} (limit ${BEHIND_LIMIT}). ` +
      `Reconcile with a merge. Never 'reset --hard' while commits are unpushed - ` +
      `that is how 5 events were lost on 2026-08-24.`,
  );
}

if (!findings.length) {
  console.log(
    `publish-stall-check: OK (${BRANCH} ahead ${ahead.length}, behind ${behind}; ` +
      `no content commit unpushed beyond ${AHEAD_HOURS}h).`,
  );
  process.exit(0);
}

console.error('publish-stall-check FAILED\n');
for (const f of findings) console.error(f);
console.error(
  `\nRecover with:\n` +
    `  git fetch ${REMOTE} && git merge ${REMOTE}/${BRANCH} && npm --prefix next run build && git push ${REMOTE} ${BRANCH}`,
);
process.exit(1);
