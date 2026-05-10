#!/usr/bin/env bash
# Peninsula Insider — Sunday dispatch phase runner
#
# Stage B item 6 — closes EXC-2026-05-10-006.
#
# Wraps a single dispatch phase so it emits a run-log entry that's linked
# to the parent composite cron via parentRunId. Use this from the Sunday
# cron call so the 7-phase chain becomes individually observable instead
# of reporting as one big "Sunday cron failed".
#
# Usage:
#   ops/scripts/dispatch-phase-runner.sh <phase-name> <mutation> -- <command...>
#
#   phase-name : matches a name in ops/editorial-jobs.json
#                (e.g. pi-weekly-dispatch-research-scan)
#   mutation   : one of scan-only|report-only|mutating-content|mutating-live|mutating-config
#   command    : the actual phase command to run
#
# Environment:
#   PI_DISPATCH_PARENT_RUN_ID   parent run id (uuid). If unset, a new one is
#                               generated and printed once on the first phase
#                               so the orchestrator can pass it to subsequent
#                               phases in the same chain.
#   PI_DISPATCH_SURFACES        optional comma-separated list of surfaces
#   PI_DISPATCH_ALERT_CHANNEL   optional alert channel (default: mission-control)
#
# Exit code: same as the wrapped command.

set -uo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

PHASE_NAME="${1:-}"
MUTATION="${2:-}"
shift 2 || true

if [[ "${1:-}" != "--" ]]; then
  echo "error: expected '--' separator before command. See --help." >&2
  exit 64
fi
shift  # drop --

if [[ -z "${PHASE_NAME}" || -z "${MUTATION}" || $# -eq 0 ]]; then
  echo "usage: $0 <phase-name> <mutation> -- <command...>" >&2
  exit 64
fi

# Repo root resolution — assume we're invoked from the PI repo
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUN_LOG="${REPO_ROOT}/ops/scripts/run-log.mjs"

if [[ ! -f "${RUN_LOG}" ]]; then
  echo "error: run-log appender not found at ${RUN_LOG}" >&2
  exit 65
fi

# Generate a fresh runId for this phase
PHASE_RUN_ID="$(node -e 'process.stdout.write(require("crypto").randomUUID())')"

# Resolve / propagate the parent run id
if [[ -z "${PI_DISPATCH_PARENT_RUN_ID:-}" ]]; then
  PARENT_RUN_ID="$(node -e 'process.stdout.write(require("crypto").randomUUID())')"
  echo "PI_DISPATCH_PARENT_RUN_ID=${PARENT_RUN_ID}" >&2
  echo "(generated; export this before the next phase to link them)" >&2
else
  PARENT_RUN_ID="${PI_DISPATCH_PARENT_RUN_ID}"
fi

STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[dispatch-phase-runner] phase=${PHASE_NAME} parent=${PARENT_RUN_ID} run=${PHASE_RUN_ID} started=${STARTED_AT}" >&2

# Run the wrapped command
"$@"
PHASE_EXIT=$?

ENDED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Map exit code to status
if [[ ${PHASE_EXIT} -eq 0 ]]; then
  STATUS="success"
else
  STATUS="failure"
fi

# Compose surfaces flag
SURFACES_FLAG=()
if [[ -n "${PI_DISPATCH_SURFACES:-}" ]]; then
  SURFACES_FLAG=( --surfaces "${PI_DISPATCH_SURFACES}" )
fi

# Compose alert flags — failures alert on the configured channel
ALERT_FLAGS=()
ERROR_FLAGS=()
if [[ "${STATUS}" == "failure" ]]; then
  ALERT_CHANNEL="${PI_DISPATCH_ALERT_CHANNEL:-mission-control}"
  ALERT_FLAGS=( --alert-sent --alert-channel "${ALERT_CHANNEL}" )
  ERROR_FLAGS=( --error-summary "phase exited with code ${PHASE_EXIT}" )
fi

node "${RUN_LOG}" new \
  --job-name "${PHASE_NAME}" \
  --job-source openclaw-cron \
  --run-id "${PHASE_RUN_ID}" \
  --parent-run-id "${PARENT_RUN_ID}" \
  --started-at "${STARTED_AT}" \
  --ended-at "${ENDED_AT}" \
  --status "${STATUS}" \
  --mutation "${MUTATION}" \
  "${SURFACES_FLAG[@]}" \
  "${ALERT_FLAGS[@]}" \
  "${ERROR_FLAGS[@]}" \
  --notes "Sunday dispatch chain phase; parent=${PARENT_RUN_ID}" \
  --append \
  >&2

echo "[dispatch-phase-runner] phase=${PHASE_NAME} status=${STATUS} ended=${ENDED_AT}" >&2

exit ${PHASE_EXIT}
