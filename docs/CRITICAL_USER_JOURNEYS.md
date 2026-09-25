# Critical User Journeys (CUJ) & Verification Matrix

## Overview
This document defines the 14 foundational end-to-end critical user journeys implemented, validated, and continuously asserted across EduSphere ERP (Phase 23). Every journey simulates authentic production lifecycle workflows traversing database persistence, domain validation, RBAC boundaries, and tenant isolation.

---

### Journey 1: Multi-Tenant Institution Onboarding
* **Actor**: Super Admin / Platform Operator
* **Lifecycle**: `Tenant → School → Campus → Academic Year → Admin Account Provisioning`
* **Invariants Verified**:
  - Tenant slug uniqueness and plan features boundary.
  - School and campus hierarchical foreign-key linkage.
  - Active academic year initialization and current pointer tagging.
  - Zero cross-tenant leakage during provisioning.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 1)`

---

### Journey 2: Staff & Teacher Onboarding Journey
* **Actor**: HR Administrator & School Admin
* **Lifecycle**: `User Creation → Employee Record Creation → Teacher Profile Specialization → Credential Assertion`
* **Invariants Verified**:
  - Direct 1:1 mapping between Identity (`User`) and Employment (`Employee`).
  - Automatic `teacherCode` generation and weekly period limit enforcement.
  - Specialty domain allocation and verification.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 2)`

---

### Journey 3: Student & Guardian Registration & Relationship Graph
* **Actor**: Admissions Officer / Registrar
* **Lifecycle**: `Student Registration → Guardian Profile → Bidirectional Relationship Binding → Enrollment Confirmation`
* **Invariants Verified**:
  - Unique system-wide `studentId` and `admissionNumber` scoping.
  - Primary contact and emergency contact flag inheritance.
  - Parent-child graph validation under tenant boundary.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 3)`

---

### Journey 4: Academic Curriculum Allocation & Timetable Setup
* **Actor**: Academic Coordinator
* **Lifecycle**: `AcademicClass Creation → Subject Registry → ClassSubject Mapping → TeacherSubjectAssignment`
* **Invariants Verified**:
  - Class capacity constraints.
  - Subject classification (`CORE`, `ELECTIVE`, `LAB`, `VOCATIONAL`).
  - Single primary teacher assignment per section/subject pair.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 4)`

---

### Journey 5: Daily Attendance Roll Call & Verification
* **Actor**: Homeroom Teacher & School Principal
* **Lifecycle**: `Roll Call Entry → Section Attendance Compilation → Submission → Lock`
* **Invariants Verified**:
  - Daily submission idempotency (one register per section per date).
  - Explicit teacher attribution (`takenBy`).
  - Attendance state machine lock (`SUBMITTED` cannot be overwritten without re-opening).
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 5)`

---

### Journey 6: Homework Assignment Lifecycle & Teacher Evaluation
* **Actor**: Subject Teacher & Enrolled Student
* **Lifecycle**: `Assignment Publishing → Student Submission Upload → Grading & Feedback Evaluation`
* **Invariants Verified**:
  - Due date enforcement and attempt numbering.
  - State machine transition: `DRAFT → SUBMITTED → GRADED`.
  - Immutable teacher grading stamp (`score`, `feedback`, `gradedBy`, `gradedAt`).
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 6)`

---

### Journey 7: Master Examination & Results Flow
* **Actor**: Exam Controller & Academic Staff
* **Lifecycle**: `Exam Setup → Schedule Slotting → Marks Entry → Result Computation & Publishing`
* **Invariants Verified**:
  - Non-overlapping timetable schedules within master exam window.
  - Passing mark thresholds and maximum mark constraints.
  - Atomically calculated results (`totalMarksObtained`, `percentage`, `grade`, `resultStatus: PASS/FAIL`).
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 7)`

---

### Journey 8: Fees Billing, Payment & Reconciliation
* **Actor**: Finance Officer & Guardian
* **Lifecycle**: `Fee Category → Structure Definition → Invoice Generation → Payment Execution → Balance Zeroing`
* **Invariants Verified**:
  - Integer-based minor unit financial accounting (`totalAmount`, `paidAmount`, `balanceAmount`).
  - Invoice status progression: `DRAFT → ISSUED → PAID`.
  - Math consistency: `paidAmount + balanceAmount === totalAmount`.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 8)`

---

### Journey 9: Library Catalog, Circulation & Return
* **Actor**: School Librarian & Student Member
* **Lifecycle**: `Catalog Book → Barcode Copy Creation → Member Registration → Issue Checkout → Check-in Return`
* **Invariants Verified**:
  - Physical copy status synchronization (`AVAILABLE → ISSUED → AVAILABLE`).
  - Loan duration calculation and maximum book quotas.
  - Circulation status lifecycle tracking.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 9)`

---

### Journey 10: Transport Fleet & Route Allocation
* **Actor**: Transport Manager
* **Lifecycle**: `Vehicle Registration → Route & Stop Configuration → Student Seat Allocation`
* **Invariants Verified**:
  - Bus seating capacity safeguards.
  - Stop ordering and schedule synchronization.
  - Single active transport assignment per student.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 10)`

---

### Journey 11: Hostel Residential Allocation & Checkout
* **Actor**: Hostel Warden
* **Lifecycle**: `Hostel Building Creation → Room Configuration → Bed Allocation → Student Checkout`
* **Invariants Verified**:
  - Gender-segregated hostel room policy.
  - Bed occupancy tracking (`AVAILABLE → OCCUPIED → AVAILABLE`).
  - Check-in and check-out timestamp validation.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 11)`

---

### Journey 12: Inventory Stock & Asset Management
* **Actor**: Stores & Procurement Officer
* **Lifecycle**: `Store Setup → Inventory Item Creation → Initial Stock Ledger → Quantity Issuance`
* **Invariants Verified**:
  - Non-negative stock constraints (`quantityOnHand >= 0`).
  - Stock issue balance subtraction (`quantityOnHand` and `quantityAvailable`).
  - Low-stock reorder thresholds.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 12)`

---

### Journey 13: Institutional Announcements & Push Notifications
* **Actor**: Principal / Teacher & Student / Parent
* **Lifecycle**: `Announcement Creation → Targeted Publication → Notification Dispatch → Mark Read`
* **Invariants Verified**:
  - Target audience resolution (`ALL`, `STUDENTS`, `STAFF`).
  - Notification delivery status (`DELIVERED`) and unread tracking (`isRead: false`).
  - Read receipts (`readAt` timestamp recorded upon consumption).
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 13)`

---

### Journey 14: Compliance Audit & Global Search Discovery
* **Actor**: System Auditor & Security Officer
* **Lifecycle**: `Sensitive Mutation → Audit Log Emission → Audit Query → Search Isolation Boundary`
* **Invariants Verified**:
  - Immutable audit trail recording (`actorId`, `actorType`, `action`, `entity`, `entityId`, `timestamp`).
  - Complete exclusion of audit and security ledgers from public global search results.
  - Multi-tenant tenant boundary in compliance reporting.
* **Test Verification**: `apps/api/tests/e2e.user.journeys.test.ts (Journey 14)`
