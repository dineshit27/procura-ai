-- Safely creates one requester profile for each new Auth user. Browser metadata
-- (including a forged role) is ignored, and existing profiles are unchanged.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, role) values (new.id, coalesce(new.email, ''), 'requester') on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;
