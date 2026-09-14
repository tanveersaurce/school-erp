# Bell Schedule & Period Management (Phase 9)

## 1. Overview

The Bell Schedule subsystem models daily temporal divisions within an educational institution. It provides standard period templates that structure the school day for students, faculty, and administrative operations.

---

## 2. Period Data Model (`Period`)

| Field | Type | Description |
|---|---|---|
| `tenantId` | `ObjectId` | Tenant multi-tenancy discriminator |
| `schoolId` | `ObjectId` | School discriminator |
| `campusId` | `ObjectId` | Campus location |
| `name` | `string` | Display name (e.g., "Period 1", "Morning Break") |
| `code` | `string` | Unique alphanumeric identifier (e.g., "P1", "RECESS") |
| `sequence` | `number` | Chronological order (1, 2, 3...) |
| `startTime` | `string` | Start time formatted in 24-hour `HH:mm` format |
| `endTime` | `string` | End time formatted in 24-hour `HH:mm` format |
| `duration` | `number` | Calculated duration in minutes |
| `type` | `PeriodType` | `TEACHING`, `BREAK`, `LUNCH`, `ACTIVITY`, `ASSEMBLY` |
| `status` | `AcademicStatus` | `ACTIVE`, `INACTIVE` |

---

## 3. Business Rules & Validation

1. **Temporal Monotonicity**: `startTime` must strictly precede `endTime`.
2. **Campus Uniqueness**: Compound index on `(tenantId, campusId, code)` guarantees period codes are unique within each campus.
3. **Sequence Ordering**: Chronological sequence ordering is preserved across all matrix views.
4. **Delete Safety**: A period cannot be hard-deleted if referenced in active timetable entries. Soft-delete is enforced.
