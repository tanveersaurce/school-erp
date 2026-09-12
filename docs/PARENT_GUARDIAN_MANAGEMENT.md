# Parent & Guardian Management Architecture (Phase 7)

## 1. Overview & Data Model

The Parent/Guardian domain handles family contacts, communication preferences, dual-user account provisioning, and many-to-many relationships with students.

```
┌─────────────────────────┐          ┌─────────────────────────┐
│     Parent/Guardian     │ 1      * │  StudentParentRelation  │
│  - guardianId (Unique)  ├──────────┤  - relationshipType     │
│  - personalDetails      │          │  - isPrimaryContact     │
│  - contactDetails       │          │  - isEmergencyContact   │
│  - communicationPrefs   │          │  - canPickup            │
│  - userId (Ref User)    │          │  - canAccessAcademicInfo│
└─────────────────────────┘          │  - canAccessFinancial   │
                                     │  - status: ACTIVE       │
                                     └───────────┬─────────────┘
                                                 │ *
                                                 │
                                                 │ 1
                                     ┌───────────┴─────────────┐
                                     │         Student         │
                                     │  - admissionNumber      │
                                     │  - studentId            │
                                     │  - personalDetails      │
                                     └─────────────────────────┘
```

---

## 2. Anti-IDOR Parent Perspective (`/me/students`)

To protect child privacy, parent portal views **never accept raw student IDs from client query parameters** to determine authorization.

Instead, the authenticated parent user's identity is resolved exclusively from the verified JWT:

1. `authContext.userId` identifies the active parent user.
2. The system locates the corresponding `Parent` document within the tenant.
3. The server retrieves all active `StudentParentRelation` records linked to that `guardianId`.
4. Only students with confirmed, active server-side relationship records are returned.

Any attempt to access an unauthorized child returns `403 Forbidden Access`.

---

## 3. Account Provisioning Options

When creating a parent or guardian record, administrators can:

1. **48-Hour Secure Invitation Email**: Generates a high-entropy 256-bit cryptographic token stored as a SHA-256 hash in `VerificationToken`. The user clicks the link to set their password.
2. **Direct Activation**: Sets a pre-configured active password (minimum 8 characters) for immediate portal sign-in.

---

## 4. REST API Reference

| Method   | Endpoint                                         | Required Permission   | Description                                                 |
| :------- | :----------------------------------------------- | :-------------------- | :---------------------------------------------------------- |
| `GET`    | `/api/v1/guardians/identifiers/next-guardian-id` | `guardian:create`     | Previews next collision-safe guardian ID (`GRD-YYYY-####`)  |
| `GET`    | `/api/v1/guardians`                              | `guardian:read`       | Paginated directory of registered parents/guardians         |
| `POST`   | `/api/v1/guardians`                              | `guardian:create`     | Creates guardian profile with contact details & preferences |
| `GET`    | `/api/v1/guardians/:id`                          | `guardian:read`       | Detailed guardian profile with linked children              |
| `PATCH`  | `/api/v1/guardians/:id`                          | `guardian:update`     | Updates contact details or communication preferences        |
| `DELETE` | `/api/v1/guardians/:id`                          | `guardian:delete`     | Soft deletes guardian profile                               |
| `POST`   | `/api/v1/guardians/:id/invite`                   | `guardian:update`     | Dispatches 48-hour portal invitation token                  |
| `GET`    | `/api/v1/students/:id/guardians`                 | `relationship:read`   | Retrieves all guardians linked to a student                 |
| `POST`   | `/api/v1/students/:id/guardians`                 | `relationship:create` | Links guardian to student with permissions flags            |
| `PATCH`  | `/api/v1/students/:id/guardians/:relId`          | `relationship:update` | Updates relationship permissions (e.g., pickup, emergency)  |
| `DELETE` | `/api/v1/students/:id/guardians/:relId`          | `relationship:delete` | Unlinks guardian from student                               |
| `GET`    | `/api/v1/me/students`                            | Authenticated Parent  | Anti-IDOR endpoint returning only authorized children       |
| `GET`    | `/api/v1/me/students/:id`                        | Authenticated Parent  | Anti-IDOR endpoint returning specific authorized child      |
