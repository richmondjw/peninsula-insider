-- VERIFICATION SCRIPT -- NOT A MIGRATION. Read-only. Changes nothing.
-- Date: 2026-09-14
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Ticket: PI-021 / action register A5
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS IS FOR
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The repository's migrations describe a privilege-escalation path. Nobody can
-- say from the repository alone whether the live database has it, because the
-- migrations are hand-applied SQL with no tracked ledger: any of them may have
-- been applied, partially applied, superseded by hand, or never run.
--
-- This script answers that question and nothing else. Run it against the live
-- project and the six checks below say, each in its own words, whether the
-- path is open. Every statement is a SELECT, except check 3, which is wrapped
-- in a transaction that ends in ROLLBACK.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- THE PATH, AS THE REPOSITORY DESCRIBES IT
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. ops/migrations/2026-05-05-CONSOLIDATED-phases-3-and-4.sql, line 72:
--
--      grant select, insert, update, delete on pi.profiles to authenticated;
--
--    A table-level UPDATE grant. No column list, so it covers every column,
--    including `is_editor`.
--
-- 2. Same file, line 83:
--
--      create policy "profiles_self_update" on pi.profiles for update
--        using (id = auth.uid()) with check (id = auth.uid());
--
--    The policy constrains the ROW, not the columns -- Postgres RLS cannot
--    constrain columns, which is exactly why the grant above has to. So a
--    signed-in reader may update their own row, and `is_editor` is a column on
--    their own row.
--
-- 3. next/src/lib/auth.ts ships `updateProfile(userId, patch: Partial<Profile>)`
--    to the browser, and `Profile` includes `is_editor: boolean`. The client
--    bundle therefore contains a typed helper for the write.
--
-- 4. ops/migrations/2026-05-11-pi-cms-strict-allowlist-gate.sql documents this
--    exact hole in its own header -- and fixes it only for pi.is_cms_admin()
--    and pi.can_publish_cms(), the two CMS gate functions. Everything else
--    that gates on the flag was left alone.
--
-- Which leaves these policies reachable by a self-flipped flag, all of them
-- written as `exists (select 1 from pi.profiles p where p.id = auth.uid() and
-- p.is_editor = true)`:
--
--   pi.submissions              submissions_editor_all              ALL
--   pi.award_categories         award_categories_editor_write       ALL
--   pi.award_nominees           award_nominees_editor_write         ALL
--   pi.award_votes              award_votes_editor_read             SELECT
--   pi.award_nominations        award_nominations_editor_read       SELECT
--   pi.pass_subscriptions       pass_subscriptions_editor_all       ALL
--   pi.venue_claims             venue_claims_editor_all             ALL
--   pi.venue_change_requests    venue_change_requests_editor_all    ALL
--   pi.corrections              corrections_editor_all              ALL
--   pi.correction_reporters     correction_reporters_editor_all     ALL
--   pi.correction_events        correction_events_editor_select     SELECT
--   pi.correction_events        correction_events_editor_insert     INSERT
--   storage.objects             submissions_bucket_editor_read      SELECT
--                               (bucket_id = 'submissions')
--   pi_image.*                  editor_all, via pi_image.is_editor()  ALL
--
-- Reader-submitted material and subscriber records are the sharp end of that
-- list: pi.correction_reporters and pi.pass_subscriptions hold people who
-- contacted the publication, and pi.submissions has an attached storage
-- bucket.
--
-- One more, outside the database: next/src/lib/cms/server.ts resolveCmsAccess()
-- gates the admin UI on profiles.is_editor and, finding no allowlist row,
-- falls back to role 'editor'. So a self-flipped flag opens the admin
-- interface even where pi.is_cms_admin() would refuse the writes behind it.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- HOW TO RUN
-- ═══════════════════════════════════════════════════════════════════════════
--
--   Supabase Studio -> SQL editor for the PI auth project -> paste -> Run.
--   Studio runs the whole buffer; read the result sets in order. Or run each
--   check separately, which is easier to read.
--
--   Check 3 needs one substitution: a real auth.users id that is NOT an
--   editor. Check 4 will give you the list of ids that ARE editors; pick
--   anything else.
--
-- READING THE RESULT: checks 1, 2, 3 and 4 each return a `verdict` column.
-- Any single FAIL means the escalation path is open in the live database.
-- Checks 5 and 6 are inventory -- they size the blast radius, and have no
-- pass or fail of their own.


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK 1 -- can `authenticated` write the is_editor column at all?
-- ═══════════════════════════════════════════════════════════════════════════
-- This is the root of it. If the role cannot UPDATE that column, no policy
-- below matters.
--
--   PASS: one row, verdict 'PASS - authenticated cannot UPDATE is_editor'.
--   FAIL: one row, verdict 'FAIL - ...', and the path is open.

