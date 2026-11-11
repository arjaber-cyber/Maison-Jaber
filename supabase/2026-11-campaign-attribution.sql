-- Hikaya campaign attribution (11 Nov 2026)
-- Adds Google Ads campaign ids (auto-tagging gad_campaignid), last-touch campaign on every counted event,
-- engagement seconds, the free-cover-preview funnel, Google Ads daily spend, and campaign_report() for the
-- private Campaigns tab in the admin. Additive only: no existing column, view or function is changed.
-- No personal data: site_events stays anonymous (daily hash); campaign_report returns counts and AED sums only.

-- 1) Cookie-free counter: campaign ids + last touch
alter table public.site_events add column if not exists gad_campaign_id text;
alter table public.site_events add column if not exists ft_campaign_id text;
alter table public.site_events add column if not exists lt_source text;
alter table public.site_events add column if not exists lt_medium text;
alter table public.site_events add column if not exists lt_campaign text;
alter table public.site_events add column if not exists lt_click text;
alter table public.site_events add column if not exists lt_campaign_id text;

-- 2) Orders: the Google Ads campaign the order came from
alter table public.orders add column if not exists gad_campaign_id text;

-- 3) Campaigns we compare, and their daily Google Ads numbers (filled from Google Ads reporting)
create table if not exists public.ads_campaigns (
  campaign_id text primary key,
  name text not null,
  label text not null,              -- short name on the dashboard
  market text,                      -- AE / SA: used only to place old Google clicks that arrived without a campaign id
  utm_campaign text,                -- campaign-level utm_campaign, if the campaign has one
  compare boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ads_campaigns enable row level security;

create table if not exists public.ads_daily (
  d date not null,
  campaign_id text not null,
  cost_aed numeric not null default 0,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ads_conversions numeric,
  updated_at timestamptz not null default now(),
  primary key (d, campaign_id)
);
alter table public.ads_daily enable row level security;

insert into public.ads_campaigns (campaign_id, name, label, market, utm_campaign) values
  ('24418922789', 'Hikaya | Search | UAE', 'UAE Search', 'AE', 'hikaya_search_uae'),
  ('24441717255', 'Hikaya | Search | KSA', 'KSA Search', 'SA', null),
  ('24460040812', 'Hikaya | Competitor | Wonderbly | UAE', 'Wonderbly UAE', 'AE', null)
on conflict (campaign_id) do update set name = excluded.name, label = excluded.label, market = excluded.market, utm_campaign = excluded.utm_campaign;

-- 4) campaign_report: one row per compared campaign (+ unidentified Google Ads clicks)
create or replace function public.campaign_report(date_from date, date_to date)
returns table (
  campaign_id text, label text, spend_aed numeric, clicks bigint, impressions bigint,
  sessions bigint, engaged_sessions bigint, avg_engagement_sec numeric,
  preview_starts bigint, previews_completed bigint, checkout_starts bigint,
  orders bigint, revenue_aed numeric, free_orders bigint,
  preview_rate numeric, checkout_rate numeric, cpa_aed numeric, roas numeric,
  attributed_by_id bigint, attributed_inferred bigint, spend_updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
with camp as (select * from ads_campaigns where compare),
ev as (
  select e.*, (e.created_at at time zone 'Asia/Dubai')::date as d,
    coalesce(e.gad_campaign_id, e.lt_campaign_id) as cid_direct,
    coalesce(e.utm_campaign, e.lt_campaign) as utm_c,
    (e.gclid is not null or e.gbraid is not null or e.wbraid is not null or e.lt_click = 'google') as gclick
  from site_events e
  where coalesce(e.page,'') !~ '^/test'
    and e.visitor !~ '^qa-' -- QA test visits (real visitor codes are hex hashes)
    and (e.created_at at time zone 'Asia/Dubai')::date between date_from and date_to
),
ev_c as (
  select ev.*,
    coalesce(
      ev.cid_direct,
      (select c.campaign_id from camp c where c.utm_campaign is not null and c.utm_campaign = ev.utm_c limit 1),
      -- Before 11 Nov 2026 Google clicks arrived without a campaign id: KSA visitors can only be the KSA campaign.
      case when ev.gclick and ev.country = 'SA' then (select c.campaign_id from camp c where c.market = 'SA' limit 1) end,
      case when ev.gclick then 'google-unidentified' end
    ) as cid,
    (ev.cid_direct is not null or ev.utm_c is not null) as by_id
  from ev
),
sess as (
  select s.*, sum(s.new_s) over (partition by s.visitor, s.d order by s.created_at) as sn
  from (
    select ev_c.*, case when lag(created_at) over (partition by visitor, d order by created_at) is null
        or created_at - lag(created_at) over (partition by visitor, d order by created_at) > interval '30 minutes'
        or (event = 'pageview' and gad_campaign_id is not null) -- a new ad click starts a new session (as in GA4)
        then 1 else 0 end as new_s
    from ev_c
  ) s
),
per_s as (
  select visitor, d, sn,
    (array_agg(cid order by created_at) filter (where cid is not null))[1] as cid,
    bool_or(by_id) filter (where cid is not null) as by_id,
    count(*) filter (where event = 'pageview') as pv,
    coalesce(sum(value) filter (where event = 'page_time'), 0) as secs,
    bool_or(event = 'cover_preview_started') as cps,
    bool_or(event = 'cover_preview_ok') as cpo,
    bool_or(event = 'begin_checkout') as chk,
    bool_or(event in ('add_to_cart','purchase','whatsapp_click')) as conv
  from sess group by 1,2,3
),
traffic as (
  select cid,
    count(*) filter (where pv > 0) as sessions,
    count(*) filter (where pv > 0 and (secs >= 10 or pv >= 2 or cps or chk or conv)) as engaged,
    round(avg(secs) filter (where pv > 0), 1) as avg_secs,
    count(*) filter (where cps) as cps, count(*) filter (where cpo) as cpo, count(*) filter (where chk) as chk,
    count(*) filter (where pv > 0 and by_id) as by_id, count(*) filter (where pv > 0 and not by_id) as inferred
  from per_s where cid is not null group by 1
),
ord as (
  select o.order_number,
    case when o.order_type = 'sale' and o.payment_status = 'paid' and coalesce(o.charged_aed, o.amount, 0) > 0 then 'paid'
         when o.order_type in ('influencer','gift') or o.payment_status = 'waived' then 'free' end as kind,
    coalesce(o.charged_aed, case when coalesce(o.currency,'AED') = 'AED' then o.amount end, 0) as aed,
    coalesce(
      o.gad_campaign_id, o.attribution->'last'->>'gci', o.attribution->'first'->>'gci',
      (select c.campaign_id from camp c where c.utm_campaign is not null
         and c.utm_campaign in (o.attribution->'last'->>'cmp', o.attribution->'first'->>'cmp') limit 1),
      case when (o.gclid is not null or o.gbraid is not null or o.wbraid is not null) and o.country = 'Saudi'
           then (select c.campaign_id from camp c where c.market = 'SA' limit 1) end,
      case when o.gclid is not null or o.gbraid is not null or o.wbraid is not null then 'google-unidentified' end
    ) as cid
  from orders o
  where coalesce(o.order_type,'sale') <> 'test'
    and (o.created_at at time zone 'Asia/Dubai')::date between date_from and date_to
),
ord_agg as (
  select cid, count(distinct order_number) filter (where kind = 'paid') as orders,
    coalesce(sum(aed) filter (where kind = 'paid'), 0) as revenue,
    count(distinct order_number) filter (where kind = 'free') as free_orders
  from ord where cid is not null and kind is not null group by 1
),
spend as (
  select campaign_id as cid, sum(cost_aed) as cost, sum(clicks) as clicks, sum(impressions) as impr, max(updated_at) as upd
  from ads_daily where d between date_from and date_to group by 1
),
rows as (
  select c.campaign_id as cid, c.label from camp c
  union all select 'google-unidentified', 'Google Ads (campaign not identified)'
)
select r.cid, r.label,
  round(coalesce(sp.cost, 0), 2), coalesce(sp.clicks, 0)::bigint, coalesce(sp.impr, 0)::bigint,
  coalesce(t.sessions, 0)::bigint, coalesce(t.engaged, 0)::bigint, t.avg_secs,
  coalesce(t.cps, 0)::bigint, coalesce(t.cpo, 0)::bigint, coalesce(t.chk, 0)::bigint,
  coalesce(o.orders, 0)::bigint, round(coalesce(o.revenue, 0), 2), coalesce(o.free_orders, 0)::bigint,
  case when coalesce(t.sessions,0) > 0 then round(100.0 * coalesce(t.cpo,0) / t.sessions, 1) end,
  case when coalesce(t.sessions,0) > 0 then round(100.0 * coalesce(t.chk,0) / t.sessions, 1) end,
  case when coalesce(o.orders,0) > 0 then round(coalesce(sp.cost,0) / o.orders, 2) end,
  case when coalesce(sp.cost,0) > 0 then round(coalesce(o.revenue,0) / sp.cost, 2) end,
  coalesce(t.by_id, 0)::bigint, coalesce(t.inferred, 0)::bigint, sp.upd
from rows r
left join traffic t on t.cid = r.cid
left join ord_agg o on o.cid = r.cid
left join spend sp on sp.cid = r.cid
where r.cid <> 'google-unidentified' or coalesce(t.sessions,0) + coalesce(o.orders,0) > 0;
$$;
revoke all on function public.campaign_report(date, date) from public, anon, authenticated;
grant execute on function public.campaign_report(date, date) to service_role;

create index if not exists site_events_gad_campaign_idx on public.site_events (gad_campaign_id) where gad_campaign_id is not null;
