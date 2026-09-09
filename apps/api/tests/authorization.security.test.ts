import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Student,
  Parent,
  StudentParentRelation,
  Teacher,
  Class,
  Section,
  Subject,
  TeacherSubjectAssignment,
  StudentEnrollment,
  FeeInvoice,
  AcademicYear,
  Campus,
} from '@edusphere/database';
import { UserType, UserStatus, InvoiceStatus } from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
} from '../src/middlewares/authorize.js';
import { authenticate } from '../src/middlewares/authenticate.js';
import { resourcePolicy } from '../src/modules/rbac/policies/resource.policy.js';

describe('Security, IDOR & Multi-Tenant Authorization Suite (Phase 4)', () => {
  let replSet: MongoMemoryReplSet;
  const mainApp = createApp();

  // Tenant A
  const tenantAId = new Types.ObjectId('6a9fe236182646807d86ab27');
  const schoolAId = new Types.ObjectId('6a9fe237182646807d86ab92');

  // Tenant B
  const tenantBId = new Types.ObjectId('6a9fe238182646807d86ab33');
  const schoolBId = new Types.ObjectId('6a9fe239182646807d86ab44');

  let adminAToken: string;
  let adminBToken: string;
  let teacherAToken: string;
  let teacherAUserId: string;
  let parentAUserId: string;
  let studentAUserId: string;

  let tenantBRoleId: string;
  let studentAId: string;
  let studentBId: string;
  let classAId: string;
  let sectionAId: string;
  let sectionBId: string;
  let feeInvoiceAId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Setup Tenant A and Tenant B
    await Tenant.create([
      {
        _id: tenantAId,
        name: 'Tenant Alpha',
        slug: 'tenant-a',
        status: 'ACTIVE',
        subscriptionTier: 'ENTERPRISE',
      },
      {
        _id: tenantBId,
        name: 'Tenant Beta',
        slug: 'tenant-b',
        status: 'ACTIVE',
        subscriptionTier: 'ENTERPRISE',
      },
    ]);

    await School.create([
      {
        _id: schoolAId,
        tenantId: tenantAId,
        name: 'School Alpha',
        code: 'SCH-A',
        affiliationBoard: 'CBSE',
        status: 'ACTIVE',
      },
      {
        _id: schoolBId,
        tenantId: tenantBId,
        name: 'School Beta',
        code: 'SCH-B',
        affiliationBoard: 'CBSE',
        status: 'ACTIVE',
      },
    ]);

    const defaultPasswordHash = await passwordService.hashPassword('Pass@123456');

    // 2. Seed Permissions
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of SYSTEM_PERMISSIONS) {
      const doc = await Permission.create({
        resource: p.resource,
        action: p.action,
        permissionString: p.permissionString.toLowerCase().trim(),
        description: p.description,
        category: p.category,
      });
      permMap.set(p.permissionString.toLowerCase().trim(), doc._id as Types.ObjectId);
    }

    // 3. Roles in Tenant A
    const adminRoleA = await Role.create({
      tenantId: tenantAId,
      name: 'SCHOOL_ADMIN',
      isSystemRole: true,
      isDeleted: false,
    });
    const teacherRoleA = await Role.create({
      tenantId: tenantAId,
      name: 'TEACHER',
      isSystemRole: true,
      isDeleted: false,
    });

    // Assign full permissions to Admin A
    const allPermDocsA = Array.from(permMap.values()).map((pId) => ({
      tenantId: tenantAId,
      roleId: adminRoleA._id,
      permissionId: pId,
    }));
    await RolePermission.insertMany(allPermDocsA);

    // Assign student:read and attendance:mark to Teacher A
    await RolePermission.insertMany([
      {
        tenantId: tenantAId,
        roleId: teacherRoleA._id,
        permissionId: permMap.get('student:read')!,
      },
      {
        tenantId: tenantAId,
        roleId: teacherRoleA._id,
        permissionId: permMap.get('attendance:mark')!,
      },
    ]);

    // Roles in Tenant B
    const adminRoleB = await Role.create({
      tenantId: tenantBId,
      name: 'SCHOOL_ADMIN',
      isSystemRole: true,
      isDeleted: false,
    });
    const customRoleB = await Role.create({
      tenantId: tenantBId,
      name: 'Beta Custom Role',
      isSystemRole: false,
      isDeleted: false,
    });
    tenantBRoleId = customRoleB._id.toString();

    // 4. Users in Tenant A
    const userAdminA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@alpha.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
    });
    await UserRole.create({ tenantId: tenantAId, userId: userAdminA._id, roleId: adminRoleA._id });

    const userTeacherA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher@alpha.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: userTeacherA._id,
      roleId: teacherRoleA._id,
    });
    teacherAUserId = userTeacherA._id.toString();

    const userParentA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'parent@alpha.edu',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
    });
    parentAUserId = userParentA._id.toString();

    const userStudentA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student@alpha.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
    });
    studentAUserId = userStudentA._id.toString();

    // Users in Tenant B
    const userAdminB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@beta.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
    });
    await UserRole.create({ tenantId: tenantBId, userId: userAdminB._id, roleId: adminRoleB._id });

    // 5. Academic & Domain Data for ABAC checks
    const campusA = await Campus.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Main Campus',
      code: 'CMP-A',
      address: {
        street: '100 Alpha Road',
        city: 'Metropolis',
        state: 'State',
        postalCode: '123456',
        country: 'India',
      },
    });

    const academicYearA = await AcademicYear.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusA._id,
      name: '2026-2027',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    });

    const classA = await Class.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusA._id,
      academicYearId: academicYearA._id,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
    });
    classAId = classA._id.toString();

    const secA = await Section.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusA._id,
      academicYearId: academicYearA._id,
      classId: classA._id,
      name: 'A',
      capacity: 40,
    });
    sectionAId = secA._id.toString();

    const secB = await Section.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusA._id,
      academicYearId: academicYearA._id,
      classId: classA._id,
      name: 'B',
      capacity: 40,
    });
    sectionBId = secB._id.toString();

    const teacherProfileA = await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: userTeacherA._id,
      employeeId: 'TCH-001',
      department: 'Science',
      designation: 'Senior Teacher',
      joiningDate: new Date('2020-01-01'),
    });

    const subjectA = await Subject.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Physics',
      code: 'PHY-10',
    });

    // Assign Teacher A to Class 10 Section A ONLY
    await TeacherSubjectAssignment.create({
      tenantId: tenantAId,
      academicYearId: academicYearA._id,
      schoolId: schoolAId,
      teacherId: teacherProfileA._id,
      subjectId: subjectA._id,
      classId: classA._id,
      sectionId: secA._id,
    });

    // Student A in Tenant A
    const stuDocA = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: userStudentA._id,
      admissionNumber: 'ADM-001',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: new Date('2010-01-01'),
        gender: 'FEMALE',
      },
      contactDetails: {
        primaryPhone: '9876543210',
        emergencyPhone: '9876543211',
        currentAddress: '123 Test St',
      },
    });
    studentAId = stuDocA._id.toString();

    // Student B in Tenant B (Cross-tenant student)
    const stuDocB = await Student.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      admissionNumber: 'ADM-002',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Jones',
        dateOfBirth: new Date('2010-02-02'),
        gender: 'MALE',
      },
      contactDetails: {
        emergencyPhone: '9876543222',
        currentAddress: '456 Other St',
      },
    });
    studentBId = stuDocB._id.toString();

    // Enroll Student A into Section A
    await StudentEnrollment.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      studentId: stuDocA._id,
      academicYearId: academicYearA._id,
      classId: classA._id,
      sectionId: secA._id,
      rollNumber: 1,
      status: 'ENROLLED',
    });

    // Parent A in Tenant A linked to Student A
    const parentDocA = await Parent.create({
      tenantId: tenantAId,
      userId: userParentA._id,
      personalDetails: { firstName: 'John', lastName: 'Smith' },
      contactDetails: { email: 'parent@alpha.edu', phone: '9876543210', address: '123 Test St' },
    });

    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: stuDocA._id,
      parentId: parentDocA._id,
      relationshipType: 'FATHER',
      isPrimaryContact: true,
    });

    // Fee invoice for Student A
    const feeInv = await FeeInvoice.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      studentId: stuDocA._id,
      academicYearId: academicYearA._id,
      classId: classA._id,
      invoiceNumber: 'INV-001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subTotal: 5000,
      totalAmount: 5000,
      paidAmount: 0,
      balanceAmount: 5000,
      status: InvoiceStatus.ISSUED,
      lineItems: [
        {
          description: 'Tuition Fee',
          amount: 5000,
          discountAmount: 0,
          netAmount: 5000,
        },
      ],
    });
    feeInvoiceAId = feeInv._id.toString();

    // Authenticate
    const resA = await request(mainApp)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@alpha.edu', password: 'Pass@123456' });
    adminAToken = resA.body.data.accessToken;

    const resB = await request(mainApp)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@beta.edu', password: 'Pass@123456' });
    adminBToken = resB.body.data.accessToken;

    const resT = await request(mainApp)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@alpha.edu', password: 'Pass@123456' });
    teacherAToken = resT.body.data.accessToken;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  describe('1. Cross-Tenant Isolation (Anti-IDOR Defense)', () => {
    it('prevents Tenant A admin from viewing Tenant B role (returns 404)', async () => {
      const res = await request(mainApp)
        .get(`/api/v1/roles/${tenantBRoleId}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('prevents Tenant A admin from updating Tenant B role (returns 404)', async () => {
      const res = await request(mainApp)
        .put(`/api/v1/roles/${tenantBRoleId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'Hacked Role' });

      expect(res.status).toBe(404);
    });

    it('prevents Tenant A admin from deleting Tenant B role (returns 404)', async () => {
      const res = await request(mainApp)
        .delete(`/api/v1/roles/${tenantBRoleId}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(404);
    });

    it('prevents Tenant A from assigning Tenant B role to Tenant A user', async () => {
      const res = await request(mainApp)
        .post(`/api/v1/users/${teacherAUserId}/roles`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ roleId: tenantBRoleId });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/Role not found within this tenant/i);
    });

    it('strictly denies cross-tenant student access at the resource policy layer', async () => {
      // Admin of Tenant A attempting to access Student of Tenant B
      const canAccess = await resourcePolicy.canAccessStudent(
        {
          userId: 'user_admin_a',
          tenantId: tenantAId.toString(),
          userType: UserType.SCHOOL_ADMIN,
          sessionId: 'session_1',
          email: 'admin@alpha.edu',
        },
        studentBId
      );

      expect(canAccess).toBe(false);
    });
  });

  describe('2. Privilege Escalation Defense', () => {
    it('rejects role creation by Teacher without role:create (HTTP 403)', async () => {
      const res = await request(mainApp)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ name: 'Privilege Escalation Role' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('rejects permission mutation by Teacher without role:assign_permission (HTTP 403)', async () => {
      const rolesRes = await request(mainApp)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminAToken}`);
      const teacherRole = rolesRes.body.data.find((r: any) => r.name === 'TEACHER');

      const res = await request(mainApp)
        .put(`/api/v1/roles/${teacherRole.id}/permissions`)
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ permissionIds: [] });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('rejects role assignment by Teacher without user_role:assign (HTTP 403)', async () => {
      const rolesRes = await request(mainApp)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminAToken}`);
      const adminRole = rolesRes.body.data.find((r: any) => r.name === 'SCHOOL_ADMIN');

      const res = await request(mainApp)
        .post(`/api/v1/users/${teacherAUserId}/roles`)
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ roleId: adminRole.id });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });
  });

  describe('3. Resource-Level Authorization (ABAC Policies)', () => {
    it('Parent Linked Child Scope: allows Parent A to access linked Child A', async () => {
      const allowed = await resourcePolicy.canAccessStudent(
        {
          userId: parentAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.PARENT,
          sessionId: 'sess_p1',
          email: 'parent@alpha.edu',
        },
        studentAId
      );
      expect(allowed).toBe(true);
    });

    it('Parent Linked Child Scope: denies Parent A access to unlinked Child B', async () => {
      const allowed = await resourcePolicy.canAccessStudent(
        {
          userId: parentAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.PARENT,
          sessionId: 'sess_p1',
          email: 'parent@alpha.edu',
        },
        studentBId
      );
      expect(allowed).toBe(false);
    });

    it('Student Self Scope: allows Student A to access own record', async () => {
      const allowed = await resourcePolicy.canAccessStudent(
        {
          userId: studentAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.STUDENT,
          sessionId: 'sess_s1',
          email: 'student@alpha.edu',
        },
        studentAId
      );
      expect(allowed).toBe(true);
    });

    it('Student Self Scope: denies Student A access to another student record', async () => {
      const allowed = await resourcePolicy.canAccessStudent(
        {
          userId: studentAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.STUDENT,
          sessionId: 'sess_s1',
          email: 'student@alpha.edu',
        },
        studentBId
      );
      expect(allowed).toBe(false);
    });

    it('Teacher Assigned Section Scope: allows Teacher A to access assigned Section A attendance', async () => {
      const allowed = await resourcePolicy.canAccessAttendance(
        {
          userId: teacherAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.TEACHER,
          sessionId: 'sess_t1',
          email: 'teacher@alpha.edu',
        },
        classAId,
        sectionAId
      );
      expect(allowed).toBe(true);
    });

    it('Teacher Assigned Section Scope: denies Teacher A access to unassigned Section B attendance', async () => {
      const allowed = await resourcePolicy.canAccessAttendance(
        {
          userId: teacherAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.TEACHER,
          sessionId: 'sess_t1',
          email: 'teacher@alpha.edu',
        },
        classAId,
        sectionBId
      );
      expect(allowed).toBe(false);
    });

    it('Fee Invoice Scope: allows linked Parent to access student fee invoice', async () => {
      const allowed = await resourcePolicy.canAccessFee(
        {
          userId: parentAUserId,
          tenantId: tenantAId.toString(),
          userType: UserType.PARENT,
          sessionId: 'sess_p1',
          email: 'parent@alpha.edu',
        },
        feeInvoiceAId
      );
      expect(allowed).toBe(true);
    });
  });

  describe('4. Authorization Middlewares In Isolation', () => {
    // Spin up test router with various middleware guards
    const testApp = express();
    testApp.use(express.json());
    testApp.use(authenticate);

    testApp.get('/test/perm', requirePermission('student:read'), (_req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });

    testApp.get(
      '/test/any-perm',
      requireAnyPermission(['finance:manage', 'student:read']),
      (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      }
    );

    testApp.get(
      '/test/all-perms',
      requireAllPermissions(['student:read', 'finance:manage']),
      (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      }
    );

    testApp.get('/test/role', requireRole('TEACHER'), (_req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });

    it('requirePermission: allows user with granted permission', async () => {
      const res = await request(testApp)
        .get('/test/perm')
        .set('Authorization', `Bearer ${teacherAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('requireAnyPermission: allows when at least one permission matches', async () => {
      const res = await request(testApp)
        .get('/test/any-perm')
        .set('Authorization', `Bearer ${teacherAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('requireAllPermissions: rejects when one required permission is missing (403)', async () => {
      const res = await request(testApp)
        .get('/test/all-perms')
        .set('Authorization', `Bearer ${teacherAToken}`);
      expect(res.status).toBe(403);
    });

    it('requireRole: allows user with matching role', async () => {
      const res = await request(testApp)
        .get('/test/role')
        .set('Authorization', `Bearer ${teacherAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('requireRole: rejects user without matching role (403)', async () => {
      const res = await request(testApp)
        .get('/test/role')
        .set('Authorization', `Bearer ${adminBToken}`);
      expect(res.status).toBe(403);
    });
  });
});
