# DATABASE_RELATIONSHIPS.md — Entity Relationship & Data Flow Architecture

**System Name:** EduSphere ERP  
**Document Version:** 1.0.0  
**Phase:** Phase 2 — Database Architecture & Schema Implementation  
**Target Package:** `@edusphere/database`  

---

## 1. Domain Model Hierarchy & Entity Relationship Map

EduSphere organizes its 48 collections across 10 distinct bounded domain clusters. All operational and institutional records enforce tenant isolation via `tenantPlugin` and soft-delete via `softDeletePlugin`.

```mermaid
erDiagram
    TENANT ||--o{ SCHOOL : owns
    SCHOOL ||--o{ CAMPUS : contains
    CAMPUS ||--o{ ACADEMIC_YEAR : schedules
    
    ACADEMIC_YEAR ||--o{ CLASS : organizes
    CLASS ||--o{ SECTION : divides
    SECTION ||--o{ STUDENT_ENROLLMENT : holds
    STUDENT ||--o{ STUDENT_ENROLLMENT : registers
    
    USER ||--o{ USER_ROLE : assigned
    ROLE ||--o{ USER_ROLE : grants
    ROLE ||--o{ ROLE_PERMISSION : contains
    PERMISSION ||--o{ ROLE_PERMISSION : mapped_to
    USER ||--o{ SESSION : authenticates
    
    STUDENT ||--o{ STUDENT_PARENT_RELATION : mapped_to
    PARENT ||--o{ STUDENT_PARENT_RELATION : belongs_to
    USER ||--o| STUDENT : portal_login
    USER ||--o| PARENT : portal_login
    USER ||--o| TEACHER : faculty_login
    USER ||--o| STAFF : employee_login
    
    SECTION ||--o{ STUDENT_ATTENDANCE : daily_record
    TEACHER ||--o{ STUDENT_ATTENDANCE : taken_by
    STAFF ||--o{ STAFF_ATTENDANCE : daily_log
    
    SECTION ||--o{ TIMETABLE : scheduled_by
    TIMETABLE ||--o{ PERIOD : contains
    SUBJECT ||--o{ PERIOD : taught_in
    TEACHER ||--o{ PERIOD : instructs
    
    SECTION ||--o{ HOMEWORK : assigned_to
    SUBJECT ||--o{ HOMEWORK : belongs_to
    HOMEWORK ||--o{ ASSIGNMENT_SUBMISSION : submitted
    STUDENT ||--o{ ASSIGNMENT_SUBMISSION : completed_by
    
    ACADEMIC_YEAR ||--o{ EXAM : schedules
    EXAM ||--o{ EXAM_SCHEDULE : slots
    CLASS ||--o{ EXAM_SCHEDULE : tests
    SUBJECT ||--o{ EXAM_SCHEDULE : covers
    EXAM ||--o{ MARKS_ENTRY : records
    STUDENT ||--o{ REPORT_CARD : receives
    
    ACADEMIC_YEAR ||--o{ FEE_STRUCTURE : defines
    CLASS ||--o{ FEE_STRUCTURE : applies_to
    STUDENT ||--o{ FEE_INVOICE : billed_to
    FEE_INVOICE ||--o{ PAYMENT : settles
    PAYMENT ||--o{ REFUND : reverses
    
    SCHOOL ||--o{ BOOK : catalogs
    BOOK ||--o{ BOOK_COPY : tracks
    BOOK_COPY ||--o{ LIBRARY_TRANSACTION : loans
    
    SCHOOL ||--o{ VEHICLE : operates
    SCHOOL ||--o{ DRIVER : employs
    ROUTE ||--o{ ROUTE_STOP : stops_at
    STUDENT ||--o{ STUDENT_TRANSPORT_ASSIGNMENT : boards
    
    SCHOOL ||--o{ HOSTEL : maintains
    HOSTEL ||--o{ ROOM : contains
    ROOM ||--o{ BED : provides
    STUDENT ||--o{ HOSTEL_ALLOCATION : occupies
    
    SCHOOL ||--o{ INVENTORY_ITEM : stocks
    INVENTORY_ITEM ||--o{ STOCK_TRANSACTION : moves
    
    SCHOOL ||--o{ ANNOUNCEMENT : broadcasts
    USER ||--o{ MESSAGE : exchanges
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : audits
```

