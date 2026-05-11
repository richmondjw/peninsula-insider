-- Migration: PI CMS founding-editor seed
-- Date: 2026-05-10 (email corrected 2026-05-11)
-- Purpose: idempotently grant James (james@peninsulainsider.com.au) admin +
--          publish rights on the CMS so the hybrid admin layer is usable
--          end-to-end.
-- Prereq:  2026-05-09-pi-cms-admin.sql has been applied AND James has signed
--          in to /admin/login at least once so an auth.users row exists.
--
-- Re-running is safe. If the auth.users row does not exist yet, this script
-- raises a NOTICE and exits without changing anything — that is the signal to
-- sign in once at /admin/login and re-run.

do $$
declare
  founding_email text := 'james@peninsulainsider.com.au';
  uid           uuid;
begin
  select u.id into uid
    from auth.users u
   where lower(u.email) = lower(founding_email)
   limit 1;

  if uid is null then
    raise notice
      'No auth.users row for %. Sign in to /admin/login once with this email, then re-run this migration.',
      founding_email;
    return;
  end if;

  -- 1. pi.profiles — flip is_editor on (creates row if missing).
  insert into pi.profiles (id, is_editor)
  values (uid, true)
  on conflict (id) do update
     set is_editor = true;

  -- 2. pi.admin_user_allowlist — admin role, publish rights, audit-friendly.
  insert into pi.admin_user_allowlist (user_id, email, role, can_publish, notes)
  values (uid, founding_email, 'admin', true, 'Founding editor seeded via 2026-05-10-pi-cms-seed-founding-editor.sql')
  on conflict (user_id) do update
     set email       = excluded.email,
         role        = 'admin',
         can_publish = true,
         notes       = coalesce(pi.admin_user_allowlist.notes, excluded.notes);

  raise notice 'Seeded founding editor: % (uid=%).', founding_email, uid;
end $$;
