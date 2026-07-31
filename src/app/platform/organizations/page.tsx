'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, Search, Plus } from 'lucide-react';
import { fetchOrganizations, type OrgWithCounts } from '@/lib/platform';
import { orgStatusClass, statusLabel } from '@/lib/orgStatus';
import CreateOrgModal from '@/components/platform/CreateOrgModal';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgWithCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const load = useCallback(() => {
    setError(null);
    fetchOrganizations().then(setOrgs).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!orgs) return null;
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [orgs, query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">Organizations</h1>
          <p className="text-sm text-slate-blue-gray mt-1">
            {orgs ? `${orgs.length} total` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-blue-gray" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or slug"
              className="input-field pl-9 w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} /> <span className="hidden sm:inline">New organization</span>
          </button>
        </div>
      </div>

      <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />

      {error && (
        <div className="card border border-rejected/30 text-rejected text-sm">{error}</div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-blue-gray border-b border-light-gray">
                <th className="font-semibold px-4 py-3">Organization</th>
                <th className="font-semibold px-4 py-3">Status</th>
                <th className="font-semibold px-4 py-3">Plan</th>
                <th className="font-semibold px-4 py-3 text-right">Members</th>
                <th className="font-semibold px-4 py-3 text-right">Licensed</th>
                <th className="font-semibold px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {!filtered ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-light-gray last:border-0">
                    <td className="px-4 py-3" colSpan={6}>
                      <div className="h-5 w-full max-w-md rounded bg-light-gray animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-center text-slate-blue-gray">
                      <Building2 size={28} />
                      <p className="font-medium text-dark-navy dark:text-frost-white">
                        {query ? 'No matches' : 'No organizations yet'}
                      </p>
                      <p className="text-sm">
                        {query ? 'Try a different search.' : 'Provisioning arrives in the next phase.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/platform/organizations/${o.id}`)}
                    className="border-b border-light-gray last:border-0 hover:bg-white/25 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-dark-navy dark:text-frost-white">{o.name}</div>
                      <div className="text-xs text-slate-blue-gray">{o.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${orgStatusClass(o.status)}`}>{statusLabel(o.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-dark-navy dark:text-frost-white capitalize">{o.plan}</td>
                    <td className="px-4 py-3 text-right text-dark-navy dark:text-frost-white">{o.memberCount}</td>
                    <td className="px-4 py-3 text-right text-dark-navy dark:text-frost-white">{o.licensedSeats}</td>
                    <td className="px-4 py-3 text-slate-blue-gray">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
