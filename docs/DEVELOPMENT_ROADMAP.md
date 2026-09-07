# DEVELOPMENT_ROADMAP.md — Engineering Phase Roadmap & Folder Hierarchy

**System Name:** EduSphere ERP  
**Document Version:** 1.0.0  
**Phase:** Phase 0 — Architecture & Engineering Blueprint  
**Total Phases:** 29 Distinct Milestones  
**Governance:** Strict Phase-Gate Acceptance Criteria  

---

## 1. Complete Proposed Repository Folder Structure

The repository will be structured as a high-performance **Turborepo monorepo** with strict module boundaries:

```
school-erp/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Continuous integration (Lint, Test, Typecheck, Build)
│       └── release.yml                # Docker build & deployment workflow
├── apps/
│   ├── api/                           # Express.js REST API Backend
│   │   ├── src/
│   │   │   ├── config/                # Environment schema (Zod), database, redis configs
│   │   │   ├── core/                  # Cross-cutting infrastructure
│   │   │   │   ├── database/          # Mongoose connection manager & global plugins
│   │   │   │   ├── events/            # In-process EventBus & domain event emitter
│   │   │   │   ├── logger/            # Pino structured JSON logger
│   │   │   │   └── errors/            # ApplicationError hierarchy & error mapper
│   │   │   ├── middlewares/           # RequestId, Helmet, CORS, TenantResolver, Auth, RBAC
│   │   │   ├── modules/               # 36 Bounded Domain Feature Modules
│   │   │   │   ├── auth/              # Controllers, services, models, routes, DTOs
│   │   │   │   ├── rbac/              # Roles & permissions management
│   │   │   │   ├── tenants/           # Multi-tenant provisioning & settings
│   │   │   │   ├── students/          # Student profiles, enrollments, documents
│   │   │   │   ├── attendance/        # Daily tracking, biometrics, absence events
│   │   │   │   ├── fees/              # Structures, invoices, payments, reconciliations
│   │   │   │   └── ... (all domain modules)
│   │   │   ├── routes.ts              # Aggregated v1 API routing tree
│   │   │   └── server.ts              # HTTP server entrypoint & graceful shutdown
│   │   ├── tests/                     # Integration and security test suites
│   │   ├── Dockerfile                 # Production multi-stage Docker build
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                           # React 19 Single Page Application
│   │   ├── src/
│   │   │   ├── app/                   # App root, providers, routing tree
│   │   │   ├── components/            # Design system UI primitives (Radix/Tailwind)
│   │   │   ├── features/              # Feature slices (auth, students, fees, attendance...)
│   │   │   ├── hooks/                 # Global UI & authentication hooks
│   │   │   ├── lib/                   # API client (Axios), date formatters, helpers
│   │   │   ├── stores/                # Zustand client state stores
│   │   │   └── types/                 # Frontend TypeScript interfaces
│   │   ├── public/                    # Static assets & manifest
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── worker/                        # BullMQ Asynchronous Job Processing Daemon
│       ├── src/
│       │   ├── queues/                # Queue definitions (email, sms, reports, billing)
│       │   ├── workers/               # Consumer workers & processing logic
│       │   └── worker.ts              # Worker entrypoint
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                          # Shared Monorepo Internal Packages
│   ├── common/                        # Constants, shared enums, API response envelopes
│   ├── types/                         # Shared TypeScript domain contracts & DTOs
│   ├── database/                      # Shared Mongoose models & database utilities
│   └── ui/                            # Shared React component primitives & Tailwind preset
│
├── infra/
│   ├── docker/                        # Local dev docker-compose & environment configs
│   │   ├── docker-compose.yml
│   │   └── nginx.conf
│   └── k8s/                           # Production Kubernetes manifests / Helm charts
│
├── docs/                              # Architectural blueprints & ADRs
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── API_DESIGN.md
│   ├── RBAC_MATRIX.md
│   ├── SECURITY_ARCHITECTURE.md
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── DEVOPS_ARCHITECTURE.md
│   ├── TESTING_STRATEGY.md
│   ├── DEVELOPMENT_ROADMAP.md
│   └── adr/                           # Architectural Decision Records (ADR-001 to 007)
│
├── .gitignore
├── .editorconfig
├── package.json                       # Monorepo root package.json
├── pnpm-workspace.yaml
├── turbo.json                         # Turborepo build pipeline caching config
└── README.md
```

