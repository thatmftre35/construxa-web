'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, BadgeCheck, ArrowRight } from 'lucide-react';
import { fetchOrgAdminData, type OrgAdminData } from '@/lib/org';
import { orgStatusClass, statusLabel } from '@/lib/orgStatus';
import { useOrgAdmin } from './context';

export default function OrgOverviewPage() {
  const { selectedOrg } = useOrgAdmin();
  const [data, setData] = useState<OrgAdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedOrg) return;
    setData(null);
    fetchOrgAdminData(selectedOrg.id).then(setData).catch((e) => setError(e.message));
  }, [selectedOrg]);

  if (!selectedOrg) return null;
  const org = selectedOrg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">{org.name}</h1>
        <span className={`badge ${orgStatusClass(org.status)}`}>{statusLabel(org.status)}</span>
      </div>

      {error && <div className="card border border-rejected/30 text-rejected text-sm">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Tile label="Plan" value={org.plan} />
        <Tile
          label="Licensed seats"
          value={data ? `${data.licensedUsed} / ${org.maxLicensedSeats}` : undefined}
        />
        <Tile label="Members" value={data ? String(data.members.length) : undefined} />
        <Tile label="Pending invites" value={data ? String(data.invitations.length) : undefined} />
      </div>

      <div className="card">
        <h3 className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest mb-3">Organization</h3>
        <dl className="space-y-2 text-sm">
          <Row label="Slug" value={org.slug} mono />
          <Row label="Primary contact" value={org.primaryContactEmail ?? '—'} />
          <Row label="Volume tier" value={org.volumeTier ?? '—'} />
        </dl>
        <p className="text-[11px] text-slate-blue-gray mt-3">
          Plan, status and license count are managed by Construxa. Contact us to change them.
        </p>
      </div>

      <Link href="/org/members" className="card flex items-center justify-between hover:shadow-md transition-shadow group">
        <span className="flex items-center gap-2 font-medium text-dark-navy dark:text-frost-white">
          <Users size={18} /> Manage members &amp; seats
        </span>
        <ArrowRight size={18} className="text-slate-blue-gray group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {data && org.maxLicensedSeats > 0 && data.licensedUsed >= org.maxLicensedSeats && (
        <div className="card border border-pending/30 flex items-center gap-2 text-sm text-pending">
          <BadgeCheck size={16} /> All {org.maxLicensedSeats} licensed seats are in use.
        </div>
      )}
    </motion.div>
  );
}

function Tile({ label, value }: { label: string; value?: string }) {
  return (
    <div className="card">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-blue-gray">{label}</p>
      {value === undefined
        ? <div className="h-8 w-14 mt-1 rounded bg-light-gray animate-pulse" />
        : <p className="text-2xl font-bold text-dark-navy dark:text-frost-white mt-1 capitalize">{value}</p>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-blue-gray">{label}</dt>
      <dd className={`text-dark-navy dark:text-frost-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
