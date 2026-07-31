# Admin Centers — Architecture Decisions

Scope: the **Platform Admin Center** (`/platform`, internal owner-facing) and the
**Organization Admin Center** (`/settings`, customer-facing). **Web-only** — these
surfaces live entirely in the Next.js app and are not ported to the iOS/Expo app.

This document records the binding decisions. It adapts the original spec
(`admin-centers-prompt.md`), which assumed a traditional server + ORM
(Next/tRPC/Express + Prisma), to Construxa's actual stack.

## Stack reality

- **Next.js 15 App Router + React 19 + TypeScript**, Tailwind v4, custom UI
  components, zustand for state. Deployed Vercel-style.
- **Supabase** (Postgres) accessed directly via `@supabase/supabase-js` /
  `@supabase/ssr`. **No ORM.** Server runtime = Next middleware + server
  components (+ Server Actions we will add). Privileged server logic historically
  lives in Supabase **Edge Functions** (Deno, service-role).
- Migrations physically live in the **iOS repo** at
  `../construxa/supabase/migrations/`; the web repo keeps a mirror in
  `supabase-setup.sql`. Both apps share **one** Supabase project.

## How the spec's non-negotiables map to this stack

| Spec requirement | Decision here |
| --- | --- |
| ORM is primary guard, RLS is backstop | **RLS is the primary guard**, keyed on `memberships` via `auth.uid()`. There is no server ORM to be the primary. Deny-by-default. |
| "Service layer: authorize → validate → audit → commit in one transaction; no route handler touches the ORM" | **Postgres `SECURITY DEFINER` RPCs** perform the atomic write **and** its audit entry in a single DB transaction. Thin **Next Server Actions** validate input (zod) and call the RPC. The browser never holds authorization logic. |
| `SET LOCAL app.current_org_id` per request; unbypassable connection helper | Not viable under pooled PostgREST. Equivalent guarantee: RLS membership checks + every RPC takes `org_id` explicitly and **re-asserts membership/role internally**. App-layer `src/lib/tenant.ts#scopeToOrg` throws if an org-scoped query is built without an org id. |
| Dedicated `platform` schema, not subject to tenant RLS | Kept in **`public`** (avoids PostgREST schema-exposure config). "Not subject to tenant RLS" is achieved with platform-role policies (`is_platform_admin`), not schema separation. |
| Platform admin ≠ super-user of every org; access is explicit, audited, time-boxed | `profiles.platform_role` gates `/platform`. Cross-org data access is only via impersonation/support sessions (Phase 4), audited and time-boxed. |

## Identity & tenancy model

- **Users are global** (Supabase `auth.users` + `public.profiles`), keyed on email.
- **`organizations`** — the tenant. Lifecycle `status`: `trial → active →
  past_due → suspended → cancelled → purged` (transitions enforced in the service
  layer, Phase 3).
- **`memberships`** — user ↔ org join. Carries `org_role`
  (`owner > admin > member > billing_only`) and `seat_type`
  (`licensed` = billable | `collaborator` = free, permission-limited). A user may
  belong to many orgs. "User belongs to org" is **never** a column on the user.
- **`organization_id`** added to every tenant-owned table.

### Migration posture (Phase 1)

The app is currently single-user (`projects.user_id`). Since existing data is
disposable test data:

- `organization_id` is added **nullable** and **backfilled** (one bootstrap org
  per existing project owner, owner membership, child rows inherit org from their
  project). This keeps the running app non-broken.
- Flipping `organization_id` to **NOT NULL** and rewriting the existing per-user
  RLS policies to be org-scoped is **deferred** to the phase that wires org
  context into the app's insert/read paths (Phase 3+). Until then the existing
  owner/share policies remain in force alongside the new org policies.

## Enforcement layers (in order)

1. **Postgres RLS** — authoritative. Tenant tables: membership-based. Platform
   tables (`platform_audit`): `is_platform_admin`.
2. **SECURITY DEFINER RPCs** — the service layer for privileged/multi-table
   writes. Bypass RLS by design, so they re-check `is_org_member` /
   `is_platform_admin` at the top, then mutate + `write_audit_log` atomically.
3. **Next Server Actions** — input validation (zod), shape errors as
   `{ code, message, meta }`, call the RPC. No direct client table writes for
   admin mutations.
4. **Client** — receives a **read-only** projection for UI gating only
   (`orgRoleAtLeast`, entitlements projection in Phase 2). Never an enforcement point.

## Audit

- `platform_audit` (tenant-independent) and `audit_log` (per-org). Both
  **append-only**, enforced by the `forbid_mutation()` trigger (raises on
  UPDATE/DELETE) — not by convention.
- `organization_id` / `actor_user_id` are **plain columns, no FK**, so audit
  survives org purge and user deletion (it is legal evidence). A cascading FK
  would try to mutate audit rows and trip the append-only trigger.
- Written only via `write_audit_log` / `write_platform_audit` (SECURITY DEFINER,
  `EXECUTE` revoked from clients) so entries cannot be forged from the browser.
- Records actor, org, action, target type+id, before/after JSON diff, IP, UA,
  and whether the action happened inside an impersonation session.

## Helper reference

- SQL: `is_org_member(org, min_role)`, `is_platform_admin(min_role)`,
  `org_role_rank`, `platform_role_rank`, `write_audit_log`, `write_platform_audit`.
- TS: `src/types/admin.ts` (domain types + row mappers + `orgRoleAtLeast`),
  `src/lib/tenant.ts` (`requireOrgId`, `scopeToOrg`, `TenantContextError`).

## Phase status

- **Phase 1 (this):** data model, migrations, RLS, tenant-context helpers, audit
  tables + triggers. ✅ implemented; awaiting review.
- Phase 2: entitlement engine (`requireFeature` / `checkLimit`), typed flag
  registry. — not started.
- Phases 3–7: platform org CRUD/lifecycle/plans/seats; support sessions &
  observability; org users/roles/templates; directory/templates/cost codes;
  integrations/SSO/security/billing view. — not started.
