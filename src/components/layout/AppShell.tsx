'use client';

import { useState } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from './ThemeProvider';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { theme, toggle } = useTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-ice-blue border-t-steel-blue rounded-full animate-spin" />
          <p className="text-sm text-slate-blue-gray">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b lg:hidden backdrop-blur-2xl bg-white/60 border-white/70 dark:bg-white/4 dark:border-white/6">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-steel-blue hover:bg-frost-white dark:hover:bg-steel-blue/10 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-3 font-display text-xl tracking-[4px] text-steel-blue dark:text-ice-blue">
            CONSTRUXA
          </h1>
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-steel-blue hover:bg-frost-white dark:text-ice-blue dark:hover:bg-steel-blue/10 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Desktop theme toggle */}
      <div className="hidden lg:flex fixed top-5 right-6 z-30">
        <button
          onClick={toggle}
          className="p-2.5 rounded-xl border transition-colors backdrop-blur-xl bg-white/50 border-white/60 text-steel-blue hover:bg-white/70 dark:bg-white/5 dark:border-white/8 dark:text-ice-blue dark:hover:bg-white/10"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Main content */}
      <main className="lg:ml-[280px] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
