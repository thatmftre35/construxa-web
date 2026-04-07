'use client';

import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

export interface InboxMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string | null;
  recipientEmail: string | null;
  projectId: string | null;
  projectName: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface InboxAnnouncement {
  id: string;
  authorId: string;
  authorName: string;
  projectId: string | null;
  projectName: string;
  title: string;
  description: string;
  announcementDate: string;
  urgency: 'red' | 'yellow' | 'green';
  createdAt: string;
}

export interface ProjectMember {
  userId: string;
  name: string;
  email: string | null;
}

async function getProfileName(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();
  return (data?.full_name as string) || 'Unknown';
}

async function getProjectName(projectId: string | null): Promise<string> {
  if (!projectId) return '';
  const { data } = await supabase.from('projects').select('name').eq('id', projectId).single();
  return (data?.name as string) || '';
}

export async function fetchMessages(): Promise<InboxMessage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const results: InboxMessage[] = await Promise.all(
    data.map(async (row: Record<string, unknown>) => ({
      id: row.id as string,
      senderId: row.sender_id as string,
      senderName: await getProfileName(row.sender_id as string),
      recipientId: (row.recipient_id as string) || null,
      recipientEmail: (row.recipient_email as string) || null,
      projectId: (row.project_id as string) || null,
      projectName: await getProjectName((row.project_id as string) || null),
      subject: (row.subject as string) || '',
      body: row.body as string,
      read: !!row.read,
      createdAt: row.created_at as string,
    }))
  );
  return results;
}

export async function sendMessage(params: {
  body: string;
  subject?: string;
  projectId?: string | null;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
}): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  let recipientId = params.recipientUserId || null;
  const recipientEmail = params.recipientEmail || null;

  // If only email provided, try to resolve to user
  if (!recipientId && recipientEmail) {
    const { data: lookedUp } = await supabase.rpc('lookup_user_id_by_email', {
      lookup_email: recipientEmail,
    });
    if (lookedUp) recipientId = lookedUp as string;
  }

  if (!recipientId && !recipientEmail) {
    return { error: 'Recipient required' };
  }

  const { error } = await supabase.from('messages').insert({
    sender_id: user.id,
    recipient_id: recipientId,
    recipient_email: recipientId ? null : recipientEmail,
    project_id: params.projectId || null,
    subject: params.subject || '',
    body: params.body,
  });
  if (error) return { error: error.message };
  return {};
}

export async function markMessageRead(id: string): Promise<void> {
  await supabase.from('messages').update({ read: true }).eq('id', id);
}

export async function fetchAnnouncements(): Promise<InboxAnnouncement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('announcement_date', { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (row: Record<string, unknown>) => ({
      id: row.id as string,
      authorId: row.author_id as string,
      authorName: await getProfileName(row.author_id as string),
      projectId: (row.project_id as string) || null,
      projectName: await getProjectName((row.project_id as string) || null),
      title: row.title as string,
      description: (row.description as string) || '',
      announcementDate: row.announcement_date as string,
      urgency: (row.urgency as 'red' | 'yellow' | 'green') || 'green',
      createdAt: row.created_at as string,
    }))
  );
}

export async function createAnnouncement(params: {
  title: string;
  description: string;
  announcementDate: string;
  urgency: 'red' | 'yellow' | 'green';
  projectId?: string | null;
}): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('announcements').insert({
    author_id: user.id,
    project_id: params.projectId || null,
    title: params.title,
    description: params.description,
    announcement_date: params.announcementDate,
    urgency: params.urgency,
  });
  if (error) return { error: error.message };
  return {};
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const members: ProjectMember[] = [];

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (project?.user_id) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', project.user_id)
      .single();
    if (ownerProfile) {
      members.push({
        userId: ownerProfile.id as string,
        name: (ownerProfile.full_name as string) || 'Owner',
        email: null,
      });
    }
  }

  const { data: shares } = await supabase
    .from('project_shares')
    .select('shared_with_id')
    .eq('project_id', projectId);

  if (shares) {
    for (const s of shares) {
      const sid = (s as Record<string, unknown>).shared_with_id as string;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', sid)
        .single();
      if (profile) {
        members.push({
          userId: profile.id as string,
          name: (profile.full_name as string) || 'Member',
          email: null,
        });
      }
    }
  }

  return members;
}
