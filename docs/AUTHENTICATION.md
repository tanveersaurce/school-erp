# EduSphere ERP — Production Authentication & Session Architecture (Phase 3)

## 1. Executive Summary

Phase 3 implements the enterprise-grade multi-tenant Identity & Access Management (IAM) and session governance foundation for EduSphere ERP. Built upon the architectural blueprints of Phase 0 and database models of Phase 2, this module provides:

- **Cryptographically Secure Dual-Token Architecture**: Short-lived JWT access tokens paired with long-lived SHA-256 hashed refresh tokens transmitted via `HttpOnly; Secure; SameSite=Strict` cookies.
- **Refresh Token Rotation & Token Family Theft Detection**: Automatic single-use refresh token rotation. Immediate detection of token replay attacks triggers instant revocation of the entire token family across all devices.
- **Brute Force & Credential Stuffing Defense**: Automatic 15-minute account lockout triggered after 5 consecutive failed login attempts, accompanied by Redis/sliding-window IP rate limiting on authentication routes.
- **Anti-Account Enumeration & Timing Equalization**: Generic, indistinguishable error messages for non-existent accounts and invalid passwords, backed by dummy bcrypt comparisons to eliminate timing discrepancies.
- **Device & Session Governance**: Explicit session tracking per device/user-agent with remote session termination and mass logout capabilities.
- **Single-Use Cryptographic Tokens for Password Reset & Email Verification**: Short-lived, SHA-256 hashed tokens with MongoDB TTL indexes and pluggable email dispatch.
- **Full-Stack Integration**: Complete React UI flows (`LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`, `SessionsPage`) backed by Redux Toolkit Query with automatic silent re-authentication on token expiration.

---

## 2. Token Architecture & Storage Model

```
+-------------------------------------------------------------------------------+
|                             CLIENT (Browser / App)                            |
|                                                                               |
|  +-----------------------------+             +-----------------------------+  |
|  | Access Token (JWT)          |             | Refresh Token (Cookie)      |  |
|  | - TTL: 15 minutes           |             | - TTL: 7 days               |  |
|  | - Stored in Memory / Redux  |             | - HttpOnly; Secure;         |  |
|  | - Authorization: Bearer     |             |   SameSite=Strict           |  |
|  +-----------------------------+             | - Path: /api/v1/auth        |  |
|                                              +-----------------------------+  |
+-------------------------------------------------------------------------------+
                                 |                            |
                     (Authorization: Bearer)         (Cookie: refreshToken)
                                 v                            v
+-------------------------------------------------------------------------------+
|                            EXPRESS BACKEND (apps/api)                         |
|                                                                               |
|  authenticate middleware:                    sessionService.rotateSession:    |
|  1. Verify JWT signature & exp               1. Compute SHA-256(refreshToken) |
|  2. Verify Session._id (not revoked)         2. Check token replay / reuse    |
|  3. Verify User._id (status: ACTIVE)         3. Invalidate old session        |
|  4. Populate req.auth: AuthContext           4. Issue new token pair          |
+-------------------------------------------------------------------------------+
                                 |                            |
                                 +--------------+-------------+
                                                v
+-------------------------------------------------------------------------------+
|                               MONGODB DATABASE                                |
|                                                                               |
|  Session Collection:                                                          |
|  - _id: ObjectId                                                              |
|  - tenantId: ObjectId (indexed)                                               |
|  - userId: ObjectId (indexed)                                                 |
|  - tokenFamilyId: UUID (indexed)                                              |
|  - refreshTokenHash: SHA-256 string (indexed, NEVER PLAINTEXT)                |
|  - isRevoked: Boolean (indexed)                                               |
|  - revokedReason: 'ROTATED' | 'USER_LOGOUT' | 'TOKEN_REUSE_DETECTED'          |
|  - expiresAt: Date (TTL index)                                                |
|  - lastUsedAt: Date                                                           |
|  - deviceName, userAgent, ipAddress                                           |
+-------------------------------------------------------------------------------+
```

---

## 3. Threat Modeling & Defense Matrix

