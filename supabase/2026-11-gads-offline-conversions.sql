-- Hikaya: Google Ads offline conversions for confirmed paid orders (Nov 2026).
-- Applied as migrations hikaya_gads_offline_conversions, hikaya_gads_finish_validated, hikaya_gads_claim_fix.
-- Used by netlify/functions/gads-conversions.js.

-- 1) Payment-confirmed time, set once by the database when payment_status becomes 'paid'.
alter table public.orders add column if not exists paid_at timestamptz;
create or replace function public.hk_set_paid_at() returns trigger language plpgsql set search_path = public as $$
begin
  if new.payment_status = 'paid' and new.paid_at is null
     and (tg_op = 'INSERT' or old.payment_status is distinct from 'paid') then
    new.paid_at := now();
  end if;
  return new;
end $$;
drop trigger if exists orders_set_paid_at on public.orders;
create trigger orders_set_paid_at before insert or update of payment_status on public.orders
  for each row execute function public.hk_set_paid_at();
update public.orders o set paid_at = coalesce(
  (select min(e.created_at) from public.site_events e where e.order_number = o.order_number and e.event = 'purchase'),
  o.created_at)
where o.payment_status = 'paid' and o.paid_at is null;

-- 2) Upload log: one row per order (primary key), no customer data.
create table if not exists public.gads_conversion_uploads (
  order_number    text primary key,
  conversion_action_id text,
  click_type      text check (click_type in ('gclid','gbraid','wbraid')),
  value_aed       numeric not null,
  paid_at         timestamptz not null,
  status          text not null default 'pending'
                  check (status in ('pending','sending','sent','confirmed','failed','rejected','validated')),
  attempts        integer not null default 0,
  request_id      text,
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  sent_at         timestamptz,
  confirmed_at    timestamptz
);
alter table public.gads_conversion_uploads enable row level security;
create index if not exists gads_uploads_status_idx on public.gads_conversion_uploads (status, next_attempt_at);

-- 3) The only eligibility rule.
create or replace view public.gads_eligible_orders with (security_invoker = true) as
select o.order_number, o.paid_at, round(o.charged_aed::numeric, 2) as value_aed,
       o.gclid, o.gbraid, o.wbraid,
       coalesce((o.attribution->>'marketing')::boolean, false) as ad_consent
from public.orders o
where o.order_type = 'sale' and o.payment_status = 'paid' and coalesce(o.charged_aed, 0) > 0
  and o.paid_at is not null and (o.gclid is not null or o.gbraid is not null or o.wbraid is not null);
revoke all on public.gads_eligible_orders from public, anon, authenticated;

-- 4) Atomic claim.
create or replace function public.gads_claim_conversions(p_action_id text, p_limit int default 20,
                                                         p_min_age interval default interval '6 hours')
returns table (order_number text, paid_at timestamptz, value_aed numeric, gclid text, gbraid text, wbraid text, ad_consent boolean)
language plpgsql set search_path = public as $$
#variable_conflict use_column
begin
  insert into gads_conversion_uploads (order_number, conversion_action_id, click_type, value_aed, paid_at)
  select e.order_number, p_action_id,
         case when e.gclid is not null then 'gclid' when e.gbraid is not null then 'gbraid' else 'wbraid' end,
         e.value_aed, e.paid_at
  from gads_eligible_orders e
  where e.paid_at <= now() - p_min_age and e.paid_at >= now() - interval '60 days'
  on conflict (order_number) do nothing;

  update gads_conversion_uploads set status = 'failed', last_error = 'interrupted', updated_at = now()
  where status = 'sending' and updated_at < now() - interval '15 minutes';

  update gads_conversion_uploads u set status = 'rejected', last_error = 'no_longer_eligible', updated_at = now()
  where u.status in ('pending','failed','validated')
    and not exists (select 1 from gads_eligible_orders e where e.order_number = u.order_number);

  return query
  with due as (
    select u.order_number as onum from gads_conversion_uploads u
    where u.status in ('pending','failed','validated') and u.attempts < 8 and u.next_attempt_at <= now()
    order by u.paid_at limit p_limit
    for update skip locked
  ), claimed as (
    update gads_conversion_uploads u set status = 'sending', attempts = u.attempts + 1,
           conversion_action_id = p_action_id, updated_at = now()
    from due where u.order_number = due.onum
    returning u.order_number as onum
  )
  select e.order_number, e.paid_at, e.value_aed, e.gclid, e.gbraid, e.wbraid, e.ad_consent
  from claimed c join gads_eligible_orders e on e.order_number = c.onum;
end $$;

-- 5) Outcome.
create or replace function public.gads_finish_conversion(p_order text, p_status text, p_request_id text, p_error text)
returns void language sql set search_path = public as $$
  update gads_conversion_uploads set
    status = p_status,
    request_id = case when p_status = 'validated' then request_id else coalesce(p_request_id, request_id) end,
    last_error = case when p_status in ('sent','confirmed','validated') then null else left(p_error, 200) end,
    attempts = case when p_status = 'validated' then 0 else attempts end,
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    next_attempt_at = case
      when p_status = 'failed' then now() + least(interval '24 hours', interval '30 minutes' * power(2, attempts))
      when p_status = 'validated' then now() + interval '1 hour'
      else next_attempt_at end,
    updated_at = now()
  where order_number = p_order;
$$;

revoke all on function public.gads_claim_conversions(text, int, interval) from public, anon, authenticated;
revoke all on function public.gads_finish_conversion(text, text, text, text) from public, anon, authenticated;
revoke all on function public.hk_set_paid_at() from public, anon, authenticated;
grant execute on function public.gads_claim_conversions(text, int, interval) to service_role;
grant execute on function public.gads_finish_conversion(text, text, text, text) to service_role;
grant select on public.gads_eligible_orders to service_role;
