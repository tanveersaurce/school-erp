# Subject Catalog & Curriculum Mapping Specification

## 1. Master Subject Catalog

### 1.1 Overview
The master subject catalog holds all recognized academic disciplines offered across the educational institution.

### 1.2 Data Schema
```typescript
interface ISubject {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string; // e.g., "Mathematics"
  shortName?: string; // e.g., "MATH"
  code: string; // e.g., "MATH10" (unique per school)
  type: SubjectType; // CORE, ELECTIVE, LAB, VOCATIONAL
  category?: SubjectCategory; // CORE, ELECTIVE, OPTIONAL, PRACTICAL, CO_CURRICULAR
  educationLevel?: EducationLevel; // Pre-Primary through Higher Ed
  creditHours?: number; // Academic credit weight (default: 3)
  sequence?: number; // Display sorting sequence
  status: AcademicStatus; // ACTIVE, INACTIVE, ARCHIVED
  isDeleted: boolean;
}
```

### 1.3 Subject Categories & Types
- **Subject Types**:
  - `CORE`: Essential academic discipline mandatory for graduation.
  - `ELECTIVE`: Specialized course chosen from an institutional stream.
  - `LAB`: Experimental or practical laboratory component.
  - `VOCATIONAL`: Applied occupational or technical discipline.
- **Subject Categories**:
  - `CORE`, `ELECTIVE`, `OPTIONAL`, `PRACTICAL`, `CO_CURRICULAR`.

---

## 2. Curriculum Mapping (`ClassSubject`)

### 2.1 Overview
Curriculum mapping establishes which subjects are taught at which grade level during a specific academic year.

### 2.2 Schema & Rules
```typescript
interface IClassSubject {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  isOptional: boolean; // Flag indicating whether student can opt out
  creditHours?: number; // Class-specific credit weighting
  sequence: number; // Order in report cards and schedules
  isDeleted: boolean;
}
```

### 2.3 Uniqueness Invariant
- Compound index: `{ tenantId: 1, academicYearId: 1, classId: 1, subjectId: 1, isDeleted: 1 }` with `unique: true`.
- A subject can only be mapped once to a class within a given academic year.
