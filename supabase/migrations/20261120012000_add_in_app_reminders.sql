begin;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  occasion_id uuid references public.occasions(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  remind_at timestamptz not null,
  snoozed_until timestamptz,
  dismissed_at timestamptz,
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_couple_due_idx
on public.reminders (couple_id, remind_at)
where dismissed_at is null;

create function public.set_reminder_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'A reminder creator cannot be changed';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger reminders_set_updated_at
before update on public.reminders
for each row execute function public.set_reminder_updated_at();

alter table public.reminders enable row level security;

revoke all on table public.reminders from anon, authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;

create policy "Couple members can read their reminders"
on public.reminders
for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Couple members can add their reminders"
on public.reminders
for insert
to authenticated
with check (
  public.is_couple_member(couple_id)
  and created_by = auth.uid()
  and (
    occasion_id is null
    or exists (
      select 1
      from public.occasions
      where id = occasion_id
        and couple_id = reminders.couple_id
    )
  )
);

create policy "Couple members can update their reminders"
on public.reminders
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy "Couple members can delete their reminders"
on public.reminders
for delete
to authenticated
using (public.is_couple_member(couple_id));

revoke all on function public.set_reminder_updated_at() from public, anon, authenticated;

commit;
