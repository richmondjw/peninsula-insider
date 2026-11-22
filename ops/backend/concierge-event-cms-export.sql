-- NOT INSTALLED. Replace __SCHEMA__ with an independently reviewed schema.
-- One statement / one MVCC snapshot, one output row: no PostgREST row cap.
-- Runs as the caller; no new grants, security definer or source mutations.
BEGIN;
CREATE FUNCTION "__SCHEMA__".concierge_event_cms_export()
RETURNS TABLE(version integer, revision text, rows_payload text, row_count integer, observed_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
 WITH source AS (
  SELECT id::text, entity_type, entity_slug, field_path, field_kind, locale,
         value, status, updated_at
  FROM pi.cms_text_fields
  WHERE entity_type='event' AND status='published'
 ), packed AS (
  SELECT coalesce(json_agg(source ORDER BY id COLLATE "C"),'[]'::json)::text AS payload, count(*)::integer AS n FROM source
 ) SELECT 1, encode(sha256(convert_to(payload,'UTF8')),'hex'), payload, n, statement_timestamp() FROM packed;
$$;
REVOKE ALL ON FUNCTION "__SCHEMA__".concierge_event_cms_export() FROM PUBLIC;

COMMIT;
