# Result Approval & Secure Publishing Architecture

## 1. Overview
The Result Publishing pipeline controls the authorization gates that govern when examination scores transition from administrative drafts to legally recognized, student-visible performance reports.

## 2. Authorization Pipeline & Roles

| Phase | Required Permission | Authorized Role | Effect |
|---|---|---|---|
| **Calculation** | `result:calculate` | Admin, Exam Officer | Aggregates subject scores; creates `CALCULATED` result records. |
| **Approval** | `result:approve` | Principal, Director | Reviews institutional pass rates; sets status to `APPROVED`. |
| **Publishing** | `result:publish` | Principal, School Admin | Sets status to `PUBLISHED`; timestamps release; opens student/parent visibility. |

## 3. Strict Student & Parent Scoping Policies (ABAC & anti-IDOR)
To prevent unauthorized access or early disclosure of unreleased results:
1. **Unpublished Exam Gate**:
   - If an exam has not reached status `PUBLISHED`, student and parent queries are rejected with `403 Forbidden Access` ("Results are not yet published for this examination").
2. **Student Self-Scoping**:
   - Students querying `/api/v1/examinations/my-results` or `/api/v1/examinations/results/student/:studentId` can ONLY access their own records.
   - Any attempt to provide another student's ID returns `403 Forbidden Access`.
3. **Parent Scoping**:
   - Parents querying `/api/v1/examinations/parent/child/:studentId/results` can only access students registered to them via an active `StudentParentRelation`.
   - Unauthorized student access returns `403 Forbidden Access`.
4. **Institutional Scope**:
   - School administrators and principals with `result:read` can view results across all classes and campuses within their tenant partition.
