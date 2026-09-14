# GRADING_FEEDBACK.md — Scoring Rubrics, Revision Workflows & Audit Trails

**Document Version:** 1.0.0  
**Active Phase:** Phase 11 — Homework & Assignment Management  
**Date:** September 14, 2026  
**Status:** Production Grade  

---

## 1. Teacher Evaluation & Scoring

Authorized teachers evaluate student submissions via `POST /api/v1/assignments/:id/submissions/:subId/grade`:

### 1.1 Invariants & Validation

- **Score Range**: $0 \le \text{score} \le \text{assignment.maxScore}$. Scores below 0 or above `maxScore` are rejected with `400 Bad Request`.
- **Late Penalty Application**: If `assignment.latePenaltyPercent` is defined and `submission.isLate === true`, late penalties can be applied or factored into the final score with transparency notes in the feedback.
- **Grading Attribution**: Stores `gradedById: req.user._id` and `gradedAt: new Date()` for accountability.
- **Lifecycle Transition**: Updates submission status to `GRADED`.

---

## 2. Return for Revision Workflow

When a student submits incomplete work, errors, or requires resubmission, teachers use `POST /api/v1/assignments/:id/submissions/:subId/return`:

### 2.1 Invariants

- **Mandatory Reason**: `returnReason` is required (minimum 3 characters, max 1000 characters).
- **Status Change**: Updates status to `RETURNED`, records `returnedAt: new Date()`.
- **Student Unlocking**: Allows the student to submit an updated attempt (`POST /api/v1/assignments/:id/submissions`), which transitions status to `RESUBMITTED` and logs a new attempt in `attempts[]`.
- **Attempt History Preservation**: Prior drafts and attempts remain preserved in `submission.attempts` with timestamp, content, and attachments for longitudinal review.

---

## 3. Audit & Security Trail

- All grading operations check `assignment:grade` or `submission:grade`.
- Only assigned teachers or academic admins can grade submissions.
- Students and parents have read-only access to awarded scores and comments after grading is published.
