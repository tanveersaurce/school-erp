# REDIS CACHING & INVALIDATION STRATEGY

**EduSphere Multi-Tenant ERP — Phase 24 Performance Architecture**  
**Version:** 1.0.0  
**Status:** Approved Architecture Standard  

---

## 1. Executive Summary

EduSphere employs a multi-tiered caching architecture designed for high throughput, sub-millisecond metadata lookups, deterministic multi-tenant isolation, and immediate consistency upon state mutation.

The architecture combines **Redis (Level 2 Distributed Cache)** with an **In-Memory Degraded Fallback (Level 1 Local Cache)** to ensure uninterrupted operation during network partitioning or transient Redis restarts.

---

## 2. Cache Topography & Key Design

All Redis keys are strictly namespaced with domain prefixes and tenant identifiers to prevent cross-tenant data leakage and guarantee collision-free operations.

```mermaid
flowchart TD
    Req[Incoming HTTP Request] --> TC[Tenant Context Middleware]
    TC -->|Check| TCache[Key: tenant:slug:{slug} / tenant:id:{id}]
    TCache -->|Hit| TContext[Populate req.tenantContext]
    TCache -->|Miss| TDB[(MongoDB: Tenant Collection)]
    TDB -->|Store| TCache
    
    TContext --> Auth[Auth / RBAC Middleware]
    Auth -->|Check| RCache[Key: authz:{tenantId}:{userId}]
    RCache -->|Hit| UserCtx[Populate User Roles & Permissions]
    RCache -->|Miss| RDB[(MongoDB: UserRoles & Permissions)]
    RDB -->|Store| RCache
    
    UserCtx --> Controller[Domain Controller / Reports]
    Controller -->|Check| RepCache[Key: report:{tenantId}:{reportKey}:{hash}]
    RepCache -->|Hit| FastResp[Instant Cached Response < 10ms]
    RepCache -->|Miss| Aggr[(MongoDB Aggregation Pipeline)]
    Aggr -->|Store| RepCache
```

### 2.1 Cache Namespace Directory

| Domain | Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| **Tenant Resolution** | `tenant:id:{id}`<br>`tenant:slug:{slug}`<br>`tenant:domain:{domain}` | 600s (10 min) | Tenant settings updated, domain changed, tenant suspended/activated |
| **RBAC Authorization** | `authz:{tenantId}:{userId}` | 900s (15 min) | Role assigned/removed, role permissions modified, user status changed |
| **Report Generation** | `report:{tenantId}:{reportKey}:{sha256}` | 300s - 3600s | Entity state updates (student admissions, fee payments), manual cache bust |
| **Session Blacklist** | `blacklist:token:{jti}` | Expiration of JWT | User logout, forced admin revocation, password change |

---

## 3. High Availability & Graceful Fallback

Every cache client in the application follows the **Fail-Safe Fallback Contract**:

1. **Redis Primary**:
   - Connection status verified via `redis.status === 'ready'`.
   - Read/write operations executed with timeout guards.
2. **In-Memory Degradation**:
   - In local tests or if Redis experiences transient timeouts, the service seamlessly falls back to an internal TTL-bounded `Map<string, Entry>`.
   - Zero application crashes or unhandled rejections during Redis outages.
3. **Automatic Cache Warming**:
   - Read-through pattern (`get` -> on miss: query DB -> `set` with TTL).

---

## 4. Deterministic Cache Invalidation

Cache invalidation uses targeted key eviction rather than blanket flushes to maximize cache efficiency.

### 4.1 RBAC Invalidation Workflow
- **Single User Eviction (`invalidateUserPermissionCache`)**:
  - Evicts `authz:{tenantId}:{userId}` from both Redis and local memory.
  - Invoked on user role changes or account modifications.
- **Role-Wide Eviction (`invalidateRolePermissionCache`)**:
  - Queries all user IDs assigned to the modified role within the tenant:
    ```typescript
    const assignments = await UserRole.find({ tenantId, roleId }).select('userId').lean();
    ```
  - Concurrently evicts the `authz:{tenantId}:{userId}` keys for all assigned users.

### 4.2 Tenant Invalidation Workflow
- **Multi-Alias Eviction (`invalidateTenantResolverCache`)**:
  - Automatically evicts `tenant:id:{id}`, `tenant:slug:{slug}`, and `tenant:domain:{domain}` simultaneously.
  - Guarantees immediate propagation of tenant state changes (e.g. `SUSPENDED`).

### 4.3 Report Invalidation Workflow
- **Prefix Scan Eviction (`invalidateTenant`)**:
  - Employs Redis `scanStream({ match: 'report:' + tenantId + ':*', count: 100 })` to incrementally delete matching keys without blocking the Redis single-threaded event loop.

---

## 5. Memory Management & Sizing Guidelines

In production Redis instances:
1. **Max Memory Policy**: `volatile-lru` (evicts keys with an expire set using the LRU algorithm when memory limits are reached).
2. **Key Expiration Rule**: All keys MUST have an explicit TTL (`EX` / `setex`). Zero permanent keys permitted in cache namespaces.
3. **Payload Compression**: Report JSON payloads exceeding 50 KB should be compressed with `gzip` prior to Redis storage if high-frequency storage is demanded.
