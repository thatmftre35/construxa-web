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

-- ============================================================
-- Documents table (persists file metadata)
-- ============================================================
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default '',
  size bigint not null default 0,
  storage_path text,
  folder text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.documents enable row level security;

create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Project shares table (direct share records)
-- ============================================================
create table if not exists public.project_shares (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  shared_with_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'viewer',
  created_at timestamptz default now() not null,
  unique(project_id, shared_with_id)
);

alter table public.project_shares enable row level security;

create policy "Owner or shared user can view shares"
  on public.project_shares for select
  using (auth.uid() = owner_id or auth.uid() = shared_with_id);

create policy "Owner can create shares"
  on public.project_shares for insert
  with check (auth.uid() = owner_id);

create policy "Owner can delete shares"
  on public.project_shares for delete
  using (auth.uid() = owner_id);

-- ============================================================
-- Project invitations table (pending invites by email)
-- ============================================================
create table if not exists public.project_invitations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  email text not null,
  role text not null default 'viewer',
  status text not null default 'pending',
  created_at timestamptz default now() not null,
  unique(project_id, email)
);

alter table public.project_invitations enable row level security;

create policy "Inviter can manage invitations"
  on public.project_invitations for select
  using (auth.uid() = invited_by);

create policy "Inviter can create invitations"
  on public.project_invitations for insert
  with check (auth.uid() = invited_by);

create policy "Inviter can delete invitations"
  on public.project_invitations for delete
  using (auth.uid() = invited_by);

create policy "Invitee can view own invitations"
  on public.project_invitations for select
  using (email = (select email from auth.users where id = auth.uid()));

create policy "Invitee can update own invitations"
  on public.project_invitations for update
  using (email = (select email from auth.users where id = auth.uid()));

-- ============================================================
-- RLS: Shared users can view projects
-- ============================================================
create policy "Shared users can view projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_shares
      where project_shares.project_id = projects.id
        and project_shares.shared_with_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: Shared users can view project documents
-- ============================================================
create policy "Shared users can view project documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.project_shares
      where project_shares.project_id = documents.project_id
        and project_shares.shared_with_id = auth.uid()
    )
  );

create policy "Shared editors can insert documents"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.project_shares
      where project_shares.project_id = documents.project_id
        and project_shares.shared_with_id = auth.uid()
        and project_shares.role in ('editor', 'admin')
    )
  );

-- ============================================================
-- Function: Look up user ID by email (for sharing)
-- ============================================================
create or replace function public.lookup_user_id_by_email(lookup_email text)
returns uuid as $$
  select id from auth.users where email = lookup_email limit 1;
$$ language sql security definer;

-- ============================================================
-- Function: Auto-accept pending invitations on signup
-- ============================================================
create or replace function public.accept_pending_invitations()
returns trigger as $$
begin
  insert into public.project_shares (project_id, owner_id, shared_with_id, role)
  select
    pi.project_id,
    pi.invited_by,
    new.id,
    pi.role
  from public.project_invitations pi
  where pi.email = (select email from auth.users where id = new.id)
    and pi.status = 'pending'
  on conflict (project_id, shared_with_id) do nothing;

  update public.project_invitations
  set status = 'accepted'
  where email = (select email from auth.users where id = new.id)
    and status = 'pending';

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_accept_invitations on public.profiles;
create trigger on_profile_created_accept_invitations
  after insert on public.profiles
  for each row
  execute function public.accept_pending_invitations();
