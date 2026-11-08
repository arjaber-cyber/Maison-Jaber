-- Hikaya: marketing tracking + read-only reporting (Nov 2026). Safe to run twice.
-- Applied via Supabase migration "hikaya_marketing_report".

-- 0) The Oct 2026 customer-tracking migration had never been applied: orders.attribution and
--    tracked_links did not exist, so checkout's "where did this order come from" was being dropped.
alter table public.orders add column if not exists attribution jsonb;
create table if not exists public.tracked_links (
  code text primary key, name text not null, channel text,
  destination text not null default '/hikaya/',
  utm_source text, utm_medium text, utm_campaign text, promo_code text,
  active boolean not null default true, clicks integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.tracked_links enable row level security;
create or replace function public.tracked_link_click(p_code text)
returns setof public.tracked_links language sql security definer set search_path = public as $$
  update public.tracked_links set clicks = clicks + 1 where code = p_code and active returning *;
$$;
revoke all on function public.tracked_link_click(text) from public, anon, authenticated;
create index if not exists orders_email_lower_idx on public.orders (lower(email));

-- 1) Google ad click ids on the order (latest known click on this device, within 90 days).
alter table public.orders add column if not exists gclid  text;
alter table public.orders add column if not exists gbraid text;
alter table public.orders add column if not exists wbraid text;
create index if not exists orders_order_number_idx on public.orders (order_number);

-- 2) Cookie-free counter: click ids on the landing pageview, the device's first touch on every
--    event, and full order data on purchase events.
alter table public.site_events add column if not exists gclid          text;
alter table public.site_events add column if not exists gbraid         text;
alter table public.site_events add column if not exists wbraid         text;
alter table public.site_events add column if not exists ft_source      text;
alter table public.site_events add column if not exists ft_medium      text;
alter table public.site_events add column if not exists ft_campaign    text;
alter table public.site_events add column if not exists ft_referrer    text;
alter table public.site_events add column if not exists ft_click       text;
alter table public.site_events add column if not exists order_number   text;
alter table public.site_events add column if not exists currency       text;
alter table public.site_events add column if not exists payment_status text;
alter table public.site_events add column if not exists value_aed      numeric;
create index if not exists site_events_created_idx on public.site_events (created_at);
create index if not exists site_events_visitor_idx on public.site_events (visitor, created_at);
create index if not exists site_events_order_idx   on public.site_events (order_number) where order_number is not null;

-- 3) Keys for the reporting endpoint. Only a SHA-256 hash is stored. Service role only.
create table if not exists public.marketing_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.marketing_api_keys enable row level security;
comment on table public.marketing_api_keys is 'SHA-256 hashes of read-only marketing-report API keys. Service role only.';

-- 4) One channel rule for everything: (source, medium) from utm tags, ad click, or referrer.
create or replace function public.hk_channel(p_src text, p_med text, p_ref text, p_click text)
returns table (source text, medium text) language sql immutable set search_path = public as $$
  select case
      when lower(trim(coalesce(p_src,''))) in ('ig','insta','instagram') then 'instagram'
      when lower(trim(coalesce(p_src,''))) in ('fb','facebook') then 'facebook'
      when nullif(trim(p_src),'') is not null then lower(trim(p_src))
      when p_click = 'google' then 'google'
      when p_click = 'meta' then 'meta'
      when p_click = 'tiktok' then 'tiktok'
      when p_ref is null or p_ref = '' or p_ref ~* '(^|\.)maison-jaber\.com$|netlify\.app$' then '(direct)'
      when p_ref ~* '(^|\.)google\.' then 'google'
      when p_ref ~* '(^|\.)bing\.' then 'bing'
      when p_ref ~* 'duckduckgo' then 'duckduckgo'
      when p_ref ~* '(^|\.)yahoo\.' then 'yahoo'
      when p_ref ~* 'instagram' then 'instagram'
      when p_ref ~* 'facebook|(^|\.)fb\.com$' then 'facebook'
      when p_ref ~* 'tiktok' then 'tiktok'
      when p_ref ~* 'snapchat' then 'snapchat'
      when p_ref ~* 'whatsapp|wa\.me' then 'whatsapp'
      when p_ref ~* '(^|\.)t\.co$|twitter|(^|\.)x\.com$' then 'x'
      else regexp_replace(lower(p_ref), '^www\.', '') end,
    case
      when nullif(trim(p_src),'') is not null then coalesce(nullif(lower(trim(p_med)),''), '(not set)')
      when p_click in ('google','meta','tiktok') then 'cpc'
      when p_ref is null or p_ref = '' or p_ref ~* '(^|\.)maison-jaber\.com$|netlify\.app$' then '(none)'
      when p_ref ~* '(^|\.)(google|bing|yahoo)\.|duckduckgo' then 'organic'
      when p_ref ~* 'instagram|facebook|(^|\.)fb\.com$|tiktok|snapchat|whatsapp|wa\.me|(^|\.)t\.co$|twitter|(^|\.)x\.com$' then 'social'
      else 'referral' end;
