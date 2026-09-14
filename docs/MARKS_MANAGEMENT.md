# Marks Management, Verification & Audit Locking

## 1. Overview
The Marks Management subsystem provides high-integrity student mark capture, teacher verification, administrative locking, and formal post-lock correction workflows.

## 2. Marks Lifecycle & Statuses

```
NOT_ENTERED ➔ ENTERED / ABSENT / EXEMPT ➔ VERIFIED ➔ LOCKED
                                                ▲
                                                │ (Admin Approved Correction)
                                                ▼
                                         Correction Flow
```

- `NOT_ENTERED`: Student roster item initialized without scores.
- `ENTERED`: Marks recorded by the assigned faculty teacher.
- `ABSENT`: Student absent from scheduled paper (recorded as 0 marks, tracked separately).
- `EXEMPT`: Authorized medical or administrative exemption.
- `VERIFIED`: Subject head or examination coordinator has audited the score sheet.
- `LOCKED`: Administrative cryptographic lock applied. Direct mutations rejected with `400 Bad Request`.

## 3. Post-Lock Correction Workflow (`MarkCorrection`)
Once marks are sealed (`MarkStatus.LOCKED`), any grade change requires formal audit recording:
1. **Teacher / Staff Requests Correction**:
   ```http
   POST /api/v1/examinations/marks/:markId/correction
   {
     "newMarks": 88,
     "newStatus": "ENTERED",
     "reason": "Re-evaluation of Paper Section C following student scrutiny request"
   }
   ```
2. **Audit Entity Recorded**:
   - Stores `previousMarks`, `newMarks`, `previousStatus`, `newStatus`, `reason`, `requestedBy`, and status `REQUESTED`.
3. **Supervisor / Admin Reviews Correction**:
   ```http
   POST /api/v1/examinations/marks/corrections/:correctionId/review
   {
     "status": "APPROVED"
   }
   ```
   - Upon approval, the `ExamMark` record is updated, and previous calculated results are flagged for recalculation.
   - If rejected, previous marks remain unchanged with auditable rejection note.

## 4. Bulk Entry Mechanics
Teachers enter marks via bulk roster submission (`POST /api/v1/examinations/marks/bulk`):
- Operates under atomic MongoDB session transactions where supported.
- Checks assigned class/subject permissions: Only assigned teachers or administrators can record marks.
- Validates marks boundaries ($0 \le \text{marks} \le \text{maxMarks}$).
