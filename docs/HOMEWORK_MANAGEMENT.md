# HOMEWORK_MANAGEMENT.md — Teacher Workflows, Class Targeting & Parent Monitoring

**Document Version:** 1.0.0  
**Active Phase:** Phase 11 — Homework & Assignment Management  
**Date:** September 14, 2026  
**Status:** Production Grade  

---

## 1. Teacher Authoring & Assignment Workflow

Teachers can only author homework assignments for classes and subjects where they hold active institutional teaching allocations (enforced by `AssignmentPolicy.assertTeacherAssignmentScope`).

### 1.1 Authoring Process

1. **Class and Subject Selection**:
   - The teacher selects an active Academic Class (Grade + Section) and an assigned Subject.
   - The system verifies the teacher's allocation record (`TeacherSubjectAssignment`) or role as Head of Department / Academic Administrator.
2. **Assignment Configuration**:
   - Title, rich description / guidelines, assignment type (`HOMEWORK`, `PROJECT`, `PRACTICE`, `ESSAY`, `LAB_REPORT`), submission mode (`BOTH`, `ONLINE_FILE`, `ONLINE_TEXT`, `OFFLINE`).
   - Scoring scheme: `maxScore` (positive number) and optional `passingScore`.
   - Time boundaries: `assignedDate`, `dueDate`, `allowLateSubmission`, `lateSubmissionDeadline`, and `latePenaltyPercent`.
3. **Reference Attachments**:
   - Reference PDFs, instructions, reading sheets, or worksheets uploaded and associated with the assignment document.
4. **Targeting Strategies**:
   - **Full Class (`ALL`)**: Automatically targets all actively enrolled students in the selected class section.
   - **Differentiated Learning (`SPECIFIC_STUDENTS`)**: Targeted to a sub-roster of students (e.g., remedial practice, honors enrichment projects, missed work makeup).

---

## 2. Parent & Guardian Visibility Engine

Parents have read-only insight into their registered children's assignments via `/assignments/parent/child/:studentId` (backed by `/api/v1/assignments?studentId=:studentId`).

### 2.1 Anti-IDOR Security

- A parent requesting homework records for `studentId` must possess an active relationship in `StudentParentRelation` for the given student.
- Attempts to query assignments of students not linked to the parent return `403 Forbidden: You are only authorized to view assignments for your registered children`.

### 2.2 Parent Portal Capabilities

- **Upcoming Deadlines**: Real-time list of pending, in-progress, or overdue homework assignments for each child.
- **Submission History**: Status badge (`PENDING`, `SUBMITTED`, `LATE`, `GRADED`, `REVISION_REQUIRED`).
- **Academic Feedback**: View teacher feedback comments, awarded score, and maximum possible score.
- **Reference Material Access**: Download reference worksheets provided by teachers to support home learning.
