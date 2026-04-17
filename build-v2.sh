#!/usr/bin/env bash
# Build the V2 preview for GitHub Pages at /V2/
# Usage: ./build-v2.sh
set -euo pipefail

cd "$(dirname "$0")/next"

echo "Building Astro with ASTRO_BASE=/V2/..."
MSYS_NO_PATHCONV=1 ASTRO_BASE=/V2/ npm run build:search

echo "Patching internal links with /V2/ prefix..."
find dist -name '*.html' -exec perl -pi -e \
  's|href="/(?!V2/)|href="/V2/|g; s|url\(/(?!V2/)|url(/V2/|g; s|src="/(?!V2/)|src="/V2/|g' {} +

echo "Copying build output to V2/..."
cd ..
rm -rf V2/_astro V2/pagefind
cp -r next/dist/* V2/
cp -r next/dist/_astro V2/
if [ -d next/dist/pagefind ]; then
  cp -r next/dist/pagefind V2/
fi

count=$(find V2 -name '*.html' | wc -l)
echo "Done: ${count} pages deployed to V2/"
