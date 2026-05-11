-- Migration: PI CMS admin recursion fix + user_saves UPDATE policy
-- Date: 2026-05-11
--
-- Storage uploads to cms-assets were returning 500 with
-- "stack depth limit exceeded" because:
--   1. storage policy `cms_assets_editor_insert` calls pi.is_cms_admin()
--   2. pi.is_cms_admin() reads pi.admin_user_allowlist
--   3. pi.admin_user_allowlist has RLS that itself calls pi.is_cms_admin()
--      → infinite recursion through the RLS engine
--
-- The earlier `2026-05-11-pi-cms-strict-allowlist-gate.sql` introduced this
-- by removing the pi.profiles reference from the function body — the old
-- definition read profiles first, which short-circuited before hitting the
-- recursive table.
--
-- Fix: SECURITY DEFINER on both helper functions. The function-owner's
-- privileges bypass RLS on pi.admin_user_allowlist, breaking the cycle.
-- search_path is pinned per the function_search_path_mutable advisor lint.
--
-- Also fixes a related issue surfaced in the same debugging session: the
-- CloudSync layer upserts into pi.user_saves with `onConflict`, which can
-- trigger an UPDATE statement, but pi.user_saves had only INSERT/SELECT/
-- DELETE policies — UPDATE was implicitly blocked. Adds the matching
-- self-row UPDATE policy.

create or replace function pi.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = pi, public, pg_catalog
as $$
  select exists (
    select 1
    from pi.admin_user_allowlist a
    where a.user_id = auth.uid()
      and a.role in ('editor', 'publisher', 'admin')
  );
$$;

create or replace function pi.can_publish_cms()
returns boolean
language sql
stable
security definer
set search_path = pi, public, pg_catalog
as $$
  select exists (
    select 1
    from pi.admin_user_allowlist a
    where a.user_id = auth.uid()
      and (a.can_publish = true or a.role in ('publisher', 'admin'))
  );
$$;

drop policy if exists "user_saves_update_own" on pi.user_saves;
create policy "user_saves_update_own"
  on pi.user_saves for update
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
