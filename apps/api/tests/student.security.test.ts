import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Student,
  Parent,
  StudentParentRelation,
  StudentEnrollment,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  Gender,
  GuardianRelationType,
  AdmissionType,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Student Security, Multi-Tenant Isolation & Anti-IDOR Suite (Phase 7)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A: Alpha Academy
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();
  const academicYearAId = new Types.ObjectId();

  // Tenant B: Beta Academy
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();
  const academicYearBId = new Types.ObjectId();

  let adminTokenA: string;
  let adminTokenB: string;
  let parentTokenA: string;
  let teacherTokenA: string;

  let studentAId: string;
  let studentBId: string;
  let guardianAId: string;
  let guardianBId: string;
  let studentA2Id: string; // Unrelated student in Tenant A

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenants
    await Tenant.create([
      {
        _id: tenantAId,
        name: 'Alpha Academy',
        slug: 'alpha',
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
        status: TenantStatus.ACTIVE,
        features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
      },
      {
        _id: tenantBId,
        name: 'Beta Academy',
        slug: 'beta',
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
        status: TenantStatus.ACTIVE,
        features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
      },
    ]);

    // 2. Seed Schools
    await School.create([
      {
        _id: schoolAId,
        tenantId: tenantAId,
        name: 'Alpha High',
        code: 'ALPHA-01',
        affiliationBoard: 'CBSE',
        contact: { email: 'admin@alpha.edu', phone: '1111111111' },
        address: {
          street: '1st St',
          city: 'City A',
          state: 'State A',
          postalCode: '10001',
          country: 'USA',
        },
        timezone: 'America/New_York',
        currency: 'USD',
      },
      {
        _id: schoolBId,
        tenantId: tenantBId,
        name: 'Beta High',
        code: 'BETA-01',
        affiliationBoard: 'ICSE',
        contact: { email: 'admin@beta.edu', phone: '2222222222' },
        address: {
          street: '2nd St',
          city: 'City B',
          state: 'State B',
          postalCode: '20002',
          country: 'USA',
        },
        timezone: 'America/Chicago',
        currency: 'USD',
      },
    ]);

    // 3. Seed Campuses & Academic Years
    await Campus.create([
      {
        _id: campusAId,
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: 'Campus A',
        code: 'CA-01',
        address: {
          street: '1st St',
          city: 'City A',
          state: 'State A',
          postalCode: '10001',
          country: 'USA',
        },
        status: CampusStatus.ACTIVE,
      },
      {
        _id: campusBId,
        tenantId: tenantBId,
        schoolId: schoolBId,
        name: 'Campus B',
        code: 'CB-01',
        address: {
          street: '2nd St',
          city: 'City B',
          state: 'State B',
          postalCode: '20002',
          country: 'USA',
        },
        status: CampusStatus.ACTIVE,
      },
    ]);

    await AcademicYear.create([
      {
        _id: academicYearAId,
        tenantId: tenantAId,
        schoolId: schoolAId,
        campusId: campusAId,
        name: 'AY-A',
        code: 'AYA',
        startDate: new Date(),
        endDate: new Date(),
        status: AcademicYearStatus.ACTIVE,
        isCurrent: true,
      },
      {
        _id: academicYearBId,
        tenantId: tenantBId,
        schoolId: schoolBId,
        campusId: campusBId,
        name: 'AY-B',
        code: 'AYB',
        startDate: new Date(),
        endDate: new Date(),
        status: AcademicYearStatus.ACTIVE,
        isCurrent: true,
      },
    ]);

    // 4. Seed Permissions
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

    // 5. Seed Roles for both tenants
    for (const tId of [tenantAId, tenantBId]) {
      for (const roleDef of SYSTEM_ROLES) {
        const roleDoc = await Role.create({
          tenantId: tId,
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
            permsToAssign.map((pId) => ({ tenantId: tId, roleId: roleDoc._id, permissionId: pId }))
          );
        }
      }
    }

    const passwordHash = await passwordService.hashPassword('Pass@123456');

    // 6. Seed Users
    // Admin A
    const adminUserA = await User.create({
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
      userId: adminUserA._id,
      roleId: adminRoleA!._id,
      schoolId: schoolAId,
    });

    // Admin B
    const adminUserB = await User.create({
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
      userId: adminUserB._id,
      roleId: adminRoleB!._id,
      schoolId: schoolBId,
    });

    // Teacher A
    const teacherUserA = await User.create({
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
      userId: teacherUserA._id,
      roleId: teacherRoleA!._id,
      schoolId: schoolAId,
    });

    // Parent A
    const parentUserA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'parent@alpha.edu',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const parentRoleA = await Role.findOne({ tenantId: tenantAId, name: 'PARENT' });
    await UserRole.create({
      tenantId: tenantAId,
      userId: parentUserA._id,
      roleId: parentRoleA!._id,
    });

    // 7. Login Tokens
    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'admin@alpha.edu', password: 'Pass@123456' });
    adminTokenA = loginA.body.data.accessToken;

    const loginB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'beta.edusphere.io')
      .send({ email: 'admin@beta.edu', password: 'Pass@123456' });
    adminTokenB = loginB.body.data.accessToken;

    const loginParent = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'parent@alpha.edu', password: 'Pass@123456' });
    parentTokenA = loginParent.body.data.accessToken;

    const loginTeacher = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'teacher@alpha.edu', password: 'Pass@123456' });
    teacherTokenA = loginTeacher.body.data.accessToken;

    // 8. Seed Entities for Testing
    // Student in Tenant A (linked to Parent A)
    const sADoc = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      admissionNumber: 'ALPHA-ADM-001',
      studentId: 'ALPHA-STU-001',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: new Date('2014-01-01'),
        gender: Gender.FEMALE,
      },
      contactDetails: {
        primaryEmail: 'alice@alpha.edu',
        primaryPhone: '1112223333',
        emergencyPhone: '1112223333',
        currentAddress: 'Alpha Street 1',
      },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentAId = sADoc._id.toString();

    // Student A2 in Tenant A (Unrelated to Parent A)
    const sA2Doc = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      admissionNumber: 'ALPHA-ADM-002',
      studentId: 'ALPHA-STU-002',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Johnson',
        dateOfBirth: new Date('2014-02-02'),
        gender: Gender.MALE,
      },
      contactDetails: {
        primaryEmail: 'bob@alpha.edu',
        primaryPhone: '1112224444',
        emergencyPhone: '1112224444',
        currentAddress: 'Alpha Street 2',
      },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentA2Id = sA2Doc._id.toString();

    // Student in Tenant B
    const sBDoc = await Student.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      admissionNumber: 'BETA-ADM-001',
      studentId: 'BETA-STU-001',
      personalDetails: {
        firstName: 'Charlie',
        lastName: 'Brown',
        dateOfBirth: new Date('2014-03-03'),
        gender: Gender.MALE,
      },
      contactDetails: {
        primaryEmail: 'charlie@beta.edu',
        primaryPhone: '2223334444',
        emergencyPhone: '2223334444',
        currentAddress: 'Beta Street 1',
      },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentBId = sBDoc._id.toString();

    // Parent A record
    const gADoc = await Parent.create({
      tenantId: tenantAId,
      userId: parentUserA._id,
      guardianId: 'ALPHA-GRD-001',
      personalDetails: { firstName: 'Mary', lastName: 'Smith' },
      contactDetails: { email: 'parent@alpha.edu', phone: '1110009999', address: 'Alpha Street 1' },
      communicationPreferences: { email: true, sms: true, whatsapp: false },
    });
    guardianAId = gADoc._id.toString();

    // Parent B record
    const gBDoc = await Parent.create({
      tenantId: tenantBId,
      guardianId: 'BETA-GRD-001',
      personalDetails: { firstName: 'David', lastName: 'Brown' },
      contactDetails: { email: 'parent@beta.edu', phone: '2220009999', address: 'Beta Street 1' },
      communicationPreferences: { email: true, sms: true, whatsapp: false },
    });
    guardianBId = gBDoc._id.toString();

    // Link Parent A to Student A
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: sADoc._id,
      parentId: gADoc._id,
      relationshipType: 'MOTHER',
      isPrimaryContact: true,
      isEmergencyContact: true,
      canPickup: true,
      canAccessAcademicInformation: true,
      canAccessFinancialInformation: true,
      canReceiveNotifications: true,
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  // =========================================================================
  // 1. Multi-Tenant Isolation
  // =========================================================================
  describe('1. Multi-Tenant Isolation', () => {
    it('Tenant A cannot retrieve Tenant B student by ID (returns 403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentBId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${adminTokenA}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A cannot update Tenant B student (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${studentBId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .send({ personalDetails: { firstName: 'Hacked' } });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A cannot delete Tenant B student (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/students/${studentBId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${adminTokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Tenant A cannot link Tenant B guardian to Tenant A student (returns 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/students/${studentAId}/guardians`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .send({
          guardianId: guardianBId,
          relationshipType: GuardianRelationType.FATHER,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Anti-IDOR Parent-Child Authorization
  // =========================================================================
  describe('2. Anti-IDOR Parent-Child Authorization', () => {
    it('Parent A retrieves only their authorized children via /me/students', async () => {
      const res = await request(app)
        .get('/api/v1/me/students')
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${parentTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(studentAId);
      expect(res.body.data[0].personalDetails.firstName).toBe('Alice');
    });

    it('Parent A can view their own child via direct /students/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentAId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${parentTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(studentAId);
    });

    it('Parent A is blocked with 403 Forbidden when attempting to view unrelated student (Anti-IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentA2Id}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${parentTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('Parent A is blocked with 403 Forbidden when attempting to view student from another tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentBId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${parentTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. RBAC Privilege Escalation Prevention
  // =========================================================================
  describe('3. RBAC Privilege Escalation Prevention', () => {
    it('Teacher cannot delete a student (lacks student:delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/v1/students/${studentAId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacherTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Teacher cannot delete a guardian (lacks guardian:delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/v1/guardians/${guardianAId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacherTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Parent cannot create a new student record (lacks student:create permission)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${parentTokenA}`)
        .send({
          personalDetails: {
            firstName: 'Fake',
            lastName: 'Student',
            dateOfBirth: new Date(),
            gender: Gender.MALE,
          },
          contactDetails: { currentAddress: 'Street' },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
