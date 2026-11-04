-- Post-delivery feedback (Nov 2026). One row per order; written only by the
-- feedback Netlify function (service role). RLS on, no public access.
create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  order_number text,
  email text,
  lang text,
  child_name text,
  story text,
  country text,
  q_recommend smallint not null check (q_recommend between 1 and 5),
  q_story smallint not null check (q_story between 1 and 5),
  q_print smallint not null check (q_print between 1 and 5),
  q_delivery smallint not null check (q_delivery between 1 and 5),
  comment text not null check (length(btrim(comment)) between 1 and 2000),
  promo_consent_at timestamptz not null default now(),
  discount_code text,
  use_in_promos boolean not null default true,
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists customer_feedback_email_idx on public.customer_feedback (lower(email));
create index if not exists customer_feedback_created_idx on public.customer_feedback (created_at desc);
alter table public.customer_feedback enable row level security;
revoke all on public.customer_feedback from anon, authenticated;
