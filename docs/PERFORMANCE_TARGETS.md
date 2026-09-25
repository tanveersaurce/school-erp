# PERFORMANCE TARGETS & SERVICE LEVEL OBJECTIVES (SLO)

**EduSphere Multi-Tenant ERP — Phase 24 Performance & Scalability**  
**Version:** 1.0.0  
**Status:** Approved Architecture Baseline  

---

## 1. Executive Summary & SLO Framework

This document establishes the official Performance Service Level Objectives (SLOs) and Scalability targets for the EduSphere School Management System across backend APIs, MongoDB query execution, Redis caching, pagination controls, and payload management.

All API endpoints are classified into four operational performance tiers based on user experience impact and workload characteristics.

---

## 2. API Performance Tiers & Latency Budgets

| Tier | Description | Target p50 (Median) | Target p95 Latency | Target p99 Latency | Target Throughput | Typical Endpoints |
|---|---|---|---|---|---|---|
| **Tier 1: Interactive** | Lightweight lookups, session checks, typeaheads, and status polling | `< 15ms` | `< 50ms` | `< 80ms` | `> 100 req/s` | `GET /auth/me`, `POST /auth/refresh`, `GET /search`, `GET /notifications`, `GET /library/books` |
| **Tier 2: Standard** | Standard CRUD, paginated list reads, single-entity updates, and simple state transitions | `< 30ms` | `< 100ms` | `< 150ms` | `> 50 req/s` | `GET /students`, `GET /employees`, `GET /academic/classes`, `POST /attendance/daily`, `GET /finance/invoices`, `POST /finance/payments/collect` |
| **Tier 3: Heavy** | Multi-entity aggregations, monthly attendance matrices, audit searches, and synchronous report previews | `< 100ms` | `< 300ms` | `< 500ms` | `> 20 req/s` | `GET /attendance/sheet`, `GET /audit-logs`, `GET /reports/run/:slug`, `GET /examinations/results/summary` |
| **Tier 4: Background** | Long-running bulk jobs, report file generation, end-of-term batch processing, mass messaging fanout | `< 500ms` | `< 1000ms` | `< 2500ms` | Handled via BullMQ | Asynchronous exports (CSV/PDF), bulk fee invoicing, gradebook mass finalization, bulk SMS/Email dispatcher |

---

## 3. Database & Query Performance Targets

### 3.1 MongoDB Query Execution SLOs
1. **Index Coverage (Zero Collscans)**:
   - 100% of tenant-scoped queries MUST utilize an index covering `{ tenantId: 1, ... }` or equivalent compound index.
   - Zero full collection scans (`COLLSCAN`) allowed on collections with `> 1,000` documents.
2. **Query Execution Time**:
   - Indexed reads: `< 10ms` execution time at database engine level.
   - Aggregation pipelines: `< 50ms` execution time at database engine level.
   - Multi-document transactions (e.g. payment collection + invoice reconciliation): `< 40ms` total database lock/commit time.
3. **Execution Plan Inspection**:
   - `totalDocsExamined` to `nReturned` ratio MUST be `< 2:1` for targeted single/paged queries.

### 3.2 Pagination & Payload Boundaries
1. **Pagination Limits**:
   - Default page size: `20` records.
   - Maximum allowable page size: `100` records. Any request with `limit > 100` MUST be clamped to `100`.
   - Cursor-based or indexed offset pagination required for large datasets.
2. **Selective Projections & Payload Sizing**:
   - Paginated list responses MUST omit heavy nested structures (e.g., student full document uploads, emergency contact history, detailed audit metadata).
   - Maximum list endpoint JSON payload target: `< 50 KB` per page.
   - Projections MUST use explicit `.select(...)` and Mongoose `.lean()` for pure read operations to eliminate Mongoose document hydration overhead.

---

## 4. Caching & State Management Targets

### 4.1 Redis Caching SLOs
1. **Cache Hit Ratio**:
   - Tenant configuration & metadata: `> 95%` hit ratio.
   - User RBAC permissions: `> 90%` hit ratio.
   - Frequently read system entities (academic sessions, fee categories): `> 85%` hit ratio.
2. **Cache Latency**:
   - Redis `GET`/`SET`: `< 2ms` round-trip latency.
3. **Cache Invalidation Consistency**:
   - Strong eventual consistency (`< 50ms`) for role/permission updates, tenant suspensions, and session revocations via Redis event keys / pub-sub or pattern eviction.

---

## 5. Concurrency & Resource Utilization Targets

### 5.1 Concurrency & Stress Benchmarks
- Sustained concurrent tenant users: `50+` concurrent users per API node with `< 1%` error rate and `< 150ms` p95 response time.
- Connection Pool Efficiency:
  - MongoDB connection pool: min `10`, max `50` per node.
  - Redis connection pool: single multiplexed client with auto-reconnect.
- Event Loop Lag:
  - Node.js event loop lag MUST remain `< 20ms` under normal load, `< 50ms` under peak load.

### 5.2 Memory & CPU Budgets
- Node.js API Service RSS Memory: `< 350 MB` per process under sustained load.
- Node.js Heap Used: `< 200 MB` baseline; clean GC cycles without unbounded memory growth over 1,000 consecutive requests.
- Worker Node RSS Memory: `< 500 MB` under active report generation.

---

## 6. Observability & Telemetry Verification

- Every request MUST carry a unique `x-request-id` header passed into structured logger context.
- High-resolution timing metrics (`x-response-time`) measured in milliseconds with sub-millisecond precision.
- Sensitive data masking: Zero PII (passwords, tokens, student guardian phone numbers, credit card tokens) logged in application tracing.