---

## 2. Invariants & Integrity Constraints

| Constraint / Invariant | Enforcement Mechanism | Failure Consequence |
| :--- | :--- | :--- |
| **Tenant Isolation** | `tenantPlugin.ts` (query injection + immutable pre-save hook) | `Error: Cross-tenant mutation prohibited: tenantId is immutable.` |
| **Unique Admission Number** | Compound Index `{ tenantId: 1, schoolId: 1, admissionNumber: 1 }` (unique) | MongoDB duplicate key error `E11000` |
| **Single Active Enrollment** | Compound Index `{ tenantId: 1, academicYearId: 1, studentId: 1 }` (unique) | Student cannot be enrolled in multiple sections or grades simultaneously in the same year |
| **Unique Section Roll Number** | Compound Index `{ tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, rollNumber: 1 }` (unique) | Prevents two students having the same roll number in a classroom division |
| **Single Daily Section Attendance** | Compound Index `{ tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1 }` (unique) | Prevents duplicate or overlapping attendance registers for the same section on a given day |
| **Unique Bed Allocation** | Partial Index `{ tenantId: 1, bedId: 1 }` with `{ status: 'ALLOCATED' }` | Prevents double-booking of a single hostel bed across multiple students |
| **Single Student Hostel Occupancy**| Partial Index `{ tenantId: 1, studentId: 1, academicYearId: 1 }` with `{ status: 'ALLOCATED' }` | A student can only occupy one active bed across all campus hostels |
| **Financial Transaction Atomicity**| MongoDB Replica Set multi-document transactions via `session.withTransaction()` | Payments and Invoice balance mutations commit atomically or roll back completely |
| **Audit Trail Retention** | TTL index on `AuditLog.createdAt` (`expireAfterSeconds: 63072000`) | Automated archival and deletion after 730 days (2 years compliance) |
| **Soft Delete Isolation** | `softDeletePlugin.ts` pre-find hooks filtering `{ isDeleted: false }` | Soft-deleted records never appear in client queries unless explicitly queried via `{ includeDeleted: true }` |

---

## 3. High-Throughput Aggregated Document Patterns

### 3.1 Attendance Modeling: Section-Aggregated Daily Document
To eliminate the unbounded array anti-pattern and avoid generating 40x documents daily, EduSphere stores section-level attendance in a single aggregated document:

```typescript
{
  tenantId: ObjectId("..."),
  schoolId: ObjectId("..."),
  academicYearId: ObjectId("..."),
  classId: ObjectId("..."),
  sectionId: ObjectId("..."),
  date: ISODate("2026-09-01T00:00:00.000Z"),
  takenBy: ObjectId("..."),
  isFinalized: false,
  records: [
    { studentId: ObjectId("..."), status: "PRESENT" },
    { studentId: ObjectId("..."), status: "ABSENT", remarks: "Medical Leave" }
  ]
}
```

* **Index 1 (Write / Update):** `{ tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1 }` (Unique)
* **Index 2 (Reporting / Analytics):** `{ tenantId: 1, "records.studentId": 1, date: 1 }` (Multikey index)

### 3.2 Examination Marks: Section-Subject Level Document
Similarly, examination marks are stored per subject per section for an entire examination cycle:

* **Document Structure:** `MarksEntry` holds embedded `entries: [{ studentId, marksObtained, isAbsent, grade, feedback }]`.
* **Index 1 (Locking / Submission):** `{ tenantId: 1, examId: 1, classId: 1, sectionId: 1, subjectId: 1 }` (Unique)
* **Index 2 (Student Report Generation):** `{ tenantId: 1, "entries.studentId": 1, examId: 1 }` (Multikey index)
