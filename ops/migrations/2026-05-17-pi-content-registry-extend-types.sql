-- Migration: extend pi.content_registry + cms_text_fields + cms_image_slots
--            entity_type CHECK constraints to include quick-note and
--            local-secret.
-- Date: 2026-05-17
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Phase D follow-up to Phase B (vault: 07-projects/peninsula-insider/
-- data-architecture-assessment-2026-05-16.md). The Phase B projector
-- populates 21 collections, but `quick-note` (59 entities) and
-- `local-secret` (0 entities today, grows from reader submissions) were
-- rejected by the pre-existing constraint set on 2026-05-11. This
-- migration adds them.
--
-- Idempotent: drop + recreate the CHECK constraints.

alter table pi.content_registry drop constraint if exists content_registry_entity_type_check;
alter table pi.content_registry
  add constraint content_registry_entity_type_check
  check (entity_type in (
    'article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package', 'quick-note', 'local-secret'
  ));

alter table pi.cms_image_slots drop constraint if exists cms_image_slots_entity_type_check;
alter table pi.cms_image_slots
  add constraint cms_image_slots_entity_type_check
  check (entity_type in (
    'article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package', 'quick-note', 'local-secret'
  ));

alter table pi.cms_text_fields drop constraint if exists cms_text_fields_entity_type_check;
alter table pi.cms_text_fields
  add constraint cms_text_fields_entity_type_check
  check (entity_type in (
    'article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package', 'quick-note', 'local-secret'
  ));
