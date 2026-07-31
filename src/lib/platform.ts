// Platform Admin data access (read-only, Phase 1 entry point).
// Reads are authorized by RLS (is_platform_admin). Mutations (org provisioning,
// lifecycle, entitlements) come in later phases via SECURITY DEFINER RPCs.

import { getSupabaseClient } from './supabase';
import {
  rowToOrganization,
  type Organization,
  type OrganizationRow,
  type OrgStatus,
  type OrgRole,
  type SeatType,
  type MembershipStatus,
} from '@/types/admin';

export interface OrgWithCounts extends Organization {
  memberCount: number;
  licensedSeats: number;
}

/** All organizations visible to the current platform admin, newest first. */
export async function fetchOrganizations(): Promise<OrgWithCounts[]> {
  const supabase = getSupabaseClient();

  const [{ data: orgs, error: orgErr }, { data: members, error: memErr }] = await Promise.all([
    supabase.from('organizations').select('*').order('created_at', { ascending: false }),
    supabase.from('memberships').select('organization_id, seat_type'),
  ]);
  if (orgErr) throw new Error(orgErr.message);
  if (memErr) throw new Error(memErr.message);

  const counts = new Map<string, { total: number; licensed: number }>();
  for (const m of (members ?? []) as { organization_id: string; seat_type: string }[]) {
    const c = counts.get(m.organization_id) ?? { total: 0, licensed: 0 };
    c.total += 1;
    if (m.seat_type === 'licensed') c.licensed += 1;
    counts.set(m.organization_id, c);
  }

  return ((orgs ?? []) as OrganizationRow[]).map((row) => {
    const c = counts.get(row.id) ?? { total: 0, licensed: 0 };
    return { ...rowToOrganization(row), memberCount: c.total, licensedSeats: c.licensed };
  });
}

export interface CreateOrgInput {
  name: string;
  slug?: string;
  primaryContactEmail?: string;
  ownerEmail?: string;
  status?: OrgStatus;
  licenses?: number;
}

/**
 * Provision an organization via the create_organization RPC (authorize +
 * insert + seed owner + audit, atomically server-side). Plan is fixed to C1.0
 * for now. Throws with the RPC's message on failure (e.g. duplicate slug).
 */
export async function createOrganization(input: CreateOrgInput): Promise<Organization> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: input.name,
    p_slug: input.slug?.trim() || null,
    p_primary_contact_email: input.primaryContactEmail?.trim() || null,
    p_status: input.status ?? 'trial',
    p_max_licensed_seats: input.licenses ?? 0,
    p_owner_email: input.ownerEmail?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return rowToOrganization(data as OrganizationRow);
}

export interface UpdateOrgInput {
  name: string;
  slug: string;
  primaryContactEmail: string;
  plan: string;
  volumeTier: string;
  licenses: number;
}

/** Edit an org's fields via the update_organization RPC (status excluded). */
export async function updateOrganization(id: string, input: UpdateOrgInput): Promise<Organization> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('update_organization', {
    p_org: id,
    p_name: input.name,
    p_slug: input.slug,
    p_primary_contact_email: input.primaryContactEmail,
    p_plan: input.plan,
    p_volume_tier: input.volumeTier,
    p_max_licensed_seats: input.licenses,
  });
  if (error) throw new Error(error.message);
  return rowToOrganization(data as OrganizationRow);
}

export interface OrgMember {
  userId: string;
  email: string | null;
  orgRole: OrgRole;
  seatType: SeatType;
  status: MembershipStatus;
}

export interface OrgDetail {
  org: Organization;
  members: OrgMember[];
  licensedUsed: number;
}

/** A single organization with its member list (emails resolved server-side). */
export async function fetchOrganization(id: string): Promise<OrgDetail> {
  const supabase = getSupabaseClient();

  const { data: orgRow, error: orgErr } = await supabase
    .from('organizations').select('*').eq('id', id).single();
  if (orgErr) throw new Error(orgErr.message);

  const { data: memRows, error: memErr } = await supabase
    .from('memberships')
    .select('user_id, org_role, seat_type, status')
    .eq('organization_id', id);
  if (memErr) throw new Error(memErr.message);

  type MemRow = { user_id: string; org_role: OrgRole; seat_type: SeatType; status: MembershipStatus };
  const rows = (memRows ?? []) as MemRow[];
  const ids = rows.map((m) => m.user_id);
  const emailMap = new Map<string, string>();
  if (ids.length) {
    const { data: emails } = await supabase.rpc('get_user_emails_by_ids', { ids });
    for (const e of (emails ?? []) as { id: string; email: string }[]) emailMap.set(e.id, e.email);
  }

  const members: OrgMember[] = rows.map((row) => {
    return {
      userId: row.user_id,
      email: emailMap.get(row.user_id) ?? null,
      orgRole: row.org_role,
      seatType: row.seat_type,
      status: row.status,
    };
  });

  const licensedUsed = members.filter((m) => m.seatType === 'licensed').length;
  return { org: rowToOrganization(orgRow as OrganizationRow), members, licensedUsed };
}

/** Transition an org's lifecycle status via the state-machine RPC. */
export async function setOrganizationStatus(
  id: string, status: OrgStatus, reason?: string,
): Promise<Organization> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('set_organization_status', {
    p_org: id,
    p_new_status: status,
    p_reason: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return rowToOrganization(data as OrganizationRow);
}

export interface AuditEntry {
  action: string;
  createdAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/** Recent platform-audit entries for an org, newest first. */
export async function fetchOrgAudit(id: string, limit = 20): Promise<AuditEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('platform_audit')
    .select('action, before, after, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    action: string; before: Record<string, unknown> | null;
    after: Record<string, unknown> | null; created_at: string;
  }[]).map((r) => ({ action: r.action, createdAt: r.created_at, before: r.before, after: r.after }));
}
