# Regression Test Inventory & Historical Bug Mapping

## Purpose
This document provides an inventory of historical regressions, critical invariant violations, and edge cases discovered throughout Phases 1–23, along with their automated test safeguards in the test harness.

---

## 1. Authentication & Security Regressions

| Vulnerability / Bug | Root Cause | Automated Test Guard | Assertion / Invariant |
|---------------------|------------|-----------------------|-----------------------|
| Alg: None JWT Bypass | Insecure JWT library configuration | `apps/api/tests/auth.matrix.test.ts` | Token with `alg: none` returns `401 Unauthorized` |
| Weak Symmetric Secret Attack | HMAC acceptance on asymmetric key | `apps/api/tests/auth.matrix.test.ts` | Signature mismatch rejects forgery |
| Session Token Replay | Revocation list omitted on logout | `apps/api/tests/auth.matrix.test.ts` | Blacklisted access token returns `401` |
| Brute Force Lockout Failure | In-memory counter reset on request | `apps/api/tests/auth.matrix.test.ts` | 5 failed attempts trigger exponential cooldown / `429` |
| Privilege Escalation via UserType | UserType payload tampering | `apps/api/tests/rbac.matrix.test.ts` | Role-based permission enforcement strictly from database |

---

## 2. Multi-Tenant Isolation & Anti-IDOR Regressions

| Vulnerability / Bug | Root Cause | Automated Test Guard | Assertion / Invariant |
|---------------------|------------|-----------------------|-----------------------|
| Cross-Tenant IDOR | Missing tenant predicate on query | `apps/api/tests/multitenant.matrix.test.ts` | Tenant B cannot access Tenant A student or user |
| Super-Admin Multi-Tenant Query Leak | Tenant plugin bypass on global queries | `packages/database/tests/tenantIsolation.test.ts` | Strict filter injection unless explicitly scoped |
| Sibling School Data Exposure | Filtering on `tenantId` but omitting `schoolId` | `apps/api/tests/multitenant.matrix.test.ts` | Requests restricted to authenticated `schoolId` context |
| Unrelated Parent Student Access | Missing relationship graph join | `apps/api/tests/student.security.test.ts` | Parent querying non-child student ID returns `403` |

---

## 3. Financial Integrity & Concurrency Regressions

| Vulnerability / Bug | Root Cause | Automated Test Guard | Assertion / Invariant |
|---------------------|------------|-----------------------|-----------------------|
| Floating Point Rounding Drifts | JavaScript standard IEEE 754 float math | `apps/api/tests/financial.integrity.test.ts` | All transactions and line items computed in integer minor units |
| Double Spend / Concurrent Overpayment | Unsynchronized invoice status update | `apps/api/tests/concurrency.matrix.test.ts` | Optimistic concurrency / atomic transactions prevent negative balance |
| Partial Transaction Failure | Payment inserted without updating invoice | `packages/database/tests/transactionAtomicity.test.ts` | Atomic multi-document session aborts all changes on error |
| Over-Refund Exploit | Refund exceeding original payment amount | `apps/api/tests/financial.integrity.test.ts` | Reject refunds where `refundAmount > paidAmount` |

---

## 4. State Machine Transition Regressions

| Vulnerability / Bug | Root Cause | Automated Test Guard | Assertion / Invariant |
|---------------------|------------|-----------------------|-----------------------|
| Retroactive Attendance Tampering | Submitted registers allowing updates | `apps/api/tests/state.machine.test.ts` | `SUBMITTED` attendance locked from direct PUT |
| Paid Invoice Cancellation | Voiding invoice after reconciliation | `apps/api/tests/state.machine.test.ts` | `PAID` invoice transition to `CANCELLED` rejected |
| Re-grading Graded Submissions | Missing teacher role verification | `apps/api/tests/state.machine.test.ts` | Only authorized teachers can modify evaluated scores |
| Double Bed Allocation | Race condition during hostel check-in | `apps/api/tests/concurrency.matrix.test.ts` | `OCCUPIED` bed rejects concurrent allocation |

---

## 5. Storage & Background Queue Regressions

| Vulnerability / Bug | Root Cause | Automated Test Guard | Assertion / Invariant |
|---------------------|------------|-----------------------|-----------------------|
| Malicious Executable Upload | Content-type header spoofing without magic byte check | `apps/api/tests/storage.worker.test.ts` | Reject files failing MIME whitelist or containing executable signatures |
| Storage Path Traversal | Filename with `../` injection | `apps/api/tests/storage.worker.test.ts` | Sanitized random UUID key generation |
| Queue Poison Pill Deadlock | Unhandled job exception crashing worker | `apps/api/tests/storage.worker.test.ts` | Failed jobs route to Dead Letter Queue (DLQ) after retry limit |