$$;

-- 5) Daily aggregated report. No personal data leaves this function: only counts and AED sums.
--    Dates are UAE dates (Asia/Dubai). Attribution = the visitor's first touch:
--      a) the device's saved first touch (sent with every event since Nov 2026), else
--      b) the first pageview of that visitor-day (utm tags / ad click / referrer).
--    Orders: attribution saved on the order at checkout (first touch), else the purchase event's
--    visitor, else "(unknown)". Test orders are excluded. Free-code orders (influencer / gift /
--    waived) are counted and summed separately and never in paid revenue.
create or replace function public.marketing_daily(date_from date, date_to date)
returns table (
  date date, country text, source text, medium text, campaign text,
  sessions bigint, unique_visitors bigint, personalize_starts bigint, add_to_cart bigint, checkouts bigint,
  paid_purchases bigint, free_code_purchases bigint, paid_revenue_aed numeric, free_code_revenue_aed numeric
) language sql stable set search_path = public as $$
with ev as (
  select e.*, (e.created_at at time zone 'Asia/Dubai')::date as d
  from site_events e
  where coalesce(e.page,'') !~ '^/test'
),
-- one attribution per visitor-day
vd as (
  select visitor, d,
    (array_agg(country order by created_at) filter (where country is not null))[1] as country,
    (array_agg(array[ft_source, ft_medium, ft_campaign, ft_referrer, ft_click] order by created_at)
       filter (where ft_source is not null or ft_referrer is not null or ft_click is not null or ft_campaign is not null)) as fts,
    (array_agg(array[utm_source, utm_medium, utm_campaign, referrer_host,
        case when gclid is not null or gbraid is not null or wbraid is not null then 'google' end]
       order by created_at) filter (where event = 'pageview')) as lps
  from ev group by visitor, d
),
vd2 as (
  select visitor, d, country, case when fts is not null then fts[1:1] end as ft, case when lps is not null then lps[1:1] end as lp from vd
),
vd_attr as (
  select v.visitor, v.d, coalesce(v.country, '??') as country, ch.source, ch.medium,
         coalesce(nullif(case when v.ft is not null then v.ft[1][3] else v.lp[1][3] end, ''), '(not set)') as campaign
  from vd2 v
  cross join lateral hk_channel(
    case when v.ft is not null then v.ft[1][1] else v.lp[1][1] end,
    case when v.ft is not null then v.ft[1][2] else v.lp[1][2] end,
    case when v.ft is not null then v.ft[1][4] else v.lp[1][4] end,
    case when v.ft is not null then v.ft[1][5] else v.lp[1][5] end) ch
),
-- sessions: a new session after 30 minutes without activity
gaps as (
  select visitor, d,
    case when lag(created_at) over (partition by visitor, d order by created_at) is null
          or created_at - lag(created_at) over (partition by visitor, d order by created_at) > interval '30 minutes'
         then 1 else 0 end as new_session,
    event
  from ev where d between date_from and date_to
),
per_vd as (
  select visitor, d, sum(new_session) as sess,
    bool_or(event = 'personalize_step') as pers,
    count(*) filter (where event = 'add_to_cart') as atc,
    count(*) filter (where event = 'begin_checkout') as chk
  from gaps group by visitor, d
),
traffic_agg as (
  select a.d, a.country, a.source, a.medium, a.campaign,
    sum(p.sess)::bigint as sessions, count(distinct a.visitor)::bigint as unique_visitors,
    count(*) filter (where p.pers)::bigint as personalize_starts,
    sum(p.atc)::bigint as add_to_cart, sum(p.chk)::bigint as checkouts
  from vd_attr a join per_vd p on p.visitor = a.visitor and p.d = a.d
  group by 1,2,3,4,5
),
ord as (
  select o.order_number, (o.created_at at time zone 'Asia/Dubai')::date as d,
    case when o.order_type = 'sale' and o.payment_status = 'paid' and coalesce(o.charged_aed, o.amount, 0) > 0 then 'paid'
         when o.order_type in ('influencer','gift') or o.payment_status = 'waived' then 'free' end as kind,
    coalesce(o.charged_aed, case when coalesce(o.currency,'AED') = 'AED' then o.amount end, 0) as aed,
    o.attribution->'first' as ft,
    case o.country when 'UAE' then 'AE' when 'Saudi' then 'SA' when 'Qatar' then 'QA' when 'Kuwait' then 'KW'
                   when 'Bahrain' then 'BH' when 'Oman' then 'OM' when 'Syria' then 'SY' else '??' end as ship_country
  from orders o
  where coalesce(o.order_type,'sale') <> 'test'
    and (o.created_at at time zone 'Asia/Dubai')::date between date_from and date_to
),
ord_attr as (
  select o.*, pe.visitor, pe.vd
  from ord o
  left join lateral (
    select x.visitor, x.d as vd from ev x
    where x.order_number = o.order_number and x.event in ('purchase','complimentary_order_complete')
    order by x.created_at limit 1) pe on true
  where o.kind is not null
),
ord_final as (
  select oa.d, coalesce(va.country, oa.ship_country) as country,
    coalesce(ch.source, va.source, '(unknown)') as source,
    coalesce(ch.medium, va.medium, '(unknown)') as medium,
    coalesce(case when oa.ft is not null then coalesce(nullif(oa.ft->>'cmp',''), '(not set)') end, va.campaign, '(unknown)') as campaign,
    oa.kind, oa.aed
  from ord_attr oa
  left join vd_attr va on va.visitor = oa.visitor and va.d = oa.vd
  left join lateral (select * from hk_channel(oa.ft->>'src', oa.ft->>'med', oa.ft->>'rh', oa.ft->>'clk') where oa.ft is not null and jsonb_typeof(oa.ft) = 'object') ch on true
),
ord_agg as (
  select d, country, source, medium, campaign,
    count(*) filter (where kind = 'paid')::bigint as paid_purchases,
    count(*) filter (where kind = 'free')::bigint as free_code_purchases,
    coalesce(sum(aed) filter (where kind = 'paid'), 0) as paid_revenue_aed,
    coalesce(sum(aed) filter (where kind = 'free'), 0) as free_code_revenue_aed
  from ord_final group by 1,2,3,4,5
)
select coalesce(t.d, o.d), coalesce(t.country, o.country), coalesce(t.source, o.source),
       coalesce(t.medium, o.medium), coalesce(t.campaign, o.campaign),
       coalesce(t.sessions,0), coalesce(t.unique_visitors,0), coalesce(t.personalize_starts,0),
       coalesce(t.add_to_cart,0), coalesce(t.checkouts,0),
       coalesce(o.paid_purchases,0), coalesce(o.free_code_purchases,0),
       round(coalesce(o.paid_revenue_aed,0),2), round(coalesce(o.free_code_revenue_aed,0),2)
from traffic_agg t
full outer join ord_agg o on o.d = t.d and o.country = t.country and o.source = t.source and o.medium = t.medium and o.campaign = t.campaign
order by 1, 6 desc, 3, 4, 5;
$$;
revoke all on function public.marketing_daily(date, date) from public, anon, authenticated;
revoke all on function public.hk_channel(text, text, text, text) from public, anon, authenticated;
grant execute on function public.marketing_daily(date, date) to service_role;
grant execute on function public.hk_channel(text, text, text, text) to service_role;

-- 6) Backfill: link earlier purchase beacons to their order (same amount, within 20 minutes).
update public.site_events e set order_number = o.order_number, value_aed = coalesce(o.charged_aed, o.amount),
       currency = o.currency, payment_status = o.payment_status
from public.orders o
where e.event = 'purchase' and e.order_number is null and coalesce(o.order_type,'sale') = 'sale'
  and o.payment_status = 'paid' and e.value = o.amount
  and abs(extract(epoch from (e.created_at - o.created_at))) < 1200;
