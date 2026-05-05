-- Migration: venue change requests (Phase 5 WS5C)
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: operator-submitted change requests against the published
-- editorial corpus. Operators (no auth required for v1) submit a
-- structured request via /partners/update/. Editor reviews in Studio
-- and applies the change manually to the relevant content JSON in
-- next/src/content/venues/.
--
-- v1 covers: hours updates, photo updates (URL paste only — file
-- uploads land in v1.x once Pass auth is live), closure flags, and
-- proposed events. Each request lands as one row.
--
-- Idempotent.

create table if not exists pi.venue_change_requests (
  id              uuid primary key default gen_random_uuid(),
  -- Optional auth.users reference. Anonymous requests allowed for v1
  -- (most operators won't have site accounts yet); auth gating turns
  -- on when the Pass tier ships.
  user_id         uuid references auth.users(id) on delete set null,

  -- Which venue the request is about. Operators autocomplete from the
  -- live venues collection on the form, so we expect a real slug here.
  -- We store as text rather than a foreign key because the venues
  -- collection is JSON-on-disk, not a Supabase table.
  venue_slug      text not null,
  venue_name      text,                   -- denormalised for editor convenience

  -- Change taxonomy. Drives the editor's review queue ordering and
  -- which fields to apply.
  change_type     text not null check (change_type in (
    'hours',          -- hours / opening times update
    'photo',          -- replace hero photo (URL)
    'closure',        -- venue is closed permanently / temporarily
    'event',          -- proposed event for the venue
    'correction',     -- factual correction to an existing field
    'other'
  )),
  -- Free-form payload describing the change. Editor uses this verbatim
  -- when applying to JSON. We could go schema-per-type later but a
  -- single text field is simpler for v1 and the volume is low.
  proposed_change text not null,

  -- Optional supporting URL — a photo on Drive, a website, an event
  -- listing, etc.
  reference_url   text,

  -- Operator metadata
  operator_name   text not null,
  operator_email  text not null,
  operator_role   text,                   -- 'owner', 'manager', 'gm', etc.

  -- Editorial state
  status          text not null default 'pending' check (status in (
    'pending', 'in-review', 'applied', 'declined'
  )),
  editor_notes    text,
  decision_at     timestamptz,

  -- Audit
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  client_token    text                    -- light spam dedupe; not auth-secured
);

comment on table pi.venue_change_requests is 'Operator-submitted change requests against the venue corpus. Phase 5 WS5C.';

create index if not exists venue_change_requests_by_status_created
  on pi.venue_change_requests (status, created_at desc);
create index if not exists venue_change_requests_by_venue
  on pi.venue_change_requests (venue_slug, created_at desc);

alter table pi.venue_change_requests enable row level security;

-- Anonymous insert allowed (v1 operators don't need accounts).
drop policy if exists "venue_change_requests_anon_insert" on pi.venue_change_requests;
create policy "venue_change_requests_anon_insert"
  on pi.venue_change_requests for insert
  with check (true);

-- Signed-in submitters can read their own pending requests (so the
-- form can show "thanks, in review" later if the user is signed in).
drop policy if exists "venue_change_requests_select_own_by_user" on pi.venue_change_requests;
create policy "venue_change_requests_select_own_by_user"
  on pi.venue_change_requests for select
  using (user_id is not null and user_id = auth.uid());

-- Editor full access via pi.profiles.is_editor.
drop policy if exists "venue_change_requests_editor_all" on pi.venue_change_requests;
create policy "venue_change_requests_editor_all"
  on pi.venue_change_requests for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- Default privileges already cover authenticated/anon for new tables in
-- pi (set in the consolidated bootstrap migration). Explicit insert for
-- anon is fine here because RLS still gates it.

-- updated_at trigger
create or replace function pi.venue_change_requests_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists venue_change_requests_set_updated_at on pi.venue_change_requests;
create trigger venue_change_requests_set_updated_at
  before update on pi.venue_change_requests
  for each row execute function pi.venue_change_requests_set_updated_at();
