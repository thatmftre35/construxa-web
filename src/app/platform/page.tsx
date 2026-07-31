'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Users, BadgeCheck, ArrowRight } from 'lucide-react';
import { fetchOrganizations, type OrgWithCounts } from '@/lib/platform';
import { orgStatusClass, statusLabel } from '@/lib/orgStatus';
import type { OrgStatus } from '@/types/admin';

const STATUS_ORDER: OrgStatus[] = [
  'trial', 'active', 'past_due', 'suspended', 'cancelled', 'purged',
];

export default function PlatformOverviewPage() {
  const [orgs, setOrgs] = useState<OrgWithCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations().then(setOrgs).catch((e) => setError(e.message));
  }, []);

  const totalMembers = orgs?.reduce((n, o) => n + o.memberCount, 0) ?? 0;
  const totalLicensed = orgs?.reduce((n, o) => n + o.licensedSeats, 0) ?? 0;
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    count: orgs?.filter((o) => o.status === s).length ?? 0,
  })).filter((x) => x.count > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">Overview</h1>
        <p className="text-sm text-slate-blue-gray mt-1">Platform health at a glance.</p>
      </div>

      {error && (
        <div className="card border border-rejected/30 text-rejected text-sm">{error}</div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile icon={Building2} label="Organizations" value={orgs?.length} loading={!orgs} />
        <StatTile icon={Users} label="Total members" value={totalMembers} loading={!orgs} />
        <StatTile icon={BadgeCheck} label="Licensed seats" value={totalLicensed} loading={!orgs} />
      </div>

      {/* Status breakdown */}
      <div className="card">
        <h3 className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest mb-4">
          Organizations by status
        </h3>
        {!orgs ? (
          <div className="h-6 w-48 rounded bg-light-gray animate-pulse" />
        ) : byStatus.length === 0 ? (
          <p className="text-sm text-slate-blue-gray">No organizations yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {byStatus.map((x) => (
              <span key={x.status} className={`badge ${orgStatusClass(x.status)}`}>
                {statusLabel(x.status)} · {x.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/platform/organizations"
        className="card flex items-center justify-between hover:shadow-md transition-shadow group"
      >
        <span className="font-medium text-dark-navy dark:text-frost-white">Manage organizations</span>
        <ArrowRight size={18} className="text-slate-blue-gray group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  );
}

function StatTile({
  icon: Icon, label, value, loading,
}: {
  icon: typeof Building2; label: string; value?: number; loading: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-slate-blue-gray mb-2">
        <Icon size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-14 rounded bg-light-gray animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-dark-navy dark:text-frost-white">{value}</p>
      )}
    </div>
  );
}
