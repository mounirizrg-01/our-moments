begin;

create table public.couple_invites (
  invite_code text primary key check (invite_code ~ '^[0-9a-f]{64}$'),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

alter table public.couple_invites enable row level security;
revoke all on table public.couple_invites from public, anon, authenticated;

create function public.create_couple_invite()
returns table (invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owner_couple_id uuid;
  new_invite_code text;
  invite_expiration timestamptz := now() + interval '7 days';
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in';
  end if;

  select couple_id
  into owner_couple_id
  from public.couple_members
  where user_id = current_user_id
    and role = 'owner';

  if owner_couple_id is null then
    raise exception using errcode = '42501', message = 'Only the workspace owner can create an invite';
  end if;

  if (
    select count(*)
    from public.couple_members
    where couple_id = owner_couple_id
  ) >= 2 then
    raise exception using errcode = '23505', message = 'Your workspace already has two members';
  end if;

  new_invite_code := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.couple_invites (invite_code, couple_id, created_by, expires_at)
  values (new_invite_code, owner_couple_id, current_user_id, invite_expiration);

  return query select new_invite_code, invite_expiration;
end;
$$;

create function public.accept_couple_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invited_couple_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in';
  end if;

  if p_invite_code is null or p_invite_code !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invite code is invalid or expired';
  end if;

  if exists (
    select 1
    from public.couple_members
    where user_id = current_user_id
  ) then
    raise exception using errcode = '23505', message = 'You already belong to a couple workspace';
  end if;

  select couple_id
  into invited_couple_id
  from public.couple_invites
  where invite_code = p_invite_code
    and accepted_at is null
    and expires_at > now()
  for update;

  if invited_couple_id is null then
    raise exception using errcode = '22023', message = 'Invite code is invalid or expired';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (invited_couple_id, current_user_id, 'partner');

  update public.couple_invites
  set accepted_at = now(),
      accepted_by = current_user_id
  where invite_code = p_invite_code;

  return invited_couple_id;
end;
$$;

revoke all on function public.create_couple_invite() from public, anon, authenticated;
revoke all on function public.accept_couple_invite(text) from public, anon, authenticated;
grant execute on function public.create_couple_invite() to authenticated;
grant execute on function public.accept_couple_invite(text) to authenticated;

commit;
