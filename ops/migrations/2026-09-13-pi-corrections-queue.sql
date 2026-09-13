-- Migration: corrections queue (PI-016)
-- Date: 2026-09-13
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: a content-agnostic queue for reported factual errors. Until now
-- /corrections/ was a mailto link, so nothing a reader reported produced a
-- record: no reference, no queue, no audit history, and no way to close or
-- reopen a case. A structured correction intake did exist, but only on the
-- operator form (/partners/update/, change_type = 'correction'), which is
-- venue-scoped and operator-facing. A reader reporting an error in an
-- article had no structured route at all.
--
-- This migration clones the pi.venue_change_requests / pi.submissions shape
-- (anonymous insert, select-own for signed-in reporters, editor-all via
-- pi.profiles.is_editor, updated_at trigger) and adds the two things a
-- corrections queue needs that a change-request table does not:
--
--   1. An append-only event log (pi.correction_events) so "close" and
--      "reopen" are recorded rather than overwriting each other. Status
--      transitions on pi.corrections are logged automatically by trigger,
--      so the history holds even when an editor works the queue by hand in
--      Supabase Studio.
--
--   2. Reporter contact in a SEPARATE table (pi.correction_reporters) so a
--      case can be read, worked and exported without carrying personal
--      data. See "Why contact lives in its own table" below.
--
-- The taxonomy (factual / stale / framing / off-scope), the triage owner and
-- the workflow are the ones already written in ops/correction-handling.md.
-- This migration does not invent new vocabulary.
--
-- Idempotent: safe to re-run.
--
-- How to apply:
--   1. Supabase Studio -> SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.
--
--
-- WHY CONTACT LIVES IN ITS OWN TABLE
--
-- The requirement is that a case can be read or exported without carrying
-- personal data. Two designs satisfy it on paper: contact columns on
-- pi.corrections plus an export rule that omits them, or a second table.
-- This migration uses a second table, for four reasons.
--
--   1. RLS has no column granularity. A Postgres row-level policy grants a
--      row, not a subset of its columns. If contact columns sit on
--      pi.corrections, then any role that can read a case can read the
--      reporter's address, and the separation exists only in whatever
--      query the caller happened to write. In a separate table the boundary
--      is a policy the database enforces, not a convention a `select *`
--      can walk straight through.
--
--   2. The export path becomes the default rather than the careful path.
--      The queue view, the changelog entry, volume reporting and any future
--      dashboard all read pi.corrections and cannot pick up an address by
--      accident. Reading contact details becomes a deliberate second query,
--      made once, when someone is actually replying.
--
--   3. Erasure stays cheap and lossless. A request to delete a reporter's
--      details is one row removed from pi.correction_reporters; the case,
--      its evidence and its full audit history survive intact. Nulling
--      columns on the case row would work too, but only until the first
--      export or backup copied them somewhere else.
--
--   4. The two have different retention lives. A correction is a permanent
--      editorial record. An address is needed until the reply is sent.
--      Different lifetimes belong in different tables.
--
-- The cost is one extra insert from the browser, and that cost falls in the
-- right direction: the case is written first and the contact row second, so
-- a failure on the second never loses the correction (the same best-effort
-- shape /submit/ uses for photo uploads).
--
-- Caveat, stated plainly: the structural guarantee covers the fields this
-- schema controls. A reporter can always type their name into a free-text
-- field. Editors should treat `claim`, `proposed_correction`, `evidence` and
-- `editor_notes` as possibly carrying incidental personal data when
-- exporting, the same as any other free-text editorial field.


-- ---------------------------------------------------------------------------
-- 1. The case
-- ---------------------------------------------------------------------------

