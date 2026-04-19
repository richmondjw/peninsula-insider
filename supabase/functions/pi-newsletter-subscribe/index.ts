import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BEEHIIV_PUB_ID = "pub_91e9b723-53c4-456e-a857-9faa2d61864b";
const BEEHIIV_API_URL = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`;

const ALLOWED_ORIGINS = [
  "https://peninsulainsider.com.au",
  "https://www.peninsulainsider.com.au",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed." }, 405, origin);
  }

  let email: string;
  let source: string;

  try {
    const body = await req.json();
    email = (body.email ?? "").toString().trim().toLowerCase();
    source = (body.source ?? "website").toString();
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400, origin);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: "Please enter a valid email address." }, 400, origin);
  }

  const apiKey = Deno.env.get("BEEHIIV_API_KEY");
  if (!apiKey) {
    console.error("BEEHIIV_API_KEY secret not set");
    return json(
      { ok: false, message: "Subscribe is temporarily unavailable. Please try again later." },
      503,
      origin,
    );
  }

  try {
    const beehiivRes = await fetch(BEEHIIV_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "peninsulainsider.com.au",
        utm_medium: "website",
        utm_campaign: source,
      }),
    });

    if (!beehiivRes.ok) {
      const errText = await beehiivRes.text();
      console.error(`Beehiiv ${beehiivRes.status}:`, errText);
      return json(
        { ok: false, message: "We couldn't subscribe you right now. Please try again in a moment." },
        502,
        origin,
      );
    }

    return json(
      { ok: true, message: "You\u2019re in. Wednesday\u2019s dispatch is on its way." },
      200,
      origin,
    );
  } catch (err) {
    console.error("Subscribe error:", err);
    return json(
      { ok: false, message: "We couldn't subscribe you right now. Please try again in a moment." },
      502,
      origin,
    );
  }
});
