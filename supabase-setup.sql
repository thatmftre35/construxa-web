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

create policy "Project owners can view all project documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = documents.project_id
        and projects.user_id = auth.uid()
    )
  );

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
  using (email = (auth.jwt() ->> 'email'));

create policy "Invitee can update own invitations"
  on public.project_invitations for update
  using (email = (auth.jwt() ->> 'email'));

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

-- ============================================================
-- Events table (alerts / calendar events)
-- ============================================================
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null,
  description text not null default '',
  event_date timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.events enable row level security;

create policy "Users can view own events"
  on public.events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own events"
  on public.events for update
  using (auth.uid() = user_id);

create policy "Users can delete own events"
  on public.events for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Tasks table
-- ============================================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  assignee text not null default '',
  due_date timestamptz not null,
  urgency text not null default 'low',
  completed boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Messages table
-- ============================================================
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade,
  recipient_email text,
  project_id uuid references public.projects(id) on delete cascade,
  subject text not null default '',
  body text not null,
  read boolean not null default false,
  created_at timestamptz default now() not null
);

alter table public.messages enable row level security;

create policy "Users can view messages they sent or received"
  on public.messages for select
  using (
    auth.uid() = sender_id
    or auth.uid() = recipient_id
    or recipient_email = (auth.jwt() ->> 'email')
  );

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can mark messages read"
  on public.messages for update
  using (
    auth.uid() = recipient_id
    or recipient_email = (auth.jwt() ->> 'email')
  );

