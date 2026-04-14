#!/bin/bash
# Peninsula Insider — Daily backup tag
# Creates a timestamped git tag on the current HEAD and pushes it to origin.
# Run this daily to maintain a rolling 10-day window of named restore points.
#
# Usage: ./scripts/daily-backup-tag.sh
# Schedule (optional): add to Windows Task Scheduler or cron
#
# Every commit is already a restore point thanks to git history — this just
# gives you named, dated anchors for quick rollbacks.

set -e

TAG_NAME="backup-$(date +%Y-%m-%d)"
RETENTION_DAYS=10

# Create the tag if it doesn't already exist today
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "Tag $TAG_NAME already exists — nothing to do."
else
  git tag -a "$TAG_NAME" -m "Daily backup tag — $(date '+%Y-%m-%d %H:%M')"
  git push origin "$TAG_NAME"
  echo "Created and pushed tag: $TAG_NAME"
fi

# Prune old backup tags (keep last 10 days)
echo "Pruning backup tags older than $RETENTION_DAYS days..."
CUTOFF=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

for tag in $(git tag -l "backup-*"); do
  TAG_DATE=${tag#backup-}
  if [[ "$TAG_DATE" < "$CUTOFF" ]]; then
    echo "  Removing old tag: $tag"
    git tag -d "$tag" 2>/dev/null || true
    git push origin ":refs/tags/$tag" 2>/dev/null || true
  fi
done

echo "Done. Current backup tags:"
git tag -l "backup-*" | sort
