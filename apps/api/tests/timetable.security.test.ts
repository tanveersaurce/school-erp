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
  Teacher,
  Student,
  Period,
  Classroom,
  Timetable,
  TimetableEntry,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  TenantPlan,
  TenantBillingStatus,
  AcademicStatus,
  PeriodType,
  RoomType,
  TimetableStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Timetable Security & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();
  const academicYearAId = new Types.ObjectId();
  let adminAToken: string;
  let teacherAToken: string;
  let studentAToken: string;
  let timetableAId: string;
  let periodAId: string;
  let roomAId: string;

  // Tenant B
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();
  const academicYearBId = new Types.ObjectId();
  let adminBToken: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    const passwordHash = await passwordService.hashPassword('Pass@123456');

    // 1. Seed Permissions & Roles for both tenants
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

    // Helper to seed roles for a tenant
    const seedRolesForTenant = async (tId: Types.ObjectId) => {
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
    };

    // 2. Setup Tenant A
    await Tenant.create({
      _id: tenantAId,
      name: 'Tenant Alpha',
      slug: 'tenant-a',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 500, modulesEnabled: ['ALL'] },
    });
    await seedRolesForTenant(tenantAId);

    await School.create({
      _id: schoolAId,
      tenantId: tenantAId,
      name: 'Alpha High',
      code: 'ALPHA-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@alpha.edu', phone: '1111111111' },
      address: { street: '1 Alpha St', city: 'CityA', state: 'StateA', postalCode: '001', country: 'UK' },
    });

    await Campus.create({
      _id: campusAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Campus',
      code: 'AC',
      status: CampusStatus.ACTIVE,
      address: { street: '1 Alpha St', city: 'CityA', state: 'StateA', postalCode: '001', country: 'UK' },
    });

    await AcademicYear.create({
      _id: academicYearAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: '2026-2027',
      code: 'AY-A-2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    });

    // Admin A
    const adminAUser = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@alpha.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminARole = await Role.findOne({ tenantId: tenantAId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenantAId, userId: adminAUser._id, roleId: adminARole!._id, schoolId: schoolAId });

    // Teacher A
    const teacherAUser = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher@alpha.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const teacherARole = await Role.findOne({ tenantId: tenantAId, name: 'TEACHER' });
    await UserRole.create({ tenantId: tenantAId, userId: teacherAUser._id, roleId: teacherARole!._id, schoolId: schoolAId, campusId: campusAId });
    await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: teacherAUser._id,
      employeeId: 'EMP-TCH-A1',
      department: 'Math',
      designation: 'Lecturer',
      joiningDate: new Date('2024-01-01'),
    });

    // Student A
    const studentAUser = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student@alpha.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const studentARole = await Role.findOne({ tenantId: tenantAId, name: 'STUDENT' });
    await UserRole.create({ tenantId: tenantAId, userId: studentAUser._id, roleId: studentARole!._id, schoolId: schoolAId, campusId: campusAId });
    await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: studentAUser._id,
      admissionNumber: 'ADM-A-01',
      personalDetails: { firstName: 'Amy', lastName: 'Pond', dateOfBirth: new Date('2010-01-01'), gender: 'FEMALE' },
      contactDetails: { currentAddress: '1 Alpha St' },
      currentStatus: 'ACTIVE',
    });

    // Seed Tenant A Timetable, Period, Room
    const periodA = await Period.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: 'Alpha Period 1',
      code: 'AP1',
      sequence: 1,
      startTime: '08:00',
      endTime: '08:45',
      duration: 45,
      type: PeriodType.TEACHING,
      status: AcademicStatus.ACTIVE,
    });
    periodAId = periodA._id.toString();

    const roomA = await Classroom.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: 'Alpha Room 1',
      code: 'AR1',
      capacity: 30,
      roomType: RoomType.CLASSROOM,
    });
    roomAId = roomA._id.toString();

    const ttA = await Timetable.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      name: 'Alpha Master Timetable',
      status: TimetableStatus.DRAFT,
      version: 1,
      isCurrent: false,
      effectiveFrom: new Date('2026-09-01'),
    });
    timetableAId = ttA._id.toString();

    // 3. Setup Tenant B
    await Tenant.create({
      _id: tenantBId,
      name: 'Tenant Beta',
      slug: 'tenant-b',
      plan: TenantPlan.STANDARD,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 200, modulesEnabled: ['ALL'] },
    });
    await seedRolesForTenant(tenantBId);

    await School.create({
      _id: schoolBId,
      tenantId: tenantBId,
      name: 'Beta High',
      code: 'BETA-01',
      affiliationBoard: 'ICSE',
      contact: { email: 'admin@beta.edu', phone: '2222222222' },
      address: { street: '2 Beta St', city: 'CityB', state: 'StateB', postalCode: '002', country: 'UK' },
    });

    await Campus.create({
      _id: campusBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'Beta Campus',
      code: 'BC',
      status: CampusStatus.ACTIVE,
      address: { street: '2 Beta St', city: 'CityB', state: 'StateB', postalCode: '002', country: 'UK' },
    });

    await AcademicYear.create({
      _id: academicYearBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      name: '2026-2027',
      code: 'AY-B-2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    });

    // Admin B
    const adminBUser = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@beta.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminBRole = await Role.findOne({ tenantId: tenantBId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenantBId, userId: adminBUser._id, roleId: adminBRole!._id, schoolId: schoolBId });

    // 4. Logins
    const loginAdminA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'tenant-a.edusphere.io')
      .send({ email: 'admin@alpha.edu', password: 'Pass@123456' });
    adminAToken = loginAdminA.body.data.accessToken;

    const loginTeacherA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'tenant-a.edusphere.io')
      .send({ email: 'teacher@alpha.edu', password: 'Pass@123456' });
    teacherAToken = loginTeacherA.body.data.accessToken;

    const loginStudentA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'tenant-a.edusphere.io')
      .send({ email: 'student@alpha.edu', password: 'Pass@123456' });
    studentAToken = loginStudentA.body.data.accessToken;

    const loginAdminB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'tenant-b.edusphere.io')
      .send({ email: 'admin@beta.edu', password: 'Pass@123456' });
    adminBToken = loginAdminB.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // Multi-Tenant Isolation Tests
  // =========================================================================
  describe('Multi-Tenant Boundary Protection', () => {
    it('Tenant B admin CANNOT view Tenant A timetable (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableAId}`)
        .set('Host', 'tenant-b.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant B admin CANNOT update Tenant A period (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/timetable/periods/${periodAId}`)
        .set('Host', 'tenant-b.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ name: 'Hacked Period' });

      expect(res.status).toBe(404);
    });

    it('Tenant B admin CANNOT delete Tenant A classroom (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/timetable/classrooms/${roomAId}`)
        .set('Host', 'tenant-b.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant B admin list query does NOT leak Tenant A timetables', async () => {
      const res = await request(app)
        .get('/api/v1/timetable/timetables')
        .set('Host', 'tenant-b.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).not.toContain(timetableAId);
    });
  });

  // =========================================================================
  // RBAC Role & Permission Security Tests
  // =========================================================================
  describe('RBAC Role & Permission Enforcement', () => {
    it('Student CANNOT create a period (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/timetable/periods')
        .set('Host', 'tenant-a.edusphere.io')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          campusId: campusAId.toString(),
          name: 'Unauthorized Period',
          code: 'UNAUTH',
          sequence: 10,
          startTime: '14:00',
          endTime: '15:00',
        });

      expect(res.status).toBe(403);
    });

    it('Student CANNOT create a classroom (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/timetable/classrooms')
        .set('Host', 'tenant-a.edusphere.io')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          campusId: campusAId.toString(),
          name: 'Student Club Room',
          code: 'SCR',
          capacity: 20,
        });

      expect(res.status).toBe(403);
    });

    it('Teacher CANNOT publish a timetable (requires timetable:publish - returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableAId}/publish`)
        .set('Host', 'tenant-a.edusphere.io')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(403);
    });

    it('Teacher CANNOT delete a timetable (requires timetable:delete - returns 403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/timetable/timetables/${timetableAId}`)
        .set('Host', 'tenant-a.edusphere.io')
        .set('Authorization', `Bearer ${teacherAToken}`);

      expect(res.status).toBe(403);
    });

    it('Unauthenticated requests are rejected with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/timetable/timetables')
        .set('Host', 'tenant-a.edusphere.io');

      expect(res.status).toBe(401);
    });
  });
});
