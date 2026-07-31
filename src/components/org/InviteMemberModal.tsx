'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { inviteOrgMember } from '@/lib/org';
import type { OrgRole, SeatType } from '@/types/admin';

interface InviteMemberModalProps {
  orgId: string;
  orgName: string;
  onClose: () => void;
  onDone: () => void;
}

const ROLES: OrgRole[] = ['member', 'admin', 'owner', 'billing_only'];

export default function InviteMemberModal({ orgId, orgName, onClose, onDone }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [seatType, setSeatType] = useState<SeatType>('licensed');
  const [role, setRole] = useState<OrgRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collaborators can only be members.
  const effectiveRole: OrgRole = seatType === 'collaborator' ? 'member' : role;

  async function submit() {
    if (!email.trim()) { setError('Email is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await inviteOrgMember(orgId, orgName, email.trim(), effectiveRole, seatType);
      if (res.emailError) {
        setError(
          `${res.outcome === 'added' ? 'Added' : 'Invited'}, but the email failed: ${res.emailError}`,
        );
        setSubmitting(false);
        onDone(); // membership/invite still created — refresh the list
        return;
      }
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not invite.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={submitting ? undefined : onClose}>
      <div className="modal-container rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/6">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">Invite member</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray" disabled={submitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">
              Email <span className="text-rejected">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              placeholder="person@company.com"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Seat</label>
              <select
                value={seatType}
                onChange={(e) => setSeatType(e.target.value as SeatType)}
                className="input-field appearance-none w-full"
              >
                <option value="licensed">Licensed</option>
                <option value="collaborator">Collaborator (free)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Role</label>
              <select
                value={effectiveRole}
                onChange={(e) => setRole(e.target.value as OrgRole)}
                disabled={seatType === 'collaborator'}
                className="input-field appearance-none w-full disabled:opacity-60"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-blue-gray">
            {seatType === 'collaborator'
              ? 'Collaborators are free and limited to the member role.'
              : 'Licensed seats count against your license total and can hold any role.'}
          </p>

          {error && (
            <div className="text-sm text-rejected bg-rejected/10 border border-rejected/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-light-gray dark:border-white/6">
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
          <button onClick={submit} className="btn-primary flex items-center gap-2" disabled={submitting || !email.trim()}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Send invite
          </button>
        </div>
      </div>
    </div>
  );
}
