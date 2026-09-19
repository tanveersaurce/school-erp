import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  AuditLog,
  Counter,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';
import { studentService } from '../src/modules/student/student.service.js';

describe('Phase 5 Hardening & Maintenance Backfill Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const otherTenantId = new Types.ObjectId();
  const otherSchoolId = new Types.ObjectId();

  let adminToken: string;
  let teacherToken: string;
  let otherTenantAdminToken: string;

  let campus1Id: string;
  let campus2Id: string;
  let campus3Id: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Primary Tenant & School
    await Tenant.create({
      _id: tenantId,
      name: 'Hardening Academy Foundation',
      slug: 'hardening-academy',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Hardening Academy High',
      code: 'HAH-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@hardening.edu', phone: '9876543210' },
      address: {
        street: '100 Hardening Blvd',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      settings: {
        numbering: {
          admissionNumberPrefix: 'HAH-ADM',
          admissionNumberDigits: 6,
          invoicePrefix: 'HAH-INV',
          receiptPrefix: 'HAH-REC',
          employeeIdPrefix: 'HAH-EMP',
        },
      },
    });

    // 2. Secondary Tenant & School (for isolation tests)
    await Tenant.create({
      _id: otherTenantId,
      name: 'Other Tenant Org',
      slug: 'other-org',
      plan: TenantPlan.STANDARD,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });

    await School.create({
      _id: otherSchoolId,
      tenantId: otherTenantId,
      name: 'Other School',
      code: 'OTH-01',
      affiliationBoard: 'ICSE',
    });

    // 3. Permissions & Roles
    const permissionMap = new Map<string, Types.ObjectId>();
    for (const perm of SYSTEM_PERMISSIONS) {
      const pDoc = await Permission.create({
        resource: perm.resource,
        action: perm.action,
        permissionString: perm.permissionString.toLowerCase().trim(),
        description: perm.description,
        category: perm.category,
      });
      permissionMap.set(perm.permissionString.toLowerCase().trim(), pDoc._id as Types.ObjectId);
    }

    const roleMap = new Map<string, Types.ObjectId>();
    for (const roleDef of SYSTEM_ROLES) {
      const roleDoc = await Role.create({
        tenantId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      });
      roleMap.set(roleDef.name, roleDoc._id as Types.ObjectId);

      const permsToAssign: Types.ObjectId[] = [];
      if (roleDef.permissions.includes('*')) {
        for (const pId of permissionMap.values()) permsToAssign.push(pId);
      } else {
        for (const pStr of roleDef.permissions) {
          const pId = permissionMap.get(pStr.toLowerCase().trim());
          if (pId) permsToAssign.push(pId);
        }
      }

      if (permsToAssign.length > 0) {
        await RolePermission.insertMany(
          permsToAssign.map((pId) => ({ tenantId, roleId: roleDoc._id, permissionId: pId }))
        );
      }
    }

    // Role for other tenant
    const otherAdminRole = await Role.create({
      tenantId: otherTenantId,
      name: 'SCHOOL_ADMIN',
      description: 'School Admin',
      isSystemRole: true,
    });
    const allPerms = Array.from(permissionMap.values());
    await RolePermission.insertMany(
      allPerms.map((pId) => ({ tenantId: otherTenantId, roleId: otherAdminRole._id, permissionId: pId }))
    );

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // Primary Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@hardening.edu',
      firstName: 'Admin',
      lastName: 'Hardening',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId, userId: adminUser._id, roleId: roleMap.get('SCHOOL_ADMIN') });

    // Primary Teacher User
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher@hardening.edu',
      firstName: 'Teacher',
      lastName: 'Hardening',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId, userId: teacherUser._id, roleId: roleMap.get('TEACHER') });

    // Other Tenant Admin User
    const otherAdminUser = await User.create({
      tenantId: otherTenantId,
      schoolId: otherSchoolId,
      email: 'admin@other.edu',
      firstName: 'Other',
      lastName: 'Admin',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({
      tenantId: otherTenantId,
      userId: otherAdminUser._id,
      roleId: otherAdminRole._id,
    });

    // Authenticate
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@hardening.edu',
      password: 'Admin@123456',
    });
    adminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@hardening.edu',
      password: 'Admin@123456',
    });
    teacherToken = teacherLogin.body.data.accessToken;

    const otherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@other.edu',
      password: 'Admin@123456',
    });
    otherTenantAdminToken = otherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Campus isMain Auto-Assignment & Set-Main Workflow', () => {
    it('automatically marks the first campus created for a school as isMain: true', async () => {
      const res = await request(app)
        .post('/api/v1/campuses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Main Heritage Campus',
          code: 'HAH-MHC',
          address: {
            street: '1 Heritage Way',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'India',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isMain).toBe(true);
      campus1Id = res.body.data.id;

      const doc = await Campus.findById(campus1Id);
      expect(doc?.isMain).toBe(true);
    });

    it('defaults subsequent campuses to isMain: false', async () => {
      const res = await request(app)
        .post('/api/v1/campuses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'North City Campus',
          code: 'HAH-NCC',
          address: {
            street: '2 North Ring Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560002',
            country: 'India',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isMain).toBe(false);
      campus2Id = res.body.data.id;

      // Campus 1 remains isMain: true
      const doc1 = await Campus.findById(campus1Id);
      expect(doc1?.isMain).toBe(true);
    });

    it('creates a third campus for archival testing', async () => {
      const res = await request(app)
        .post('/api/v1/campuses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'South Lakeside Campus',
          code: 'HAH-SLC',
          address: {
            street: '3 Lake View Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560003',
            country: 'India',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isMain).toBe(false);
      campus3Id = res.body.data.id;
    });

    it('promotes second campus to main via POST /campuses/:campusId/set-main and demotes first campus', async () => {
      const res = await request(app)
        .post(`/api/v1/campuses/${campus2Id}/set-main`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(campus2Id);
      expect(res.body.data.isMain).toBe(true);

      // Verify DB state
      const c1 = await Campus.findById(campus1Id);
      const c2 = await Campus.findById(campus2Id);
      expect(c1?.isMain).toBe(false);
      expect(c2?.isMain).toBe(true);

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'CAMPUS_SET_MAIN',
        entityId: new Types.ObjectId(campus2Id),
      });
      expect(audit).not.toBeNull();
      expect(audit?.tenantId.toString()).toBe(tenantId.toString());
    });

    it('is idempotent if already main campus', async () => {
      const res = await request(app)
        .post(`/api/v1/campuses/${campus2Id}/set-main`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isMain).toBe(true);
    });
  });

  describe('2. Campus Archival Invariants & Safeguards', () => {
    it('rejects setting an archived campus as main', async () => {
      // Archive campus 3
      await request(app)
        .post(`/api/v1/campuses/${campus3Id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .post(`/api/v1/campuses/${campus3Id}/set-main`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Archived campus cannot be set as the main campus');
    });

    it('rejects archiving the main campus without reassigning main first', async () => {
      // campus 2 is main campus
      const res = await request(app)
        .post(`/api/v1/campuses/${campus2Id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot archive the main campus');
    });

    it('allows archiving a non-main campus when multiple active campuses exist', async () => {
      // Campus 1 is non-main, campus 2 is main. Let's archive Campus 1
      const res = await request(app)
        .post(`/api/v1/campuses/${campus1Id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(CampusStatus.ARCHIVED);
    });

    it('rejects archiving the sole remaining active campus of a school', async () => {
      // Only Campus 2 remains active
      const res = await request(app)
        .post(`/api/v1/campuses/${campus2Id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot archive the sole active campus');
    });
  });

  describe('3. Numbering Preview & Student Padding Invariants', () => {
    it('provides read-only preview of document sequence numbers via GET /schools/numbering/preview', async () => {
      const res = await request(app)
        .get('/api/v1/schools/numbering/preview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      const currentYear = new Date().getFullYear();

      expect(data.admissionNumber).toBe(`HAH-ADM-${currentYear}-000001`);
      expect(data.invoiceNumber).toBe(`HAH-INV-${currentYear}-00001`);
      expect(data.receiptNumber).toBe(`HAH-REC-${currentYear}-00001`);
      expect(data.employeeId).toBe(`HAH-EMP-0001`);

      // Verify no counter was created/incremented by the preview
      const counter = await Counter.findOne({
        tenantId,
        sequenceType: `ADMISSION_NUMBER_${currentYear}`,
      });
      expect(counter).toBeNull();
    });

    it('studentService generates admission number formatted with configured 6 digits', async () => {
      const generatedNumber = await studentService.generateNextAdmissionNumber(
        tenantId.toString(),
        schoolId.toString()
      );
      const currentYear = new Date().getFullYear();
      expect(generatedNumber).toBe(`HAH-ADM-${currentYear}-000001`);

      const secondGenerated = await studentService.generateNextAdmissionNumber(
        tenantId.toString(),
        schoolId.toString()
      );
      expect(secondGenerated).toBe(`HAH-ADM-${currentYear}-000002`);
    });
  });

  describe('4. Security, RBAC & Multi-Tenant Isolation', () => {
    it('returns 401 Unauthorized if no token is provided to set-main', async () => {
      const res = await request(app).post(`/api/v1/campuses/${campus2Id}/set-main`);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden if user lacks campus:update permission', async () => {
      const res = await request(app)
        .post(`/api/v1/campuses/${campus2Id}/set-main`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 Not Found when a tenant attempts to set-main on another tenant campus', async () => {
      const res = await request(app)
        .post(`/api/v1/campuses/${campus2Id}/set-main`)
        .set('Authorization', `Bearer ${otherTenantAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Campus not found');
    });
  });
});
