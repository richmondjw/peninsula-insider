-- Migration: partner enquiry queue (PI-015)
-- Date: 2026-09-14
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: give /partners/ a real destination.
--
-- Until now the partner enquiry form on /partners/ posted to
-- https://formspree.io/f/peninsula-insider-partners - a human-readable
-- placeholder, not a Formspree hashid - behind `var ENDPOINT_LIVE = false`.
-- Every submit was intercepted and turned into a `mailto:` handoff, so:
--
--   * nothing was ever recorded server-side: no queue, no reference, no
--     audit trail, no way to tell a returning enquirer what happened;
--   * delivery depended on the visitor having a working mail handler. With
--     none configured, or where the browser suppressed the navigation, the
--     enquiry did nothing at all and the business saw no error;
--   * the page could not tell the difference between sent and lost, so it
--     could not confirm anything honestly.
--
-- A business filling that form in believed it had contacted the publication.
-- The route looked functional, which is worse than a missing page.
--
-- This migration removes the dependency on a third-party form service
-- rather than waiting for one to be provisioned. It follows the shape PI-016
-- shipped for the corrections queue (ops/migrations/2026-09-13-pi-corrections-queue.sql):
-- anonymous insert under RLS, no public read, contact details isolated in
-- their own table, an append-only event log, and a client-minted reference
-- shown on screen because the anon role cannot read the row back.
--
-- WHAT IS DIFFERENT FROM CORRECTIONS, AND WHY
--
--   1. Contact details are REQUIRED here, not optional. A correction with no
--      address on it is still a correction; a partner enquiry nobody can
--      answer is a lost lead. The contact row is therefore not best-effort:
--      the page reports success only when BOTH rows land, and reports a
--      named partial failure (with the reference and the email fallback)
--      when the enquiry lands and the contact row does not. See
--      next/src/lib/partner-enquiry.ts, classifyOutcome().
--
--   2. The spam controls are enforced HERE, not only in the browser. There
--      is no application server on this site - the database is the only
--      thing a bot cannot talk around. So the honeypot and the timing check
--      are both columns with CHECK constraints:
--
--        bot_trap          must arrive empty. A bot that fills every field
--                          it finds is rejected by Postgres, not by a script
--                          it never ran.
--        compose_ms        must be >= 2500. A bot that omits it, or posts
--                          the form in 80ms, is rejected the same way.
--
--      Neither is a CAPTCHA and neither claims to be unbeatable: a bot that
--      studies the form can send an empty trap and a plausible delay. The
--      point is that the cheap, generic attack - POST every field to every
--      endpoint - fails at the database, and it fails whether or not the
--      browser ran a line of our JavaScript.
--
--   3. The status vocabulary is a sales lifecycle, not an editorial one.
--
-- Idempotent: safe to re-run.
--
-- How to apply:
--   1. Supabase Studio -> SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.
--
-- NOT YET APPLIED as of this commit. See the PR description.
--
--
-- WHY CONTACT LIVES IN ITS OWN TABLE
--
-- Same four reasons as pi.correction_reporters, and they hold harder here
-- because a partner enquiry is a commercial record that gets read, filtered,
-- counted and exported far more often than a correction does:
--
--   1. RLS has no column granularity. A policy grants a row, not a subset of
--      its columns. With contact columns on pi.partner_enquiries, anything
--      that can read an enquiry can read the enquirer's name and address,
--      and the separation lives only in whatever query the caller wrote.
--   2. The export path becomes the default rather than the careful path. A
--      pipeline count, a category breakdown or a "what came in this month"
--      view reads pi.partner_enquiries and cannot pick up an address by
--      accident.
--   3. Erasure stays cheap and lossless: one row out of
--      pi.partner_enquiry_contacts leaves the enquiry, its category and its
--      full history intact.
--   4. The two have different retention lives. A record that an enquiry was
--      made is a permanent commercial record; a contact detail is needed
--      until the conversation ends or the business asks for it to go.
--
-- Caveat, stated as plainly as PI-016 stated it: this covers the fields the
-- schema controls. Someone can always type their name into `notes`. Treat
-- `notes` and `owner_notes` as possibly carrying incidental personal data
-- when exporting.


