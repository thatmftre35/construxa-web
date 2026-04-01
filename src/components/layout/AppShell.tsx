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
      <div className="flex items-center justify-center min-h-screen bg-frost-white dark:bg-[#1a2229] transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-ice-blue border-t-steel-blue rounded-full animate-spin" />
          <p className="text-sm text-slate-blue-gray">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frost-white dark:bg-[#1a2229] transition-colors">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 backdrop-blur-xl border-b lg:hidden bg-glass-strong/90 border-glass-border dark:bg-dark-navy/80 dark:border-steel-blue/20">
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
          className="p-2.5 rounded-xl backdrop-blur-xl border transition-colors bg-glass-strong border-glass-border text-steel-blue hover:bg-white dark:bg-dark-navy/60 dark:border-steel-blue/20 dark:text-ice-blue dark:hover:bg-steel-blue/20"
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
