/**
 * Edge Function: stripe-webhook
 *
 * Phase 6 WS6A. Receives Stripe webhook events and mirrors the
 * resulting state into pi.pass_subscriptions + pi.profiles.
 *
 * Subscribe these events in Stripe Dashboard → Developers → Webhooks:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *   (--no-verify-jwt is required because Stripe doesn't send a
 *    Supabase JWT; we verify the webhook signature instead.)
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 */

// @ts-ignore — Deno standard library
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore — esm.sh
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
// @ts-ignore — esm.sh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

const STRIPE_SECRET_KEY        = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET    = Deno.env.get('STRIPE_WEBHOOK_SECRET');
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

function tierFromPriceId(priceId: string): 'insider' | 'founders' {
  // Resolve via env vars: PUBLIC_STRIPE_PRICE_INSIDER_* vs FOUNDERS.
  // We match by id rather than price metadata so the function doesn't
  // need to fetch the price object on every event.
  const insiderMonthly = Deno.env.get('PRICE_INSIDER_MONTHLY');
  const insiderAnnual  = Deno.env.get('PRICE_INSIDER_ANNUAL');
  const founders       = Deno.env.get('PRICE_FOUNDERS');
  if (priceId === founders) return 'founders';
  if (priceId === insiderMonthly || priceId === insiderAnnual) return 'insider';
  // Default fallback — assume Insider; editor can correct in Studio if
  // a new price id is added without updating these env vars.
  return 'insider';
}

async function syncSubscription(stripeSubscriptionId: string) {
  if (!stripe || !admin) return;

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['items.data.price'],
  });

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // Resolve the user_id by stripe_customer_id on pi.profiles. If the
  // profile doesn't have one yet (first subscription), look up by
  // customer email and patch the profile.
  let userId: string | null = null;
  {
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (existing?.id) userId = existing.id as string;
  }
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && customer.email) {
      const { data: byEmail } = await admin
        .from('profiles')
        .select('id')
        .eq('id', (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data?.users?.find?.((u: any) => u.email === customer.email)?.id ?? '___')
        .maybeSingle();
      // Simpler reliable path: look up auth user directly.
      const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = authUsers?.users?.find((u: any) => u.email === customer.email);
      if (match) {
        userId = match.id;
        await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
      }
    }
  }
  if (!userId) {
    console.warn('[stripe-webhook] could not resolve user_id for customer', customerId);
    return;
  }

  const item = sub.items?.data?.[0];
  const price = item?.price;
  const priceId = price?.id ?? '';
  const tier = tierFromPriceId(priceId);
  const interval = price?.recurring?.interval === 'year' ? 'year' : (price?.recurring?.interval === 'month' ? 'month' : null);

  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

  await admin.from('pass_subscriptions').upsert(
    {
      stripe_subscription_id: sub.id,
      user_id: userId,
      stripe_customer_id: customerId,
      tier,
      billing_interval: interval,
      status: sub.status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      stripe_price_id: priceId,
    },
    { onConflict: 'stripe_subscription_id' },
  );

  // Mirror onto pi.profiles.
  const isMember = ['active', 'trialing', 'past_due'].includes(sub.status);
  await admin
    .from('profiles')
    .update({
      is_member: isMember,
      pass_tier: tier,
      pass_active_until: periodEnd,
      stripe_customer_id: customerId,
    })
    .eq('id', userId);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method-not-allowed', { status: 405 });
  }
  if (!stripe || !admin) {
    return new Response('stripe-or-admin-not-configured', { status: 500 });
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response('missing-webhook-secret', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed:', (err as Error).message);
    return new Response('invalid-signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          await syncSubscription(String(session.subscription));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const sub = event.data.object;
        const subId = sub.subscription || sub.id;
        if (subId) await syncSubscription(String(subId));
        break;
      }
      default:
        // Ignore other event types.
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return new Response('handler-error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
