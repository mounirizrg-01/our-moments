begin;

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  occasion_date date not null,
  category text not null default 'other'
    check (category in ('anniversary', 'birthday', 'reservation', 'other')),
  repeats_yearly boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index occasions_couple_date_idx
on public.occasions (couple_id, occasion_date);

create function public.set_occasion_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'An occasion creator cannot be changed';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger occasions_set_updated_at
before update on public.occasions
for each row execute function public.set_occasion_updated_at();

alter table public.occasions enable row level security;

revoke all on table public.occasions from anon, authenticated;
grant select, insert, update, delete on table public.occasions to authenticated;

create policy "Couple members can read their occasions"
on public.occasions
for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Couple members can add their occasions"
on public.occasions
for insert
to authenticated
with check (
  public.is_couple_member(couple_id)
  and created_by = auth.uid()
);

create policy "Couple members can update their occasions"
on public.occasions
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy "Couple members can delete their occasions"
on public.occasions
for delete
to authenticated
using (public.is_couple_member(couple_id));

revoke all on function public.set_occasion_updated_at() from public, anon, authenticated;

commit;
