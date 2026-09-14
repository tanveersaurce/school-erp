# Results Aggregation & Immutable Ledger Management

## 1. Overview
The Results Management subsystem compiles verified student marks across all subjects into official aggregate scores, computing total max marks, total obtained marks, overall percentage, GPA, pass/fail status, and failed subject backlogs.

## 2. Immutable Ledger & Versioning
When results are calculated or re-calculated after mark corrections:
- Rather than destructively overwriting previous results, the engine archives previous versions with `isCurrentVersion: false`.
- The newly calculated result is saved with `version = previous.version + 1` and `isCurrentVersion: true`.
- Compound unique index:
  ```typescript
  {
    tenantId: 1,
    examId: 1,
    studentId: 1,
    version: 1
  }
  ```
  Guarantees an append-only, tamper-evident audit history of student evaluations.

## 3. Snapshotting Subject Marks
To prevent changes to subject names, codes, or course configs from altering past academic records, each `Result` document captures a complete `ISubjectResultSnapshot[]`:
- `subjectId`, `subjectName`, `subjectCode`
- `maxMarks`, `passMarks`, `marksObtained`
- `percentage`, `grade`, `gradePoint`, `isPassed`
- `status` (`ENTERED`, `ABSENT`, `EXEMPT`)

## 4. Evaluation Logic
- `percentage = (totalMarksObtained / totalMaxMarks) * 100`
- `failedSubjectCount`: Total number of subjects where `marksObtained < passMarks` or status is `ABSENT`.
- If `failedSubjectCount > 0` or `percentage < passingPercentage`, the `resultStatus` evaluates to `ResultStatus.FAIL`; otherwise `ResultStatus.PASS`.
