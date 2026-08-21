-- ============================================================================
-- PI Campaign Factory — schema
-- Project: mvdtkgsfuhmkioygxgge (PI_Concierge — intelligence + workflow plane)
-- Date:    2026-07-28
--
-- Adds the campaign layer on top of the existing pi_work_items state machine.
-- Purely additive: no existing table is altered except pi_work_items, which
-- gains one nullable FK column (campaign_id).
--
-- Design notes
-- ------------
-- A campaign is one week, one thesis, one Featured Plan, and many assets.
-- pi_work_items already models ONE asset through a 21-state machine with
-- transition-only writes. This migration adds the parent, not a replacement.
--
-- Three-zone field discipline is documented per column:
--   FACT       verified source material, resolves to pi_claims -> pi_evidence
--   JUDGEMENT  editorial decision, human-authored or human-approved
--   GENERATED  channel copy derived from FACT + JUDGEMENT, freely regenerable
--
-- The load-bearing invariant: a GENERATED field may never assert a
-- proposition that is not traceable to a pi_campaign_signals row. That is
-- enforced in the QA layer (verify_gate.py signal-trace check), not here,
-- but the signals table is what makes it checkable.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- pi_campaigns — the canonical Content Campaign Packet
-- ---------------------------------------------------------------------------
create table if not exists public.pi_campaigns (
  id                    uuid primary key default gen_random_uuid(),
  campaign_key          text not null unique,
  publication_week      text not null,

  -- Provenance
  direction_version_id  uuid references public.pi_direction_versions(id),
  plan_id               uuid references public.pi_plans(id),
  plan_item_id          uuid references public.pi_plan_items(id),

  -- JUDGEMENT
  strategic_theme       text,
  editorial_thesis      text,
  core_promise          text,
  audience              text
    check (audience is null or audience in
      ('couples','families','friends','solo','locals','first-timers','planners')),
  angle_rationale       text,
  thesis_approved_by    text,
  thesis_approved_at    timestamptz,

  -- FACT
  featured_plan_slug    text not null,
  plan_fitness_json     jsonb not null default '{}'::jsonb,
  seasonal_context      jsonb not null default '{}'::jsonb,
  confidence            numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- Production control
  state                 text not null default 'research_received',
  risk_class            text not null default 'green'
    check (risk_class in ('green','amber','red')),
  risk_note             text,
  est_cost_usd          numeric check (est_cost_usd is null or est_cost_usd >= 0),
  actual_cost_usd       numeric check (actual_cost_usd is null or actual_cost_usd >= 0),
  blocked_reason        text,
  utm_campaign          text not null,
  correlation_id        uuid not null default gen_random_uuid(),

  -- GENERATED
  learning_notes        text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint pi_campaigns_state_chk check (state in (
    'research_received','verification_required','brief_ready','awaiting_editorial_approval',
    'in_production','media_required','qa_failed','ready_to_schedule','scheduled',
    'published','publication_failed','measuring','archived','killed')),

  -- A blocked-ish state must say why.
  constraint pi_campaigns_blocked_chk check (
    state not in ('media_required','qa_failed','publication_failed')
    or blocked_reason is not null),

  -- Nothing past approval may exist without a recorded approval.
  constraint pi_campaigns_thesis_approval_chk check (
    state in ('research_received','verification_required','brief_ready',
              'awaiting_editorial_approval','killed','archived')
    or thesis_approved_at is not null)
);

comment on table public.pi_campaigns is
  'PI Campaign Factory: one week, one thesis, one Featured Plan. Parent of pi_work_items.
   Zones: strategic_theme/editorial_thesis/core_promise/angle_rationale = JUDGEMENT
   (human-approved); featured_plan_slug/plan_fitness_json/seasonal_context = FACT;
   learning_notes = GENERATED.';

create index if not exists pi_campaigns_week_idx  on public.pi_campaigns (publication_week);
create index if not exists pi_campaigns_state_idx on public.pi_campaigns (state);
create index if not exists pi_campaigns_corr_idx  on public.pi_campaigns (correlation_id);

-- ---------------------------------------------------------------------------
-- pi_campaign_signals — the fact base every derivative must trace back to
-- ---------------------------------------------------------------------------
create table if not exists public.pi_campaign_signals (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references public.pi_campaigns(id) on delete cascade,
  claim_id         uuid references public.pi_claims(id),
  opportunity_id   uuid references public.pi_opportunities(id),
  role             text not null
    check (role in ('hook','support','timing','context','commercial','risk')),
  assertion        text not null,
  entity_slug      text,
  verification     text not null default 'unverified'
    check (verification in ('verified','single_source','unverified','contradicted','expired')),
  source_tier      smallint check (source_tier is null or (source_tier between 1 and 4)),
  source_url       text,
  verified_at      timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),

  -- The hard gate: a campaign's hook or its timing claim may never rest on
  -- unverified material. Everything else may, provided it is labelled.
  constraint pi_campaign_signals_gate_chk check (
    role not in ('hook','timing') or verification in ('verified','single_source'))
);

