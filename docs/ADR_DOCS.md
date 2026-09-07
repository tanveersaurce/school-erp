# ADR_DOCS.md — Architectural Decision Records (ADR-001 to ADR-007)

**System Name:** EduSphere ERP  
**Document Version:** 1.0.0  
**Phase:** Phase 0 — Architecture & Engineering Blueprint  
**Status:** Approved

---

## ADR-001: Modular Monolith vs. Microservices Architecture

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Principal Architect, DevOps Lead, Staff Engineers

### Context

EduSphere ERP is a comprehensive, multi-module enterprise platform spanning academics, finance, HR, transport, and hostels. Early-stage systems often face pressure to adopt microservices prematurely. We must determine the optimal architectural topology for the initial version through high-growth stages.

### Decision

Adopt a **Modular Monolith** architecture with strict, internally bounded domain modules communicating via typed in-memory interfaces and domain events, backed by a single deployment pipeline.

### Alternatives Considered

1. **Full Microservices Architecture:** 12+ separate Node.js services with independent databases and gRPC/Kafka inter-service communication.
2. **Traditional Monolith (Unstructured MVC):** Single Node.js app with shared models, controllers calling other controllers, and unconstrained cross-domain database joins.

### Reasoning

- **Operational Simplicity:** Microservices introduce distributed transactions (Sagas), network latency, complex tracing, and high infrastructure costs. A modular monolith provides 90% of microservice modularity with zero distributed systems overhead.
- **Refactoring Agility:** Domain boundaries can be reshuffled in TypeScript with immediate compiler feedback without breaking network contracts.
- **Extraction Seams:** By prohibiting cross-module direct database imports and enforcing public interfaces, any module (e.g. Notifications, Reporting) can be extracted into an independent microservice within 2–3 days when throughput demands it.

### Consequences

- **Positive:** Fast development velocity, single deployable unit, local development simplicity via standard Docker Compose, multi-document ACID transactions across entities.
- **Negative:** Requires strict discipline and architectural linter rules to prevent engineers from bypassing module boundaries.

---

## ADR-002: Multi-Tenant MongoDB Partitioning & Isolation Strategy

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Principal Architect, Database Architect

### Context

EduSphere must host multiple educational societies, independent private schools, and multi-campus institutions on a single SaaS platform with zero risk of cross-tenant data leakage while keeping operational costs manageable.

### Decision

Adopt a **Hybrid Multi-Tenancy Architecture**:

- **Standard / Growth Tiers:** Shared MongoDB database with logical tenant partitioning enforced via an immutable `tenantId` discriminator and an automated Mongoose query interception plugin.
- **Enterprise Tiers:** Transparent connection routing to a dedicated MongoDB database per enterprise tenant via a centralized `TenantConnectionManager`.

### Alternatives Considered

1. **Strict Database-per-Tenant for all clients:** A distinct MongoDB database for every single school from Day 1.
2. **Pure Shared Database for all clients:** Single database for all clients with manual query filtering in application code.

### Reasoning

- Pure database-per-tenant creates connection pool exhaustion in Node.js (hundreds of idle connection pools), makes migrations slow and error-prone, and increases cloud costs exponentially.
- Pure shared database without architectural hooks relies on human discipline, making cross-tenant data leaks inevitable.
- The hybrid approach provides cost-efficient multi-tenancy for 95% of schools while offering enterprise physical database isolation for large university systems with strict regulatory requirements.

### Consequences

- **Positive:** Cost-effective infrastructure scaling, unified migrations for standard tenants, high security via automated ODM query filters.
- **Negative:** Application code must abstract database access through connection managers rather than static Mongoose models.

---

## ADR-003: Authentication & Session Token Lifecycle Strategy

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Principal Architect, Security Lead

### Context

Authentication must support multiple user roles (from students to accountants), protect against session hijacking, support instant remote session revocation, and comply with OWASP session management guidelines.

### Decision

Implement **Dual-Token Authentication with Automatic Refresh Token Rotation & Breach Detection**:

- **Access Tokens:** Short-lived (15 minutes) JWTs signed with RS256/Ed25519, stored exclusively in client JavaScript memory.
- **Refresh Tokens:** Long-lived (7 days) cryptographically random tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies, tracked as SHA-256 hashes in MongoDB and Redis.
- **Rotation:** Every refresh token exchange issues a new refresh token and consumes the previous one. If a consumed token is replayed, the entire session family is instantly revoked.

### Alternatives Considered

1. **Long-Lived JWT stored in `localStorage`:** Simple to implement, but vulnerable to token exfiltration via XSS.
2. **Server-Side Stateful Sessions (Express Session + Redis only):** Highly secure, but creates a hard dependency on Redis for every single API request, increasing latency and memory costs.

### Reasoning

Dual-token architecture provides the optimal balance: short-lived memory JWTs enable high-speed, stateless verification at the API layer, while rotated HttpOnly cookies guarantee session security and instant revocation capabilities.

### Consequences

- **Positive:** Immune to localStorage XSS token theft, instant session revocation via Redis blacklist, automatic breach detection on stolen token replay.
- **Negative:** Frontend must implement automatic silent refresh interceptors in Axios/Fetch.

---

## ADR-004: Decoupled RBAC + ABAC Authorization Model

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Principal Architect, Security Lead

### Context

Different schools require customized permission sets (e.g. allowing Senior Teachers to edit syllabus, or assigning an Accountant to handle hostel fees). Hardcoded role checks (`if role === 'ADMIN'`) cannot support this variability.

### Decision

Implement a **Decoupled RBAC + ABAC Architecture**:

