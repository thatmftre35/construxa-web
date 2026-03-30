-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  description text not null default '',
  value text not null default '',
  start_date text not null default '',
  completion_date text,
  status text not null default 'active',
  stage text not null default 'Planning',
  sector text not null default '',
  square_footage text not null default '',
  trades text[] not null default '{}',
  image_url text,
  progress real not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.projects enable row level security;

-- Users can only see their own projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

-- Users can insert their own projects
create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

-- Users can update their own projects
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

-- Users can delete their own projects
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Also ensure profiles table has RLS (if not already)
alter table public.profiles enable row level security;

-- Profiles RLS (if policies don't exist yet)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view own profile') then
    create policy "Users can view own profile"
      on public.profiles for select
      using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile"
      on public.profiles for update
      using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile"
      on public.profiles for insert
      with check (auth.uid() = id);
  end if;
end $$;
