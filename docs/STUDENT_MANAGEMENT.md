# Student Management Architecture (Phase 7)

## 1. Overview & Domain Boundary

The Student Management module in EduSphere ERP manages student identity, admission records, profiles, medical records, and verification vaults across multi-tenant academic institutions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Student Entity                                  │
├───────────────────────┬──────────────────────────┬──────────────────────────┤
│ Personal Profile      │ Academic Record          │ Medical & Documents      │
├───────────────────────┼──────────────────────────┼──────────────────────────┤
│ - firstName, lastName │ - admissionNumber (Uniq) │ - bloodGroup             │
│ - displayName         │ - studentId (Unique)     │ - allergies[]            │
│ - dateOfBirth, gender │ - campusId (Ref)         │ - chronicConditions[]    │
│ - nationality         │ - currentAcademicYearId  │ - medicalNotes           │
│ - religion, category  │ - admissionDate          │ - documents[]:           │
│ - contactDetails:     │ - admissionType:         │   * documentType         │
│   * email (Unique/Ten)│   * REGULAR, TRANSFER    │   * title, fileUrl       │
│   * phone, emergency  │   * SCHOLARSHIP          │   * verificationStatus   │
│   * currentAddress    │   * MANAGEMENT           │   * verifiedBy, reason   │
│   * permanentAddress  │ - currentStatus (Enum)   │ - statusHistory[]        │
└───────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## 2. Atomic Collision-Safe Numbering

To guarantee race condition immunity and sequence continuity under concurrent admissions, student admission numbers and system identifiers are generated using MongoDB atomic `$inc` counters:

```typescript
const counter = await Counter.findOneAndUpdate(
  {
    tenantId: new Types.ObjectId(tenantId),
    schoolId: schoolObjectId,
    sequenceType: `ADMISSION_NUMBER_${year}`,
  },
  { $inc: { currentValue: 1 } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

const val = counter?.currentValue ?? 1;
const admissionNumber = `ADM-${year}-${String(val).padStart(4, '0')}`;
```

### Guarantees:
- **Zero Collisions**: Powered by atomic database sequences `$inc`.
- **Tenant & Campus Scoped**: Each institutional tenant maintains independent numbering.
- **Auditable Pattern**: `ADM-YYYY-XXXX` and `STD-YYYY-XXXX` (e.g., `ADM-2026-0001`).

---

## 3. Document Vault & Verification Lifecycle

Student identity documents, birth certificates, previous school transfer certificates (TC), and immunization records are tracked in a verifiable document vault:

- **Statuses**: `PENDING`, `VERIFIED`, `REJECTED`.
- **RBAC Controls**: Only authorized staff (`student_document:verify`) can approve or reject documents. Rejections strictly mandate a recorded audit reason.
- **Audit Logging**: Every upload, approval, rejection, and deletion creates an immutable audit trail entry.

---

## 4. REST API Reference

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/students/identifiers/next-admission-number` | `student:create` | Previews next collision-safe admission number |
| `GET` | `/api/v1/students/identifiers/next-student-id` | `student:create` | Previews next collision-safe student ID |
| `GET` | `/api/v1/students` | `student:read` | Paginated directory with search & filters |
| `POST` | `/api/v1/students` | `student:create` | Registers new student with optional guardian & enrollment |
| `GET` | `/api/v1/students/:id` | `student:read` | Detailed student profile with active guardians |
| `PATCH`| `/api/v1/students/:id` | `student:update` | Updates personal, contact, or academic fields |
| `DELETE`| `/api/v1/students/:id`| `student:delete` | Soft deletes student profile |
| `POST` | `/api/v1/students/:id/documents` | `student_document:create` | Uploads document proof to student vault |
| `PATCH`| `/api/v1/students/:id/documents/:docId/verify` | `student_document:verify` | Verifies or rejects uploaded document |
| `DELETE`| `/api/v1/students/:id/documents/:docId` | `student_document:delete` | Deletes uploaded document |
