# Examination Paper Scheduling & Clash Detection Engine

## 1. Overview
The Examination Scheduling Engine coordinates the date sheet, time slots, classroom venues, and invigilator duties for all papers within an examination cycle. To prevent human scheduling errors, an automated Conflict Detection Engine audits paper schedules both in pre-flight checks and during persistent database creation.

## 2. Clash Detection Dimensions
The conflict engine evaluates 5 distinct conflict vectors:

| Conflict Type | Description |
|---|---|
| `WINDOW_CONFLICT` / `DATE_OUTSIDE_RANGE` | The paper date falls outside the master exam start/end date range. |
| `SUBJECT_CONFLICT` / `DUPLICATE_SUBJECT` | The same subject has already been scheduled for this class in this exam. |
| `CLASS_CONFLICT` / `CLASS_OVERLAP` | The academic class is already scheduled to sit for another paper during the overlapping time slot. |
| `ROOM_CONFLICT` / `ROOM_OCCUPIED` | The physical room or hall is already booked for an overlapping time slot on the same day. |
| `INVIGILATOR_CONFLICT` / `INVIGILATOR_ASSIGNED` | The invigilator or faculty member is already assigned to supervise another paper at the same time. |

## 3. Pre-Validation API Endpoint
Clients can execute pre-flight checks without mutating state:

```http
POST /api/v1/examinations/schedules/check-conflicts
Content-Type: application/json

{
  "examId": "6aa7ddfab0750ad19b75b51a",
  "academicClassId": "6aa7ddfab0750ad19b75b4c2",
  "subjectId": "6aa7ddfab0750ad19b75b4c4",
  "examDate": "2026-10-05T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "12:00",
  "roomId": "Hall-A",
  "invigilatorId": "teacher_6aa7"
}
```

Response payload:
```json
{
  "success": true,
  "data": {
    "hasConflict": true,
    "hasConflicts": true,
    "conflicts": [
      {
        "type": "ROOM_OCCUPIED",
        "message": "Room conflict: The selected room is already booked for an exam from 09:00 to 12:00.",
        "conflictingScheduleId": "6aa7ddfab0750ad19b75b530"
      }
    ]
  }
}
```

## 4. Compound Database Invariants
To eliminate concurrency race conditions, `ExamSchedule` enforces compound uniqueness:
```typescript
{
  tenantId: 1,
  examId: 1,
  academicClassId: 1,
  subjectId: 1,
  isDeleted: 1
}
```
Attempting concurrent duplicate scheduling triggers MongoDB `E11000` duplicate key protection, guaranteeing zero duplicates under multi-user concurrency.
