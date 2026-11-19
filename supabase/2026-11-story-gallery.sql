-- Story page photo gallery (Nov 2026): up to 4 designed product photos per story, per language
-- (e.g. 1 cover with a background, 2 on a table with props, 3 in the gift box). Shown on the story page
-- instead of the single flat cover. Empty = the story page keeps showing the flat cover as before.
-- Arabic list empty = the English photos are shown on the Arabic site.
alter table stories add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table stories add column if not exists gallery_images_ar jsonb not null default '[]'::jsonb;