create table if not exists pi.corrections (
  id                    uuid primary key default gen_random_uuid(),

  -- Human-quotable reference, minted CLIENT-SIDE before the insert and shown
  -- on screen in the success message. It has to be client-side: the anon role
  -- has no select policy on this table (deliberately), so a server-generated
  -- id could never be read back to display. Format and collision maths live
  -- in next/src/lib/corrections.ts.
  case_ref              text not null unique,

  -- Optional auth.users link when the reporter happened to be signed in.
  -- Anonymous reports are the expected case and always allowed.
  user_id               uuid references auth.users(id) on delete set null,

  -- WHAT IS WRONG, AND WHERE ------------------------------------------------

  -- The page the error appears on. Required at intake: the single most common
  -- failure in an emailed correction is one that never says which page it is
  -- about. Stored normalised to an absolute peninsulainsider.com.au URL where
  -- the client could normalise it, verbatim otherwise.
  affected_url          text not null,

  -- Optional structured pointer, filled by an editor at triage (or later by
  -- an automated resolver). The site's content lives in JSON/MD on disk, not
  -- in Supabase, so this is a loose reference, not a foreign key.
  affected_entity_type  text,
  affected_entity_slug  text,

  -- The three fields that turn a vague complaint into an actionable case.
  claim                 text not null,   -- what we published that is wrong
  proposed_correction   text not null,   -- what it should say instead
  evidence              text not null,   -- how the reporter knows
  evidence_url          text,            -- optional supporting link

  -- Who is reporting. Not identity, just standing: it changes how the claim
  -- is verified, and an operator or subject correcting their own record is
  -- treated no differently in priority (see the free-correction rule on
  -- /corrections/).
  reporter_relationship text not null default 'reader' check (reporter_relationship in (
    'reader',           -- a reader who spotted it
    'operator',         -- owns or works at the venue / runs the event
    'subject',          -- the person or business the piece is about
    'representative',   -- acting for the subject
    'other'
  )),

  -- Urgency as the REPORTER sees it. Advisory input to triage, not the
  -- editorial priority: the editor sets correction_class below.
  severity              text not null default 'normal' check (severity in (
    'urgent',           -- actively misleading someone planning a visit today
    'normal',
    'minor'
  )),

  -- True once a pi.correction_reporters row exists. Lets the queue show
  -- "can be answered" / "cannot be answered" without reading the contact
  -- table at all. Set by trigger, never by the client (the anon insert
  -- policy below forces it false).
  contact_provided      boolean not null default false,

  -- EDITORIAL STATE ---------------------------------------------------------

  -- The four-class taxonomy from ops/correction-handling.md, unchanged.
  -- Null until an editor triages: the reporter does not classify.
  correction_class      text check (correction_class in (
    'factual',          -- verifiable factual claim is wrong
    'stale',            -- correct when verified, outdated now
    'framing',          -- subject disputes editorial framing
    'off-scope'         -- not about a PI surface
  )),

  -- Triage owner. ops/correction-handling.md names Emma primary, James
  -- backup; free text rather than a FK so it survives staffing changes.
  owner                 text,

  status                text not null default 'received' check (status in (
    'received',              -- landed, not yet looked at
    'in-triage',             -- being classified
    'needs-verification',    -- accepted in principle, awaiting a primary source
    'accepted',              -- verified, edit pending
    'applied',               -- edit is live
    'declined',              -- not a correction (incl. framing kept)
    'closed',                -- terminal
    'reopened'               -- closed then raised again
  )),

  editor_notes          text,          -- internal; never surfaced to the reporter
  changelog_ref         text,          -- docs/CHANGELOG-corrections.md entry
  ledger_ref            text,          -- ops/publication-ledger/ entry id

  -- AUDIT -------------------------------------------------------------------
  received_at           timestamptz not null default now(),
  decided_at            timestamptz,   -- accept / decline
  resolved_at           timestamptz,   -- edit live, or case closed

  client_token          text,          -- light spam dedupe; not auth-secured
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table pi.corrections is
  'Reader- and operator-reported factual errors against any PI surface (PI-016). Content-agnostic: affected_url is the join, not a venue slug. Reporter contact is deliberately NOT here - see pi.correction_reporters.';
comment on column pi.corrections.case_ref is
  'Client-minted reference shown to the reporter. The anon role cannot select from this table, so a server-side id could never be read back.';
comment on column pi.corrections.contact_provided is
  'Set by trigger when a pi.correction_reporters row lands. Lets the queue see answerability without touching personal data.';

create index if not exists corrections_by_status_received
  on pi.corrections (status, received_at desc);
create index if not exists corrections_by_class_received
  on pi.corrections (correction_class, received_at desc);
create index if not exists corrections_by_url
  on pi.corrections (affected_url);
create index if not exists corrections_by_entity
  on pi.corrections (affected_entity_type, affected_entity_slug);
create index if not exists corrections_open_by_severity
  on pi.corrections (severity, received_at desc)
  where status not in ('applied', 'declined', 'closed');


-- ---------------------------------------------------------------------------
-- 2. Reporter contact - separate by design (see header)
-- ---------------------------------------------------------------------------

create table if not exists pi.correction_reporters (
  -- One contact row per case, and the primary key is what enforces it. That
  -- also stops a third party attaching a second contact to a case whose uuid
  -- they somehow learned.
  correction_id      uuid primary key references pi.corrections(id) on delete cascade,
  contact_name       text,
  contact_email      text,
  -- What the reporter asked for. 'none' is a real answer, not an absence:
  -- a correction without contact details is still acted on, it just cannot
  -- be answered.
  contact_preference text not null default 'email' check (contact_preference in ('email', 'none')),
  created_at         timestamptz not null default now()
);

comment on table pi.correction_reporters is
  'Reporter contact details, one row per case. Held apart from pi.corrections so a case can be read, worked and exported without personal data, and so erasure is a single row delete that leaves the case and its audit history intact.';


-- ---------------------------------------------------------------------------
-- 3. Append-only event log
-- ---------------------------------------------------------------------------

create table if not exists pi.correction_events (
  id             uuid primary key default gen_random_uuid(),
  correction_id  uuid not null references pi.corrections(id) on delete cascade,

  event_type     text not null check (event_type in (
    'received',
    'triaged',
    'classified',
    'verification-requested',
    'accepted',
    'declined',
    'applied',
    'closed',
    'reopened',
    'contacted',
    'note'
  )),

  -- Populated automatically for status transitions; null for 'note'.
  from_status    text,
  to_status      text,

  actor_user_id  uuid references auth.users(id) on delete set null,
  actor_label    text,          -- 'system', 'Emma', 'James', an agent name
  detail         text,

  created_at     timestamptz not null default now()
);

comment on table pi.correction_events is
  'Append-only audit history for pi.corrections. No update or delete policy exists and a trigger blocks both, so closing and reopening a case accumulates history rather than overwriting it.';

create index if not exists correction_events_by_correction
  on pi.correction_events (correction_id, created_at);
create index if not exists correction_events_by_type_created
  on pi.correction_events (event_type, created_at desc);


-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------

-- updated_at, same shape as pi.submissions / pi.venue_change_requests.
create or replace function pi.corrections_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists corrections_set_updated_at on pi.corrections;
create trigger corrections_set_updated_at
  before update on pi.corrections
  for each row execute function pi.corrections_set_updated_at();


-- Log intake. SECURITY DEFINER so the anonymous insert can write the opening
-- event without anon ever holding an insert grant on the log itself. Same
-- reason pi.is_cms_admin() is SECURITY DEFINER: the privileged read/write
-- happens inside the function, not in the caller's policy scope.
create or replace function pi.corrections_log_intake()
returns trigger
language plpgsql
security definer
set search_path = pi, public
as $$
begin
  insert into pi.correction_events (correction_id, event_type, to_status, actor_label, detail)
  values (new.id, 'received', new.status, 'system',
          'Case ' || new.case_ref || ' received for ' || new.affected_url);
  return new;
end;
$$;

drop trigger if exists corrections_log_intake on pi.corrections;
create trigger corrections_log_intake
  after insert on pi.corrections
  for each row execute function pi.corrections_log_intake();


-- Log every status transition, whoever made it and however. An editor
-- flipping a dropdown in Supabase Studio produces the same audit row as a
-- dashboard would, which is the point: the history cannot be bypassed by
-- working the queue by hand.
create or replace function pi.corrections_log_transition()
returns trigger
language plpgsql
security definer
set search_path = pi, public
as $$
declare
  ev text;
begin
  if new.status is distinct from old.status then
    ev := case new.status
            when 'in-triage'          then 'triaged'
            when 'needs-verification' then 'verification-requested'
            when 'accepted'           then 'accepted'
            when 'applied'            then 'applied'
            when 'declined'           then 'declined'
            when 'closed'             then 'closed'
            when 'reopened'           then 'reopened'
            else 'note'
          end;

    insert into pi.correction_events (
      correction_id, event_type, from_status, to_status, actor_user_id, actor_label, detail
    )
    values (
      new.id, ev, old.status, new.status, auth.uid(), coalesce(new.owner, 'editor'),
      nullif(new.editor_notes, old.editor_notes)
    );
  end if;

  -- Classification is a decision in its own right and often lands in the
  -- same update as the triage transition, so it gets its own row.
  if new.correction_class is distinct from old.correction_class
     and new.correction_class is not null then
    insert into pi.correction_events (
      correction_id, event_type, actor_user_id, actor_label, detail
    )
    values (
      new.id, 'classified', auth.uid(), coalesce(new.owner, 'editor'),
      'Classified as ' || new.correction_class
    );
  end if;

  return new;
end;
$$;

drop trigger if exists corrections_log_transition on pi.corrections;
create trigger corrections_log_transition
  after update on pi.corrections
  for each row execute function pi.corrections_log_transition();


-- Flip contact_provided when the contact row lands. The client cannot set
-- this itself (the anon insert policy forces it false), so the flag always
-- reflects reality.
create or replace function pi.correction_reporters_mark_contact()
returns trigger
language plpgsql
security definer
set search_path = pi, public
as $$
begin
  update pi.corrections
     set contact_provided = (new.contact_preference = 'email' and coalesce(new.contact_email, '') <> '')
   where id = new.correction_id;
  return new;
end;
$$;

drop trigger if exists correction_reporters_mark_contact on pi.correction_reporters;
create trigger correction_reporters_mark_contact
  after insert or update on pi.correction_reporters
  for each row execute function pi.correction_reporters_mark_contact();


-- Append-only enforcement. The policies below never grant update or delete,
-- but a future migration adding a broad "editor_all" policy would silently
-- open both, so the invariant is made explicit here rather than left to
-- policy hygiene.
--
-- The trigger fires on UPDATE only, deliberately. A BEFORE DELETE trigger
-- that raises would also break the `on delete cascade` from pi.corrections,
-- which is the one legitimate way an event row disappears. Retiring a case
-- is a status change to 'closed', never a delete; if a case is ever deleted
-- outright its history goes with it, which is the correct semantics and the
-- reason not to delete cases.
create or replace function pi.correction_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pi.correction_events is append-only (attempted %)', tg_op
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists correction_events_append_only on pi.correction_events;
create trigger correction_events_append_only
  before update on pi.correction_events
  for each row execute function pi.correction_events_append_only();


-- ---------------------------------------------------------------------------
-- 5. Row-level security
-- ---------------------------------------------------------------------------

alter table pi.corrections          enable row level security;
alter table pi.correction_reporters enable row level security;
alter table pi.correction_events    enable row level security;

-- --- pi.corrections --------------------------------------------------------

-- Anonymous insert. Anyone can report an error; nobody needs an account to
-- do it. The with-check does more work than pi.submissions' `true` because
-- this table carries editorial decisions: an anonymous writer must not be
-- able to seed a case that arrives pre-triaged, pre-classified, pre-owned or
-- pre-resolved, and must not be able to claim contact details it has not
-- filed.
drop policy if exists "corrections_anonymous_insert" on pi.corrections;
create policy "corrections_anonymous_insert"
  on pi.corrections for insert
  with check (
    status = 'received'
    and correction_class is null
    and owner is null
    and decided_at is null
    and resolved_at is null
    and changelog_ref is null
    and ledger_ref is null
    and editor_notes is null
    and contact_provided = false
  );

-- Signed-in reporters can read back their own cases. Anonymous reporters
-- cannot read anything, which is why the case reference is minted in the
-- browser and shown on screen at submit time.
drop policy if exists "corrections_select_own_by_user" on pi.corrections;
create policy "corrections_select_own_by_user"
  on pi.corrections for select
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "corrections_editor_all" on pi.corrections;
create policy "corrections_editor_all"
  on pi.corrections for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- --- pi.correction_reporters ----------------------------------------------

-- Insert only. There is deliberately no select-own policy here: personal
-- data is editor-read, and the reporter already has their own address.
drop policy if exists "correction_reporters_anonymous_insert" on pi.correction_reporters;
create policy "correction_reporters_anonymous_insert"
  on pi.correction_reporters for insert
  with check (true);

drop policy if exists "correction_reporters_editor_all" on pi.correction_reporters;
create policy "correction_reporters_editor_all"
  on pi.correction_reporters for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- --- pi.correction_events --------------------------------------------------

-- Editors read the history and may append a note. No update, no delete, for
-- anyone: the trigger above backs the omission up.
drop policy if exists "correction_events_editor_select" on pi.correction_events;
create policy "correction_events_editor_select"
  on pi.correction_events for select
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

drop policy if exists "correction_events_editor_insert" on pi.correction_events;
create policy "correction_events_editor_insert"
  on pi.correction_events for insert
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- Signed-in reporters see the history of their own cases, so a future
-- "track your correction" surface needs no new policy. Contact details are
-- still not reachable from here.
drop policy if exists "correction_events_select_own_by_user" on pi.correction_events;
create policy "correction_events_select_own_by_user"
  on pi.correction_events for select
  using (exists (
    select 1 from pi.corrections c
     where c.id = correction_id
       and c.user_id is not null
       and c.user_id = auth.uid()
  ));

-- --- Table privileges ------------------------------------------------------
--
-- The consolidated bootstrap migration sets ALTER DEFAULT PRIVILEGES for the
-- pi schema, and every table above inherits them. Those defaults are a
-- property of WHICH ROLE ran the create, though, not of this file, and a
-- missing grant surfaces as a bare "permission denied for table corrections"
-- on a reader pressing Send - a failure nobody is watching for. Restating the
-- grants is idempotent and costs nothing. RLS above remains the gate; these
-- only open the door it guards.
--
-- pi.correction_events is deliberately absent from the anon grants and from
-- every update/delete grant: the log is written by the SECURITY DEFINER
-- intake and transition triggers, read by editors, and appended to by
-- editors. Nothing else touches it.

grant select, insert on pi.corrections          to anon, authenticated;
grant update         on pi.corrections          to authenticated;
grant select, insert on pi.correction_reporters to anon, authenticated;
grant update, delete on pi.correction_reporters to authenticated;
grant select, insert on pi.correction_events    to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Verify
-- ---------------------------------------------------------------------------
--
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'pi'
--    and tablename in ('corrections', 'correction_reporters', 'correction_events');
--
-- select polname, polcmd from pg_policy
--  where polrelid in (
--    'pi.corrections'::regclass,
--    'pi.correction_reporters'::regclass,
--    'pi.correction_events'::regclass
--  ) order by 1;
--
-- -- Intake logs itself, and a status change appends rather than overwrites:
-- insert into pi.corrections (case_ref, affected_url, claim, proposed_correction, evidence)
-- values ('PI-C-TEST00-0000', 'https://peninsulainsider.com.au/', 'x', 'y', 'z');
-- update pi.corrections set status = 'in-triage' where case_ref = 'PI-C-TEST00-0000';
-- update pi.corrections set status = 'closed'    where case_ref = 'PI-C-TEST00-0000';
-- update pi.corrections set status = 'reopened'  where case_ref = 'PI-C-TEST00-0000';
-- select event_type, from_status, to_status from pi.correction_events
--   where correction_id = (select id from pi.corrections where case_ref = 'PI-C-TEST00-0000')
--   order by created_at;              -- expect 4 rows, oldest 'received'
-- delete from pi.corrections where case_ref = 'PI-C-TEST00-0000';
--
--
-- ---------------------------------------------------------------------------
-- 7. Rollback
-- ---------------------------------------------------------------------------
--
-- Rollback preserves open submissions: do NOT drop these tables while the
-- queue holds unresolved cases. Take a snapshot first (Database -> Backups,
-- or pg_dump --schema=pi) and export pi.corrections before doing anything.
-- The safe rollback is to revert the form on /corrections/ so intake stops,
-- and leave the tables in place until the queue is drained.
--
-- If the tables really must go, reverse order:
--
-- drop policy if exists "correction_events_select_own_by_user"  on pi.correction_events;
-- drop policy if exists "correction_events_editor_insert"       on pi.correction_events;
-- drop policy if exists "correction_events_editor_select"       on pi.correction_events;
-- drop policy if exists "correction_reporters_editor_all"       on pi.correction_reporters;
-- drop policy if exists "correction_reporters_anonymous_insert" on pi.correction_reporters;
-- drop policy if exists "corrections_editor_all"                on pi.corrections;
-- drop policy if exists "corrections_select_own_by_user"        on pi.corrections;
-- drop policy if exists "corrections_anonymous_insert"          on pi.corrections;
--
-- drop trigger  if exists correction_events_append_only on pi.correction_events;
-- drop function if exists pi.correction_events_append_only();
-- drop trigger  if exists correction_reporters_mark_contact on pi.correction_reporters;
-- drop function if exists pi.correction_reporters_mark_contact();
-- drop trigger  if exists corrections_log_transition on pi.corrections;
-- drop function if exists pi.corrections_log_transition();
-- drop trigger  if exists corrections_log_intake on pi.corrections;
-- drop function if exists pi.corrections_log_intake();
-- drop trigger  if exists corrections_set_updated_at on pi.corrections;
-- drop function if exists pi.corrections_set_updated_at();
--
-- drop table if exists pi.correction_events;
-- drop table if exists pi.correction_reporters;
-- drop table if exists pi.corrections;
