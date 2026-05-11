# Peninsula Insider — Editorial guide to the inline CMS

**Last updated:** 2026-05-11
**Audience:** James, Emma, future editors (not developers)

This is the practical operator's guide to editing Peninsula Insider through
the inline CMS. It explains what works today, the rules to follow, and what
to do when something doesn't behave the way you expected.

For the engineering side, see [`docs/cms-architecture.md`](cms-architecture.md).

## How to sign in

1. Visit `/admin/login` on either localhost or the live site.
2. Sign in with the Google account that's on the editor allowlist
   (`james@peninsulainsider.com.au`).
3. Once you're signed in, a small "Editor" indicator appears in the top
   utility bar. Right-click and contenteditable affordances activate on
   any page you visit.

If sign-in says success but you don't see editor controls, check
`pi.admin_user_allowlist` in the Supabase dashboard — your row needs
`role IN ('editor', 'publisher', 'admin')`.

## How to replace an image

1. Sign in.
2. Navigate to the page that shows the image. Card grids, hero blocks, and
   inline article photos all support replacement.
3. Right-click the image.
4. Pick "Replace image". Upload a file from your machine, or paste a URL.
5. Click "Save and publish". The new image appears on the live site within
   a few seconds.

**One rule that matters:** the right-click acts on the **entity** the image
belongs to, not on the image file. If two different venues happen to show
the same stock photo, replacing the photo on one venue's card will leave
the other venue's card untouched. This is by design — the entire 2026-05-11
overhaul existed to make this true. If you ever see the old behaviour
again (one click affecting many cards), flag it as a regression.

## How to edit text

1. Sign in.
2. Click the text you want to change. If it's editable, the cursor will
   land inside it and the border will highlight.
3. Type your edits. Markdown is supported inline.
4. Click outside, or press Esc. The "Save" button at the top of the screen
   will glow.
5. Click Save. The change goes live.

If the cursor won't land in a text block, that block isn't tagged for
editing yet. Tell Claude which block and on which page, and ask for it to
be tagged.

## How to save and share

Every card has a Save (heart) and Share affordance. As a signed-in editor,
your saves sync to the cloud and are visible across devices. As a
signed-out visitor, saves live in the browser only.

Sharing a plan generates a base64-encoded URL — no server lookups, no
auth. Anyone with the link can see the same plan you saved.

## What to do when an edit fails

### "CMS override refused: no matching row in pi.content_registry"

This means the page slug doesn't match any entity the registry knows about.
The two common reasons:

1. **You're editing a brand new venue** that was added to the site since
   the last deploy. The registry refreshes at deploy time; until the next
   deploy lands, the new slug isn't registered. Wait for the next deploy
   (~5 min) or trigger one by pushing any change to `main`.
2. **The slug on the page has drifted** from the content collection. Look
   in `next/src/content/venues/<slug>.json` and confirm the filename
   matches what's in the URL.

### "Storage upload failed: 500 / stack depth limit"

Already fixed in production on 2026-05-11. If you see this on a local dev
environment, you're missing migration
`2026-05-11-pi-cms-admin-fix-recursion.sql`. Apply it.

### "Save button doesn't enable"

The Save button enables when the page has at least one pending edit. If
you've made changes and nothing's happening, refresh the page and try
again — the inline edit client occasionally needs to re-hydrate after
view transitions.

### "Image preview shows the new image but the live site shows the old one"

GitHub Pages caches aggressively. Force-refresh (Ctrl+Shift+R) or wait
5–10 minutes for the edge cache to expire.

## Adding a new venue (or any new content entity)

The inline CMS is for **editing** content that already exists. Adding new
entities is still done by adding JSON / MDX files to `next/src/content/`.

1. Add `next/src/content/venues/your-new-venue.json` (or events, places,
   etc.) following the existing schema.
2. Commit and push. The deploy runs the registry refresh, which picks up
   the new slug.
3. Once the deploy lands, the new venue's page becomes inline-editable.

If you skip step 2 and try to edit the venue inline, you'll get the
"no matching row in pi.content_registry" error described above.

## The canonical kinds

These are the only `entity_type` values the system understands. The list
is enforced both in the database and at build time:

| Kind | What it covers |
|---|---|
| `venue` | Cellar doors, restaurants, accommodation, etc. |
| `place` | Towns / suburbs / locales |
| `event` | One-off or recurring events |
| `experience` | Activities, walks, golf courses, beaches |
| `itinerary` | Multi-stop curated itineraries |
| `article` | Journal entries, guides, area pages |
| `tour` | Bookable tours from third-party operators |
| `tour-operator` | The companies that run tours |
| `tour-package` | Bundled tour packages |
| `page` | Static landing pages (`/`, `/wine/`, `/eat/`, etc.) |

Adding a new kind is a developer task — it requires a coordinated
database migration. Ask Claude to handle it.

## Known limitations

These are documented openly so editors don't waste time looking for them:

- **No draft/preview mode yet.** Saves are immediate and published. The
  rollout plan calls for adding a draft flow + revert UI as Phase 4.
- **No image cleanup.** When you replace a hero, the old image file stays
  in storage. Phase 2 will add nightly tombstone cleanup.
- **No bulk edits.** You edit one element at a time. Bulk operations
  (e.g. "swap this image on every venue using it") are deliberately not
  exposed, because shared-image bugs were the entire point of the
  2026-05-11 overhaul.

## For more detail

- Architecture, file map, and code references:
  [`docs/cms-architecture.md`](cms-architecture.md)
- Database schema and migration order:
  [`ops/migrations/README.md`](../ops/migrations/README.md)
