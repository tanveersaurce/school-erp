# Student Academic Enrollment & Roll Number Management

## 1. Academic Enrollment Lifecycle

When a student is admitted into the institution, they must be assigned to an operational `AcademicClass` offering for their current academic year.

```typescript
interface IStudentEnrollment {
  id: string;
  tenantId: string;
  schoolId: string;
  studentId: string; // Ref: Student
  academicYearId: string; // Ref: AcademicYear
  classId: string; // Ref: Class
  sectionId: string; // Ref: Section
  academicClassId?: string; // Ref: AcademicClass
  rollNumber?: number; // Unique within AcademicClass
  status: EnrollmentStatus; // ENROLLED, PROMOTED, RETAINED, TRANSFERRED, WITHDRAWN
  startDate: Date;
  endDate?: Date;
}
```

---

## 2. Capacity Guard & Concurrency Safety

1. Every `AcademicClass` maintains an institutional seat capacity.
2. During the `enrollStudentAcademic` service call:
   ```typescript
   const currentCount = await StudentEnrollment.countDocuments({
     tenantId: tId,
     academicClassId: ac._id,
     status: 'ENROLLED',
   });
   if (currentCount >= ac.capacity) {
     throw new BadRequestError(
       `Academic Class has reached maximum capacity (${ac.capacity}). Cannot enroll student.`
     );
   }
   ```
3. Compound unique index `{ tenantId: 1, academicYearId: 1, studentId: 1 }` prevents enrolling the same student into multiple classes in the same academic year.

---

## 3. Roll Number Sequencing & Auto-Assignment

### 3.1 Collision Safeguards
- A compound sparse unique index exists on:
  ```typescript
  { academicClassId: 1, rollNumber: 1 }
  ```
- Two students in the same class offering cannot hold the same roll number.

### 3.2 Auto-Assignment Algorithm
When an authorized administrator or teacher triggers `POST /academic/academic-classes/:id/auto-roll-numbers`:
1. The service retrieves all active enrolled students for the class offering.
2. It fetches student personal details and sorts the roster alphabetically:
   - Primary Sort: `student.personalDetails.firstName` (ascending)
   - Secondary Sort: `student.personalDetails.lastName` (ascending)
   - Tertiary Sort: `student.admissionNumber` (ascending)
3. It assigns sequential numbers $1, 2, 3, \dots, N$ in a single atomic bulk write or sequential update.
4. An audit log entry is recorded summarizing the number of assigned roll numbers.
