#!/usr/bin/env bash
# pi-autofix-safe-stash.sh — working-tree safety wrapper for the PI autofix crons
# (pi-daily-accuracy-autofix, pi-daily-image-relevance-autofix).
#
# Contract (see memory note feedback_pi_autofix_stash_safety.md and the
# Working Tree Safety section of
# docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md):
#
#   check    Exit 0 if the tree is clean or only contains autofix-owned files
#            (allowlist below). Exit 2 if foreign changes are present: the
#            autofix MUST abort the run and let the next scheduled tick retry.
#            Writes .pi-autofix/deferred with the foreign file list on exit 2.
#
#   check --approved-scope <name>
#            An explicit, named exception for a human-approved task. It does
#            NOT make a dirty tree generally safe: it only permits unrelated
#            changes to remain in place. A change to one of the named scope's
#            own files is still treated as a conflict and aborts. Every pass
#            is appended to .pi-autofix/approved-scopes.log for audit.
#
#   stash    Refuses (exit 2) if foreign changes are present. Otherwise
#            stashes autofix-owned residue with a label and records the stash
#            commit SHA in .pi-autofix/stash-ref so restore can find it even
#            if other stashes are pushed in between.
#
#   restore  Applies the recorded stash by SHA. On success, removes the ref
#            file but NEVER drops the stash entry. On ANY failure, leaves the
#            stash and ref intact and appends details to
#            .pi-autofix/stash-conflict.log, exit 1.
#
# Raw `git stash` is FORBIDDEN for autofix sessions. Two incidents
# (2026-05-28: 117-file Kids Grade rip-out lost; 2026-06-11: interactive WIP
# silently reverted mid-task) both came from unbounded stashes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

SENTINEL_DIR=".pi-autofix"
CONFLICT_LOG="$SENTINEL_DIR/stash-conflict.log"
STASH_REF_FILE="$SENTINEL_DIR/stash-ref"
DEFER_FILE="$SENTINEL_DIR/deferred"
APPROVED_SCOPE_LOG="$SENTINEL_DIR/approved-scopes.log"
STASH_LABEL="pi-autofix-safe-stash"

# Paths the autofix itself owns. Anything dirty outside these prefixes is
# foreign (someone else's in-progress work) and means ABORT, never stash.
ALLOWLIST=(
  "next/src/content/events/"
  "next/src/content/quick-notes/"
  "next/src/content/weekend-picks/"
  "ops/reports/"
  ".pi-autofix/"
)

mkdir -p "$SENTINEL_DIR"

dirty_files() {
  # Porcelain v1; strip the 3-char status prefix. For renames keep the new path.
  git status --porcelain --untracked-files=all | sed -e 's/^...//' -e 's/^.* -> //'
}

is_allowed() {
  local f="$1" prefix
  for prefix in "${ALLOWLIST[@]}"; do
    case "$f" in "$prefix"*) return 0 ;; esac
  done
  return 1
}

foreign_files() {
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    is_allowed "$f" || printf '%s\n' "$f"
  done < <(dirty_files)
}

# A scope is deliberately small and versioned in this script. Adding one is a
# code review decision, not a runtime bypass. Each scope names only files that
# the approved task itself may edit; pre-existing changes to those files are a
# conflict, whereas unrelated WIP elsewhere remains protected but need not
# block this scoped task.
scope_owns() {
  local scope="$1" f="$2"
  case "$scope" in
    deli-270-weekend-rotation)
      case "$f" in
        "next/src/components/v5/home/home-data.ts"|\
        "next/src/lib/daily-rotation.ts"|\
        ".github/workflows/build-and-deploy.yml"|\
        "ops/scripts/pi-autofix-safe-stash.sh") return 0 ;;
      esac ;;
    *) return 2 ;;
  esac
  return 1
}

scope_known() {
  case "$1" in
    deli-270-weekend-rotation) return 0 ;;
    *) return 1 ;;
  esac
}

scope_conflicts() {
  local scope="$1" f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    # Autofix-owned residue is safe. For the explicit scope, only overlap with
    # the task's files is unsafe; unrelated WIP is intentionally left alone.
    is_allowed "$f" && continue
    if scope_owns "$scope" "$f"; then
      printf '%s\n' "$f"
    fi
  done < <(dirty_files)
}

