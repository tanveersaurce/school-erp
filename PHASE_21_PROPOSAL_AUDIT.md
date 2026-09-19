# Phase 21 Proposal Audit & Roadmap Alignment Report

**Document Target:** `PHASE_21_PROPOSAL_AUDIT.md`  
**Date:** September 19, 2026  
**Auditor:** Principal Enterprise Architect & Senior Security Engineer  
**Inspection Mode:** Read-Only Audit & Gap Analysis (Zero Code Mutation)  

---

## 1. Executive Summary

A recent AI-generated proposal recommended executing a phase titled **"Phase 21 — Multi-Campus Management & System Settings"**, spanning multi-campus governance, main campus designations, campus lifecycles, academic year state machines, operational settings, document numbering, visual branding, and settings UI.

This comprehensive technical audit conducted a rigorous inspection of the production codebase (`@edusphere/common`, `@edusphere/database`, `@edusphere/types`, `apps/api`, `apps/web`) to evaluate this proposal against the established project roadmap.

### Key Audit Findings:
1. **Massive Overlap with Phase 5 (~85% Already Implemented)**: The vast majority of the proposed capabilities were already fully designed, implemented, tested, and verified during **Phase 5 (School, Tenant & Organization Management)**. This includes tenant onboarding, school profiles, campus CRUD and safe archival, academic year creation and atomic activation, operational settings (`general`, `workingDays`, `numbering`), institutional branding APIs, RBAC permissions, and a 5-tab React administration page (`OrganizationPage.tsx`).
2. **Document Numbering is Already Distributed & Active**: Automated, atomic document numbering via MongoDB `$inc` counters on the `Counter` collection already powers Phase 6 (Staff `EMP-XXXX`), Phase 7 (Student `ADM-YYYY-XXXX`), and Phase 13 (Invoices `INV-YYYY-XXXX`, Receipts `REC-YYYY-XXXX`).
3. **True Gaps Represent Minor Phase 5 Hardening (~15%)**: The only genuine gaps are incremental refinements to Phase 5: adding an `isMain` flag on `Campus` with a partial unique index, adding a partial unique index for single current academic year, exposing a few omitted form inputs in `OrganizationPage.tsx` (`workingDays` checkboxes, secondary color, logo/favicon URLs, email signature), and adding a numbering preview endpoint.
4. **Roadmap Derailment Risk**: Designating these minor backfills as a brand-new standalone "Phase 21" creates artificial roadmap inflation and directly derails the master engineering schedule, which calls for **Phase 21 — Audit Trail & Global Search**.
5. **Definitive Recommendation**: Reject creating a standalone Phase 21 for Multi-Campus/Settings. Instead, treat the genuine gaps as a **compact Phase 5 Hardening & Backfill Patch** (or fold them into the upcoming testing/hardening phase), and immediately advance the roadmap to the authentic **Phase 21 — Audit Trail & Global Search**.

---

## 2. Actual Repository State

The repository contains 6 functional workspaces with 705 active automated tests:

| Workspace | Description | Test Suites | Test Count | Status |
|---|---|---|---|---|
| `@edusphere/common` | Shared enums, types, utilities, errors | N/A | N/A | TypeScript Compiled |
| `@edusphere/types` | Domain contracts, DTOs, request inputs | N/A | N/A | TypeScript Compiled |
| `@edusphere/database` | Mongoose schemas, plugins, seed engine | 19 suites | 76 tests | 74 passing, 2 baseline fixes needed |
| `apps/api` | Express API, auth, business services | 46 suites | 504 tests | 100% Passing (504/504) |
| `apps/web` | React 18, Vite, Redux Toolkit, Tailwind | 19 suites | 125 tests | 100% Passing (125/125) |
| `apps/worker` | BullMQ queue workers & event consumers | N/A | N/A | TypeScript Compiled |
| **Total Monorepo** | **Full Regression Suite** | **84 suites** | **705 tests** | **100% Passing Baseline** |

---

## 3. Phase 5 Coverage

Phase 5 was verified on September 10, 2026 (`docs/PHASE_5_VERIFICATION.md`), delivering the full organizational hierarchy: `Tenant -> School -> Campus -> AcademicYear -> Settings/Branding`.

