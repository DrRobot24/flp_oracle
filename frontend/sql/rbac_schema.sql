-- 1. Create specific types for roles
create type app_role as enum ('admin', 'moderator', 'user');

-- 2. Create a public profiles table that links to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role app_role default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Security
alter table public.profiles enable row level security;

-- 3. Trigger: Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user'); -- Default role is always USER
  return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Helper Function: Check if current user is Admin (for Policies)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 5. Policies (Who can do what)

-- EVERYONE can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- ADMINS can read and edit ALL profiles
create policy "Admins can do everything"
  on public.profiles
  using ( public.is_admin() );

-- EXAMPLE: Protect the 'predictions' table so only Admins can DELETE
-- You can run this if you want to lock down the predictions table later
/*
create policy "Only Admins can delete predictions"
  on predictions for delete
  using ( public.is_admin() );
*/
