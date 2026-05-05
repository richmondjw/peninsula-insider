# Peninsula Insider — Supabase Edge Functions

Server-side endpoints invoked by the static site. Each subdirectory is a Deno-based Supabase Edge Function.

## Deployment

These functions are NOT auto-deployed by the GitHub Pages workflow — they live in the Supabase project and need to be pushed via the Supabase CLI:

```bash
# One-time: link this repo to the Supabase project
supabase link --project-ref tjjhpvslpysfklwpqmgz

# Deploy a single function
supabase functions deploy create-pass-checkout-session

# Deploy all functions in this directory
for fn in create-pass-checkout-session create-pass-billing-portal stripe-webhook; do
  supabase functions deploy "$fn"
done
```

## Required environment variables (set in Supabase Studio → Functions → Secrets)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_*` or `sk_test_*`. The Stripe secret key. NEVER expose to the client. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_*`. Used by `stripe-webhook` to verify incoming events. |
| `SUPABASE_URL` | Already auto-provided by Supabase to all Edge Functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Already auto-provided. Used by `stripe-webhook` to upsert into `pi.pass_subscriptions` (bypasses RLS). |

## Functions

### `create-pass-checkout-session`

Called by `/pass/` when a user clicks Become an Insider / Join the Founders' Circle.

**Request:**
```json
{
  "price_id": "price_…",
  "success_url": "https://peninsulainsider.com.au/account/pass/?welcome=1",
  "cancel_url":  "https://peninsulainsider.com.au/pass/?cancelled=1",
  "user_email":  "user@example.com"  // optional
}
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/c/…" }
```

### `create-pass-billing-portal`

Called by `/account/pass/` when the user clicks Manage billing in Stripe.

Looks up the user's `stripe_customer_id` from `pi.profiles`, creates a Stripe Billing Portal session, and returns its URL.

**Request:** empty (the Supabase JWT in the Authorization header identifies the user).

**Response:**
```json
{ "url": "https://billing.stripe.com/p/session/…" }
```

### `stripe-webhook`

Receives Stripe webhook events (`checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, etc.) and mirrors the resulting state into `pi.pass_subscriptions` + `pi.profiles.is_member` / `pass_tier` / `pass_active_until`.

**Webhook endpoint URL** (configure in Stripe Dashboard → Developers → Webhooks):
```
https://tjjhpvslpysfklwpqmgz.supabase.co/functions/v1/stripe-webhook
```

**Events to subscribe to:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded` (extends `pass_active_until`)
- `invoice.payment_failed` (sets status to `past_due`)

## Build-time env vars (in addition to function-side secrets)

The static site needs these GitHub Variables (or Secrets) so the bundle knows about Stripe at all:

| Variable | Notes |
|---|---|
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_*` or `pk_test_*`. Safe to ship in the static bundle. |
| `PUBLIC_STRIPE_PRICE_INSIDER_MONTHLY` | The Stripe price id for monthly Insider. |
| `PUBLIC_STRIPE_PRICE_INSIDER_ANNUAL` | The Stripe price id for annual Insider. |
| `PUBLIC_STRIPE_PRICE_FOUNDERS` | The Stripe price id for Founders. |

Without these, `/pass/` falls back to the waitlist email-capture flow. With them, `/pass/` flips to live commerce. No code change needed.
