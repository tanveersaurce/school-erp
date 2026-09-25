# PHASE 24 — PERFORMANCE BASELINE REPORT

**EduSphere Multi-Tenant ERP**  
**Measurement Date:** September 2026  
**Environment:** Node.js v20.x, MongoDB In-Memory Replica, Redis Mock/In-Memory Cache  
**Benchmark Suite:** `apps/api/tests/perf/benchmark.baseline.test.ts`  
**Raw Telemetry Data:** `apps/api/tests/perf/baseline_metrics.json`  

---

## 1. Executive Summary

This report captures the pre-optimization baseline performance metrics across 22 representative endpoints in EduSphere ERP, covering authentication, core academic operations, student records, fee collection, library, inventory, global search, audit logs, and reports.

The baseline establishes empirical metrics for latency (avg, p50, p95, p99), throughput (req/sec), payload transfer size, and heap memory utilization prior to Phase 24 optimizations.

---

## 2. Empirical Baseline Performance Table

| # | Endpoint / Operation | Category | Avg Latency (ms) | Median p50 (ms) | p95 Latency (ms) | Throughput (req/s) | Payload (Bytes) | Heap Used (MB) |
|---|---|---|---|---|---|---|---|---|
| 1 | `POST /auth/login` | Interactive | 191.25 | 15.40 | 763.90 | 5.23 | 193 B | 84.76 |
| 2 | `POST /auth/refresh` | Interactive | 6.67 | 6.55 | 9.02 | 149.74 | 223 B | 86.42 |
| 3 | `GET /auth/me` | Interactive | 13.42 | 13.82 | 16.27 | 74.47 | 611 B | 95.24 |
| 4 | `GET /students` | Standard | 16.72 | 16.26 | 23.07 | 59.81 | 16,735 B | 84.32 |
| 5 | `GET /students?search=...` | Interactive | 13.85 | 13.16 | 21.46 | 72.17 | 9,298 B | 95.55 |
| 6 | `GET /employees` | Standard | 11.37 | 12.03 | 12.86 | 87.95 | 282 B | 105.40 |
| 7 | `GET /academic/classes` | Standard | 8.67 | 8.44 | 10.50 | 115.27 | 216 B | 114.31 |
| 8 | `POST /attendance/daily` | Standard | 9.71 | 9.79 | 11.53 | 102.94 | 239 B | 118.88 |
| 9 | `GET /attendance/sheet` | Heavy | 19.68 | 18.17 | 29.14 | 50.80 | 433 B | 135.49 |
| 10 | `GET /assignments` | Standard | 15.08 | 14.77 | 20.35 | 66.31 | 1,097 B | 109.22 |
| 11 | `GET /examinations/exams` | Standard | 8.37 | 8.26 | 9.83 | 119.46 | 225 B | 113.87 |
| 12 | `GET /examinations/results` | Standard | 8.31 | 8.45 | 10.03 | 120.33 | 225 B | 118.40 |
| 13 | `GET /finance/invoices` | Standard | 12.01 | 11.70 | 14.38 | 83.23 | 1,005 B | 130.39 |
| 14 | `POST /finance/payments/collect` | Standard | 25.33 | 24.89 | 31.72 | 39.47 | 692 B | 109.10 |
| 15 | `GET /library/books` | Interactive | 9.97 | 9.99 | 11.51 | 100.25 | 772 B | 118.43 |
| 16 | `GET /transport/routes` | Standard | 11.17 | 11.24 | 13.49 | 89.52 | 800 B | 127.80 |
| 17 | `GET /hostel/allocations` | Standard | 8.79 | 9.58 | 10.06 | 113.77 | 179 B | 132.37 |
| 18 | `GET /inventory/stocks` | Standard | 8.46 | 8.43 | 9.03 | 118.21 | 206 B | 136.88 |
| 19 | `GET /notifications` | Interactive | 12.41 | 12.55 | 15.71 | 80.55 | 7,343 B | 149.28 |
| 20 | `GET /audit-logs` | Heavy | 10.30 | 9.23 | 17.74 | 97.02 | 292 B | 118.38 |
| 21 | `GET /search?q=BenchStudent` | Heavy | 14.05 | 14.27 | 15.56 | 71.19 | 1,529 B | 138.90 |
| 22 | `GET /reports/run/students...` | Heavy | 9.42 | 10.15 | 11.42 | 106.11 | 26,897 B | 146.77 |

---

## 3. Analysis & Key Bottlenecks Identified

### 3.1 Authentication Latency
- `POST /auth/login` exhibited high variability (avg 191.25ms, p95 763.90ms) driven primarily by bcrypt CPU hashing on initial cold runs.
- `GET /auth/me` executes RBAC role & permission lookups on every request; while median is fast (13.82ms), caching user permission snapshots in Redis will reduce recurring database queries.

### 3.2 Payload Sizing in List Endpoints
- `GET /students` list queries return complete student documents (16.7 KB for 10 records). Each record includes deeply nested arrays (parent contact objects, address subdocuments, documents array, notes).
- `GET /reports/run/students.enrollment-roster` returns 26.9 KB.
- **Action**: Introduce selective field projections on `/students` list queries (`select: 'admissionNumber firstName lastName currentGrade section status gender dateOfBirth'`) and paginate with max ceiling `limit: 100`.

### 3.3 Database Index Optimization Opportunities
- `AuditLog` collection queries filter on `tenantId`, `entity`, and sort descending by `createdAt`. A compound index on `{ tenantId: 1, entity: 1, createdAt: -1 }` is essential as audit tables grow rapidly.
- `FeeInvoice` queries filter on `tenantId`, `studentId`, and `status`. A compound index `{ tenantId: 1, studentId: 1, status: 1 }` will accelerate balance and fee checks.
- `Notification` queries filter on `{ tenantId: 1, recipientId: 1, isRead: 1, createdAt: -1 }`.
- `Student` collection needs optimized compound index on `{ tenantId: 1, schoolId: 1, status: 1, isDeleted: 1 }`.
- `Attendance` daily records filter by `{ tenantId: 1, schoolId: 1, classId: 1, date: 1 }`.

### 3.4 Query Lean Execution & Memory Profiling
- Several controllers hydrate Mongoose models without `.lean()`, resulting in high memory footprint (heap used reached ~149MB in sequential benchmarks).
- Read-only endpoints must invoke `.lean()` to bypass Mongoose ChangeTracker and Virtuals instantiation.

---

## 4. Next Optimization Steps

1. **Phase 24.2 Database Optimization**: Add missing compound indexes and verify query plans.
2. **Phase 24.3 API & Pagination Optimization**: Apply selective projections, clamp `limit <= 100`, and use `.lean()`.
3. **Phase 24.4 Caching Implementation**: Document and verify Redis caching for RBAC, tenant resolution, and report metadata.
4. **Phase 24.5 Load Testing & Verification**: Run multi-user concurrent load test harness and compare results against this baseline.
