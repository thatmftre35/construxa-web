import { getSupabaseClient } from '@/lib/supabase';

export interface ProjectShare {
  id: string;
  projectId: string;
  ownerId: string;
  sharedWithId: string;
  role: 'viewer' | 'editor' | 'admin';
  createdAt: string;
  // Joined profile fields
  name?: string;
  email?: string;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  invitedBy: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export async function shareProject(
  projectId: string,
  email: string,
  role: 'viewer' | 'editor' | 'admin' = 'viewer'
): Promise<{ type: 'shared' | 'invited'; error?: string }> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { type: 'invited', error: 'Not authenticated' };

  // Look up user by email
  const { data: targetUserId } = await supabase.rpc('lookup_user_id_by_email', {
    lookup_email: email,
  });

  if (targetUserId) {
    // User exists — create direct share
    if (targetUserId === user.id) {
      return { type: 'shared', error: 'Cannot share with yourself' };
    }

    const { error } = await supabase.from('project_shares').insert({
      project_id: projectId,
      owner_id: user.id,
      shared_with_id: targetUserId,
      role,
    });

    if (error) {
      if (error.code === '23505') return { type: 'shared', error: 'Already shared with this user' };
      return { type: 'shared', error: error.message };
    }
    return { type: 'shared' };
  } else {
    // User doesn't exist — create invitation
    const { error } = await supabase.from('project_invitations').insert({
      project_id: projectId,
      invited_by: user.id,
      email,
      role,
    });

    if (error) {
      if (error.code === '23505') return { type: 'invited', error: 'Already invited this email' };
      return { type: 'invited', error: error.message };
    }
    return { type: 'invited' };
  }
}

export async function getProjectShares(projectId: string): Promise<ProjectShare[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('project_shares')
    .select('*')
    .eq('project_id', projectId);

  if (error || !data) return [];

  // Fetch profile info for shared users
  const shares: ProjectShare[] = await Promise.all(
    data.map(async (row: Record<string, unknown>) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', row.shared_with_id)
        .single();

      return {
        id: row.id as string,
        projectId: row.project_id as string,
        ownerId: row.owner_id as string,
        sharedWithId: row.shared_with_id as string,
        role: row.role as ProjectShare['role'],
        createdAt: row.created_at as string,
        name: (profile?.full_name as string) || undefined,
      };
    })
  );

  return shares;
}

export async function getProjectInvitations(projectId: string): Promise<ProjectInvitation[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('project_invitations')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'pending');

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    invitedBy: row.invited_by as string,
    email: row.email as string,
    role: row.role as ProjectInvitation['role'],
    status: row.status as ProjectInvitation['status'],
    createdAt: row.created_at as string,
  }));
}

export async function removeShare(shareId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('project_shares').delete().eq('id', shareId);
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('project_invitations').delete().eq('id', invitationId);
}

export async function acceptPendingInvitations(): Promise<number> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return 0;

  const { data: invitations } = await supabase
    .from('project_invitations')
    .select('*')
    .eq('email', user.email)
    .eq('status', 'pending');

  if (!invitations || invitations.length === 0) return 0;

  for (const inv of invitations) {
    await supabase.from('project_shares').insert({
      project_id: inv.project_id,
      owner_id: inv.invited_by,
      shared_with_id: user.id,
      role: inv.role,
    });

    await supabase
      .from('project_invitations')
      .update({ status: 'accepted' })
      .eq('id', inv.id);
  }

  return invitations.length;
}
