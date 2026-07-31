// Shared presentation helpers for organization lifecycle status.
import type { OrgStatus } from '@/types/admin';

export function orgStatusClass(status: OrgStatus): string {
  switch (status) {
    case 'active': return 'badge-active';
    case 'trial': return 'badge-pending';
    case 'past_due': return 'badge-pending';
    case 'suspended': return 'badge-overdue';
    case 'cancelled': return 'bg-light-gray text-slate-blue-gray';
    case 'purged': return 'bg-light-gray text-slate-blue-gray';
    default: return 'bg-light-gray text-slate-blue-gray';
  }
}

export function statusLabel(status: OrgStatus): string {
  return status === 'past_due'
    ? 'Past due'
    : status.charAt(0).toUpperCase() + status.slice(1);
}
