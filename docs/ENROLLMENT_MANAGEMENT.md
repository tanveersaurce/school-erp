# Student Enrollment Architecture (Phase 7)

## 1. Overview & Domain Invariants

Student Enrollment represents the formal academic binding between a `Student` and an `AcademicYear` within an institutional tenant.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        StudentEnrollment Entity                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ - tenantId: ObjectId (Tenant Scoping)                                       │
│ - schoolId: ObjectId (School Scoping)                                       │
│ - campusId: ObjectId (Campus Scoping)                                       │
│ - studentId: ObjectId (Ref Student)                                         │
│ - academicYearId: ObjectId (Ref AcademicYear)                               │
│ - classId: ObjectId (Optional Ref Class - Phase 8 Boundary)                 │
│ - sectionId: ObjectId (Optional Ref Section - Phase 8 Boundary)             │
│ - rollNumber: Number (Optional Roll Number - Phase 8 Boundary)              │
│ - status: EnrollmentStatus (ENROLLED, PROMOTED, REPEATING, SUSPENDED,       │
│                             TRANSFERRED, WITHDRAWN, GRADUATED)              │
│ - startDate: Date                                                           │
│ - endDate: Date (Optional)                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Invariant:
A student can have **at most one enrollment record per academic year** in a tenant:
```typescript
StudentEnrollmentSchema.index(
  { tenantId: 1, academicYearId: 1, studentId: 1 },
  { unique: true }
);
```

---

## 2. Boundary Compliance

In Phase 7, `classId`, `sectionId`, and `rollNumber` remain strictly optional references to respect module boundaries. The full Class, Section, and Timetable domain will be implemented in Phase 8.

---

## 3. REST API Reference

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/enrollments` | `enrollment:read` | Lists enrollments with filters (student, year, campus) |
| `POST` | `/api/v1/enrollments` | `enrollment:create` | Creates new enrollment record |
| `GET` | `/api/v1/enrollments/:id` | `enrollment:read` | Detailed enrollment information |
| `PATCH`| `/api/v1/enrollments/:id` | `enrollment:update` | Updates enrollment status or section details |
