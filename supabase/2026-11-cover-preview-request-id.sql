-- Free cover preview (8 Nov 2026), applied via Supabase migrations:
-- 1) cover_preview_usage ignores queued/running jobs older than 10 minutes (a dead job no longer uses up a free preview)
-- 2) request_id: one id per submission; a retry with the same id returns the original preview
alter table public.cover_previews add column if not exists request_id text;
create unique index if not exists cover_previews_user_request_uidx on public.cover_previews (user_id, request_id) where request_id is not null;