- **Permissions:** Fine-grained resource-action pairs (`resource:action`, e.g., `student:create`, `attendance:mark`).
- **Roles:** Dynamic database-driven bundles of permissions assigned to users (`User -> UserRole -> Role -> RolePermission -> Permission`).
- **ABAC Scope Guards:** Middleware checks evaluating runtime ownership constraints (e.g. verifying that a teacher is assigned to the specific section being marked).

### Alternatives Considered

1. **Hardcoded Role Checks:** Hardcoding enum strings in controller endpoints.
2. **Pure ABAC (Open Policy Agent / Casbin):** Powerful, but introduces steep configuration complexity and runtime policy parsing overhead for an initial enterprise release.

### Reasoning

Decoupled RBAC allows school administrators to configure custom roles from an intuitive UI while standardizing route guards on clean permission strings (`requirePermission('marks:entry')`). Adding ABAC guards handles ownership constraints with surgical precision.

### Consequences

- **Positive:** Extreme institutional flexibility, zero code modifications required when introducing new roles, clean and testable route guards.
- **Negative:** Slightly higher initial database schema complexity and requires Redis caching of user permission sets.

---

## ADR-005: Redis Architectural Scope & Boundaries

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Staff Infrastructure Engineer, Backend Lead

### Context

Redis is an essential in-memory data store, but without clear boundaries, teams often misuse it as a primary database, leading to data loss on eviction or reboot.

### Decision

Strictly define what Redis **IS** used for and what Redis **IS NOT** used for:

- **Approved Uses:**
  1. Distributed sliding-window rate limiting counters.
  2. Short-lived token blacklists (for logged-out access tokens until expiry).
  3. BullMQ distributed job queues (emails, SMS, reports, notifications).
  4. Cache-aside store for institutional settings, fee structures, and user permission sets (with explicit TTL).
  5. Distributed locks (Redlock) during high-concurrency seat or vehicle allocations.
- **Prohibited Uses:**
  1. Primary storage of any financial transactions, student profiles, or grades.
  2. Long-term session storage without persistent MongoDB backup.
  3. Unbounded caching without strict TTLs.

### Alternatives Considered

1. **RabbitMQ / Kafka for background jobs:** More complex to configure and operate locally and in small production deployments compared to Redis + BullMQ.
2. **No in-memory cache (Direct MongoDB queries):** Results in database CPU exhaustion during morning attendance and report publishing spikes.

### Reasoning

BullMQ on Redis provides reliable job processing, delayed retries, and rate limiting with minimal operational footprint. Defining strict usage boundaries prevents memory bloat and accidental data loss.

### Consequences

- **Positive:** Sub-millisecond cache hits, reliable job queueing, low DevOps overhead.
- **Negative:** Redis memory limits must be continuously monitored with Prometheus alerts.

---

## ADR-006: File Storage Abstraction Architecture

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Principal Architect, Staff Backend Engineer

### Context

The platform must store homework attachments, student photos, admission documents, and generated PDF report cards. Direct hard-coupling to AWS S3 limits deployment options for on-premises enterprise schools or alternate cloud providers.

### Decision

Implement a **Provider-Agnostic File Storage Abstraction**:

- Define a strict `IStorageProvider` interface (`getPresignedUploadUrl`, `getPresignedDownloadUrl`, `deleteFile`, `copyFile`).
- Concrete implementations: `S3StorageProvider`, `MinioStorageProvider` (for local development), and `CloudinaryStorageProvider`.
- All file uploads use direct client-to-storage presigned URLs, bypassing the Node.js API server to eliminate memory and bandwidth bottlenecks.

### Alternatives Considered

1. **Uploading directly through Node.js API server (`multer`):** Causes high server memory consumption and stalls the event loop when 500 students upload 10MB assignments simultaneously.
2. **Hard-coding AWS S3 SDK throughout application services:** Breaks local development and prevents on-premise deployments using MinIO or private clouds.

### Reasoning

Presigned URLs offload bandwidth and CPU load to the cloud storage provider. The interface abstraction allows seamless switching between AWS S3, MinIO, and Cloudinary with zero business logic changes.

### Consequences

- **Positive:** High performance, zero server bandwidth consumption on large uploads, effortless local testing via MinIO container.
- **Negative:** Requires a two-step upload process (get presigned URL -> upload file -> confirm metadata to API).

---

## ADR-007: Payment Provider Abstraction & Reconciliation

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Principal Architect, Finance Domain Lead

### Context

Schools operate in multiple international and regional markets requiring different payment gateways: Razorpay and UPI in India, Stripe in North America and Europe, PayPal globally, and offline cash/cheque collection at the school counter.

### Decision

Implement a **Provider-Agnostic Payment & Reconciliation Engine**:

- Define an `IPaymentGateway` interface (`createOrder`, `verifyWebhookSignature`, `processRefund`).
- Concrete adapters: `RazorpayAdapter`, `StripeAdapter`, `OfflinePaymentAdapter`.
- All payments generate an immutable `Payment` record and update `FeeInvoice` inside a multi-document MongoDB ACID transaction.
- Webhook handlers enforce idempotency using unique gateway transaction IDs.

### Alternatives Considered

1. **Direct Razorpay SDK calls inside FeeController:** Prevents multi-currency and international expansion.
2. **Asynchronous eventual payment status updates without webhooks (polling):** High latency and poor user experience during fee payment deadlines.

### Reasoning

The payment abstraction ensures business logic treats payments uniformly regardless of the payment rail. Idempotent webhook handling guarantees zero double-crediting or lost payments during network hiccups.

### Consequences

- **Positive:** Supports any regional payment gateway, provides financial auditability, prevents race conditions.
- **Negative:** Requires rigorous webhook signature verification and sandbox testing for each supported provider.
