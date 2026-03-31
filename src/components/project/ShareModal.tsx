'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Trash2, UserPlus, Clock, Users } from 'lucide-react';
import {
  shareProject,
  getProjectShares,
  getProjectInvitations,
  removeShare,
  revokeInvitation,
  type ProjectShare,
  type ProjectInvitation,
} from '@/lib/sharing';

interface ShareModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export default function ShareModal({ projectId, projectName, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  async function loadCollaborators() {
    const [s, i] = await Promise.all([
      getProjectShares(projectId),
      getProjectInvitations(projectId),
    ]);
    setShares(s);
    setInvitations(i);
  }

  async function handleShare() {
    if (!email.trim()) return;
    setLoading(true);
    setMessage(null);

    const result = await shareProject(projectId, email.trim(), role);

    if (result.error) {
      setMessage({ text: result.error, type: 'error' });
    } else if (result.type === 'shared') {
      setMessage({ text: 'Project shared successfully', type: 'success' });
    } else {
      setMessage({ text: 'Invitation sent — they\'ll see the project when they sign up', type: 'success' });
    }

    setEmail('');
    setLoading(false);
    await loadCollaborators();
  }

  async function handleRemoveShare(shareId: string) {
    await removeShare(shareId);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  }

  async function handleRevokeInvitation(invitationId: string) {
    await revokeInvitation(invitationId);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray">
          <div>
            <h2 className="text-lg font-semibold text-dark-navy">Share Project</h2>
            <p className="text-xs text-slate-blue-gray mt-0.5">{projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-frost-white transition-colors text-slate-blue-gray">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Form */}
        <div className="px-5 py-4 border-b border-light-gray">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-blue-gray" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="input-field pl-10 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
              className="px-3 py-2 rounded-xl border border-light-gray text-sm text-dark-navy bg-white"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <button
            onClick={handleShare}
            disabled={loading || !email.trim()}
            className="btn-primary w-full mt-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Sharing...' : 'Share'}
          </button>

          {message && (
            <p className={`text-xs mt-2 ${message.type === 'error' ? 'text-rejected' : 'text-approved'}`}>
              {message.text}
            </p>
          )}
        </div>

        {/* Collaborators */}
        <div className="px-5 py-4 max-h-64 overflow-y-auto">
          {shares.length === 0 && invitations.length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-8 h-8 text-ice-blue mx-auto mb-2" />
              <p className="text-sm text-slate-blue-gray">No collaborators yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-steel-blue/10 flex items-center justify-center text-xs font-semibold text-steel-blue">
                    {(share.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-navy truncate">{share.name || 'User'}</p>
                    <p className="text-xs text-slate-blue-gray capitalize">{share.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveShare(share.id)}
                    className="p-1.5 rounded-lg hover:bg-frost-white text-slate-blue-gray hover:text-rejected transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-pending/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-pending" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-navy truncate">{inv.email}</p>
                    <p className="text-xs text-pending">Pending invitation &middot; {inv.role}</p>
                  </div>
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="p-1.5 rounded-lg hover:bg-frost-white text-slate-blue-gray hover:text-rejected transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
