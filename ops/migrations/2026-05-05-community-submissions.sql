-- Migration: community submissions table
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: Phase 4 WS4D — reader-submitted local secrets. Form on /submit/
--          posts a row here with status 'pending'. Editorial reviews via
--          Supabase Studio (no custom CMS for v1); approved rows are
--          exported to next/src/content/local-secrets/<slug>.md by a small
--          CLI script for build-time inclusion.
--
-- Idempotent: safe to re-run.
--
-- How to apply:
--   1. Supabase Studio → SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.

create table if not exists pi.submissions (
  id              uuid primary key default gen_random_uuid(),
  -- Optional auth.users link if the submitter was signed in. Anonymous
  -- submissions are allowed for v1; we still capture name + email below.
  user_id         uuid references auth.users(id) on delete set null,
  -- Submission content
  category        text not null check (category in (
    'food', 'drink', 'wine', 'beach', 'walk', 'view',
    'experience', 'event', 'shop', 'service', 'wildlife', 'other'
  )),
  place_name      text,                          -- free text, e.g. "Sorrento"
  title           text not null,                  -- short headline
  body            text not null,                  -- the secret in their own words
  -- Submitter metadata
  submitter_name  text not null,
  submitter_email text not null,
  submitter_handle text,                          -- optional Instagram or website
  -- Photo storage references (Supabase Storage paths). Cap at 2 photos
  -- per locked decision Q8; enforced client-side with a server check.
  photo_urls      text[] default array[]::text[],
  -- Editorial state
  status          text not null default 'pending' check (status in (
    'pending', 'in-review', 'approved', 'declined', 'published'
  )),
  editor_notes    text,                            -- internal notes; never surfaced to submitter
  decision_at     timestamptz,
  published_slug  text,                            -- once exported to MD, the slug
  -- Audit
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Light spam-deflection: same-IP/same-cookie identifier
  client_token    text                              -- random hash from the client; not auth-secured
);

comment on table pi.submissions is 'Reader-submitted local secrets, Phase 4 WS4D. Editorial review in Supabase Studio; approved rows exported to next/src/content/local-secrets/.';

create index if not exists submissions_by_status_created
  on pi.submissions (status, created_at desc);
create index if not exists submissions_by_email
  on pi.submissions (submitter_email);

alter table pi.submissions enable row level security;

-- Anonymous submitters can insert. We DO NOT allow public select; submitters
-- can read back their own only via authenticated user_id match (when signed
-- in) or via a tiny RPC by client_token if we add one later.
drop policy if exists "submissions_anonymous_insert" on pi.submissions;
create policy "submissions_anonymous_insert"
  on pi.submissions for insert
  with check (true);

drop policy if exists "submissions_select_own_by_user" on pi.submissions;
create policy "submissions_select_own_by_user"
  on pi.submissions for select
  using (user_id is not null and user_id = auth.uid());

-- Editor role gets full access. The 'is_editor' boolean already lives on
-- pi.profiles per existing auth setup.
drop policy if exists "submissions_editor_all" on pi.submissions;
create policy "submissions_editor_all"
  on pi.submissions for all
  using (
    exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true)
  )
  with check (
    exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true)
  );

-- updated_at trigger
create or replace function pi.submissions_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists submissions_set_updated_at on pi.submissions;
create trigger submissions_set_updated_at
  before update on pi.submissions
  for each row execute function pi.submissions_set_updated_at();
