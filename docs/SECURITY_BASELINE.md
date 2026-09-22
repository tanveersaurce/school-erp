# EduSphere ERP — Security Baseline & Controls Specification

**Document Classification**: Standard Operating Procedure & Architecture Baseline  
**Scope**: All Services, APIs, Databases, and Frontend Applications in EduSphere ERP  
**Version**: 1.0.0 (Phase 22 Security Baseline)  
**Status**: ACTIVE & ENFORCED  
**Effective Date**: September 22, 2026  

---

## 1. Authentication Baseline

### 1.1 Access Tokens (JWT)
- **Algorithm**: `HS256` strictly pinned. Header algorithm tampering (e.g., `alg: none` or `RS256`) is rejected immediately.
- **Validity / Expiration**: 15 minutes (`15m`).
- **Cryptographic Secret**: Minimum 32 characters of high-entropy randomness. Default development secrets (`dev-jwt-access-secret-minimum-32-chars-ok`) are strictly prohibited in `production` and `staging` via environment validation schema.
- **Claims**:
  - `iss`: `edusphere-erp` (strictly verified)
  - `aud`: `edusphere-api` (strictly verified)
  - `sub`: User ID (`Types.ObjectId` hex string)
  - Mandatory verified payload claims: `userId`, `tenantId`, `sessionId`. Tokens missing any mandatory claim are rejected with `401 AUTHENTICATION_REQUIRED`.
  - Scoped claims: `schoolId` (if assigned), `userType`, `roles` array, `permissions` array.

### 1.2 Refresh Tokens & Session Management
- **Token Format**: 64-character cryptographically secure pseudo-random hex string (`crypto.randomBytes(32).toString('hex')`).
- **Storage**: Persisted as a SHA-256 hash in MongoDB (`Session` collection). Raw refresh tokens are never stored in plaintext.
- **Rotation Policy**: Single-use token rotation on every `/auth/refresh` request.
- **Atomic Compare-and-Swap**: Rotation uses `Session.findOneAndUpdate({ _id, isRevoked: false }, ...)` to eliminate concurrency race conditions.
- **Theft / Replay Detection**: If an already-rotated or revoked refresh token is presented, the system immediately revokes all active sessions across that `tokenFamilyId` and logs a high-severity security incident (`🚨 Security Incident: Stolen refresh token replay detected!`).
- **Cookie Security**: Set in HTTP-only, `SameSite=Strict`, path-restricted `/api/v1/auth` cookies. Mandatory `secure: true` in production environments.

### 1.3 Password Security & Hashing
- **Algorithm**: `bcryptjs` with cost factor 12.
- **Complexity Requirements**: Minimum 8 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special symbol (`!@#$%^&*()_+-=[]{}|;:,.<>?`).
- **Dictionary & Common Passwords**: Prohibited via Zod validator check.

---

## 2. Authorization & Multi-Tenancy Baseline

### 2.1 Principle of Least Privilege & Deny-by-Default
- Every endpoint requires explicit authentication and authorization unless explicitly annotated with a public route decorator.
- Unauthenticated requests receive `401 AUTHENTICATION_REQUIRED`.
- Requests lacking required permissions or roles receive `403 FORBIDDEN_ACCESS`.

### 2.2 Multi-Tenant Isolation
- **Tenant Context**: Propagated via `tenantMiddleware` using `AsyncLocalStorage` (`runWithTenantContext`).
- **Token vs Header Verification**: If `X-Tenant-ID` is passed in headers, it must match the authenticated token's `tenantId`. Mismatch returns `403 CROSS_TENANT_ACCESS_DENIED`.
- **Database Layer Enforcement**: `@edusphere/database` `tenantPlugin` intercepts all standard Mongoose query operations:
  - `find`, `findOne`, `findOneAndUpdate`, `updateOne`, `updateMany`, `countDocuments`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `findOneAndReplace`.
  - Automatically injects `{ tenantId }` into query filters unless `skipTenantFilter: true` is explicitly passed by super-admin maintenance routines.
- **Immutability Invariant**: Document pre-save and pre-update hooks prohibit altering `tenantId` once created.

### 2.3 School / Campus Scoping (Anti-IDOR)
- **Token Clamping**: Non-super-admin users have their `schoolId` locked from their authenticated session.
- **Query / Body Parameter Validation**: `resolveAuthorizedSchoolId(req)` validates all requests supplying `?schoolId=...` or `{ schoolId: ... }`. If a non-super-admin attempts to query or mutate data belonging to another school, the request is terminated with `403 FORBIDDEN_ACCESS ("Cross-school access prohibited")`.
- **Parent / Student Ward Scoping**: Parents can only access records (attendance, invoices, grades, library, hostel) explicitly associated with their verified children via `studentParentRelationService`.

---

## 3. Network & Transport Security

