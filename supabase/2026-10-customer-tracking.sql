-- Hikaya: customer tracking (Oct 2026). Paste into Supabase > SQL Editor > Run. Safe to run twice.

-- 1) Where each order came from (filled in by checkout).
alter table public.orders add column if not exists attribution jsonb;

-- 2) Short tracked links made in the dashboard (maison-jaber.com/go/<code>).
create table if not exists public.tracked_links (
  code         text primary key,
  name         text not null,
  channel      text,
  destination  text not null default '/hikaya/',
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  promo_code   text,
  active       boolean not null default true,
  clicks       integer not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.tracked_links enable row level security; -- server (service role) only

-- 3) Count a click and return the link in one step.
create or replace function public.tracked_link_click(p_code text)
returns setof public.tracked_links
language sql security definer set search_path = public as $$
  update public.tracked_links set clicks = clicks + 1
  where code = p_code and active
  returning *;
$$;
revoke all on function public.tracked_link_click(text) from public, anon, authenticated;

create index if not exists orders_email_lower_idx on public.orders (lower(email));
