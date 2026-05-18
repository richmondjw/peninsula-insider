#!/usr/bin/env bash
# Peninsula Insider — Phase 9 decommissioning script.
#
# Removes the legacy inline-editor + Supabase CMS layer once Sanity has
# been stable for two full weeks across all entity types in production.
#
#   Usage:  bash ops/sanity-migration/decommission.sh --dry-run
#           bash ops/sanity-migration/decommission.sh --execute
#
# DO NOT run with --execute until:
#   1. Every SANITY_<ENTITY>_ENABLED flag has been on for ≥14 days
#   2. No editor reports incidents in the cutover window
#   3. ops/backups/ has a recent Sanity dataset export
#   4. The pi.cms_* Supabase tables have been exported to ops/backups/

set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "--dry-run" && "$MODE" != "--execute" ]]; then
  echo "Usage: $0 --dry-run | --execute"
  exit 1
fi

run() {
  echo "  → $*"
  if [[ "$MODE" == "--execute" ]]; then
    eval "$@"
  fi
}

echo "Peninsula Insider — Phase 9 decommission (mode: $MODE)"
echo

echo "Step 1: Remove legacy JSON content collections"
for dir in venues places articles authors events itineraries tours tour-operators tour-packages experiences; do
  if [[ -d "next/src/content/$dir" ]]; then
    run "git rm -r next/src/content/$dir"
  fi
done

echo
echo "Step 2: Remove inline-editor client + override library"
if [[ -d "next/src/lib/inline-edit" ]]; then
  run "git rm -r next/src/lib/inline-edit"
fi
if [[ -f "next/src/components/admin/InlineEditor.astro" ]]; then
  run "git rm next/src/components/admin/InlineEditor.astro"
fi

echo
echo "Step 3: Remove EditableImage / EditableText components"
for f in EditableImage.astro EditableText.astro; do
  if [[ -f "next/src/components/$f" ]]; then
    run "git rm next/src/components/$f"
  fi
done

echo
echo "Step 4: Remove the dual-read fallback branches from page templates"
echo "  (manual review required — open each [slug] page, drop the JSON path,"
echo "   keep only the Sanity fetch. Search for sanityReadEnabled() calls.)"

echo
echo "Step 5: Remove webhook revalidate endpoint? (no — keep it)"
echo "  Sanity webhooks still drive Vercel revalidation post-decom."

echo
echo "Step 6: Drop Supabase CMS tables (run after exporting)"
cat <<'EOF'
  -- ops/backups/cms-final-YYYY-MM-DD.sql — export first, then run:
  --
  -- DROP TABLE pi.cms_image_slots CASCADE;
  -- DROP TABLE pi.cms_text_fields CASCADE;
  -- DROP TABLE pi.cms_revisions CASCADE;
  -- DROP TABLE pi.admin_user_allowlist CASCADE;
  --
  -- Supabase Storage bucket "cms-assets" can stay (it's referenced from
  -- the Sanity dataset until images are re-uploaded). Or migrate the
  -- bucket contents into Sanity assets if you want a clean break.
EOF

echo
echo "Step 7: Update documentation"
echo "  - CLAUDE.md: remove references to the inline editor architecture"
echo "  - REMY-V3.md: ditto"
echo "  - workspace/CLAUDE.md: update startup checklist"

echo
echo "Step 8: Remove Sanity feature flags from Vercel"
echo "  Since every entity now reads from Sanity, the SANITY_*_ENABLED flags"
echo "  become redundant. Remove them or hardcode them to true in the env."
echo "  Or keep them as kill-switches — your call."

echo
if [[ "$MODE" == "--dry-run" ]]; then
  echo "Dry-run complete. Re-run with --execute to actually delete."
else
  echo "Decommission complete. Commit and push:"
  echo "  git commit -m \"chore(cms): decommission inline editor — Sanity is canonical\""
  echo "  git push"
fi
