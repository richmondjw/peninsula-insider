-- Migration: venue claims (Phase 6 WS6B)
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: link a signed-in operator (auth.users.id) to a venue slug
-- with editor-approved status. Lets the operator dashboard at
-- /partners/dashboard/ show their venues and the change-request
-- history scoped to those.
--
-- v1: anonymous insert allowed (the claim form is the entry point);
-- editor approves manually in Studio. v1.x: automated email-domain
-- match against the venue's official website.
--
-- Idempotent.

create table if not exists pi.venue_claims (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  venue_slug      text not null,
  venue_name      text,
  -- The operator's stated relationship to the venue.
  operator_role   text,
  -- Free-text proof of association (URL, role description, contact
  -- the editor can verify by phone, etc.). Editor reads this when
  -- approving.
  proof           text,
  status          text not null default 'pending' check (status in (
    'pending', 'approved', 'revoked'
  )),
  editor_notes    text,
  decision_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Composite uniqueness: a user can only have one active claim per
  -- venue. We allow re-submission after a revoked claim by setting
  -- status back to 'pending'; the unique constraint catches duplicates.
  unique (user_id, venue_slug)
);

comment on table pi.venue_claims is 'Phase 6 WS6B: links an operator (auth.users) to a venue slug. Editor approves in Studio.';

create index if not exists venue_claims_by_user
  on pi.venue_claims (user_id, created_at desc);
create index if not exists venue_claims_by_venue
  on pi.venue_claims (venue_slug);
create index if not exists venue_claims_by_status
  on pi.venue_claims (status, created_at desc);

alter table pi.venue_claims enable row level security;

-- Signed-in users can insert claims for themselves.
drop policy if exists "venue_claims_insert_own" on pi.venue_claims;
create policy "venue_claims_insert_own"
  on pi.venue_claims for insert
  with check (user_id = auth.uid());

-- Signed-in users can read their own claims (any status).
drop policy if exists "venue_claims_select_own" on pi.venue_claims;
create policy "venue_claims_select_own"
  on pi.venue_claims for select
  using (user_id = auth.uid());

-- Signed-in users can withdraw their own claims by setting status to
-- 'revoked'. Editor still has full access.
drop policy if exists "venue_claims_update_own" on pi.venue_claims;
create policy "venue_claims_update_own"
  on pi.venue_claims for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Editor full access via pi.profiles.is_editor.
drop policy if exists "venue_claims_editor_all" on pi.venue_claims;
create policy "venue_claims_editor_all"
  on pi.venue_claims for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- updated_at trigger
create or replace function pi.venue_claims_set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists venue_claims_set_updated_at on pi.venue_claims;
create trigger venue_claims_set_updated_at
  before update on pi.venue_claims
  for each row execute function pi.venue_claims_set_updated_at();
