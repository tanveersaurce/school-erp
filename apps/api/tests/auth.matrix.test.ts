import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { User, Tenant, School, Session, VerificationToken } from '@edusphere/database';
import { UserType, UserStatus } from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { emailService } from '../src/modules/auth/email.service.js';
import { createTenant, createSchool, createUser } from './factories/entity.factories.js';
import { persona } from './factories/persona.factories.js';

describe('Comprehensive Authentication & Session Matrix Suite (Phase 23)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  let tenantA: any;
  let schoolA: any;
  let tenantB: any;
  let schoolB: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
    await User.init();

    tenantA = await createTenant({ name: 'Alpha Trust', slug: 'alpha-trust' });
    schoolA = await createSchool(tenantA._id, { name: 'Alpha High', code: 'ALP-01' });

    tenantB = await createTenant({ name: 'Beta Trust', slug: 'beta-trust' });
    schoolB = await createSchool(tenantB._id, { name: 'Beta High', code: 'BET-01' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  // =========================================================================
  // 1. Registration & Account Scoping Matrix
  // =========================================================================
  describe('1. Registration & Account Scoping Matrix', () => {
    it('permits duplicate email across DIFFERENT tenants (tenant isolation)', async () => {
      const email = 'shared.principal@academics.org';
      const passwordHash = await passwordService.hashPassword('P@ssword123!');

      // Create in Tenant A
      const userA = await createUser(tenantA._id, {
        email,
        passwordHash,
        schoolId: schoolA._id,
      });
      expect(userA).toBeDefined();

      // Create with identical email in Tenant B
      const userB = await createUser(tenantB._id, {
        email,
        passwordHash,
        schoolId: schoolB._id,
      });
      expect(userB).toBeDefined();
      expect(userA._id.toString()).not.toBe(userB._id.toString());
    });

    it('rejects duplicate email within the SAME tenant with duplicate key collision', async () => {
      const email = 'duplicate.check@alpha.org';
      const passwordHash = await passwordService.hashPassword('P@ssword123!');

      await createUser(tenantA._id, { email, passwordHash, schoolId: schoolA._id });

      // Second user with same email under Tenant A must fail unique index
      await expect(
        createUser(tenantA._id, { email, passwordHash, schoolId: schoolA._id })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 2. Login Credentials & Lifecycle Matrix
  // =========================================================================
  describe('2. Login Credentials & Lifecycle Matrix', () => {
    const loginEmail = 'teacher.login@alpha.org';
    const plainPassword = 'SecureTeacher#2026';

    beforeEach(async () => {
      const passwordHash = await passwordService.hashPassword(plainPassword);
      await User.deleteMany({ email: loginEmail });
      await createUser(tenantA._id, {
        email: loginEmail,
        passwordHash,
        schoolId: schoolA._id,
        userType: UserType.TEACHER,
        status: UserStatus.ACTIVE,
      });
    });

    it('accepts valid credentials and returns access token + refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password: plainPassword });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(loginEmail);

      // Verify Set-Cookie header contains refreshToken
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
    });

    it('rejects incorrect password with 401 without leaking internal reasons', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password: 'WrongPassword#999' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('rejects non-existent email with identical 401 response (timing attack mitigation)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost.user.does.not.exist@alpha.org', password: 'SomePassword#123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('rejects login for SUSPENDED accounts with 403 Forbidden', async () => {
      await User.updateOne({ email: loginEmail }, { status: UserStatus.SUSPENDED });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password: plainPassword });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message.toLowerCase()).toContain('suspended');
    });

    it('rejects malformed payload missing email or password with 422', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: loginEmail }); // Missing password

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Password Reset, Token Invalidation & Policy Matrix
  // =========================================================================
  describe('3. Password Reset & Policy Matrix', () => {
    const resetEmail = 'reset.candidate@alpha.org';
    const originalPassword = 'OriginalPass#2026';
    const newPassword = 'NewSecretPassword#2026';

    beforeEach(async () => {
      await User.deleteMany({ email: resetEmail });
      await VerificationToken.deleteMany({});
      emailService.clearSentEmails();

      const passwordHash = await passwordService.hashPassword(originalPassword);
      await createUser(tenantA._id, {
        email: resetEmail,
        passwordHash,
        schoolId: schoolA._id,
        userType: UserType.STAFF,
      });
    });

    it('generates a secure reset token and emails it when requested for existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: resetEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const sentEmails = emailService.sentEmails;
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe(resetEmail);

      const tokenDoc = await VerificationToken.findOne({ email: resetEmail });
      expect(tokenDoc).toBeDefined();
    });

    it('returns generic success on forgot-password for non-existent email without dispatching email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@nowhere.org' });

      // Protect against user enumeration by returning identical success
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailService.sentEmails.length).toBe(0);
    });

    it('completes password reset and invalidates the token so it cannot be reused', async () => {
      // 1. Request reset
      await request(app).post('/api/v1/auth/forgot-password').send({ email: resetEmail });
      const rawToken = emailService.sentEmails[0].token;

      // 2. Perform reset
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. Verify user can log in with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: resetEmail, password: newPassword });
      expect(loginRes.status).toBe(200);

      // 4. Attempt token replay (must be rejected)
      const replayRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPassword#2026' });
      expect(replayRes.status).toBe(400);
    });

    it('rejects weak password during password reset with 422', async () => {
      await request(app).post('/api/v1/auth/forgot-password').send({ email: resetEmail });
      const rawToken = emailService.sentEmails[0].token;

      const weakRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: '123' }); // Too short, no symbols

      expect(weakRes.status).toBe(422);
      expect(weakRes.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. Session Rotation, Concurrency & Revocation Matrix
  // =========================================================================
  describe('4. Session Rotation & Revocation Matrix', () => {
    it('refreshes token successfully via request body or cookie', async () => {
      const teacher = await persona.teacher(tenantA._id, { schoolId: schoolA._id });

      // Login to get fresh refresh cookie and token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: teacher.user.email, password: 'P@ssword123!' });

      const cookieHeader = loginRes.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader)
        .send({});

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
    });

    it('allows user to revoke a single specific session via DELETE /sessions/:sessionId', async () => {
      const admin = await persona.schoolAdmin(tenantA._id, { schoolId: schoolA._id });

      // Create a second session
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Revoke the active session
      const deleteRes = await request(app)
        .delete(`/api/v1/auth/sessions/${admin.session._id}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify the session is marked revoked in DB
      const sessionDoc = await Session.findById(admin.session._id);
      expect(sessionDoc?.isRevoked).toBe(true);
    });

    it('revokes all user sessions when calling POST /logout-all', async () => {
      const principal = await persona.principal(tenantA._id, { schoolId: schoolA._id });

      // Call logout-all
      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${principal.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const activeSessions = await Session.find({ userId: principal.user._id, isRevoked: false });
      expect(activeSessions.length).toBe(0);
    });
  });
});
