# EduSphere ERP — Institutional Threat Model

**Document Classification**: Confidential — Security Architecture & Threat Analysis  
**Framework**: STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) + OWASP Top 10 (2021/API 2023)  
**Target Application**: EduSphere School Management System / School ERP  
**Version**: 1.0.0 (Phase 22 Security Baseline)  
**Last Updated**: September 22, 2026  

---

## 1. Executive Summary & Security Objectives

EduSphere ERP is a multi-tenant, multi-school educational enterprise resource planning platform managing sensitive student records, parental contact information, financial transactions, staff payroll, examinations, and institutional communication.

The primary security objectives of EduSphere ERP are:
1. **Absolute Multi-Tenant Isolation**: Ensure complete physical and logical partition between tenant organizations and schools, with zero cross-tenant data leakage or cross-school unauthorized mutation.
2. **Defensive API Architecture**: Eliminate OWASP API Top 10 vulnerabilities, particularly Broken Object Level Authorization (BOLA/IDOR), Broken Authentication, Mass Assignment, and Unrestricted Resource Consumption.
3. **Defense-in-Depth Injection Resistance**: Defend against NoSQL injection, prototype pollution, cross-site scripting (XSS), and path traversal across all ingestion boundaries.
4. **Resilient Session & Cryptographic Integrity**: Enforce algorithm pinning, cryptographically secure refresh token rotation with theft detection, and production secret hardening.
5. **Zero Schema & Stack Trace Disclosure**: Neutralize error leakage to ensure external clients never receive internal database engine errors, stack traces, or schema definitions.

---

## 2. Architecture Threat Surface

```
[ External Adversary / Web Client / Mobile App ]
                     │
                     ▼ (TLS 1.3 / HTTPS)
        [ Cloudflare / Reverse Proxy ]
                     │ (HSTS, Anti-DDoS)
                     ▼
      [ Express API Gateway (Port 4000) ]
        ├─ Security Headers (Helmet CSP, X-Frame-Options SAMEORIGIN, Nosniff)
        ├─ Hardened CORS Origin Validator (.edusphere.io suffix verification)
        ├─ Tiered IP & User Rate Limiters (Global, Auth, Refresh, Reset, Search, Export)
        ├─ Body Parsing + Recursive NoSQL & Prototype Pollution Sanitization
        ├─ JWT Authentication & Algorithm Pinning (HS256, edusphere-erp issuer)
        ├─ Session Validator & Atomic Token Family Rotation
        ├─ Tenant & School Anti-IDOR Authorization Clamping
        ├─ Zod Schema Request Validation & File Security Guards
        ├─ Granular RBAC Permission Gate (Deny-by-Default)
        ├─ Domain Controllers & Services (Decimal128 Currency, Immutable Audit Logs)
        └─ Global Error Shield (Mongoose CastError 422, E11000 409, Production Stack Redaction)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 [ MongoDB Replica Set ]    [ Redis Cluster ]
  - TenantPlugin Query Hooks - Token Family Blacklist
  - Field-Level Encryption   - Distributed Rate Limit Counters
  - Role-Based DB Users      - Transient Cache
```

---

## 3. Comprehensive STRIDE Threat Analysis Matrix (36 Threat Vectors)

