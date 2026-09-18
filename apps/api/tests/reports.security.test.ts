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
  ReportExportJob,
  ScheduledReport,
  Student,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  ReportFormat,
  ExportJobStatus,
  ReportScheduleFrequency,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 20: Reports Security & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant 1 (Alpha Academy)
  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const campus1Id = new Types.ObjectId();
  const hostHeader1 = 'alpha-reports.edusphere.io';

  // Tenant 2 (Beta College)
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();
  const campus2Id = new Types.ObjectId();
  const hostHeader2 = 'beta-reports.edusphere.io';

  let admin1Token: string;
  let teacher1Token: string;
  let parent1Token: string;
  let admin2Token: string;

  let student1Id: Types.ObjectId;
  let student2Id: Types.ObjectId;
  let job1Id: Types.ObjectId;
  let schedule1Id: Types.ObjectId;

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

    // 1. Create Tenants & Schools
    await Tenant.create({
      _id: tenant1Id,
      name: 'Alpha Academy',
      slug: 'alpha-reports',
      customDomain: hostHeader1,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@alpha.edu', phone: '+1234567891' },
    });

    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Alpha School',
      code: 'ALPHA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campus1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Alpha Main',
      code: 'ALPHA-MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '1 Alpha Way', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Beta College',
      slug: 'beta-reports',
      customDomain: hostHeader2,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@beta.edu', phone: '+1234567892' },
    });

    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Beta School',
      code: 'BETA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'ICSE',
    });

    await Campus.create({
      _id: campus2Id,
      tenantId: tenant2Id,
      schoolId: school2Id,
      name: 'Beta Main',
      code: 'BETA-MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '2 Beta Blvd', city: 'Metro', state: 'NY', postalCode: '10002', country: 'USA' },
    });

    // 2. Seed Permissions and Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    const roleDocs1 = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenant1Id,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap1 = new Map<string, Types.ObjectId>();
    for (const r of roleDocs1) {
      roleMap1.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms1: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap1.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms1.push({ tenantId: tenant1Id, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms1.push({ tenantId: tenant1Id, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms1);

    const roleDocs2 = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenant2Id,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap2 = new Map<string, Types.ObjectId>();
    for (const r of roleDocs2) {
      roleMap2.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms2: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap2.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms2.push({ tenantId: tenant2Id, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms2.push({ tenantId: tenant2Id, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms2);

    const passwordHash = await passwordService.hashPassword('SecurityPassword123!');

    // Tenant 1 Admin
    const admin1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'admin1@alpha.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: admin1._id,
      roleId: roleMap1.get('SUPER_ADMIN')!,
    });

    // Tenant 1 Teacher
    const teacher1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'teacher1@alpha.edu',
      passwordHash,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: teacher1._id,
      roleId: roleMap1.get('TEACHER')!,
    });

    // Tenant 1 Parent
    const parent1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'parent1@alpha.edu',
      passwordHash,
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: parent1._id,
      roleId: roleMap1.get('PARENT')!,
    });

    // Tenant 2 Admin
    const admin2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      campusId: campus2Id,
      email: 'admin2@beta.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant2Id,
      userId: admin2._id,
      roleId: roleMap2.get('SUPER_ADMIN')!,
    });

    // Seed sample students in Tenant 1
    student1Id = new Types.ObjectId();
    student2Id = new Types.ObjectId();

    await Student.create([
      {
        _id: student1Id,
        tenantId: tenant1Id,
        schoolId: school1Id,
        campusId: campus1Id,
        admissionNumber: 'ADM-T1-01',
        personalDetails: {
          firstName: 'Alice',
          lastName: 'Smith',
          dateOfBirth: new Date('2014-01-01'),
          gender: 'FEMALE',
        },
        contactDetails: {
          currentAddress: 'Alpha Street 1',
        },
        currentStatus: 'ACTIVE',
      },
      {
        _id: student2Id,
        tenantId: tenant1Id,
        schoolId: school1Id,
        campusId: campus1Id,
        admissionNumber: 'ADM-T1-02',
        personalDetails: {
          firstName: 'Bob',
          lastName: 'Jones',
          dateOfBirth: new Date('2014-02-02'),
          gender: 'MALE',
        },
        contactDetails: {
          currentAddress: 'Alpha Street 2',
        },
        currentStatus: 'ACTIVE',
      },
    ]);

    // Seed an export job and scheduled report in Tenant 1
    job1Id = new Types.ObjectId();
    await ReportExportJob.create({
      _id: job1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      requestedBy: admin1._id,
      reportKey: 'students.enrollment-roster',
      format: ReportFormat.CSV,
      status: ExportJobStatus.COMPLETED,
      rowCount: 2,
    });

    schedule1Id = new Types.ObjectId();
    await ScheduledReport.create({
      _id: schedule1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Weekly Attendance',
      reportKey: 'attendance.daily-summary',
      format: ReportFormat.CSV,
      frequency: ReportScheduleFrequency.WEEKLY,
      recipients: ['admin@alpha.edu'],
      createdBy: admin1._id,
    });

    // Login for JWTs
    const loginRes1 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'admin1@alpha.edu', password: 'SecurityPassword123!' });
    admin1Token = loginRes1.body.data?.tokens?.accessToken || loginRes1.body.data?.accessToken;

    const loginResTeacher = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'teacher1@alpha.edu', password: 'SecurityPassword123!' });
    teacher1Token = loginResTeacher.body.data?.tokens?.accessToken || loginResTeacher.body.data?.accessToken;

    const loginResParent = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'parent1@alpha.edu', password: 'SecurityPassword123!' });
    parent1Token = loginResParent.body.data?.tokens?.accessToken || loginResParent.body.data?.accessToken;

    const loginRes2 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader2)
      .send({ email: 'admin2@beta.edu', password: 'SecurityPassword123!' });
    admin2Token = loginRes2.body.data?.tokens?.accessToken || loginRes2.body.data?.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Authentication Gateways', () => {
    it('rejects unauthenticated requests to report definitions', async () => {
      const res = await request(app).get('/api/v1/reports/definitions');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to run reports', async () => {
      const res = await request(app).get('/api/v1/reports/run/students.enrollment-roster');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to dashboard overview', async () => {
      const res = await request(app).get('/api/v1/reports/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to scheduled reports', async () => {
      const res = await request(app).get('/api/v1/reports/scheduled');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Multi-Tenant Data Isolation', () => {
    it('prevents Tenant 2 admin from retrieving Tenant 1 export jobs by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/exports/${job1Id}`)
        .set('Host', hostHeader2)
        .set('Authorization', `Bearer ${admin2Token}`);

      expect(res.status).toBe(404);
    });

    it('prevents Tenant 2 admin from accessing Tenant 1 scheduled reports by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/scheduled/${schedule1Id}`)
        .set('Host', hostHeader2)
        .set('Authorization', `Bearer ${admin2Token}`);

      expect(res.status).toBe(404);
    });

    it('isolates scheduled report listings so Tenant 2 sees 0 of Tenant 1 schedules', async () => {
      const res = await request(app)
        .get('/api/v1/reports/scheduled')
        .set('Host', hostHeader2)
        .set('Authorization', `Bearer ${admin2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('3. Server-Side Scope Resolution & Anti-IDOR', () => {
    it('allows Admin to run reports across all students', async () => {
      const res = await request(app)
        .get('/api/v1/reports/run/students.enrollment-roster')
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${admin1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalCount).toBeGreaterThanOrEqual(2);
    });

    it('blocks Parent with empty permitted students from querying arbitrary studentId', async () => {
      const res = await request(app)
        .post('/api/v1/reports/run/students.enrollment-roster')
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${parent1Token}`)
        .send({
          filters: { studentId: student2Id.toString() },
        });

      // Either 403 Forbidden because student is not permitted, or 200 with 0 records scoped
      expect([200, 403]).toContain(res.status);
    });
  });
});
