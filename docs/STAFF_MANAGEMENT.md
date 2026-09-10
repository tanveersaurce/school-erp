# Staff Management Architecture (Phase 6)

## 1. Overview & Data Model

The Staff Management module in EduSphere ERP manages the full employment lifecycle for non-teaching and teaching staff across institutional branches.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Employee Entity                                  │
├───────────────────────┬──────────────────────────┬──────────────────────────┤
│ Personal Profile      │ Employment Data          │ Statutory & Financial    │
├───────────────────────┼──────────────────────────┼──────────────────────────┤
│ - firstName, lastName │ - employeeId (Unique)    │ - panNumber              │
│ - email (Unique/Ten)  │ - departmentId (Ref)     │ - aadhaarNumber          │
│ - phone (Unique/Ten)  │ - designationId (Ref)    │ - uanNumber              │
│ - dateOfBirth, gender │ - campusId (Ref)         │ - pfNumber               │
│ - bloodGroup          │ - employmentType         │ - bankDetails:           │
│ - address:            │ - status (StateMachine)  │   * accountHolderName    │
│   * street, city,     │ - joiningDate            │   * bankName             │
│     state, pincode    │ - probationEndDate       │   * accountNumber        │
│ - emergencyContact:   │ - confirmationDate       │   * ifscCode             │
│   * name, relationship│ - documents[]:           │   * branchName           │
│   * phone             │   * documentType, fileUrl│                          │
└───────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## 2. Atomic Employee ID Generation

To prevent race conditions, duplicate IDs, or format inconsistencies, EduSphere uses an atomic MongoDB counter pattern:

```typescript
// Atomic sequence increment scoped by tenant and academic sequence
const counter = await Counter.findOneAndUpdate(
  { tenantId, sequenceName: 'EMPLOYEE_ID' },
  { $inc: { seq: 1 } },
  { new: true, upsert: true }
);

const year = new Date().getFullYear();
const employeeId = `EMP-${year}-${String(counter.seq).padStart(4, '0')}`;
```

### Guarantees:

- **Collision-Resistant**: Powered by MongoDB atomic `$inc` operations.
- **Tenant-Scoped**: Each tenant maintains its own independent sequence.
- **Auditable**: Formatted predictably as `EMP-YYYY-XXXX` (e.g., `EMP-2026-0001`).

---

## 3. Department & Designation Management

Departments and Designations structure institutional hierarchy:

### Caching Architecture:

- **Redis Cache**: Cached under `dept:{tenantId}` and `desig:{tenantId}` with a 1-hour TTL.
- **Cache Eviction**: Automatically purged on any `create`, `update`, or `delete` operation.
- **Fallback**: Automatically queries MongoDB if Redis is unavailable or on cache misses.

### Referential Integrity Invariants:

- **Pre-Deletion Safeguards**: A department or designation cannot be deleted if there are any active employees assigned to it.
- **Error Response**:
  ```json
  {
    "success": false,
    "error": {
      "code": "REFERENTIAL_INTEGRITY_VIOLATION",
      "message": "Cannot delete department with 5 active employees. Reassign employees before deletion."
    }
  }
  ```

---

## 4. Document Vault & Compliance

Employees can maintain verified compliance documents:

- Document Types: `RESUME`, `ID_PROOF`, `QUALIFICATION_CERTIFICATE`, `EXPERIENCE_LETTER`, `BACKGROUND_VERIFICATION`, `OTHER`.
- Upload Metadata: `documentType`, `title`, `fileUrl`, `uploadedAt`, and verification flags.
- Secure Storage: Encrypted URLs pointing to institutional storage buckets (S3 / Cloud Storage).

---

## 5. Security & Multi-Tenant Enforcement

1. **Automatic Scoping**: Every query is automatically scoped by `tenantId` via Mongoose middleware.
2. **Campus Filtering**: Supports filtering staff by `campusId` to enable campus-level administration while retaining centralized institutional oversight.
3. **Sensitive Field Redaction**: Statutory numbers (PAN, Aadhaar) and bank details are masked or restricted by role permissions (`employee:statutory:read`).
