#!/usr/bin/env bash
# One existing gateway cron owns this foreground process and protected JEV proxy.
set -euo pipefail
ENGINE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ENGINE_DIR/../.." && pwd)"
cd "$REPO"
mkdir -p "$ENGINE_DIR/.runs"
exec 9>"$ENGINE_DIR/.runs/cycle.lock"
flock -n 9 || { echo 'cycle already active'; exit 10; }
export PI_GEO_STATE_DIR="$ENGINE_DIR/.runs/state"
mkdir -p "$PI_GEO_STATE_DIR"
export GSC_ANALYTICS_JSON="$ENGINE_DIR/.runs/analytics-live.json"
ANALYTICS_READ="${GEO_ANALYTICS_READ:-/home/node/.openclaw/workspace/peninsula-seo-geo/analytics-read.cjs}"
DRY=0
CYCLE=incremental
[ "$(TZ=Australia/Melbourne date +%u)" != 7 ] || CYCLE=weekly
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --cycle=incremental|--cycle=weekly) CYCLE="${arg#--cycle=}" ;;
    *) echo "Unsupported argument: $arg (fresh builds are mandatory)" >&2; exit 2 ;;
  esac
done
if [ "$DRY" = 0 ]; then
  node "$ENGINE_DIR/scripts/release-cycle.mjs" resume
  [ -z "$(git status --porcelain --untracked-files=no)" ] || { echo 'Tracked checkout is dirty; preserved'; exit 3; }
  git fetch origin main:refs/remotes/origin/main
  git switch main
  git merge --ff-only origin/main
fi
git config user.name peninsula-insider-bot
git config user.email bot@peninsulainsider.com.au
timeout 240 node "$ANALYTICS_READ" > "$GSC_ANALYTICS_JSON.tmp"
node --input-type=module -e 'import fs from "node:fs";const d=JSON.parse(fs.readFileSync(process.argv[1]));if(d.gsc?.status!=="observed")throw Error("Fresh GSC evidence unavailable")' "$GSC_ANALYTICS_JSON.tmp"
mv "$GSC_ANALYTICS_JSON.tmp" "$GSC_ANALYTICS_JSON"
node --test "$ENGINE_DIR"/test/*.test.mjs
(cd next && timeout 900 npx astro build > "$ENGINE_DIR/.runs/build.log" 2>&1)
ARGS=("--cycle=$CYCLE" --target=source)
[ "$DRY" = 1 ] || ARGS+=(--apply)
node "$ENGINE_DIR/run.mjs" "${ARGS[@]}"
if [ "$DRY" = 1 ]; then exit 0; fi
if [ -n "$(git diff --name-only next/src)" ]; then
  (cd next && timeout 900 npx astro build > "$ENGINE_DIR/.runs/post-change-build.log" 2>&1)
  node "$ENGINE_DIR/scripts/release-cycle.mjs" submit
else
  echo 'No evidence-qualified source patch this cycle.'
fi
