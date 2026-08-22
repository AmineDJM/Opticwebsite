# Security

This document records the security posture of the engine and the operational steps a
self-hoster must take. It maps to the requirements in §34–36.

## Authentication

- **Password hashing:** `scrypt` (`node:crypto`), N=2¹⁶, r=8, p=1, 16-byte random salt,
  64-byte derived key. Parameters are stored in the hash string so they can be raised
  later without invalidating existing passwords. Verification is constant-time
  (`timingSafeEqual`). No native build, no third-party dependency. See
  `packages/auth/src/password.ts`.
- **Sessions:** 256-bit opaque tokens. Only the **SHA-256 hash** is stored, so a database
  leak yields no usable sessions. Cookies are `httpOnly` + `SameSite=Lax` + `Secure`
  (in production), with sliding expiry and daily `lastSeen` rotation. Separate cookies
  and tables for admin users (`Session`) and storefront customers (`CustomerSession`).
- **Brute force:** login is rate-limited (sliding window) and locks the account after 5
  failed attempts for 15 minutes (`packages/auth/src/rate-limit.ts`). Error messages are
  uniform to avoid user enumeration, and a dummy hash is verified even for unknown users
  so timing does not reveal account existence.

## Authorization (RBAC)

Fine-grained `resource:action` permissions (§35). Roles hold permission lists; `*` is a
wildcard (super admin). Eight system role templates ship with the engine
(`packages/auth/src/rbac.ts`). Every admin page and server action calls
`requirePermission(...)`; the generator gates on `isPlatformAdmin`. The nav is filtered to
the operator's permissions so unavailable sections are not shown.

## Tenant isolation — defence in depth (§41)

Three independent layers, so a failure in one does not leak data across brands:

1. **Composite uniqueness.** Every tenant table's unique constraints include `websiteId`
   (`@@unique([websiteId, slug])`, `@@unique([websiteId, sku])`). Two brands can reuse the
   same slug/SKU without collision, and a lookup by a unique business key is implicitly
   scoped.
2. **Application tenant client.** `tenantClient(websiteId)` (a Prisma client extension,
   `packages/database/src/tenant.ts`) injects `websiteId` into the `where` of every read
   and the `data` of every write for tenant models, and **rejects** any query that tries
   to target a different `websiteId`. Application code never writes the filter, so it
   cannot forget it. This is the layer that is active by default.
3. **PostgreSQL Row-Level Security (RLS).** Migration
   `20260822190000_row_level_security` enables RLS on every tenant table with a strict
   policy keyed on `current_setting('app.website_id')`; migration
   `20260822230000_rls_trusted_owner_no_force` removes the `FORCE` flag that the first
   migration applied by mistake. The resulting model is two-tier, standard Postgres
   semantics:
   - the **table-owner role** (the `DATABASE_URL` role that runs migrations — the
     trusted backend: migrations, seed, and the app server in the default single-role
     deployment) bypasses the policies, so system operations work on managed hosts
     where that role is not a superuser (e.g. Render);
   - **any other role** is fully subject to the policies — no permissive
     `USING (true)` exists anywhere. This is the layer that survives an application
     bug: even a raw SQL query under a restricted role cannot cross tenants.

### Enabling RLS enforcement at runtime

The policies only take effect for roles that are **neither the table owner nor
superuser**. To have the application itself run under enforcement:

1. Run the app's runtime queries under a **restricted role**:
   ```sql
   CREATE ROLE optic_app LOGIN PASSWORD '...';
   GRANT USAGE ON SCHEMA public TO optic_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO optic_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO optic_app;
   ```
   Point `DATABASE_URL` at this role. Keep migrations running under the owner role.
2. Set the tenant GUC at the start of every request/transaction:
   ```sql
   SELECT set_config('app.website_id', $websiteId, true);
   ```
   With PgBouncer in transaction mode, do this inside the same transaction as your
   queries. The application's `resolveWebsite` already knows the `websiteId` to set.

Verified behaviour under a restricted role: a session scoped to brand A sees only brand
A's rows; with no tenant set, it sees nothing; a cross-tenant write is rejected with
`new row violates row-level security policy`.

## Input validation & injection

- **All** external input is validated with zod at the boundary (server actions, route
  handlers). Frontend validation is never trusted (§34).
- **SQL injection:** all data access goes through Prisma (parameterised). The one raw
  aggregate (dashboard) is a `groupBy`, not string-built SQL.
- **XSS:** React escapes by default. The only `dangerouslySetInnerHTML` uses are (a) the
  theme `<style>` tag, whose values are hex colours / numeric tokens from a validated
  schema, (b) JSON-LD (serialised objects), and (c) the CMS `richText` block, which is
  admin-authored content behind `content:write`.
- **CSRF:** Server Actions carry Next.js's built-in origin check. Route handlers that
  mutate (media upload, newsletter) are same-origin and permission-checked.

## File uploads (§34)

`api/media/upload` enforces a MIME allowlist (jpeg/png/webp/svg/avif/gif), an 8 MB size
cap, and a sanitised storage key (`packages/storage/src/types.ts` `safeKey` rejects `..`
and absolute paths). Uploads require `media:write`.

## Audit logging (§36)

Sensitive admin actions (price/stock/product/order/settings/role changes, media uploads,
user invites) are recorded in `AuditLog` with actor, action, entity, before/after values,
IP and user-agent. Auditing never throws into the action it records.

## Facial data — privacy by design (§17)

The visagism camera analysis runs **entirely in the browser** (MediaPipe WASM). The image
is analysed and discarded; **no facial image is ever uploaded or stored**. Only the
abstract `VisagismProfile` (face-shape label, undertone, derived ratios) may be persisted,
and only with the user's consent. The consent copy and the privacy policy page state this.

## Secrets

All secrets come from environment variables (`APP_SECRET`, `DATABASE_URL`, `S3_*`). None
are committed; `.env` is git-ignored and `.env.example` documents every variable. No secret
is exposed to the client (only `NEXT_PUBLIC_*` values reach the browser, and none of those
are secret).

## Transport & cookies

Run behind TLS in production (see `DEPLOYMENT.md`). Cookies are `Secure` when
`NODE_ENV=production`. Set `NEXT_PUBLIC_STOREFRONT_URL`/`ADMIN_URL` to https origins so
absolute links and canonical URLs are correct.