select
  case when count(*) = 0
    then 'PASS - authenticated cannot UPDATE pi.profiles.is_editor'
    else 'FAIL - authenticated holds UPDATE on pi.profiles.is_editor'
  end                                   as verdict,
  count(*)                              as grant_rows,
  coalesce(string_agg(distinct grantor, ', '), '(none)') as granted_by
from information_schema.column_privileges
where table_schema   = 'pi'
  and table_name     = 'profiles'
  and column_name    = 'is_editor'
  and privilege_type = 'UPDATE'
  and grantee in ('authenticated', 'anon', 'PUBLIC');


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK 2 -- is RLS on, and what does the self-update policy actually say?
-- ═══════════════════════════════════════════════════════════════════════════
-- A row-scoped UPDATE policy is not a column guard and is not meant to be.
-- This check exists to confirm the live policy is the row-scoped one the
-- repository describes, and to print it so there is no ambiguity about what
-- is deployed.
--
--   PASS: rls_enabled = true AND no UPDATE policy exists for a non-service
--         role, OR check 1 passed (the grant is what does the work).
--   FAIL: an UPDATE policy scoped only by `id = auth.uid()` while check 1
--         reported FAIL.

select
  c.relrowsecurity                             as rls_enabled,
  c.relforcerowsecurity                        as rls_forced,
  p.policyname,
  p.cmd,
  p.roles::text                                as applies_to,
  p.qual                                       as using_expression,
  p.with_check                                 as with_check_expression,
  case
    when p.cmd = 'UPDATE' and p.qual ilike '%auth.uid()%' and p.qual not ilike '%is_editor%'
      then 'ROW-SCOPED ONLY - constrains which row, not which columns'
    else '(informational)'
  end                                          as note
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'pi' and c.relname = 'profiles'
order by p.cmd, p.policyname;


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK 3 -- the decisive one: try the escalation, then roll it back
-- ═══════════════════════════════════════════════════════════════════════════
-- Checks 1 and 2 read the configuration. This one performs the actual write a
-- signed-in reader would perform, as that reader, and rolls it back. It is the
-- only check that cannot be wrong about the live behaviour.
--
-- SUBSTITUTE: replace both copies of 00000000-0000-0000-0000-000000000000
-- with a real auth.users id that is NOT currently an editor (check 4 lists the
-- ones that are).
--
--   PASS: the UPDATE raises `permission denied for table profiles` (or
--         updates 0 rows). The transaction aborts; the ROLLBACK is harmless.
--   FAIL: the UPDATE reports `UPDATE 1` and the SELECT shows is_editor = true.
--         A signed-in reader can make themselves an editor.
--
-- Either way nothing is committed. Run it inside one transaction exactly as
-- written; do not run the UPDATE on its own.

begin;

  set local role authenticated;

  -- Both forms are set because auth.uid() has been defined against each
  -- across Supabase versions; setting both makes the check version-proof.
  set local request.jwt.claims     = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
  set local request.jwt.claim.sub  = '00000000-0000-0000-0000-000000000000';

  -- Sanity: this must return the id you substituted. If it returns NULL the
  -- claim did not take and the rest of this check proves nothing.
  select auth.uid() as acting_as;

  update pi.profiles
     set is_editor = true
   where id = auth.uid();

  select
    case when bool_or(is_editor) then 'FAIL - a signed-in reader can grant themselves is_editor'
         else 'PASS - the write did not take' end as verdict
  from pi.profiles
  where id = auth.uid();

