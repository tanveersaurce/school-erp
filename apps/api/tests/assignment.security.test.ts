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
  Parent,
  StudentParentRelation,
  StudentEnrollment,
  Class,
  Section,
  AcademicClass,
  Subject,
  TeacherSubjectAssignment,
  Assignment,
  AssignmentSubmission,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  TenantPlan,
  TenantBillingStatus,
  EducationLevel,
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentSubmissionStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 11: Assignment Security & ABAC Authorization Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantAId = new Types.ObjectId();
  const tenantBId = new Types.ObjectId();

  let teacherAToken: string;
  let teacherBToken: string;
  let studentAToken: string;
  let studentBToken: string;
  let parentAToken: string;
  let parentBToken: string;

  let assignmentAId: string;
  let draftAssignmentAId: string;
  let submissionAId: string;
  let studentAId: string;
  let studentBId: string;
  let classAId: string;
  let subjectAId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 1. Seed Tenant A
    await Tenant.create({
      _id: tenantAId,
      name: 'Tenant Alpha School System',
      slug: 'alpha',
      customDomain: 'alpha.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // 2. Seed Tenant B
    await Tenant.create({
      _id: tenantBId,
      name: 'Tenant Beta Academy',
      slug: 'beta',
      customDomain: 'beta.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // Seed permissions & roles in Tenant A
    const permsA = await Permission.insertMany(
      SYSTEM_PERMISSIONS.map((p) => ({
        tenantId: tenantAId,
        resource: p.resource,
        action: p.action,
        permissionString: p.permissionString,
        description: p.description || p.permissionString,
        category: p.category,
      }))
    );
    const permMapA = new Map<string, Types.ObjectId>();
    permsA.forEach((p) => permMapA.set(p.permissionString.toLowerCase().trim(), p._id));

    const rolesA = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenantAId,
        name: r.name,
        userType: r.userType,
        description: r.description,
        isSystem: true,
      }))
    );

    const rolePermsA: any[] = [];
    for (const rDef of SYSTEM_ROLES) {
      const rDoc = rolesA.find((r) => r.name === rDef.name);
      if (!rDoc) continue;
      if (rDef.name === 'SUPER_ADMIN') {
        permsA.forEach((p) => rolePermsA.push({ tenantId: tenantAId, roleId: rDoc._id, permissionId: p._id }));
      } else {
        rDef.permissions.forEach((pStr) => {
          const pId = permMapA.get(pStr.toLowerCase().trim());
          if (pId) rolePermsA.push({ tenantId: tenantAId, roleId: rDoc._id, permissionId: pId });
        });
      }
    }
    await RolePermission.insertMany(rolePermsA);

    // Seed School, Campus, AY for Tenant A
    const schoolA = await School.create({
      tenantId: tenantAId,
      name: 'Alpha High',
      code: 'ALPHAHIGH',
      affiliationBoard: 'CBSE',
      timezone: 'UTC',
    });

    const campusA = await Campus.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      name: 'Alpha Campus',
      code: 'AC1',
      status: CampusStatus.ACTIVE,
      address: {
        street: '100 Heritage Blvd',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
      },
    });

    const ayA = await AcademicYear.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      name: '2026-2027',
      code: 'AY26',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
    });

    const classA = await Class.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
    });

    const secA = await Section.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      classId: classA._id,
      name: 'Section A',
      code: 'A',
    });

    const subjA = await Subject.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      name: 'Physics',
      code: 'PHY101',
    });
    subjectAId = subjA._id.toString();

    // Teacher A (assigned)
    const userTeacherA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      email: 'teacher.a@alpha.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const teacherRoleA = rolesA.find((r) => r.name === 'TEACHER');
    await UserRole.create({ tenantId: tenantAId, userId: userTeacherA._id, roleId: teacherRoleA!._id });
    const teacherProfA = await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      userId: userTeacherA._id,
      employeeId: 'EMP-A1',
      department: 'Physics',
      designation: 'Faculty',
      joiningDate: new Date('2023-01-01'),
    });

    const acA = await AcademicClass.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      academicYearId: ayA._id,
      classId: classA._id,
      sectionId: secA._id,
      classTeacherId: teacherProfA._id,
    });
    classAId = acA._id.toString();

    await TeacherSubjectAssignment.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      academicYearId: ayA._id,
      academicClassId: acA._id,
      classId: classA._id,
      sectionId: secA._id,
      subjectId: subjA._id,
      teacherId: teacherProfA._id,
      status: 'ACTIVE',
    });

    // Teacher B (unassigned / unrelated teacher in Tenant A)
    const userTeacherB = await User.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      email: 'teacher.b@alpha.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    await UserRole.create({ tenantId: tenantAId, userId: userTeacherB._id, roleId: teacherRoleA!._id });
    await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      userId: userTeacherB._id,
      employeeId: 'EMP-B1',
      department: 'Chemistry',
      designation: 'Faculty',
      joiningDate: new Date('2023-01-01'),
    });

    // Student A (enrolled in Class A)
    const userStudentA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      email: 'student.a@alpha.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const studentRoleA = rolesA.find((r) => r.name === 'STUDENT');
    await UserRole.create({ tenantId: tenantAId, userId: userStudentA._id, roleId: studentRoleA!._id });
    const stuProfA = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      userId: userStudentA._id,
      admissionNumber: 'ADM-A1',
      studentId: 'STU-A1',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'A',
        gender: 'FEMALE',
        dateOfBirth: new Date('2010-05-15'),
      },
      contactDetails: {
        primaryEmail: 'student.a@alpha.edu',
        currentAddress: {
          street: '123 Test St',
          city: 'City',
          state: 'State',
          postalCode: '12345',
        },
      },
    });
    studentAId = stuProfA._id.toString();

    await StudentEnrollment.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      studentId: stuProfA._id,
      academicYearId: ayA._id,
      academicClassId: acA._id,
      status: 'ENROLLED',
    });

    // Student B (enrolled elsewhere / peer)
    const userStudentB = await User.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      email: 'student.b@alpha.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    await UserRole.create({ tenantId: tenantAId, userId: userStudentB._id, roleId: studentRoleA!._id });
    const stuProfB = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      userId: userStudentB._id,
      admissionNumber: 'ADM-B1',
      studentId: 'STU-B1',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'B',
        gender: 'MALE',
        dateOfBirth: new Date('2010-08-20'),
      },
      contactDetails: {
        primaryEmail: 'student.b@alpha.edu',
        currentAddress: {
          street: '456 Test Ave',
          city: 'City',
          state: 'State',
          postalCode: '12345',
        },
      },
    });
    studentBId = stuProfB._id.toString();

    // Parent A (parent of Student A only)
    const userParentA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      email: 'parent.a@alpha.edu',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const parentRoleA = rolesA.find((r) => r.name === 'PARENT');
    await UserRole.create({ tenantId: tenantAId, userId: userParentA._id, roleId: parentRoleA!._id });
    const parentProfA = await Parent.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      userId: userParentA._id,
      guardianId: 'GRD-A1',
      personalDetails: { firstName: 'Parent', lastName: 'Alpha' },
      contactDetails: { email: 'parent.a@alpha.edu', phone: '1111111111', address: '1 Main St' },
    });
    await StudentParentRelation.create({
      tenantId: tenantAId,
      parentId: parentProfA._id,
      studentId: stuProfA._id,
      relationshipType: 'FATHER',
    });

    // Parent B (parent of Student B only)
    const userParentB = await User.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      email: 'parent.b@alpha.edu',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    await UserRole.create({ tenantId: tenantAId, userId: userParentB._id, roleId: parentRoleA!._id });
    const parentProfB = await Parent.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      userId: userParentB._id,
      guardianId: 'GRD-B1',
      personalDetails: { firstName: 'Parent', lastName: 'Beta' },
      contactDetails: { email: 'parent.b@alpha.edu', phone: '2222222222', address: '2 Main St' },
    });
    await StudentParentRelation.create({
      tenantId: tenantAId,
      parentId: parentProfB._id,
      studentId: stuProfB._id,
      relationshipType: 'MOTHER',
    });

    // Create Published Assignment in Tenant A
    const assignA = await Assignment.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      academicYearId: ayA._id,
      academicClassId: acA._id,
      subjectId: subjA._id,
      teacherId: teacherProfA._id,
      title: 'Published Physics Lab Assignment',
      description: 'Optics lab.',
      dueDate: new Date('2026-10-30'),
      dueTime: '23:59',
      dueAt: new Date('2026-10-30T23:59:59.000Z'),
      maxScore: 100,
      status: AssignmentStatus.PUBLISHED,
      createdBy: userTeacherA._id,
    });
    assignmentAId = assignA._id.toString();

    // Create Draft Assignment in Tenant A
    const draftA = await Assignment.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      academicYearId: ayA._id,
      academicClassId: acA._id,
      subjectId: subjA._id,
      teacherId: teacherProfA._id,
      title: 'Unpublished Draft Homework',
      description: 'Draft notes.',
      dueDate: new Date('2026-10-30'),
      dueTime: '23:59',
      dueAt: new Date('2026-10-30T23:59:59.000Z'),
      maxScore: 100,
      status: AssignmentStatus.DRAFT,
      createdBy: userTeacherA._id,
    });
    draftAssignmentAId = draftA._id.toString();

    // Create Submission for Student A
    const subA = await AssignmentSubmission.create({
      tenantId: tenantAId,
      schoolId: schoolA._id,
      campusId: campusA._id,
      assignmentId: assignA._id,
      studentId: stuProfA._id,
      status: AssignmentSubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
      textResponse: 'Alice submission on optics.',
    });
    submissionAId = subA._id.toString();

    // Authenticate all users
    const logTeacherA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'teacher.a@alpha.edu', password: 'Admin@123456' });
    teacherAToken = logTeacherA.body.data.accessToken;

    const logTeacherB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'teacher.b@alpha.edu', password: 'Admin@123456' });
    teacherBToken = logTeacherB.body.data.accessToken;

    const logStudentA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'student.a@alpha.edu', password: 'Admin@123456' });
    studentAToken = logStudentA.body.data.accessToken;

    const logStudentB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'student.b@alpha.edu', password: 'Admin@123456' });
    studentBToken = logStudentB.body.data.accessToken;

    const logParentA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'parent.a@alpha.edu', password: 'Admin@123456' });
    parentAToken = logParentA.body.data.accessToken;

    const logParentB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'parent.b@alpha.edu', password: 'Admin@123456' });
    parentBToken = logParentB.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // Security Tests
  // =========================================================================

  it('should prevent unassigned teacher from creating assignments for a class/subject', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${teacherBToken}`)
      .send({
        academicClassId: classAId,
        subjectId: subjectAId,
        title: 'Unauthorized Homework',
        description: 'Should fail.',
        dueDate: '2026-11-01',
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.message || res.body.message).toMatch(/not authorized to create or manage assignments/);
  });

  it('should prevent students from viewing unpublished draft assignments', async () => {
    const res = await request(app)
      .get(`/api/v1/assignments/${draftAssignmentAId}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error?.message || res.body.message).toMatch(/cannot access unpublished draft assignments/);
  });

  it('should prevent unenrolled student from submitting an assignment', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${assignmentAId}/submissions/submit`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentBToken}`) // Student B is not enrolled in Class A
      .send({ textResponse: 'Illegal submission attempt.' });

    expect(res.status).toBe(403);
    expect(res.body.error?.message || res.body.message).toMatch(/not actively enrolled in this class/);
  });

  it('should prevent Student B from viewing Student A submission (IDOR protection)', async () => {
    const res = await request(app)
      .get(`/api/v1/assignments/${assignmentAId}/submissions/${submissionAId}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error?.message || res.body.message).toMatch(/only access your own submissions/);
  });

  it('should prevent Parent B from viewing Student A assignments (Parent child isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/assignments/student/${studentAId}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${parentBToken}`); // Parent B is not linked to Student A

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/only authorized to view your registered children/);
  });

  it('should allow Parent A to view Student A assignments (Authorized parent access)', async () => {
    const res = await request(app)
      .get(`/api/v1/assignments/student/${studentAId}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${parentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('should prevent students from grading submissions (Privilege escalation)', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${assignmentAId}/submissions/${submissionAId}/grade`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ score: 100, feedback: 'Self graded' });

    expect(res.status).toBe(403);
  });

  it('should prevent cross-tenant assignment access (Tenant isolation)', async () => {
    // Attempting to access Tenant A's assignment from Tenant B's domain
    const res = await request(app)
      .get(`/api/v1/assignments/${assignmentAId}`)
      .set('Host', 'beta.edusphere.io')
      .set('Authorization', `Bearer ${teacherAToken}`);

    expect(res.status).toBe(403); // Cross-tenant blocked by tenant verification middleware
  });
});
