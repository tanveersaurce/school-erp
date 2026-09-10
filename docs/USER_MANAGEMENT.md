# User Management Architecture (Phase 6)

## 1. Overview & Separation of Concerns

EduSphere ERP enforces a strict architectural boundary between **Identity** and **Domain Actors**:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Collection                          │
│  - Authentication & Credentials (bcrypt hash)               │
│  - Session Management & Refresh Tokens                      │
│  - Global/Tenant RBAC Roles & Direct Permissions            │
│  - Verification Tokens (Staff Invitation, Password Reset)    │
│  - Security Status (ACTIVE, INACTIVE, SUSPENDED)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1:1 Linked via userId
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Employee Collection                        │
│  - Employment Details (employeeId, DOJ, Status, Type)       │
│  - Institutional Placement (Department, Designation, Campus)│
│  - Personal & Statutory Records (PAN, Aadhaar, Bank Info)   │
│  - Emergency Contacts & Document Vault                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1:1 Linked via employeeId
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               TeacherProfile Collection                     │
│  - Academic Specialization & Primary/Secondary Subjects     │
│  - Class/Grade Level Qualifications                         │
│  - Workload Limits (maxWeeklyPeriods)                       │
│  - Class Teacher Assignment Flag                            │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles:

1. **Separation of Identity**: Staff employment records can exist without an active login account (e.g. non-system operational staff).
2. **Account Provisioning**: When an account is desired, a `User` entity is linked to the `Employee` record via `userId`.
3. **No Credential Pollution**: The `Employee` and `TeacherProfile` collections never store passwords, password hashes, or session tokens.
4. **Tenant Isolation**: Every `User` is explicitly bound to a `tenantId`, enforced automatically via Mongoose plugins and request context.

---

## 2. User Account Provisioning Workflows

EduSphere supports two distinct user account provisioning flows during staff onboarding:

### Flow A: Direct Account Activation

- **Use Case**: Administrative onboarding where the administrator sets an initial temporary password or system-generated credentials.
- **Workflow**:
  1. Admin provides `email`, `password`, and assigns initial roles (e.g., `['Staff']` or `['Teacher']`).
  2. The system hashes the password with bcrypt (12 rounds) and creates the `User` record with status `ACTIVE`.
  3. The `Employee` record is updated with the resulting `userId`.
  4. Audit logs record `STAFF_USER_PROVISIONED`.

### Flow B: Secure 48-Hour Invitation Email

- **Use Case**: Production-grade self-service staff onboarding.
- **Workflow**:
  1. Admin selects `sendInvitation: true` without providing a password.
  2. The system creates a `User` record with status `PENDING_VERIFICATION` and a secure cryptographic token generated using `crypto.randomBytes(32).toString('hex')`.
  3. A hashed version of the token (`SHA-256`) is stored in `user.verificationTokens` with type `STAFF_INVITATION` and an expiry of 48 hours.
  4. An invitation email is dispatched via `IEmailProvider` containing the activation link:
     `https://app.edusphere.io/auth/accept-invitation?token={rawToken}`.
  5. When the employee clicks the link and submits their chosen password, the token is verified, password set, and status updated to `ACTIVE`.

---

## 3. Account Lifecycle & Cascading Revocation

User accounts undergo strict state machine transitions synchronized with the employee's lifecycle:

| Employee Transition     | Triggered User Action           | Session Impact                                                                              |
| :---------------------- | :------------------------------ | :------------------------------------------------------------------------------------------ |
| **ON_LEAVE**            | No change to user status.       | Existing sessions remain valid.                                                             |
| **SUSPENDED**           | User status set to `SUSPENDED`. | **Immediate session revocation**: All active refresh tokens in Redis & MongoDB are deleted. |
| **TERMINATED**          | User status set to `INACTIVE`.  | **Immediate session revocation**: All active refresh tokens in Redis & MongoDB are deleted. |
| **RESIGNED**            | User status set to `INACTIVE`.  | **Immediate session revocation**: All active refresh tokens in Redis & MongoDB are deleted. |
| **REINSTATED (ACTIVE)** | User status set to `ACTIVE`.    | Employee may log in anew; past sessions remain expired.                                     |

### Revocation Mechanics:

```typescript
// Atomically revoke all user sessions upon suspension/termination
await Session.updateMany(
  { userId: employee.userId, revokedAt: null },
  { $set: { revokedAt: new Date(), revokeReason: `EMPLOYEE_STATUS_TRANSITION: ${newStatus}` } }
);

// Invalidate Redis token cache
await redisClient.del(`sessions:${employee.userId}`);
```

---

## 4. RBAC & Access Control

User operations are guarded by zero-trust permission checks:

| Action          | Endpoint                                 | Required Permission | Allowed Roles                         |
| :-------------- | :--------------------------------------- | :------------------ | :------------------------------------ |
| View Users      | `GET /api/v1/users`                      | `user:read`         | Super Admin, School Admin, HR Manager |
| Create User     | `POST /api/v1/users`                     | `user:create`       | Super Admin, School Admin, HR Manager |
| Update Status   | `PATCH /api/v1/users/:id/status`         | `user:update`       | Super Admin, School Admin             |
| Reset Password  | `POST /api/v1/users/:id/reset-password`  | `user:update`       | Super Admin, School Admin             |
| Revoke Sessions | `POST /api/v1/users/:id/revoke-sessions` | `user:update`       | Super Admin, School Admin, HR Manager |
