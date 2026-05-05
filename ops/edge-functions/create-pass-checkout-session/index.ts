/**
 * Edge Function: create-pass-checkout-session
 *
 * Phase 6 WS6A. Creates a Stripe Checkout Session for the Pass and
 * returns its hosted-checkout URL. Called by /pass/ when a user clicks
 * Become an Insider / Join the Founders' Circle.
 *
 * Deploy:
 *   supabase functions deploy create-pass-checkout-session
 *
 * Required secrets (set via supabase secrets set):
 *   STRIPE_SECRET_KEY
 *
 * The function runs in Deno. The Stripe SDK we use here is the
 * Deno-native build available on esm.sh.
 */

// @ts-ignore — Deno standard library import
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore — esm.sh-resolved npm package
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

if (!STRIPE_SECRET_KEY) {
  console.warn('[create-pass-checkout-session] STRIPE_SECRET_KEY not set');
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-09-30.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method-not-allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (!stripe) {
    return new Response(JSON.stringify({ error: 'stripe-not-configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid-json' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const priceId    = String(body?.price_id ?? '');
  const successUrl = String(body?.success_url ?? '');
  const cancelUrl  = String(body?.cancel_url  ?? '');
  const userEmail  = body?.user_email ? String(body.user_email) : undefined;

  if (!priceId || !successUrl || !cancelUrl) {
    return new Response(JSON.stringify({ error: 'missing-fields' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      customer_email: userEmail,
      // Metadata flows through to the webhook so we can map session →
      // user when the checkout completes.
      metadata: userEmail ? { user_email: userEmail } : {},
      // Allow promotion codes by default; can be tightened per-tier.
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[create-pass-checkout-session] error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
