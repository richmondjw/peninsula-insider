-- One row per turn of the Ask PI conversation, so the weekly report can see
-- what readers ask that the guides cannot answer, and where her replies fail.
--
-- Privacy: no account, no IP address and no session identifier is stored.
-- A row holds the message as typed, what she said, and how the turn went.
-- Rows are deleted after 180 days by the report job (ops/scripts/ask-gap-report.mjs).
-- Only the service key can read or write: row level security is on with no policies.
create table if not exists public.pi_chat_turns (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null default 'reader',      -- 'reader' or 'eval'
  message text not null,
  turn_no smallint not null default 1,         -- position in the conversation
  on_page text,
  follow_up boolean,
  pages_sent smallint not null default 0,
  say text,
  picks jsonb not null default '[]'::jsonb,
  sentences smallint not null default 0,
  dropped jsonb not null default '[]'::jsonb,
  fallback boolean not null default false,
  reason text,
  first_ms integer,
  ms integer
);
create index if not exists pi_chat_turns_at on public.pi_chat_turns (at desc);
alter table public.pi_chat_turns enable row level security;
comment on table public.pi_chat_turns is 'Ask PI conversation turns for the weekly gap report. No identifiers. 180 day retention.';
