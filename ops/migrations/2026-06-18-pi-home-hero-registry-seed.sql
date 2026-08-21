-- Homepage hero carousel: registry seed + stale-override cleanup (2026-06-18)
--
-- Pairs with the HomeHeroCarousel.astro rebuild. The carousel now resolves each
-- slide image/text from a DEDICATED CMS namespace: entity_type='page',
-- entity_slug='home-hero', field_path='slide.<id>.<field>'. Two DML changes:
--
-- 1. Seed the content_registry row for (page, home-hero). The integrity trigger
--    pi.assert_content_registry_match() requires a registry row before any CMS
--    write can save. (The 2026-06-17 self-heal trigger would also auto-register
--    on first edit, and the deploy refresh is upsert-only, so this row is
--    durable — but seed it explicitly so build-time consults and link
--    autocomplete are clean from the start.)
--
-- 2. Delete the stale page/home image overrides that were silently swapping the
--    pinned carousel images in edit mode via the editor's filename-basename
--    auto-detect ("Pass 2"). With the new explicit bindings under home-hero,
--    these are dead and must go so nothing competes. KEEP editors-letter.image
--    and every other img:* row (their basenames don't match any current slide).
--
-- Rollback (re-insert the deleted rows) — backed-up values for reference:
--   271c610e-4f76-4776-86ce-4cb26faacbe0  page/home  cover.image
--     -> cms-assets/page/home/cover.image-1779014253661.png
--   ad973945-5d25-423c-8d54-2645a3d40aa7  page/home  cover.scenes.cover.image
--     -> cdn.sanity.io/.../734dd0c3...-4032x2268.jpg (malformed slot)
--   20a95648-f4a7-4606-a8aa-36d3d544f012  page/home  img:article-flinders-weekend-01.webp
--     -> cms-assets/page/home/img-article-flinders-weekend-01.webp-1781253244948.jpg
--   51f3bad4-d9cc-4f6f-918d-25455562613a  page/home  img:article-sorrento-weekend-01.webp
--     -> cms-assets/page/home/img-article-sorrento-weekend-01.webp-1781672822373.jpg
--   b15d01f3-6480-4b6e-bf1b-ab8ca82b65ed  page/home  img:journal-late-afternoon-walks-01.webp
--     -> cms-assets/page/home/img-journal-late-afternoon-walks-01.webp-1781253296106.jpg

set search_path to pi;

-- 1. Registry seed (required before any home-hero CMS edit can save).
insert into pi.content_registry (entity_type, entity_slug, title, href, refreshed_at)
values ('page', 'home-hero', 'Homepage hero carousel', '/', now())
on conflict (entity_type, entity_slug) do update
  set title = excluded.title, href = excluded.href, refreshed_at = now();

-- 2. Delete ONLY the stale/colliding page/home rows. Keep editors-letter.image
--    and all other img:* rows.
delete from pi.cms_image_slots
where entity_type = 'page' and entity_slug = 'home'
  and field_path in (
    'cover.image',                              -- legacy hero override, no longer rendered
    'cover.scenes.cover.image',                 -- malformed slot, never resolved
    'img:article-flinders-weekend-01.webp',     -- basename collision with carousel slide
    'img:article-sorrento-weekend-01.webp',     -- basename collision with carousel slide
    'img:journal-late-afternoon-walks-01.webp'  -- basename collision with carousel slide
  );
