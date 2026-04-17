#!/usr/bin/env bash
# Build the live Astro site at site root /
# Usage: ./build-live.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXT_DIR="$ROOT_DIR/next"
DIST_DIR="$NEXT_DIR/dist"
FALLBACK_CSS_SRC="$NEXT_DIR/src/styles/global.css"
FALLBACK_CSS_DEST="$ROOT_DIR/assets/styles.css"

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
  ! -name '.gitignore' \
  ! -name '.nojekyll' \
  ! -name 'CNAME' \
  ! -name 'next' \
  ! -name 'docs' \
  ! -name 'ops' \
  ! -name 'reports' \
  ! -name 'build-v2.sh' \
  ! -name 'build-live.sh' \
  ! -name 'CHANGELOG.md' \
  ! -name 'HANDOVER-CLAUDE.md' \
  ! -name '.approvals' \
  ! -name '.claude' \
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