-- ---------------------------------------------------------------------------
-- 1. The enquiry
-- ---------------------------------------------------------------------------

create table if not exists pi.partner_enquiries (
  id                   uuid primary key default gen_random_uuid(),

  -- Human-quotable reference, minted CLIENT-SIDE before the insert and shown
  -- on screen in the confirmation. It has to be client-side: the anon role
  -- has no select policy on this table (deliberately - a public read would
  -- expose every business that has ever considered a partnership, which is
  -- commercially sensitive to them, not to us), so a server-generated id
  -- could never be read back to display. Format and collision maths live in
  -- next/src/lib/partner-enquiry.ts.
  enquiry_ref          text not null unique,

  -- Optional auth.users link when the enquirer happened to be signed in.
  -- Anonymous enquiries are the expected case and always allowed.
  user_id              uuid references auth.users(id) on delete set null,

  -- WHO IS ASKING, AND ABOUT WHAT -------------------------------------------

  -- The business, not the person. This is the commercial record's subject and
  -- it is deliberately NOT in the contact table: an enquiry has to be
  -- readable as "a winery in Red Hill asked about seasonal campaigns" once
  -- the personal data is gone.
  business_name        text not null check (length(btrim(business_name)) between 1 and 200),

  -- Closed vocabulary, mirrored exactly in next/src/lib/partner-enquiry.ts.
  -- The <select> already constrains it in the browser; this constrains it for
  -- everyone else.
  business_category    text not null check (business_category in (
    'winery-cellar-door',
    'restaurant-dining',
    'accommodation',
    'wellness-spa',
    'tour-attraction',
    'event',
    'visitor-experience',
    'other'
  )),

  -- Optional. Stored verbatim: a handle, a URL or something in between, and
  -- losing an enquiry over an unparseable website field would be absurd.
  website_or_instagram text check (website_or_instagram is null or length(website_or_instagram) <= 300),

  -- Optional, closed vocabulary. Null means "did not say", which is a real
  -- and common answer on a first enquiry.
  interest             text check (interest is null or interest in (
    'featured-profile',
    'seasonal-campaign',
    'event-promotion',
    'newsletter',
    'offers-experiences',
    'sponsorship',
    'not-sure'
  )),

  notes                text check (notes is null or length(notes) <= 2000),

  -- True once a pi.partner_enquiry_contacts row exists with a usable address.
  -- Lets the queue see "can be answered" without reading the contact table at
  -- all. Set by trigger, never by the client (the anon insert policy forces
  -- it false).
  contact_provided     boolean not null default false,

  -- SPAM CONTROL, ENFORCED SERVER-SIDE --------------------------------------
  --
  -- There is no application server. These two columns are how a rule the
  -- browser applies becomes a rule the database applies, which is the only
  -- version a bot cannot skip by posting straight at PostgREST.

  -- Honeypot. A field hidden from people and offered to machines. It must
  -- arrive empty; the column exists so the constraint can exist.
  bot_trap             text check (bot_trap is null or length(btrim(bot_trap)) = 0),

  -- Milliseconds between the form being ready and the enquirer pressing Send.
  -- A person filling in a business name, a contact name, an email, a category
  -- and usually a note does not get there in two and a half seconds. The
  -- upper bound is deliberately absent: a form left open over lunch is a
  -- normal thing for a busy operator to do, and rejecting it would throw away
  -- real enquiries to catch nothing.
  compose_ms           integer not null check (compose_ms >= 2500),

  -- COMMERCIAL STATE --------------------------------------------------------

  status               text not null default 'received' check (status in (
    'received',      -- landed, nobody has looked
    'in-review',     -- being assessed for fit
    'contacted',     -- we have replied
    'in-conversation',
    'partnered',     -- became a partner
    'declined',      -- not a fit, or not now
    'closed'         -- terminal, no outcome recorded
  )),

  owner                text,   -- who is handling it; free text, survives staffing changes
  owner_notes          text,   -- internal; never surfaced to the enquirer
  decline_reason       text,

  -- AUDIT -------------------------------------------------------------------
  source_surface       text not null default 'partners-page',
  received_at          timestamptz not null default now(),
  first_response_at    timestamptz,
  resolved_at          timestamptz,

  client_token         text,   -- light dedupe signal; not auth-secured
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table pi.partner_enquiries is
  'Commercial partnership enquiries from /partners/ (PI-015). Replaces an unprovisioned Formspree placeholder that silently dropped every enquiry. Enquirer contact is deliberately NOT here - see pi.partner_enquiry_contacts.';
comment on column pi.partner_enquiries.enquiry_ref is
  'Client-minted reference shown to the enquirer. The anon role cannot select from this table, so a server-side id could never be read back.';
comment on column pi.partner_enquiries.bot_trap is
  'Honeypot. Hidden from people, offered to machines, and constrained to empty here so the rule survives a bot that never ran our JavaScript.';
comment on column pi.partner_enquiries.compose_ms is
  'Time to compose, in ms. Constrained to >= 2500 here for the same reason as bot_trap: the browser check is a convenience, this is the enforcement.';
comment on column pi.partner_enquiries.contact_provided is
  'Set by trigger when a usable contact row lands. Lets the queue see answerability without touching personal data.';

create index if not exists partner_enquiries_by_status_received
  on pi.partner_enquiries (status, received_at desc);
create index if not exists partner_enquiries_by_category_received
  on pi.partner_enquiries (business_category, received_at desc);
create index if not exists partner_enquiries_open
  on pi.partner_enquiries (received_at desc)
  where status in ('received', 'in-review', 'contacted', 'in-conversation');


-- ---------------------------------------------------------------------------
-- 2. Enquirer contact - separate by design (see header)
-- ---------------------------------------------------------------------------

create table if not exists pi.partner_enquiry_contacts (
  -- One contact row per enquiry, and the primary key is what enforces it.
  -- That also stops a third party attaching a second contact to an enquiry
  -- whose uuid they somehow learned.
  enquiry_id    uuid primary key references pi.partner_enquiries(id) on delete cascade,
  contact_name  text not null check (length(btrim(contact_name)) between 1 and 200),
  -- Deliberately loose. The job is to reject what obviously cannot be an
  -- address, not to adjudicate RFC 5322 in a CHECK constraint - the strict
  -- regexes in circulation all reject addresses that work.
  contact_email text not null check (contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  contact_phone text check (contact_phone is null or length(contact_phone) <= 50),
  created_at    timestamptz not null default now()
);

comment on table pi.partner_enquiry_contacts is
  'Enquirer contact details, one row per enquiry. Held apart from pi.partner_enquiries so an enquiry can be read, triaged, counted and exported without personal data, and so erasure is a single row delete that leaves the commercial record intact.';


-- ---------------------------------------------------------------------------
-- 3. Append-only event log
-- ---------------------------------------------------------------------------

create table if not exists pi.partner_enquiry_events (
  id           uuid primary key default gen_random_uuid(),
  enquiry_id   uuid not null references pi.partner_enquiries(id) on delete cascade,

  event_type   text not null check (event_type in (
    'received',
    'reviewed',
    'contacted',
    'in-conversation',
    'partnered',
    'declined',
    'closed',
    'note'
  )),

  from_status  text,
  to_status    text,

  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label   text,          -- 'system', a name, an agent
  detail        text,

  created_at    timestamptz not null default now()
);

comment on table pi.partner_enquiry_events is
  'Append-only history for pi.partner_enquiries. No update or delete policy exists and a trigger blocks updates, so "we contacted them, then they went quiet, then they came back" accumulates rather than overwriting.';

create index if not exists partner_enquiry_events_by_enquiry
  on pi.partner_enquiry_events (enquiry_id, created_at);


-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------

create or replace function pi.partner_enquiries_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists partner_enquiries_set_updated_at on pi.partner_enquiries;
create trigger partner_enquiries_set_updated_at
  before update on pi.partner_enquiries
  for each row execute function pi.partner_enquiries_set_updated_at();


-- Log intake. SECURITY DEFINER so the anonymous insert can write the opening
-- event without anon ever holding an insert grant on the log itself.
create or replace function pi.partner_enquiries_log_intake()
returns trigger
language plpgsql
security definer
set search_path = pi, public
as $$
begin
  insert into pi.partner_enquiry_events (enquiry_id, event_type, to_status, actor_label, detail)
  values (new.id, 'received', new.status, 'system',
          'Enquiry ' || new.enquiry_ref || ' received from ' || new.business_name
          || ' (' || new.business_category || ')');
  return new;
end;
$$;

drop trigger if exists partner_enquiries_log_intake on pi.partner_enquiries;
create trigger partner_enquiries_log_intake
  after insert on pi.partner_enquiries
  for each row execute function pi.partner_enquiries_log_intake();


-- Log every status transition, whoever made it and however - including an
-- owner flipping a dropdown by hand in Supabase Studio.
create or replace function pi.partner_enquiries_log_transition()
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
            when 'in-review'       then 'reviewed'
            when 'contacted'       then 'contacted'
            when 'in-conversation' then 'in-conversation'
            when 'partnered'       then 'partnered'
            when 'declined'        then 'declined'
            when 'closed'          then 'closed'
            else 'note'
          end;

    insert into pi.partner_enquiry_events (
      enquiry_id, event_type, from_status, to_status, actor_user_id, actor_label, detail
    )
    values (
      new.id, ev, old.status, new.status, auth.uid(), coalesce(new.owner, 'editor'),
      coalesce(nullif(new.decline_reason, old.decline_reason),
               nullif(new.owner_notes, old.owner_notes))
    );
  end if;

  return new;
end;
$$;

drop trigger if exists partner_enquiries_log_transition on pi.partner_enquiries;
create trigger partner_enquiries_log_transition
  after update on pi.partner_enquiries
  for each row execute function pi.partner_enquiries_log_transition();


-- Flip contact_provided when the contact row lands. The client cannot set it
-- itself (the anon insert policy forces it false), so the flag always
-- reflects reality - which is what lets the queue distinguish "enquiry we can
-- answer" from "enquiry whose contact insert failed".
create or replace function pi.partner_enquiry_contacts_mark_contact()
returns trigger
language plpgsql
security definer
set search_path = pi, public
as $$
begin
  update pi.partner_enquiries
     set contact_provided = (coalesce(new.contact_email, '') <> '')
   where id = new.enquiry_id;
  return new;
end;
$$;

drop trigger if exists partner_enquiry_contacts_mark_contact on pi.partner_enquiry_contacts;
create trigger partner_enquiry_contacts_mark_contact
  after insert or update on pi.partner_enquiry_contacts
  for each row execute function pi.partner_enquiry_contacts_mark_contact();


-- Append-only enforcement, for the same reason PI-016 made it explicit: the
-- policies below never grant update or delete, but a future migration adding
-- a broad "editor_all" policy would silently open both.
--
-- UPDATE only, deliberately: a BEFORE DELETE trigger that raises would also
-- break the `on delete cascade` from pi.partner_enquiries, which is the one
-- legitimate way an event row disappears.
create or replace function pi.partner_enquiry_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pi.partner_enquiry_events is append-only (attempted %)', tg_op
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists partner_enquiry_events_append_only on pi.partner_enquiry_events;
create trigger partner_enquiry_events_append_only
  before update on pi.partner_enquiry_events
  for each row execute function pi.partner_enquiry_events_append_only();


-- ---------------------------------------------------------------------------
-- 5. Row-level security
-- ---------------------------------------------------------------------------

alter table pi.partner_enquiries        enable row level security;
alter table pi.partner_enquiry_contacts enable row level security;
alter table pi.partner_enquiry_events   enable row level security;

-- --- pi.partner_enquiries --------------------------------------------------

-- Anonymous insert. Any business can enquire; nobody needs an account. The
-- with-check carries the same job as the corrections one: an anonymous writer
-- must not be able to seed an enquiry that arrives pre-owned, pre-decided or
-- pre-resolved, and must not be able to claim a contact row it has not filed.
--
-- The CHECK constraints on bot_trap and compose_ms are column constraints
-- rather than policy clauses on purpose: they must hold for the editor path
-- too, so that a future admin tool cannot write a row the public form could
-- not have produced.
drop policy if exists "partner_enquiries_anonymous_insert" on pi.partner_enquiries;
create policy "partner_enquiries_anonymous_insert"
  on pi.partner_enquiries for insert
  with check (
    status = 'received'
    and owner is null
    and owner_notes is null
    and decline_reason is null
    and first_response_at is null
    and resolved_at is null
    and contact_provided = false
  );

-- Signed-in enquirers can read back their own enquiries. Anonymous ones
-- cannot read anything, which is why the reference is minted in the browser
-- and shown on screen at submit time.
drop policy if exists "partner_enquiries_select_own_by_user" on pi.partner_enquiries;
create policy "partner_enquiries_select_own_by_user"
  on pi.partner_enquiries for select
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "partner_enquiries_editor_all" on pi.partner_enquiries;
create policy "partner_enquiries_editor_all"
  on pi.partner_enquiries for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- --- pi.partner_enquiry_contacts -------------------------------------------

-- Insert only for anon. No select-own policy: personal data is editor-read,
-- and the enquirer already knows their own address.
drop policy if exists "partner_enquiry_contacts_anonymous_insert" on pi.partner_enquiry_contacts;
create policy "partner_enquiry_contacts_anonymous_insert"
  on pi.partner_enquiry_contacts for insert
  with check (true);

drop policy if exists "partner_enquiry_contacts_editor_all" on pi.partner_enquiry_contacts;
create policy "partner_enquiry_contacts_editor_all"
  on pi.partner_enquiry_contacts for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- --- pi.partner_enquiry_events ---------------------------------------------

drop policy if exists "partner_enquiry_events_editor_select" on pi.partner_enquiry_events;
create policy "partner_enquiry_events_editor_select"
  on pi.partner_enquiry_events for select
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

drop policy if exists "partner_enquiry_events_editor_insert" on pi.partner_enquiry_events;
create policy "partner_enquiry_events_editor_insert"
  on pi.partner_enquiry_events for insert
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

drop policy if exists "partner_enquiry_events_select_own_by_user" on pi.partner_enquiry_events;
create policy "partner_enquiry_events_select_own_by_user"
  on pi.partner_enquiry_events for select
  using (exists (
    select 1 from pi.partner_enquiries e
     where e.id = enquiry_id
       and e.user_id is not null
       and e.user_id = auth.uid()
  ));

-- --- Table privileges ------------------------------------------------------
--
-- Restated for the same reason PI-016 restated them: the pi-schema default
-- privileges are a property of which role ran the create, not of this file,
-- and a missing grant surfaces as a bare "permission denied for table
-- partner_enquiries" on a business pressing Send. RLS above remains the gate;
-- these only open the door it guards.
--
-- pi.partner_enquiry_events is deliberately absent from the anon grants: the
-- log is written by the SECURITY DEFINER intake and transition triggers, read
-- by editors, and appended to by editors.

grant select, insert on pi.partner_enquiries        to anon, authenticated;
grant update         on pi.partner_enquiries        to authenticated;
grant select, insert on pi.partner_enquiry_contacts to anon, authenticated;
grant update, delete on pi.partner_enquiry_contacts to authenticated;
grant select, insert on pi.partner_enquiry_events   to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Verify
-- ---------------------------------------------------------------------------
--
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'pi'
--    and tablename in ('partner_enquiries', 'partner_enquiry_contacts', 'partner_enquiry_events');
--
-- select polname, polcmd from pg_policy
--  where polrelid in (
--    'pi.partner_enquiries'::regclass,
--    'pi.partner_enquiry_contacts'::regclass,
--    'pi.partner_enquiry_events'::regclass
--  ) order by 1;
--
-- -- A good enquiry lands and logs itself:
-- insert into pi.partner_enquiries
--   (enquiry_ref, business_name, business_category, compose_ms)
-- values ('PI-P-TEST00-0000', 'Test Winery', 'winery-cellar-door', 9000);
--
-- -- The honeypot is refused by the database, not by a script:
-- insert into pi.partner_enquiries
--   (enquiry_ref, business_name, business_category, compose_ms, bot_trap)
-- values ('PI-P-TEST00-0001', 'Spam Co', 'other', 9000, 'http://spam.example');
-- -- expect: new row violates check constraint "partner_enquiries_bot_trap_check"
--
-- -- So is an instant submit:
-- insert into pi.partner_enquiries
--   (enquiry_ref, business_name, business_category, compose_ms)
-- values ('PI-P-TEST00-0002', 'Spam Co', 'other', 12);
-- -- expect: new row violates check constraint "partner_enquiries_compose_ms_check"
--
-- -- Status changes accumulate rather than overwrite:
-- update pi.partner_enquiries set status = 'in-review' where enquiry_ref = 'PI-P-TEST00-0000';
-- update pi.partner_enquiries set status = 'contacted' where enquiry_ref = 'PI-P-TEST00-0000';
-- select event_type, from_status, to_status from pi.partner_enquiry_events
--   where enquiry_id = (select id from pi.partner_enquiries where enquiry_ref = 'PI-P-TEST00-0000')
--   order by created_at;           -- expect 3 rows, oldest 'received'
--
-- delete from pi.partner_enquiries where enquiry_ref like 'PI-P-TEST00-%';
--
--
-- ---------------------------------------------------------------------------
-- 7. Rollback
-- ---------------------------------------------------------------------------
--
-- Rollback preserves live enquiries: do NOT drop these tables while the queue
-- holds unanswered ones. Take a snapshot first (Database -> Backups, or
-- pg_dump --schema=pi) and export pi.partner_enquiries plus its contacts
-- before doing anything.
--
-- The safe rollback is to revert the form on /partners/ so intake stops, and
-- leave the tables in place until the queue is drained. Reverting the page
-- alone is safe at any time: the page is a static build and the tables do not
-- depend on it.
--
-- If the tables really must go, reverse order:
--
-- drop policy if exists "partner_enquiry_events_select_own_by_user"    on pi.partner_enquiry_events;
-- drop policy if exists "partner_enquiry_events_editor_insert"         on pi.partner_enquiry_events;
-- drop policy if exists "partner_enquiry_events_editor_select"         on pi.partner_enquiry_events;
-- drop policy if exists "partner_enquiry_contacts_editor_all"          on pi.partner_enquiry_contacts;
-- drop policy if exists "partner_enquiry_contacts_anonymous_insert"    on pi.partner_enquiry_contacts;
-- drop policy if exists "partner_enquiries_editor_all"                 on pi.partner_enquiries;
-- drop policy if exists "partner_enquiries_select_own_by_user"         on pi.partner_enquiries;
-- drop policy if exists "partner_enquiries_anonymous_insert"           on pi.partner_enquiries;
--
-- drop trigger  if exists partner_enquiry_events_append_only on pi.partner_enquiry_events;
-- drop function if exists pi.partner_enquiry_events_append_only();
-- drop trigger  if exists partner_enquiry_contacts_mark_contact on pi.partner_enquiry_contacts;
-- drop function if exists pi.partner_enquiry_contacts_mark_contact();
-- drop trigger  if exists partner_enquiries_log_transition on pi.partner_enquiries;
-- drop function if exists pi.partner_enquiries_log_transition();
-- drop trigger  if exists partner_enquiries_log_intake on pi.partner_enquiries;
-- drop function if exists pi.partner_enquiries_log_intake();
-- drop trigger  if exists partner_enquiries_set_updated_at on pi.partner_enquiries;
-- drop function if exists pi.partner_enquiries_set_updated_at();
--
-- drop table if exists pi.partner_enquiry_events;
-- drop table if exists pi.partner_enquiry_contacts;
-- drop table if exists pi.partner_enquiries;
