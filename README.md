# EduSphere ERP — Enterprise Multi-Tenant School ERP SaaS Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19%20SPA-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.4-red?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)

EduSphere ERP is a production-grade, secure, multi-tenant School Management System / School ERP platform architected for educational societies, multi-campus institutions, and independent schools.

---

## 🏗️ Architecture & Engineering Blueprints

Comprehensive architectural blueprints produced in **Phase 0** are available in the [`docs/`](./docs) directory:

- [System Architecture & Multi-Tenancy](./docs/ARCHITECTURE.md)
- [MongoDB Database Design & Collections](./docs/DATABASE_DESIGN.md)
- [REST API Design & Conventions](./docs/API_DESIGN.md)
- [Decoupled RBAC Matrix & Access Model](./docs/RBAC_MATRIX.md)
- [Security Architecture & Threat Model](./docs/SECURITY_ARCHITECTURE.md)
- [Frontend React 19 Architecture](./docs/FRONTEND_ARCHITECTURE.md)
- [DevOps & Infrastructure Blueprint](./docs/DEVOPS_ARCHITECTURE.md)
- [Testing Strategy & Quality Pyramid](./docs/TESTING_STRATEGY.md)
- [29-Phase Engineering Roadmap](./docs/DEVELOPMENT_ROADMAP.md)
- [Architectural Decision Records (ADR-001 to 007)](./docs/ADR_DOCS.md)
- [Developer Setup & Workflow Guide](./docs/DEVELOPMENT.md)
- [Repository Structure & Catalog](./docs/PROJECT_STRUCTURE.md)
- [Phase 1 Verification Report](./docs/PHASE_1_VERIFICATION.md)

---

## 📁 Monorepo Workspace Structure

```
school-erp/
├── apps/
│   ├── api/             # Express.js REST API Backend (TypeScript, Pino, Mongoose, Redis)
│   ├── web/             # React 19 SPA (Vite 5, Redux Toolkit, RTK Query, Tailwind CSS)
│   └── worker/          # BullMQ Asynchronous Job Processing Daemon
├── packages/
│   ├── common/          # Standard response envelopes, error hierarchy, constants
│   └── types/           # Shared TypeScript domain interfaces & DTOs
├── infrastructure/      # Docker Compose & Nginx reverse proxy configuration
└── docs/                # Architecture blueprints, ADRs, and verification reports
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Shared Internal Packages

```bash
npm run build --workspace=@edusphere/common
npm run build --workspace=@edusphere/types
```

### 3. Run Type Checking & Tests

```bash
npm run typecheck
npm test
```

### 4. Start Development Services

- **Backend API Server (Port 5000):**
  ```bash
  npm run dev:api
  ```
- **Frontend Web App (Port 5173):**
  ```bash
  npm run dev:web
  ```

---

## 🐳 Docker Infrastructure

Run MongoDB and Redis via Docker Compose:

```bash
docker compose up -d mongodb redis
```

Run the entire containerized stack:

```bash
docker compose up --build
```

---

## 🛡️ Baseline Security & Engineering Standards

- **Tenant Isolation:** Multi-tenant architecture designed to guarantee 0.00% cross-tenant data leakage.
- **Strict TypeScript:** Enforced strict mode across the entire codebase with zero `any` types.
- **Fail-Fast Environment:** Zod schema validation halts the server immediately if required environment variables or secrets are missing.
- **Resilient Infrastructure:** Redis connection failures degrade gracefully with in-memory fallbacks without crashing the HTTP server.
- **Graceful Shutdown:** Intercepts `SIGINT` and `SIGTERM` to close HTTP listeners, MongoDB pools, and Redis clients cleanly.
- **No Mock Authentication Policy:** Fake logins and mock JWTs are strictly prohibited. Complete authentication arrives in **Phase 3**.