cmd_approved_scope_check() {
  local scope="$1" conflicts
  if ! scope_known "$scope"; then
    echo "Unknown approved scope: $scope" >&2
    exit 64
  fi
  conflicts="$(scope_conflicts "$scope")"
  if [ -n "$conflicts" ]; then
    {
      echo "deferred-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "reason: approved scope conflicts with existing changes ($scope)"
      echo "conflicting-files:"
      printf '  %s\n' $conflicts
    } > "$DEFER_FILE"
    echo "APPROVED scope '$scope' conflicts with existing work — aborting:" >&2
    printf '  %s\n' $conflicts >&2
    exit 2
  fi
  rm -f "$DEFER_FILE"
  printf '%s scope=%s branch=%s head=%s result=pass\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$scope" \
    "$(git rev-parse --abbrev-ref HEAD)" "$(git rev-parse --short HEAD)" \
    >> "$APPROVED_SCOPE_LOG"
  echo "OK: approved scope '$scope' has no conflicting in-scope changes"
}

cmd_check() {
  local foreign
  foreign="$(foreign_files)"
  if [ -n "$foreign" ]; then
    {
      echo "deferred-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "reason: foreign working-tree changes (not autofix-owned)"
      echo "foreign-files:"
      printf '  %s\n' $foreign
    } > "$DEFER_FILE"
    local total
    total="$(printf '%s\n' $foreign | wc -l)"
    echo "FOREIGN changes present — autofix must ABORT and defer (full list in $DEFER_FILE):" >&2
    { printf '  %s\n' $foreign | head -n 25 >&2; } || true
    if [ "$total" -gt 25 ]; then echo "  ... ($total foreign files total, truncated)" >&2; fi
    exit 2
  fi
  rm -f "$DEFER_FILE"
  echo "OK: tree clean or autofix-owned only"
  exit 0
}

cmd_stash() {
  local foreign
  foreign="$(foreign_files)"
  if [ -n "$foreign" ]; then
    echo "REFUSING to stash: foreign changes present. Run 'check' — autofix must abort." >&2
    { printf '  %s\n' $foreign | head -n 25 >&2; } || true
    exit 2
  fi
  if [ -z "$(dirty_files)" ]; then
    echo "Nothing to stash."
    exit 0
  fi
  git stash push --include-untracked -m "$STASH_LABEL $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local sha
  sha="$(git rev-parse 'stash@{0}')"
  printf '%s\n' "$sha" > "$STASH_REF_FILE"
  echo "Stashed autofix-owned residue as $sha (recorded in $STASH_REF_FILE)."
  exit 0
}

cmd_restore() {
  if [ ! -f "$STASH_REF_FILE" ]; then
    echo "No recorded stash to restore."
    exit 0
  fi
  local sha
  sha="$(cat "$STASH_REF_FILE")"
  if git stash apply "$sha"; then
    # Applied successfully. Keep the stash entry (NEVER drop), clear the ref.
    rm -f "$STASH_REF_FILE"
    echo "Restored stash $sha. Stash entry retained as a safety net (never dropped)."
    exit 0
  else
    {
      echo "---"
      echo "restore-failed-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "stash-sha: $sha"
      echo "branch: $(git rev-parse --abbrev-ref HEAD)"
      echo "head: $(git rev-parse HEAD)"
      echo "git-status:"
      git status --porcelain
    } >> "$CONFLICT_LOG"
    echo "RESTORE FAILED for stash $sha. Stash left intact; details appended to $CONFLICT_LOG." >&2
    echo "Manual recovery: git stash apply $sha (resolve conflicts), then remove $STASH_REF_FILE." >&2
    exit 1
  fi
}

case "${1:-}" in
  check)
    if [ "${2:-}" = "--approved-scope" ] && [ -n "${3:-}" ] && [ -z "${4:-}" ]; then
      cmd_approved_scope_check "$3"
    elif [ -n "${2:-}" ]; then
      echo "Usage: $0 check [--approved-scope <name>]" >&2
      exit 64
    else
      cmd_check
    fi
    ;;
  stash)   cmd_stash ;;
  restore) cmd_restore ;;
  *)
    echo "Usage: $0 {check [--approved-scope <name>]|stash|restore}" >&2
    exit 64
    ;;
esac
