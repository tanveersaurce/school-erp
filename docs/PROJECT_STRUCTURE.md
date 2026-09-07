# PROJECT_STRUCTURE.md — Repository Monorepo Architecture & Directory Catalog

**System Name:** EduSphere ERP  
**Phase:** Phase 1 — Monorepo & Technical Foundation

---

## 1. Monorepo Structural Alignment

In Phase 0, the architecture designated a Turborepo-compatible npm workspace layout:

- `apps/api`: The Express.js backend REST API server.
- `apps/web`: The React 19 Single Page Application frontend.
- `apps/worker`: The BullMQ asynchronous job processing daemon.
- `packages/common`: Cross-tier domain enums, RFC-compliant error classes, and unified API response envelopes.
- `packages/types`: Shared TypeScript domain contracts, DTO types, and tenant context definitions.
- `infrastructure/`: Production Dockerfiles, Docker Compose stacks, and Nginx reverse proxy configurations.
- `docs/`: Complete architectural blueprints, ADRs, and phase acceptance verification gates.

This structure satisfies the architectural principles laid out in **ADR-001 (Modular Monolith)** and guarantees clean boundaries between presentation, backend API, background processing, and shared contracts.

---

## 2. Directory Tree & Module Responsibilities

```
school-erp/
├── apps/
│   ├── api/                               # Express REST API Backend
│   │   ├── src/
│   │   │   ├── config/                    # Validated Zod environment, MongoDB, Redis & App configs
│   │   │   │   ├── app.ts                 # Global app settings (rate-limits, CORS, body caps)
│   │   │   │   ├── database.ts            # Mongoose connection manager with retries & lifecycle events
│   │   │   │   ├── env.ts                 # Zod environment schema parser (fail-fast on missing secrets)
│   │   │   │   └── redis.ts               # ioredis client manager with non-blocking fallback resilience
│   │   │   ├── controllers/               # HTTP transport controllers (Zod DTO parsing, status codes)
│   │   │   ├── core/                      # Cross-cutting logging and error formatting
│   │   │   │   └── logger/                # Pino structured JSON logger
│   │   │   ├── errors/                    # Backend error classes & handlers
│   │   │   ├── events/                    # In-process domain event bus (Phase 2+)
│   │   │   ├── jobs/                      # Queue job triggers (Phase 21+)
│   │   │   ├── middlewares/               # Express middleware pipeline
│   │   │   │   ├── cors.ts                # Configurable CORS origins
│   │   │   │   ├── errorHandler.ts        # Centralized RFC-compliant error transformer
│   │   │   │   ├── notFound.ts            # Standardized 404 handler
│   │   │   │   ├── rateLimiter.ts         # Global sliding window rate limiter
│   │   │   │   ├── requestId.ts           # UUIDv4 X-Request-ID correlator
│   │   │   │   └── securityHeaders.ts     # Helmet OWASP security headers
│   │   │   ├── modules/                   # 36 Bounded Domain Feature Modules (Phase 2+)
│   │   │   ├── repositories/              # Data access layer & Mongoose queries
│   │   │   ├── routes/                    # Versioned routing trees
│   │   │   │   └── health.routes.ts       # /health/liveness & /health/readiness probes
│   │   │   ├── services/                  # Pure domain logic & multi-entity transactions
│   │   │   ├── types/                     # API-specific TypeScript declarations
│   │   │   ├── utils/                     # Backend helper functions
│   │   │   ├── validators/                # Shared Zod validation schemas
│   │   │   ├── app.ts                     # Express application factory
│   │   │   └── server.ts                  # HTTP server entrypoint & graceful shutdown
│   │   ├── tests/                         # Vitest + Supertest integration tests
│   │   │   ├── env.test.ts                # Environment validation test suite
│   │   │   └── health.test.ts             # Health, readiness, and 404 tests
│   │   ├── Dockerfile                     # Multi-stage Alpine container build
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                               # React 19 SPA Frontend
│   │   ├── src/
│   │   │   ├── app/                       # Top-level providers & shells
│   │   │   ├── assets/                    # Static brand SVG/image assets
│   │   │   ├── components/                # Enterprise Design System
│   │   │   │   ├── common/                # ErrorBoundary, Toast, EmptyState
│   │   │   │   ├── layout/                # AppHeader, AppSidebar, TenantSwitcher
│   │   │   │   └── ui/                    # Button, Input, Card, Dialog, Dropdown, Spinner, Skeleton
│   │   │   ├── config/                    # Frontend client configuration
│   │   │   ├── constants/                 # UI constants & layout metrics
│   │   │   ├── context/                   # React Contexts (ThemeContext)
│   │   │   ├── features/                  # Domain feature slices (students, fees...)
│   │   │   ├── hooks/                     # Custom React hooks (useTheme, useToast)
│   │   │   ├── layouts/                   # Dashboard layouts (Admin, Student, Parent)
│   │   │   ├── lib/                       # Utility helpers (clsx, date formatting)
│   │   │   ├── pages/                     # Routed page views
│   │   │   │   ├── HomePage.tsx           # Foundation dashboard & health diagnostics
│   │   │   │   ├── LoginPage.tsx          # Architectural login shell (No fake auth)
│   │   │   │   ├── ForbiddenPage.tsx      # HTTP 403 Forbidden page
│   │   │   │   └── NotFoundPage.tsx       # HTTP 404 Not Found page
│   │   │   ├── routes/                    # React Router configuration (routes/index.tsx)
│   │   │   ├── schemas/                   # React Hook Form Zod validation schemas
│   │   │   ├── services/                  # RTK Query API client (services/api.ts)
│   │   │   ├── store/                     # Redux Toolkit store & slices
│   │   │   │   ├── index.ts               # Root store configuration
│   │   │   │   └── slices/uiSlice.ts      # Global UI client state (theme, sidebar)
│   │   │   ├── types/                     # Frontend-specific TypeScript types
│   │   │   ├── utils/                     # Client helper functions
│   │   │   ├── __tests__/                 # Vitest + React Testing Library suites
│   │   │   ├── App.tsx                    # App root wrapping Provider, Theme, Toast, Router
│   │   │   └── main.tsx                   # DOM entrypoint
│   │   ├── Dockerfile                     # Multi-stage Alpine container (Nginx served)
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── worker/                            # BullMQ Asynchronous Job Processing Daemon
│       ├── src/
│       │   └── worker.ts                  # Worker daemon entrypoint & signal traps
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── common/                            # @edusphere/common
│   │   ├── src/
│   │   │   ├── constants/enums.ts         # Domain enums (UserType, StudentStatus, InvoiceStatus...)
│   │   │   ├── errors/application-error.ts# RFC error classes (ApplicationError, ValidationError...)
│   │   │   └── responses/api-response.ts  # Standardized ApiResponse & ApiErrorResponse envelopes
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                             # @edusphere/types
│       ├── src/
│       │   ├── auth.ts                    # JwtPayload, TokenPair, SessionData
│       │   ├── tenant.ts                  # TenantContext, ITenant, ISchool, ICampus
│       │   └── user.ts                    # IUser, IRole, IPermission, IUserRole
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/
│   ├── docker/                            # Docker configurations
│   └── nginx/
│       └── nginx.conf                     # Reverse proxy with compression & security headers
│
├── docs/                                  # Architectural Blueprints & ADRs
│   ├── ADR_DOCS.md                        # ADR-001 through ADR-007
│   ├── API_DESIGN.md                      # REST conventions & response envelopes
│   ├── ARCHITECTURE.md                    # Multi-tenant system architecture
│   ├── DATABASE_DESIGN.md                 # MongoDB schemas & indexing strategy
│   ├── DEVELOPMENT_ROADMAP.md             # 29-phase implementation roadmap
│   ├── DEVELOPMENT.md                     # Developer quick-start & workflow guide
│   ├── DEVOPS_ARCHITECTURE.md             # CI/CD, Docker & disaster recovery
│   ├── FRONTEND_ARCHITECTURE.md           # React 19 SPA & state separation
│   ├── PHASE_1_VERIFICATION.md            # Phase 1 acceptance gate report
│   ├── PROJECT_STATE.md                   # Workspace inspection & baseline report
│   ├── PROJECT_STRUCTURE.md               # Repository structure documentation
│   ├── RBAC_MATRIX.md                     # Decoupled permission & role matrix
│   ├── SECURITY_ARCHITECTURE.md           # STRIDE threat model & security controls
│   └── TESTING_STRATEGY.md                # Test pyramid & quality gates
│
├── .dockerignore
├── .editorconfig
├── .env.example                           # Canonical environment variable template
├── .env                                   # Local development environment configuration
├── .gitignore
├── .prettierrc
├── .prettierignore
├── docker-compose.yml                     # Local multi-service compose stack
├── package.json                           # Root monorepo workspace configuration
├── tsconfig.base.json                     # Shared TypeScript strict configuration
└── README.md                              # Project overview & documentation index
```
