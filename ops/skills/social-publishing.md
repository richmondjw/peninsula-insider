---
name: social-publishing
description: End-to-end process for publishing a Peninsula Insider weekly social media pack via the Buffer API across Instagram, Facebook, and LinkedIn
tags: [social, buffer, instagram, facebook, linkedin, publishing, weekly]
---

# Social Publishing — Peninsula Insider

Full process for taking a weekly social pack (copy + PNG assets) and scheduling it across all three Peninsula Insider channels via the Buffer GraphQL API.

## Channel IDs

| Platform  | Handle              | Channel ID                   |
|-----------|---------------------|------------------------------|
| LinkedIn  | peninsula-insider   | `69e58e43031bfa423c20f0bf`  |
| Facebook  | Peninsula Insider   | `69e5913b031bfa423c20f7cf`  |
| Instagram | peninsula.insider   | `69e5d3b7031bfa423c21c0d8`  |

Org ID: `68d0ae8232af2ad45b4fc1c6`

## Weekly schedule (AEST)

| Day       | Time   | Purpose                              |
|-----------|--------|--------------------------------------|
| Monday    | 8:00pm | Week-ahead editorial frame           |
| Tuesday   | 9:00am | Newsletter push                      |
| Wednesday | 9:00am | Vertical / brand authority           |
| Thursday  | 8:00am | Long weekend tease / weekend preview |
| Friday    | 7:00am | Peninsula This Weekend flagship      |

## Platform requirements

| Platform  | Needs image? | Metadata required                              |
|-----------|--------------|------------------------------------------------|
| LinkedIn  | No           | None                                           |
| Facebook  | No           | `metadata: { facebook: { type: post } }`       |
| Instagram | **Yes**      | `metadata: { instagram: { type: post, shouldShareToFeed: true } }` |

Instagram will reject posts without at least one image. Text-only Instagram posts are not supported.

## Step 1 — Locate the social pack

Weekly packs live at:
```
social/week-of-YYYY-MM-DD/
  posting-manifest.json   — day/platform/copy/filename mapping
  exports-png/
    ig/   — Instagram 4:5 PNGs (s01 = hero cover slide)
    fb/   — Facebook 1.91:1 PNGs
    li/   — LinkedIn 1.91:1 PNGs
```

The `posting-manifest.json` is the canonical source — it contains the exact copy for each post keyed by day and platform.

## Step 2 — Upload Instagram images to Supabase CDN

Buffer needs a public URL it can fetch at post time. GitHub Pages works but Supabase is more reliable (confirmed working). Always use Supabase for Instagram assets.

Supabase project: `vjlyihscyrfmndjlkfew`  
Public bucket: `social` → path `ig/`  
Public URL base: `https://vjlyihscyrfmndjlkfew.supabase.co/storage/v1/object/public/social/ig/`

Upload command (run from host, not Docker — uses service key from .env):

```bash
SUPABASE_URL="https://vjlyihscyrfmndjlkfew.supabase.co"
KEY="$SUPABASE_SERVICE_KEY"

curl -X POST "$SUPABASE_URL/storage/v1/object/social/ig/FILENAME.png" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: image/png" \
  --data-binary "@path/to/FILENAME.png"
```

Use the `-s01-v01.png` (first slide / hero) for each day's Instagram post.

## Step 3 — Push posts to Buffer

Use the `post()` function pattern from `social/week-of-YYYY-MM-DD/push-buffer.sh` as the reference implementation. The core pattern:

```bash
# Build JSON body — @json handles all text escaping (newlines, quotes, etc.)
body=$(jq -n \
  --arg t "$TEXT" --arg c "$CHANNEL_ID" --arg d "$DUE_AT_ISO" --arg m "$META_FRAGMENT" \
  '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, dueAt: \"" + $d + "\", mode: customScheduled" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')

curl -sS -X POST https://api.buffer.com \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -d "$body"
```

### Meta fragments per platform

```bash
# LinkedIn — no metadata needed
META=""

# Facebook
META=", metadata: { facebook: { type: post } }"

# Instagram (with image)
# Add assets block before meta:
# ..., assets: { images: [{ url: \"$IMG_URL\" }] }, metadata: { instagram: { type: post, shouldShareToFeed: true } }
```

### DueAt format
ISO 8601 with AEST offset: `2026-04-21T09:00:00+10:00`
Buffer stores and displays in UTC — this is correct; the channel timezone setting handles display.

## Step 4 — Verify

After pushing, query any post to confirm:

```bash
curl -sS -X POST https://api.buffer.com \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -d '{"query":"query { post(input: { id: \"POST_ID\" }) { id status dueAt assets { type source } } }"}' | jq .
```

Expected: `status: "scheduled"`, `assets[0].source` = the image URL.

## Common errors and fixes

| Error | Fix |
|-------|-----|
| `Field "InstagramPostMetadataInput.shouldShareToFeed" of required type "Boolean!" was not provided` | Add `shouldShareToFeed: true` to Instagram metadata |
| `Instagram posts require at least one image or video` | Add `assets: { images: [{ url: "..." }] }` |
| `Facebook posts require a type` | Add `metadata: { facebook: { type: post } }` |
| `Value "draft" does not exist in "ShareMode" enum` | Use `saveToDraft: true` as a separate field, not in mode |
| Text appears unquoted in GraphQL (syntax error) | Use `($text\|@json)` in jq interpolation, never plain `$text` |
| Image asset `id: null` | Normal — Buffer uses external URLs; posts still fire correctly |

## Reference files

| File | Purpose |
|------|---------|
| `social/week-of-2026-04-20/push-buffer.sh` | Reference implementation — working push script with correct quoting pattern |
| `social/week-of-2026-04-20/posting-manifest.json` | Copy and asset mapping for that week |
| `~/.openclaw/bin/buffer.sh` | General-purpose Buffer API helper (simpler single-post commands) |
| `~/.openclaw/skills/buffer.md` | Buffer channel IDs, API overview, agent usage guidance |
