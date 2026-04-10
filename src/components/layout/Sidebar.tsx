'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  PlusCircle,
  Inbox,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/create', label: 'Create Project', icon: PlusCircle },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount?: number;
}

export default function Sidebar({ isOpen, onClose, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : profile?.full_name
      ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : '??';

  const displayName = profile?.full_name
    ?? ([profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || 'User');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-overlay z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          sidebar-glass
          fixed top-0 left-0 z-50 h-full w-[280px]
          border-r
          flex flex-col transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-steel-blue hover:text-dark-navy dark:text-ice-blue dark:hover:text-frost-white lg:hidden"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <h1 className="font-display text-3xl tracking-[6px] text-dark-navy dark:text-ice-blue">
            CONSTRUXA
          </h1>
          <div className="mt-3 w-10 h-[3px] bg-ice-blue rounded-full" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 py-3 px-4 rounded-xl transition-colors duration-200
                  ${isActive
                    ? 'bg-white/40 text-dark-navy font-semibold dark:bg-white/10 dark:text-ice-blue'
                    : 'text-steel-blue hover:bg-white/25 hover:text-dark-navy dark:text-ice-blue/70 dark:hover:bg-white/6'
                  }
                `}
              >
                <Icon size={20} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/inbox' && unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rejected text-white text-xs font-semibold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile card */}
        <div className="p-4 border-t border-white/50 dark:border-white/6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-steel-blue text-white flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark-navy dark:text-frost-white truncate">
                {displayName}
              </p>
              {profile?.role && (
                <p className="text-xs text-steel-blue dark:text-ice-blue truncate">
                  {profile.role}
                </p>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex-shrink-0 p-2 text-slate-blue-gray hover:text-rejected transition-colors rounded-lg hover:bg-frost-white dark:hover:bg-steel-blue/10"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
