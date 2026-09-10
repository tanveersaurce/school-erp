# School Configuration & Operational Settings Blueprint

## 1. Overview

School Configuration in EduSphere ERP centralizes all institutional profiles, multi-campus physical sites, academic calendar sessions, operational parameters, and visual identity branding under a single cohesive administrative domain.

---

## 2. Institutional Profile (`School`)

The `School` entity represents the academic organization.

### Schema Attributes

- **Basic Identification**:
  - `name`: Official institution name (e.g., "Oakridge International Academy").
  - `legalName`: Legal entity or registered trust name.
  - `code`: Unique institutional code within the tenant (e.g., "OIA-01").
  - `affiliationBoard`: Academic board affiliation (e.g., "CBSE", "ICSE", "IB", "Cambridge").
  - `registrationNumber`: Government or regulatory recognition number.
  - `establishedYear`: Founding year.
- **Localization**:
  - `timezone`: IANA timezone string (default: `"Asia/Kolkata"`).
  - `currency`: ISO-4217 3-letter currency code (default: `"INR"`).
- **Contact & Physical Address**:
  - `contact`: Official email, phone, and public website URL.
  - `address`: Street, city, state, postal code, and country.

---

## 3. Multi-Campus Sites (`Campus / Branch`)

A school can operate one or more physical campuses or branches.

### Architectural Invariants

- **Campus Code Uniqueness**: Campus codes are unique within each school (`unique({ schoolId, code })`).
- **Main Campus Designation**: Exactly one campus serves as the primary/main site (`isMain: true`).
- **Campus Lifecycle Status**:
  - `ACTIVE`: Fully operational campus accepting admissions and scheduling classes.
  - `INACTIVE`: Temporarily non-operational or under construction.
  - `ARCHIVED`: Closed campus retained exclusively for historical transcripts, alumni records, and financial accounting.
- **Safe Archival**: Campuses cannot be deleted; they must be archived via `POST /api/v1/campuses/:id/archive`.

---

## 4. Academic Calendar Sessions (`AcademicYear`)

The academic calendar controls terms, grading periods, promotion gates, and attendance recording.

### Session Lifecycle State Machine

```
              ┌──────────────┐
              │    DRAFT     │ (Planned, configuring curriculum/fees)
              └──────┬───────┘
                     │ Activate (POST /academic-years/:id/activate)
                     ▼
              ┌──────────────┐
              │    ACTIVE    │ (Current live session: class attendance, exams)
              └──────┬───────┘
                     │ Close (POST /academic-years/:id/close)
                     ▼
              ┌──────────────┐
              │    CLOSED    │ (Historical records sealed, read-only)
              └──────────────┘
```

### Critical Invariants

1. **Date Validation**: `startDate` must be strictly earlier than `endDate`. Inverted or identical dates fail with HTTP 422 `VALIDATION_FAILED`.
2. **Atomic Session Activation**:
   - Activating a session atomically marks it as `isCurrent = true` and `status = ACTIVE`.
   - All other academic years for the same campus/school are atomically transitioned off (`isCurrent = false`, and active ones become `CLOSED`), ensuring that no two sessions are concurrently marked active.
3. **Historical Data Preservation**:
   - Historical academic years are immutable and read-only. Student report cards, attendance records, and fee ledgers tied to closed academic years remain sealed and preserved.

---

## 5. Operational Settings (`ISchoolSettings`)

Configured via `GET /schools/settings` and `PATCH /schools/settings`:

### A. Localization & Time Formatting

- `dateFormat`: Supported formats include `"DD/MM/YYYY"`, `"MM/DD/YYYY"`, `"YYYY-MM-DD"`.
- `timeFormat`: `"12H"` (AM/PM) or `"24H"` (military).
- `weekStartDay`: Week start anchor (`"MONDAY"`, `"SUNDAY"`, etc.).
- `defaultLanguage`: ISO language code (default: `"en"`).

### B. Working Schedule

- `workingDays`: Array of active instructional days (e.g., `["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]`).

### C. Automated Document Numbering Sequences

To eliminate race conditions and maintain institutional audit sequences:

- `admissionNumberPrefix`: Prefix for student admissions (e.g., `"ADM-"` or `"APX-ADM"`).
- `invoicePrefix`: Prefix for fee billing statements (e.g., `"INV-"` or `"APX-INV"`).
- `receiptPrefix`: Prefix for payment receipts (e.g., `"REC-"` or `"APX-REC"`).
- `employeeIdPrefix`: Prefix for staff and teacher IDs (e.g., `"EMP-"` or `"APX-EMP"`).

---

## 6. Institutional Visual Branding & White-Labeling (`ISchoolBranding`)

Configured via `GET /schools/branding` and `PATCH /schools/branding`:

- **Identity**:
  - `displayName`: Institutional banner title.
  - `logoUrl`: High-resolution logo for headers, report cards, and identity badges.
  - `faviconUrl`: Browser tab icon.
- **Palette**:
  - `primaryColor`: Hex color code (e.g., `"#4f46e5"`).
  - `secondaryColor`: Secondary accent color (e.g., `"#06b6d4"`).
- **Document Embellishments**:
  - `reportCardHeader`: Formal text rendered on grade sheets and transcripts.
  - `emailSignature`: Standardized footer rendered on system-dispatched notifications.
