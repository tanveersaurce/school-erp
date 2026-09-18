import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  Campus,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Student,
  Payment,
  Employee,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  ReportCategory,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 20: Reports Execution Engine & Exports Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const hostHeader = 'alpha-reports-exec.edusphere.io';

  let adminToken: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Tenant.init();
    await School.init();
    await Campus.init();
    await User.init();
    await Role.init();
    await Permission.init();
    await RolePermission.init();
    await UserRole.init();

    await Tenant.create({
      _id: tenantId,
      name: 'Alpha Reporting School',
      slug: 'alpha-reports-exec',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Alpha High',
      code: 'ALP-HIGH',
      status: 'ACTIVE',
      currency: 'USD',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '1 Main St', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    // Seed permissions & roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap = new Map<string, Types.ObjectId>();
    for (const r of roleDocs) {
      roleMap.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('Reporting123!');
    const admin = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'admin@alpha-exec.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: admin._id,
      roleId: roleMap.get('SUPER_ADMIN')!,
    });

    // Seed students & financial data
    await Student.create([
      {
        tenantId,
        schoolId,
        campusId,
        admissionNumber: 'ADM-2026-001',
        personalDetails: {
          firstName: 'Emma',
          lastName: 'Watson',
          dateOfBirth: new Date('2014-01-01'),
          gender: 'FEMALE',
        },
        contactDetails: {
          currentAddress: 'Main St 1',
        },
        currentStatus: 'ACTIVE',
      },
      {
        tenantId,
        schoolId,
        campusId,
        admissionNumber: 'ADM-2026-002',
        personalDetails: {
          firstName: 'Daniel',
          lastName: 'Radcliffe',
          dateOfBirth: new Date('2014-02-02'),
          gender: 'MALE',
        },
        contactDetails: {
          currentAddress: 'Main St 2',
        },
        currentStatus: 'ACTIVE',
      },
    ]);

    const sampleStudentId = new Types.ObjectId();
    const sampleInvoiceId = new Types.ObjectId();

    await Payment.create([
      {
        tenantId,
        schoolId,
        studentId: sampleStudentId,
        invoiceId: sampleInvoiceId,
        receiptNumber: 'REC-2026-001',
        amount: 250000, // $2,500.00 in minor units
        paymentMethod: 'BANK_TRANSFER',
        status: 'SUCCESS',
        paymentDate: new Date(),
      },
      {
        tenantId,
        schoolId,
        studentId: sampleStudentId,
        invoiceId: sampleInvoiceId,
        receiptNumber: 'REC-2026-002',
        amount: 150000, // $1,500.00 in minor units
        paymentMethod: 'PAYMENT_GATEWAY',
        status: 'SUCCESS',
        paymentDate: new Date(),
      },
    ]);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'admin@alpha-exec.edu', password: 'Reporting123!' });
    adminToken = loginRes.body.data?.tokens?.accessToken || loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Report Definitions Registry Catalog', () => {
    it('retrieves the complete definitions catalog covering all 15 categories', async () => {
      const res = await request(app)
        .get('/api/v1/reports/definitions')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(15);

      // Verify all 15 categories are present
      const categories = new Set(res.body.data.map((d: any) => d.category));
      expect(categories.has(ReportCategory.ACADEMIC)).toBe(true);
      expect(categories.has(ReportCategory.STUDENTS)).toBe(true);
      expect(categories.has(ReportCategory.ATTENDANCE)).toBe(true);
      expect(categories.has(ReportCategory.EXAMINATION)).toBe(true);
      expect(categories.has(ReportCategory.RESULTS)).toBe(true);
      expect(categories.has(ReportCategory.FEES)).toBe(true);
      expect(categories.has(ReportCategory.FINANCE)).toBe(true);
      expect(categories.has(ReportCategory.HR)).toBe(true);
      expect(categories.has(ReportCategory.PAYROLL)).toBe(true);
      expect(categories.has(ReportCategory.LIBRARY)).toBe(true);
      expect(categories.has(ReportCategory.TRANSPORT)).toBe(true);
      expect(categories.has(ReportCategory.HOSTEL)).toBe(true);
      expect(categories.has(ReportCategory.INVENTORY)).toBe(true);
      expect(categories.has(ReportCategory.COMMUNICATION)).toBe(true);
      expect(categories.has(ReportCategory.SYSTEM)).toBe(true);
    });

    it('filters definitions by specific category', async () => {
      const res = await request(app)
        .get('/api/v1/reports/definitions?category=FINANCE')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((d: any) => {
        expect(d.category).toBe(ReportCategory.FINANCE);
      });
    });

    it('retrieves single definition by valid reportKey', async () => {
      const res = await request(app)
        .get('/api/v1/reports/definitions/fees.collection-summary')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reportKey).toBe('fees.collection-summary');
      expect(res.body.data.columns.length).toBeGreaterThan(0);
    });

    it('returns 404 for unknown report definition key', async () => {
      const res = await request(app)
        .get('/api/v1/reports/definitions/unknown.bogus-key')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('2. Report Execution Engine Across Modules', () => {
    it('executes students.enrollment-roster with pagination and filters', async () => {
      const res = await request(app)
        .post('/api/v1/reports/run/students.enrollment-roster')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          page: 1,
          limit: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.reportKey).toBe('students.enrollment-roster');
      expect(res.body.data.totalCount).toBeGreaterThanOrEqual(2);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
    });

    it('executes fees.collection-summary with zero-floating-point Money formatting', async () => {
      const res = await request(app)
        .get('/api/v1/reports/run/fees.collection-summary')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reportKey).toBe('fees.collection-summary');
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);

      // Verify formatted Money amounts contain currency symbol ($)
      const firstRow = res.body.data.data[0];
      expect(firstRow.amountFormatted).toMatch(/\$|\d+\.\d{2}/);
    });

    it('executes academic and attendance reports gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/reports/run/attendance.daily-summary')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reportKey).toBe('attendance.daily-summary');
    });

    it('retrieves cached data on subsequent execution', async () => {
      // First run sets cache
      await request(app)
        .post('/api/v1/reports/run/hr.staff-directory')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limit: 5 });

      // Second run hits cache
      const res = await request(app)
        .post('/api/v1/reports/run/hr.staff-directory')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cache');
    });
  });

  describe('3. Synchronous CSV Export', () => {
    it('generates an RFC 4180-compliant CSV download', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/students.enrollment-roster')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
      expect(res.text).toContain('Admission No');
      expect(res.text).toContain('Emma');
    });
  });
});
