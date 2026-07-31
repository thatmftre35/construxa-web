'use client';

import { createContext, useContext } from 'react';
import type { Organization } from '@/types/admin';

interface OrgAdminContextValue {
  orgs: Organization[];
  selectedOrg: Organization | null;
  setSelectedOrgId: (id: string) => void;
}

export const OrgAdminContext = createContext<OrgAdminContextValue | null>(null);

export function useOrgAdmin(): OrgAdminContextValue {
  const ctx = useContext(OrgAdminContext);
  if (!ctx) throw new Error('useOrgAdmin must be used within the org admin layout');
  return ctx;
}
