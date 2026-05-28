#!/usr/bin/env node
/**
 * promote-auto-detected-images.mjs
 *
 * Inspects `cms_image_slots` for rows the inline editor saved against the
 * auto-detect fallback identity:
 *
 *   entity_type = 'page'
 *   entity_slug = <whatever page the editor was on>
 *   field_path  = 'img:<basename.webp>'
 *
 * These rows are functional but fragile: they're keyed by the file basename
 * of whatever image happened to render in that slot, so the link breaks the
 * moment the rendering component swaps to a different default. The goal is
 * to migrate every row onto a stable entity identity (e.g.
 * `venue/montalto#heroImage`) so SSR resolution via `loadOverrides()`
 * survives every rebuild.
 *
 * Modes:
 *   (no flags)         List candidates with a suggested target entity
 *                      based on a manifest, plus rows we couldn't auto-map.
 *   --apply            Execute the promotions in the manifest. Without it
 *                      this script is read-only.
 *   --manifest <path>  YAML/JSON manifest of explicit mappings. Defaults to
 *                      ops/cms-promotion-manifest.json if present.
 *   --delete-orphans   When applying, also delete the original page-scoped
 *                      row after a successful insert/update. Default true.
 *   --no-delete-orphans  Keep the originals (debug only — they'll shadow
 *                      the new identity via the client-side implicit pass).
 *
 * Manifest shape (JSON):
 *   {
 *     "promotions": [
 *       {
 *         "from": { "entity_slug": "wine", "field_path": "img:article-cellar-door-01.webp" },
 *         "to":   { "entity_type": "venue", "entity_slug": "montalto", "field_path": "editorialSurface.image" }
 *       },
 *       ...
 *     ]
 *   }
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *
 * Exit codes:
 *   0  success (or read-only listing complete)
 *   1  env / manifest / API error
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ─── Args ─────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const NO_DELETE_ORPHANS = process.argv.includes("--no-delete-orphans");
const DELETE_ORPHANS = !NO_DELETE_ORPHANS;
const manifestIdx = process.argv.indexOf("--manifest");
const MANIFEST_PATH = manifestIdx > -1
  ? resolve(process.argv[manifestIdx + 1] ?? "")
  : resolve("ops/cms-promotion-manifest.json");

// ─── Env ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required env: SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

// CMS tables live in the `pi` schema. PostgREST exposes non-public schemas
// via Accept-Profile (reads) and Content-Profile (writes) headers; without
// them PostgREST defaults to `public` and the request 404s.
const SCHEMA = "pi";
const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
  "Accept-Profile": SCHEMA,
  "Content-Profile": SCHEMA,
};

async function sb(path, init = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  // PostgREST returns 204 No Content for DELETE and an empty 201 body for
  // INSERT/PATCH unless Prefer: return=representation is set. Read the body
  // as text first so empty responses don't crash JSON.parse, then parse only
  // if there's actually content.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Load orphan rows ─────────────────────────────────────────
const ORPHAN_QUERY = `/cms_image_slots?entity_type=eq.page&field_path=like.img:%25&select=id,entity_slug,field_path,public_url,storage_path,storage_bucket,mime_type,alt_text,caption,credit,purpose,label,status`;

console.log(`\n→ Fetching auto-detected (page/img:*) rows…`);
const orphans = await sb(ORPHAN_QUERY);
console.log(`  ${orphans.length} candidate row(s) found.\n`);

if (orphans.length === 0) {
  console.log("Nothing to promote. Exiting.");
  process.exit(0);
}

// ─── Load manifest if present ─────────────────────────────────
let manifest = { promotions: [] };
try {
  const raw = await readFile(MANIFEST_PATH, "utf8");
  manifest = JSON.parse(raw);
  console.log(`→ Loaded ${manifest.promotions?.length ?? 0} explicit promotion(s) from ${MANIFEST_PATH}`);
} catch (err) {
  if (err.code !== "ENOENT") throw err;
  console.log(`→ No manifest at ${MANIFEST_PATH} (read-only listing mode).`);
}
console.log("");

// Index manifest by (entity_slug + field_path) for quick lookup.
const manifestIndex = new Map();
for (const p of manifest.promotions ?? []) {
  const key = `${p.from?.entity_slug}::${p.from?.field_path}`;
  manifestIndex.set(key, p.to);
}

// ─── Categorise rows ──────────────────────────────────────────
const mapped = [];
const unmapped = [];
for (const row of orphans) {
  const key = `${row.entity_slug}::${row.field_path}`;
  const target = manifestIndex.get(key);
  if (target) mapped.push({ row, target });
  else unmapped.push(row);
}

console.log(`Promotable (manifest match): ${mapped.length}`);
console.log(`Unmapped (need manifest entry): ${unmapped.length}\n`);

if (mapped.length > 0) {
  console.log("── Mapped promotions ──────────────────────────────────────────");
  for (const { row, target } of mapped) {
    console.log(`  page/${row.entity_slug}#${row.field_path}`);
    console.log(`    → ${target.entity_type}/${target.entity_slug}#${target.field_path}`);
  }
  console.log("");
}

if (unmapped.length > 0) {
  console.log("── Unmapped (review and add to manifest) ──────────────────────");
  for (const row of unmapped) {
    console.log(`  page/${row.entity_slug}#${row.field_path}`);
    console.log(`    storage: ${row.storage_path ?? "(metadata-only)"}`);
    console.log(`    public:  ${row.public_url ?? "(none)"}`);
  }
  console.log("");
}

if (!APPLY) {
  console.log("Read-only listing complete. Re-run with --apply to execute mapped promotions.");
  process.exit(0);
}

if (mapped.length === 0) {
  console.log("Nothing to apply. Add entries to the manifest and re-run.");
  process.exit(0);
}

// ─── Apply ────────────────────────────────────────────────────
console.log(`→ Applying ${mapped.length} promotion(s) (delete orphans: ${DELETE_ORPHANS ? "yes" : "no"})…\n`);
let ok = 0;
let failed = 0;
for (const { row, target } of mapped) {
  const fromLabel = `page/${row.entity_slug}#${row.field_path}`;
  const toLabel = `${target.entity_type}/${target.entity_slug}#${target.field_path}`;
  try {
    // 1. Find destination row, if any.
    const existing = await sb(
      `/cms_image_slots?entity_type=eq.${encodeURIComponent(target.entity_type)}&entity_slug=eq.${encodeURIComponent(target.entity_slug)}&field_path=eq.${encodeURIComponent(target.field_path)}&select=id`,
    );

    const payload = {
      entity_type: target.entity_type,
      entity_slug: target.entity_slug,
      field_path: target.field_path,
      label: row.label ?? `${target.entity_type}/${target.entity_slug} ${target.field_path}`,
      purpose: row.purpose ?? "hero",
      storage_bucket: row.storage_bucket,
      storage_path: row.storage_path,
      public_url: row.public_url,
      mime_type: row.mime_type,
      alt_text: row.alt_text,
      caption: row.caption,
      credit: row.credit,
      status: row.status ?? "published",
    };

    if (existing.length > 0) {
      await sb(`/cms_image_slots?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await sb(`/cms_image_slots`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    if (DELETE_ORPHANS) {
      await sb(`/cms_image_slots?id=eq.${row.id}`, { method: "DELETE" });
    }

    console.log(`  ✓ ${fromLabel} → ${toLabel}`);
    ok++;
  } catch (err) {
    console.error(`  ✗ ${fromLabel} → ${toLabel}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. ${ok} promoted, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
