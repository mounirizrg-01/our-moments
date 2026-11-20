begin;

alter table public.memories
  drop constraint memories_image_url_check;

alter table public.memories
  rename column image_url to image_path;

comment on column public.memories.image_path is
  'Private path inside the memory-images Supabase Storage bucket.';

commit;
