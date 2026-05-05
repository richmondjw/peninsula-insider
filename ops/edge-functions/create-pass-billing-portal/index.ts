/**
 * Edge Function: create-pass-billing-portal
 *
 * Phase 6 WS6A. Creates a Stripe Billing Portal session for the
 * signed-in user and returns its URL. Called by /account/pass/
 * when the user clicks "Manage billing in Stripe".
 *
 * Looks up the user's stripe_customer_id from pi.profiles via the
 * service-role key (bypasses RLS), then creates the portal session.
 *
 * Deploy:
 *   supabase functions deploy create-pass-billing-portal
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY
 */

// @ts-ignore — Deno standard library
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore — esm.sh
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
// @ts-ignore — esm.sh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

const STRIPE_SECRET_KEY        = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-09-30.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const admin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, db: { schema: 'pi' } })
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
  if (!stripe || !admin) {
    return new Response(JSON.stringify({ error: 'stripe-or-admin-not-configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Identify the calling user via the Authorization JWT.
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'missing-auth' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  const userClient = createClient(SUPABASE_URL!, auth.slice(7), {
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'invalid-auth' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  const userId = userData.user.id;

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: 'no-stripe-customer' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${new URL(req.url).origin.replace(/\.supabase\.co.*$/, '.supabase.co')}` // unused; user is on PI
        || 'https://peninsulainsider.com.au/account/pass/',
    });
    // Manually default the return URL since the URL above is the Edge
    // Function's URL, not the front-end. This is a small ergonomic
    // fix — Stripe accepts any return URL on the Customer Portal.
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: 'https://peninsulainsider.com.au/account/pass/',
    });
    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[create-pass-billing-portal] error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
