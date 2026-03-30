'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-frost-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-ice-blue border-t-steel-blue rounded-full animate-spin" />
          <p className="text-sm text-slate-blue-gray">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frost-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center h-14 px-4 bg-white border-b border-light-gray lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-steel-blue hover:bg-frost-white rounded-lg"
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-3 font-display text-xl tracking-[4px] text-steel-blue">
          CONSTRUXA
        </h1>
      </div>

      {/* Main content */}
      <main className="lg:ml-[280px] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
