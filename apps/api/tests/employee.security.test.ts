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
  Department,
  Designation,
  Employee,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
  EmploymentStatus,
  EmploymentType,
  Gender,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Employee Security & Multi-Tenant Isolation Suite (Phase 6)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A: Alpha Academy
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusA1Id = new Types.ObjectId();
  const campusA2Id = new Types.ObjectId();

  // Tenant B: Beta Academy
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();

  let adminTokenA: string;
  let adminTokenB: string;
  let teacherTokenA: string;

  let tenantAEmployeeId: string;
  let tenantBEmployeeId: string;
  let tenantADeptId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant A
    await Tenant.create({
      _id: tenantAId,
      name: 'Alpha Academy',
      slug: 'alpha',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    await School.create({
      _id: schoolAId,
      tenantId: tenantAId,
      name: 'Alpha High',
      code: 'ALPHA-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@alpha.edu', phone: '1111111111' },
      address: {
        street: '1 Alpha St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
      timezone: 'America/New_York',
      currency: 'USD',
    });

    await Campus.create({
      _id: campusA1Id,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'North Campus',
      code: 'ALPHA-NC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 Alpha St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
    });

    await Campus.create({
      _id: campusA2Id,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'South Campus',
      code: 'ALPHA-SC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '2 Alpha St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
    });

    // 2. Seed Tenant B
    await Tenant.create({
      _id: tenantBId,
      name: 'Beta Academy',
      slug: 'beta',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    await School.create({
      _id: schoolBId,
      tenantId: tenantBId,
      name: 'Beta High',
      code: 'BETA-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@beta.edu', phone: '2222222222' },
      address: {
        street: '1 Beta St',
        city: 'Gotham',
        state: 'NJ',
        postalCode: '07001',
        country: 'USA',
      },
      timezone: 'America/New_York',
      currency: 'USD',
    });

    await Campus.create({
      _id: campusBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'Main Campus',
      code: 'BETA-MC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 Beta St',
        city: 'Gotham',
        state: 'NJ',
        postalCode: '07001',
        country: 'USA',
      },
    });

    // 3. Seed Permissions
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

    // 4. Seed Roles for Tenant A & B
    for (const currentTenantId of [tenantAId, tenantBId]) {
      for (const roleDef of SYSTEM_ROLES) {
        const roleDoc = await Role.create({
          tenantId: currentTenantId,
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: true,
        });

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
            permsToAssign.map((pId) => ({
              tenantId: currentTenantId,
              roleId: roleDoc._id,
              permissionId: pId,
            }))
          );
        }
      }
    }

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // Admin User for Tenant A
    const adminA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@alpha.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminRoleA = await Role.findOne({ tenantId: tenantAId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({
      tenantId: tenantAId,
      userId: adminA._id,
      roleId: adminRoleA!._id,
      schoolId: schoolAId,
    });

    // Admin User for Tenant B
    const adminB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@beta.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminRoleB = await Role.findOne({ tenantId: tenantBId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({
      tenantId: tenantBId,
      userId: adminB._id,
      roleId: adminRoleB!._id,
      schoolId: schoolBId,
    });

    // Regular Teacher for Tenant A (lacking employee write permissions)
    const teacherA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher@alpha.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const teacherRoleA = await Role.findOne({ tenantId: tenantAId, name: 'TEACHER' });
    await UserRole.create({
      tenantId: tenantAId,
      userId: teacherA._id,
      roleId: teacherRoleA!._id,
      schoolId: schoolAId,
    });

    // Login tokens
    const loginResA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'admin@alpha.edu', password: 'Admin@123456' });
    adminTokenA = loginResA.body.data.accessToken;

    const loginResB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'beta.edusphere.io')
      .send({ email: 'admin@beta.edu', password: 'Admin@123456' });
    adminTokenB = loginResB.body.data.accessToken;

    const teacherLoginResA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'teacher@alpha.edu', password: 'Admin@123456' });
    teacherTokenA = teacherLoginResA.body.data.accessToken;

    // Seed Department & Designation in Tenant A
    const deptA = await Department.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Science',
      code: 'SCI-A',
      status: 'ACTIVE',
    });
    tenantADeptId = deptA._id.toString();

    const desigA = await Designation.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      departmentId: deptA._id,
      name: 'Alpha Instructor',
      code: 'INST-A',
      status: 'ACTIVE',
    });

    // Seed Employee in Tenant A
    const empA = await Employee.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusA1Id,
      employeeId: 'ALPHA-001',
      firstName: 'Alice',
      lastName: 'Alpha',
      displayName: 'Alice Alpha',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1990-01-01'),
      workEmail: 'alice@alpha.edu',
      departmentId: deptA._id,
      designationId: desigA._id,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2023-01-01'),
    });
    tenantAEmployeeId = empA._id.toString();

    // Seed Department & Designation in Tenant B
    const deptB = await Department.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'Beta Science',
      code: 'SCI-B',
      status: 'ACTIVE',
    });

    const desigB = await Designation.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      departmentId: deptB._id,
      name: 'Beta Instructor',
      code: 'INST-B',
      status: 'ACTIVE',
    });

    // Seed Employee in Tenant B
    const empB = await Employee.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      employeeId: 'BETA-001',
      firstName: 'Bob',
      lastName: 'Beta',
      displayName: 'Bob Beta',
      gender: Gender.MALE,
      dateOfBirth: new Date('1991-02-02'),
      workEmail: 'bob@beta.edu',
      departmentId: deptB._id,
      designationId: desigB._id,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2023-02-01'),
    });
    tenantBEmployeeId = empB._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Cross-Tenant Isolation
  // =========================================================================
  describe('Multi-Tenant Data Isolation', () => {
    it('Tenant A admin should NOT see Tenant B employees in directory', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('Host', 'alpha.edusphere.io');

      expect(res.status).toBe(200);
      const employeeIds = res.body.data.map((e: any) => e.id);
      expect(employeeIds).toContain(tenantAEmployeeId);
      expect(employeeIds).not.toContain(tenantBEmployeeId);
    });

    it('Tenant A admin should get 404 when attempting to view Tenant B employee (IDOR defense)', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${tenantBEmployeeId}`)
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('Host', 'alpha.edusphere.io');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A admin should get 404 when attempting to update Tenant B employee', async () => {
      const res = await request(app)
        .patch(`/api/v1/employees/${tenantBEmployeeId}`)
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('Host', 'alpha.edusphere.io')
        .send({
          firstName: 'Hacked',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify DB record remained untouched
      const original = await Employee.findById(tenantBEmployeeId);
      expect(original?.firstName).toBe('Bob');
    });

    it('Tenant A admin should get 404 when attempting status transition on Tenant B employee', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${tenantBEmployeeId}/status`)
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('Host', 'alpha.edusphere.io')
        .send({
          status: EmploymentStatus.TERMINATED,
          reason: 'Unauthorized cross-tenant attack',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      const original = await Employee.findById(tenantBEmployeeId);
      expect(original?.employmentStatus).toBe(EmploymentStatus.ACTIVE);
    });
  });

  // =========================================================================
  // 2. RBAC & Permission Enforcement
  // =========================================================================
  describe('RBAC Permission Guards', () => {
    it('Teacher lacking employee:create permission should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${teacherTokenA}`)
        .set('Host', 'alpha.edusphere.io')
        .send({
          firstName: 'Unauthorized',
          lastName: 'Staff',
          gender: Gender.OTHER,
          dateOfBirth: '1995-01-01',
          departmentId: tenantADeptId,
          joiningDate: '2024-01-01',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Insufficient privileges|Access denied/);
    });

    it('Teacher lacking department:create permission should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${teacherTokenA}`)
        .set('Host', 'alpha.edusphere.io')
        .send({
          name: 'Illegal Department',
          code: 'ILLEGAL',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Insufficient privileges|Access denied/);
    });
  });
});
