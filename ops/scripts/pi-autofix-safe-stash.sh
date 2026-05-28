#!/usr/bin/env bash
# Safe working-tree handling for the PI autofix automation.
#
# Replaces the ad-hoc `git stash push -m pi-autofix-temp-stash ... && git stash pop`
# pattern that lost a 117-file Kids Grade taxonomy removal on 2026-05-28: the
# autofix run stashed unrelated working-tree changes, then either dropped the
# stash or hit a silent pop failure, leaving no recoverable copy of the work.
#
# Usage:
#   pi-autofix-safe-stash.sh check     # exit 0 if safe to start autofix run
#   pi-autofix-safe-stash.sh stash     # stash autofix-owned changes only
#   pi-autofix-safe-stash.sh restore   # pop stash; on conflict, leave it
#
# Semantics:
#   - If the working tree is clean: all three subcommands are no-ops.
#   - If the working tree has changes ONLY inside the autofix allowlist:
#     check passes; stash creates a labelled stash; restore pops it and on
#     ANY non-zero pop exit code leaves the stash in place and writes a
#     conflict sentinel. NEVER `git stash drop`.
#   - If the working tree has ANY changes outside the autofix allowlist:
#     check fails with a defer sentinel and exit 2. The caller MUST abort the
#     autofix run; do NOT stash, do NOT touch the working tree. The deferred
#     run will resume on the next hourly tick once the user commits or
#     discards their changes.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

STASH_LABEL="pi-autofix-temp-stash $(date -u +%Y-%m-%dT%H:%M:%SZ)"
SENTINEL_DIR="$REPO_ROOT/.pi-autofix"
DEFER_SENTINEL="$SENTINEL_DIR/deferred.log"
CONFLICT_SENTINEL="$SENTINEL_DIR/stash-conflict.log"
STASH_REF_FILE="$SENTINEL_DIR/active-stash-ref"

# Files the autofix is allowed to own. Anything outside this list belongs to
# a human (or another agent) and must NOT be stashed away. Keep this list
# narrow: every entry is an implicit promise that autofix can clobber it.
ALLOWLIST_PATTERNS=(
  'next/src/content/events/'
  'next/src/content/dispatches/'
  'next/src/content/weekend-picks/'
  'ops/run-log/entries/'
  'ops/run-log/index.csv'
  'docs/reports/peninsula-accuracy-'
  'docs/reports/peninsula-image-'
)

mkdir -p "$SENTINEL_DIR"

is_allowlisted() {
  local path="$1"
  for prefix in "${ALLOWLIST_PATTERNS[@]}"; do
    case "$path" in
      "$prefix"*) return 0 ;;
    esac
  done
  return 1
}

# Print every changed path (staged, unstaged, untracked) one per line.
changed_paths() {
  git status --porcelain=v1 -z | tr '\0' '\n' | awk 'NF>=2 {print substr($0,4)}'
}

classify() {
  local foreign=()
  local owned=()
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    if is_allowlisted "$path"; then
      owned+=("$path")
    else
      foreign+=("$path")
    fi
  done < <(changed_paths)
  printf 'FOREIGN_COUNT=%d\n' "${#foreign[@]}"
  printf 'OWNED_COUNT=%d\n'   "${#owned[@]}"
  printf 'FOREIGN:\n'
  printf '  %s\n' "${foreign[@]:-}"
  printf 'OWNED:\n'
  printf '  %s\n' "${owned[@]:-}"
}

cmd_check() {
  local report; report="$(classify)"
  local foreign_count
  foreign_count="$(printf '%s\n' "$report" | awk -F= '/^FOREIGN_COUNT=/{print $2}')"
  if [ "${foreign_count:-0}" -gt 0 ]; then
    {
      printf '[%s] PI autofix deferred — working tree has non-autofix changes.\n' "$(date -u +%FT%TZ)"
      printf '%s\n' "$report"
      printf 'Action: the user must commit or discard these changes before autofix can run.\n\n'
    } >> "$DEFER_SENTINEL"
    echo "pi-autofix: DEFERRED. See $DEFER_SENTINEL." >&2
    return 2
  fi
  return 0
}

cmd_stash() {
  cmd_check
  if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    : > "$STASH_REF_FILE"  # nothing to stash
    return 0
  fi
  # Only allowlisted paths reach here, so it's safe to stash everything.
  git stash push --include-untracked -m "$STASH_LABEL"
  # Record the exact stash ref so restore can verify it.
  git rev-parse stash@{0} > "$STASH_REF_FILE"
}

cmd_restore() {
  if [ ! -s "$STASH_REF_FILE" ]; then
    return 0  # nothing was stashed
  fi
  local expected actual
  expected="$(cat "$STASH_REF_FILE")"
  actual="$(git rev-parse stash@{0} 2>/dev/null || true)"
  if [ "$expected" != "$actual" ]; then
    {
      printf '[%s] PI autofix stash ref mismatch — refusing to pop.\n' "$(date -u +%FT%TZ)"
      printf '  expected: %s\n' "$expected"
      printf '  actual  : %s\n' "$actual"
      printf 'The stash has been left intact. Inspect with `git stash list`.\n\n'
    } >> "$CONFLICT_SENTINEL"
    echo "pi-autofix: stash ref mismatch. See $CONFLICT_SENTINEL." >&2
    return 3
  fi
  if ! git stash pop; then
    {
      printf '[%s] PI autofix `git stash pop` failed (likely conflicts).\n' "$(date -u +%FT%TZ)"
      printf '  stash ref: %s\n' "$expected"
      printf 'The stash entry has been LEFT IN PLACE. NEVER run `git stash drop` here.\n'
      printf 'Resolve manually: `git stash show -p stash@{0}` then `git stash apply`.\n\n'
    } >> "$CONFLICT_SENTINEL"
    echo "pi-autofix: stash pop failed; stash preserved. See $CONFLICT_SENTINEL." >&2
    return 4
  fi
  : > "$STASH_REF_FILE"
}

case "${1:-}" in
  check)   cmd_check ;;
  stash)   cmd_stash ;;
  restore) cmd_restore ;;
  *)
    echo "usage: $0 {check|stash|restore}" >&2
    exit 64
    ;;
esac