---

## 2. The 29-Phase Implementation Roadmap

Every phase is an isolated, testable engineering deliverable:

* **PHASE 1: Monorepo & Technical Foundation**  
  * Initialize Turborepo, pnpm workspaces, root configurations (`tsconfig`, ESLint, Prettier).  
  * Scaffold Express API shell, Vite React SPA shell, and BullMQ worker workspace.  
* **PHASE 2: Database & Core Data Layer**  
  * Implement MongoDB replica set connection manager with connection pooling and retry logic.  
  * Implement BaseEntity schema with soft-delete (`isDeleted`) and optimistic locking.  
  * Implement universal Mongoose Tenant Plugin for automatic tenant scoping.  
* **PHASE 3: Authentication & Session Management**  
  * User schema with Argon2id password hashing and lockout counters.  
  * JWT access token + refresh token rotation workflow with secure HttpOnly cookies.  
  * Login, logout, token refresh, and password reset endpoints with Redis session tracking.  
* **PHASE 4: Role-Based Access Control (RBAC)**  
  * Role, Permission, UserRole, and RolePermission schemas with database seeds for standard roles.  
  * Route-level permission middleware (`requirePermission`) and ABAC resource ownership guards.  
* **PHASE 5: Multi-Tenancy Engine**  
  * Tenant, School, Campus, and AcademicYear models.  
  * Subdomain/domain extraction middleware and AsyncLocalStorage TenantContext propagation.  
* **PHASE 6: Staff, Teachers & Human Resources**  
  * Staff and Teacher profile models, qualifications, and employment contracts.  
  * Teacher class/section assignment management and faculty directory.  
* **PHASE 7: Students & Parent Portal Core**  
  * Student master identity, demographic records, and health records.  
  * Parent/Guardian identity models and Student-Parent relationship linking.  
* **PHASE 8: Academic Structure (Classes, Sections, Curriculums)**  
  * Class definitions, section division rules, capacity limits, and curriculum mapping.  
  * Year-scoped StudentEnrollment workflow and class promotion rules.  
* **PHASE 9: Timetable & Scheduling Engine**  
  * Period structures, room/lab allocation, and teacher timetable scheduling.  
  * Conflict detection engine preventing double-booking of teachers, rooms, or sections.  
* **PHASE 10: Attendance Tracking & Alerts**  
  * Section-aggregated daily attendance schema with teacher submission workflow.  
  * Biometric/RFID log ingestion adapter and automated student absence event triggers.  
* **PHASE 11: Homework & Assignments**  
  * Homework creation with presigned file upload attachments.  
  * Student submission portal, evaluation, and grading workflow.  
* **PHASE 12: Examinations, Marks & Report Cards**  
  * Exam cycle definition, subject timetables, and hall ticket generation.  
  * Subject-wise marks entry grid with principal verification workflow and automated PDF report card compilation.  
* **PHASE 13: Fees, Billing & Invoicing**  
  * Fee heads, fee structures, and installment schedules.  
  * Automated batch invoice generation and fee concession/scholarship management.  
* **PHASE 14: Payment Gateway & Financial Ledger**  
  * Payment gateway abstraction (Razorpay, Stripe) with idempotent webhook processing.  
  * Real-time automated fee receipts and double-entry general ledger updates.  
* **PHASE 15: Staff Payroll & Leave Management**  
  * Staff leave request and approval workflows.  
  * Monthly payroll calculation integrating biometric attendance deductions and payslip generation.  
