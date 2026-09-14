# Timetable & Scheduling Management Architecture (Phase 9)

## 1. Subsystem Overview

The Timetable & Scheduling subsystem is the temporal engine of the EduSphere ERP platform. It orchestrates bell schedules, physical classroom allocations, versioned master timetables, and periodic slot assignments across classes and faculty while strictly enforcing multi-tenant isolation and mathematical conflict-free invariants.

```
                  Campus Timing Configuration
                   (Bell Schedule / Periods)
                              │
                ┌─────────────┴─────────────┐
        Physical Classrooms         Academic Year Master
      (Labs, Halls, Capacity)     (Draft / Published / Archived)
                │                           │
                └─────────────┬─────────────┘
                              │
                    Scheduling Engine
                 (Multi-Resource Conflict)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
 Class Weekly Matrix   Faculty Workload    Room Occupancy Grid
 (Class × Day × Period) (Teacher Workload)  (Facility Utilization)
```

---

## 2. Core Entities & Lifecycle

### 2.1 Bell Schedule & Periods (`Period`)
- Represents distinct chronological slots within a school day.
- Supports typed periods: `TEACHING`, `BREAK`, `LUNCH`, `ACTIVITY`, `ASSEMBLY`.
- Enforces campus-scoped sequence numbers, monotonic start/end times (`startTime < endTime`), duration metrics, and non-overlapping break allocations.

### 2.2 Classrooms & Physical Infrastructure (`Classroom`)
- Models physical rooms, lecture halls, science laboratories, computer labs, art studios, and auditoriums.
- Configured with maximum seating capacities (`capacity`) and physical location room codes.
- Guards against student cohort over-allocation and physical room collisions across classes.

### 2.3 Master Timetable Versioning (`Timetable`)
- Encapsulates an institutional timetable version for a specific `Campus` and `AcademicYear`.
- **Status Lifecycle**:
  - `DRAFT`: Active workspace for slot scheduling and editing.
  - `PUBLISHED`: Verified conflict-free schedule, marked active (`isCurrent: true`). Unpublishes any previous active master.
  - `ARCHIVED`: Read-only historical snapshot.
- Supports atomic deep-cloning (`cloneTimetable`) to spawn new versions with incremental revisions.

### 2.4 Scheduled Period Slots (`TimetableEntry`)
- Granular atom representing an assigned lesson in the 2D grid:
  `(timetableId, academicClassId, dayOfWeek, periodId, subjectId, teacherId, roomId)`.
- Bound to database unique constraints guaranteeing zero collision at the MongoDB engine layer.

---

## 3. Data Integrity & Invariants

1. **Multi-Tenant Scoping**: All models implement tenant discriminator indexing (`tenantId, schoolId, campusId`).
2. **Compound Unique Guards**:
   - Class Collision: `(tenantId, timetableId, academicClassId, dayOfWeek, periodId)` unique.
   - Teacher Collision: `(tenantId, timetableId, teacherId, dayOfWeek, periodId)` unique.
   - Room Collision: `(tenantId, timetableId, roomId, dayOfWeek, periodId)` unique (sparse).
3. **Teaching Period Integrity**: Lessons cannot be scheduled into non-teaching intervals (`BREAK`, `LUNCH`, `ASSEMBLY`).
4. **Capacity Validation**: Scheduled classrooms must accommodate the enrolled cohort size of the academic class.
