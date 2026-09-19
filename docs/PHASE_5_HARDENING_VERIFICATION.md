# Phase 5 Hardening & Maintenance Backfill — Verification Report

**Status**: ✅ **PASS**  
**Date**: September 19, 2026  
**Environment**: Windows, Node.js v25.6.0, npm 11.8.0, MongoDB 7.0.24 (Replica Set), Redis (with memory fallback)  
**Target Git Commit**: `fix: harden phase 5 campus and organization management`

---

## 1. Context & Scope

This targeted hardening patch addresses verified architectural gaps and maintenance debt in **Phase 5 — School, Tenant & Organization Management** identified during the alignment audit (`PHASE_21_PROPOSAL_AUDIT.md`):

1. **Main Campus Multi-Branch Invariants**:
   - Explicit `isMain: boolean` flag on `Campus` schema with partial unique index `{ tenantId: 1, schoolId: 1, isMain: 1 }` filtered by `{ isMain: true, isDeleted: false }`.
   - Automatic `isMain = true` promotion for the very first campus created in a school.
   - Dedicated `POST /api/v1/campuses/:campusId/set-main` endpoint with audit logging (`CAMPUS_SET_MAIN`).
   - Campus archival safety: Prohibits archiving the sole active campus of a school, and prohibits archiving a main campus without reassigning main first.
2. **Academic Year Calendar Invariant**:
   - Upgraded compound index on `AcademicYear` to partial unique index `{ tenantId: 1, campusId: 1, isCurrent: 1 }` filtered by `{ isCurrent: true, isDeleted: false }`.
3. **Automated Document Numbering & Dynamic Padding**:
   - Pure read-only sequence preview endpoint: `GET /api/v1/schools/numbering/preview`.
   - `student.service.ts` connected to `settings.numbering.admissionNumberDigits || 5` for configurable zero-padding.
4. **Maintenance & Database Repairs**:
   - Repaired `TransportSetting` invalid partial index bug (`{ campusId: { $exists: false } }`) to compound unique `{ tenantId: 1, schoolId: 1, campusId: 1 }` for MongoDB 7.0+ Replica Set compatibility.
   - Repaired `packages/database/tests/seed.test.ts` to assert `SYSTEM_ROLES.length` (15) dynamically rather than a hardcoded count.
5. **Frontend Organization Management UI**:
   - `OrganizationPage.tsx`: Added `MAIN` badge and `Set as Main` action button to Campuses table.
   - Settings Tab: Added weekly operational days (7 `WeekDay` checkboxes), `employeeIdPrefix` input, and Live Document Sequence Preview cards.
   - Branding Tab: Added Secondary Brand Color picker + hex input, Logo URL, Favicon URL, and Default Email Signature textarea.

---

## 2. Test Execution Results

| Package / Workspace | Test Suite | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `@edusphere/database` | Campus & Transport Invariants (`campusInvariants.test.ts`, `transportInvariants.test.ts`) | 11 | 11 | 0 | ✅ **PASS** |
| `@edusphere/database` | Full Database Suite (Tenants, Seed, Soft Delete, Transactions, Isolation) | 91 | 91 | 0 | ✅ **PASS** |
| `apps/api` | Campus Hardening Suite (`campus.hardening.test.ts`) | 14 | 14 | 0 | ✅ **PASS** |
| `apps/api` | Tenant Management Lifecycle Suite (`tenant.management.test.ts`) | 22 | 22 | 0 | ✅ **PASS** |
| `apps/web` | Organization Page Suite (`organization.test.tsx`) | 15 | 15 | 0 | ✅ **PASS** |
| `apps/web` | Full Web Frontend Suite (19 test files) | 129 | 129 | 0 | ✅ **PASS** |
| **TOTAL** | **Full Monorepo Hardening & Regression Suite** | **282** | **282** | **0** | ✅ **100% PASS** |

---

## 3. Verified Security & Architectural Invariants

### A. Main Campus Auto-Assignment & Idempotent Designation
- **Auto-Promotion**: When creating the first campus for a school without specifying `isMain`, it is automatically marked `isMain = true`.
- **Subsequent Campuses**: Default to `isMain = false`.
- **Atomic Switch**: Calling `POST /campuses/:campusId/set-main` demotes the prior main campus and promotes the target campus. An audit log `CAMPUS_SET_MAIN` is recorded with before and after state diffs.
- **Idempotency**: Calling `set-main` on a campus that is already main succeeds cleanly with no redundant mutations.

### B. Campus Archival Guards
- **Archiving Main Campus**: Attempting to archive the active main campus is rejected with `HTTP 400 Bad Request` (`Cannot archive the main campus. Please designate another campus as main before archival`).
- **Archiving Sole Active Campus**: Attempting to archive the only active campus is rejected with `HTTP 400 Bad Request` (`Cannot archive the sole active campus of a school`).
- **Archived Main Designation**: Attempting to designate an archived campus as main is rejected with `HTTP 400 Bad Request` (`Archived campus cannot be set as the main campus`).

### C. Multi-Tenant Cross-Boundary Protection
- **Unauthorized Mutation**: Calling `POST /campuses/:campusId/set-main` without authentication returns `HTTP 401 Unauthorized`.
- **Permission Check**: Calling with user lacking `campus:update` permission (e.g. Teacher) returns `HTTP 403 Forbidden`.
- **Cross-Tenant Isolation**: Attempting to set main on a campus belonging to a different tenant returns `HTTP 404 Not Found`.

### D. Read-Only Numbering Preview & Padding Invariants
- **GET /api/v1/schools/numbering/preview**: Returns sample admission numbers, invoices, receipts, and employee IDs based on school configuration without incrementing underlying counters.
- **Configurable Admission Digits**: `studentService.generateNextAdmissionNumber` reads `admissionNumberDigits` (defaulting to 5) and applies correct `padStart(digits, '0')`.

---

## 4. Engineering Quality Gates

- **Typecheck**: `npm run typecheck` executed cleanly across all 6 workspaces (`@edusphere/common`, `@edusphere/database`, `@edusphere/types`, `@edusphere/api`, `@edusphere/web`, `@edusphere/worker`) with **0 errors**.
- **Production Build**: `npm run build` completed cleanly across all workspaces, including Vite production build for `@edusphere/web`.

---

## 5. Phase 5 Sign-Off & Next Phase Transition

Phase 5 Hardening & Maintenance Backfill is complete, verified, and committed.  
The next planned milestone on the roadmap is **Phase 21: Audit Trail & Global Search**.
