# Attendance Correction Workflows & Audit Architecture (Phase 10)

## 1. The Immutability Principle

Once an attendance register transitions to `APPROVED` or `LOCKED`, direct row updates are strictly forbidden. In educational ERP systems, retroactive attendance tampering undermines regulatory compliance, accreditation, safety records, and student transcript integrity.

To adjust finalized records, EduSphere ERP provides a structured, auditable **Attendance Correction Subsystem**.

```
  [ Locked / Submitted Register ]
                 │
                 ▼
     [ Correction Requested ]
  (Teacher / Admin submits reason,
   old status -> proposed status,
       supporting doc URL)
                 │
      ┌──────────┴──────────┐
      │                     │
[ Direct Override ]   [ Staff Request ]
(Principal/Admin       (Status: PENDING)
 auto-applies)              │
                            ▼
                    [ Review Queue ]
                 (Principal / Admin Review)
                 ┌──────────┴──────────┐
                 ▼                     ▼
            [ APPROVED ]          [ REJECTED ]
       (Atomically patches    (Audited refusal;
       StudentAttendance;      register unchanged)
       stores audit record)
```

---

## 2. Correction Schema & States (`AttendanceCorrection`)

### 2.1 Schema Fields
- `tenantId`, `schoolId`, `campusId`: Multi-tenant isolation discriminators.
- `attendanceId`: Reference to parent `StudentAttendance` document.
- `studentId`: Reference to target `Student` document.
- `date`: Attendance date affected.
- `previousStatus`: Original status recorded (`PRESENT`, `ABSENT`, `LATE`, etc.).
- `proposedStatus`: New status requested.
- `reasonCode`: Standardized taxonomy (`CLERICAL_ERROR`, `MEDICAL_EXCUSE_SUBMITTED`, `LATE_ARRIVAL_DOCUMENTED`, `SYSTEM_GLITCH`, `OTHER`).
- `reason`: Mandatory explanatory text from petitioner.
- `evidenceUrl`: Optional URL to scanned medical certificate, parent note, or gate pass.
- `status`: Lifecycle state (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`).
- `requestedBy`: Reference to user creating the request.
- `reviewedBy`, `reviewedAt`, `reviewNotes`: Complete audit fields populated upon resolution.

### 2.2 Direct vs Indirect Correction Routing
- **Indirect Workflow (`PENDING`)**: Initiated when a teaching staff member requests a correction. Enters the administrative review queue.
- **Direct Workflow (`APPROVED`)**: Initiated when an authorized administrator holding `attendance:correct:review` privileges executes a correction. The correction is recorded as pre-approved and immediately updates the underlying student attendance entry in an atomic operation.

### 2.3 Ledger Patching
When a correction is approved:
1. The target student's status in `StudentAttendance.records` is atomically updated to `proposedStatus`.
2. Any accompanying remarks or late arrival times are updated.
3. The correction document stores timestamped reviewer information for forensic audit trails.
