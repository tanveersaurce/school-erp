# Attendance Analytics & Reporting Architecture (Phase 10)

## 1. Overview

The Attendance Reporting Engine provides comprehensive analytical summaries across individual students, academic classes, entire campuses, and multi-day calendar matrices.

---

## 2. Report Formats

### 2.1 2D Monthly Register Matrix (`/api/v1/attendance/reports/monthly-matrix`)
- **Structure**: Cross-tabular grid mapping all enrolled students in a class across every day of the selected month ($1 \dots N$).
- **Calendar Day Tokens**:
  - `P`: Present ($1.0$).
  - `A`: Absent ($0.0$).
  - `L`: Late ($1.0$).
  - `HD`: Half-day ($0.5$).
  - `EX`: Excused absence.
  - `H`: Declared institutional holiday.
  - `W`: Standard non-working day (e.g., weekend).
  - `-`: No register recorded / unrecorded day.
- **Summary Metrics per Student**: Total present days, absent days, late counts, half-days, excused absences, total working days, and aggregate attendance percentage.

### 2.2 Low Attendance Threshold Report (`/api/v1/attendance/reports/low-attendance`)
- Identifies students whose attendance percentage falls below a configurable statutory or institutional minimum (default: $75\%$).
- Filters across campus, academic class, and date windows.
- Outputs at-risk student roster with contact details, current percentage, and absence breakdown for immediate parental intervention and counseling.

### 2.3 Student Profile Attendance Summary (`/api/v1/attendance/student/:studentId`)
- Provides longitudinal view for a single student across an academic year or custom date range.
- Feeds student report cards, parent portal dashboards, and compliance records.

### 2.4 Daily Campus Attendance Summary (`/api/v1/attendance/reports/daily-campus`)
- Aggregates overall school performance for a given calendar date.
- Metrics include:
  - Total enrolled students across campus.
  - Overall campus attendance rate (%).
  - Marked classes vs pending/unrecorded classes.
  - Class-by-class roll-call status table.
