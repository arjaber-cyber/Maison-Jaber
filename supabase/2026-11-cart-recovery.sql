-- Abandoned order recovery v2 (Nov 2026). Additive; applied to production 4 Nov 2026.
alter table public.abandoned_carts
  add column if not exists lang text,
  add column if not exists country text,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_source text,
  add column if not exists cart_snapshot jsonb,
  add column if not exists item_count int,
  add column if not exists resume_token_hash text,
  add column if not exists resume_expires_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists resumed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists recovered boolean not null default false,
  add column if not exists suppressed_reason text;
create unique index if not exists abandoned_carts_resume_token_hash_idx
  on public.abandoned_carts (resume_token_hash) where resume_token_hash is not null;
create table if not exists public.email_unsubscribes (
  email text primary key,
  scope text not null default 'marketing',
  source text,
  created_at timestamptz not null default now()
);
alter table public.email_unsubscribes enable row level security;
