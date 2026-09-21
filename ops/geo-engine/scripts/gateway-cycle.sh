#!/usr/bin/env bash
# gateway-cycle.sh: the SEO/GEO engine's scheduled runner on the OpenClaw gateway.
#
# Run it through the gateway's own exec tool (gateway_exec) so the protected
# TYPESAFE_API_KEY reaches Jev; anywhere else it still works, on rules only.
#
#   bash ops/geo-engine/scripts/gateway-cycle.sh [--dry-run] [--no-build] [--cycle=incremental|weekly]
#
# Steps: sync the checkout, refresh the analytics document (Search Console and
# GA4 through the site's MCP identity), build the current source so the deploy
# delta and the source-plane apply have something to work on, run the cycle
# with --apply, commit engine state to the current branch, and open a pull
# request for any source change. Nothing is ever pushed to main by this script.
set -uo pipefail

ENGINE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ENGINE_DIR/../.." && pwd)"
ANALYTICS_READ="${GEO_ANALYTICS_READ:-/home/node/.openclaw/workspace/peninsula-seo-geo/analytics-read.cjs}"
NODE_MODULES_SRC="${GEO_NODE_MODULES:-/home/node/.openclaw/workspace/peninsula-insider/next/node_modules}"
RUNS="$ENGINE_DIR/.runs"
ANALYTICS_OUT="$RUNS/analytics-live.json"
DRY=0; BUILD=1; CYCLE=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-build) BUILD=0 ;;
    --cycle=*) CYCLE="${a#--cycle=}" ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done
if [ -z "$CYCLE" ]; then
  [ "$(TZ=Australia/Melbourne date +%u)" = 7 ] && CYCLE=weekly || CYCLE=incremental
fi
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [gateway-cycle] $*"; }

cd "$REPO" || exit 1
mkdir -p "$RUNS"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "repo=$REPO branch=$BRANCH cycle=$CYCLE dry=$DRY build=$BUILD"

# 1. Sync. A dirty source tree means a previous run's PR step failed; leave it alone.
if [ "$DRY" = 0 ]; then
  if [ -n "$(git status --porcelain next/src)" ]; then
    log "next/src has uncommitted changes from an earlier run; not syncing or applying"
    exit 3
  fi
  git fetch -q origin "$BRANCH" && git pull -q --rebase origin "$BRANCH" || log "pull failed; continuing on local HEAD"
fi

# 2. Analytics: Search Console + GA4 through the gateway's MCP identity.
if [ -f "$ANALYTICS_READ" ]; then
  if timeout 240 node "$ANALYTICS_READ" > "$ANALYTICS_OUT.tmp" 2>/dev/null && [ -s "$ANALYTICS_OUT.tmp" ]; then
    mv "$ANALYTICS_OUT.tmp" "$ANALYTICS_OUT"; log "analytics refreshed"
  else
    rm -f "$ANALYTICS_OUT.tmp"; log "analytics refresh failed; using the previous document if one exists"
  fi
else
  log "analytics reader not found at $ANALYTICS_READ; search demand will be unavailable"
fi
export GSC_ANALYTICS_JSON="$ANALYTICS_OUT"

# 3. Source build (for the deploy delta and for applying on the source plane).
if [ "$BUILD" = 1 ]; then
  if [ ! -e next/node_modules ] && [ -d "$NODE_MODULES_SRC" ]; then ln -s "$NODE_MODULES_SRC" next/node_modules; fi
  if (cd next && timeout 900 npx astro build > "$RUNS/build.log" 2>&1); then
    log "source built"
  else
    log "source build failed (see .runs/build.log); auditing the served tree only"
  fi
fi

# 4. The cycle. --apply is policy-gated inside the engine.
ARGS="--cycle=$CYCLE"
[ -d next/dist ] && ARGS="$ARGS --target=source"
[ "$DRY" = 0 ] && ARGS="$ARGS --apply"
(cd "$ENGINE_DIR" && JEV_MAX_DECISIONS="${JEV_MAX_DECISIONS:-2000}" node run.mjs $ARGS) || log "engine exited non-zero"
grep -m1 "Decision layer" "$ENGINE_DIR/state/latest-report.txt" | cut -c1-140 | sed 's/^/  /'
grep -m1 "^Search\|^SEARCH" -A1 "$ENGINE_DIR/state/latest-report.txt" | tail -1 | cut -c1-140 | sed 's/^/  /'

if [ "$DRY" = 1 ]; then
  log "dry run: nothing committed"; git status --short next/src ops/geo-engine/state | head -20; exit 0
fi

# 5. Source changes become a pull request; state goes to the branch.
git config user.name "peninsula-insider-bot"
git config user.email "bot@peninsulainsider.com.au"
if [ -n "$(git status --porcelain next/src)" ]; then
  STAMP="$(date -u +%Y%m%d-%H%M)"
  FIX_BRANCH="geo-engine/auto-$STAMP"
  git checkout -q -b "$FIX_BRANCH" \
    && git add next/src \
    && git commit -q -m "fix(seo): autonomous tier-1 changes from the geo-engine ($STAMP)" \
    && git push -q -u origin "$FIX_BRANCH" \
    && gh pr create --base "$BRANCH" --head "$FIX_BRANCH" \
         --title "fix(seo): autonomous tier-1 changes from the geo-engine ($STAMP)" \
         --body "Applied by ops/geo-engine on the source plane under policy.json tier 1 (allowlisted, reversible, no new facts; rated auto_safe by the decision layer at or above the confidence threshold). The run's changes.json is in ops/geo-engine/.runs/ on the runner and the rollback manifest in ops/geo-engine/.rollback/. Review before merging; the site gates run on this PR." \
    && log "opened PR from $FIX_BRANCH" \
    || log "PR step failed; changes remain on $FIX_BRANCH locally"
  git checkout -q "$BRANCH" || true
fi
git add ops/geo-engine/state
if git diff --cached --quiet; then
  log "no state change"
else
  git commit -q -m "chore(seo-geo): optimisation cycle state $(date -u +%Y-%m-%d) [skip-review]" \
    && git push -q origin "HEAD:$BRANCH" && log "state committed and pushed" || log "state push failed"
fi
log "done"
