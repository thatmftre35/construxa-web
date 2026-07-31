// Org Admin Center data access + actions (owner/admin facing).
// Reads are RLS-scoped to orgs the caller belongs to; mutations go through the
// SECURITY DEFINER RPCs (invite_org_member / update_org_member / revoke...).

import { getSupabaseClient } from './supabase';
import { sendEmail, emailShell } from './email';
import {
  rowToOrganization, rowToInvitation,
  type Organization, type OrganizationRow,
  type OrgInvitation, type OrgInvitationRow,
  type OrgRole, type SeatType, type MembershipStatus,
} from '@/types/admin';

export interface OrgMemberRow {
  userId: string;
  email: string | null;
  orgRole: OrgRole;
  seatType: SeatType;
  status: MembershipStatus;
}

/** Organizations where the current user is owner or admin (for the switcher). */
export async function fetchMyAdminOrgs(): Promise<Organization[]> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('memberships')
    .select('org_role, organizations(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('org_role', ['owner', 'admin']);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { organizations: OrganizationRow | null }[])
    .map((r) => r.organizations)
    .filter((o): o is OrganizationRow => !!o)
    .map(rowToOrganization);
}

export interface OrgAdminData {
  org: Organization;
  members: OrgMemberRow[];
  invitations: OrgInvitation[];
  licensedUsed: number;
}

export async function fetchOrgAdminData(orgId: string): Promise<OrgAdminData> {
  const supabase = getSupabaseClient();

  const { data: orgRow, error: orgErr } = await supabase
    .from('organizations').select('*').eq('id', orgId).single();
  if (orgErr) throw new Error(orgErr.message);

  const { data: memRows, error: memErr } = await supabase
    .from('memberships').select('user_id, org_role, seat_type, status').eq('organization_id', orgId);
  if (memErr) throw new Error(memErr.message);

  const { data: invRows, error: invErr } = await supabase
    .from('organization_invitations')
    .select('*').eq('organization_id', orgId).eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (invErr) throw new Error(invErr.message);

  type MemRow = { user_id: string; org_role: OrgRole; seat_type: SeatType; status: MembershipStatus };
  const rows = (memRows ?? []) as MemRow[];
  const ids = rows.map((m) => m.user_id);
  const emailMap = new Map<string, string>();
  if (ids.length) {
    const { data: emails } = await supabase.rpc('get_user_emails_by_ids', { ids });
    for (const e of (emails ?? []) as { id: string; email: string }[]) emailMap.set(e.id, e.email);
  }

  const members: OrgMemberRow[] = rows.map((m) => ({
    userId: m.user_id,
    email: emailMap.get(m.user_id) ?? null,
    orgRole: m.org_role,
    seatType: m.seat_type,
    status: m.status,
  }));

  return {
    org: rowToOrganization(orgRow as OrganizationRow),
    members,
    invitations: ((invRows ?? []) as OrgInvitationRow[]).map(rowToInvitation),
    licensedUsed: members.filter((m) => m.seatType === 'licensed' && m.status === 'active').length,
  };
}

export interface InviteResult {
  outcome: 'added' | 'invited';
  email: string;
  emailError?: string;
}

/**
 * Invite (or directly add) a member, then email them. If the email send fails,
 * the membership/invitation still stands — the error is returned, not thrown.
 */
export async function inviteOrgMember(
  orgId: string, orgName: string, email: string, role: OrgRole, seatType: SeatType,
): Promise<InviteResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('invite_org_member', {
    p_org: orgId,
    p_email: email,
    p_role: role,
    p_seat_type: seatType,
  });
  if (error) throw new Error(error.message);

  const res = data as { outcome: 'added' | 'invited'; email: string };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  let emailError: string | undefined;
  try {
    if (res.outcome === 'invited') {
      await sendEmail({
        to: res.email,
        subject: `You're invited to ${orgName} on Construxa`,
        html: emailShell(
          `Join ${orgName} on Construxa`,
          `<p>You've been invited to join <strong>${orgName}</strong>. Create your account with this email address to accept.</p>`,
          { label: 'Accept invitation', url: `${origin}/auth/signup?email=${encodeURIComponent(res.email)}` },
        ),
      });
    } else {
      await sendEmail({
        to: res.email,
        subject: `You've been added to ${orgName} on Construxa`,
        html: emailShell(
          `You're now part of ${orgName}`,
          `<p>Your account was added to <strong>${orgName}</strong> on Construxa.</p>`,
          { label: 'Open Construxa', url: `${origin}/dashboard` },
        ),
      });
    }
  } catch (e) {
    emailError = e instanceof Error ? e.message : 'Email failed to send';
  }

  return { outcome: res.outcome, email: res.email, emailError };
}

export async function revokeOrgInvitation(invitationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('revoke_org_invitation', { p_invitation: invitationId });
  if (error) throw new Error(error.message);
}

export async function updateOrgMember(
  orgId: string, userId: string, role: OrgRole, seatType: SeatType, status: MembershipStatus,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('update_org_member', {
    p_org: orgId,
    p_user: userId,
    p_role: role,
    p_seat_type: seatType,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}
