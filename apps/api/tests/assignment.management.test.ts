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
  AcademicStatus,
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentSubmissionStatus,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 11: Assignment Management Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let schoolAdminToken: string;
  let teacherUserToken: string;
  let studentUserToken: string;
  let teacherProfileId: string;
  let teacherUserId: string;
  let studentUserId: string;
  let studentProfileId: string;

  let academicClassId: string;
  let classId: string;
  let sectionId: string;
  let subjectId: string;

  let createdAssignmentId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Oakridge International Academy',
      slug: 'oakridge',
      customDomain: 'oakridge.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // 2. Seed School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Oakridge Main Campus School',
      code: 'OAKRIDGE',
      affiliationBoard: 'CBSE',
      timezone: 'UTC',
      settings: {
        workingDays: [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY],
      },
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Oakridge North Campus',
      code: 'ONC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '100 Heritage Blvd',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
      },
    });

    // 4. Seed Academic Year
    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY2026',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
    });

    // 5. Seed Permissions & Roles
    const createdPermissions = await Permission.insertMany(
      SYSTEM_PERMISSIONS.map((p) => ({
        tenantId,
        resource: p.resource,
        action: p.action,
        permissionString: p.permissionString,
        description: p.description || p.permissionString,
        category: p.category,
      }))
    );

    const permissionMap = new Map<string, Types.ObjectId>();
    createdPermissions.forEach((p) => permissionMap.set(p.permissionString.toLowerCase().trim(), p._id));

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
        name: r.name,
        userType: r.userType,
        description: r.description,
        isSystem: true,
      }))
    );

    const allRolePerms: any[] = [];
    for (const roleDef of SYSTEM_ROLES) {
      const createdRole = roleDocs.find((rd) => rd.name === roleDef.name);
      if (!createdRole) continue;
      const roleId = createdRole._id;

      if (roleDef.name === 'SUPER_ADMIN') {
        for (const p of createdPermissions) {
          allRolePerms.push({ tenantId, roleId, permissionId: p._id });
        }
      } else {
        for (const pStr of roleDef.permissions) {
          const pId = permissionMap.get(pStr.toLowerCase().trim());
          if (pId) {
            allRolePerms.push({ tenantId, roleId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(allRolePerms);

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 6. Seed Admin
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@oakridge.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminRole = await Role.findOne({ tenantId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId, userId: adminUser._id, roleId: adminRole!._id, schoolId });

    // 7. Seed Teacher
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher.watson@oakridge.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'Emily',
      lastName: 'Watson',
    });
    teacherUserId = teacherUser._id.toString();
    const teacherRole = await Role.findOne({ tenantId, name: 'TEACHER' });
    await UserRole.create({ tenantId, userId: teacherUser._id, roleId: teacherRole!._id, schoolId, campusId });

    const teacherProfile = await Teacher.create({
      tenantId,
      schoolId,
      userId: teacherUser._id,
      employeeId: 'EMP-TCH-301',
      department: 'Mathematics',
      designation: 'Senior Faculty',
      joiningDate: new Date('2024-01-01'),
    });
    teacherProfileId = teacherProfile._id.toString();

    // 8. Seed Class, Section, AcademicClass, Subject
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 10',
      code: 'G10',
      stage: EducationLevel.SECONDARY,
      order: 10,
    });
    classId = classDoc._id.toString();

    const sectionDoc = await Section.create({
      tenantId,
      schoolId,
      classId: classDoc._id,
      name: 'Section A',
      code: 'A',
      capacity: 40,
    });
    sectionId = sectionDoc._id.toString();

    const acDoc = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      classTeacherId: teacherProfile._id,
      capacity: 40,
    });
    academicClassId = acDoc._id.toString();

    const subjectDoc = await Subject.create({
      tenantId,
      schoolId,
      name: 'Advanced Mathematics',
      code: 'MATH101',
      creditHours: 4,
    });
    subjectId = subjectDoc._id.toString();

    await TeacherSubjectAssignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      subjectId: subjectDoc._id,
      teacherId: teacherProfile._id,
      status: 'ACTIVE',
    });

    // 9. Seed Student
    const studentUser = await User.create({
      tenantId,
      schoolId,
      email: 'student.ben@oakridge.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'Benjamin',
      lastName: 'Hayes',
    });
    studentUserId = studentUser._id.toString();
    const studentRole = await Role.findOne({ tenantId, name: 'STUDENT' });
    await UserRole.create({ tenantId, userId: studentUser._id, roleId: studentRole!._id, schoolId, campusId });

    const studentProfile = await Student.create({
      tenantId,
      schoolId,
      campusId,
      userId: studentUser._id,
      admissionNumber: 'ADM-2026-001',
      studentId: 'STU-2026-001',
      personalDetails: {
        firstName: 'Benjamin',
        lastName: 'Hayes',
        dateOfBirth: new Date('2010-08-15'),
        gender: 'MALE',
      },
      contactDetails: {
        primaryEmail: 'student.ben@oakridge.edu',
        primaryPhone: '9876543210',
        currentAddress: { street: '42 Elm St', city: 'Metro', state: 'State', postalCode: '10001' },
      },
    });
    studentProfileId = studentProfile._id.toString();

    await StudentEnrollment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: studentProfile._id,
      academicYearId,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      rollNumber: 5,
      status: 'ENROLLED',
    });

    // 10. Authenticate & Obtain Tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'admin@oakridge.edu', password: 'Admin@123456' });
    schoolAdminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'teacher.watson@oakridge.edu', password: 'Admin@123456' });
    teacherUserToken = teacherLogin.body.data.accessToken;

    const studentLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'student.ben@oakridge.edu', password: 'Admin@123456' });
    studentUserToken = studentLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Assignment CRUD & Lifecycle Tests
  // =========================================================================

  it('should allow authorized teacher to create a draft assignment', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        subjectId,
        title: 'Quadratic Equations Homework',
        description: 'Complete problem set 3A from textbook.',
        assignmentType: AssignmentType.HOMEWORK,
        dueDate: '2026-10-15',
        dueTime: '23:59',
        maxScore: 100,
        submissionType: SubmissionType.BOTH,
        allowLateSubmission: true,
        latePolicy: { deductionPercentage: 10, maxLateDays: 3 },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(AssignmentStatus.DRAFT);
    expect(res.body.data.title).toBe('Quadratic Equations Homework');
    expect(res.body.data.maxScore).toBe(100);
    expect(res.body.data.allowLateSubmission).toBe(true);
    createdAssignmentId = res.body.data.id;
  });

  it('should allow teacher to update draft assignment details', async () => {
    const res = await request(app)
      .patch(`/api/v1/assignments/${createdAssignmentId}`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        title: 'Quadratic Equations & Polynomials Homework',
        maxScore: 50,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Quadratic Equations & Polynomials Homework');
    expect(res.body.data.maxScore).toBe(50);
  });

  it('should allow teacher to publish assignment', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/publish`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(AssignmentStatus.PUBLISHED);
    expect(res.body.data.publishedAt).toBeDefined();
  });

  it('should list assignments with server-side pagination and filters', async () => {
    const res = await request(app)
      .get('/api/v1/assignments')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .query({ academicClassId, status: AssignmentStatus.PUBLISHED });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  // =========================================================================
  // 2. Student Submission Workflows
  // =========================================================================

  it('should allow enrolled student to save a draft submission', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/submissions/draft`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentUserToken}`)
      .send({
        textResponse: 'Working on quadratic roots x = (-b +- sqrt(b^2-4ac))/2a...',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(AssignmentSubmissionStatus.DRAFT);
    expect(res.body.data.textResponse).toContain('Working on quadratic roots');
  });

  let submissionId: string;

  it('should allow enrolled student to finalize and submit assignment', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/submissions/submit`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentUserToken}`)
      .send({
        textResponse: 'Here are the completed solutions for problem set 3A.',
        attachments: [
          {
            id: 'att_001',
            fileName: 'math_solution.pdf',
            fileUrl: 'https://storage.edusphere.io/oakridge/math_solution.pdf',
            fileType: 'application/pdf',
            fileSize: 1024 * 500,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(AssignmentSubmissionStatus.SUBMITTED);
    expect(res.body.data.attachments).toHaveLength(1);
    expect(res.body.data.lateSubmission).toBe(false);
    submissionId = res.body.data.id;
  });

  it('should preserve submission attempt history on resubmission', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/submissions/submit`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentUserToken}`)
      .send({
        textResponse: 'Revised submission with correction for question 4.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attemptNumber).toBe(2);
    expect(res.body.data.attempts).toHaveLength(2);
  });

  // =========================================================================
  // 3. Late Submission Policy Enforcement
  // =========================================================================

  it('should flag lateSubmission when submitted after due date if allowed', async () => {
    // Create an assignment whose dueAt is already in the past, with allowLateSubmission = true
    const pastDue = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const pastAssignment = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      subjectId,
      teacherId: teacherProfileId,
      title: 'Past Due Homework with Late Allowed',
      description: 'Late submissions permitted with 10% penalty.',
      dueDate: pastDue,
      dueTime: '12:00',
      dueAt: pastDue,
      maxScore: 100,
      status: AssignmentStatus.PUBLISHED,
      allowLateSubmission: true,
      createdBy: teacherUserId,
    });

    const res = await request(app)
      .post(`/api/v1/assignments/${pastAssignment._id}/submissions/submit`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentUserToken}`)
      .send({ textResponse: 'Submitting 1 hour late.' });

    expect(res.status).toBe(201);
    expect(res.body.data.lateSubmission).toBe(true);
    expect(res.body.data.status).toBe(AssignmentSubmissionStatus.LATE);
  });

  it('should reject submission when submitted after due date if allowLateSubmission is false', async () => {
    const pastDue = new Date(Date.now() - 3600 * 1000);
    const lockedAssignment = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      subjectId,
      teacherId: teacherProfileId,
      title: 'Strict Deadline Homework',
      description: 'Zero tolerance for late submissions.',
      dueDate: pastDue,
      dueTime: '12:00',
      dueAt: pastDue,
      maxScore: 100,
      status: AssignmentStatus.PUBLISHED,
      allowLateSubmission: false, // Strict deadline
      createdBy: teacherUserId,
    });

    const res = await request(app)
      .post(`/api/v1/assignments/${lockedAssignment._id}/submissions/submit`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentUserToken}`)
      .send({ textResponse: 'Attempting to submit late.' });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/Submissions are closed/);
  });

  // =========================================================================
  // 4. Teacher Grading & Feedback Tests
  // =========================================================================

  it('should allow teacher to grade submission and provide feedback', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/submissions/${submissionId}/grade`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        score: 45, // Out of maxScore 50
        feedback: 'Excellent proofs for questions 1-4. Good neatness.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(AssignmentSubmissionStatus.GRADED);
    expect(res.body.data.score).toBe(45);
    expect(res.body.data.feedback).toContain('Excellent proofs');
    expect(res.body.data.gradedBy).toBeDefined();
    expect(res.body.data.gradedAt).toBeDefined();
  });

  it('should reject grading with score exceeding maxScore', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/submissions/${submissionId}/grade`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        score: 999, // Max is 50
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/maximum possible score/);
  });

  it('should allow teacher to return submission with revision feedback', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/submissions/${submissionId}/return`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        feedback: 'Please re-check the quadratic formula discriminant calculation.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(AssignmentSubmissionStatus.RETURNED);
    expect(res.body.data.feedback).toContain('discriminant calculation');
  });

  // =========================================================================
  // 5. Assignment Closure & Archiving
  // =========================================================================

  it('should allow teacher to close assignment to block further activity', async () => {
    const res = await request(app)
      .post(`/api/v1/assignments/${createdAssignmentId}/close`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(AssignmentStatus.CLOSED);
  });

  // =========================================================================
  // 6. Dashboards & Analytics
  // =========================================================================

  it('should retrieve teacher assignment dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/v1/assignments/dashboard/teacher')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalClosed).toBeGreaterThanOrEqual(1);
    expect(res.body.data.upcomingDeadlines).toBeDefined();
    expect(res.body.data.recentSubmissions).toBeDefined();
  });

  it('should retrieve student personal assignments with authoritative statuses', async () => {
    const res = await request(app)
      .get('/api/v1/assignments/my/list')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const item = res.body.data[0];
    expect(item.assignment).toBeDefined();
    expect(item.studentStatus).toBeDefined();
  });
});
