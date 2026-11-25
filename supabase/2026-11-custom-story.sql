-- Completely Customised Story (Nov 2026): per-story fixed price, no discounts.
-- Applied to production via Supabase on 25 Nov 2026.
alter table stories add column if not exists fixed_price_aed numeric;
alter table stories add column if not exists no_discount boolean not null default false;
alter table stories add column if not exists custom_story boolean not null default false;
-- Row: slug completely-customised-story, fixed_price_aed 199, no_discount true, custom_story true, no images.
