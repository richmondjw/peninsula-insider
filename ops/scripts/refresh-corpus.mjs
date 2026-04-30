#!/usr/bin/env node
/**
 * Refresh the concierge corpus.
 *
 * Reads source content from next/src/content/ and idempotently upserts
 * to Supabase concierge_chunks. Only re-embeds chunks whose text or
 * metadata fingerprint actually changed.
 *
 * Collections walked:
 *   venues             (135 files,  ~4 chunks each)
 *   articles           (markdown,   1 lede + N body)
 *   places             (~20 files,  intro + tldr)
 *   itineraries        (~6 files,   summary + frame + per-stop)
 *   experiences        (~42 files,  same shape as venues)
 *   events             (~16 files,  summary + editor; auto-pruned past dates)
 *   editorial_blocks   (markdown,   hub intros + best-of framing)
 *
 * Modes:
 *   --dry        report only, do not write
 *   --force      re-embed every chunk regardless of hash
 *   --prune      delete stale rows older than 7-day grace (or expired events)
 *   --report     write JSON + Markdown report to reports/concierge-corpus/
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   OPENAI_API_KEY
 *
 * Optional:
 *   CONTENT_DIR        default: next/src/content
 *   REPORT_DIR         default: reports/concierge-corpus
 *   EMBEDDING_MODEL    default: text-embedding-3-small
 *   EVENT_GRACE_DAYS   default: 14   (events older than this are pruned)
 *   STALE_GRACE_DAYS   default: 7    (non-event stale rows older than this are pruned)
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";

// ─── Args ─────────────────────────────────────────────────────
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
const PRUNE = process.argv.includes("--prune");
const REPORT = process.argv.includes("--report");

// ─── Env ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMS = 1024;
const CONTENT_DIR = process.env.CONTENT_DIR || resolve("next/src/content");
const REPORT_DIR = process.env.REPORT_DIR || resolve("reports/concierge-corpus");
const EVENT_GRACE_DAYS = Number(process.env.EVENT_GRACE_DAYS ?? 14);
const STALE_GRACE_DAYS = Number(process.env.STALE_GRACE_DAYS ?? 7);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Missing required env: SUPABASE_URL / SUPABASE_SERVICE_KEY / OPENAI_API_KEY");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────
const sha = (s) => createHash("sha256").update(s).digest("hex");
const tokens = (s) => Math.ceil((s || "").length / 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Build a stable fingerprint over the structured metadata that should
// retrigger an upsert even when the chunk text is unchanged. Closes the
// "metadata-only changes do not retrigger" gap from the IT brief.
function metadataFingerprint(chunk) {
  const fields = {
    editorial_tier: chunk.editorial_tier,
    category: chunk.category,
    region: chunk.region,
    vendor_relationship: chunk.vendor_relationship,
    freshness_flag: chunk.freshness_flag,
    section_heading: chunk.section_heading,
    chunk_purpose: chunk.chunk_purpose,
    page_title: chunk.page_title,
    event_date: chunk.event_date ?? null,
  };
  return sha(JSON.stringify(fields));
}

// ─── Frontmatter parser (no deps) ──────────────────────────────
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return { meta: {}, body: raw };
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");

  const meta = {};
  const lines = yaml.split("\n");
  let currentKey = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    const key = m[2];
    let val = m[3].trim();

    if (indent === 0) {
      if (val === "" || val === "|" || val === ">") {
        meta[key] = "";
        currentKey = key;
      } else if (val.startsWith("[")) {
        meta[key] = val
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else {
        meta[key] = val.replace(/^["']|["']$/g, "");
      }
    } else if (indent >= 2 && currentKey) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
        meta[currentKey].push(trimmed.slice(2).replace(/^["']|["']$/g, ""));
      }
    }
  }
  return { meta, body };
}

// ─── Stable IDs ───────────────────────────────────────────────
const venueId = (slug) => `venue_${slug.replace(/-/g, "_")}`;
const articleId = (slug) => `article_${slug.replace(/-/g, "_")}`;
const placeId = (slug) => `place_${slug.replace(/-/g, "_")}`;
const itineraryId = (slug) => `itinerary_${slug.replace(/-/g, "_")}`;
const experienceId = (slug) => `experience_${slug.replace(/-/g, "_")}`;
const eventId = (slug) => `event_${slug.replace(/-/g, "_")}`;
const editorialBlockId = (slug) => `editorial_${slug.replace(/-/g, "_")}`;

// ─── Chunkers ─────────────────────────────────────────────────

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

  const summary = `${v.name}. ${v.type ?? ""} in ${region}. ${v.signature ?? ""}`.trim();
  out.push({
    ...base,
    chunk_id: `${slug}::summary::0`,
    section_heading: "Overview",
    chunk_purpose: "summary",
    text: summary,
  });

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

  const firstPara = body.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => !s.startsWith("#"))[0] || "";
  out.push({
    ...base,
    chunk_id: `${slug}::lede::0`,
    section_heading: "Lede",
    chunk_purpose: "lede",
    text: [meta.title, meta.dek, firstPara].filter(Boolean).join(". ").slice(0, 1800),
  });

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

function chunkPlace(p, slug) {
  const id = placeId(slug);
  const region = slug.toLowerCase();
  const base = {
    source_entity_type: "place",
    source_entity_id: id,
    page_slug: slug,
    page_title: p.name,
    editorial_tier: "A",
    category: p.kind || "place",
    region,
    vendor_relationship: "none",
    freshness_flag: "fresh",
  };
  const out = [];

  out.push({
    ...base,
    chunk_id: `${slug}::summary::0`,
    section_heading: "Overview",
    chunk_purpose: "summary",
    text: `${p.name} (${p.kind ?? "place"}, ${p.zone ?? "Mornington Peninsula"}). ${p.driveTime ? `Drive time: ${p.driveTime}.` : ""}`.trim(),
  });

  if (p.intro && p.intro.length > 60) {
    out.push({
      ...base,
      chunk_id: `${slug}::intro::0`,
      section_heading: "Intro",
      chunk_purpose: "place_intro",
      text: `${p.name}. ${p.intro}`,
    });
  }

  if (Array.isArray(p.tldr) && p.tldr.length > 0) {
    out.push({
      ...base,
      chunk_id: `${slug}::tldr::0`,
      section_heading: "TL;DR",
      chunk_purpose: "place_tldr",
      text: `${p.name}. ${p.tldr.join(" ")}`,
    });
  }

  return out;
}

function chunkItinerary(it, slug) {
  const id = itineraryId(slug);
  const region = String(it.anchorTown?.id ?? it.anchorTown ?? it.baseTowns?.[0]?.id ?? "other").toLowerCase();
  const themeStr = Array.isArray(it.theme) ? it.theme.join(", ") : (it.theme ?? "");
  const base = {
    source_entity_type: "itinerary",
    source_entity_id: id,
    page_slug: slug,
    page_title: it.title,
    editorial_tier: "A",
    category: "itinerary",
    region,
    vendor_relationship: "none",
    freshness_flag: "fresh",
  };
  const out = [];

  const summaryParts = [
    it.title,
    it.dek,
    it.audience && `For ${it.audience}.`,
    it.lengthNights != null && `${it.lengthNights} night${it.lengthNights === 1 ? "" : "s"}.`,
    it.duration && `Duration: ${it.duration}.`,
    themeStr && `Theme: ${themeStr}.`,
    it.budget && `Budget: ${it.budget}.`,
    it.season && it.season !== "year-round" && `Season: ${it.season}.`,
  ].filter(Boolean);
  out.push({
    ...base,
    chunk_id: `${slug}::summary::0`,
    section_heading: "Overview",
    chunk_purpose: "itinerary_summary",
    text: summaryParts.join(" "),
  });

  if (it.editorNote && it.editorNote.length > 60) {
    out.push({
      ...base,
      chunk_id: `${slug}::editor_note::0`,
      section_heading: "Editor's framing",
      chunk_purpose: "itinerary_frame",
      text: `${it.title}. ${it.editorNote}`,
    });
  }

  if (it.editorialFrame && it.editorialFrame.length > 60) {
    out.push({
      ...base,
      chunk_id: `${slug}::editorial_frame::0`,
      section_heading: "Editorial frame",
      chunk_purpose: "itinerary_frame",
      text: `${it.title}. ${it.editorialFrame}`,
    });
  }

  // One chunk per day. Each day groups its stops with notes.
  const stops = Array.isArray(it.stops) ? it.stops : [];
  const byDay = new Map();
  stops.forEach((s) => {
    const day = s.day || 1;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(s);
  });
  for (const [day, daysStops] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = daysStops.sort((a, b) => (a.order || 0) - (b.order || 0));
    const dayText = sorted
      .map((s) => {
        const target = s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience ?? "stop";
        const when = s.timeRange || s.timeOfDay || "";
        return `${when ? when + ": " : ""}${target}${s.note ? ". " + s.note : ""}${s.practical ? ". " + s.practical : ""}`;
      })
      .join(" → ");
    out.push({
      ...base,
      chunk_id: `${slug}::day::${day}`,
      section_heading: `Day ${day}`,
      chunk_purpose: "itinerary_day",
      text: `${it.title} — Day ${day}. ${dayText}`,
    });
  }

  if (it.skipThese && it.skipThese.length > 30) {
    out.push({
      ...base,
      chunk_id: `${slug}::skip::0`,
      section_heading: "What to skip",
      chunk_purpose: "itinerary_skip",
      text: `${it.title} — what to skip. ${it.skipThese}`,
    });
  }

  if (Array.isArray(it.variations) && it.variations.length > 0) {
    const varText = it.variations
      .map((v) => `${v.label}: ${v.body}`)
      .join(" | ");
    out.push({
      ...base,
      chunk_id: `${slug}::variations::0`,
      section_heading: "Variations",
      chunk_purpose: "itinerary_variations",
      text: `${it.title} variations. ${varText}`,
    });
  }

  return out;
}

function chunkExperience(e, slug) {
  const id = experienceId(slug);
  const region = String(e.place?.id ?? e.place ?? "other").toLowerCase();
  const base = {
    source_entity_type: "experience",
    source_entity_id: id,
    page_slug: slug,
    page_title: e.name,
    editorial_tier: "B",
    category: e.type || "experience",
    region,
    vendor_relationship: "none",
    freshness_flag: "fresh",
  };
  const out = [];

  const summaryBits = [
    e.name,
    e.type && `${e.type} in ${region}`,
    e.durationMinutes && `~${e.durationMinutes} minutes`,
    e.difficulty && `${e.difficulty} difficulty`,
    Array.isArray(e.seasonBest) && e.seasonBest.length && `Best: ${e.seasonBest.join(", ")}`,
  ].filter(Boolean);
  out.push({
    ...base,
    chunk_id: `${slug}::summary::0`,
    section_heading: "Overview",
    chunk_purpose: "summary",
    text: summaryBits.join(". ") + ".",
  });

  if (e.editorNote && e.editorNote.length > 60) {
    out.push({
      ...base,
      chunk_id: `${slug}::editor_note::0`,
      section_heading: "Editor's note",
      chunk_purpose: "editor_note",
      editorial_tier: "A",
      text: `${e.name}. ${e.editorNote}`,
    });
  }

  const tags = e.tags || {};
  const tagBits = [
    tags.mood?.length && `Mood: ${tags.mood.join(", ")}`,
    tags.season?.length && `Season: ${tags.season.join(", ")}`,
    tags.audience?.length && `Audience: ${tags.audience.join(", ")}`,
  ].filter(Boolean);
  if (tagBits.length > 0) {
    out.push({
      ...base,
      chunk_id: `${slug}::tags::0`,
      section_heading: "Mood & fit",
      chunk_purpose: "tags",
      text: `${e.name}. ${tagBits.join(". ")}.`,
    });
  }

  return out;
}

function chunkEvent(ev, slug, today) {
  const id = eventId(slug);
  const region = String(ev.place?.id ?? ev.place ?? "other").toLowerCase();
  const start = new Date(ev.startDate);
  const end = ev.endDate ? new Date(ev.endDate) : start;
  const effectiveEnd = end > start ? end : start;

  // Freshness: future or current = fresh, recently past (<= grace) = stale-warning, otherwise expired
  const cutoffPrune = daysAgo(EVENT_GRACE_DAYS);
  let freshness_flag = "fresh";
  if (effectiveEnd < today) {
    freshness_flag = effectiveEnd >= cutoffPrune ? "stale" : "expired";
  }

  const base = {
    source_entity_type: "event",
    source_entity_id: id,
    page_slug: slug,
    page_title: ev.title,
    editorial_tier: "A",
    category: ev.category || "event",
    region,
    vendor_relationship: "none",
    freshness_flag,
    event_date: isoDate(effectiveEnd),
  };

  // If expired beyond grace, return no chunks. The reconciliation pass will
  // detect the missing IDs and prune them from the database.
  if (freshness_flag === "expired") return { chunks: [], expired: true };

  const out = [];
  const dateStr = ev.endDate
    ? `${isoDate(start)} to ${isoDate(end)}`
    : isoDate(start);

  out.push({
    ...base,
    chunk_id: `${slug}::summary::0`,
    section_heading: "Overview",
    chunk_purpose: "event_summary",
    text: `${ev.title}. ${ev.summary ?? ""} Dates: ${dateStr}. Region: ${region}. Category: ${ev.category}.`.trim(),
  });

  if (ev.editorNote && ev.editorNote.length > 60) {
    out.push({
      ...base,
      chunk_id: `${slug}::editor_note::0`,
      section_heading: "Editor's note",
      chunk_purpose: "event_editor_note",
      text: `${ev.title} (${dateStr}). ${ev.editorNote}`,
    });
  }

  if (ev.editorVerdict && ev.editorVerdict.length > 30) {
    out.push({
      ...base,
      chunk_id: `${slug}::verdict::0`,
      section_heading: "Editor's verdict",
      chunk_purpose: "event_verdict",
      text: `${ev.title} (${dateStr}). ${ev.editorVerdict}`,
    });
  }

  return { chunks: out, expired: false };
}

function chunkEditorialBlock(meta, body, slug) {
  const id = editorialBlockId(slug);
  const region = String(meta.region ?? meta.place ?? "other").toLowerCase();
  const base = {
    source_entity_type: "editorial_block",
    source_entity_id: id,
    page_slug: slug,
    page_title: meta.title || slug,
    editorial_tier: "A",
    category: meta.kind || "editorial_block",
    region,
    vendor_relationship: "none",
    freshness_flag: "fresh",
  };
  const out = [];

  out.push({
    ...base,
    chunk_id: `${slug}::block::0`,
    section_heading: meta.section || "Editorial framing",
    chunk_purpose: "editorial_block",
    text: `${meta.title ?? slug}. ${body}`.slice(0, 3500),
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
          dimensions: EMBEDDING_DIMS,
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

// Schema detection. The columns metadata_fingerprint and event_date are added
// by ops/migrations/2026-04-30-...sql. The script needs to work both before
// and after that migration is applied, so we probe once and adapt.
const schema = {
  hasMetadataFingerprint: false,
  hasEventDate: false,
};

async function detectSchema() {
  // Probe with a 1-row select that asks for both columns. PostgREST returns
  // PGRST204 if a column doesn't exist; we degrade per-column on failure.
  async function probeColumn(col) {
    const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?select=${col}&limit=1`;
    const res = await fetch(url, { headers: sbHeaders });
    if (res.ok) return true;
    const body = await res.text();
    if (res.status === 400 || /Could not find the .+ column/i.test(body)) return false;
    // Any other error (auth, network, etc.) should surface loudly
    throw new Error(`Schema probe for "${col}" failed: ${res.status} ${body}`);
  }
  schema.hasMetadataFingerprint = await probeColumn("metadata_fingerprint");
  schema.hasEventDate = await probeColumn("event_date");
  if (!schema.hasMetadataFingerprint || !schema.hasEventDate) {
    console.warn(
      `\n  ⚠  Schema is pre-migration (metadata_fingerprint=${schema.hasMetadataFingerprint}, event_date=${schema.hasEventDate}).\n     Running in compat mode. Apply ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql\n     to unlock metadata-only upserts and event_date filtering.\n`
    );
  }
}

function stripUnsupportedFields(payload) {
  const out = { ...payload };
  if (!schema.hasMetadataFingerprint) delete out.metadata_fingerprint;
  if (!schema.hasEventDate) delete out.event_date;
  return out;
}

async function fetchExistingRows() {
  const cols = ["chunk_id", "embedding_source_hash", "source_entity_type", "extracted_at"];
  if (schema.hasMetadataFingerprint) cols.push("metadata_fingerprint");
  const select = cols.join(",");

  const map = new Map();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?select=${select}&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) throw new Error(`Failed listing chunks: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    rows.forEach((r) =>
      map.set(r.chunk_id, {
        text_hash: r.embedding_source_hash,
        meta_hash: schema.hasMetadataFingerprint ? r.metadata_fingerprint : null,
        type: r.source_entity_type,
        extracted_at: r.extracted_at,
      })
    );
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return map;
}

// Defaults and policy enforcement for columns the live schema requires.
// Sourced from live schema inspection 2026-04-30:
//   - `editorial_voice_owner` is NOT NULL → default 'Editorial'
//   - `chunks_tier_a_requires_otto_verified` check constraint → tier A is
//     only valid when last_otto_verified is set, which is Otto's job, not
//     this script's. So all freshly-imported chunks land as tier B and Otto
//     promotes them to A on its next verification pass. The chunkers may
//     still HINT tier A on the chunk object — we honour that hint only when
//     the source record carries a recent verification date that we can
//     attribute (e.g. a venue's `lastVerified` field). Otherwise we demote
//     to B at write time, so the constraint is always satisfied.
const REQUIRED_DEFAULTS = {
  editorial_voice_owner: "Editorial",
  generation: 0,
};

// The live concierge_chunks.source_entity_type column has a CHECK constraint
// that allows only: venue, article, experience, itinerary, event. Two of our
// chunker types are not in that allow-list, so we map them at write time:
//   - place   → experience  (places are non-establishment locations to discover)
//   - editorial_block → article (editorial framing copy is an article-shaped artefact)
// Chunk metadata still distinguishes them via category/chunk_purpose, and the
// concierge API doesn't filter by source_entity_type by default — so this
// remap doesn't affect retrieval or ranking.
const SOURCE_TYPE_MAP = {
  place: "experience",
  editorial_block: "article",
};

function safeSourceType(chunk) {
  return SOURCE_TYPE_MAP[chunk.source_entity_type] || chunk.source_entity_type;
}

function safeTier(chunk) {
  // If chunker said tier A and the chunk carries a populated last_otto_verified
  // (typically copied from the source record's `lastVerified` date), keep A.
  // Otherwise demote to B. Otto will re-verify on the next pass.
  if (chunk.editorial_tier === "A" && chunk.last_otto_verified) return "A";
  return "B";
}

async function upsertChunk(chunk, embedding, textHash, metaHash) {
  const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?on_conflict=chunk_id`;
  const body = stripUnsupportedFields({
    ...REQUIRED_DEFAULTS,
    ...chunk,
    source_entity_type: safeSourceType(chunk),
    editorial_tier: safeTier(chunk),
    embedding: `[${embedding.join(",")}]`,
    embedding_source_hash: textHash,
    metadata_fingerprint: metaHash,
    approx_tokens: tokens(chunk.text),
    extracted_at: new Date().toISOString(),
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Upsert ${chunk.chunk_id} failed: ${res.status} ${await res.text()}`);
  }
}

async function upsertMetadataOnly(chunk, metaHash) {
  // Used when only metadata changed: avoid re-embedding, just update the row's
  // metadata fields and fingerprint. Embedding stays as-is. Skipped entirely
  // when the schema lacks metadata_fingerprint.
  if (!schema.hasMetadataFingerprint) {
    throw new Error("metadata-only upsert called but schema lacks metadata_fingerprint");
  }
  const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?on_conflict=chunk_id`;
  const { embedding, ...rest } = chunk;
  void embedding;
  const body = stripUnsupportedFields({
    ...REQUIRED_DEFAULTS,
    ...rest,
    source_entity_type: safeSourceType(rest),
    editorial_tier: safeTier(rest),
    metadata_fingerprint: metaHash,
    extracted_at: new Date().toISOString(),
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Metadata upsert ${chunk.chunk_id} failed: ${res.status} ${await res.text()}`);
  }
}

async function deleteChunk(chunk_id) {
  const url = `${SUPABASE_URL}/rest/v1/concierge_chunks?chunk_id=eq.${encodeURIComponent(chunk_id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
  });
  if (!res.ok) {
    throw new Error(`Delete ${chunk_id} failed: ${res.status} ${await res.text()}`);
  }
}

// ─── Source readers ───────────────────────────────────────────
async function readJsonDir(dir) {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json"));
  return Promise.all(
    files.map(async (f) => {
      const slug = basename(f, ".json");
      const data = JSON.parse(await readFile(join(dir, f), "utf8"));
      return { slug, data };
    })
  );
}

async function readMarkdownDir(dir) {
  const files = (await readdir(dir).catch(() => [])).filter((f) => /\.(md|mdx)$/.test(f));
  return Promise.all(
    files.map(async (f) => {
      const slug = basename(f).replace(/\.(md|mdx)$/, "");
      const raw = await readFile(join(dir, f), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      return { slug, meta, body };
    })
  );
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  const today = new Date();
  console.log("\n🌊  Concierge corpus refresh");
  console.log(`     Mode:        ${DRY ? "DRY RUN" : FORCE ? "FORCE re-embed" : "delta only"}${PRUNE ? " + PRUNE" : ""}`);
  console.log(`     Content dir: ${CONTENT_DIR}`);
  console.log(`     Embed model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMS} dims)\n`);

  const allChunks = [];
  const expiredEventIds = [];
  const counts = {
    venue: 0,
    article: 0,
    place: 0,
    itinerary: 0,
    experience: 0,
    event: 0,
    editorial_block: 0,
  };

  // 1. Venues
  const venues = await readJsonDir(join(CONTENT_DIR, "venues"));
  for (const { slug, data } of venues) {
    if (data.status && data.status !== "published") continue;
    const c = chunkVenue(data, slug);
    allChunks.push(...c);
    counts.venue += 1;
  }
  console.log(`  Venues:      ${venues.length} files`);

  // 2. Articles
  const articles = await readMarkdownDir(join(CONTENT_DIR, "articles"));
  for (const { slug, meta, body } of articles) {
    if (meta.status && meta.status !== "published") continue;
    const c = chunkArticle(meta, body, slug);
    allChunks.push(...c);
    counts.article += 1;
  }
  console.log(`  Articles:    ${articles.length} files`);

  // 3. Places
  const places = await readJsonDir(join(CONTENT_DIR, "places"));
  for (const { slug, data } of places) {
    if (data.status && data.status !== "published") continue;
    const c = chunkPlace(data, slug);
    allChunks.push(...c);
    counts.place += 1;
  }
  console.log(`  Places:      ${places.length} files`);

  // 4. Itineraries
  const itineraries = await readJsonDir(join(CONTENT_DIR, "itineraries"));
  for (const { slug, data } of itineraries) {
    if (data.status && data.status !== "published") continue;
    const c = chunkItinerary(data, slug);
    allChunks.push(...c);
    counts.itinerary += 1;
  }
  console.log(`  Itineraries: ${itineraries.length} files`);

  // 5. Experiences
  const experiences = await readJsonDir(join(CONTENT_DIR, "experiences"));
  for (const { slug, data } of experiences) {
    if (data.status && data.status !== "published") continue;
    const c = chunkExperience(data, slug);
    allChunks.push(...c);
    counts.experience += 1;
  }
  console.log(`  Experiences: ${experiences.length} files`);

  // 6. Events (auto-prunes expired)
  const events = await readJsonDir(join(CONTENT_DIR, "events"));
  for (const { slug, data } of events) {
    if (data.status && data.status !== "published") continue;
    const { chunks, expired } = chunkEvent(data, slug, today);
    if (expired) expiredEventIds.push(eventId(slug));
    else {
      allChunks.push(...chunks);
      counts.event += 1;
    }
  }
  console.log(`  Events:      ${events.length} files (${expiredEventIds.length} expired)`);

  // 7. Editorial blocks (optional collection — silent if missing)
  const editorialDir = join(CONTENT_DIR, "editorial_blocks");
  const editorialBlocks = await readMarkdownDir(editorialDir);
  for (const { slug, meta, body } of editorialBlocks) {
    if (meta.status && meta.status !== "published") continue;
    const c = chunkEditorialBlock(meta, body, slug);
    allChunks.push(...c);
    counts.editorial_block += 1;
  }
  console.log(`  Editorial:   ${editorialBlocks.length} files`);

  console.log(`\n  → ${allChunks.length} chunks built from source\n`);

  // ─── Probe schema, then diff against existing ─────────────────
  await detectSchema();
  const existing = await fetchExistingRows();
  console.log(`  ${existing.size} chunks currently in Supabase\n`);

  let added = 0;
  let updated = 0;
  let metaOnly = 0;
  let unchanged = 0;
  let errors = 0;
  const errorDetail = [];
  const addedIds = [];
  const updatedIds = [];
  const metaOnlyIds = [];

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const newTextHash = sha(chunk.text);
    const newMetaHash = metadataFingerprint(chunk);
    const ex = existing.get(chunk.chunk_id);

    if (!FORCE && ex && ex.text_hash === newTextHash && ex.meta_hash === newMetaHash) {
      unchanged++;
      continue;
    }

    const textChanged = !ex || ex.text_hash !== newTextHash;
    const metaChanged = !ex || ex.meta_hash !== newMetaHash;

    if (DRY) {
      const verb = !ex ? "WOULD add" : textChanged ? "WOULD re-embed" : "WOULD update meta-only";
      console.log(`  ${verb}: ${chunk.chunk_id} (${chunk.text.length} chars)`);
      if (!ex) {
        added++;
        addedIds.push(chunk.chunk_id);
      } else if (textChanged) {
        updated++;
        updatedIds.push(chunk.chunk_id);
      } else {
        metaOnly++;
        metaOnlyIds.push(chunk.chunk_id);
      }
      continue;
    }

    try {
      if (FORCE || textChanged) {
        const embedding = await embed(chunk.text);
        await upsertChunk(chunk, embedding, newTextHash, newMetaHash);
        if (!ex) {
          added++;
          addedIds.push(chunk.chunk_id);
          process.stdout.write(`  + ${chunk.chunk_id}\n`);
        } else {
          updated++;
          updatedIds.push(chunk.chunk_id);
          process.stdout.write(`  ~ ${chunk.chunk_id}\n`);
        }
      } else if (metaChanged) {
        await upsertMetadataOnly(chunk, newMetaHash);
        metaOnly++;
        metaOnlyIds.push(chunk.chunk_id);
        process.stdout.write(`  m ${chunk.chunk_id}\n`);
      }
    } catch (e) {
      errors++;
      errorDetail.push({ chunk_id: chunk.chunk_id, error: e.message });
      console.error(`  ✗ ${chunk.chunk_id}: ${e.message}`);
    }
  }

  // ─── Stale rows (in DB, not in source) ────────────────────────
  const newIds = new Set(allChunks.map((c) => c.chunk_id));
  const staleIds = [...existing.keys()].filter((id) => !newIds.has(id));

  // Categorise stale: expired events vs other
  const staleEvents = staleIds.filter((id) => existing.get(id)?.type === "event");
  const staleOther = staleIds.filter((id) => existing.get(id)?.type !== "event");

  // Decide what to prune
  let pruned = 0;
  const prunedIds = [];
  if (PRUNE && !DRY) {
    // Always prune expired events (script already excludes them from the rebuild set)
    for (const id of staleEvents) {
      try {
        await deleteChunk(id);
        pruned++;
        prunedIds.push(id);
        process.stdout.write(`  ⌫ ${id} (expired event)\n`);
      } catch (e) {
        errors++;
        errorDetail.push({ chunk_id: id, error: `prune: ${e.message}` });
      }
    }
    // Prune other stale rows older than STALE_GRACE_DAYS
    const graceCutoff = daysAgo(STALE_GRACE_DAYS);
    for (const id of staleOther) {
      const meta = existing.get(id);
      if (meta?.extracted_at && new Date(meta.extracted_at) < graceCutoff) {
        try {
          await deleteChunk(id);
          pruned++;
          prunedIds.push(id);
          process.stdout.write(`  ⌫ ${id} (stale > ${STALE_GRACE_DAYS}d)\n`);
        } catch (e) {
          errors++;
          errorDetail.push({ chunk_id: id, error: `prune: ${e.message}` });
        }
      }
    }
  } else if (PRUNE && DRY) {
    for (const id of staleEvents) console.log(`  WOULD prune (expired event): ${id}`);
    const graceCutoff = daysAgo(STALE_GRACE_DAYS);
    for (const id of staleOther) {
      const meta = existing.get(id);
      if (meta?.extracted_at && new Date(meta.extracted_at) < graceCutoff) {
        console.log(`  WOULD prune (stale): ${id}`);
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log(`  Done in ${elapsed}s`);
  console.log(`     +${added} added`);
  console.log(`     ~${updated} updated (re-embedded)`);
  console.log(`     m${metaOnly} metadata-only`);
  console.log(`     =${unchanged} unchanged`);
  console.log(`     ⌫${pruned} pruned`);
  console.log(`     ✗${errors} errors`);
  console.log(`     stale remaining: ${staleIds.length - prunedIds.length}`);
  console.log("");
  console.log(`  By collection (in source):`);
  for (const [k, v] of Object.entries(counts)) console.log(`     ${k.padEnd(16)} ${v}`);

  // ─── Report artefacts ─────────────────────────────────────────
  if (REPORT && !DRY) {
    await mkdir(REPORT_DIR, { recursive: true });
    const dateStr = today.toISOString().slice(0, 10);
    const trigger = process.env.GITHUB_EVENT_NAME || "manual";
    const sha7 = (process.env.GITHUB_SHA || "").slice(0, 7);

    // Embedding cost estimate (text-embedding-3-small priced at $0.02 / 1M tokens)
    const totalEmbedTokens = (added + updated) * 250; // rough avg per chunk
    const costEstimate = (totalEmbedTokens / 1_000_000) * 0.02;

    const json = {
      run_id: today.toISOString(),
      trigger,
      mode: FORCE ? "force" : DRY ? "dry" : "delta",
      prune_enabled: PRUNE,
      duration_seconds: Number(elapsed),
      git_sha: sha7,
      embedding_model: EMBEDDING_MODEL,
      embedding_dims: EMBEDDING_DIMS,
      source_counts: counts,
      database: {
        chunks_before: existing.size,
        chunks_after: existing.size + added - prunedIds.length,
      },
      delta: {
        added,
        updated,
        metadata_only: metaOnly,
        unchanged,
        pruned,
        errors,
        stale_remaining: staleIds.length - prunedIds.length,
      },
      added_chunk_ids: addedIds,
      updated_chunk_ids: updatedIds,
      metadata_only_chunk_ids: metaOnlyIds,
      pruned_chunk_ids: prunedIds,
      stale_chunk_ids: staleIds.filter((id) => !prunedIds.includes(id)),
      expired_event_entity_ids: expiredEventIds,
      embedding_cost_usd_estimate: Number(costEstimate.toFixed(4)),
      errors: errorDetail,
    };
    const jsonPath = join(REPORT_DIR, `${dateStr}.json`);
    await writeFile(jsonPath, JSON.stringify(json, null, 2));

    const md = [
      `# Concierge corpus refresh, ${dateStr}`,
      ``,
      `**Trigger:** ${trigger}  `,
      `**Mode:** ${json.mode}${PRUNE ? " + prune" : ""}  `,
      `**Duration:** ${elapsed}s  `,
      `**Git SHA:** ${sha7 || "(local)"}  `,
      `**Result:** +${added} added, ~${updated} updated, m${metaOnly} meta-only, ⌫${pruned} pruned, ✗${errors} errors`,
      ``,
      `## Source counts`,
      `| Collection | Files |`,
      `|---|---:|`,
      ...Object.entries(counts).map(([k, v]) => `| ${k} | ${v} |`),
      ``,
      `## Database`,
      `- Before: ${existing.size}`,
      `- After:  ${existing.size + added - prunedIds.length}`,
      `- Stale remaining: ${staleIds.length - prunedIds.length}`,
      ``,
      `## Estimated embedding cost`,
      `~$${costEstimate.toFixed(4)} USD`,
      ``,
      addedIds.length > 0 ? `## Added (${addedIds.length})\n${addedIds.map((id) => `- ${id}`).join("\n")}\n` : "",
      updatedIds.length > 0 ? `## Re-embedded (${updatedIds.length})\n${updatedIds.map((id) => `- ${id}`).join("\n")}\n` : "",
      metaOnlyIds.length > 0 ? `## Metadata-only updates (${metaOnlyIds.length})\n${metaOnlyIds.map((id) => `- ${id}`).join("\n")}\n` : "",
      prunedIds.length > 0 ? `## Pruned (${prunedIds.length})\n${prunedIds.map((id) => `- ${id}`).join("\n")}\n` : "",
      errorDetail.length > 0 ? `## Errors\n${errorDetail.map((e) => `- ${e.chunk_id}: ${e.error}`).join("\n")}\n` : "",
    ].filter(Boolean).join("\n");
    const mdPath = join(REPORT_DIR, `${dateStr}.md`);
    await writeFile(mdPath, md);

    console.log(`\n  Report written:`);
    console.log(`     ${jsonPath}`);
    console.log(`     ${mdPath}`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
