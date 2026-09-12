# Class & Section Management Specification

## 1. Grade / Class Levels

### 1.1 Overview
Classes represent the vertical progression tiers within an educational institution. They are defined once at the school level and reused across campuses and academic years.

### 1.2 Data Schema
```typescript
interface IClass {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId?: string;
  name: string; // e.g., "Grade 10"
  shortName?: string; // e.g., "G10"
  code: string; // e.g., "G10" (unique per school)
  order: number; // 1, 2, 3... defines progression
  educationLevel?: EducationLevel; // PRE_PRIMARY, PRIMARY, MIDDLE, SECONDARY, SENIOR_SECONDARY, HIGHER_EDUCATION
  status: AcademicStatus; // ACTIVE, INACTIVE, ARCHIVED
  isDeleted: boolean;
}
```

### 1.3 Validation Rules
- `code` must be alphanumeric (1-20 characters) and is stored in uppercase.
- `order` must be a positive integer.
- Deletion is safeguarded: Classes with active sections or academic offerings cannot be hard-deleted.

---

## 2. Sections & Divisions

### 2.1 Overview
Sections partition a grade level into manageable student cohorts according to classroom size and educator ratios.

### 2.2 Data Schema
```typescript
interface ISection {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId?: string;
  classId: string; // Parent Class
  name: string; // e.g., "Section A"
  code?: string; // e.g., "A"
  capacity: number; // Default: 40 (min 1, max 500)
  room?: string; // Physical classroom designation
  classTeacherId?: string; // Reference to default TeacherProfile
  status: AcademicStatus;
  isDeleted: boolean;
}
```

### 2.3 Compound Uniqueness
- Compound index: `{ tenantId: 1, classId: 1, code: 1, isDeleted: 1 }` with `unique: true`.
- Prevents creating duplicate "Section A" within the same grade level.

---

## 3. Academic Offerings (`AcademicClass`)

### 3.1 Overview
The `AcademicClass` entity operationalizes the Class-Section relationship within a physical campus and temporal academic year.

```typescript
interface IAcademicClass {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string; // Physical campus
  academicYearId: string; // Operational session
  classId: string; // Grade level
  sectionId: string; // Section division
  classTeacherId?: string; // Designated homeroom teacher
  capacity: number; // Maximum enrollment limit
  room?: string; // Scheduled classroom
  status: AcademicStatus;
}
```

### 3.2 Capacity Enforcement Invariant
1. Before enrolling a student into an `AcademicClass`, the system checks:
   $$\text{currentEnrollment} < \text{capacity}$$
2. If $\text{currentEnrollment} \ge \text{capacity}$, the operation rejects with `400 Bad Request: Academic Class has reached maximum capacity`.
3. Concurrency safety: Updates check current enrolled counts in an atomic transaction or guarded query.
