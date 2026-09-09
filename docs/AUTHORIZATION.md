# Phase 4 — Enterprise Authorization & RBAC Architecture

## 1. Architectural Overview

EduSphere ERP implements a multi-tenant, enterprise-grade Role-Based Access Control (RBAC) engine paired with an Attribute-Based Access Control (ABAC) resource policy layer.

### Core Principles:
1. **Strict Separation of Concerns**:
   - **Authentication** answers: *"Who is this user?"* (Phase 3)
   - **Authorization** answers: *"What operations and data boundaries is this identity permitted to access?"* (Phase 4)
2. **Fail-Safe Default to DENY**:
   - Every route, API endpoint, and resource policy defaults to `DENY`. Access is granted only upon explicit matching of permissions or role policies.
3. **Zero Client-Provided Tenant Trust (Anti-IDOR)**:
   - Tenant isolation is non-negotiable. Tenant identity is resolved exclusively from cryptographic JWT session claims (`req.auth.tenantId`). Any request attempting to access or mutate a resource belonging to another tenant is immediately rejected (HTTP 403 / 404).

---

## 2. Permission Dictionary & Hierarchy

Permissions follow the standard `resource:action` convention (lowercase, colon-separated).

### Permission Convention Examples:
| Resource | Action | Permission String | Description |
| :--- | :--- | :--- | :--- |
| `STUDENT` | `READ` | `student:read` | View student records & profiles |
| `STUDENT` | `CREATE` | `student:create` | Register new student admissions |
| `STUDENT` | `DELETE` | `student:delete` | Deactivate/remove student records |
| `ATTENDANCE` | `MARK` | `attendance:mark` | Record daily student attendance |
| `ROLE` | `MANAGE` | `rbac:manage` | Manage tenant roles & permission matrices |

EduSphere pre-seeds **75 system permissions** covering all academic, administrative, financial, operational, and system resources.

---

## 3. System Roles vs. Custom Roles

```
                      +-------------------+
                      |      Tenant       |
                      +---------+---------+
                                |
               +----------------+----------------+
               |                                 |
      +--------v--------+               +--------v--------+
      |  System Roles   |               |  Custom Roles   |
      | (isSystemRole:  |               | (isSystemRole:  |
      |      true)      |               |     false)      |
      +--------+--------+               +--------+--------+
               |                                 |
      +--------v--------+               +--------v--------+
      |  14 Defaults    |               | Tenant-Specific |
      |  * SUPER_ADMIN  |               |  * Exam Coord.  |
      |  * SCHOOL_ADMIN |               |  * Lab Master   |
      |  * TEACHER      |               |  * Sports Coach |
      |  * STUDENT...   |               |                 |
      +--------+--------+               +--------+--------+
               |                                 |
      +--------v--------+               +--------v--------+
      | Name & Deletion |               | Full CRUD       |
      |  Locked (403)   |               | Supported       |
      +-----------------+               +-----------------+
```

### Safety & Integrity Invariants:
1. **System Roles Immutability**:
   - The 14 default system roles (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `ACCOUNTANT`, `HR_MANAGER`, `LIBRARIAN`, `TRANSPORT_MANAGER`, `HOSTEL_MANAGER`, `RECEPTIONIST`, `STAFF`, `STUDENT`, `PARENT`) have `isSystemRole: true`.
   - Renaming a system role throws HTTP 403 `FORBIDDEN_ACCESS`.
   - Deleting a system role throws HTTP 403 `FORBIDDEN_ACCESS`.
2. **Active Assignment Conflict Protection**:
   - Custom roles cannot be deleted while assigned to one or more active users (`UserRole.countDocuments > 0`). Attempts return HTTP 409 `RESOURCE_CONFLICT`.
3. **Soft Delete**:
   - Deleting a role soft-deletes the record (`isDeleted: true`) and purges its `RolePermission` mappings within the tenant.

---

## 4. Effective Permission Resolution & Redis Caching

Permissions are resolved by aggregating:
1. All roles assigned to the user in `UserRole`.
2. All permissions mapped to those roles in `RolePermission`.
3. System catalog entries from `Permission`.

### High-Performance Redis Caching:
- **Cache Key**: `authz:{tenantId}:{userId}`
- **TTL**: 15 minutes (900 seconds)
- **Fallback**: In-memory cache with TTL if Redis is disconnected or in degraded test environments.

### Cache Invalidation Triggers:
Immediate cache eviction occurs on:
1. **User Role Mutation** (`POST /api/v1/users/:userId/roles`, `DELETE /api/v1/users/:userId/roles/:roleId`).
2. **Role Permission Mutation** (`PUT /api/v1/roles/:roleId/permissions`, `PUT /api/v1/roles/:roleId`).
3. **Role Deletion** (`DELETE /api/v1/roles/:roleId`).

---

## 5. Authorization Middlewares

| Middleware | Signature | Behavior |
| :--- | :--- | :--- |
| `requirePermission` | `(permission: string)` | Requires exact permission match or wildcard `*`. |
| `requireAnyPermission` | `(permissions: string[])` | Grants if user has at least one of the listed permissions. |
| `requireAllPermissions` | `(permissions: string[])` | Requires user to possess every listed permission. |
| `requireRole` | `(roles: string \| string[])` | Grants if user has at least one of the specified named roles. |

*Super Admin Bypass: Users with `userType: 'SUPER_ADMIN'` or role `'SUPER_ADMIN'` bypass all middleware gates.*

---

## 6. Resource-Level Authorization (ABAC Policies)

Located in `apps/api/src/modules/rbac/policies/resource.policy.ts`:

### 1. `canAccessStudent(auth, targetStudentId)`
- **Administrators**: Allowed for any student within the current tenant.
- **Students**: Allowed only if `student.userId === auth.userId`.
- **Parents**: Allowed only if an active `StudentParentRelation` connects parent to student.
- **Teachers**: Allowed only if assigned to student's class/section via `TeacherSubjectAssignment` or designated as class teacher.
- **Cross-Tenant**: Denied immediately (returns `false`).

### 2. `canAccessAttendance(auth, classId, sectionId)`
- **Administrators**: Allowed for any class/section in the tenant.
- **Teachers**: Allowed only if assigned to teach in that section or designated as class teacher.
- **Other Users**: Denied (`false`).

### 3. `canAccessFee(auth, invoiceId)`
- **Administrators & Accountants**: Allowed for any invoice in the tenant.
- **Parents / Students**: Delegates to `canAccessStudent` for the invoice's `studentId`.

---

## 7. Frontend Authorization Layer

Located in `apps/web/src`:

1. **`usePermission()` Hook**:
   - Exposes `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `hasRole`, and `isSuperAdmin`.
   - Supports wildcard scopes (e.g., `student:*` grants `student:read` and `student:create`).
2. **`<Can>` Declarative Component**:
   ```tsx
   <Can permission="role:create" fallback={<p>Unauthorized</p>}>
     <Button onClick={openCreateModal}>Create Role</Button>
   </Can>
   ```
3. **`<PermissionRoute>` Guard**:
   - Enforces authentication and authorization at the React Router level.
   - Redirects unauthenticated users to `/login` and unauthorized users to `/403`.
4. **`RolesPage` (`/roles`)**:
   - Displays all roles with System Role vs Custom Role visual indicators.
   - Allows creating custom roles, modifying descriptions, and toggling permissions by category.
   - Prevents deletion or renaming of System Roles.
