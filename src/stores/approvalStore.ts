'use client';

import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';

export interface ApprovalRecord {
  id: string;
  documentId: string;
  revisionId: string | null;
  projectId: string;
  requesterId: string;
  requesterName: string;
  approverId: string;
  approverName: string;
  documentName: string;
  projectName: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface ApprovalState {
  approvals: ApprovalRecord[];
  isLoaded: boolean;
  fetchApprovals: () => Promise<void>;
  requestApproval: (params: {
    documentId: string;
    revisionId?: string | null;
    projectId: string;
    approverId: string;
  }) => Promise<ApprovalRecord | null>;
  respondToApproval: (approvalId: string, status: 'approved' | 'rejected', comment?: string) => Promise<void>;
  getDocumentApprovalStatus: (documentId: string) => 'pending' | 'approved' | 'rejected' | null;
  getRevisionApprovalStatus: (revisionId: string) => 'pending' | 'approved' | 'rejected' | null;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: [],
  isLoaded: false,

  fetchApprovals: async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoaded: true }); return; }

      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .or(`requester_id.eq.${user.id},approver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch approvals:', error.message);
        set({ isLoaded: true });
        return;
      }

      // Batch-fetch user profiles and document/project names
      const rows = (data || []) as Record<string, unknown>[];
      const userIds = new Set<string>();
      const docIds = new Set<string>();
      const projIds = new Set<string>();

      rows.forEach((r) => {
        userIds.add(r.requester_id as string);
        userIds.add(r.approver_id as string);
        docIds.add(r.document_id as string);
        projIds.add(r.project_id as string);
      });

      // Fetch profiles
      const profileMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name')
          .in('id', [...userIds]);
        (profiles || []).forEach((p: Record<string, unknown>) => {
          const name = (p.full_name as string)
            || [p.first_name, p.last_name].filter(Boolean).join(' ')
            || 'Unknown';
          profileMap[p.id as string] = name;
        });
      }

      // Fetch document names
      const docMap: Record<string, string> = {};
      if (docIds.size > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, name')
          .in('id', [...docIds]);
        (docs || []).forEach((d: Record<string, unknown>) => {
          docMap[d.id as string] = d.name as string;
        });
      }

      // Fetch project names
      const projMap: Record<string, string> = {};
      if (projIds.size > 0) {
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', [...projIds]);
        (projs || []).forEach((p: Record<string, unknown>) => {
          projMap[p.id as string] = p.name as string;
        });
      }

      const approvals: ApprovalRecord[] = rows.map((r) => ({
        id: r.id as string,
        documentId: r.document_id as string,
        revisionId: (r.revision_id as string) || null,
        projectId: r.project_id as string,
        requesterId: r.requester_id as string,
        requesterName: profileMap[r.requester_id as string] || 'Unknown',
        approverId: r.approver_id as string,
        approverName: profileMap[r.approver_id as string] || 'Unknown',
        documentName: docMap[r.document_id as string] || 'Unknown Document',
        projectName: projMap[r.project_id as string] || 'Unknown Project',
        status: r.status as 'pending' | 'approved' | 'rejected',
        comment: (r.comment as string) || null,
        createdAt: r.created_at as string,
        resolvedAt: (r.resolved_at as string) || null,
      }));

      set({ approvals, isLoaded: true });
    } catch (err) {
      console.warn('Error fetching approvals:', err);
      set({ isLoaded: true });
    }
  },

  requestApproval: async ({ documentId, revisionId, projectId, approverId }) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('approvals')
        .insert({
          document_id: documentId,
          revision_id: revisionId || null,
          project_id: projectId,
          requester_id: user.id,
          approver_id: approverId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to request approval:', error.message);
        return null;
      }

      // Re-fetch to get full names
      await get().fetchApprovals();
      return get().approvals.find((a) => a.id === (data as Record<string, unknown>).id) || null;
    } catch (err) {
      console.warn('Error requesting approval:', err);
      return null;
    }
  },

  respondToApproval: async (approvalId, status, comment) => {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('approvals')
        .update({
          status,
          comment: comment || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (error) {
        console.warn('Failed to respond to approval:', error.message);
        return;
      }

      set((state) => ({
        approvals: state.approvals.map((a) =>
          a.id === approvalId
            ? { ...a, status, comment: comment || null, resolvedAt: new Date().toISOString() }
            : a
        ),
      }));
    } catch (err) {
      console.warn('Error responding to approval:', err);
    }
  },

  getDocumentApprovalStatus: (documentId) => {
    const approvals = get().approvals.filter(
      (a) => a.documentId === documentId && !a.revisionId
    );
    if (approvals.length === 0) return null;
    // Latest approval takes precedence
    const latest = approvals[0];
    return latest.status;
  },

  getRevisionApprovalStatus: (revisionId) => {
    const approvals = get().approvals.filter(
      (a) => a.revisionId === revisionId
    );
    if (approvals.length === 0) return null;
    const latest = approvals[0];
    return latest.status;
  },
}));
