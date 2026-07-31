// Platform Admin data access (read-only, Phase 1 entry point).
// Reads are authorized by RLS (is_platform_admin). Mutations (org provisioning,
// lifecycle, entitlements) come in later phases via SECURITY DEFINER RPCs.

import { getSupabaseClient } from './supabase';
import {
  rowToOrganization,
  type Organization,
  type OrganizationRow,
  type OrgStatus,
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
  plan?: string;
  status?: OrgStatus;
  trialDays?: number;
}

/**
 * Provision an organization via the create_organization RPC (authorize +
 * insert + seed owner + audit, atomically server-side). Throws with the RPC's
 * message on failure (e.g. duplicate slug, not authorized).
 */
export async function createOrganization(input: CreateOrgInput): Promise<Organization> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: input.name,
    p_slug: input.slug?.trim() || null,
    p_primary_contact_email: input.primaryContactEmail?.trim() || null,
    p_plan: input.plan?.trim() || 'trial',
    p_status: input.status ?? 'trial',
    p_trial_days: input.trialDays ?? null,
    p_owner_email: input.ownerEmail?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return rowToOrganization(data as OrganizationRow);
}
