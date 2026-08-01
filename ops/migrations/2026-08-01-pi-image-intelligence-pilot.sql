-- Peninsula Insider image intelligence pilot. REVIEW BEFORE APPLYING.
-- Non-destructive: creates a separate schema; does not alter content, CMS slots, rights data or images.
begin;

create schema if not exists pi_image;
grant usage on schema pi_image to authenticated, service_role;

create table if not exists pi_image.assets (
  id uuid primary key default gen_random_uuid(), canonical_uri text not null, sha256 text, phash text,
  mime_type text, width integer, height integer, aspect_ratio numeric, source_system text not null,
  source_revision text not null, created_at timestamptz not null default now(), unique (source_system, canonical_uri, source_revision)
);
create unique index if not exists assets_sha256_revision on pi_image.assets (sha256, source_revision) where sha256 is not null;

create table if not exists pi_image.asset_rights (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references pi_image.assets(id), license_code text,
  credit text, source_url text, rights_status text not null check (rights_status in ('known','unknown','review-required','expired','held')),
  usage_scope text, expires_at timestamptz, verified_by uuid references auth.users(id), verified_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists pi_image.asset_metadata (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references pi_image.assets(id), version integer not null,
  state text not null check (state in ('proposed','pending_review','held','approved','rejected','superseded')),
  taxonomy_json jsonb not null default '[]', alt_text text, caption text, quality_json jsonb not null default '{}',
  safety_json jsonb not null default '{}', confidence_json jsonb not null default '{}', producer text not null,
  model_id text not null, prompt_version text not null, created_at timestamptz not null default now(), unique(asset_id, version)
);
create table if not exists pi_image.placements (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references pi_image.assets(id), entity_type text not null,
  entity_slug text not null, field_path text not null, surface text not null, slot_purpose text,
  source_system text not null, active boolean not null default true, observed_at timestamptz not null default now(),
  unique(entity_type, entity_slug, field_path, surface, source_system)
);
create table if not exists pi_image.placement_evaluations (
  id uuid primary key default gen_random_uuid(), placement_id uuid not null references pi_image.placements(id),
  metadata_id uuid references pi_image.asset_metadata(id), object_score numeric check (object_score between 0 and 1),
  category_score numeric check (category_score between 0 and 1), place_score numeric check (place_score between 0 and 1),
  mood_score numeric check (mood_score between 0 and 1), surface_score numeric check (surface_score between 0 and 1),
  collision_score numeric check (collision_score between 0 and 1), overall numeric check (overall between 0 and 1),
  state text not null, reasons jsonb not null default '[]', created_at timestamptz not null default now()
);
create table if not exists pi_image.enrichment_runs (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references pi_image.assets(id), model_id text not null,
  model_version text not null, prompt_version text not null, input_hash text not null, result_uri text,
  latency_ms integer, cost_aud numeric not null default 0 check (cost_aud >= 0), status text not null,
  error_code text, created_at timestamptz not null default now(), unique(asset_id, model_id, prompt_version, input_hash)
);
create table if not exists pi_image.review_decisions (
  id uuid primary key default gen_random_uuid(), subject_type text not null, subject_id uuid not null,
  decision text not null check (decision in ('accepted','edited','rejected','held')),
  before_json jsonb not null, after_json jsonb, reviewer uuid not null references auth.users(id), reason text,
  created_at timestamptz not null default now()
);
create table if not exists pi_image.asset_relations (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references pi_image.assets(id),
  related_asset_id uuid not null references pi_image.assets(id), relation text not null check (relation in ('exact-duplicate','near-duplicate','crop','derivative','visually-similar')),
  score numeric check (score between 0 and 1), review_state text not null default 'candidate', created_at timestamptz not null default now(),
  check(asset_id <> related_asset_id), unique(asset_id, related_asset_id, relation)
);

create or replace function pi_image.reject_review_decision_mutation() returns trigger
language plpgsql security definer set search_path = pi_image, public as $$
begin
  raise exception 'pi_image.review_decisions is append-only';
end $$;
drop trigger if exists review_decisions_append_only on pi_image.review_decisions;
create trigger review_decisions_append_only before update or delete on pi_image.review_decisions
for each row execute function pi_image.reject_review_decision_mutation();

create or replace function pi_image.guard_approved_metadata() returns trigger
language plpgsql security definer set search_path = pi_image, public as $$
begin
  if old.state = 'approved' then
    raise exception 'approved image metadata is immutable; create the next version';
  end if;
  return new;
end $$;
drop trigger if exists asset_metadata_approved_immutable on pi_image.asset_metadata;
create trigger asset_metadata_approved_immutable before update or delete on pi_image.asset_metadata
for each row execute function pi_image.guard_approved_metadata();

alter table pi_image.assets enable row level security;
alter table pi_image.asset_rights enable row level security;
alter table pi_image.asset_metadata enable row level security;
alter table pi_image.placements enable row level security;
alter table pi_image.placement_evaluations enable row level security;
alter table pi_image.enrichment_runs enable row level security;
alter table pi_image.review_decisions enable row level security;
alter table pi_image.asset_relations enable row level security;

create or replace function pi_image.is_editor() returns boolean language sql stable security definer set search_path = pi, public as
$$ select exists(select 1 from pi.profiles where id = auth.uid() and is_editor = true) $$;
revoke all on function pi_image.is_editor() from public;
grant execute on function pi_image.is_editor() to authenticated, service_role;

do $$ declare table_name text; begin
  foreach table_name in array array['assets','asset_rights','asset_metadata','placements','placement_evaluations','enrichment_runs','review_decisions','asset_relations'] loop
    execute format('drop policy if exists editor_all on pi_image.%I', table_name);
    execute format('create policy editor_all on pi_image.%I for all to authenticated using (pi_image.is_editor()) with check (pi_image.is_editor())', table_name);
    execute format('grant select, insert, update on pi_image.%I to authenticated', table_name);
    execute format('grant all on pi_image.%I to service_role', table_name);
  end loop;
end $$;
revoke update, delete on pi_image.review_decisions from authenticated;

commit;

-- Rollback (only before pilot data is relied upon):
-- begin; drop schema if exists pi_image cascade; commit;