create policy "Sender or recipient can delete messages"
  on public.messages for delete
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Project members can view all messages tagged to their project (group chat)
drop policy if exists "Project members can view project messages" on public.messages;
create policy "Project members can view project messages"
  on public.messages for select
  using (
    project_id is not null and (
      exists (select 1 from public.projects p where p.id = messages.project_id and p.user_id = auth.uid())
      or exists (
        select 1 from public.project_shares ps
        where ps.project_id = messages.project_id and ps.shared_with_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Announcements table
-- ============================================================
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  announcement_date date not null default current_date,
  urgency text not null default 'green' check (urgency in ('red','yellow','green')),
  created_at timestamptz default now() not null
);

alter table public.announcements enable row level security;

create policy "Users can view announcements they authored"
  on public.announcements for select
  using (auth.uid() = author_id);

create policy "Project members can view announcements"
  on public.announcements for select
  using (
    project_id is not null and (
      exists (select 1 from public.projects where projects.id = announcements.project_id and projects.user_id = auth.uid())
      or exists (select 1 from public.project_shares where project_shares.project_id = announcements.project_id and project_shares.shared_with_id = auth.uid())
    )
  );

create policy "Users can create announcements"
  on public.announcements for insert
  with check (auth.uid() = author_id);

create policy "Authors can update announcements"
  on public.announcements for update
  using (auth.uid() = author_id);

create policy "Authors can delete announcements"
  on public.announcements for delete
  using (auth.uid() = author_id);

-- ============================================================
-- Function: Look up emails for a set of user IDs (for messaging UI)
-- ============================================================
create or replace function public.get_user_emails_by_ids(ids uuid[])
returns table(id uuid, email text)
language sql security definer set search_path = public, auth as $$
  select u.id, u.email::text from auth.users u where u.id = any(ids);
$$;
grant execute on function public.get_user_emails_by_ids(uuid[]) to authenticated;

-- ============================================================
-- Allow viewing profiles of project collaborators (so messaging
-- can list members of shared projects by name)
-- ============================================================
drop policy if exists "View collaborator profiles" on public.profiles;
create policy "View collaborator profiles"
  on public.profiles for select
  using (
    -- I can see profiles of users who share a project with me
    exists (
      select 1
      from public.projects p
      left join public.project_shares ps on ps.project_id = p.id
      where (
        -- profile belongs to project owner of a project I'm shared on
        (p.user_id = profiles.id and ps.shared_with_id = auth.uid())
        -- profile belongs to a shared user on a project I own
        or (ps.shared_with_id = profiles.id and p.user_id = auth.uid())
        -- profile belongs to a shared user on a project I'm also shared on
        or (ps.shared_with_id = profiles.id and exists (
          select 1 from public.project_shares ps2
          where ps2.project_id = p.id and ps2.shared_with_id = auth.uid()
        ))
      )
    )
  );

-- ============================================================================
-- ADMIN CENTER FOUNDATION (Phase 1)
-- Mirrors supabase/migrations/20260731_admin_foundation.sql (iOS repo, the live
-- migration home). Organizations, memberships, multi-tenancy, platform roles,
-- tenant-context helpers, and append-only audit logs. Idempotent.
-- ============================================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  primary_contact_email text,
  status text not null default 'trial'
    check (status in ('trial','active','past_due','suspended','cancelled','purged')),
  plan text not null default 'trial',
  volume_tier text,
  trial_ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_status_idx on public.organizations(status);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_role text not null default 'member'
    check (org_role in ('owner','admin','member','billing_only')),
  seat_type text not null default 'collaborator'
    check (seat_type in ('licensed','collaborator')),
  status text not null default 'active'
    check (status in ('active','invited','suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx on public.memberships(organization_id);

alter table public.profiles
  add column if not exists platform_role text
    check (platform_role in ('superadmin','support','billing','readonly'));

create or replace function public.org_role_rank(p_role text)
returns int language sql immutable as $$
  select case p_role
    when 'owner' then 4 when 'admin' then 3 when 'member' then 2
    when 'billing_only' then 1 else 0 end;
$$;

create or replace function public.platform_role_rank(p_role text)
returns int language sql immutable as $$
  select case p_role
    when 'superadmin' then 4 when 'support' then 3 when 'billing' then 2
    when 'readonly' then 1 else 0 end;
$$;

create or replace function public.is_org_member(p_org uuid, p_min_role text default 'member')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and public.org_role_rank(m.org_role) >= public.org_role_rank(p_min_role)
  );
$$;

create or replace function public.is_platform_admin(p_min_role text default 'readonly')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.platform_role is not null
      and public.platform_role_rank(p.platform_role) >= public.platform_role_rank(p_min_role)
  );
$$;

grant execute on function public.org_role_rank(text) to authenticated;
grant execute on function public.platform_role_rank(text) to authenticated;
grant execute on function public.is_org_member(uuid, text) to authenticated;
grant execute on function public.is_platform_admin(text) to authenticated;

alter table public.organizations enable row level security;
drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_org_member(id, 'member') or public.is_platform_admin('readonly'));
drop policy if exists "Org admins can update their organization" on public.organizations;
create policy "Org admins can update their organization"
  on public.organizations for update
  using (public.is_org_member(id, 'admin') or public.is_platform_admin('superadmin'));
drop policy if exists "Platform superadmin can insert organizations" on public.organizations;
create policy "Platform superadmin can insert organizations"
  on public.organizations for insert
  with check (public.is_platform_admin('superadmin'));
drop policy if exists "Platform superadmin can delete organizations" on public.organizations;
create policy "Platform superadmin can delete organizations"
  on public.organizations for delete
  using (public.is_platform_admin('superadmin'));

alter table public.memberships enable row level security;
drop policy if exists "Members can view memberships in their orgs" on public.memberships;
create policy "Members can view memberships in their orgs"
  on public.memberships for select
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id, 'admin')
    or public.is_platform_admin('readonly')
  );
drop policy if exists "Org admins insert memberships" on public.memberships;
create policy "Org admins insert memberships"
  on public.memberships for insert
  with check (public.is_org_member(organization_id, 'admin') or public.is_platform_admin('superadmin'));
drop policy if exists "Org admins update memberships" on public.memberships;
create policy "Org admins update memberships"
  on public.memberships for update
  using (public.is_org_member(organization_id, 'admin') or public.is_platform_admin('superadmin'));
drop policy if exists "Org admins remove memberships" on public.memberships;
create policy "Org admins remove memberships"
  on public.memberships for delete
  using (public.is_org_member(organization_id, 'admin') or public.is_platform_admin('superadmin'));

