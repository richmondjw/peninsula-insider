-- Migration: PI CMS strict allowlist gate
-- Date: 2026-05-11
-- Purpose: tighten pi.is_cms_admin() to require an explicit
--          pi.admin_user_allowlist row, not just pi.profiles.is_editor=true.
--
-- Why: pi.profiles has a `profiles_self_update` RLS policy that lets any
-- signed-in user UPDATE their own row, including `is_editor`. Combined with
-- the original gate function — which only required `is_editor=true` when no
-- allowlist row existed — this created a privilege-escalation path: any
-- magic-link signin → flip is_editor true on yourself → admin access.
--
-- The fix makes the allowlist the sole source of truth for admin access.
-- Editors are added explicitly via pi.admin_user_allowlist.
--
-- Idempotent: replaces the two helper functions; no data changes.

create or replace function pi.is_cms_admin()
returns boolean
language sql
stable
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
set search_path = pi, public, pg_catalog
as $$
  select exists (
    select 1
    from pi.admin_user_allowlist a
    where a.user_id = auth.uid()
      and (a.can_publish = true or a.role in ('publisher', 'admin'))
  );
$$;
