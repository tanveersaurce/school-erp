import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { createTenant, createSchool } from './factories/entity.factories.js';
import { persona } from './factories/persona.factories.js';

describe('Comprehensive RBAC & Authorization Matrix Suite (Phase 23)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  let tenant: any;
  let school: any;

  let superAdmin: any;
  let schoolAdmin: any;
  let teacher: any;
  let student: any;
  let parent: any;
  let unprivilegedStaff: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    tenant = await createTenant({ name: 'RBAC Primary Trust', slug: 'rbac-trust' });
    school = await createSchool(tenant._id, { name: 'RBAC Academy', code: 'RBAC-01' });

    superAdmin = await persona.superAdmin(tenant._id, { schoolId: school._id });
    schoolAdmin = await persona.schoolAdmin(tenant._id, { schoolId: school._id });
    teacher = await persona.teacher(tenant._id, { schoolId: school._id });
    student = await persona.student(tenant._id, { schoolId: school._id });
    parent = await persona.parent(tenant._id, { schoolId: school._id });
    unprivilegedStaff = await persona.staff(tenant._id, {
      schoolId: school._id,
      customPermissions: [], // Explicitly zero permissions for default-deny verification
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

  // =========================================================================
  // 1. Unauthenticated & Default-Deny Security Baseline
  // =========================================================================
  describe('1. Unauthenticated & Default-Deny Baseline', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const endpoints = [
        '/api/v1/students',
        '/api/v1/employees',
        '/api/v1/finance/invoices',
        '/api/v1/examinations',
        '/api/v1/audit-logs',
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });

    it('enforces default-deny: user with empty permissions array is rejected on all privileged routes with 403', async () => {
      const endpoints = [
        '/api/v1/students',
        '/api/v1/employees',
        '/api/v1/finance/invoices',
        '/api/v1/examinations',
        '/api/v1/audit-logs',
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${unprivilegedStaff.token}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Insufficient privileges');
      }
    });
  });

  // =========================================================================
  // 2. Role-Based Module Boundary Enforcement
  // =========================================================================
  describe('2. Role-Based Module Boundary Enforcement', () => {
    it('allows school admin to view audit logs, but prohibits teacher, student, and parent', async () => {
      // 1. School Admin (has audit:read)
      const adminRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${schoolAdmin.token}`);
      expect(adminRes.status).toBe(200);

      // 2. Teacher (no audit:read)
      const teacherRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${teacher.token}`);
      expect(teacherRes.status).toBe(403);

      // 3. Student (no audit:read)
      const studentRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${student.token}`);
      expect(studentRes.status).toBe(403);

      // 4. Parent (no audit:read)
      const parentRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${parent.token}`);
      expect(parentRes.status).toBe(403);
    });

    it('prohibits student and parent from creating assignments, allowing only teacher or admin', async () => {
      const payload = {
        title: 'Unauthorized Assignment',
        academicClassId: new Types.ObjectId().toString(),
        subjectId: new Types.ObjectId().toString(),
        dueDate: new Date().toISOString(),
      };

      // Student attempt
      const studentRes = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${student.token}`)
        .send(payload);
      expect(studentRes.status).toBe(403);

      // Parent attempt
      const parentRes = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${parent.token}`)
        .send(payload);
      expect(parentRes.status).toBe(403);
    });

    it('prohibits teacher from creating fee categories, allowing only authorized administrators/accountants', async () => {
      const res = await request(app)
        .post('/api/v1/finance/categories')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          name: 'Teacher Attempt Fee',
          code: 'TAF-01',
          type: 'TUITION',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Super Administrator Universal Authority
  // =========================================================================
  describe('3. Super Administrator Universal Authority', () => {
    it('allows super admin with wildcard permission (*) to access privileged endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${superAdmin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
