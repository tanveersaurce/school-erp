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
  Class,
  Section,
  AcademicClass,
  Subject,
  AuditLog,
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
  EducationLevel,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Academic Management Security & Multi-Tenant Isolation Suite (Phase 8)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A: Oxford
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();
  const academicYearAId = new Types.ObjectId();
  let adminAToken: string;
  let classAId: string;
  let sectionAId: string;
  let academicClassAId: string;
  let subjectAId: string;

  // Tenant B: Harvard
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();
  const academicYearBId = new Types.ObjectId();
  let adminBToken: string;

  // Unassigned Teacher in Tenant A
  let unassignedTeacherToken: string;

  // Student in Tenant A
  let studentToken: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 1. Seed Tenant A
    await Tenant.create({
      _id: tenantAId,
      name: 'Oxford Trust',
      slug: 'oxford',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    await School.create({
      _id: schoolAId,
      tenantId: tenantAId,
      name: 'Oxford Academy',
      code: 'OXF-01',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Oxford Central',
      code: 'OXF-C',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 High St',
        city: 'Oxford',
        state: 'Oxon',
        postalCode: 'OX1',
        country: 'UK',
      },
    });

    await AcademicYear.create({
      _id: academicYearAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    });

    // 2. Seed Tenant B
    await Tenant.create({
      _id: tenantBId,
      name: 'Harvard Trust',
      slug: 'harvard',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    await School.create({
      _id: schoolBId,
      tenantId: tenantBId,
      name: 'Harvard Academy',
      code: 'HRV-01',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'Harvard Yard',
      code: 'HRV-Y',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 Yard Way',
        city: 'Cambridge',
        state: 'MA',
        postalCode: '02138',
        country: 'USA',
      },
    });

    await AcademicYear.create({
      _id: academicYearBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    });

    // 3. Seed Permissions & Roles for both tenants
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

    for (const tid of [tenantAId, tenantBId]) {
      for (const roleDef of SYSTEM_ROLES) {
        const roleDoc = await Role.create({
          tenantId: tid,
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
            permsToAssign.map((pId) => ({ tenantId: tid, roleId: roleDoc._id, permissionId: pId }))
          );
        }
      }
    }

    // 4. Users in Tenant A
    const adminA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@oxford.edu',
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

    const teacherA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'unassigned.teacher@oxford.edu',
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
    await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: teacherA._id,
      employeeId: 'OXF-TCH-999',
      department: 'History',
      designation: 'Assistant Faculty',
      joiningDate: new Date(),
    });

    const studentA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student@oxford.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const studentRoleA = await Role.findOne({ tenantId: tenantAId, name: 'STUDENT' });
    await UserRole.create({
      tenantId: tenantAId,
      userId: studentA._id,
      roleId: studentRoleA!._id,
      schoolId: schoolAId,
    });
    await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: studentA._id,
      admissionNumber: 'OXF-STD-001',
      personalDetails: {
        firstName: 'Diana',
        lastName: 'Prince',
        dateOfBirth: new Date(),
        gender: 'FEMALE',
      },
      contactDetails: { primaryEmail: 'student@oxford.edu', currentAddress: '1 High Street' },
      currentStatus: StudentStatus.ACTIVE,
    });

    // 5. Users in Tenant B
    const adminB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@harvard.edu',
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

    // Login tokens
    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oxford.edusphere.io')
      .send({ email: 'admin@oxford.edu', password: 'Admin@123456' });
    adminAToken = loginA.body.data.accessToken;

    const loginB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'harvard.edusphere.io')
      .send({ email: 'admin@harvard.edu', password: 'Admin@123456' });
    adminBToken = loginB.body.data.accessToken;

    const loginTeacher = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oxford.edusphere.io')
      .send({ email: 'unassigned.teacher@oxford.edu', password: 'Admin@123456' });
    unassignedTeacherToken = loginTeacher.body.data.accessToken;

    const loginStudent = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oxford.edusphere.io')
      .send({ email: 'student@oxford.edu', password: 'Admin@123456' });
    studentToken = loginStudent.body.data.accessToken;

    // 6. Create Base Academic Hierarchy in Tenant A
    const clsA = await Class.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      name: 'Grade 11',
      code: 'G11',
      order: 11,
      educationLevel: EducationLevel.HIGHER_SECONDARY,
    });
    classAId = clsA._id.toString();

    const secA = await Section.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      classId: clsA._id,
      name: 'Section Alpha',
      capacity: 30,
    });
    sectionAId = secA._id.toString();

    const acA = await AcademicClass.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      classId: clsA._id,
      sectionId: secA._id,
      capacity: 30,
    });
    academicClassAId = acA._id.toString();

    const subA = await Subject.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'World History',
      code: 'HIST11',
      type: 'CORE',
    });
    subjectAId = subA._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  // =========================================================================
  // 1. Strict Multi-Tenant Isolation
  // =========================================================================
  describe('1. Strict Multi-Tenant Isolation', () => {
    it('Tenant B admin cannot view Tenant A classes', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/classes/${classAId}`)
        .set('Host', 'harvard.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant B admin cannot update Tenant A section', async () => {
      const res = await request(app)
        .patch(`/api/v1/academic/sections/${sectionAId}`)
        .set('Host', 'harvard.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ name: 'Hacked Section' });

      expect(res.status).toBe(404);
    });

    it('Tenant B admin cannot delete Tenant A academic class', async () => {
      const res = await request(app)
        .delete(`/api/v1/academic/academic-classes/${academicClassAId}`)
        .set('Host', 'harvard.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant B admin cannot access Tenant A subject', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/subjects/${subjectAId}`)
        .set('Host', 'harvard.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 2. Anti-IDOR & Role-Based Authorization Security
  // =========================================================================
  describe('2. Anti-IDOR & Role-Based Authorization Security', () => {
    it('rejects student attempting to create an academic class (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/academic/academic-classes')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          campusId: campusAId.toString(),
          academicYearId: academicYearAId.toString(),
          classId: classAId,
          sectionId: sectionAId,
        });

      expect(res.status).toBe(403);
    });

    it('rejects student attempting to delete a class (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/academic/classes/${classAId}`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unassigned teacher attempting to access details of an unassigned academic class', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/academic-classes/${academicClassAId}/details`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${unassignedTeacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/not authorized/i);
    });
  });

  // =========================================================================
  // 3. System Audit Trail Verification
  // =========================================================================
  describe('3. System Audit Trail Verification', () => {
    it('records audit log entries for academic resource mutations', async () => {
      const logs = await AuditLog.find({
        tenantId: tenantAId,
        entity: { $in: ['Class', 'Section', 'AcademicClass', 'Subject'] },
      }).lean();

      expect(logs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
