-- NOT INSTALLED. Isolated integration candidate; no migration runner imports it.
-- Replace __SCHEMA__ with a reviewed target schema. No GRANT or DEFINER functions.
-- Semantic publication/occurrence admission remains the shared canonical writer
-- and reader's responsibility; this boundary independently enforces immutable
-- inventory/revision/vector bindings, predecessor CAS and one atomic publication.
BEGIN;
CREATE TABLE "__SCHEMA__".concierge_snapshots (
 token text PRIMARY KEY CHECK(token ~ '^[a-f0-9]{64}$'),
 payload text NOT NULL CHECK(octet_length(payload)<=16777216),
 CHECK(token=encode(sha256(convert_to(payload,'UTF8')),'hex'))
);
CREATE TABLE "__SCHEMA__".concierge_snapshot_active (
 singleton boolean PRIMARY KEY CHECK(singleton),
 token text REFERENCES "__SCHEMA__".concierge_snapshots(token)
);
INSERT INTO "__SCHEMA__".concierge_snapshot_active VALUES(true,NULL);
ALTER TABLE "__SCHEMA__".concierge_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE "__SCHEMA__".concierge_snapshot_active ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "__SCHEMA__".concierge_snapshots,"__SCHEMA__".concierge_snapshot_active FROM PUBLIC;

CREATE FUNCTION "__SCHEMA__".concierge_snapshot_assert(ok boolean, reason text)
RETURNS void LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'snapshot validation: %',reason; END IF; END;
$$;

