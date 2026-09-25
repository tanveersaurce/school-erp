# OBSERVABILITY & TELEMETRY ARCHITECTURE

**EduSphere Multi-Tenant ERP — Phase 24 Performance Architecture**  
**Version:** 1.0.0  
**Status:** Approved Standard  

---

## 1. Executive Summary

EduSphere implements a comprehensive observability and telemetry pipeline structured around high-resolution request profiling, strict tenant context correlation, tamper-evident audit logging, and automated PII redaction.

---

## 2. Request Correlation & Distributed Tracing

### 2.1 Request ID Propagation (`X-Request-ID`)
1. Every ingress request passing through `requestIdMiddleware` is stamped with a unique identifier:
   - If an incoming `x-request-id` header is present (from CDN, API gateway, or client), it is validated and propagated.
   - If omitted, a cryptographically random UUID v4 with prefix `req_` is generated.
2. The Request ID is bound to `req.id` and echoed in the response header:
   ```http
   X-Request-ID: req_a8b29e01-3d71-492c-848e-670535e61234
   ```
3. The Request ID is injected into:
   - Structured log contexts (Pino).
   - Tamper-evident `AuditLog` records.
   - Standardized API JSON error and success envelopes (`meta.requestId`).

### 2.2 High-Resolution Latency Profiling (`X-Response-Time`)
1. Sub-millisecond timing is captured using Node.js `process.hrtime()` upon request arrival.
2. When the response stream completes, `X-Response-Time` is injected into the response headers:
   ```http
   X-Response-Time: 12.45ms
   ```
3. Latency outliers (> 250ms) trigger warning telemetry in structured logs for automated APM alert triggers.

---

## 3. Structured Logging & PII Sanitization

### 3.1 Logger Configuration
Application logs are emitted as structured JSON via `pino`:
- In **development**: `pino-pretty` colorized output.
- In **production**: Compact, single-line JSON formatted for ingestion into Elasticsearch, Grafana Loki, or Google Cloud Logging.

### 3.2 Redaction Policy
Log serializers strictly sanitize sensitive attributes:
- Passwords, password confirmation fields, hashes, and salt values.
- Authorization bearer tokens, refresh tokens, and cookies (`token`, `refreshToken`).
- Guardian financial details, payment gateway signatures, and webhook secrets.

---

## 4. Health, Liveness & Readiness Probes

The API exposes dual health check endpoints optimized for Docker, Kubernetes, and load balancers:

1. **Liveness Probe (`GET /health`)**:
   - Immediate `200 OK` response checking process uptime and event loop liveness.
   - Returns `{ status: 'UP', uptimeSeconds: number, environment: string }`.
2. **Readiness Probe (`GET /ready` or `/api/v1/health/ready`)**:
   - Actively checks connectivity to primary dependencies:
     - MongoDB connection (`readyState === 1`).
     - Redis cache server (`status === 'ready'`).
   - Returns `200 OK` if all dependencies are healthy; returns `503 Service Unavailable` if MongoDB is disconnected.

---

## 5. Audit Trail & Compliance Observability

All mutating operations in critical business domains (Student, Staff, Exam, Finance, Inventory, Transport) automatically emit structured `AuditLog` records containing:
- `tenantId` & `schoolId`
- `userId` (actor) & `actorType` (`USER | SYSTEM | WORKER`)
- `action` (e.g. `PAYMENT_COLLECTED`, `STUDENT_STATUS_UPDATED`)
- `entity` & `entityId`
- `before` & `after` state diffs
- `requestId` & `correlationId`
- `ipAddress` & `userAgent`
- Immutability enforced by Mongoose middleware hooks rejecting any updates or deletions.
