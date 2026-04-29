#!/usr/bin/env node
/**
 * Refresh the concierge corpus.
 *
 * Reads venue + article source from next/src/content/, builds chunks
 * with deterministic IDs, and idempotently upserts to Supabase. Only
 * re-embeds chunks whose text actually changed (compared via SHA-256
 * stored as embedding_source_hash).
 *
 * Usage:
 *   node scripts/refresh-corpus.mjs           # run normally
 *   node scripts/refresh-corpus.mjs --dry     # don't write, just report
 *   node scripts/refresh-corpus.mjs --force   # ignore hashes, re-embed all
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   OPENAI_API_KEY
 *
 * Optional:
 *   CONTENT_DIR  (default: next/src/content)
 *   EMBEDDING_MODEL  (default: text-embedding-3-small)
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";

// ─── Args ─────────────────────────────────────────────────────
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

// ─── Env ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const CONTENT_DIR = process.env.CONTENT_DIR || resolve("next/src/content");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Missing required env: SUPABASE_URL / SUPABASE_SERVICE_KEY / OPENAI_API_KEY");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────
const sha = (s) => createHash("sha256").update(s).digest("hex");
const tokens = (s) => Math.ceil((s || "").length / 4);  // rough est, 4 chars/token

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// ─── Frontmatter parser (no deps) ──────────────────────────────
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return { meta: {}, body: raw };
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");

  // Minimal YAML parse — enough for our flat fields and simple lists
  const meta = {};
  const lines = yaml.split("\n");
  let currentKey = null;
  let currentList = null;
  let currentObj = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    const key = m[2];
    let val = m[3].trim();

    if (indent === 0) {
      currentList = null;
      currentObj = null;
      if (val === "" || val === "|" || val === ">") {
        // Block scalar or nested object
        meta[key] = "";
        currentKey = key;
        currentObj = meta;
      } else if (val.startsWith("[")) {
        // Inline array
        meta[key] = val
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else {
        meta[key] = val.replace(/^["']|["']$/g, "");
      }
    } else if (indent >= 2 && currentKey) {
      // Treat as item under currentKey list/obj
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
        meta[currentKey].push(trimmed.slice(2).replace(/^["']|["']$/g, ""));
      }
    }
  }
  return { meta, body };
}

// ─── Build chunks per entity ──────────────────────────────────
function venueId(slug) {
  return `venue_${slug.replace(/-/g, "_")}`;
}
function articleId(slug) {
  return `article_${slug.replace(/-/g, "_")}`;
}

function chunkVenue(v, slug) {
  const region = String(v.place?.id ?? v.place ?? v.region ?? "other").toLowerCase();
  const category = v.type || "context";
  const id = venueId(slug);
  const base = {
    source_entity_type: "venue",
    source_entity_id: id,
    page_slug: slug,
    page_title: v.name,
    editorial_tier: "B",
    category,
    region,
    vendor_relationship: v.featuredPartner ? "featured" : "none",
    freshness_flag: "fresh",
  };
  const out = [];

  // 1. Summary
  const summary = `${v.name}. ${v.type ?? ""} in ${region}. ${v.signature ?? ""}`.trim();
  out.push({
    ...base,
    chunk_id: `${slug}::summary::0`,
    section_heading: "Overview",
    chunk_purpose: "summary",
    text: summary,
  });

  // 2. Editor note (often the richest chunk)
  if (v.editorNote && v.editorNote.length > 60) {
    out.push({
      ...base,
      chunk_id: `${slug}::editor_note::0`,
      section_heading: "Editor's note",
      chunk_purpose: "editor_note",
      editorial_tier: "A",
      text: `${v.name}. ${v.editorNote}`,
    });
  }

  // 3. Practical
  const parts = [];
  if (v.address) parts.push(`Address: ${v.address}`);
  if (v.priceBand) parts.push(`Price band: ${v.priceBand}`);
  if (v.website) parts.push(`Website: ${v.website}`);
  if (v.bookingProvider && v.bookingProvider !== "none")
    parts.push(`Booking via: ${v.bookingProvider}`);
  if (v.phone) parts.push(`Phone: ${v.phone}`);
  if (parts.length > 0) {
    out.push({
      ...base,
      chunk_id: `${slug}::practical::0`,
      section_heading: "Practical",
      chunk_purpose: "practical",
      text: `${v.name} (${region}). ${parts.join(". ")}.`,
    });
  }

  // 4. Tags / mood
  const tags = v.tags || {};
  const tagBits = [
    tags.mood?.length && `Mood: ${tags.mood.join(", ")}`,
    tags.season?.length && `Season: ${tags.season.join(", ")}`,
    tags.audience?.length && `Audience: ${tags.audience.join(", ")}`,
    tags.occasion?.length && `Occasion: ${tags.occasion.join(", ")}`,
  ].filter(Boolean);
  if (tagBits.length > 0) {
    out.push({
      ...base,
      chunk_id: `${slug}::tags::0`,
      section_heading: "Mood & fit",
      chunk_purpose: "tags",
      text: `${v.name}. ${tagBits.join(". ")}.`,
    });
  }

  return out;
}

function chunkArticle(meta, body, slug) {
  const id = articleId(slug);
  const region = String(meta.region ?? "other").toLowerCase();
  const base = {
    source_entity_type: "article",
    source_entity_id: id,
    page_slug: slug,
    page_title: meta.title || slug,
    editorial_tier: "A",
    category: "context",
    region,
    vendor_relationship: "none",
    freshness_flag: "fresh",
  };
  const out = [];

  // 1. Lede — title + dek + first paragraph
  const firstPara = body.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => !s.startsWith("#"))[0] || "";
  out.push({
    ...base,
    chunk_id: `${slug}::lede::0`,
    section_heading: "Lede",
    chunk_purpose: "lede",
    text: [meta.title, meta.dek, firstPara].filter(Boolean).join(". ").slice(0, 1800),
  });

  // 2. Body chunks — split by double-newline, group into ~500-token chunks
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#") && s.length > 60);
  const groups = [];
  let cur = [];
  let curTok = 0;
  for (const p of paragraphs) {
    const pTok = tokens(p);
    if (curTok + pTok > 500 && cur.length > 0) {
      groups.push(cur.join("\n\n"));
      cur = [];
      curTok = 0;
    }
    cur.push(p);
    curTok += pTok;
  }
  if (cur.length > 0) groups.push(cur.join("\n\n"));

  groups.forEach((g, i) => {
    out.push({
      ...base,
      chunk_id: `${slug}::body::${i}`,
      section_heading: `Body ${i + 1}`,
      chunk_purpose: "body",
      text: `${meta.title}. ${g}`.slice(0, 3500),
    });
  });

  return out;
}

// ─── OpenAI embed ─────────────────────────────────────────────
async function embed(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          dimensions: 1024,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429 && attempt < retries) {
          await sleep(2000 * attempt);
          continue;
        }
        throw new Error(`OpenAI ${res.status}: ${err}`);
      }
      const data = await res.json();
      return data.data[0].embedding;
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1000 * attempt);
    }
  }
}

// ─── Supabase ops ─────────────────────────────────────────────
async function fetchExistingHashes() {
  // Page through to handle >1000 rows
  const map = new Map();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?select=chunk_id,embedding_source_hash&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) throw new Error(`Failed listing chunks: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    rows.forEach((r) => map.set(r.chunk_id, r.embedding_source_hash));
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return map;
}

async function upsertChunk(chunk, embedding, hash) {
  const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?on_conflict=chunk_id`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      ...chunk,
      embedding: `[${embedding.join(",")}]`,
      embedding_source_hash: hash,
      approx_tokens: tokens(chunk.text),
      ingested_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Upsert ${chunk.chunk_id} failed: ${res.status} ${await res.text()}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log("\n🌊  Concierge corpus refresh");
  console.log(`     Mode:        ${DRY ? "DRY RUN" : FORCE ? "FORCE re-embed all" : "delta only"}`);
  console.log(`     Content dir: ${CONTENT_DIR}`);
  console.log(`     Embed model: ${EMBEDDING_MODEL}\n`);

  // Read all source content
  const venueDir = join(CONTENT_DIR, "venues");
  const articleDir = join(CONTENT_DIR, "articles");

  const allChunks = [];

  // Venues
  const venueFiles = (await readdir(venueDir).catch(() => [])).filter((f) => f.endsWith(".json"));
  for (const f of venueFiles) {
    const slug = basename(f, ".json");
    const v = JSON.parse(await readFile(join(venueDir, f), "utf8"));
    if (v.status && v.status !== "published") continue;
    allChunks.push(...chunkVenue(v, slug));
  }
  console.log(`  Venues:   ${venueFiles.length} files`);

  // Articles
  const articleFiles = (await readdir(articleDir).catch(() => [])).filter((f) => /\.(md|mdx)$/.test(f));
  for (const f of articleFiles) {
    const slug = basename(f).replace(/\.(md|mdx)$/, "");
    const raw = await readFile(join(articleDir, f), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    if (meta.status && meta.status !== "published") continue;
    allChunks.push(...chunkArticle(meta, body, slug));
  }
  console.log(`  Articles: ${articleFiles.length} files`);
  console.log(`  → ${allChunks.length} chunks built from source\n`);

  // Compare vs. existing
  const existing = await fetchExistingHashes();
  console.log(`  ${existing.size} chunks currently in Supabase\n`);

  let added = 0,
    updated = 0,
    skipped = 0,
    errors = 0;

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const newHash = sha(chunk.text);
    const existingHash = existing.get(chunk.chunk_id);

    if (!FORCE && existingHash === newHash) {
      skipped++;
      continue;
    }

    if (DRY) {
      const verb = existingHash ? "WOULD update" : "WOULD add";
      console.log(`  ${verb}: ${chunk.chunk_id} (${chunk.text.length} chars)`);
      if (existingHash) updated++;
      else added++;
      continue;
    }

    try {
      const embedding = await embed(chunk.text);
      await upsertChunk(chunk, embedding, newHash);
      if (existingHash) {
        updated++;
        process.stdout.write(`  ~ ${chunk.chunk_id}\n`);
      } else {
        added++;
        process.stdout.write(`  + ${chunk.chunk_id}\n`);
      }
    } catch (e) {
      errors++;
      console.error(`  ✗ ${chunk.chunk_id}: ${e.message}`);
    }
  }

  // Stale chunks (in DB but not in source)
  const newIds = new Set(allChunks.map((c) => c.chunk_id));
  const stale = [...existing.keys()].filter((id) => !newIds.has(id));

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log(`  Done in ${elapsed}s`);
  console.log(`     +${added} added`);
  console.log(`     ~${updated} updated`);
  console.log(`     =${skipped} unchanged`);
  console.log(`     ✗${errors} errors`);
  console.log(`     ⌫${stale.length} stale (in DB but not in source — not auto-deleted)`);

  if (stale.length > 0 && stale.length < 20) {
    console.log(`\n  Stale chunk_ids:`);
    stale.forEach((id) => console.log(`     - ${id}`));
  }

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
