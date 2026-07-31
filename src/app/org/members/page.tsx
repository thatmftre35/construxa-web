'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, MoreHorizontal, Loader2 } from 'lucide-react';
import {
  fetchOrgAdminData, inviteOrgMember, revokeOrgInvitation,
  type OrgAdminData, type OrgMemberRow,
} from '@/lib/org';
import InviteMemberModal from '@/components/org/InviteMemberModal';
import EditMemberModal from '@/components/org/EditMemberModal';
import { useOrgAdmin } from '../context';

export default function OrgMembersPage() {
  const { selectedOrg } = useOrgAdmin();
  const [data, setData] = useState<OrgAdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<OrgMemberRow | null>(null);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!selectedOrg) return;
    setError(null);
    fetchOrgAdminData(selectedOrg.id).then(setData).catch((e) => setError(e.message));
  }, [selectedOrg]);

  useEffect(() => { setData(null); load(); }, [load]);

  if (!selectedOrg) return null;
  const org = selectedOrg;
  const seatsFull = org.maxLicensedSeats > 0 && (data?.licensedUsed ?? 0) >= org.maxLicensedSeats;

  async function resend(email: string, role: OrgMemberRow['orgRole'], seat: OrgMemberRow['seatType']) {
    setBusyInvite(email);
    try {
      await inviteOrgMember(org.id, org.name, email, role, seat);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend.');
    } finally {
      setBusyInvite(null);
    }
  }

  async function revoke(id: string) {
    setBusyInvite(id);
    try {
      await revokeOrgInvitation(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke.');
    } finally {
      setBusyInvite(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">Members</h1>
          <p className="text-sm text-slate-blue-gray mt-1">
            {data ? `${data.members.length} members · ${data.licensedUsed}/${org.maxLicensedSeats} licensed seats` : 'Loading…'}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Invite member
        </button>
      </div>

      {seatsFull && (
        <div className="card border border-pending/30 text-sm text-pending">
          All {org.maxLicensedSeats} licensed seats are in use. New licensed invites will be blocked until seats are freed or the license count is raised (contact Construxa).
        </div>
      )}
      {error && <div className="card border border-rejected/30 text-rejected text-sm">{error}</div>}

      {/* Pending invitations */}
      {data && data.invitations.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-light-gray dark:border-white/6 flex items-center gap-2">
            <Mail size={16} className="text-slate-blue-gray" />
            <h3 className="text-sm font-semibold text-dark-navy dark:text-frost-white">Pending invitations</h3>
          </div>
          <div className="divide-y divide-light-gray dark:divide-white/6">
            {data.invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-dark-navy dark:text-frost-white truncate">{inv.email}</p>
                  <p className="text-xs text-slate-blue-gray capitalize">
                    {inv.orgRole.replace('_', ' ')} · {inv.seatType}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => resend(inv.email, inv.orgRole, inv.seatType)}
                    className="btn-ghost text-sm flex items-center gap-1"
                    disabled={busyInvite === inv.email}
                  >
                    {busyInvite === inv.email ? <Loader2 size={14} className="animate-spin" /> : null} Resend
                  </button>
                  <button
                    onClick={() => revoke(inv.id)}
                    className="text-sm text-rejected hover:underline"
                    disabled={busyInvite === inv.id}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-blue-gray border-b border-light-gray dark:border-white/6">
                <th className="font-semibold px-4 py-3">Email</th>
                <th className="font-semibold px-4 py-3">Role</th>
                <th className="font-semibold px-4 py-3">Seat</th>
                <th className="font-semibold px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-light-gray dark:border-white/6 last:border-0">
                    <td colSpan={5} className="px-4 py-3"><div className="h-5 w-full max-w-sm rounded bg-light-gray animate-pulse" /></td>
                  </tr>
                ))
              ) : data.members.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-blue-gray">No members yet.</td></tr>
              ) : (
                data.members.map((m) => (
                  <tr key={m.userId} className="border-b border-light-gray dark:border-white/6 last:border-0">
                    <td className="px-4 py-3 text-dark-navy dark:text-frost-white">{m.email ?? m.userId}</td>
                    <td className="px-4 py-3 capitalize">{m.orgRole.replace('_', ' ')}</td>
                    <td className="px-4 py-3 capitalize">{m.seatType}</td>
                    <td className="px-4 py-3">
                      <span className={m.status === 'active' ? 'text-approved' : 'text-slate-blue-gray'}>
                        {m.status === 'suspended' ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(m)}
                        className="p-1.5 rounded-lg text-slate-blue-gray hover:bg-frost-white dark:hover:bg-white/5"
                        title="Edit member"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <InviteMemberModal
          orgId={org.id}
          orgName={org.name}
          onClose={() => setShowInvite(false)}
          onDone={load}
        />
      )}
      {editing && (
        <EditMemberModal
          orgId={org.id}
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </motion.div>
  );
}
