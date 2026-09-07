# PROJECT_STATE.md — Workspace Inspection & Current State Analysis

**Document Version:** 1.0.0  
**Phase:** Phase 0 — Architecture & Engineering Blueprint  
**Date:** 2026-09-07  
**Author:** Principal Software Architect & DevOps Lead

---

## 1. Executive Summary & Current State

A thorough inspection of the active execution environment and scratch workspace (`C:\Users\lenovo\.gemini\antigravity\scratch`) was conducted prior to designing any architecture or generating application artifacts.

- **Current Status:** **Green-Field / Clean Slate** for the School ERP SaaS platform.
- **Active Workspace:** No existing School Management System or School ERP project was detected.
- **Inspection Findings:**
  - No `package.json` associated with a school management platform.
  - No existing source directories (`src`, `server`, `client`, `apps`, etc.) related to this project.
  - No configuration files (`tsconfig.json`, `vite.config.ts`, `eslint.config.js`, etc.) for this system.
  - No Docker files (`Dockerfile`, `docker-compose.yml`) for this system.
  - No environment files (`.env`, `.env.example`) for this system.
  - No Git repository or version control initialized for this system.
  - No existing README or design documentation for this system.

---

## 2. Workspace Inventory & Pre-Existing Artifacts

The base scratch directory contains several unrelated legacy/experimental directories from previous sessions:

- `leader-portfolio` (Unrelated portfolio app)
- `physiocore-app` (Unrelated clinic app)
- `portfolio-mern` (Unrelated portfolio app)
- `saree-store-main` & `saree-store-main.zip` (Unrelated e-commerce project)
- `stripe-screenshot` (Unrelated screenshot assets)
- `tanveer-portfolio` (Unrelated portfolio app)
- `turfbook` (Unrelated sports booking app)
- `resolve_checkout.js`, `test_db_detailed.js` (Isolated test scripts)

### Potential Conflicts Analysis

- **Risk Assessment:** Low / None.
- **Isolation Rule:** To avoid file collisions, dependency conflicts, or accidental git overwrites, the School Management ERP platform will be strictly housed within its own root directory:
  ```
  C:\Users\lenovo\.gemini\antigravity\scratch\school-erp\
  ```
- None of the existing sibling directories will be modified, moved, or deleted.

---

## 3. Technology Baseline for Phase 0

| Component                    | Target Technology Stack                     | Rationale                                                                                        |
| :--------------------------- | :------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| **Monorepo Management**      | Turborepo + pnpm workspaces                 | High-speed caching, strict workspace boundary enforcement, zero dependency phantom hoisting.     |
| **Backend Runtime**          | Node.js (v22 LTS) + TypeScript (v5.6+)      | Native ESM, strict type checking, robust ecosystem, high I/O concurrency.                        |
| **API Framework**            | Express.js (v4.21+ / v5)                    | Battle-tested middleware ecosystem, high predictability, modular routing.                        |
| **Database**                 | MongoDB (v7.0+) with Mongoose (v8.6+)       | Document model ideal for hierarchical academic entities; multi-document ACID transactions.       |
| **In-Memory Cache / Queues** | Redis (v7.4+) with BullMQ                   | Sub-millisecond session/cache lookups, robust distributed queues with retry/exponential backoff. |
| **Frontend Framework**       | React (v19) + Vite (v5.4+) + TypeScript     | Modern build pipeline, instant HMR, component isolation, tree shaking.                           |
| **State Management**         | TanStack Query (v5) + Zustand               | Decoupled server-state (caching/refetching) from local client UI state.                          |
| **UI Components & Styling**  | Tailwind CSS (v3.4+) + Radix UI / shadcn/ui | Accessible, unstyled primitives, zero runtime CSS overhead, accessible by design.                |
| **Validation & Schema**      | Zod (v3.23+)                                | End-to-end type safety shared between frontend forms and backend controllers.                    |

---

## 4. Recommended Starting Point for Future Phases

1. **Target Project Directory:** `C:\Users\lenovo\.gemini\antigravity\scratch\school-erp\`
2. **Initial Git Repository:** Initialize a clean Git repository with a robust `.gitignore` covering `node_modules`, `.env*`, `dist`, `build`, and coverage reports.
3. **Phase-0 Architecture Freeze:** Complete and approve all architecture artifacts (`ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `API_DESIGN.md`, `RBAC_MATRIX.md`, `SECURITY_ARCHITECTURE.md`, `FRONTEND_ARCHITECTURE.md`, `DEVOPS_ARCHITECTURE.md`, `TESTING_STRATEGY.md`, `DEVELOPMENT_ROADMAP.md`, and ADRs) before writing application code.
4. **Workspace Recommendation:** Prompt the user to set `C:\Users\lenovo\.gemini\antigravity\scratch\school-erp\` as the root workspace in the IDE upon entering Phase 1.