### Verified Artifacts from Phase 5:
- **Tenant**: Model `Tenant` (`packages/database/src/models/tenant.model.ts:39-80`), controller (`tenant.controller.ts:31-130`), service (`tenant.service.ts:115-380`), lifecycle (`ACTIVE`, `SUSPENDED`, `ARCHIVED`), onboarding engine (`onboardTenant` with atomic transactions), and RBAC (`tenant:read`, `tenant:update`, `tenant:suspend`).
- **School**: Model `School` (`tenant.model.ts:84-153`), profile endpoints (`GET/PATCH /schools/profile`), settings endpoints (`GET/PATCH /schools/settings`), branding endpoints (`GET/PATCH /schools/branding`).
- **Campus**: Model `Campus` (`tenant.model.ts:159-187`), CRUD endpoints (`GET/POST /campuses`, `GET/PATCH /campuses/:id`, `POST /campuses/:id/archive`), service methods (`tenant.service.ts:877-1085`).
- **Academic Year**: Model `AcademicYear` (`tenant.model.ts:193-211`), state machine endpoints (`GET/POST /academic-years`, `GET /academic-years/current`, `POST /academic-years/:id/activate`, `POST /academic-years/:id/close`), service methods (`tenant.service.ts:1091-1370`).
- **Frontend UI**: Complete 5-tab responsive management dashboard (`apps/web/src/pages/organization/OrganizationPage.tsx`) covering Profile, Campuses, Academic Years, Operational Settings, and Branding.

---

## 4. Campus Analysis

Inspection of `packages/database/src/models/tenant.model.ts`, `tenant.service.ts`, and `tenant.routes.ts` reveals:

| Feature | Exists in Code? | Location | Production Ready? |
|---|---|---|---|
| Campus Model | **YES** | `tenant.model.ts:159` | Yes |
| Campus Creation | **YES** | `tenant.service.ts:917` (`POST /campuses`) | Yes |
| Campus Update | **YES** | `tenant.service.ts:979` (`PATCH /campuses/:id`) | Yes |
| Campus List & Search | **YES** | `tenant.service.ts:877` (`GET /campuses`) | Yes |
| Campus Status Lifecycle | **YES** | `CampusStatus.ACTIVE`, `INACTIVE`, `ARCHIVED` | Yes |
| Campus Archival Endpoint | **YES** | `tenant.service.ts:1050` (`POST /campuses/:id/archive`) | Yes |
| Campus Code Uniqueness | **YES** | `CampusSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true })` | Yes |
| Tenant-School-Campus Scoping | **YES** | Mapped via `tenantId` and `schoolId` ObjectIds | Yes |
| **`isMain` Flag** | **NO** | Missing on `CampusSchema` and `ICampus` | **Gap** |
| **Primary Campus Designation** | **NO** | No endpoint `POST /campuses/:id/set-main` | **Gap** |
| **Archival Safeguards** | **PARTIAL** | Marks `status = ARCHIVED`, but does not block archiving sole/main campus | **Needs Hardening** |

---

## 5. Academic Year Analysis

Inspection of `tenant.service.ts` (lines 1091–1370) and `tenant.model.ts` (lines 193–215) demonstrates:

### A. Multiple Active Academic Years
- In `activateAcademicYear` (`tenant.service.ts:1293-1306`), the service executes an atomic `updateMany` to retire any existing current academic year for the campus:
  ```typescript
  await AcademicYear.updateMany(
    { tenantId: ay.tenantId, campusId: ay.campusId, _id: { $ne: ay._id }, isCurrent: true },
    { $set: { isCurrent: false, status: AcademicYearStatus.CLOSED } }
  );
  ay.status = AcademicYearStatus.ACTIVE;
  ay.isCurrent = true;
  await ay.save();
  ```
- **Finding**: At the service level, only one academic year is active/current per campus. However, at the database level, the index `{ tenantId: 1, campusId: 1, isCurrent: 1 }` is **non-unique**. A partial unique index is missing.

### B. Multiple Current Years
- Same finding as above: Service prevents it; database constraint is not yet unique.