rollback;


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK 4 -- who carries the editor flag right now, and is it accounted for?
-- ═══════════════════════════════════════════════════════════════════════════
-- The allowlist (pi.admin_user_allowlist) is the intended source of truth for
-- admin access since 2026-05-11. An account with is_editor = true and no
-- allowlist row is either an unmigrated legacy editor or a self-flip. Both
-- want explaining; neither can be told from the other by SQL alone, so this
-- returns the list and the date, and a human decides.
--
--   PASS: zero rows.
--   FAIL: any row. Read `flag_set_after_allowlist_migration` first.

select
  p.id,
  u.email,
  p.created_at                                  as profile_created,
  u.last_sign_in_at,
  (a.user_id is not null)                       as on_allowlist,
  a.role                                        as allowlist_role,
  (p.created_at > timestamptz '2026-05-11')     as profile_created_after_allowlist_migration,
  case when a.user_id is null
    then 'UNACCOUNTED - editor flag with no allowlist row'
    else 'accounted for' end                    as verdict
from pi.profiles p
join auth.users u on u.id = p.id
left join pi.admin_user_allowlist a on a.user_id = p.id
where p.is_editor = true
order by p.created_at;

-- And the count, for the one-line answer to "does any account carry it":
select count(*) filter (where is_editor)        as accounts_with_editor_flag,
       count(*)                                 as accounts_total
from pi.profiles;


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK 5 -- inventory: what a self-flipped flag would actually unlock
-- ═══════════════════════════════════════════════════════════════════════════
-- Every live policy whose expression consults the flag, in any schema. Only
-- meaningful if checks 1 or 3 reported FAIL; then this is the blast radius,
-- read from the database rather than from the repository, so a policy applied
-- by hand and never committed still shows up.
--
-- No pass or fail. Compare it against the list in the header of this file:
-- anything present here and absent there was applied out of band.

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles::text                                   as applies_to,
  left(coalesce(qual, '') || ' | ' || coalesce(with_check, ''), 200) as expression
from pg_policies
where coalesce(qual, '') || coalesce(with_check, '') ilike '%is_editor%'
order by schemaname, tablename, cmd, policyname;


-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK 6 -- inventory: who can read pi.profiles
-- ═══════════════════════════════════════════════════════════════════════════
-- `profiles_public_read` is `using (true)` and anon holds SELECT, so the
-- profile table -- display_name, bio, and the is_editor flag itself -- is
-- world-readable. That is not the escalation, but it is how an attacker would
-- confirm the flag took, and it is a disclosure question of its own.
--
-- No pass or fail. It records what is true.

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'pi'
  and table_name   = 'profiles'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, privilege_type;


-- ═══════════════════════════════════════════════════════════════════════════
-- IF THE CHECKS SAY FAIL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The shape of the fix, for reference. DO NOT RUN IT FROM HERE -- it belongs
-- in a dated migration of its own, after somebody has confirmed the column
-- list against the live table and checked that nothing writes is_editor
-- through the anon/authenticated roles legitimately.
--
--   revoke update on pi.profiles from authenticated;
--   grant update (display_name, avatar_url, bio, newsletter_optin)
--     on pi.profiles to authenticated;
--
-- Column-level grants are the only mechanism that works here: RLS scopes rows,
-- never columns, so `profiles_self_update` cannot be tightened to do this job.
--
-- Two things want doing alongside it, and neither is covered by the grant:
--
--   - next/src/lib/auth.ts `updateProfile(userId, patch: Partial<Profile>)`
--     should take a narrowed patch type that cannot name is_editor, so the
--     client bundle stops shipping the shape of the write.
--   - next/src/lib/cms/server.ts resolveCmsAccess() should require the
--     allowlist row rather than defaulting an allowlist-less editor to role
--     'editor'.