CREATE FUNCTION "__SCHEMA__".concierge_snapshot_validate(p_token text,p_payload text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE raw json; d jsonb; m jsonb; src jsonb; rec jsonb; outcome jsonb; item jsonb;
 raw_rec json; raw_source json; ids text[]; index_ids text[]; previous_ids text[];
 seen text[] := ARRAY[]::text[]; cursor_value text; previous_cursor text; page_ids text[] := ARRAY[]::text[];
 n integer; vector_row jsonb; records_by_id jsonb; record_digests jsonb; outcomes_by_id jsonb; indexes_by_id jsonb; vectors_by_id jsonb;
BEGIN
 PERFORM "__SCHEMA__".concierge_snapshot_assert(p_token=encode(sha256(convert_to(p_payload,'UTF8')),'hex') AND octet_length(p_payload)<=16777216,'payload digest/size');
 raw:=p_payload::json; d:=raw::jsonb; m:=d->'manifest';
 PERFORM "__SCHEMA__".concierge_snapshot_assert(d->'version'='1'::jsonb AND d->'dimensions'='1024'::jsonb AND jsonb_typeof(m)='object','version/dimensions/manifest');
 PERFORM "__SCHEMA__".concierge_snapshot_assert(d->'predecessorToken'='null'::jsonb OR d->>'predecessorToken' ~ '^[a-f0-9]{64}$','predecessor token');
 PERFORM "__SCHEMA__".concierge_snapshot_assert(m->'schemaVersion'='1'::jsonb AND m->>'state'='complete' AND m->'failures'='[]'::jsonb AND m->'lockHeld'='true'::jsonb,'manifest completeness');
 FOREACH cursor_value IN ARRAY ARRAY['id','sourceRevision','sourceDigest'] LOOP
  PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(m->cursor_value)='string' AND length(m->>cursor_value)>0,'manifest identity');
 END LOOP;
 FOREACH cursor_value IN ARRAY ARRAY['indexSchema','embeddingModel','promptRevision','appRevision'] LOOP
  PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(m->'bundle'->cursor_value)='string' AND length(m->'bundle'->>cursor_value)>0,'bundle');
 END LOOP;
 FOREACH cursor_value IN ARRAY ARRAY['sourceVerifiedAt','contentPublishedAt','ingestedAt','retrievedAt'] LOOP
  PERFORM "__SCHEMA__".concierge_snapshot_assert(m ? cursor_value,'missing freshness field');
  IF m->cursor_value='null'::jsonb THEN
   PERFORM "__SCHEMA__".concierge_snapshot_assert(cursor_value IN ('sourceVerifiedAt','contentPublishedAt'),'unknown ingestion clock');
  ELSE
   PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(m->cursor_value)='string' AND (m->>cursor_value)::timestamptz IS NOT NULL,'freshness timestamp');
  END IF;
 END LOOP;
 PERFORM "__SCHEMA__".concierge_snapshot_assert((m->>'retrievedAt')::timestamptz >= (m->>'ingestedAt')::timestamptz,'freshness order');
 FOREACH cursor_value IN ARRAY ARRAY['sourceRecords','outcomes','indexRows','pages','previousIndexedIds','removedIds'] LOOP
  PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(m->cursor_value)='array','manifest array');
 END LOOP;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(d->'records')='array' AND jsonb_typeof(d->'embeddings')='array','payload arrays');
 PERFORM "__SCHEMA__".concierge_snapshot_assert(m->>'sourceDigest'=encode(sha256(convert_to((raw->'manifest'->'sourceRecords')::text,'UTF8')),'hex'),'source inventory digest');
 SELECT coalesce(array_agg(x->>'id'),ARRAY[]::text[]) INTO ids FROM jsonb_array_elements(m->'sourceRecords') x;
 SELECT coalesce(array_agg(x->>'id'),ARRAY[]::text[]) INTO index_ids FROM jsonb_array_elements(m->'indexRows') x;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(cardinality(ids)=jsonb_array_length(d->'records') AND cardinality(ids)=jsonb_array_length(m->'outcomes') AND cardinality(index_ids)=jsonb_array_length(d->'embeddings'),'inventory counts');
 FOREACH cursor_value IN ARRAY ARRAY['sourceRecords','outcomes','indexRows'] LOOP
  SELECT count(DISTINCT x->>'id') INTO n FROM jsonb_array_elements(m->cursor_value) x WHERE jsonb_typeof(x->'id')='string' AND length(x->>'id')>0;
  PERFORM "__SCHEMA__".concierge_snapshot_assert(n=jsonb_array_length(m->cursor_value),'duplicate/invalid inventory ids');
 END LOOP;
 SELECT count(DISTINCT x->>'id') INTO n FROM jsonb_array_elements(d->'records') x WHERE jsonb_typeof(x->'id')='string' AND length(x->>'id')>0;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(n=cardinality(ids),'duplicate record ids');
 SELECT count(DISTINCT x->>'id') INTO n FROM jsonb_array_elements(d->'embeddings') x;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(n=cardinality(index_ids),'duplicate embedding ids');
 SELECT jsonb_object_agg(value->>'id',value) INTO records_by_id FROM jsonb_array_elements(d->'records');
 SELECT jsonb_object_agg(value->>'id',encode(sha256(convert_to(value::text,'UTF8')),'hex')) INTO record_digests FROM json_array_elements(raw->'records');
 SELECT jsonb_object_agg(value->>'id',value) INTO outcomes_by_id FROM jsonb_array_elements(m->'outcomes');
 SELECT jsonb_object_agg(value->>'id',value) INTO indexes_by_id FROM jsonb_array_elements(m->'indexRows');
 SELECT jsonb_object_agg(value->>'id',value) INTO vectors_by_id FROM jsonb_array_elements(d->'embeddings');
 FOR raw_source IN SELECT value FROM json_array_elements(raw->'manifest'->'sourceRecords') LOOP
  src:=raw_source::jsonb;
  PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(src->'revision')='string' AND jsonb_typeof(src->'effectiveRevision')='string' AND length(src->>'revision')>0 AND length(src->>'effectiveRevision')>0 AND src->>'payloadDigest' ~ '^[a-f0-9]{64}$' AND src->>'admission' IN ('index','exclude'),'source admission');
  rec:=records_by_id->(src->>'id');
  PERFORM "__SCHEMA__".concierge_snapshot_assert(rec->'revision'=src->'effectiveRevision' AND src->>'payloadDigest'=record_digests->>(src->>'id'),'record revision/payload');
  PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(rec->'data')='object' AND jsonb_typeof(rec->'data'->'title')='string' AND length(btrim(rec->'data'->>'title'))>0,'record data');
  PERFORM "__SCHEMA__".concierge_snapshot_assert(rec->'verifiedAt'='null'::jsonb OR (rec->>'verifiedAt' ~ '^\d{4}-\d{2}-\d{2}T' AND (rec->>'verifiedAt')::timestamptz IS NOT NULL),'record source clock');
  IF rec ? 'validUntil' THEN PERFORM "__SCHEMA__".concierge_snapshot_assert(rec->>'validUntil' ~ '^\d{4}-\d{2}-\d{2}T' AND (rec->>'validUntil')::timestamptz IS NOT NULL,'record expiry'); END IF;
  outcome:=outcomes_by_id->(src->>'id');
  IF src->>'admission'='exclude' THEN
   PERFORM "__SCHEMA__".concierge_snapshot_assert(length(src->>'exclusionReason')>0 AND outcome->>'status'='excluded' AND outcome->>'reason'=src->>'exclusionReason' AND NOT(src->>'id'=ANY(index_ids)),'exclusion');
  ELSE
   item:=indexes_by_id->(src->>'id');
   PERFORM "__SCHEMA__".concierge_snapshot_assert(outcome->>'status'='indexed' AND outcome->'revision'=src->'effectiveRevision' AND item->'revision'=src->'effectiveRevision','indexed revision');
   vector_row:=vectors_by_id->(src->>'id');
   PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_typeof(vector_row->'vector')='array' AND jsonb_array_length(vector_row->'vector')=1024,'embedding dimensions');
   PERFORM "__SCHEMA__".concierge_snapshot_assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(vector_row->'vector') x WHERE jsonb_typeof(x)<>'number'),'embedding values');
   -- textDigest is over JSON.stringify(title + newline + summary), not raw text.
   PERFORM "__SCHEMA__".concierge_snapshot_assert(vector_row->>'textDigest'=encode(sha256(convert_to(to_json((rec->'data'->>'title')||chr(10)||coalesce(rec->'data'->>'summary',''))::text,'UTF8')),'hex'),'embedding text');
  END IF;
 END LOOP;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(NOT EXISTS(SELECT 1 FROM unnest(index_ids) id WHERE NOT(id=ANY(ids))),'unexpected index id');
 PERFORM "__SCHEMA__".concierge_snapshot_assert(jsonb_array_length(m->'pages')>0,'missing pages');
 previous_cursor:=NULL;
 FOR item IN SELECT value FROM jsonb_array_elements(m->'pages') LOOP
  PERFORM "__SCHEMA__".concierge_snapshot_assert(item ? 'cursor' AND item ? 'nextCursor' AND item->>'snapshot'=m->>'sourceRevision' AND jsonb_typeof(item->'ids')='array','page schema');
  cursor_value:=item->>'cursor';
  PERFORM "__SCHEMA__".concierge_snapshot_assert(cursor_value IS NOT DISTINCT FROM previous_cursor,'page chain');
  PERFORM "__SCHEMA__".concierge_snapshot_assert(NOT(coalesce(cursor_value,'<initial>')=ANY(seen)),'page repetition');
  seen:=array_append(seen,coalesce(cursor_value,'<initial>'));
  PERFORM "__SCHEMA__".concierge_snapshot_assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(item->'ids') x WHERE jsonb_typeof(x)<>'string'),'page id types');
  SELECT page_ids||coalesce(array_agg(value),ARRAY[]::text[]) INTO page_ids FROM jsonb_array_elements_text(item->'ids');
  previous_cursor:=item->>'nextCursor';
 END LOOP;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(previous_cursor IS NULL AND page_ids=ids,'exhaustive pages');
 FOREACH cursor_value IN ARRAY ARRAY['previousIndexedIds','removedIds'] LOOP
  PERFORM "__SCHEMA__".concierge_snapshot_assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(m->cursor_value) x WHERE jsonb_typeof(x)<>'string'),'deletion id types');
  SELECT count(DISTINCT value) INTO n FROM jsonb_array_elements_text(m->cursor_value) WHERE length(value)>0;
  PERFORM "__SCHEMA__".concierge_snapshot_assert(n=jsonb_array_length(m->cursor_value),'deletion ids');
 END LOOP;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(
  ARRAY(SELECT value FROM jsonb_array_elements_text(m->'previousIndexedIds') WHERE NOT(value=ANY(index_ids)) ORDER BY value)=
  ARRAY(SELECT value FROM jsonb_array_elements_text(m->'removedIds') ORDER BY value),'deletion accounting');
 RETURN d;
