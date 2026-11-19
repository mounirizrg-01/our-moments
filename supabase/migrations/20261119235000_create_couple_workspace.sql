begin;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id)
);

create function public.enforce_two_couple_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.couples
  where id = new.couple_id
  for update;

  if not found then
    raise exception 'Couple workspace does not exist';
  end if;

  if (
    select count(*)
    from public.couple_members
    where couple_id = new.couple_id
  ) >= 2 then
    raise exception 'A couple workspace can have only two members';
  end if;

  return new;
end;
$$;

create trigger couple_members_limit
before insert on public.couple_members
for each row execute function public.enforce_two_couple_members();

create function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = target_couple_id
      and user_id = auth.uid()
  );
$$;

create function public.create_couple(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_couple_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Name must be 1 to 80 characters';
  end if;

  if exists (
    select 1
    from public.couple_members
    where user_id = current_user_id
  ) then
    raise exception using errcode = '23505', message = 'You already belong to a couple workspace';
  end if;

  insert into public.couples (name)
  values (btrim(p_name))
  returning id into new_couple_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (new_couple_id, current_user_id, 'owner');

  return new_couple_id;
end;
$$;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

revoke all on table public.couples, public.couple_members from anon, authenticated;
grant select on table public.couples, public.couple_members to authenticated;

create policy "Couple members can read their workspace"
on public.couples
for select
to authenticated
using (public.is_couple_member(id));

create policy "Couple members can read their membership"
on public.couple_members
for select
to authenticated
using (public.is_couple_member(couple_id));

revoke all on function public.enforce_two_couple_members() from public, anon, authenticated;
revoke all on function public.is_couple_member(uuid) from public, anon, authenticated;
revoke all on function public.create_couple(text) from public, anon, authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.create_couple(text) to authenticated;

commit;
