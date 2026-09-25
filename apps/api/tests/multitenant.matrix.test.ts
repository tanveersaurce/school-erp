import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { createDualTenantEnvironment, DualTenantEnvironment } from './factories/environment.factory.js';
import {
  createStudent,
  createEmployee,
  createFeeInvoice,
  createUser,
} from './factories/entity.factories.js';

describe('Comprehensive Multi-Tenant & Campus Scope Matrix Suite (Phase 23)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();
  let env: DualTenantEnvironment;

  // Tenant A Entities
  let studentA: any;
  let employeeA: any;
  let invoiceA: any;

  // Tenant B Entities
  let studentB: any;
  let employeeB: any;
  let invoiceB: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    env = await createDualTenantEnvironment();

    // 1. Seed Tenant A Entities
    studentA = await createStudent(env.tenantA.tenant._id, env.tenantA.school1._id, {
      firstName: 'AliceTenantA',
    });
    const userEmpA = await createUser(env.tenantA.tenant._id);
    employeeA = await createEmployee(env.tenantA.tenant._id, env.tenantA.school1._id, userEmpA._id, {
      firstName: 'EmpTenantA',
    });
    invoiceA = await createFeeInvoice(
      env.tenantA.tenant._id,
      env.tenantA.school1._id,
      studentA._id,
      env.tenantA.academicYear._id
    );

    // 2. Seed Tenant B Entities
    studentB = await createStudent(env.tenantB.tenant._id, env.tenantB.school1._id, {
      firstName: 'BobTenantB',
    });
    const userEmpB = await createUser(env.tenantB.tenant._id);
    employeeB = await createEmployee(env.tenantB.tenant._id, env.tenantB.school1._id, userEmpB._id, {
      firstName: 'EmpTenantB',
    });
    invoiceB = await createFeeInvoice(
      env.tenantB.tenant._id,
      env.tenantB.school1._id,
      studentB._id,
      env.tenantB.academicYear._id
    );
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
  // 1. Cross-Tenant Read Isolation Matrix
  // =========================================================================
  describe('1. Cross-Tenant Read Isolation Matrix', () => {
    it('Tenant A Admin cannot fetch Tenant B student by ID (returns 404 or 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentB._id}`)
        .set('Authorization', `Bearer ${env.tenantA.users.admin1.token}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A Admin student directory list excludes Tenant B students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${env.tenantA.users.admin1.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const students = Array.isArray(res.body.data) ? res.body.data : res.body.data?.students || [];
      const studentIds = students.map((s: any) => (s.id || s._id)?.toString());
      expect(studentIds).toContain(studentA._id.toString());
      expect(studentIds).not.toContain(studentB._id.toString());
    });

    it('Tenant B Admin cannot fetch Tenant A employee by ID (returns 404 or 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${employeeA._id}`)
        .set('Authorization', `Bearer ${env.tenantB.users.admin1.token}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A Admin cannot fetch Tenant B invoice by ID (returns 404 or 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices/${invoiceB._id}`)
        .set('Authorization', `Bearer ${env.tenantA.users.admin1.token}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A Admin global search never returns Tenant B entities', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=TenantB')
        .set('Authorization', `Bearer ${env.tenantA.users.admin1.token}`);

      expect(res.status).toBe(200);
      const totalMatches = res.body.data?.totalMatches ?? res.body.data?.groups?.length ?? 0;
      expect(totalMatches).toBe(0);
    });
  });

  // =========================================================================
  // 2. Cross-Tenant Mutation & Destruction Defense
  // =========================================================================
  describe('2. Cross-Tenant Mutation & Destruction Defense', () => {
    it('prohibits Tenant A from updating Tenant B student (returns 404 or 403, zero data change)', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${studentB._id}/status`)
        .set('Authorization', `Bearer ${env.tenantA.users.admin1.token}`)
        .send({ status: 'SUSPENDED' });

      expect([403, 404]).toContain(res.status);

      // Verify DB record remained untouched
      const studentDoc: any = await mongoose.model('Student').findById(studentB._id);
      expect(studentDoc?.currentStatus).toBe('ACTIVE');
    });

    it('prohibits Tenant B from deleting Tenant A student', async () => {
      const res = await request(app)
        .delete(`/api/v1/students/${studentA._id}`)
        .set('Authorization', `Bearer ${env.tenantB.users.admin1.token}`);

      expect([403, 404]).toContain(res.status);

      const studentDoc = await mongoose.model('Student').findById(studentA._id);
      expect(studentDoc).toBeDefined();
      expect(studentDoc?.isDeleted).toBe(false);
    });
  });

  // =========================================================================
  // 3. Intra-Tenant School Scoping Matrix (School A vs School B)
  // =========================================================================
  describe('3. Intra-Tenant School Scoping Matrix', () => {
    it('prohibits School Admin 1 from accessing School 2 resources via query parameters', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/categories?schoolId=${env.tenantA.school2._id}`)
        .set('Authorization', `Bearer ${env.tenantA.users.admin1.token}`);

      // resolveAuthorizedSchoolId rejects cross-school parameter injection
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Cross-school access prohibited');
    });
  });
});
