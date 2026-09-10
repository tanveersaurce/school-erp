# Multi-Tenant Architecture & Isolation Blueprint

## 1. Overview & Organizational Hierarchy

EduSphere ERP is designed from the ground up as an enterprise, multi-tenant Software-as-a-Service (SaaS) platform. It provides institutional isolation, security boundaries, and operational flexibility across diverse educational organizations—from single-site private academies to multi-campus state educational trusts.

### Logical Hierarchy

```
+-------------------------------------------------------------+
|                      TENANT (Trust/Group)                   |
|  - Unique slug, domain, billing plan, and lifecycle status  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                      SCHOOL (Institution)                   |
|  - Institutional profile, board affiliation, settings,      |
|    and visual branding identity                             |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                  CAMPUS / BRANCH (Physical Site)            |
|  - Physical locations, code, facilities, address, contact   |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   ACADEMIC YEAR (Calendar Session)          |
|  - Term dates, status (DRAFT/ACTIVE/CLOSED), active session |
+-------------------------------------------------------------+
```

---

## 2. Dynamic Ingress Tenant Resolution

Requests entering the application are dynamically resolved to a tenant before hitting business controllers. The resolution precedence is:

1. **Explicit Identification Headers**:
   - `x-tenant-id`: Explicit MongoDB ObjectId for development, test runners, and mobile client routing.
   - `x-tenant-slug`: Human-readable identifier (e.g., `greenwood-high`).
2. **Virtual Multi-Tenant Subdomain**:
   - Extracted from `Host` or `X-Forwarded-Host` (e.g., `oakridge.edusphere.io` or `oakridge.localhost`).
   - Reserved hostnames (`api`, `app`, `www`, `admin`) bypass automatic slug extraction.
3. **Custom Institution Domain**:
   - Matches dedicated domains configured on the tenant document (e.g., `portal.greenwoodhigh.edu`).

### Redis Caching Strategy & In-Memory Fallback

To avoid hitting MongoDB on every incoming HTTP request, resolved tenant metadata is cached with a **10-minute (600s) TTL**:

- `tenant:id:{id}`
- `tenant:slug:{slug}`
- `tenant:domain:{customDomain}`

If Redis is unreachable or operating in degraded local mode, the middleware falls back to a thread-safe in-memory cache (`Map<string, { data, expiresAt }>`).

Whenever tenant details, custom domains, or statuses are updated, `invalidateTenantResolverCache(tenantId, slug, customDomain)` purges all corresponding cache keys across Redis and memory.

---

## 3. Zero-Trust Anti-Tampering & Security Defenses

The system implements strict defense-in-depth against tenant spoofing and cross-tenant leakage:

```
Incoming Request
       │
       ▼
[tenantContextMiddleware]
  ├─ Resolves Candidate (header, subdomain, or custom domain)
  ├─ Enforces Tenant Status (rejects SUSPENDED / ARCHIVED with HTTP 403)
  └─ Sets initial AsyncLocalStorage TenantContext
       │
       ▼
[authenticate Middleware]
  ├─ Verifies JWT Signature & Expiration
  ├─ Loads Session & User (bypassing tenant filter to inspect authentic token identity)
  ├─ Cross-Tenant Check:
  │    Is Super Admin?
  │      ├─ YES: Allow platform aggregation or impersonation via `x-impersonate-tenant-id`
  │      └─ NO: `token.tenantId` MUST strictly equal `req.tenantContext.tenantId`
  │             Mismatches immediately throw HTTP 403 `CROSS_TENANT_ACCESS_DENIED`
  └─ Updates AsyncLocalStorage TenantContext with verified user & tenant IDs
       │
       ▼
[tenantPlugin & Controllers]
  ├─ Automatically applies `tenantId` to all queries: `find({ tenantId })`
  ├─ Auto-stamps `tenantId` from ALS context on pre-validate for new documents
  └─ Strictly forbids updating or modifying `tenantId` on existing records
```

### Lifecycle Constraints

- **SUSPENDED Tenants**: Any request resolving to a suspended tenant is rejected immediately with HTTP 403 `FORBIDDEN_ACCESS` ("Tenant organization is suspended. Please contact platform administration."). Additionally, suspending a tenant atomically revokes all active sessions for that tenant.
- **ARCHIVED Tenants**: Requests are rejected with HTTP 403 `FORBIDDEN_ACCESS` ("Tenant organization is archived. Access is restricted.").

---

## 4. Execution Context Propagation (AsyncLocalStorage)

Tenant context is tracked per-request using Node.js `AsyncLocalStorage`:

```typescript
export interface TenantContext {
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  academicYearId?: string;
  userId?: string;
  isPlatformAdmin?: boolean;
}
```

The context store is encapsulated in `@edusphere/database` (`tenantContext.ts`) and is isomorphic across backend services, background jobs, and worker pipelines:

```typescript
runWithTenantContext(context, () => {
  // All asynchronous operations in this callback share the active TenantContext
});
```

---

## 5. Mongoose `tenantPlugin` Architecture

All multi-tenant schemas register `tenantPlugin`. The plugin enforces:

1. **Automatic Query Isolation**:
   - For `find`, `findOne`, `findOneAndUpdate`, `updateMany`, `countDocuments`, `deleteMany`:
   - Injects `{ tenantId: context.tenantId }` into the filter unless `skipTenantFilter: true` is set (reserved for Super Admin platform audits).
2. **Pre-Validate Auto-Stamping**:
   - Automatically populates `this.tenantId = context.tenantId` before schema validation executes, ensuring required-field constraints succeed seamlessly without manual boilerplate.
3. **Tenant Immutability**:
   - Prohibits changing `tenantId` on existing records via document `.save()` or query update operators (`$set.tenantId`). Any cross-tenant modification attempt raises an immutable constraint error.
