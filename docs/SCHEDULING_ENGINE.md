# Scheduling Engine & Conflict Detection (Phase 9)

## 1. Engine Purpose

The `SchedulingEngine` (`apps/api/src/modules/timetable/scheduling.engine.ts`) is a high-performance, deterministic server-side verification engine that executes multi-resource conflict detection prior to slot insertion and full timetable publication.

---

## 2. Detection Dimensions

The engine evaluates candidate slots and complete timetable schedules across six orthogonal dimensions:

```
                          Candidate Slot / Master
                                    │
    ┌──────────────┬────────────────┼──────────────┬──────────────┐
    │              │                │              │              │
[Teacher]       [Class]          [Room]         [Period]      [Capacity]
Collision      Collision        Collision      Break Slot      Violation
Check          Check            Check          Check           Check
```

### 2.1 Teacher Collision
- **Rule**: A faculty member cannot instruct two classes concurrently on the same day and period.
- **Check**: Queries `TimetableEntry` for existing entries matching `(teacherId, dayOfWeek, periodId)`.

### 2.2 Class Collision
- **Rule**: A student cohort (`AcademicClass`) cannot attend two subjects simultaneously.
- **Check**: Queries `TimetableEntry` for existing entries matching `(academicClassId, dayOfWeek, periodId)`.

### 2.3 Room Collision
- **Rule**: A physical classroom or laboratory cannot host two distinct cohorts simultaneously.
- **Check**: Sparse check matching `(roomId, dayOfWeek, periodId)`.

### 2.4 Period Type Integrity
- **Rule**: Subject instruction cannot be scheduled during institutional breaks, lunch periods, or morning assemblies.
- **Check**: Verifies `period.type === PeriodType.TEACHING`.

### 2.5 Seating Capacity Compliance
- **Rule**: Classroom capacity must be greater than or equal to the enrolled student count or section capacity.
- **Check**: Compares `classroom.capacity >= academicClass.capacity`.

### 2.6 Working Days Enforcement
- **Rule**: Classes may only be scheduled on active institutional working days configured in `school.settings.workingDays`.
- **Check**: Validates `dayOfWeek` against school operating schedules.

---

## 3. Pre-Flight Conflict Checking API

The engine exposes two operational modes:
1. **Candidate Slot Verification** (`POST /api/v1/timetable/timetables/:id/validate-slot`):
   - Invoked dynamically by the frontend grid when dragging or scheduling a slot.
   - Evaluates partial input without committing to the database.
2. **Master Timetable Publication Scan** (`POST /api/v1/timetable/timetables/:id/validate`):
   - Comprehensive batch scan of all slots in a timetable version.
   - Returns structured `TimetableValidationReport` with conflict counts, categorization, and human-readable messages.
   - Publication (`/publish`) unconditionally halts if `report.isValid === false`.
