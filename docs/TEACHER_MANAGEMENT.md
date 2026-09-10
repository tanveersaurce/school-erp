# Teacher Management Architecture (Phase 6)

## 1. Overview & Academic Extension Model

In EduSphere ERP, teaching staff are first-class employees whose academic credentials and timetable workload limits are modeled through the `TeacherProfile` domain extension:

```
┌─────────────────────────────────┐
│        Employee Entity          │
│  - Personal & Employment Info   │
│  - Status, Department, Branch   │
└────────────────┬────────────────┘
                 │ 1:1 Linked via employeeId
                 ▼
┌─────────────────────────────────┐
│     TeacherProfile Entity       │
│  - primarySubject               │
│  - secondarySubjects[]          │
│  - qualifiedGrades[]            │
│  - maxWeeklyPeriods             │
│  - isClassTeacher               │
│  - certifications[]             │
└─────────────────────────────────┘
```

### Architectural Rationale:

- **Clean Separation**: Non-academic personnel (bus drivers, accountants, librarians) do not have unnecessary academic fields in their employee records.
- **Future-Proof Scheduling**: Timetable management, substitute assignment, and exam supervision in future phases depend on `TeacherProfile` without altering human resource schemas.

---

## 2. Teacher Profile Attributes

| Field               | Type                       | Description                                                                                      |
| :------------------ | :------------------------- | :----------------------------------------------------------------------------------------------- |
| `employeeId`        | `ObjectId` (Ref: Employee) | Unique foreign key linking to the parent employee record.                                        |
| `primarySubject`    | `String`                   | Core teaching discipline (e.g., "Mathematics", "Physics").                                       |
| `secondarySubjects` | `String[]`                 | Additional disciplines the teacher is qualified to teach.                                        |
| `qualifiedGrades`   | `String[]`                 | Grade levels qualified for (e.g., `["Grade 9", "Grade 10", "Grade 11"]`).                        |
| `maxWeeklyPeriods`  | `Number`                   | Maximum teaching load per week (default: 30 periods). Prevents scheduling burnout.               |
| `isClassTeacher`    | `Boolean`                  | Flag indicating whether the teacher is currently designated as a primary homeroom/class teacher. |
| `certifications`    | `Array`                    | Teaching credentials, pedagogical certifications, and issuing authorities.                       |

---

## 3. Teaching Faculty API Endpoints

All teacher endpoints are multi-tenant isolated and protected by granular RBAC permissions:

| Endpoint                       | Method | Required Permission | Description                                                                              |
| :----------------------------- | :----- | :------------------ | :--------------------------------------------------------------------------------------- |
| `/api/v1/teachers`             | `GET`  | `teacher:read`      | List teaching faculty with pagination and filters (`subject`, `gradeLevel`, `campusId`). |
| `/api/v1/teachers`             | `POST` | `teacher:create`    | Create a teacher profile for an existing active employee.                                |
| `/api/v1/teachers/:employeeId` | `GET`  | `teacher:read`      | Retrieve full teacher profile populated with employee details.                           |
| `/api/v1/teachers/:employeeId` | `PUT`  | `teacher:update`    | Update academic workload, specialties, or subject assignments.                           |

---

## 4. Frontend Teaching Faculty View

The React web client provides a dedicated faculty directory view (`/teachers`):

- **Specialty Tags**: Visual badges for primary and secondary subjects.
- **Qualified Grade Badges**: Quick inspection of educational stages covered.
- **Weekly Load Indicator**: Capacity monitoring showing maximum periods per week.
- **Homeroom Assignment**: Indicator badge for faculty assigned as class teachers.
