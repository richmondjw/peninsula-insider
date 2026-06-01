#!/usr/bin/env bash
# Build the live Astro site at site root /
# Usage: ./build-live.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXT_DIR="$ROOT_DIR/next"
DIST_DIR="$NEXT_DIR/dist"
FALLBACK_CSS_SRC="$NEXT_DIR/src/styles/global.css"
FALLBACK_CSS_DEST="$ROOT_DIR/assets/styles.css"

# Sentinel guard — refuse to run unless ROOT_DIR is unmistakably the peninsula-insider repo.
# Added 2026-04-30 after build-live.sh's destructive find/rm wiped the JWR_PKM_2026 vault on Apr 28
# when the script (or an emulating process) ran with the wrong working directory.
if [ ! -f "$ROOT_DIR/CNAME" ] || [ ! -f "$NEXT_DIR/package.json" ] || ! grep -qE '"name":[[:space:]]*"peninsula-insider(-next)?"' "$NEXT_DIR/package.json" 2>/dev/null; then
  echo "FATAL: build-live.sh refused to run." >&2
  echo "  ROOT_DIR=$ROOT_DIR does not look like the peninsula-insider repo." >&2
  echo "  Required sentinels: ./CNAME, ./next/package.json with name=peninsula-insider." >&2
  echo "  This guard exists because a misdirected run on 2026-04-28 wiped the JWR_PKM_2026 vault." >&2
  exit 2
fi

cd "$NEXT_DIR"

echo "Building Astro for live root..."
npm run build:search

cd "$ROOT_DIR"

mkdir -p "$ROOT_DIR/assets"
cp "$FALLBACK_CSS_SRC" "$FALLBACK_CSS_DEST"

echo "Copying live build output to site root..."

# Preserve repo metadata and known non-site files while replacing the public site surface.
find . -mindepth 1 -maxdepth 1 \
  ! -name '.git' \
  ! -name '.github' \
  ! -name '.gitignore' \
  ! -name '.nojekyll' \
  ! -name 'CNAME' \
  ! -name 'next' \
  ! -name 'docs' \
  ! -name 'ops' \
  ! -name 'reports' \
  ! -name 'design-reviews' \
  ! -name 'build-v2.sh' \
  ! -name 'build-live.sh' \
  ! -name 'CHANGELOG.md' \
  ! -name 'HANDOVER-CLAUDE.md' \
  ! -name 'BRAND-PI.md' \
  ! -name '.approvals' \
  ! -name '.claude' \
  ! -name 'studio-peninsula-insider' \
  -exec rm -rf {} +

cp -r "$DIST_DIR"/* .
mkdir -p ./assets
cp "$FALLBACK_CSS_SRC" ./assets/styles.css

if [ ! -f ./assets/styles.css ]; then
  echo "ERROR: stable fallback stylesheet missing at ./assets/styles.css" >&2
  exit 1
fi

if ! grep -R -q '/assets/styles.css' index.html dog-friendly journal 2>/dev/null; then
  echo "ERROR: deployed HTML does not reference /assets/styles.css fallback" >&2
  exit 1
fi

count=$(find . -path './.git' -prune -o -name '*.html' -print | wc -l)
echo "Done: ${count} pages deployed to live root/"
