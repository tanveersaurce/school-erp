# Attendance Management Architecture (Phase 10)

## 1. Subsystem Overview

The Attendance Management subsystem provides enterprise-grade, daily and period-based student attendance tracking with strict multi-tenant isolation, immutable auditing, academic timetable integration, holiday/working-day enforcement, and mathematical attendance percentage aggregation.

```
                      Academic Calendar & Timetable
                   (Working Days, Holidays, Bell Schedule)
                                    │
                                    ▼
                       Attendance Register Engine
                      (Daily & Period Recording)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            Daily Attendance                Period Attendance
        (Class Cohort per Date)        (Slot x Subject x Teacher)
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                         Register Lifecycle States
                     DRAFT ➔ SUBMITTED ➔ APPROVED ➔ LOCKED
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          Correction Workflow               Reporting Engine
        (Audit Requests & Review)      (Monthly Matrix, Low Attendance,
                                         Student Profile & Campus Rates)
```

---

## 2. Core Entities & Lifecycle

### 2.1 Daily & Period Attendance (`StudentAttendance`)
- Records individual student attendance status:
  - `PRESENT`: Counted as full attendance ($1.0$).
  - `ABSENT`: Absent without approved excuse ($0.0$).
  - `LATE`: Tardy arrival with recorded arrival time, counted as present ($1.0$).
  - `HALF_DAY`: Partial presence, counted as half-day ($0.5$).
  - `EXCUSED`: Documented medical/emergency absence ($0.0$).
- Supports both modes:
  - `DAILY`: School-wide morning or homeroom roll-call for an Academic Class.
  - `PERIOD`: Granular slot-based roll-call linked to master timetable `timetableEntryId` and `periodId`.
- **Compound Database Invariant**:
  - Daily: `(tenantId, academicClassId, date, mode)` unique for `DAILY` mode.
  - Period: `(tenantId, academicClassId, date, timetableEntryId, mode)` unique for `PERIOD` mode.
- **Register Lifecycle**:
  - `DRAFT`: Editable by assigned Class Teacher / Subject Teacher.
  - `SUBMITTED`: Completed roll-call submitted for leadership verification.
  - `APPROVED`: Verified by Department Head, Vice Principal, or Principal.
  - `LOCKED`: Immutable historical register. Any subsequent adjustments require formal `AttendanceCorrection`.

### 2.2 Institutional Calendar & Holidays (`Holiday`)
- Configures campus-specific non-working days, national holidays, festivals, and academic recesses.
- Prevents accidental attendance recording on Sundays or declared holidays unless explicit administrator override is supplied.

### 2.3 Attendance Correction Workflows (`AttendanceCorrection`)
- Protects ledger immutability once registers are locked or submitted.
- Teachers, students, or administrators propose corrections with explicit reason codes (`CLERICAL_ERROR`, `MEDICAL_EXCUSE_SUBMITTED`, `LATE_ARRIVAL_DOCUMENTED`, `SYSTEM_GLITCH`, `OTHER`) and optional supporting evidence document URLs.
- Two-tier workflow:
  - Direct correction by authorized leadership (`attendance:correct` + `attendance:correct:review`).
  - Request & review queue for teaching staff (`PENDING` ➔ `APPROVED` / `REJECTED`).

---

## 3. Mathematical Formula & Aggregations

Attendance percentage is calculated deterministically across the platform according to institutional standards:

$$\text{Attendance Rate} = \left( \frac{\text{Present} + \text{Late} + 0.5 \times \text{Half-Day}}{\text{Total Working Days / Sessions}} \right) \times 100$$

- **Low Attendance Threshold Alerts**: Students falling below the statutory minimum threshold (configurable, default $75\%$) are automatically flagged with at-risk warning indicators across student profiles, class registers, and parent views.
- **Matrix Views**: 2D Monthly Register Matrix provides cross-tabular view of students by calendar day displaying status tokens (`P`, `A`, `L`, `HD`, `EX`, `H`, `W`).