comment on table public.pi_campaign_signals is
  'PI Campaign Factory: FACT base for one campaign. Every proposition in every
   generated derivative must trace to a row here. role=hook/timing cannot be
   unverified (enforced).';

create index if not exists pi_campaign_signals_campaign_idx on public.pi_campaign_signals (campaign_id);
create index if not exists pi_campaign_signals_entity_idx   on public.pi_campaign_signals (entity_slug);

-- ---------------------------------------------------------------------------
-- pi_media_assets — the rights layer. Nothing publishes without a row here.
-- ---------------------------------------------------------------------------
create table if not exists public.pi_media_assets (
  id                   uuid primary key default gen_random_uuid(),
  asset_key            text not null unique,

  -- Location
  storage_path         text not null,
  public_url           text,
  derivative_of        uuid references public.pi_media_assets(id),
  content_hash         text,

  -- Subject: drives automated selection
  subject              text,
  entity_slug          text,
  place_slug           text,
  season               text check (season is null or season in
                         ('spring','summer','autumn','winter','all-year')),
  weather              text check (weather is null or weather in
                         ('clear','overcast','rain','fog','storm','mixed','n/a')),
  time_of_day          text check (time_of_day is null or time_of_day in
                         ('dawn','morning','midday','afternoon','golden','dusk','night')),
  orientation          text check (orientation is null or orientation in
                         ('landscape','portrait','square')),
  aspect_ratio         text,
  shot_type            text check (shot_type is null or shot_type in
                         ('wide','establishing','detail','portrait','interior',
                          'aerial','food','map','graphic')),
  people_present       boolean not null default false,
  people_released      boolean not null default false,
  visible_branding     text[] not null default '{}',

  -- Rights: the gate
  rights_owner         text,
  licence              text not null,
  licence_ref          text,
  licence_starts       date,
  licence_expires      date,
  attribution_text     text,
  attribution_required boolean not null default false,
  derivative_works_ok  boolean not null default false,
  permitted_channels   text[] not null default '{}',
  paid_use_ok          boolean not null default false,

  -- Generation provenance (null for captured media)
  generation_model     text,
  generation_prompt    text,
  generation_seed      text,
  source_image_id      uuid references public.pi_media_assets(id),
  generation_cost_usd  numeric,

  -- Governance
  approval_status      text not null default 'pending'
    check (approval_status in ('pending','approved','rejected','expired','quarantined')),
  approved_by          text,
  approved_at          timestamptz,
  quality_score        numeric check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  quality_notes        text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Generated media must carry its provenance. Non-negotiable.
  constraint pi_media_generated_provenance_chk check (
    licence <> 'generative' or (generation_model is not null and generation_prompt is not null)),

  -- An approved asset showing identifiable people needs a release on file.
  constraint pi_media_people_chk check (
    people_present = false or people_released = true or approval_status <> 'approved'),

  -- You may not derive from an asset whose licence forbids derivative works.
  constraint pi_media_derivative_chk check (
    derivative_of is null or derivative_works_ok = true),

  -- An approved asset may not be past its licence expiry.
  constraint pi_media_expiry_chk check (
    licence_expires is null or approval_status <> 'approved' or licence_expires > current_date)
);

comment on table public.pi_media_assets is
  'PI Campaign Factory: media rights registry. permitted_channels is the gate -
   an asset may only be used on a channel named in that array. derivative_works_ok
   gates cropping, reframing, and image-to-video. Generated assets must record
   generation_model + generation_prompt (enforced).';

create index if not exists pi_media_assets_entity_idx  on public.pi_media_assets (entity_slug);
create index if not exists pi_media_assets_licence_idx on public.pi_media_assets (licence);
create index if not exists pi_media_assets_channels_idx on public.pi_media_assets using gin (permitted_channels);

