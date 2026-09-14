# Report Card Foundation Architecture

## 1. Overview
In accordance with strict Phase 12 boundary rules, automated PDF generation, printable physical certificates, and graduation transcripts are deferred to Phase 13 / Report Card Generation. However, Phase 12 establishes the complete, production-grade digital ledger, schema, and API foundation upon which Phase 13 report cards will be rendered.

## 2. Foundation Data Schema (`IResult` & `IReportCard`)
The `Result` document acts as the certified digital report card:
- **School & Tenant Attribution**: `tenantId`, `schoolId`, `campusId`.
- **Student Profile**: `studentId`, `rollNumber`, `academicClassId`, `classId`, `sectionId`.
- **Subject Snapshots**: Pre-formatted rows containing subject names, theory/practical breakdown, max marks, pass marks, obtained marks, percentage, letter grades, and subject-level pass/fail outcome.
- **Aggregate Summary**:
  - `totalMaxMarks`: Sum of all participating paper max marks.
  - `totalMarksObtained`: Total marks secured.
  - `percentage`: Final aggregate percentage rounded to two decimal places.
  - `overallGrade`: Letter grade mapped from the active grading scheme.
  - `overallGradePoint`: GPA on standard scale (e.g. 10.0 scale).
  - `resultStatus`: `PASS` or `FAIL`.
  - `failedSubjectCount`: Count of backlogs.
- **Audit & Version Metadata**: Version number, calculation timestamp, approval timestamp & signatory, publication timestamp & publisher.

## 3. Web UI Certified Scorecard View
The `StudentResultViewPage` component renders a production-ready, digital report card suitable for immediate screen viewing by students and parents:
- Deep-blue certified executive header.
- Prominent `PASS` / `FAIL` academic standing badge.
- Complete subject-wise scorecard matrix.
- Metric summary footer (Aggregate Score, Percentage, Cumulative Grade, Academic Standing).
- Notice banner for failed subjects / backlog requirements.
