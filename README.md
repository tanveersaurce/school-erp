# EduSphere ERP — Enterprise Multi-Tenant School ERP SaaS Platform

EduSphere ERP is a production-grade, secure, multi-tenant School Management System / School ERP platform architected for educational societies, multi-campus institutions, and independent schools.

---

## 🏗️ Architecture & Engineering Blueprints

Comprehensive architectural blueprints produced in **Phase 0** are available in the [`docs/`](./docs) directory:

* [System Architecture & Multi-Tenancy](./docs/ARCHITECTURE.md)
* [MongoDB Database Design & Collections](./docs/DATABASE_DESIGN.md)
* [REST API Design & Conventions](./docs/API_DESIGN.md)
* [Decoupled RBAC Matrix & Access Model](./docs/RBAC_MATRIX.md)
* [Security Architecture & Threat Model](./docs/SECURITY_ARCHITECTURE.md)
* [Frontend React 19 Architecture](./docs/FRONTEND_ARCHITECTURE.md)
* [DevOps & Infrastructure Blueprint](./docs/DEVOPS_ARCHITECTURE.md)
* [Testing Strategy & Quality Pyramid](./docs/TESTING_STRATEGY.md)
* [29-Phase Engineering Roadmap](./docs/DEVELOPMENT_ROADMAP.md)
* [Architectural Decision Records (ADR-001 to 007)](./docs/ADR_DOCS.md)

---

## 📁 Monorepo Workspace Structure

```
school-erp/
├── apps/
│   ├── api/             # Express.js REST API Backend (TypeScript)
│   ├── web/             # React 19 SPA (Vite + Tailwind CSS + Radix UI)
│   └── worker/          # BullMQ Asynchronous Job Processing Daemon
├── packages/
│   ├── common/          # Standard response envelopes, error hierarchy, constants
│   ├── types/           # Shared TypeScript domain interfaces & DTOs
│   ├── database/        # Shared Mongoose models & tenant plugins
│   └── ui/              # Shared component primitives
└── docs/                # Architecture blueprints & ADRs
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Type Check & Verification
```bash
npm run typecheck
```

### 3. Start Backend API
```bash
npm run dev:api
```

### 4. Start Web Application
```bash
npm run dev:web
```
