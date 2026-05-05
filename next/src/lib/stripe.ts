/**
 * Stripe Checkout helpers — Phase 6 WS6A.
 *
 * Front-end side of the Pass tier purchase flow. Calls the
 * `create-checkout-session` Supabase Edge Function (deployed via
 * supabase functions deploy from ops/edge-functions/) which runs with
 * the Stripe secret key server-side and returns a Checkout session URL.
 *
 * GRACEFUL DEGRADATION
 * Until both the Stripe account is set up and the Edge Function is
 * deployed, `isStripeEnabled()` returns false and the Pass landing
 * keeps showing the waitlist email-capture forms. One env var flip
 * (PUBLIC_STRIPE_PUBLISHABLE_KEY) and one Edge Function deploy turns
 * the page from waitlist to live commerce without code changes.
 *
 * SECURITY NOTE
 * The publishable key is safe to ship in the static bundle. The
 * secret key (sk_*) MUST stay in the Edge Function environment;
 * never put it in any PUBLIC_* env var.
 */

const SUPABASE_URL =
  (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ||
  'https://tjjhpvslpysfklwpqmgz.supabase.co';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY as string | undefined;

/** Per-tier price IDs. Set as build-time env vars; can be plain text since
 *  Stripe price IDs are not secrets. Adding monthly + annual variants per
 *  locked decision Q1. */
const PRICES = {
  insider_monthly: import.meta.env.PUBLIC_STRIPE_PRICE_INSIDER_MONTHLY as string | undefined,
  insider_annual:  import.meta.env.PUBLIC_STRIPE_PRICE_INSIDER_ANNUAL  as string | undefined,
  founders:        import.meta.env.PUBLIC_STRIPE_PRICE_FOUNDERS        as string | undefined,
};

export type PassTier = 'insider' | 'founders';
export type BillingInterval = 'month' | 'year';

/**
 * True iff Stripe Checkout is wired end-to-end:
 *   - publishable key present (build picked it up)
 *   - at least one price ID configured (so we have something to buy)
 *
 * The Edge Function deployment is checked at call-time (a 404 on the
 * function endpoint surfaces in the user-facing error message).
 */
export function isStripeEnabled(): boolean {
  return Boolean(
    STRIPE_PUBLISHABLE_KEY
    && (PRICES.insider_monthly || PRICES.insider_annual || PRICES.founders)
  );
}

/**
 * Resolve the price ID for a tier + interval combination. Returns
 * undefined if not configured — caller should fall back to the
 * waitlist UI. */
export function priceIdFor(tier: PassTier, interval: BillingInterval = 'month'): string | undefined {
  if (tier === 'insider' && interval === 'month') return PRICES.insider_monthly;
  if (tier === 'insider' && interval === 'year')  return PRICES.insider_annual;
  if (tier === 'founders')                          return PRICES.founders;
  return undefined;
}

/**
 * Kick off Checkout for a tier. POSTs to the Supabase Edge Function
 * with the price ID + the current user's email (when signed in) +
 * success/cancel return URLs. The function creates a Checkout Session
 * in Stripe and returns its URL; we redirect the browser there.
 *
 * The function path:
 *   POST {SUPABASE_URL}/functions/v1/create-pass-checkout-session
 *   body: { price_id, success_url, cancel_url, user_email? }
 *   returns: { url }
 */
export async function startPassCheckout(opts: {
  tier: PassTier;
  interval?: BillingInterval;
  userEmail?: string;
  /** Where Stripe sends the user back on success. Default: /account/pass/?welcome=1. */
  successUrl?: string;
  /** Where Stripe sends the user back if they bail. Default: /pass/?cancelled=1. */
  cancelUrl?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isStripeEnabled()) {
    return { ok: false, error: 'stripe-not-configured' };
  }
  const priceId = priceIdFor(opts.tier, opts.interval);
  if (!priceId) {
    return { ok: false, error: 'price-not-configured' };
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://peninsulainsider.com.au';
  const successUrl = opts.successUrl ?? `${origin}/account/pass/?welcome=1`;
  const cancelUrl  = opts.cancelUrl  ?? `${origin}/pass/?cancelled=1`;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-pass-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        user_email: opts.userEmail,
      }),
    });
    if (!res.ok) {
      // Most likely cause: function not deployed (404) or the request
      // failed validation. Surface a stable error string the UI maps to
      // a friendly message.
      if (res.status === 404) return { ok: false, error: 'function-not-deployed' };
      const txt = await res.text().catch(() => '');
      return { ok: false, error: txt || `http-${res.status}` };
    }
    const json = await res.json();
    if (!json || typeof json.url !== 'string') {
      return { ok: false, error: 'invalid-response' };
    }
    return { ok: true, url: json.url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * URL of the Stripe Customer Portal where members manage billing,
 * cancel, change card, etc. Backed by another Edge Function (which
 * calls billingPortal.sessions.create with the user's customer id).
 *
 * We don't expose the URL directly because it requires the Stripe
 * customer id, which lives in pi.profiles.stripe_customer_id and
 * needs an authenticated lookup the front-end can't do safely.
 */
export async function getBillingPortalUrl(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isStripeEnabled()) return { ok: false, error: 'stripe-not-configured' };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-pass-billing-portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      if (res.status === 404) return { ok: false, error: 'function-not-deployed' };
      const txt = await res.text().catch(() => '');
      return { ok: false, error: txt || `http-${res.status}` };
    }
    const json = await res.json();
    if (!json || typeof json.url !== 'string') return { ok: false, error: 'invalid-response' };
    return { ok: true, url: json.url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