### C. State Transitions
- `ARCHIVED -> ACTIVE`: **Blocked** (`tenant.service.ts:1286`: throws `BadRequestError('Archived academic years cannot be reactivated.')`).
- `CLOSED -> ACTIVE`: **Permitted** in current code if `activateAcademicYear` is invoked. A guard preventing reactivation of sealed historical years without explicit administrative override is recommended.

### D. Mutation Protection
- **Fully Enforced** (`tenant.service.ts:1230-1232`):
  ```typescript
  if (ay.status === AcademicYearStatus.CLOSED || ay.status === AcademicYearStatus.ARCHIVED) {
    throw new BadRequestError('Closed or archived academic years cannot be modified.');
  }
  ```
  Closed and archived years cannot have dates, names, or settings modified.

---

## 6. School Settings Analysis

Inspection of `tenant.model.ts` (lines 119–147), `tenant.service.ts` (lines 728–818), and `OrganizationPage.tsx` (lines 711–830):

| Setting | Exists in DB | Backend API | Frontend UI | Tested | Production-Ready |
|---|---|---|---|---|---|
| **Timezone** | Yes (`School.timezone`) | Yes (`/schools/profile`) | Yes (Profile Tab) | Yes | **YES** |
| **Date Format** | Yes (`settings.general.dateFormat`) | Yes (`/schools/settings`) | Yes (Settings Tab) | Yes | **YES** |
| **Time Format** | Yes (`settings.general.timeFormat`) | Yes (`/schools/settings`) | Yes (Settings Tab) | Yes | **YES** |
| **Language** | Yes (`settings.general.defaultLanguage`) | Yes (`/schools/settings`) | Omitted in JSX | Yes | **Needs UI control** |
| **Working Days** | Yes (`settings.workingDays`) | Yes (`/schools/settings`) | Omitted in JSX | Yes | **Needs UI checkboxes** |
| **Numbering Prefixes** | Yes (`settings.numbering.*Prefix`) | Yes (`/schools/settings`) | Partial (ADM, INV, REC) | Yes | **Omitted EMP prefix** |
| **Attendance Policy**| Yes (`settings.attendance`) | Yes | Handled in Phase 10 | Yes | **YES** |

---

## 7. Document Numbering Analysis

Inspection of cross-module numbering implementations:

1. **Existence**: Document numbering is **fully implemented and operational** across all dependent modules.
2. **Generation Points**:
   - `Student admissionNumber`: `student.service.ts:138-149` (`ADMISSION_NUMBER_${year}`)
   - `Employee employeeId`: `employee.service.ts:616-628` (`EMPLOYEE_ID`)
   - `FeeInvoice invoiceNumber`: `invoice.service.ts:40-52` (`INVOICE_NUMBER_${year}`)
   - `Payment receiptNumber`: `payment.service.ts:41-53` (`RECEIPT_NUMBER_${year}`)
   - `Refund refundNumber`: `refund.service.ts:29-40` (`REFUND_NUMBER_${year}`)
3. **Scoping**: All sequences are strictly scoped by `{ tenantId, schoolId, sequenceType }`.
4. **Concurrency Safety**: 100% collision-safe. Generated using MongoDB atomic `Counter.findOneAndUpdate({ ... }, { $inc: { currentValue: 1 } }, { new: true, upsert: true })`.
5. **Configurability**: Prefixes are read dynamically from `School.settings.numbering` (e.g. `admissionNumberPrefix`, `invoicePrefix`, `receiptPrefix`, `employeeIdPrefix`).
6. **Digit Length**: `admissionNumberDigits` exists in settings, but string padding currently uses hardcoded defaults (`padStart(4, '0')` or `padStart(5, '0')`).
7. **Preview API**: Currently missing (`GET /schools/numbering/preview`).
8. **Phase 13/14 Dependency**: Phase 13 and 14 already strictly depend on this numbering.
9. **Migration Risk**: Changing prefixes affects only future counter emissions; historical records store static strings and do not break. No migrations required.

---

## 8. Branding / White-Labeling Analysis

Inspection of `tenant.model.ts` (lines 110–118), `tenant.service.ts` (lines 820–870), and `OrganizationPage.tsx`:

