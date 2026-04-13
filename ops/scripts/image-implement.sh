#!/usr/bin/env bash
# image-implement.sh — Download, convert, and place an approved image
# Usage: ./ops/scripts/image-implement.sh <slot-id>
#
# Reads: ops/image-approvals/decisions/<slot-id>.json
# Downloads the approved image, converts to WebP, writes to next/public/images/sourced/
# Creates the .license.txt sidecar file
# Updates ops/image-approvals/index.csv
#
# Prerequisites: curl, cwebp (from libwebp-tools), jq

set -euo pipefail

SLOT_ID="${1:?Usage: $0 <slot-id>}"
DECISIONS_DIR="ops/image-approvals/decisions"
DECISION_FILE="${DECISIONS_DIR}/${SLOT_ID}.json"
IMAGES_DIR="next/public/images/sourced"

if [[ ! -f "$DECISION_FILE" ]]; then
  echo "ERROR: Decision file not found: $DECISION_FILE"
  exit 1
fi

# Check status
STATUS=$(jq -r '.status' "$DECISION_FILE")
if [[ "$STATUS" != "approved" ]]; then
  echo "ERROR: Decision status is '$STATUS', not 'approved'. Editor signature required."
  exit 1
fi

# Extract fields
DOWNLOAD_URL=$(jq -r '.implementerAction.downloadUrl' "$DECISION_FILE")
DOWNLOAD_TO=$(jq -r '.implementerAction.downloadTo' "$DECISION_FILE")
ALT_TEXT=$(jq -r '.implementerAction.altText' "$DECISION_FILE")
CREDIT=$(jq -r '.implementerAction.credit' "$DECISION_FILE")
CAPTION=$(jq -r '.implementerAction.caption' "$DECISION_FILE")
LICENSE=$(jq -r '.implementerAction.license' "$DECISION_FILE")
DECIDED_BY=$(jq -r '.decidedBy' "$DECISION_FILE")
DECIDED_AT=$(jq -r '.decidedAt' "$DECISION_FILE")

# Create output directory
mkdir -p "$IMAGES_DIR"

# Download
TEMP_FILE=$(mktemp /tmp/pi-image-XXXXXX)
echo "Downloading: $DOWNLOAD_URL"
curl -fsSL -o "$TEMP_FILE" "$DOWNLOAD_URL"
echo "Downloaded $(stat -f%z "$TEMP_FILE" 2>/dev/null || stat -c%s "$TEMP_FILE") bytes"

# Detect format and convert to WebP
OUTPUT_PATH="${IMAGES_DIR}/$(basename "$DOWNLOAD_TO")"
if command -v cwebp &>/dev/null; then
  cwebp -q 85 -resize 2400 0 "$TEMP_FILE" -o "$OUTPUT_PATH" 2>/dev/null
  echo "Converted to WebP: $OUTPUT_PATH"
else
  # Fallback: just copy with .webp extension (not ideal)
  cp "$TEMP_FILE" "$OUTPUT_PATH"
  echo "WARNING: cwebp not available. Copied raw file as $OUTPUT_PATH"
fi
rm -f "$TEMP_FILE"

# Write .license.txt sidecar
LICENSE_FILE="${OUTPUT_PATH%.webp}.license.txt"
cat > "$LICENSE_FILE" <<EOF
Slot: ${SLOT_ID}
Source: ${DOWNLOAD_URL}
Credit: ${CREDIT}
Licence: ${LICENSE}
Approved by: ${DECIDED_BY}
Approval decision: ${DECISION_FILE}
Approved on: ${DECIDED_AT}
Alt text: ${ALT_TEXT}
Caption: ${CAPTION}
EOF
echo "Wrote licence sidecar: $LICENSE_FILE"

# Update decision file status
jq '.implementerStatus = "implemented"' "$DECISION_FILE" > "${DECISION_FILE}.tmp" && mv "${DECISION_FILE}.tmp" "$DECISION_FILE"

# Update index.csv
if [[ -f ops/image-approvals/index.csv ]]; then
  sed -i "s/^${SLOT_ID},\(.*\),false,$/\0/" ops/image-approvals/index.csv 2>/dev/null || true
fi

echo "✅ Slot ${SLOT_ID} implemented: ${OUTPUT_PATH}"
echo "   Credit: ${CREDIT}"
echo "   Licence: ${LICENSE}"
