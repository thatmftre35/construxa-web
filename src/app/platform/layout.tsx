'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutGrid, ArrowLeft, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/components/layout/ThemeProvider';

const tabs = [
  { href: '/platform', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/platform/organizations', label: 'Organizations', icon: Building2, exact: false },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { theme, toggle } = useTheme();

  // Client-side defense in depth; middleware is the authoritative gate.
  if (isLoading || profile === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-3 border-ice-blue border-t-steel-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile.platform_role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-6">
        <ShieldCheck size={32} className="text-slate-blue-gray" />
        <h1 className="text-xl font-bold text-dark-navy dark:text-frost-white">Not authorized</h1>
        <p className="text-sm text-slate-blue-gray max-w-sm">
          The Platform Admin Center is restricted to platform staff.
        </p>
        <Link href="/dashboard" className="btn-secondary mt-2">Back to app</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Platform top bar — deliberately distinct from the tenant app chrome. */}
      <header className="sidebar-glass sticky top-0 z-30 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <ShieldCheck size={20} className="text-steel-blue dark:text-ice-blue flex-shrink-0" />
              <span className="font-display text-lg tracking-[3px] text-dark-navy dark:text-ice-blue truncate">
                PLATFORM ADMIN
              </span>
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-slate-blue-gray border border-slate-blue-gray/40 rounded px-1.5 py-0.5">
                Internal
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-steel-blue hover:text-dark-navy dark:text-ice-blue/80 dark:hover:text-ice-blue px-3 py-1.5 rounded-lg hover:bg-white/25 dark:hover:bg-white/6 transition-colors"
              >
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Exit to app</span>
              </Link>
              <button
                onClick={toggle}
                className="p-2 rounded-lg text-steel-blue hover:bg-white/25 dark:text-ice-blue dark:hover:bg-white/6 transition-colors"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          {/* Tabs */}
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
