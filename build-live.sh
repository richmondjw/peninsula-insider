#!/usr/bin/env bash
# Build the live Astro site at site root /
# Usage: ./build-live.sh
set -euo pipefail

cd "$(dirname "$0")/next"

echo "Building Astro for live root..."
npm run build:search

echo "Copying live build output to site root..."
cd ..

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

cp -r next/dist/* .

count=$(find . -path './.git' -prune -o -name '*.html' -print | wc -l)
echo "Done: ${count} pages deployed to live root/"
