// Tenant-context guard (Phase 1).
//
// The AUTHORITATIVE tenant boundary is Postgres RLS (policies keyed on
// `memberships` via auth.uid()) plus the SECURITY DEFINER service RPCs. This
// module is the app-layer counterpart: a helper that makes org-scoped queries
// fail loudly if they're ever built without an organization id, so a missing
// tenant context surfaces as an error instead of a silently unscoped query.
//
// Rule of thumb: any read/write against a tenant-owned table (projects,
// documents, events, tasks, messages, announcements, ...) must go through
// `scopeToOrg`, never a bare `.from(table).select()`.

export class TenantContextError extends Error {
  constructor(message = 'Tenant context required: no organizationId in scope') {
    super(message);
    this.name = 'TenantContextError';
  }
}

/** Assert an organization id is present; return it narrowed to `string`. */
export function requireOrgId(orgId: string | null | undefined): string {
  if (!orgId || typeof orgId !== 'string') {
    throw new TenantContextError();
  }
  return orgId;
}

// Minimal shape of a Supabase/PostgREST filter builder: anything with `.eq`
// that returns the same builder type. Keeps this decoupled from supabase-js
// generics while staying type-safe at call sites.
type OrgFilterable<T> = { eq: (column: 'organization_id', value: string) => T };

/**
 * Constrain a query to a single organization. Throws `TenantContextError` if
 * `orgId` is missing, so an org-scoped query can never run unscoped.
 *
 *   const { data } = await scopeToOrg(
 *     supabase.from('projects').select('*'),
 *     currentOrgId,
 *   );
 */
export function scopeToOrg<T>(query: OrgFilterable<T>, orgId: string | null | undefined): T {
  return query.eq('organization_id', requireOrgId(orgId));
}
