'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { updateOrgMember, type OrgMemberRow } from '@/lib/org';
import type { OrgRole, SeatType, MembershipStatus } from '@/types/admin';

interface EditMemberModalProps {
  orgId: string;
  member: OrgMemberRow;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: OrgRole[] = ['member', 'admin', 'owner', 'billing_only'];

export default function EditMemberModal({ orgId, member, onClose, onSaved }: EditMemberModalProps) {
  const [role, setRole] = useState<OrgRole>(member.orgRole);
  const [seatType, setSeatType] = useState<SeatType>(member.seatType);
  const [status, setStatus] = useState<MembershipStatus>(
    member.status === 'invited' ? 'active' : member.status,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRole: OrgRole = seatType === 'collaborator' ? 'member' : role;

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      await updateOrgMember(orgId, member.userId, effectiveRole, seatType, status);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={submitting ? undefined : onClose}>
      <div className="modal-container rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/6">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white truncate pr-2">
            {member.email ?? 'Member'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray" disabled={submitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Seat</label>
              <select value={seatType} onChange={(e) => setSeatType(e.target.value as SeatType)} className="input-field appearance-none w-full">
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
                {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as MembershipStatus)} className="input-field appearance-none w-full">
              <option value="active">Active</option>
              <option value="suspended">Suspended (deactivated)</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-rejected bg-rejected/10 border border-rejected/20 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-light-gray dark:border-white/6">
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
          <button onClick={save} className="btn-primary flex items-center gap-2" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
