# DEVELOPMENT.md — Developer Workflow & Setup Guide

**System Name:** EduSphere ERP  
**Phase:** Phase 1 — Monorepo & Technical Foundation

---

## 1. Prerequisites

Ensure your development machine has the following tools installed:

- **Node.js:** `>= 20.0.0` (LTS recommended, verified on Node 22 & 25)
- **npm:** `>= 10.0.0`
- **Git:** `>= 2.40.0`
- **Docker & Docker Compose:** Optional for local database/redis containers

---

## 2. Quick Setup (Local Native Development)

### Step 1: Clone and Navigate

```bash
cd C:\Users\lenovo\.gemini\antigravity\scratch\school-erp
```

### Step 2: Install Workspace Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

_(A pre-configured `.env` is already prepared for local development with defaults)._

### Step 4: Build Shared Internal Packages

```bash
npm run build --workspace=@edusphere/common
npm run build --workspace=@edusphere/types
```

### Step 5: Start Development Services

- **Backend Express API (Port 5000):**
  ```bash
  npm run dev:api
  ```
- **Frontend React Vite SPA (Port 5173):**
  ```bash
  npm run dev:web
  ```

---

## 3. Docker Infrastructure Setup

To spin up local MongoDB 7.0 and Redis 7.4 containers automatically:

```bash
docker compose up -d mongodb redis
```

To run the complete containerized stack:

```bash
docker compose up --build
```

### Services & Ports

| Container           | Service         | Local Host Port | Health Check Probe                         |
| :------------------ | :-------------- | :-------------- | :----------------------------------------- |
| `edusphere-mongodb` | MongoDB 7.0     | `27017`         | `mongosh --eval 'db.adminCommand("ping")'` |
| `edusphere-redis`   | Redis 7.4       | `6379`          | `redis-cli ping`                           |
| `edusphere-api`     | Express API     | `5000`          | `GET http://localhost:5000/health`         |
| `edusphere-web`     | React Nginx SPA | `80`            | `GET http://localhost:80/`                 |

---

## 4. Quality & Verification Commands

| Command                                   | Action                                 | Scope                                     |
| :---------------------------------------- | :------------------------------------- | :---------------------------------------- |
| `npm run typecheck`                       | Strict TypeScript verification         | Entire monorepo (`packages/*`, `apps/*`)  |
| `npm test`                                | Run unit and integration tests         | All workspaces via Vitest                 |
| `npm run test --workspace=@edusphere/api` | Run backend health & env tests         | Backend API suite                         |
| `npm run test --workspace=@edusphere/web` | Run frontend component & routing tests | Frontend React suite                      |
| `npm run build`                           | Production build compilation           | All packages and applications             |
| `npm run format`                          | Auto-format with Prettier              | All TypeScript, CSS, JSON, Markdown files |
| `npm run format:check`                    | Check code formatting compliance       | CI validation gate                        |

---

## 5. Architectural Invariants for Developers

1. **Strict Tenancy:** Never write queries that omit `tenantId`. Mongoose global plugins automate this in Phase 2.
2. **Zero Mock Auth:** Do not introduce fake JWTs or hardcoded logins. Real authentication arrives in Phase 3.
3. **No Direct Model Imports in Controllers:** Controllers invoke Services; Services invoke Repositories; Repositories access Models.
4. **Decoupled Frontend State:** Server data belongs in RTK Query (`src/services/api.ts`). Global UI state belongs in Redux (`src/store/slices/uiSlice.ts`). Local state belongs in `useState`.
