// Org lifecycle state machine — client mirror of set_organization_status in SQL.
// Used only to gate which action buttons appear; the RPC is authoritative.
import type { OrgStatus } from '@/types/admin';

export const ORG_TRANSITIONS: Record<OrgStatus, OrgStatus[]> = {
  trial: ['active', 'suspended', 'cancelled'],
  active: ['past_due', 'suspended', 'cancelled'],
  past_due: ['active', 'suspended', 'cancelled'],
  suspended: ['active', 'cancelled'],
  cancelled: ['active'],
  purged: [],
};

// Verb shown on the action button for a target status.
export const STATUS_ACTION_LABEL: Record<OrgStatus, string> = {
  trial: 'Move to trial',
  active: 'Activate',
  past_due: 'Mark past due',
  suspended: 'Suspend',
  cancelled: 'Cancel',
  purged: 'Purge',
};

// Statuses whose action is destructive enough to warrant a reason + confirm.
export const DESTRUCTIVE_STATUSES: OrgStatus[] = ['suspended', 'cancelled'];