alter table public.projects      add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.documents     add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.events        add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.tasks         add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.messages      add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.announcements add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
create index if not exists projects_org_idx      on public.projects(organization_id);
create index if not exists documents_org_idx     on public.documents(organization_id);
create index if not exists events_org_idx        on public.events(organization_id);
create index if not exists tasks_org_idx         on public.tasks(organization_id);
create index if not exists messages_org_idx      on public.messages(organization_id);
create index if not exists announcements_org_idx on public.announcements(organization_id);

do $$
declare
  r record;
  new_org uuid;
begin
  for r in (select distinct user_id from public.projects where organization_id is null) loop
    insert into public.organizations (name, slug, created_by, status, plan)
    values (
      coalesce(
        (select nullif(company, '') from public.profiles where id = r.user_id),
        'Organization ' || left(r.user_id::text, 8)
      ),
      'org-' || substr(md5(r.user_id::text), 1, 10),
      r.user_id, 'active', 'trial'
    )
    returning id into new_org;
    insert into public.memberships (organization_id, user_id, org_role, seat_type, status)
    values (new_org, r.user_id, 'owner', 'licensed', 'active')
    on conflict (organization_id, user_id) do nothing;
    update public.projects set organization_id = new_org
      where user_id = r.user_id and organization_id is null;
  end loop;
  update public.documents d      set organization_id = p.organization_id from public.projects p where d.project_id = p.id and d.organization_id is null;
  update public.events e         set organization_id = p.organization_id from public.projects p where e.project_id = p.id and e.organization_id is null;
  update public.tasks t          set organization_id = p.organization_id from public.projects p where t.project_id = p.id and t.organization_id is null;
  update public.messages m       set organization_id = p.organization_id from public.projects p where m.project_id = p.id and m.organization_id is null;
  update public.announcements a  set organization_id = p.organization_id from public.projects p where a.project_id = p.id and a.organization_id is null;
end $$;

create table if not exists public.platform_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  organization_id uuid,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  support_session_id uuid,
  inside_impersonation boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists platform_audit_org_idx     on public.platform_audit(organization_id);