### 3.1 Security Headers (Helmet)
- **Content-Security-Policy (CSP)**:
  - `default-src: 'self'`
  - `base-uri: 'self'`
  - `font-src: 'self', https:, data:`
  - `frame-ancestors: 'self'`
  - `object-src: 'none'`
  - `script-src: 'self'`
  - `style-src: 'self', 'unsafe-inline'`
- **X-Frame-Options**: `SAMEORIGIN` (prevents clickjacking).
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing).
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload` (enforces TLS 1.3/HTTPS).
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **X-DNS-Prefetch-Control**: `off`.

### 3.2 CORS (Cross-Origin Resource Sharing)
- Hardened dynamic origin validator parses `new URL(origin).hostname`.
- Permits exact matches for configured origins (`CORS_ORIGIN`) and genuine subdomains ending in `.edusphere.io`.
- Rejects lookalike / spoofed origins (such as `https://evil-edusphere.io` or `https://edusphere.io.attacker.com`) without throwing internal 500 errors.

---

## 4. Input Validation & Injection Neutralization

### 4.1 Request Validation
- All controller inputs (query, params, body) are validated via strict Zod schemas before reaching business service layers.
- Unknown properties are stripped or rejected.
- Schema violations return `422 VALIDATION_FAILED` with structured issue paths.

### 4.2 NoSQL Injection & Prototype Pollution Defense
- `mongoSanitizeMiddleware` recursively scans all incoming payloads:
  - Strips any object key starting with `$` (MongoDB query operators).
  - Strips any object key containing `.` (MongoDB path traversal).
  - Strips prototype pollution keys (`__proto__`, `constructor`, `prototype`).

### 4.3 Stored XSS & Template Injection Defense
- `TemplateEngine.render` automatically escapes HTML entities (`&`, `<`, `>`, `"`, `'`) in substituted template variables by default.
- Dangerous URI schemes (`javascript:`, `data:`, `vbscript:`) are sanitized and stripped.

### 4.4 File Attachment & Path Traversal Defense
- File names are sanitized with `isSafeFileName`:
  - Rejects `..`, `/`, `\`, null bytes (`%00`), and leading dots.
  - Blacklists executable file extensions: `.exe`, `.sh`, `.bat`, `.cmd`, `.php`, `.js`, `.py`, `.vbs`, `.dll`, `.jar`, `.msi`, `.bin`, `.scr`, `.com`.
  - Whitelists safe educational documents: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.zip`.
- File URLs validated with `isSafeFileUrl`:
  - Only `http:` and `https:` protocols permitted.
  - `file://`, `data:`, `javascript:`, and internal IP schemes rejected.

---

## 5. Rate Limiting & Resource Consumption Controls

| Limiter Name | Target Routes | Threshold / Window | Protection Objective |
|---|---|---|---|
| **Global API Limiter** | `/api/*` | 1000 req / 15 min | General DoS & brute-force mitigation |
| **Auth Login Limiter** | `/api/v1/auth/login` | 5 attempts / 15 min | Credential stuffing & brute-force protection |
| **Auth Refresh Limiter** | `/api/v1/auth/refresh` | 30 requests / 15 min | Token churning & session hijacking prevention |
| **Password Reset Limiter** | `/api/v1/auth/reset-password` | 3 requests / 60 min | Password reset spam & user account harassment |
| **Email Verification Limiter** | `/api/v1/auth/verify-email` | 5 requests / 15 min | Verification enumeration protection |
| **Global Search Limiter** | `/api/v1/search` | 60 requests / 1 min | Database query starvation & ReDoS prevention |
| **Report Export Limiter** | `/api/v1/reports/exports` | 5 requests / 15 min | Memory exhaustion & heavy PDF/Excel generation DoS |

---

## 6. Error Handling & Information Leakage Defense

- **Unified Envelope**: All API error responses follow the standard `@edusphere/common` response format:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "User-safe error description.",
      "requestId": "req_12345678-abcd-ef01-2345-6789abcdef01"
    }
  }
  ```
- **Mongoose CastError**: Captured and transformed into HTTP 422 `VALIDATION_FAILED` ("Invalid identifier format provided in request."). Raw model names and query paths are omitted.
- **MongoDB E11000 Collision**: Captured and transformed into HTTP 409 `RESOURCE_ALREADY_EXISTS` ("A record with conflicting unique attributes already exists."). Database collection names and index keys are concealed.
- **Production Information Shield**: In `production` and `staging` environments, stack traces and internal debugging objects are never sent to the client.

---

## 7. Audit Trail & Compliance Invariants

- **Immutability Invariant**: `AuditLog` collection is strictly append-only. All update and delete operations (`updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `save` on existing documents) are blocked at the schema layer.
- **PII & Secret Redaction**: `sanitizeAuditData` recursively redacts credentials, secrets, access tokens, refresh tokens, and cookies prior to ledger insertion.
- **Search Isolation**: Audit log entries are completely decoupled and excluded from the federated global search engine.
- **Statutory Retention**: Automated TTL index purges audit logs after 730 days (2 years).
