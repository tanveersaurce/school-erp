import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { User, Tenant, School, Session, VerificationToken } from '@edusphere/database';
import { UserType, UserStatus } from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { emailService } from '../src/modules/auth/email.service.js';

describe('Production Authentication & Session Management Suite (Phase 3)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const testTenantId = new Types.ObjectId('6a9fe236182646807d86ab27');
  const testSchoolId = new Types.ObjectId('6a9fe237182646807d86ab92');

  const validEmail = 'admin@greenwood.edu';
  const validPassword = 'SecureAdmin#2026';
  let seededUserId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Create Tenant and School records
    await Tenant.create({
      _id: testTenantId,
      name: 'Greenwood Educational Trust',
      slug: 'greenwood',
      status: 'ACTIVE',
      subscriptionTier: 'ENTERPRISE',
    });

    await School.create({
      _id: testSchoolId,
      tenantId: testTenantId,
      name: 'Greenwood High International School',
      code: 'GWH-01',
      affiliationBoard: 'CBSE',
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    // Clear user, session, and token collections
    await User.deleteMany({});
    await Session.deleteMany({});
    await VerificationToken.deleteMany({});
    emailService.clearSentEmails();

    // Seed primary test user
    const passwordHash = await passwordService.hashPassword(validPassword);
    const user = await User.create({
      tenantId: testTenantId,
      schoolId: testSchoolId,
      email: validEmail,
      passwordHash,
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      failedLoginAttempts: 0,
    });
    seededUserId = user._id.toString();
  });

  describe('1. POST /api/v1/auth/login - Authentication & Brute Force Defense', () => {
    it('successfully authenticates with valid credentials, sets HttpOnly refresh cookie, and returns access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword })
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.tokenType).toBe('Bearer');
      expect(res.body.data.user.email).toBe(validEmail);
      expect(res.body.data.user.userType).toBe(UserType.SCHOOL_ADMIN);
      expect(res.body.data.session.isCurrent).toBe(true);

      // Verify HttpOnly cookie header
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');

      // Verify Session record in database has hashed token, not raw token
      const session = await Session.findById(res.body.data.session.id);
      expect(session).toBeDefined();
      expect(session!.refreshTokenHash).toBeDefined();
      expect(session!.isRevoked).toBe(false);
    });

    it('rejects invalid password with 401 and generic anti-enumeration error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: 'WrongPassword#999' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');

      // Check failed attempts incremented in DB
      const user = await User.findById(seededUserId);
      expect(user!.failedLoginAttempts).toBe(1);
    });

    it('rejects unknown email with identical 401 and anti-enumeration message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: validPassword });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('locks account after 5 consecutive failed attempts and rejects subsequent attempts with lockout notice', async () => {
      // 5 failed attempts
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: validEmail, password: `WrongPassword#${i}` });
        expect(res.status).toBe(401);
      }

      // Verify user document has lockout timestamp
      const lockedUser = await User.findById(seededUserId);
      expect(lockedUser!.failedLoginAttempts).toBe(5);
      expect(lockedUser!.lockoutUntil).toBeDefined();
      expect(lockedUser!.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());

      // 6th attempt even with correct password is locked out
      const sixthRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      expect(sixthRes.status).toBe(401);
      expect(sixthRes.body.error.message).toContain('Account is temporarily locked');
    });

    it('rejects login for SUSPENDED accounts', async () => {
      await User.findByIdAndUpdate(seededUserId, { status: UserStatus.SUSPENDED });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('suspended');
    });

    it('rejects login for PENDING_VERIFICATION accounts', async () => {
      await User.findByIdAndUpdate(seededUserId, { status: UserStatus.PENDING_VERIFICATION });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('verify your email');
    });
  });

  describe('2. POST /api/v1/auth/refresh - Token Rotation & Replay Attack Defense', () => {
    it('rotates refresh token and returns new access token and new refresh cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie!);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
      const newRefreshCookie = newCookies.find((c) => c.startsWith('refreshToken='));
      expect(newRefreshCookie).toBeDefined();
      expect(newRefreshCookie).not.toEqual(refreshCookie);
    });

    it('detects stolen token replay: reusing a rotated refresh token immediately revokes the entire token family', async () => {
      // 1. Initial Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const initialRefreshCookie = cookies.find((c) => c.startsWith('refreshToken='))!;

      // 2. Legitimate Client refreshes token (initial token is now consumed & rotated)
      const legitimateRefreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialRefreshCookie);
      expect(legitimateRefreshRes.status).toBe(200);

      const updatedCookies = legitimateRefreshRes.headers['set-cookie'] as unknown as string[];
      const latestRefreshCookie = updatedCookies.find((c) => c.startsWith('refreshToken='))!;

      // 3. Attacker presents the initial (already rotated) token -> Token Replay Detected!
      const replayAttackRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialRefreshCookie);

      expect(replayAttackRes.status).toBe(401);
      expect(replayAttackRes.body.error.message).toContain('Invalid or expired refresh token');

      // 4. Verify that ALL sessions in that token family are now revoked
      const allFamilySessions = await Session.find({ userId: seededUserId });
      expect(allFamilySessions.length).toBeGreaterThan(0);
      for (const s of allFamilySessions) {
        expect(s.isRevoked).toBe(true);
      }

      // 5. Legitimate client tries to use their latest token and is also rejected (forced re-login)
      const subsequentRefreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', latestRefreshCookie);

      expect(subsequentRefreshRes.status).toBe(401);
    });
  });

  describe('3. POST /api/v1/auth/logout & /logout-all', () => {
    it('logout revokes current session and clears refresh cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const token = loginRes.body.data.accessToken;
      const sessionId = loginRes.body.data.session.id;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);

      // Verify session is revoked
      const session = await Session.findById(sessionId);
      expect(session!.isRevoked).toBe(true);

      // Subsequent access with this token is rejected
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(401);
    });

    it('logout-all revokes all sessions across all devices for the user', async () => {
      // Create session 1
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      // Create session 2
      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      expect(login1.body.data.session.id).not.toBe(login2.body.data.session.id);

      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${login2.body.data.accessToken}`);

      expect(logoutAllRes.status).toBe(200);

      // Verify both sessions are revoked
      const s1 = await Session.findById(login1.body.data.session.id);
      const s2 = await Session.findById(login2.body.data.session.id);
      expect(s1!.isRevoked).toBe(true);
      expect(s2!.isRevoked).toBe(true);
    });
  });

  describe('4. GET /api/v1/auth/me & GET /sessions', () => {
    it('returns authenticated user profile and active session list', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const token = loginRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(validEmail);

      const sessionsRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(sessionsRes.status).toBe(200);
      expect(sessionsRes.body.data.length).toBe(1);
      expect(sessionsRes.body.data[0].isCurrent).toBe(true);
    });

    it('allows revoking a specific remote session', async () => {
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const deleteRes = await request(app)
        .delete(`/api/v1/auth/sessions/${login1.body.data.session.id}`)
        .set('Authorization', `Bearer ${login2.body.data.accessToken}`);

      expect(deleteRes.status).toBe(200);

      const s1 = await Session.findById(login1.body.data.session.id);
      const s2 = await Session.findById(login2.body.data.session.id);
      expect(s1!.isRevoked).toBe(true);
      expect(s2!.isRevoked).toBe(false);
    });
  });

  describe('5. Password Management & Password Reset Flow', () => {
    it('POST /change-password successfully changes password and revokes other sessions', async () => {
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: validPassword });

      const newPassword = 'NewSecretPassword#2026';
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${login2.body.data.accessToken}`)
        .send({
          currentPassword: validPassword,
          newPassword,
        });

      expect(changeRes.status).toBe(200);

      // Session 1 revoked, session 2 still active
      const s1 = await Session.findById(login1.body.data.session.id);
      const s2 = await Session.findById(login2.body.data.session.id);
      expect(s1!.isRevoked).toBe(true);
      expect(s2!.isRevoked).toBe(false);

      // Can login with new password
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: newPassword });
      expect(newLogin.status).toBe(200);
    });

    it('forgot-password sends single-use token and reset-password completes with session invalidation', async () => {
      // 1. Request password reset
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: validEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.message).toContain('If an account with that email exists');

      // 2. Inspect sent email from DevEmailProvider
      const sentEmail = emailService.getLastSentEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.to).toBe(validEmail);
      expect(sentEmail!.token).toBeDefined();

      const resetToken = sentEmail!.token;
      const resetPassword = 'ResetPassword#2026';

      // 3. Reset password using token
      const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword: resetPassword,
      });

      expect(resetRes.status).toBe(200);

      // 4. Token cannot be reused
      const reuseRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword: 'AnotherPassword#2026',
      });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.message).toContain('Invalid or expired');

      // 5. User can log in with new reset password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validEmail, password: resetPassword });

      expect(loginRes.status).toBe(200);
    });
  });

  describe('6. Email Verification Flow', () => {
    it('verifies email and activates user account', async () => {
      const pendingEmail = 'teacher@greenwood.edu';
      const passwordHash = await passwordService.hashPassword(validPassword);
      const pendingUser = await User.create({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        email: pendingEmail,
        passwordHash,
        userType: UserType.TEACHER,
        status: UserStatus.PENDING_VERIFICATION,
      });

      // Request verification token
      await request(app).post('/api/v1/auth/resend-verification').send({ email: pendingEmail });

      const email = emailService.getLastSentEmail();
      expect(email).toBeDefined();
      expect(email!.to).toBe(pendingEmail);

      // Verify email with token
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: email!.token });

      expect(verifyRes.status).toBe(200);

      // Verify user is now active
      const updatedUser = await User.findById(pendingUser._id);
      expect(updatedUser!.status).toBe(UserStatus.ACTIVE);
    });
  });
});
