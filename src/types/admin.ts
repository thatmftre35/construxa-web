// Admin Center domain types (Phase 1: tenancy foundation).
// Mirrors the tables in supabase/migrations/20260731_admin_foundation.sql.

export type OrgStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'purged';

// Org-level role. Hierarchy: owner > admin > member > billing_only.
export type OrgRole = 'owner' | 'admin' | 'member' | 'billing_only';

// Licensed seats are the billable metric; collaborators are free and
// permission-limited (never org-admin or financials-write).
export type SeatType = 'licensed' | 'collaborator';

export type MembershipStatus = 'active' | 'invited' | 'suspended';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  primaryContactEmail: string | null;
  status: OrgStatus;
  plan: string;
  volumeTier: string | null;
  maxLicensedSeats: number;
  trialEndsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  orgRole: OrgRole;
  seatType: SeatType;
  status: MembershipStatus;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Row shapes as returned by Supabase (snake_case), for hand-written mappers.
export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  primary_contact_email: string | null;
  status: OrgStatus;
  plan: string;
  volume_tier: string | null;
  max_licensed_seats: number;
  trial_ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  org_role: OrgRole;
  seat_type: SeatType;
  status: MembershipStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToOrganization(r: OrganizationRow): Organization {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    primaryContactEmail: r.primary_contact_email,
    status: r.status,
    plan: r.plan,
    volumeTier: r.volume_tier,
    maxLicensedSeats: r.max_licensed_seats ?? 0,
    trialEndsAt: r.trial_ends_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface OrgInvitation {
  id: string;
  organizationId: string;
  email: string;
  orgRole: OrgRole;
  seatType: SeatType;
  status: InvitationStatus;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface OrgInvitationRow {
  id: string;
  organization_id: string;
  email: string;
  org_role: OrgRole;
  seat_type: SeatType;
  status: InvitationStatus;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export function rowToInvitation(r: OrgInvitationRow): OrgInvitation {
  return {
    id: r.id,
    organizationId: r.organization_id,
    email: r.email,
    orgRole: r.org_role,
    seatType: r.seat_type,
    status: r.status,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at,
  };
}

export function rowToMembership(r: MembershipRow): Membership {
  return {
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id,
    orgRole: r.org_role,
    seatType: r.seat_type,
    status: r.status,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Role hierarchy helpers (mirror org_role_rank / platform_role_rank in SQL) so
// the client can gate UI. Enforcement always happens server-side via RLS/RPC.
const ORG_ROLE_RANK: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  billing_only: 1,
};

export function orgRoleAtLeast(role: OrgRole, min: OrgRole): boolean {
  return ORG_ROLE_RANK[role] >= ORG_ROLE_RANK[min];
}
