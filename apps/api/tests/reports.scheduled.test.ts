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
  ReportExportJob,
  ScheduledReport,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  ReportFormat,
  ReportScheduleFrequency,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 20: Scheduled Reports & Export Jobs Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const hostHeader = 'alpha-reports-sched.edusphere.io';

  let adminToken: string;
  let adminId: Types.ObjectId;

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
    await ReportExportJob.init();
    await ScheduledReport.init();

    await Tenant.create({
      _id: tenantId,
      name: 'Alpha Sched School',
      slug: 'alpha-reports-sched',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Alpha School',
      code: 'ALP-SCHED',
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

    const passwordHash = await passwordService.hashPassword('SchedReport123!');
    const admin = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'admin@alpha-sched.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    adminId = admin._id as Types.ObjectId;

    await UserRole.create({
      tenantId,
      userId: admin._id,
      roleId: roleMap.get('SUPER_ADMIN')!,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'admin@alpha-sched.edu', password: 'SchedReport123!' });
    adminToken = loginRes.body.data?.tokens?.accessToken || loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Executive Dashboard Overview API', () => {
    it('retrieves the multi-module dashboard KPI summary and trend charts', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis).toBeDefined();
      expect(Array.isArray(res.body.data.kpis)).toBe(true);
      expect(res.body.data.kpis.length).toBeGreaterThanOrEqual(5);

      expect(res.body.data.widgets).toBeDefined();
      expect(Array.isArray(res.body.data.widgets)).toBe(true);
      expect(res.body.data.widgets.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('2. Asynchronous Report Export Jobs', () => {
    let createdJobId: string;

    it('submits a new asynchronous report export job', async () => {
      const res = await request(app)
        .post('/api/v1/reports/exports')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportKey: 'students.enrollment-roster',
          format: ReportFormat.CSV,
          async: true,
        });

      expect(res.status).toBe(202);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.reportKey).toBe('students.enrollment-roster');
      createdJobId = res.body.data.id;
    });

    it('lists user export jobs', async () => {
      const res = await request(app)
        .get('/api/v1/reports/exports')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.jobs).toBeDefined();
      expect(res.body.data.jobs.length).toBeGreaterThanOrEqual(1);
    });

    it('inspects status of an export job', async () => {
      // Give background process 50ms to finish
      await new Promise((r) => setTimeout(r, 50));

      const res = await request(app)
        .get(`/api/v1/reports/exports/${createdJobId}`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdJobId);
      expect(['QUEUED', 'PROCESSING', 'COMPLETED']).toContain(res.body.data.status);
    });

    it('downloads completed export job file', async () => {
      // Force status COMPLETED for instant download verification
      await ReportExportJob.findByIdAndUpdate(createdJobId, {
        status: 'COMPLETED',
        fileName: 'students_export.csv',
      });

      const res = await request(app)
        .get(`/api/v1/reports/exports/${createdJobId}/download`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  describe('3. Scheduled Reports CRUD & Dispatcher', () => {
    let scheduleId: string;

    it('creates a new scheduled recurring report', async () => {
      const res = await request(app)
        .post('/api/v1/reports/scheduled')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Monthly Fee Defaulters Notice',
          description: 'Recurring monthly export sent to finance heads',
          reportKey: 'fees.defaulters-aging',
          format: ReportFormat.CSV,
          frequency: ReportScheduleFrequency.MONTHLY,
          timeOfDay: '09:00',
          dayOfMonth: 1,
          recipients: ['finance@alpha.edu', 'principal@alpha.edu'],
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Monthly Fee Defaulters Notice');
      expect(res.body.data.nextRunAt).toBeDefined();
      scheduleId = res.body.data.id;
    });

    it('retrieves all scheduled reports', async () => {
      const res = await request(app)
        .get('/api/v1/reports/scheduled')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(scheduleId);
    });

    it('retrieves a single scheduled report by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/scheduled/${scheduleId}`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(scheduleId);
      expect(res.body.data.name).toBe('Monthly Fee Defaulters Notice');
    });

    it('updates a scheduled report configuration', async () => {
      const res = await request(app)
        .put(`/api/v1/reports/scheduled/${scheduleId}`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Monthly Fee Notice',
          timeOfDay: '10:30',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Monthly Fee Notice');
      expect(res.body.data.timeOfDay).toBe('10:30');
    });

    it('manually triggers an immediate execution run for a scheduled report', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/scheduled/${scheduleId}/run`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(202);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.reportKey).toBe('fees.defaulters-aging');
    });

    it('deletes a scheduled report', async () => {
      const res = await request(app)
        .delete(`/api/v1/reports/scheduled/${scheduleId}`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const verifyRes = await request(app)
        .get(`/api/v1/reports/scheduled/${scheduleId}`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(404);
    });
  });
});