| Threat / Attack Vector                | Architectural Mitigation                                                                                                                                                                    | Status       |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------- |
| **Token Theft / Replay Attack**       | Single-use refresh token rotation. If an already-rotated token is submitted, the system flags a replay attack and revokes all active sessions in the `tokenFamilyId`.                       | **Enforced** |
| **Cross-Site Scripting (XSS)**        | Refresh tokens are strictly delivered inside `HttpOnly; SameSite=Strict; Secure` cookies. JavaScript cannot access the refresh token. Access tokens reside solely in runtime memory.        | **Enforced** |
| **Credential Stuffing / Brute Force** | Account locks for 15 minutes after 5 failed password attempts (`lockoutUntil`). IP rate limiting caps login to 10 attempts per 15 minutes per IP.                                           | **Enforced** |
| **User / Account Enumeration**        | Login endpoints return identical `401 Unauthorized ("Invalid email or password.")` regardless of whether the email exists. Forgot password returns identical `200 OK` generic notification. | **Enforced** |
| **Side-Channel Timing Attacks**       | When a queried email is not found, the backend executes a dummy bcrypt comparison (`passwordService.dummyCompare()`) using a precomputed hash to consume identical CPU time.                | **Enforced** |
| **Password Database Breach**          | Zero plaintext passwords. Passwords hashed using `bcryptjs` with cost factor 12. Password hashes have `{ select: false }` on the Mongoose schema.                                           | **Enforced** |
| **Zombie / Compromised Sessions**     | Immediate remote session revocation (`DELETE /sessions/:sessionId`), mass logout (`POST /logout-all`), and mandatory session invalidation upon password reset or change.                    | **Enforced** |

---

## 4. API Specification (`/api/v1/auth`)

### Public Endpoints

| Method | Endpoint                           | Description                                                                        | Rate Limit   |
| :----- | :--------------------------------- | :--------------------------------------------------------------------------------- | :----------- |
| `POST` | `/api/v1/auth/login`               | Authenticates user credentials, creates session, sets refresh cookie, returns JWT. | 10 req / 15m |
| `POST` | `/api/v1/auth/refresh`             | Rotates refresh token, issues new access token, detects replay theft.              | Global       |
| `POST` | `/api/v1/auth/forgot-password`     | Initiates single-use password reset link via email.                                | 5 req / 15m  |
| `POST` | `/api/v1/auth/reset-password`      | Resets password with token, revokes all user sessions.                             | Global       |
| `POST` | `/api/v1/auth/verify-email`        | Confirms email verification token and activates account.                           | Global       |
| `POST` | `/api/v1/auth/resend-verification` | Re-issues email verification token (rate limited).                                 | 3 req / 15m  |

### Authenticated Endpoints (Requires `Authorization: Bearer <JWT>`)

| Method   | Endpoint                           | Description                                                                     |
| :------- | :--------------------------------- | :------------------------------------------------------------------------------ |
| `POST`   | `/api/v1/auth/logout`              | Revokes current session and clears HttpOnly refresh cookie.                     |
| `POST`   | `/api/v1/auth/logout-all`          | Revokes all active sessions for the user across all devices.                    |
| `GET`    | `/api/v1/auth/me`                  | Returns current user profile, role, tenant, and active session details.         |
| `GET`    | `/api/v1/auth/sessions`            | Lists all active sessions for the user with device and current session flags.   |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | Terminates a specific remote session.                                           |
| `POST`   | `/api/v1/auth/change-password`     | Changes password (requires current password) and terminates all other sessions. |

---

## 5. Automated Verification Summary

All 51 tests across all three monorepo packages are passing:

- **`@edusphere/database`**: 19 / 19 tests passed (Indexes, Tenant Isolation, Soft Delete, Seed Idempotency).
- **`@edusphere/api`**: 22 / 22 tests passed (Auth suite: login, rotation, family reuse, lockout, sessions, password reset, email verification, health checks).
- **`@edusphere/web`**: 10 / 10 tests passed (Login form, ForgotPassword, ResetPassword, VerifyEmail, ProtectedRoute redirection, Sessions management).
