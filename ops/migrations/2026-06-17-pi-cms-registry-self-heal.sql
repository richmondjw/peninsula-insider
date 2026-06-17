-- Self-healing CMS content registry (2026-06-17)
--
-- Problem this fixes (recurring):
--   The inline CMS rejects image/text edits on any page whose
--   (entity_type, entity_slug) is not present in pi.content_registry. The
--   registry is repopulated by a deploy step (next/scripts/refresh-content-
--   registry.mjs) that runs continue-on-error with secrets.SUPABASE_SERVICE_KEY.
--   When that key expires the step fails SILENTLY, so every newly published
--   page becomes uneditable ("can't update the image") until someone registers
--   it by hand. This has recurred several times (saved page, page-slash
--   aliases, Sorrento Solstice article).
--
-- Fix:
--   Turn the integrity trigger from "reject if unknown" into "register, then
--   allow". The override tables (cms_image_slots, cms_text_fields) are already
--   write-gated to pi.is_cms_admin(), and the inline editor only ever emits a
--   real (entity_type, entity_slug) pair taken from a live page binding, so an
--   authorised save IS proof the page exists. Registering on first edit removes
--   the dependency on the deploy-time refresh for editability — the edit can
--   never be blocked by a stale registry again.
--
--   title/href are intentionally left null. The next successful deploy refresh
--   backfills canonical metadata. A null href keeps the self-registered row out
--   of the only runtime consumer — the inline editor's internal-link
--   autocomplete (lib/inline-edit/client.ts), which filters `href is not null`
--   — so a freshly self-registered row is invisible until it is enriched.
--
-- Rollback: restore the prior body, which raised
--   'CMS override for (%, %) refused: no matching row in pi.content_registry'
--   with errcode 'foreign_key_violation' when no row matched.
--
-- Migration history note: the trigger bindings are unchanged
--   (cms_image_slots_registry_check / cms_text_fields_registry_check,
--    BEFORE INSERT OR UPDATE FOR EACH ROW) — only the function body changes.

create or replace function pi.assert_content_registry_match()
returns trigger
language plpgsql
security definer
set search_path to 'pi', 'public', 'pg_catalog'
as $function$
begin
  -- Register the entity if we have not seen it before, then allow the write.
  -- Idempotent: an already-registered entity is a no-op and its existing
  -- title/href/refreshed_at are preserved.
  insert into pi.content_registry (entity_type, entity_slug, refreshed_at)
  values (new.entity_type, new.entity_slug, now())
  on conflict (entity_type, entity_slug) do nothing;

  return new;
end;
$function$;

comment on function pi.assert_content_registry_match() is
  'BEFORE INSERT/UPDATE guard on cms_image_slots and cms_text_fields. Self-healing (2026-06-17): registers the (entity_type, entity_slug) on first edit instead of rejecting it, so an authorised CMS edit is never blocked by a stale content_registry. Deploy-time refresh-content-registry.mjs still backfills canonical title/href.';