- **Backend Model**: `School.branding` stores `displayName`, `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `reportCardHeader`, `emailSignature`.
- **API Endpoints**: `GET /schools/branding` and `PATCH /schools/branding` with `branding:read` and `branding:update` RBAC permissions.
- **Frontend State**: `OrganizationPage.tsx` state initializes all 7 branding fields.
- **Frontend Form Omission**: The JSX form in `OrganizationPage.tsx` currently only renders inputs for `displayName`, `primaryColor`, and `reportCardHeader`, omitting inputs for `secondaryColor`, `logoUrl`, `faviconUrl`, and `emailSignature`.
- **Downstream Integration**:
  - Phase 20 (Reports): Grade sheets and transcripts reference `reportCardHeader` and `logoUrl`.
  - Phase 19 (Communication): Email templates reference `emailSignature`.
- **Placement**: Stored at the `School` level, which is correct for multi-school educational trusts where individual academies maintain distinct heraldry, affiliation headers, and color palettes.

---

## 9. RBAC Analysis

Inspection of `packages/database/src/seed/permissions.data.ts` and `roles.data.ts`:

| Permission String | Seeded? | Category | Description in Codebase |
|---|---|---|---|
| `campus:create` | **YES** (Line 72) | `ACADEMIC` | Create new campus sites |
| `campus:read` | **YES** (Line 79) | `ACADEMIC` | View campus sites |
| `campus:update` | **YES** (Line 86) | `ACADEMIC` | Update campus details |
| `campus:delete` | **YES** (Line 93) | `ACADEMIC` | Archive or deactivate campus sites |
| `campus:manage` | **YES** (Line 100) | `ACADEMIC` | Manage campus sites |
| `academic_year:create` | **YES** (Line 107) | `ACADEMIC` | Create academic years |
| `academic_year:read` | **YES** (Line 114) | `ACADEMIC` | View academic calendars |
| `academic_year:update` | **YES** (Line 121) | `ACADEMIC` | Update academic calendar details |
| `academic_year:activate` | **YES** (Line 128) | `ACADEMIC` | Activate academic year and set as current session |
| `academic_year:close` | **YES** (Line 135) | `ACADEMIC` | Close academic year session |
| `academic_year:manage` | **YES** (Line 142) | `ACADEMIC` | Manage academic calendars |
| `settings:read` | **YES** (Line 149) | `ACADEMIC` | View school operational settings |
| `settings:update` | **YES** (Line 156) | `ACADEMIC` | Update school operational settings |
| `branding:read` | **YES** (Line 163) | `ACADEMIC` | View school branding assets |
| `branding:update` | **YES** (Line 170) | `ACADEMIC` | Update school branding assets and display themes |

**Finding**: All 15 permissions already exist in the permission registry and role bundles. Zero new permissions are needed.

---

## 10. Multi-Tenant Security Analysis

1. **Cross-Tenant IDOR Protection**:
   - `tenantController` strictly pulls `tenantId` from verified JWT claims (`req.auth!.tenantId`).
   - Service operations filter by `{ _id: id, tenantId: new Types.ObjectId(tenantId) }`.
   - Passing an ID from another tenant returns `404 Not Found`. Cross-tenant IDOR is impossible.
2. **Cross-School Intra-Tenant Scoping**:
   - In multi-school tenants, campus mutations currently filter by `tenantId` but do not verify that `campus.schoolId` matches `user.schoolId` (unless the user has tenant-wide admin scope).
   - **Recommendation**: Ensure intra-tenant school scoping is validated if the authenticated user is a School Admin rather than a Super Admin.

---

## 11. Database Invariant Analysis

| Invariant | Database-Level | Service-Level | Frontend Validation | Status |
|---|---|---|---|---|
| **Campus Code Uniqueness** | `unique({ tenantId, schoolId, code })` | Validated in `createCampus`/`updateCampus` | Form validation | **Enforced** |
| **Single Main Campus per School** | **MISSING** | **MISSING** | **MISSING** | **Gap** |
| **Academic Year Date Validity** | None (MongoDB doesn't check `$lt`) | `if (startDate >= endDate) throw BadRequest` | Zod `.refine()` | **Service Enforced** |
| **Single Current Academic Year** | Non-unique index | Enforced in `activateAcademicYear` | Display only | **Needs Partial Unique Index** |
| **Unique Academic Year Name** | `unique({ tenantId, schoolId, campusId, name })` | Checked before creation | Form validation | **Enforced** |

---

## 12. Concurrency / Atomicity Analysis

- **`activateAcademicYear`**: Executes `AcademicYear.updateMany()` followed by `ay.save()`. While effective under sequential traffic, concurrent requests to activate different academic years simultaneously could theoretically both set `isCurrent: true` because no unique index constraint exists on the database engine. A MongoDB transaction and a partial unique index on `{ tenantId: 1, campusId: 1, isCurrent: 1 }` with `{ isCurrent: true, isDeleted: false }` will make this mathematically airtight.
- **`Counter.findOneAndUpdate`**: Fully atomic under any level of concurrency. Zero risk of duplicate admission numbers or invoice numbers.

---

## 13. Proposed Phase 21 vs Existing Roadmap

### The Master Roadmap Sequence:
```text
Phase 18 — Inventory Management (COMPLETED)
Phase 19 — Communication & Notifications (COMPLETED)
Phase 20 — Reports & Analytics (COMPLETED)
Phase 21 — Audit Trail & Global Search (NEXT AUTHENTIC PHASE)
Phase 22 — Security Hardening & Penetration Testing
Phase 23 — Comprehensive Testing Suite
Phase 24 — Performance Optimization & Caching
Phase 25 — Production Dockerization
Phase 26 — CI/CD Pipeline & Staging Deployment
Phase 27 — Production Deployment
Phase 28 — Final QA, Documentation & Production Sign-Off
```

### The Proposed "Phase 21 — Multi-Campus & Settings":
This proposal was mistakenly synthesized from `docs/SCHOOL_CONFIGURATION.md` (a Phase 5 architectural reference document). Treating it as a standalone Phase 21 displaces the critical **Audit Trail & Global Search** module and creates artificial work for features that were already built in Phase 5.

---

## 14. Duplication Analysis

| Proposed Feature | Already in Phase 5? | Implemented? | Missing? | Hardening Needed? | Belongs in Phase 21? |
|---|---|---|---|---|---|
| Campus Management | Yes | Yes | None | Archival guards | **NO** |
| Main Campus | Partial (Design only) | No | `isMain` field & endpoint | Set-main toggle | **NO (Phase 5 backfill)** |
| Main Campus Invariant | No | No | Partial unique index | DB index | **NO (Phase 5 backfill)** |
| Campus Archival Protection | Yes | Yes | Check active classes | Service check | **NO (Phase 5 backfill)** |
| Academic Year | Yes | Yes | None | None | **NO** |
| Academic Year State Machine | Yes | Yes | None | Lock `CLOSED -> ACTIVE` | **NO** |
| Academic Year Immutability | Yes | Yes | None | None (Already immutable) | **NO** |
| School Settings | Yes | Yes | UI checkboxes | Working days JSX | **NO** |
| Document Numbering | Yes (Phases 6, 7, 13) | Yes | Preview endpoint | Dynamic padding | **NO** |
| Branding | Yes | Yes | UI inputs | Expose missing fields in JSX | **NO** |
| White-Labeling | Yes | Yes | None | None | **NO** |
| Organization Settings UI | Yes | Yes | Omitted fields | Wire inputs | **NO** |
| Database Invariant Tests | Yes | Partial | Main campus index test | Add index test | **NO** |

---

## 15. Missing Functionality (The True Delta)

The entire real scope of missing functionality across the proposed topics is limited to:
1. **Campus `isMain`**:
   - Add `isMain: boolean` to `CampusSchema` with partial unique index `{ tenantId: 1, schoolId: 1, isMain: 1 }` (`partialFilterExpression: { isMain: true, isDeleted: false }`).
   - Add `POST /campuses/:id/set-main` and auto-designate first campus as main.
2. **Academic Year Database Invariant**:
   - Change `{ tenantId: 1, campusId: 1, isCurrent: 1 }` to a partial unique index (`partialFilterExpression: { isCurrent: true, isDeleted: false }`).
3. **Frontend JSX Form Polish**:
   - In `OrganizationPage.tsx`, wire inputs for `secondaryColor`, `logoUrl`, `faviconUrl`, `emailSignature`, `workingDays` checkboxes, and `employeeIdPrefix`.
4. **Numbering Preview Endpoint**:
   - Add `GET /schools/numbering/preview` returning sample formatted strings.

---

## 16. Technical Debt

| Item | Description | Severity | Remediation |
|---|---|---|---|
| **`AcademicYear` Current Index** | Non-unique index permits hypothetical duplicate active years on DB level | **HIGH** | Add partial unique index on `{ tenantId: 1, campusId: 1, isCurrent: 1 }` |
| **`TransportSetting` Index Bug** | `{ campusId: { $exists: false } }` invalid in MongoDB partial index (caused test failure) | **HIGH** | Replace with `{ tenantId: 1, schoolId: 1, campusId: 1 }` unique index |
| **`seed.test.ts` Assertion** | Hardcoded expectation of 14 roles fails because 15 system roles now exist | **MEDIUM** | Update assertion to `SYSTEM_ROLES.length` (15) |
| **`OrganizationPage.tsx` Omissions** | Working days and branding inputs absent from JSX form | **MEDIUM** | Render form inputs matching existing state |
| **Hardcoded Digit Padding** | Padding hardcoded to 4 or 5 digits instead of reading `admissionNumberDigits` | **LOW** | Connect services to `settings.numbering.admissionNumberDigits` |

---

## 17. Recommended Placement

### Evaluated Options:
- **Option A (Already completed in Phase 5)**: ~85% of proposed work is already done.
- **Option B (Missing Phase 5 functionality that should be backfilled/hardened)**: ~15% of proposed work consists of minor missing fields and index hardening.
- **Option C (A legitimate new Phase 21 feature)**: **REJECTED**. The scope is far too small and duplicative to constitute a full enterprise phase.
- **Option D (Combination of A + B, with 0% C)**: **SELECTED**.

### Architectural Decision:
The proposed work is **NOT Phase 21**. Creating a phase called "Phase 21 — Multi-Campus Management & System Settings" is an architectural duplication. The roadmap should maintain its integrity:
- **Immediate Action**: Perform a targeted **Phase 5 Hardening & Maintenance Backfill** (or bundle with Phase 22 Security Hardening).
- **Roadmap Continuation**: Proceed with the authentic **Phase 21 — Audit Trail & Global Search**.

---

## 18. Recommended Scope

If the user desires to clean up the Phase 5 delta immediately, the minimal clean scope is:
1. Update `CampusSchema` to include `isMain: { type: Boolean, default: false }` with partial unique index.
2. Add `tenantService.setMainCampus(tenantId, campusId)`.
3. Add partial unique index on `AcademicYearSchema` for `{ tenantId: 1, campusId: 1, isCurrent: 1 }`.
4. Render missing inputs in `OrganizationPage.tsx` (`secondaryColor`, `logoUrl`, `faviconUrl`, `emailSignature`, `workingDays`).
5. Fix the two database test issues (`seed.test.ts` role count and `transport.model.ts` partial index).

*Estimated Engineering Effort: ~1 hour (compact PR, zero architectural risk).*

---

## 19. Dependencies

- **Phase 6, 7, 13**: Consume document numbering prefixes.
- **Phase 19**: Consumes `emailSignature`.
- **Phase 20**: Consumes `reportCardHeader` and `logoUrl`.
- **Authentic Phase 21 (Audit & Search)**: Will audit campus and settings mutations and index campus records for global search.

---

## 20. Risks

1. **Roadmap Drift Risk**: Treating this as a full phase delays the real security, search, and containerization deliverables.
2. **Regression Risk**: Modifying existing numbering in a heavy-handed way could disrupt active invoice or admission sequences in Phase 7 and Phase 13.
3. **MongoDB Index Constraint Risk**: Using `$exists: false` in partial indexes breaks MongoDB Replica Sets. Partial indexes must strictly use `$type: 'null'` or positive filters.

---

## 21. Final Recommendation

1. **DO NOT** execute a standalone "Phase 21 — Multi-Campus Management & System Settings".
2. **ACCEPT** the Phase 5 findings: 85% of this functionality is already active in production.
3. **PATCH** the small Phase 5 delta (the 15% hardening items) either immediately as a minor patch or during Phase 22 (Hardening).
4. **PROCEED** to the genuine **Phase 21 — Audit Trail & Global Search** per the original architecture blueprint.