-- ---------------------------------------------------------------------------
-- pi_campaign_assets — one row per channel deliverable
-- ---------------------------------------------------------------------------
create table if not exists public.pi_campaign_assets (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references public.pi_campaigns(id) on delete cascade,
  work_item_id     uuid references public.pi_work_items(id),
  channel          text not null check (channel in (
                     'site_plan','site_article','site_whats_on','site_home','site_links',
                     'email','ig_carousel','ig_reel','ig_story','facebook','linkedin',
                     'video_master','video_short','thumbnail','opinion_card')),
  variant          text,
  purpose          text,
  body_md          text,
  cta_label        text,
  cta_url          text,
  media_asset_ids  uuid[] not null default '{}',
  approval_level   text not null default 'L2'
    check (approval_level in ('L0','L1','L2','L3')),
  qa_json          jsonb not null default '{}'::jsonb,
  state            text not null default 'draft'
    check (state in ('draft','qa_failed','ready','scheduled','published','failed','cancelled','skipped')),
  scheduled_for    timestamptz,
  published_at     timestamptz,
  platform_post_id text,
  published_url    text,
  lifespan_days    smallint,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.pi_campaign_assets is
  'PI Campaign Factory: one row per channel deliverable. body_md is GENERATED.
   approval_level L3 = human approval always (thesis, plan, article, email, video, reel).';

create index if not exists pi_campaign_assets_campaign_idx on public.pi_campaign_assets (campaign_id);
create index if not exists pi_campaign_assets_state_idx    on public.pi_campaign_assets (state);

-- ---------------------------------------------------------------------------
-- pi_media_usages — rights AS AT time of use, immutable snapshot
-- ---------------------------------------------------------------------------
create table if not exists public.pi_media_usages (
  id                uuid primary key default gen_random_uuid(),
  media_asset_id    uuid not null references public.pi_media_assets(id),
  campaign_asset_id uuid references public.pi_campaign_assets(id) on delete set null,
  channel           text not null,
  used_at           timestamptz not null default now(),
  published_url     text,
  rights_snapshot   jsonb not null
);

comment on table public.pi_media_usages is
  'PI Campaign Factory: append-only usage log. rights_snapshot preserves the
   licence terms as they stood on the day of use, so a later licence change
   never rewrites history.';

create index if not exists pi_media_usages_asset_idx on public.pi_media_usages (media_asset_id);

-- ---------------------------------------------------------------------------
-- pi_publications — the scheduling, submission, and verification queue
-- ---------------------------------------------------------------------------
create table if not exists public.pi_publications (
  id                uuid primary key default gen_random_uuid(),
  campaign_asset_id uuid not null references public.pi_campaign_assets(id) on delete cascade,
  platform          text not null
    check (platform in ('buffer','mailchimp','github','youtube','manual')),
  scheduled_for     timestamptz not null,
  submitted_at      timestamptz,
  external_id       text,
  verified_at       timestamptz,
  verification_note text,
  attempt_count     smallint not null default 0,
  last_error        text,
  state             text not null default 'queued'
    check (state in ('queued','submitted','published','verify_failed','failed','cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.pi_publications is
  'PI Campaign Factory: distribution queue. state=verify_failed means the post
   submitted successfully but is not actually live - a louder failure than
   state=failed, because nobody notices it otherwise.';

create index if not exists pi_publications_sched_idx on public.pi_publications (scheduled_for);
create index if not exists pi_publications_state_idx on public.pi_publications (state);

-- ---------------------------------------------------------------------------
-- pi_run_log — observability. Every stage of every job writes one row.
-- ---------------------------------------------------------------------------
create table if not exists public.pi_run_log (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null,
  correlation_id   uuid,
  campaign_id      uuid references public.pi_campaigns(id) on delete set null,
  job_name         text not null,
  job_source       text not null
    check (job_source in ('github-actions','openclaw-cron','manual','agent')),
  stage            text not null,
  agent            text,
  from_state       text,
  to_state         text,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_ms      integer,
  status           text not null
    check (status in ('ok','degraded','blocked','failed','skipped')),
  mutation         text not null default 'report-only'
    check (mutation in ('scan-only','report-only','mutating-content','mutating-live','mutating-config')),
  inputs_json      jsonb not null default '{}'::jsonb,
  outputs_json     jsonb not null default '{}'::jsonb,
  degradations     text[] not null default '{}',
  error_code       text,
  error_detail     text,
  retries          smallint not null default 0,
  escalated_to     text,
  cost_usd         numeric not null default 0,
  artifacts        text[] not null default '{}',
  created_at       timestamptz not null default now()
);

comment on table public.pi_run_log is
  'PI Campaign Factory: per-stage execution log. status=degraded is a first-class
   success (a campaign that shipped with typographic cards instead of photographs
   is not a failure). error_code localises failure to a stage, so nothing ever
   surfaces as "the cron job failed".';

create index if not exists pi_run_log_run_idx    on public.pi_run_log (run_id);
create index if not exists pi_run_log_corr_idx   on public.pi_run_log (correlation_id);
create index if not exists pi_run_log_job_idx    on public.pi_run_log (job_name, started_at desc);
create index if not exists pi_run_log_status_idx on public.pi_run_log (status);

-- ---------------------------------------------------------------------------
-- pi_work_items gains a campaign parent
-- ---------------------------------------------------------------------------
alter table public.pi_work_items
  add column if not exists campaign_id uuid references public.pi_campaigns(id) on delete set null;

create index if not exists pi_work_items_campaign_idx on public.pi_work_items (campaign_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers, matching the existing convention
-- ---------------------------------------------------------------------------
create or replace function public.pi_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'pi_campaigns','pi_campaign_assets','pi_media_assets','pi_publications'
  ] loop
    execute format(
      'drop trigger if exists %I_touch on public.%I;
       create trigger %I_touch before update on public.%I
       for each row execute function public.pi_touch_updated_at();',
      t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: service-role only, matching the rest of the pi_* workflow plane.
-- ---------------------------------------------------------------------------
alter table public.pi_campaigns        enable row level security;
alter table public.pi_campaign_signals enable row level security;
alter table public.pi_campaign_assets  enable row level security;
alter table public.pi_media_assets     enable row level security;
alter table public.pi_media_usages     enable row level security;
alter table public.pi_publications     enable row level security;
alter table public.pi_run_log          enable row level security;

commit;
