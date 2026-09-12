# Academic Management Architecture & Subsystem Specification (Phase 8)

## 1. Subsystem Overview

The Academic Management subsystem forms the instructional core of the EduSphere ERP platform. It establishes the organizational hierarchy linking physical infrastructure, academic sessions, curriculum frameworks, teaching faculties, and student cohorts.

```
                    Tenant / Institution
                             │
                      School Instance
                             │
               ┌─────────────┴─────────────┐
          Campus Branch              Academic Year
               │                           │
               └─────────────┬─────────────┘
                             │
                     Grade / Class Level
                             │
                     Section / Division
                             │
                 Academic Class Offering
               (Scheduled Cohort per Year)
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
Curriculum Subjects   Faculty Allocation   Student Rosters
 (Class ↔ Subject)    (Subject ↔ Teacher)  (& Roll Numbers)
```

---

## 2. Entity Hierarchy & Domain Models

### 2.1 Grade / Class (`Class`)
Defines the institutional grade levels (e.g., Nursery, Kindergarten, Grade 1 through Grade 12).
- **Attributes**: `name`, `code`, `shortName`, `order`, `educationLevel`, `status`.
- **Invariants**: Unique `code` per school/tenant. Logical ordering defines academic progression.

### 2.2 Section / Division (`Section`)
Physical division of a grade level into cohort groupings (e.g., Section A, Section B).
- **Attributes**: `classId`, `name`, `code`, `capacity`, `room`, `classTeacherId`, `status`.
- **Invariants**: Unique `code` per class level. Defines physical desk limits.

### 2.3 Academic Class Offering (`AcademicClass`)
The concrete annual operational offering binding a `Class` and `Section` to a specific `Campus` and `AcademicYear`.
- **Attributes**: `campusId`, `academicYearId`, `classId`, `sectionId`, `capacity`, `classTeacherId`, `room`, `status`.
- **Invariants**: Compound unique index on `(tenantId, academicYearId, campusId, classId, sectionId)`. Prevents duplicate offerings. Tracks live seat utilization.

### 2.4 Subject Catalog (`Subject`)
Master institutional catalog of academic disciplines.
- **Attributes**: `name`, `code`, `shortName`, `type` (`CORE`, `ELECTIVE`, `LAB`, `VOCATIONAL`), `category` (`CORE`, `ELECTIVE`, `OPTIONAL`, `PRACTICAL`, `CO_CURRICULAR`), `educationLevel`, `creditHours`, `sequence`, `status`.
- **Invariants**: Unique `code` per tenant/school.

### 2.5 Class Curriculum Mapping (`ClassSubject`)
Annual mapping of master subjects into the curriculum for a specific class level.
- **Attributes**: `academicYearId`, `classId`, `subjectId`, `isOptional`, `creditHours`, `sequence`.
- **Invariants**: Compound unique index on `(tenantId, academicYearId, classId, subjectId)`.

### 2.6 Teacher Subject Assignment (`TeacherSubjectAssignment`)
Allocation of a qualified teaching faculty member to instruct a specific subject within a class section.
- **Attributes**: `academicYearId`, `campusId`, `classId`, `sectionId`, `academicClassId`, `subjectId`, `teacherId`, `status`, `effectiveFrom`, `effectiveTo`.
- **Invariants**: Compound unique index on `(tenantId, academicYearId, sectionId, subjectId, teacherId)`. Scopes teacher data visibility strictly to assigned offerings.

### 2.7 Student Academic Enrollment (`StudentEnrollment`)
Enrollment record binding a student to an active academic offering, tracking roll number and enrollment status.
- **Attributes**: `studentId`, `academicClassId`, `academicYearId`, `classId`, `sectionId`, `rollNumber`, `status`, `startDate`, `endDate`.
- **Invariants**: Compound unique index on `(tenantId, academicYearId, studentId)`. Compound unique sparse index on `(academicClassId, rollNumber)`. Capacity limits enforced atomically.

---

## 3. Strict Architectural Boundaries

In accordance with controlled phased implementation:
- **Phase 8 Scope**: Grade levels, Sections, Academic Class offerings, Subject catalog, Class-subject curriculum mappings, Teacher-subject assignments, Student academic enrollments, Capacity enforcement, and Roll number sequencing.
- **Deferred to Phase 9+**:
  - Timetable scheduling, periods, bells, and room allocations.
  - Student daily/period-wise attendance.
  - Homework, assignments, and digital submissions.
  - Examinations, marksheets, grade books, and report cards.
  - Fee schedules and student invoices.
