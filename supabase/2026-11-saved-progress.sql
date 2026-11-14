-- "Save my progress" on the photo step of personalize.html (Nov 2026).
-- A parent can ask for a private link that reopens the order page with the story, name, age,
-- pronouns, book language and message filled in. Photos are never stored here.
-- Only the SHA-256 hash of the link token is kept; rows expire after 14 days and are cleaned up
-- by save-progress.js. Service role only (RLS on, no policies).
create table if not exists public.saved_progress (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  draft jsonb not null default '{}'::jsonb,
  lang text,
  country text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz
);
create index if not exists saved_progress_email_created on public.saved_progress (email, created_at desc);
create index if not exists saved_progress_expires on public.saved_progress (expires_at);
alter table public.saved_progress enable row level security;
