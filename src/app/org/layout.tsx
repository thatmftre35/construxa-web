'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, ArrowLeft, ShieldCheck, ChevronDown } from 'lucide-react';
import { fetchMyAdminOrgs } from '@/lib/org';
import type { Organization } from '@/types/admin';
import { OrgAdminContext } from './context';

const STORAGE_KEY = 'construxa.orgAdmin.selectedOrg';

const tabs = [
  { href: '/org', label: 'Overview', icon: Building2, exact: true },
  { href: '/org/members', label: 'Members', icon: Users, exact: false },
];

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyAdminOrgs()
      .then((list) => {
        setOrgs(list);
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        const initial = list.find((o) => o.id === stored)?.id ?? list[0]?.id ?? null;
        setSelectedId(initial);
      })
      .catch((e) => setError(e.message));
  }, []);

  function setSelectedOrgId(id: string) {
    setSelectedId(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }

  const selectedOrg = useMemo(
    () => orgs?.find((o) => o.id === selectedId) ?? null,
    [orgs, selectedId],
  );

  if (error) {
    return <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card border border-rejected/30 text-rejected text-sm">{error}</div>
    </div>;
  }

  if (!orgs) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-ice-blue border-t-steel-blue rounded-full animate-spin" />
    </div>;
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <ShieldCheck size={32} className="text-slate-blue-gray" />
        <h1 className="text-xl font-bold text-dark-navy dark:text-frost-white">No organization to manage</h1>
        <p className="text-sm text-slate-blue-gray max-w-sm">
          The Organization admin area is for owners and admins. You&apos;re not an admin of any organization.
        </p>
        <Link href="/dashboard" className="btn-secondary mt-2">Back to app</Link>
      </div>
    );
  }

  return (
    <OrgAdminContext.Provider value={{ orgs, selectedOrg, setSelectedOrgId }}>
      <div className="min-h-screen">
        <header className="sidebar-glass sticky top-0 z-30 border-b">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="h-14 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Building2 size={20} className="text-steel-blue dark:text-ice-blue flex-shrink-0" />
                <span className="font-display text-lg tracking-[3px] text-dark-navy dark:text-ice-blue truncate">
                  ORGANIZATION
                </span>
                {orgs.length > 1 ? (
                  <div className="relative">
                    <select
                      value={selectedId ?? ''}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="input-field appearance-none !py-1.5 !px-3 pr-8 text-sm max-w-[200px]"
                    >
                      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-blue-gray pointer-events-none" />
                  </div>
                ) : (
                  <span className="text-sm text-slate-blue-gray truncate hidden sm:inline">· {selectedOrg?.name}</span>
                )}
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-steel-blue hover:text-dark-navy dark:text-ice-blue/80 dark:hover:text-ice-blue px-3 py-1.5 rounded-lg hover:bg-white/25 dark:hover:bg-white/6 transition-colors"
              >
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Exit to app</span>
              </Link>
            </div>
            <nav className="flex items-center gap-1 -mb-px">
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                      active
                        ? 'border-steel-blue text-dark-navy font-semibold dark:text-ice-blue dark:border-ice-blue'
                        : 'border-transparent text-slate-blue-gray hover:text-dark-navy dark:hover:text-ice-blue'
                    }`}
                  >
                    <Icon size={16} /> {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </div>
    </OrgAdminContext.Provider>
  );
}
