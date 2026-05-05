-- Migration: Pass membership columns + Stripe state tracking (Phase 6 WS6A)
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: extend pi.profiles with membership state + add a small
-- pi.pass_subscriptions table that mirrors the Stripe subscription
-- record for fast lookups (Stripe webhook → Edge Function → upserts
-- here on subscription.created/updated/deleted events).
--
-- Member-only content gating reads pi.profiles.is_member +
-- pass_active_until; the Pass dashboard at /account/pass/ reads from
-- pi.pass_subscriptions for billing-portal links + renewal date.
--
-- Idempotent.

-- ─── pi.profiles extensions ────────────────────────────────────────────────

alter table pi.profiles
  add column if not exists is_member         boolean      not null default false,
  add column if not exists pass_tier         text         check (pass_tier in ('insider', 'founders')),
  add column if not exists pass_active_until timestamptz,
  add column if not exists stripe_customer_id text;

create index if not exists profiles_is_member on pi.profiles (is_member) where is_member = true;

-- ─── pi.pass_subscriptions ─────────────────────────────────────────────────

create table if not exists pi.pass_subscriptions (
  -- Stripe subscription id is the natural primary key (sub_*).
  stripe_subscription_id text primary key,
  user_id                uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id     text not null,
  tier                   text not null check (tier in ('insider', 'founders')),
  billing_interval       text check (billing_interval in ('month', 'year')),
  -- Stripe-side status: trialing / active / past_due / canceled / etc.
  status                 text not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  -- Convenience snapshot of the price-id that drove this subscription.
  stripe_price_id        text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table pi.pass_subscriptions is 'Phase 6 WS6A: cached mirror of Stripe subscription rows. Source of truth is Stripe; this is the read-side cache populated by the webhook.';

create index if not exists pass_subscriptions_by_user on pi.pass_subscriptions (user_id, current_period_end desc);
create index if not exists pass_subscriptions_by_status on pi.pass_subscriptions (status);

alter table pi.pass_subscriptions enable row level security;

-- Signed-in users read their own subscription rows.
drop policy if exists "pass_subscriptions_select_own" on pi.pass_subscriptions;
create policy "pass_subscriptions_select_own"
  on pi.pass_subscriptions for select using (user_id = auth.uid());

-- Editor full access for admin / billing-issue lookups.
drop policy if exists "pass_subscriptions_editor_all" on pi.pass_subscriptions;
create policy "pass_subscriptions_editor_all"
  on pi.pass_subscriptions for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- Webhook writes via the service-role key, which bypasses RLS — no
-- policy needed for the Edge Function.

-- updated_at trigger
create or replace function pi.pass_subscriptions_set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists pass_subscriptions_set_updated_at on pi.pass_subscriptions;
create trigger pass_subscriptions_set_updated_at
  before update on pi.pass_subscriptions
  for each row execute function pi.pass_subscriptions_set_updated_at();

-- ─── Helper: is_active_member(uuid) ────────────────────────────────────────
-- Convenience function for content-gating queries from the front-end.
-- Returns true iff the user has is_member=true and either no expiry
-- (founders lifetime) or pass_active_until is in the future.

create or replace function pi.is_active_member(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select p.is_member
        and (p.pass_active_until is null or p.pass_active_until > now())
      from pi.profiles p where p.id = p_user_id
    ),
    false
  );
$$;

grant execute on function pi.is_active_member(uuid) to anon, authenticated, service_role;
