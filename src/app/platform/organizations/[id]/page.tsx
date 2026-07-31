'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Loader2, History, Pencil } from 'lucide-react';
import {
  fetchOrganization, fetchOrgAudit, setOrganizationStatus,
  type OrgDetail, type AuditEntry,
} from '@/lib/platform';
import { orgStatusClass, statusLabel } from '@/lib/orgStatus';
import { ORG_TRANSITIONS, STATUS_ACTION_LABEL, DESTRUCTIVE_STATUSES } from '@/lib/orgLifecycle';
import EditOrgModal from '@/components/platform/EditOrgModal';
import type { OrgStatus } from '@/types/admin';

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<OrgStatus | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchOrganization(id).then(setDetail).catch((e) => setError(e.message));
    fetchOrgAudit(id).then(setAudit).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="card border border-rejected/30 text-rejected text-sm">{error}</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="card"><div className="h-6 w-56 rounded bg-light-gray animate-pulse" /></div>
      </div>
    );
  }

  const { org, members, licensedUsed } = detail;
  const nextStatuses = ORG_TRANSITIONS[org.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <BackLink />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">{org.name}</h1>
            <span className={`badge ${orgStatusClass(org.status)}`}>{statusLabel(org.status)}</span>
          </div>
          <p className="text-sm text-slate-blue-gray mt-1 font-mono">{org.slug}</p>
        </div>
        <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
          <Pencil size={16} /> Edit
        </button>
      </div>

      {/* Overview */}
      <div className="card grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Plan" value={org.plan} />
        <Field label="Licenses" value={`${licensedUsed} / ${org.maxLicensedSeats}`} />
        <Field label="Members" value={String(members.length)} />
        <Field label="Created" value={new Date(org.createdAt).toLocaleDateString()} />
        <Field label="Contact" value={org.primaryContactEmail ?? '—'} />
        <Field label="Volume tier" value={org.volumeTier ?? '—'} />
      </div>

      {/* Lifecycle actions */}
      <div className="card">
        <h3 className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest mb-3">Lifecycle</h3>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-slate-blue-gray">No further transitions from “{statusLabel(org.status)}”.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setTarget(s)}
                className={DESTRUCTIVE_STATUSES.includes(s) ? 'btn-danger' : 'btn-secondary'}
              >
                {STATUS_ACTION_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Members */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-light-gray dark:border-white/6 flex items-center gap-2">
          <Users size={16} className="text-slate-blue-gray" />
          <h3 className="text-sm font-semibold text-dark-navy dark:text-frost-white">Members</h3>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-slate-blue-gray px-4 py-6">
            No members yet. Seed an owner by creating the org with an owner email, or invite users (coming soon).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-blue-gray border-b border-light-gray dark:border-white/6">
                  <th className="font-semibold px-4 py-2">Email</th>
                  <th className="font-semibold px-4 py-2">Role</th>
                  <th className="font-semibold px-4 py-2">Seat</th>
                  <th className="font-semibold px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b border-light-gray dark:border-white/6 last:border-0">
                    <td className="px-4 py-2 text-dark-navy dark:text-frost-white">{m.email ?? m.userId}</td>
                    <td className="px-4 py-2 capitalize">{m.orgRole.replace('_', ' ')}</td>
                    <td className="px-4 py-2 capitalize">{m.seatType}</td>
                    <td className="px-4 py-2 capitalize">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-slate-blue-gray" />
          <h3 className="text-sm font-semibold text-dark-navy dark:text-frost-white">Recent activity</h3>
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-slate-blue-gray">No audit entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {audit.map((a, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-dark-navy dark:text-frost-white">
                  {a.action}
                  {a.after?.status ? (
                    <span className="text-slate-blue-gray"> → {String(a.after.status)}</span>
                  ) : null}
                </span>
                <span className="text-xs text-slate-blue-gray">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {target && (
        <StatusChangeModal
          orgId={id}
          current={org.status}
          target={target}
          onClose={() => setTarget(null)}
          onDone={() => { setTarget(null); load(); }}
        />
      )}

      {editing && (
        <EditOrgModal org={org} onClose={() => setEditing(false)} onSaved={load} />
      )}
    </motion.div>
  );
}

function BackLink() {
  return (
    <Link
      href="/platform/organizations"
      className="inline-flex items-center gap-1.5 text-sm text-steel-blue hover:text-dark-navy dark:text-ice-blue/80 dark:hover:text-ice-blue"
    >
      <ArrowLeft size={16} /> Organizations
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-blue-gray">{label}</p>
      <p className="text-sm text-dark-navy dark:text-frost-white mt-0.5 capitalize break-words">{value}</p>
    </div>
  );
}

function StatusChangeModal({
  orgId, current, target, onClose, onDone,
}: {
  orgId: string; current: OrgStatus; target: OrgStatus;
  onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destructive = DESTRUCTIVE_STATUSES.includes(target);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await setOrganizationStatus(orgId, target, reason);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change status.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={submitting ? undefined : onClose}>
      <div className="modal-container rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-light-gray dark:border-white/6">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">
            {STATUS_ACTION_LABEL[target]}?
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-blue-gray">
            Change status from <span className="font-semibold">{statusLabel(current)}</span> to{' '}
            <span className="font-semibold">{statusLabel(target)}</span>.
            {target === 'suspended' && ' Members will be blocked from signing in; data is retained.'}
            {target === 'cancelled' && ' The org enters a retention window before it can be purged.'}
          </p>
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">
              Reason {destructive ? '(recommended)' : '(optional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="input-field w-full"
              placeholder="Logged to the audit trail"
            />
          </div>
          {error && (
            <div className="text-sm text-rejected bg-rejected/10 border border-rejected/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-light-gray dark:border-white/6">
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
          <button
            onClick={confirm}
            className={`${destructive ? 'btn-danger' : 'btn-primary'} flex items-center gap-2`}
            disabled={submitting}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
