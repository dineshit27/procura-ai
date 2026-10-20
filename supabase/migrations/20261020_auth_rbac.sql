-- Run in the Supabase SQL editor. Roles are only writable by service_role.
create type public.procura_role as enum ('admin', 'procurement_manager', 'finance_manager', 'requester');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.procura_role not null default 'requester',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
-- No client insert/update policy: invitations and roles are administered only by the backend service role.
