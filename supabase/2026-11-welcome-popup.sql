-- Welcome pop-up (Nov 2026): record where a newsletter sign-up came from and the shopper's country.
-- Safe to run more than once. subscribe-newsletter.js still saves emails if this hasn't run yet.
alter table public.newsletter_subscribers add column if not exists source text;
alter table public.newsletter_subscribers add column if not exists country text;
