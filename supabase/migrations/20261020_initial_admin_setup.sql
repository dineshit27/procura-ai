-- One-time initial administrator assignment. Run after 20261020_auth_rbac.sql.
-- This function is not available to anon/authenticated users or the browser.
create or replace function public.assign_initial_admin(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
  assigned_profile public.profiles;
begin
  select email into target_email
  from auth.users
  where id = target_user_id
    and email_confirmed_at is not null;

  if target_email is null then
    raise exception 'Initial administrator must be an existing verified Supabase user';
  end if;

  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An administrator has already been assigned';
  end if;

  insert into public.profiles (id, email, role)
  values (target_user_id, target_email, 'admin')
  on conflict (id) do update
    set email = excluded.email, role = 'admin'
    where public.profiles.role = 'requester'
  returning * into assigned_profile;

  if assigned_profile.id is null then
    raise exception 'The selected user already has a non-requester role';
  end if;

  return assigned_profile;
end;
$$;

revoke all on function public.assign_initial_admin(uuid) from public, anon, authenticated;
grant execute on function public.assign_initial_admin(uuid) to service_role;
