# Attendance Authorization & Security Policy (Phase 10)

## 1. Security & RBAC Model

The Attendance Management subsystem enforces multi-layered authorization combining coarse Role-Based Access Control (RBAC), fine-grained System Permissions, and Attribute-Based Access Control (ABAC) resource scoping.

### 1.1 Granular System Permissions
Phase 10 introduces 13 specialized permissions (bringing system total to 190):

| Permission String | Description | Permitted Roles |
|---|---|---|
| `attendance:read` | View attendance sheets, records, registers | Super Admin, School Admin, Principal, Vice Principal, Teacher, Student*, Parent* |
| `attendance:mark` | Mark daily or period attendance | Super Admin, School Admin, Principal, Vice Principal, Teacher* |
| `attendance:edit` | Modify draft attendance registers | Super Admin, School Admin, Principal, Vice Principal, Teacher* |
| `attendance:delete` | Remove attendance records | Super Admin, School Admin |
| `attendance:submit` | Submit draft register for approval | Super Admin, School Admin, Principal, Vice Principal, Teacher* |
| `attendance:approve` | Approve submitted attendance register | Super Admin, School Admin, Principal, Vice Principal |
| `attendance:lock` | Lock approved register to make it immutable | Super Admin, School Admin, Principal |
| `attendance:correct` | Request attendance corrections | Super Admin, School Admin, Principal, Vice Principal, Teacher* |
| `attendance:correct:review` | Review & approve/reject correction requests | Super Admin, School Admin, Principal, Vice Principal |
| `attendance:report:read` | Access analytics, matrix, low attendance reports | Super Admin, School Admin, Principal, Vice Principal, Teacher, Accountant, Receptionist |
| `attendance:config:read` | View institutional attendance settings | Super Admin, School Admin, Principal, Vice Principal |
| `attendance:config:manage` | Manage attendance policies, working days, lock window | Super Admin, School Admin |
| `holiday:manage` | Create and delete institutional holidays | Super Admin, School Admin, Principal |

*\*Scoped via ABAC resource policies.*

---

## 2. ABAC Resource Ownership Policies (`AttendancePolicy`)

### 2.1 Teacher Scoping Invariants
Teachers may only record or edit attendance registers for:
1. Academic classes where they are designated as the official **Class Teacher** (`academicClass.classTeacherId == teacherId`), OR
2. Timetable slots where they are the assigned **Subject Teacher** (`timetableEntry.teacherId == teacherId`), OR
3. Classes where they are assigned to teach a subject in that academic year (`TeacherSubjectAssignment`).

Any attempt by a teacher to mark attendance for unassigned cohorts is halted with `403 Forbidden: You are not authorized to mark attendance for this class.`

### 2.2 Parent Scoping Invariants
Parents can only access attendance records for their registered children.
The policy inspects `StudentParentRelation` bindings:
$$\text{ChildAccess} \iff \exists r \in \text{StudentParentRelation} \text{ where } r.\text{parentId} = \text{user.parentId} \land r.\text{studentId} = \text{targetStudentId}$$
Violations are blocked with `403 Forbidden: You are only authorized to view your registered children.`

### 2.3 Student Self-Access Invariants
Students are restricted strictly to their own attendance records (`user.studentId == targetStudentId`). Accessing another peer's attendance yields `403 Forbidden: You can only view your own attendance records.`

### 2.4 Multi-Tenant Boundary Isolation
Every database query and mutation enforces tenant isolation:
- `tenantId` discriminator on all attendance documents.
- `schoolId` and `campusId` boundary matching.
- Cross-tenant requests are intercepted at middleware level.
