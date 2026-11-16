import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * pi-draw-enter — records a prize-draw entry for "Where in the Peninsula is PI?"
 *
 * Flow: validate → (optional Turnstile) → verify the game room really reached
 * `found` (read-only route on play.peninsulainsider.com.au) → write the entry to
 * pi.draw_entries (the legal ledger, service role) → best-effort upsert of the
 * subscriber in Beehiiv with game custom fields (the marketing list).
 *
 * Secrets used: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (injected),
 * BEEHIIV_API_KEY (already set for pi-newsletter-subscribe),
 * TURNSTILE_SECRET (optional; when set, a token is required), DRAW_SALT (optional).
 */

const DRAW = {
  period: "2026-10",
  // 11:59pm AEDT, Sunday 11 October 2026.
  closesAt: Date.parse("2026-10-11T12:59:59Z"),
  partner: "Doot Doot Doot, Jackalope",
  prize: "$250 to dine",
};

const GAME_ORIGIN = "https://play.peninsulainsider.com.au";
const BEEHIIV_PUB_ID = "pub_91e9b723-53c4-456e-a857-9faa2d61864b";
const BEEHIIV = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}`;
const ALLOWED_ORIGINS = [GAME_ORIGIN, "https://peninsulainsider.com.au", "https://www.peninsulainsider.com.au"];
const CUSTOM_FIELDS = ["pi_player", "pi_entries", "pi_last_case", "pi_best_rank", "pi_period"];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Supabase (PostgREST, service role, schema pi) ───────────────────────────

function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Accept-Profile": "pi",
    "Content-Profile": "pi",
  };
  if (init.prefer) headers["Prefer"] = init.prefer;
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers });
}

// ── Beehiiv (best effort; the ledger row is the source of truth) ────────────

let fieldsEnsured = false;

async function ensureCustomFields(apiKey: string) {
  if (fieldsEnsured) return;
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const res = await fetch(`${BEEHIIV}/custom_fields?limit=100`, { headers });
  if (!res.ok) throw new Error(`custom_fields list ${res.status}`);
  const existing = new Set(((await res.json()).data ?? []).map((f: { display: string }) => f.display));
  for (const name of CUSTOM_FIELDS) {
    if (existing.has(name)) continue;
    const c = await fetch(`${BEEHIIV}/custom_fields`, {
      method: "POST",
      headers,
      body: JSON.stringify({ kind: "string", display: name }),
    });
    if (!c.ok) console.warn(`custom field ${name}: ${c.status} ${await c.text()}`);
  }
  fieldsEnsured = true;
}

async function upsertBeehiiv(
  apiKey: string,
  email: string,
  fields: Record<string, string>,
): Promise<string | null> {
  await ensureCustomFields(apiKey);
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const custom_fields = Object.entries(fields).map(([name, value]) => ({ name, value }));
  const created = await fetch(`${BEEHIIV}/subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      reactivate_existing: false,
      send_welcome_email: true,
      utm_source: "play.peninsulainsider.com.au",
      utm_medium: "game",
      utm_campaign: `where-is-pi-draw-${DRAW.period}`,
      referring_site: GAME_ORIGIN,
      custom_fields,
    }),
  });
  if (!created.ok) throw new Error(`subscription create ${created.status} ${await created.text()}`);
  const id: string | undefined = (await created.json()).data?.id;
  if (!id) return null;
  // Existing subscribers keep their record; make sure the game fields land either way.
  const patched = await fetch(`${BEEHIIV}/subscriptions/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ custom_fields }),
  });
  if (!patched.ok) console.warn(`subscription patch ${patched.status} ${await patched.text()}`);
  // Tags are plan-dependent on Beehiiv; try, never fail the entry on it.
  const tagged = await fetch(`${BEEHIIV}/subscriptions/${id}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags: ["where-is-pi"] }),
  });
  if (!tagged.ok) console.warn(`subscription tags ${tagged.status}`);
  return id;
}

// ── handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400, origin);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  const room = String(body.room ?? "").trim();
  const home = body.home === "local" || body.home === "visitor" ? String(body.home) : null;
  const consent = body.consent === true;
  const turnstile = typeof body.turnstile === "string" ? body.turnstile : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, message: "Please enter a valid email address." }, 400, origin);
  if (!name) return json({ ok: false, message: "Please tell us your first name." }, 400, origin);
  if (!consent) return json({ ok: false, message: "Tick the box to enter the draw." }, 400, origin);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(room)) return json({ ok: false, message: "That game could not be found." }, 400, origin);
  if (Date.now() > DRAW.closesAt) return json({ ok: false, message: "This draw window has closed." }, 410, origin);

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (turnstileSecret) {
    if (!turnstile) return json({ ok: false, message: "Please complete the check and try again." }, 400, origin);
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: turnstileSecret, response: turnstile, remoteip: req.headers.get("cf-connecting-ip") ?? undefined }),
    });
    const vj = await v.json().catch(() => ({ success: false }));
    if (!vj.success) return json({ ok: false, message: "Please complete the check and try again." }, 400, origin);
  }

  // Only a room that really reached `found` can enter.
  let result: { status?: string; caseId?: string | null; rank?: string | null; minutesLeft?: number | null; seats?: number; route?: string[] };
  try {
    const r = await fetch(`${GAME_ORIGIN}/api/rooms/${room}/result`, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`room ${r.status}`);
    result = await r.json();
  } catch (err) {
    console.error("room verify failed:", err);
    return json({ ok: false, message: "We could not confirm your game. Try again in a moment." }, 502, origin);
  }
  if (result.status !== "found" || !result.caseId) return json({ ok: false, message: "Find PI first, then come back for the draw." }, 403, origin);

  const seats = Math.max(1, Number(result.seats ?? 1));
  const party = seats >= 2;
  const entries = party ? 2 : 1;
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? (await sha256((Deno.env.get("DRAW_SALT") ?? "pi") + ip)).slice(0, 32) : null;
  const now = new Date().toISOString();

  // Ledger row. Duplicates (same period + case + email) are ignored, not errors.
  let already = false;
  try {
    const ins = await rest("draw_entries?on_conflict=period,case_id,email", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify([{
        period: DRAW.period,
        case_id: String(result.caseId),
        room_id: room,
        email,
        first_name: name,
        home,
        rank: result.rank ?? null,
        minutes_left: typeof result.minutesLeft === "number" ? result.minutesLeft : null,
        seats,
        bonus: { party },
        entries,
        consent_marketing: true,
        consent_at: now,
        source: String(body.source ?? "where-is-pi"),
        ip_hash: ipHash,
        user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200),
      }]),
    });
    if (!ins.ok) throw new Error(`insert ${ins.status} ${await ins.text()}`);
    const rows = await ins.json();
    already = !Array.isArray(rows) || rows.length === 0;
  } catch (err) {
    console.error("ledger write failed:", err);
    return json({ ok: false, message: "We could not record your entry. Try again in a moment." }, 502, origin);
  }

  // Total entries this window for this email.
  let total = entries;
  try {
    const q = await rest(`draw_entries?select=entries&period=eq.${DRAW.period}&email=eq.${encodeURIComponent(email)}`);
    if (q.ok) {
      const rows: { entries: number }[] = await q.json();
      total = rows.reduce((n, r) => n + (r.entries ?? 0), 0) || entries;
    }
  } catch (err) {
    console.warn("entry count failed:", err);
  }

  // Marketing list (never blocks the entry).
  const apiKey = Deno.env.get("BEEHIIV_API_KEY");
  if (apiKey) {
    try {
      const id = await upsertBeehiiv(apiKey, email, {
        pi_player: "yes",
        pi_entries: String(total),
        pi_last_case: String(result.caseId),
        pi_best_rank: String(result.rank ?? ""),
        pi_period: DRAW.period,
      });
      if (id) {
        await rest(`draw_entries?period=eq.${DRAW.period}&case_id=eq.${encodeURIComponent(String(result.caseId))}&email=eq.${encodeURIComponent(email)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ beehiiv_subscription_id: id }),
        });
      }
    } catch (err) {
      console.error("beehiiv upsert failed:", err);
    }
  } else {
    console.warn("BEEHIIV_API_KEY not set; entry recorded without list sync");
  }

  return json({
    ok: true,
    already,
    entries: total,
    period: DRAW.period,
    message: already ? "This case is already entered for that email." : "You are in.",
  }, 200, origin);
});