create index if not exists platform_audit_actor_idx   on public.platform_audit(actor_user_id);
create index if not exists platform_audit_created_idx on public.platform_audit(created_at desc);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  actor_user_id uuid,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  support_session_id uuid,
  inside_impersonation boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_org_idx   on public.audit_log(organization_id, created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log(actor_user_id);

create or replace function public.forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit rows are append-only (% not allowed on %)', tg_op, tg_table_name;
end;
$$;
drop trigger if exists platform_audit_no_mutate on public.platform_audit;
create trigger platform_audit_no_mutate
  before update or delete on public.platform_audit
  for each row execute function public.forbid_mutation();
drop trigger if exists audit_log_no_mutate on public.audit_log;
create trigger audit_log_no_mutate
  before update or delete on public.audit_log
  for each row execute function public.forbid_mutation();

alter table public.audit_log enable row level security;
drop policy if exists "Org admins can read their audit log" on public.audit_log;
create policy "Org admins can read their audit log"
  on public.audit_log for select
  using (public.is_org_member(organization_id, 'admin') or public.is_platform_admin('readonly'));
alter table public.platform_audit enable row level security;
drop policy if exists "Platform staff can read platform audit" on public.platform_audit;
create policy "Platform staff can read platform audit"
  on public.platform_audit for select
  using (public.is_platform_admin('readonly'));

create or replace function public.write_audit_log(
  p_org uuid, p_action text, p_target_type text, p_target_id text,
  p_before jsonb, p_after jsonb, p_support_session uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log
    (organization_id, actor_user_id, action, target_type, target_id, before, after,
     support_session_id, inside_impersonation)
  values
    (p_org, auth.uid(), p_action, p_target_type, p_target_id, p_before, p_after,
     p_support_session, p_support_session is not null);
end;
$$;
create or replace function public.write_platform_audit(
  p_org uuid, p_action text, p_target_type text, p_target_id text,
  p_before jsonb, p_after jsonb, p_support_session uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.platform_audit
    (actor_user_id, organization_id, action, target_type, target_id, before, after,
     support_session_id, inside_impersonation)
  values
    (auth.uid(), p_org, p_action, p_target_type, p_target_id, p_before, p_after,
     p_support_session, p_support_session is not null);
end;
$$;
revoke execute on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.write_platform_audit(uuid, text, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;

-- ---------- Service RPC: create_organization ----------
-- Mirrors supabase/migrations/20260731_create_organization_rpc.sql.
create or replace function public.create_organization(
  p_name text,
  p_slug text default null,
  p_primary_contact_email text default null,
  p_plan text default 'trial',
  p_status text default 'trial',
  p_trial_days int default null,
  p_owner_email text default null
) returns public.organizations
language plpgsql security definer set search_path = public, auth as $$
declare
  v_org public.organizations;
  v_owner uuid;
  v_slug text;
begin
  if not public.is_platform_admin('superadmin') then
    raise exception 'Forbidden: platform superadmin required' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Organization name is required' using errcode = '22023';
  end if;
  if p_status not in ('trial','active','past_due','suspended','cancelled','purged') then
    raise exception 'Invalid status: %', p_status using errcode = '22023';
  end if;
  v_slug := lower(regexp_replace(coalesce(nullif(trim(p_slug), ''), p_name), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    raise exception 'Could not derive a valid slug from the name/slug provided' using errcode = '22023';
  end if;
  insert into public.organizations
    (name, slug, primary_contact_email, plan, status, trial_ends_at, created_by)
  values (
    trim(p_name), v_slug, nullif(trim(p_primary_contact_email), ''),
    coalesce(nullif(trim(p_plan), ''), 'trial'), p_status,
    case when p_trial_days is not null then now() + make_interval(days => p_trial_days) end,
    auth.uid()
  )
  returning * into v_org;
  if coalesce(trim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where email = lower(trim(p_owner_email)) limit 1;
    if v_owner is not null then
      insert into public.memberships
        (organization_id, user_id, org_role, seat_type, status, invited_by)
      values (v_org.id, v_owner, 'owner', 'licensed', 'active', auth.uid())
      on conflict (organization_id, user_id) do nothing;
    end if;
  end if;
  perform public.write_platform_audit(
    v_org.id, 'organization.created', 'organization', v_org.id::text,
    null, to_jsonb(v_org), null
  );
  return v_org;
exception
  when unique_violation then
    raise exception 'An organization with slug "%" already exists', v_slug using errcode = '23505';
end;
$$;
grant execute on function public.create_organization(text, text, text, text, text, int, text) to authenticated;

-- ---------- Service RPC: set_organization_status (lifecycle state machine) ----------
-- Mirrors supabase/migrations/20260731_org_lifecycle_rpc.sql.
create or replace function public.set_organization_status(
  p_org uuid,
  p_new_status text,
  p_reason text default null
) returns public.organizations
language plpgsql security definer set search_path = public as $$
declare
  v_org public.organizations;
  v_old text;
  v_allowed boolean;
begin
  if not public.is_platform_admin('superadmin') then
    raise exception 'Forbidden: platform superadmin required' using errcode = '42501';
  end if;
  select * into v_org from public.organizations where id = p_org for update;
  if not found then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;
  v_old := v_org.status;
  if v_old = p_new_status then
    raise exception 'Organization is already %', p_new_status using errcode = '22023';
  end if;
  v_allowed := case v_old
    when 'trial'     then p_new_status in ('active','suspended','cancelled')
    when 'active'    then p_new_status in ('past_due','suspended','cancelled')
    when 'past_due'  then p_new_status in ('active','suspended','cancelled')
    when 'suspended' then p_new_status in ('active','cancelled')
    when 'cancelled' then p_new_status in ('active')
    else false
  end;
  if not v_allowed then
    raise exception 'Illegal transition: % -> %', v_old, p_new_status using errcode = '22023';
  end if;
  update public.organizations
    set status = p_new_status, updated_at = now()
    where id = p_org
    returning * into v_org;
  perform public.write_platform_audit(
    p_org, 'organization.status_changed', 'organization', p_org::text,
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', p_new_status, 'reason', p_reason),
    null
  );
  return v_org;
end;
$$;
grant execute on function public.set_organization_status(uuid, text, text) to authenticated;

-- ---------- Org licensed-seat allotment + editable fields ----------
-- Mirrors supabase/migrations/20260731_org_edit_and_seats.sql.
alter table public.organizations
  add column if not exists max_licensed_seats int not null default 0;

drop function if exists public.create_organization(text, text, text, text, text, int, text);

create or replace function public.create_organization(
  p_name text,
  p_slug text default null,
  p_primary_contact_email text default null,
  p_status text default 'trial',
  p_max_licensed_seats int default 0,
  p_owner_email text default null
) returns public.organizations
language plpgsql security definer set search_path = public, auth as $$
declare
  v_org public.organizations;
  v_owner uuid;
  v_slug text;
begin
  if not public.is_platform_admin('superadmin') then
    raise exception 'Forbidden: platform superadmin required' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Organization name is required' using errcode = '22023';
  end if;
  if p_status not in ('trial','active','past_due','suspended','cancelled','purged') then
    raise exception 'Invalid status: %', p_status using errcode = '22023';
  end if;
  v_slug := lower(regexp_replace(coalesce(nullif(trim(p_slug), ''), p_name), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    raise exception 'Could not derive a valid slug from the name/slug provided' using errcode = '22023';
  end if;
  insert into public.organizations
    (name, slug, primary_contact_email, plan, status, max_licensed_seats, created_by)
  values (
    trim(p_name), v_slug, nullif(trim(p_primary_contact_email), ''),
    'C1.0', p_status, greatest(coalesce(p_max_licensed_seats, 0), 0), auth.uid()
  )
  returning * into v_org;
  if coalesce(trim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where email = lower(trim(p_owner_email)) limit 1;
    if v_owner is not null then
      insert into public.memberships
        (organization_id, user_id, org_role, seat_type, status, invited_by)
      values (v_org.id, v_owner, 'owner', 'licensed', 'active', auth.uid())
      on conflict (organization_id, user_id) do nothing;
    end if;
  end if;
  perform public.write_platform_audit(
    v_org.id, 'organization.created', 'organization', v_org.id::text,
    null, to_jsonb(v_org), null
  );
  return v_org;
exception
  when unique_violation then
    raise exception 'An organization with slug "%" already exists', v_slug using errcode = '23505';
end;
$$;
grant execute on function public.create_organization(text, text, text, text, int, text) to authenticated;

create or replace function public.update_organization(
  p_org uuid,
  p_name text,
  p_slug text,
  p_primary_contact_email text,
  p_plan text,
  p_volume_tier text,
  p_max_licensed_seats int
) returns public.organizations
language plpgsql security definer set search_path = public as $$
declare
  v_before public.organizations;
  v_org public.organizations;
  v_slug text;
begin
  if not public.is_platform_admin('superadmin') then
    raise exception 'Forbidden: platform superadmin required' using errcode = '42501';
  end if;
  select * into v_before from public.organizations where id = p_org for update;
  if not found then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Organization name is required' using errcode = '22023';
  end if;
  v_slug := lower(regexp_replace(coalesce(nullif(trim(p_slug), ''), p_name), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    raise exception 'Could not derive a valid slug from the name/slug provided' using errcode = '22023';
  end if;
  update public.organizations set
    name = trim(p_name),
    slug = v_slug,
    primary_contact_email = nullif(trim(p_primary_contact_email), ''),
    plan = coalesce(nullif(trim(p_plan), ''), 'C1.0'),
    volume_tier = nullif(trim(p_volume_tier), ''),
    max_licensed_seats = greatest(coalesce(p_max_licensed_seats, 0), 0),
    updated_at = now()
  where id = p_org
  returning * into v_org;
  perform public.write_platform_audit(
    p_org, 'organization.updated', 'organization', p_org::text,
    to_jsonb(v_before), to_jsonb(v_org), null
  );
  return v_org;
exception
  when unique_violation then
    raise exception 'An organization with slug "%" already exists', v_slug using errcode = '23505';
end;
$$;
grant execute on function public.update_organization(uuid, text, text, text, text, text, int) to authenticated;
