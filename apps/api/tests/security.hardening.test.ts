import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Session,
} from '@edusphere/database';
import { UserType, UserStatus, TenantStatus, TenantPlan, TenantBillingStatus } from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { tokenService } from '../src/modules/auth/token.service.js';
import { sessionService } from '../src/modules/auth/session.service.js';
import { TemplateEngine } from '../src/modules/communication/services/template-engine.js';
import { isSafeFileName, isSafeFileUrl } from '../src/core/security/fileSecurity.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { env } from '../src/config/env.js';

describe('Phase 22: Security Hardening & Penetration Testing Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();

  let adminToken1: string;
  let adminUser1Id: string;
  let adminSession1Id: string;

  let tenant2UserToken: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Tenants & Schools
    await Tenant.create({
      _id: tenant1Id,
      name: 'Security Shield Trust',
      slug: 'security-shield',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });
    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Shield Academy 1',
      code: 'SHIELD-1',
      affiliationBoard: 'CBSE',
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Isolated Organization',
      slug: 'isolated-org',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });
    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Isolated School',
      code: 'ISO-2',
      affiliationBoard: 'ICSE',
    });

    // 2. Roles & Permissions
    const perm1 = await Permission.create({
      _id: new Types.ObjectId(),
      resource: 'student',
      action: 'read',
      permissionString: 'student:read',
      description: 'View students',
      category: 'Academics',
    });
    const perm2 = await Permission.create({
      _id: new Types.ObjectId(),
      resource: 'audit',
      action: 'read',
      permissionString: 'audit:read',
      description: 'View audit logs',
      category: 'System',
    });
    const perm3 = await Permission.create({
      _id: new Types.ObjectId(),
      resource: 'fee_category',
      action: 'read',
      permissionString: 'fee_category:read',
      description: 'View fee categories',
      category: 'Finance',
    });

    const role1 = await Role.create({
      _id: new Types.ObjectId(),
      tenantId: tenant1Id,
      name: 'SCHOOL_ADMIN',
      code: 'SCHOOL_ADMIN',
      isSystemRole: true,
    });

    await RolePermission.create({
      tenantId: tenant1Id,
      roleId: role1._id,
      permissionId: perm1._id,
    });
    await RolePermission.create({
      tenantId: tenant1Id,
      roleId: role1._id,
      permissionId: perm2._id,
    });
    await RolePermission.create({
      tenantId: tenant1Id,
      roleId: role1._id,
      permissionId: perm3._id,
    });

    // 3. User 1
    const passwordHash = await passwordService.hashPassword('P@ssword123!');
    const user1 = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'admin1@shield.edu',
      passwordHash,
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
    });
    adminUser1Id = user1._id.toString();

    await UserRole.create({
      tenantId: tenant1Id,
      userId: user1._id,
      roleId: role1._id,
    });

    const sessionRes1 = await sessionService.createSession({
      userId: user1._id,
      tenantId: tenant1Id,
      deviceName: 'Secure Test Runner',
    });
    adminSession1Id = sessionRes1.session._id.toString();

    adminToken1 = tokenService.generateAccessToken({
      sub: adminUser1Id,
      userId: adminUser1Id,
      tenantId: tenant1Id.toString(),
      schoolId: school1Id.toString(),
      userType: UserType.SCHOOL_ADMIN,
      sessionId: adminSession1Id,
      roles: ['SCHOOL_ADMIN'],
      permissions: ['student:read', 'audit:read', 'fee_category:read'],
    });

    // User 2 (Tenant 2)
    const user2 = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenant2Id,
      schoolId: school2Id,
      email: 'admin2@isolated.edu',
      passwordHash,
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
    });

    const sessionRes2 = await sessionService.createSession({
      userId: user2._id,
      tenantId: tenant2Id,
      deviceName: 'Isolated Test Runner',
    });

    tenant2UserToken = tokenService.generateAccessToken({
      sub: user2._id.toString(),
      userId: user2._id.toString(),
      tenantId: tenant2Id.toString(),
      schoolId: school2Id.toString(),
      userType: UserType.SCHOOL_ADMIN,
      sessionId: sessionRes2.session._id.toString(),
      roles: ['SCHOOL_ADMIN'],
      permissions: ['student:read'],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // ===========================================================================
  // 1. NoSQL Injection & Prototype Pollution Sanitization Tests
  // ===========================================================================
  describe('1. NoSQL Injection & Prototype Pollution Defense', () => {
    it('should strip MongoDB operator keys ($gt, $ne, $where) from request body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $gt: '' },
          password: 'P@ssword123!',
        });

      // Because mongoSanitize strips $gt, email is received as empty object {}, failing validation cleanly with 422
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should strip prototype pollution keys (__proto__, constructor) from request payload', async () => {
      const payload = JSON.parse('{"__proto__": {"polluted": true}, "email": "test@test.com", "password": "pass"}');
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(payload);

      expect((({} as any).polluted)).toBeUndefined();
      expect(res.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 2. CORS & Security Headers Hardening Tests
  // ===========================================================================
  describe('2. CORS & Security Headers Verification', () => {
    it('should return strict security headers on API responses', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'self'");
    });

    it('should allow genuine tenant subdomains of edusphere.io in CORS', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://school.edusphere.io');

      expect(res.headers['access-control-allow-origin']).toBe('https://school.edusphere.io');
    });

    it('should reject spoofed domains (evil-edusphere.io) in CORS without crashing', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://evil-edusphere.io');

      // Access-Control-Allow-Origin header must NOT be set for malicious origin
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.status).toBe(200);
    });

    it('should reject untrusted third-party origins in CORS', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://untrusted-attacker.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  // ===========================================================================
  // 3. JWT Algorithm Pinning & Token Security Tests
  // ===========================================================================
  describe('3. JWT Token Hardening & Algorithm Pinning', () => {
    it('should reject access tokens forged with alg: none', async () => {
      // Craft an unverified token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: adminUser1Id,
          userId: adminUser1Id,
          tenantId: tenant1Id.toString(),
          sessionId: adminSession1Id,
        })
      ).toString('base64url');
      const forgedToken = `${header}.${payload}.`;

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid or corrupted authentication token.');
    });

    it('should reject tokens signed with a different HMAC secret', async () => {
      const foreignToken = jwt.sign(
        {
          sub: adminUser1Id,
          userId: adminUser1Id,
          tenantId: tenant1Id.toString(),
          sessionId: adminSession1Id,
        },
        'wrong_crypto_secret_key_that_does_not_match_32chars',
        { algorithm: 'HS256', expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid or corrupted authentication token.');
    });

    it('should reject tokens missing mandatory claims (e.g. missing sessionId)', async () => {
      const missingClaimToken = jwt.sign(
        {
          sub: adminUser1Id,
          userId: adminUser1Id,
          tenantId: tenant1Id.toString(),
          // sessionId omitted intentionally
        },
        env.JWT_ACCESS_SECRET,
        { algorithm: 'HS256', issuer: 'edusphere-erp', audience: 'edusphere-api', expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${missingClaimToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Token payload missing mandatory claims.');
    });
  });

  // ===========================================================================
  // 4. Atomic Refresh Token Rotation & Race Condition Protection Tests
  // ===========================================================================
  describe('4. Session & Refresh Token Rotation Concurrency', () => {
    it('should detect token replay and revoke token family immediately', async () => {
      // 1. Create a fresh session
      const { session, rawRefreshToken } = await sessionService.createSession({
        userId: adminUser1Id,
        tenantId: tenant1Id,
        deviceName: 'Replay Test Device',
      });

      // 2. Perform legitimate first rotation
      const rotated = await sessionService.rotateSession(rawRefreshToken, {
        deviceName: 'Replay Test Device',
      });
      expect(rotated.rawRefreshToken).toBeDefined();

      // 3. Attempt replay using the OLD (already consumed) refresh token
      await expect(
        sessionService.rotateSession(rawRefreshToken, { deviceName: 'Adversary Device' })
      ).rejects.toThrow('Invalid or expired refresh token');

      // 4. Verify that the NEW session in the same family was also revoked due to breach detection
      const familySessions = await Session.find({ tokenFamilyId: session.tokenFamilyId });
      for (const s of familySessions) {
        expect(s.isRevoked).toBe(true);
      }
    });
  });

  // ===========================================================================
  // 5. Tenant & School Scoping / Anti-IDOR Tests
  // ===========================================================================
  describe('5. Tenant & School Anti-IDOR Scoping', () => {
    it('should prohibit cross-tenant access when token tenant does not match header tenant', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-ID', tenant2Id.toString());

      // TenantMismatchError returns 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prohibit non-super-admin from escaping school boundary via query parameters', async () => {
      // Attempting to query finance categories for school2Id using a school1Id token
      const res = await request(app)
        .get(`/api/v1/finance/categories?schoolId=${school2Id.toString()}`)
        .set('Authorization', `Bearer ${adminToken1}`);

      // resolveAuthorizedSchoolId rejects cross-school parameter with 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Cross-school access prohibited');
    });
  });

  // ===========================================================================
  // 6. File Attachment Security & Path Traversal Prevention Tests
  // ===========================================================================
  describe('6. File Upload & Attachment Security', () => {
    it('should reject filenames containing path traversal sequences', () => {
      expect(isSafeFileName('../../etc/passwd.pdf')).toBe(false);
      expect(isSafeFileName('..\\windows\\system32\\cmd.exe')).toBe(false);
      expect(isSafeFileName('report%00.pdf')).toBe(false);
      expect(isSafeFileName('normal_homework.pdf')).toBe(true);
      expect(isSafeFileName('student_notes.docx')).toBe(true);
    });

    it('should reject dangerous script and executable extensions', () => {
      expect(isSafeFileName('malicious.exe')).toBe(false);
      expect(isSafeFileName('shell.sh')).toBe(false);
      expect(isSafeFileName('backdoor.php')).toBe(false);
      expect(isSafeFileName('script.js')).toBe(false);
      expect(isSafeFileName('script.py')).toBe(false);
      expect(isSafeFileName('trojan.bat')).toBe(false);
      expect(isSafeFileName('payload.vbs')).toBe(false);
      expect(isSafeFileName('assignment.zip')).toBe(true);
      expect(isSafeFileName('exam_sheet.xlsx')).toBe(true);
    });

    it('should reject unsafe URL schemes in file attachment paths', () => {
      expect(isSafeFileUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeFileUrl('file:///etc/shadow')).toBe(false);
      expect(isSafeFileUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeFileUrl('https://storage.edusphere.io/assignments/doc1.pdf')).toBe(true);
      expect(isSafeFileUrl('http://cdn.edusphere.io/photos/pic.jpg')).toBe(true);
    });
  });

  // ===========================================================================
  // 7. Error Handling & Information Disclosure Tests
  // ===========================================================================
  describe('7. Error Handling & Information Leakage Prevention', () => {
    it('should handle invalid ObjectId CastError safely as 422 without leaking database internals', () => {
      const castError = new mongoose.Error.CastError('ObjectId', 'not-a-valid-mongo-object-id', '_id');
      let capturedStatus = 0;
      let capturedBody: any = null;
      const mockReq = { id: 'req_test_cast', originalUrl: '/api/v1/test', method: 'GET' } as any;
      const mockRes = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(body: any) {
          capturedBody = body;
          return this;
        },
      } as any;
      const mockNext = () => {};

      errorHandler(castError, mockReq, mockRes, mockNext);

      expect(capturedStatus).toBe(422);
      expect(capturedBody.success).toBe(false);
      expect(capturedBody.error.code).toBe('VALIDATION_FAILED');
      expect(capturedBody.error.message).toBe('Invalid identifier format provided in request.');
      expect(capturedBody.stack).toBeUndefined();
      expect(capturedBody.error.details).toBeUndefined();
    });

    it('should handle MongoDB duplicate key collision (E11000) safely as 409 without leaking schema internals', () => {
      const dupError: any = new Error('E11000 duplicate key error collection: edusphere.users index: email_1 dup key');
      dupError.code = 11000;
      let capturedStatus = 0;
      let capturedBody: any = null;
      const mockReq = { id: 'req_test_dup', originalUrl: '/api/v1/auth/register', method: 'POST' } as any;
      const mockRes = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(body: any) {
          capturedBody = body;
          return this;
        },
      } as any;
      const mockNext = () => {};

      errorHandler(dupError, mockReq, mockRes, mockNext);

      expect(capturedStatus).toBe(409);
      expect(capturedBody.success).toBe(false);
      expect(capturedBody.error.code).toBe('RESOURCE_ALREADY_EXISTS');
      expect(capturedBody.error.message).toBe('A record with conflicting unique attributes already exists.');
      expect(capturedBody.stack).toBeUndefined();
    });
  });

  // ===========================================================================
  // 8. Stored XSS Neutralization in Communication Templates
  // ===========================================================================
  describe('8. Template Sanitization & Stored XSS Prevention', () => {
    it('should automatically escape HTML tags and malicious scripts in template substitution', () => {
      const template = 'Dear {{guardianName}}, welcome to {{schoolName}}!';
      const maliciousPayload = {
        guardianName: '<script>alert("XSS")</script>John',
        schoolName: 'Greenwood <img src="x" onerror="stealCookies()"/>',
      };

      const rendered = TemplateEngine.render(template, maliciousPayload);

      expect(rendered).not.toContain('<script>');
      expect(rendered).toContain('&lt;script&gt;');
      expect(rendered).not.toContain('<img');
      expect(rendered).toContain('&lt;img');
    });

    it('should strip javascript: pseudo-protocols from sanitized text', () => {
      const malicious = 'Click here: javascript:alert(document.cookie)';
      const sanitized = TemplateEngine.sanitize(malicious);

      expect(sanitized.toLowerCase()).not.toContain('javascript:');
    });
  });
});
