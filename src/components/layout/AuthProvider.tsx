'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const session = useAuthStore((s) => s.session);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const isLoaded = useProjectStore((s) => s.isLoaded);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch projects once authenticated
  useEffect(() => {
    if (session && !isLoaded) {
      fetchProjects();
    }
  }, [session, isLoaded, fetchProjects]);

  return <>{children}</>;
}