END;
$$;

CREATE FUNCTION "__SCHEMA__".concierge_snapshot_capabilities()
RETURNS TABLE(protocol text,"atomicCommit" boolean,"retainedRollback" boolean,"generationSearch" boolean)
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT 'concierge-snapshot-v1'::text,true,true,false; $$;

CREATE FUNCTION "__SCHEMA__".concierge_snapshot_read(snapshot_token text DEFAULT NULL)
RETURNS TABLE(token text,payload text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT s.token,s.payload FROM "__SCHEMA__".concierge_snapshots s
 WHERE s.token=coalesce(snapshot_token,(SELECT a.token FROM "__SCHEMA__".concierge_snapshot_active a WHERE singleton));
$$;

CREATE FUNCTION "__SCHEMA__".concierge_snapshot_commit(expected_token text,snapshot_token text,snapshot_payload text,operation text DEFAULT 'forward',runtime_bundle jsonb DEFAULT NULL)
RETURNS TABLE(committed boolean,retry boolean,token text) LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE candidate jsonb; current_token text; current_payload text; current_doc jsonb; retained_payload text; previous_digest text;
BEGIN
 candidate:="__SCHEMA__".concierge_snapshot_validate(snapshot_token,snapshot_payload);
 SELECT a.token INTO current_token FROM "__SCHEMA__".concierge_snapshot_active a WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing active snapshot slot'; END IF;
 SELECT s.payload INTO current_payload FROM "__SCHEMA__".concierge_snapshots s WHERE s.token=current_token;
 IF current_token IS NOT NULL THEN current_doc:="__SCHEMA__".concierge_snapshot_validate(current_token,current_payload); END IF;
 SELECT s.payload INTO retained_payload FROM "__SCHEMA__".concierge_snapshots s WHERE s.token=snapshot_token;
 IF retained_payload IS NOT NULL THEN
  PERFORM "__SCHEMA__".concierge_snapshot_validate(snapshot_token,retained_payload);
  PERFORM "__SCHEMA__".concierge_snapshot_assert(retained_payload=snapshot_payload,'retained payload');
 END IF;
 IF current_token=snapshot_token THEN RETURN QUERY SELECT true,true,snapshot_token;RETURN;END IF;
 PERFORM "__SCHEMA__".concierge_snapshot_assert(current_token IS NOT DISTINCT FROM expected_token,'predecessor changed');
 IF operation='rollback' THEN
  PERFORM "__SCHEMA__".concierge_snapshot_assert(current_token IS NOT NULL AND retained_payload IS NOT NULL AND runtime_bundle=candidate->'manifest'->'bundle','retained rollback/runtime bundle');
 ELSE
  PERFORM "__SCHEMA__".concierge_snapshot_assert(operation='forward' AND candidate->>'predecessorToken' IS NOT DISTINCT FROM expected_token,'forward predecessor');
  previous_digest:=CASE WHEN current_payload IS NULL THEN NULL ELSE encode(sha256(convert_to((current_payload::json->'manifest')::text,'UTF8')),'hex') END;
  PERFORM "__SCHEMA__".concierge_snapshot_assert(candidate->'manifest'->>'previousManifestDigest' IS NOT DISTINCT FROM previous_digest,'manifest predecessor');
  PERFORM "__SCHEMA__".concierge_snapshot_assert(current_doc IS NULL OR current_doc->'manifest'->>'id'<>candidate->'manifest'->>'id','snapshot id reuse');
  PERFORM "__SCHEMA__".concierge_snapshot_assert(
   ARRAY(SELECT value FROM jsonb_array_elements_text(candidate->'manifest'->'previousIndexedIds') ORDER BY value)=
   ARRAY(SELECT value->>'id' FROM jsonb_array_elements(coalesce(current_doc->'manifest'->'indexRows','[]'::jsonb)) ORDER BY value->>'id'),'previous index binding');
 END IF;
 IF retained_payload IS NULL THEN INSERT INTO "__SCHEMA__".concierge_snapshots VALUES(snapshot_token,snapshot_payload); END IF;
 UPDATE "__SCHEMA__".concierge_snapshot_active a SET token=snapshot_token WHERE singleton;
 RETURN QUERY SELECT true,false,snapshot_token;
END;
$$;
REVOKE ALL ON FUNCTION "__SCHEMA__".concierge_snapshot_assert(boolean,text),"__SCHEMA__".concierge_snapshot_validate(text,text),"__SCHEMA__".concierge_snapshot_capabilities(),"__SCHEMA__".concierge_snapshot_read(text),"__SCHEMA__".concierge_snapshot_commit(text,text,text,text,jsonb) FROM PUBLIC;

COMMIT;