| ID | Threat Vector | Category | OWASP | Mitigation Architecture | Verification Test |
|---|---|---|---|---|---|
| **TV-01** | JWT Algorithm Confusion (`alg: none`) | Spoofing | API2:2023 | Enforced `algorithms: ['HS256']` pinning in JWT verification. Tokens with `none`, `RS256`, or missing headers are rejected with 401. | `security.hardening.test.ts` (Test 3.1) |
| **TV-02** | JWT Secret Brute Force / Default Secret | Spoofing | A02:2021 | Production env validation rejects default placeholder keys (`change-me-in-production`). Requires >= 32 high-entropy bytes. | `env.test.ts` |
| **TV-03** | Missing Token Claims Forgery | Spoofing | API2:2023 | Mandatory claims verification enforces presence of `userId`, `tenantId`, and `sessionId`. Tokens missing any claim are rejected with 401. | `security.hardening.test.ts` (Test 3.3) |
| **TV-04** | Stolen Refresh Token Replay | Spoofing | API2:2023 | One-time refresh token rotation with token family tracking. Replaying an old token immediately revokes all family sessions and logs security alert. | `security.hardening.test.ts` (Test 4.1) |
| **TV-05** | Refresh Token Rotation Race Condition | Tampering | API2:2023 | Atomic MongoDB compare-and-swap (`Session.findOneAndUpdate({ _id, isRevoked: false })`) prevents concurrent token reuse races. | `security.hardening.test.ts` (Test 4.1) |
| **TV-06** | Session Hijacking via Stolen Cookie | Spoofing | A07:2021 | Cookies configured with `HttpOnly`, `SameSite=Strict`, and mandatory `Secure` flag in production environments. | `env.ts` & `auth.controller.ts` |
| **TV-07** | Credential Stuffing & Password Spraying | Spoofing | A07:2021 | Auth endpoints protected by IP + account rate limiters, bcrypt cost 12 hashing, and progressive delay policies. | `authRateLimiter.ts` |
| **TV-08** | Unauthorized Password Reset Takeover | Elevation | API2:2023 | Single-use crypto-secure reset tokens stored with SHA-256 hash and strict 1-hour expiration; dedicated reset rate limiter. | `authRateLimiter.ts` |
| **TV-09** | Email Verification Enumeration / Bypass | Info Disc | API2:2023 | Constant-time comparison on verification tokens and dedicated rate limiter on `/verify-email`. | `authRateLimiter.ts` |
| **TV-10** | Tenant Boundary Escalation (Header Spoofing) | Elevation | API1:2023 | Cross-tenant verification ensures `token.tenantId === request.tenantId`. Mismatch returns `403 CROSS_TENANT_ACCESS_DENIED`. | `security.hardening.test.ts` (Test 5.1) |
| **TV-11** | Cross-Tenant Database Leakage | Info Disc | API1:2023 | `tenantPlugin` intercepts 10 Mongoose query methods (`find`, `findOne`, `updateOne`, `deleteMany`, etc.) injecting tenant scope automatically. | `database/tenantIsolation.test.ts` |
| **TV-12** | Cross-Tenant Entity ID Modification | Tampering | API1:2023 | Pre-save and pre-update Mongoose hooks enforce `tenantId` immutability once created. Any attempted change throws invariant error. | `database/tenantIsolation.test.ts` |
| **TV-13** | School Boundary Escaping (Campus IDOR) | Elevation | API1:2023 | `resolveAuthorizedSchoolId(req)` verifies non-super-admins cannot query or mutate records belonging to different schools via query or body. | `security.hardening.test.ts` (Test 5.2) |
| **TV-14** | Parent/Guardian Ward BOLA (IDOR) | Info Disc | API1:2023 | Guardians can only access records (attendance, grades, finance, hostel, library) belonging to their explicitly linked wards. | `finance.security.test.ts` & `library.security.test.ts` |
| **TV-15** | Student Self-Grading / Results Manipulation | Tampering | API5:2023 | Results calculation and mark entry strictly restricted to assigned teachers and academic administrators; students have read-only access to published marks. | `exam.security.test.ts` |
| **TV-16** | Horizontal Privilege Escalation via Role Swap | Elevation | API5:2023 | Role assignment endpoints require `rbac:manage` or `role:assign_permission` and prohibit assigning roles above user's own hierarchy. | `authorization.security.test.ts` |
| **TV-17** | NoSQL Injection via Operator Injection | Tampering | A03:2021 | Recursive `mongoSanitizeMiddleware` recursively strips keys beginning with `$` or containing `.` from `req.body`, `req.query`, and `req.params`. | `security.hardening.test.ts` (Test 1.1) |
| **TV-18** | Prototype Pollution via JSON Payload | Tampering | A03:2021 | Sanitization middleware recursively detects and strips `__proto__`, `constructor`, and `prototype` keys before body reaches handlers. | `security.hardening.test.ts` (Test 1.2) |
| **TV-19** | Stored XSS in Notification Templates | Tampering | A03:2021 | `TemplateEngine.render` automatically escapes HTML characters (`<`, `>`, `&`, `"`, `'`) in substituted variables by default. | `security.hardening.test.ts` (Test 8.1) |
| **TV-20** | JavaScript Pseudo-Protocol Injection | Tampering | A03:2021 | `TemplateEngine.sanitize` and `isSafeFileUrl` strip and reject `javascript:`, `vbscript:`, and `data:` schemes. | `security.hardening.test.ts` (Test 8.2) |
| **TV-21** | Path Traversal in File Attachment Uploads | Tampering | A01:2021 | `isSafeFileName` rejects directory traversal sequences (`..`, `/`, `\`), null bytes (`%00`), and absolute paths. | `security.hardening.test.ts` (Test 6.1) |
| **TV-22** | Dangerous Executable File Execution | Tampering | A01:2021 | Extension blacklist strictly prohibits `.exe`, `.sh`, `.bat`, `.cmd`, `.php`, `.js`, `.py`, `.vbs`, `.dll`, `.jar`. | `security.hardening.test.ts` (Test 6.2) |
| **TV-23** | SSRF via File Attachment URLs | Tampering | A10:2021 | File URLs restricted strictly to `http` and `https` schemes; internal IP ranges and `file://` schemes blocked. | `security.hardening.test.ts` (Test 6.3) |
| **TV-24** | Regex Denial of Service (ReDoS) | DoS | A05:2021 | User-supplied search queries are escaped using `escapeRegex` and capped at length limits before regex compilation. | `global.search.test.ts` |
| **TV-25** | Unrestricted Global Search Resource Exhaustion | DoS | API4:2023 | Dedicated `searchRateLimiter` restricts rapid queries; minimum query length enforced; per-domain match limits applied. | `security.hardening.test.ts` |
| **TV-26** | Heavy Report Export Resource Starvation | DoS | API4:2023 | Dedicated `exportRateLimiter` (5 exports/15m) caps async export generation; jobs processed asynchronously with TTL cleanup. | `reports.execution.test.ts` |
| **TV-27** | Clickjacking / UI Redressing | Tampering | A05:2021 | Helmet configured with `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'`. | `security.hardening.test.ts` (Test 2.1) |
| **TV-28** | MIME Sniffing Vulnerabilities | Tampering | A05:2021 | Response header `X-Content-Type-Options: nosniff` unconditionally enforced across all API responses. | `security.hardening.test.ts` (Test 2.1) |
| **TV-29** | Insecure Transport Protocol Downgrade | Spoofing | A02:2021 | `Strict-Transport-Security` (HSTS) header configured with `max-age=31536000; includeSubDomains; preload`. | `security.hardening.test.ts` (Test 2.1) |
| **TV-30** | Permissive CORS Domain Matching | Info Disc | A05:2021 | CORS origin matching checks exact hostname or genuine `.edusphere.io` subdomain; prevents prefix/suffix attacks (`evil-edusphere.io`). | `security.hardening.test.ts` (Tests 2.2, 2.3) |
| **TV-31** | Database Schema / CastError Disclosure | Info Disc | A05:2021 | Global error handler intercepts Mongoose `CastError` returning sanitized 422 `VALIDATION_FAILED` without query internals. | `security.hardening.test.ts` (Test 7.1) |
| **TV-32** | Duplicate Index Collision (E11000) Leakage | Info Disc | A05:2021 | Global error handler intercepts Mongo `11000` errors returning generic 409 `RESOURCE_ALREADY_EXISTS` concealing schema indexes. | `security.hardening.test.ts` (Test 7.2) |
| **TV-33** | Stack Trace Disclosure in Production | Info Disc | A05:2021 | Error response envelope suppresses `error.stack` and internal debug details in `production` and `staging` environments. | `security.hardening.test.ts` & `errorHandler.ts` |
| **TV-34** | Compliance Audit Trail Mutation / Tampering | Repudiation | A09:2021 | Mongoose pre-hooks block all update and delete methods on `AuditLog`; ledger is strictly append-only with 2-year retention. | `auditInvariants.test.ts` |
| **TV-35** | Sensitive PII / Secret Leakage in Audit Logs | Info Disc | A09:2021 | `sanitizeAuditData` recursively strips passwords, tokens, API keys, cookies, and secrets prior to audit persistence. | `audit.trail.test.ts` (Test 9) |
| **TV-36** | Mass Assignment of Administrative Attributes | Elevation | API3:2023 | Controllers employ strict Zod input schemas; `tenantId`, `roles`, `isSuperAdmin`, and billing fields omitted from client payloads. | Monorepo Zod Schemas |

---

## 4. Threat Verification & Regression Safeguards

All 36 threat vectors identified in this model are verified by dedicated automated tests within `@edusphere/database` and `@edusphere/api`:
- **`packages/database/tests/`**: Invariants for multi-tenancy, soft deletion, unique constraints, and audit log immutability.
- **`apps/api/tests/security.hardening.test.ts`**: 19 automated penetration tests verifying algorithm pinning, NoSQL sanitization, prototype pollution, CORS spoofing rejection, token family breach detection, and school anti-IDOR.
- **`apps/api/tests/`**: Specialized security suites for Authorization, Attendance, Finance, Examinations, Hostel, Library, and Transport.
