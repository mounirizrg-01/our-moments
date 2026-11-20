begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-images',
  'memory-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Couple members can upload memory images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] in (
    select cm.couple_id::text
    from public.couple_members cm
    where cm.user_id = auth.uid()
  )
);

create policy "Couple members can read memory images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] in (
    select cm.couple_id::text
    from public.couple_members cm
    where cm.user_id = auth.uid()
  )
);

create policy "Couple members can update memory images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] in (
    select cm.couple_id::text
    from public.couple_members cm
    where cm.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] in (
    select cm.couple_id::text
    from public.couple_members cm
    where cm.user_id = auth.uid()
  )
);

create policy "Couple members can delete memory images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] in (
    select cm.couple_id::text
    from public.couple_members cm
    where cm.user_id = auth.uid()
  )
);

commit;