* **PHASE 16: Library Management System**  
  * ISBN book cataloging, barcode tracking, and physical copy management.  
  * Issue/return circulation workflows and automated overdue fine calculation.  
* **PHASE 17: Transport & Fleet Management**  
  * Vehicle fleet records, maintenance logs, and driver licenses.  
  * Bus routes, geographic pickup stops, and student passenger allocations.  
* **PHASE 18: Hostel & Accommodation**  
  * Hostel buildings, room types, and bed inventory.  
  * Student bed allocations, meal plan preferences, and visitor gate pass tracking.  
* **PHASE 19: Inventory & Asset Management**  
  * School asset catalog, inventory item tracking, and low-stock alerts.  
  * Vendor directories and purchase order approval workflows.  
* **PHASE 20: Communication & Bulletin Board**  
  * Institutional circulars, announcements, and targeted audience dispatch.  
  * Internal staff messaging threads and direct parent-teacher communications.  
* **PHASE 21: Multichannel Notification Engine**  
  * BullMQ worker integration for asynchronous email (SES/SendGrid), SMS (Twilio), and WhatsApp.  
  * User notification preferences and delivery receipt tracking.  
* **PHASE 22: Analytics, Business Intelligence & Reporting**  
  * Executive dashboards: student retention cohort analysis, fee collection aging, academic grade distributions.  
  * Background worker for asynchronous heavy CSV/Excel/PDF report exports.  
* **PHASE 23: Audit Trail & Global Search**  
  * Tamper-evident, immutable audit log capture on all sensitive state mutations.  
  * High-speed, tenant-scoped text search across students, staff, and invoices.  
* **PHASE 24: Security Hardening & Penetration Testing**  
  * Rate limiting enforcement, Helmet CSP headers, DOMPurify HTML sanitization.  
  * Automated security test suites validating zero cross-tenant leakage and IDOR resilience.  
* **PHASE 25: Comprehensive Testing Suite**  
  * Vitest unit tests reaching >85% coverage on core services.  
  * Supertest integration test coverage and Playwright E2E smoke test suites.  
* **PHASE 26: Performance Optimization & Caching**  
  * Database compound index tuning and explain plan analysis.  
  * Redis query caching for academic structures and frontend React virtualization optimization.  
* **PHASE 27: Production Dockerization**  
  * Multi-stage, minimal Alpine Dockerfiles for API, Web, and Worker.  
  * Production Docker Compose and local test orchestration verification.  
* **PHASE 28: CI/CD Pipeline & Staging Deployment**  
  * GitHub Actions automated workflows for linting, testing, security scanning, and container publishing.  
  * Automated staging environment provisioning and zero-downtime rolling update configuration.  
* **PHASE 29: Final QA, Documentation & Production Sign-Off**  
  * End-to-end system verification across all 14 user roles.  
  * User manuals, API documentation (Swagger/OpenAPI), and formal Phase 0 handoff.  

---

## 3. Phase Acceptance Gates & Verification Standard

No future phase may be marked complete or merged into the codebase without satisfying the **Explicit Acceptance Gate**. At the conclusion of every single phase, the engineering team must generate:
```
PHASE_X_VERIFICATION.md
```
containing the following strict verification sections:

1. **Implemented Features:** Exhaustive list of business capabilities delivered.
2. **Files Created / Modified:** Exact filepaths added or altered.
3. **APIs Added / Updated:** Endpoint signatures, methods, and sample payloads.
4. **Database Changes:** Schemas created, indexes established, migrations executed.
5. **Automated Test Results:** Test suite command outputs (Unit, Integration, E2E), assertions count, and code coverage percentage.
6. **Security & Isolation Check:** Explicit verification that tenant isolation hooks and RBAC guards were verified.
7. **Known Issues & Technical Debt:** Any pending optimizations flagged for subsequent phases.
8. **Acceptance Status:** `PASSED` or `BLOCKED`. If any critical regression, failed test, or TypeScript compilation error exists, the phase is `BLOCKED` and the next phase cannot begin.
