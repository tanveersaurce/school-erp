# Faculty Teacher Assignment Specification

## 1. Overview & Dual Roles

Teaching faculties operate in two primary capacities within the academic structure:
1. **Class Teacher (Homeroom In-Charge)**: A faculty member designated as the primary pastoral and administrative lead for an `AcademicClass` offering.
2. **Subject Teacher (Course Instructor)**: A faculty member allocated to instruct a specific subject for a class-section cohort via `TeacherSubjectAssignment`.

---

## 2. Teacher-Subject Assignment Schema

```typescript
interface ITeacherSubjectAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  campusId?: string;
  teacherId: string; // Ref: TeacherProfile
  subjectId: string; // Ref: Subject
  classId: string; // Ref: Class
  sectionId: string; // Ref: Section
  academicClassId?: string; // Ref: AcademicClass
  status: TeacherAssignmentStatus; // ACTIVE, INACTIVE, COMPLETED, TRANSFERRED
  effectiveFrom?: Date;
  effectiveTo?: Date;
}
```

### Invariants:
- Compound uniqueness: `{ tenantId: 1, academicYearId: 1, sectionId: 1, subjectId: 1, teacherId: 1 }`.
- A teacher cannot be redundantly assigned twice to the identical subject in the same section for the same academic year.

---

## 3. Role-Based Scope Isolation (Anti-IDOR)

When an authenticated user has `userType === UserType.TEACHER`:
1. The academic service and controllers automatically resolve their `Teacher` profile via `auth.userId`.
2. Queries for academic classes and student rosters automatically enforce a filter:
   ```typescript
   filter.$or = [
     { classTeacherId: teacher._id },
     { sectionId: { $in: assignedSectionIds } }
   ];
   ```
3. A teacher attempting to access an academic class or roster where they are neither the designated Class Teacher nor the assigned Subject Teacher is rejected with `403 Forbidden: You are not authorized to access this academic class`.
