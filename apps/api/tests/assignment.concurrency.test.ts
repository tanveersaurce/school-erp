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
  AssignmentType,
  AssignmentStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 11: Assignment Concurrency & Idempotency Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let studentToken: string;
  let assignmentId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
    await Assignment.init();
    await AssignmentSubmission.init();

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    await Tenant.create({
      _id: tenantId,
      name: 'Concurrency Academy',
      slug: 'concurrency',
      customDomain: 'concurrency.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Concurrency School',
      code: 'CS',
      affiliationBoard: 'CBSE',
      timezone: 'UTC',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'CC1',
      status: CampusStatus.ACTIVE,
      address: {
        street: '100 Heritage Blvd',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
      },
    });

    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
    });

    const perms = await Permission.insertMany(
      SYSTEM_PERMISSIONS.map((p) => ({
        tenantId,
        resource: p.resource,
        action: p.action,
        permissionString: p.permissionString,
        description: p.description || p.permissionString,
        category: p.category,
      }))
    );
    const permMap = new Map<string, Types.ObjectId>();
    perms.forEach((p) => permMap.set(p.permissionString.toLowerCase().trim(), p._id));

    const roles = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
        name: r.name,
        userType: r.userType,
        description: r.description,
        isSystem: true,
      }))
    );

    const rolePerms: any[] = [];
    for (const rDef of SYSTEM_ROLES) {
      const rDoc = roles.find((r) => r.name === rDef.name);
      if (!rDoc) continue;
      if (rDef.name === 'SUPER_ADMIN') {
        perms.forEach((p) => rolePerms.push({ tenantId, roleId: rDoc._id, permissionId: p._id }));
      } else {
        rDef.permissions.forEach((pStr) => {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) rolePerms.push({ tenantId, roleId: rDoc._id, permissionId: pId });
        });
      }
    }
    await RolePermission.insertMany(rolePerms);

    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher@concurrency.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const teacherRole = roles.find((r) => r.name === 'TEACHER');
    await UserRole.create({ tenantId, userId: teacherUser._id, roleId: teacherRole!._id });
    const teacherProf = await Teacher.create({
      tenantId,
      schoolId,
      userId: teacherUser._id,
      employeeId: 'EMP-C1',
      department: 'Computer Science',
      designation: 'Faculty',
      joiningDate: new Date('2023-01-01'),
    });

    const classDoc = await Class.create({ tenantId, schoolId, name: 'Grade 10', code: 'G10', order: 10 });
    const secDoc = await Section.create({ tenantId, schoolId, classId: classDoc._id, name: 'A', code: 'A' });
    const acDoc = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      sectionId: secDoc._id,
      classTeacherId: teacherProf._id,
    });
    const subjDoc = await Subject.create({ tenantId, schoolId, name: 'Computer Science', code: 'CS101' });

    await TeacherSubjectAssignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: secDoc._id,
      subjectId: subjDoc._id,
      teacherId: teacherProf._id,
      status: 'ACTIVE',
    });

    const stuUser = await User.create({
      tenantId,
      schoolId,
      email: 'student@concurrency.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const stuRole = roles.find((r) => r.name === 'STUDENT');
    await UserRole.create({ tenantId, userId: stuUser._id, roleId: stuRole!._id });
    const stuProf = await Student.create({
      tenantId,
      schoolId,
      campusId,
      userId: stuUser._id,
      admissionNumber: 'ADM-C1',
      studentId: 'STU-C1',
      personalDetails: {
        firstName: 'Concurrent',
        lastName: 'Sam',
        gender: 'MALE',
        dateOfBirth: new Date('2010-01-01'),
      },
      contactDetails: {
        primaryEmail: 'student@concurrency.edu',
        currentAddress: {
          street: '789 Concurrency Way',
          city: 'City',
          state: 'State',
          postalCode: '12345',
        },
      },
    });

    await StudentEnrollment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: stuProf._id,
      academicYearId,
      academicClassId: acDoc._id,
      status: 'ENROLLED',
    });

    const assign = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId: acDoc._id,
      subjectId: subjDoc._id,
      teacherId: teacherProf._id,
      title: 'Operating Systems Concurrency Assignment',
      description: 'Semaphores and Mutexes.',
      dueDate: new Date(Date.now() + 86400 * 7 * 1000),
      dueTime: '23:59',
      dueAt: new Date(Date.now() + 86400 * 7 * 1000),
      maxScore: 100,
      status: AssignmentStatus.PUBLISHED,
      createdBy: teacherUser._id,
    });
    assignmentId = assign._id.toString();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'concurrency.edusphere.io')
      .send({ email: 'student@concurrency.edu', password: 'Admin@123456' });
    studentToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('should handle duplicate submission retries idempotently with the same idempotencyKey', async () => {
    const idempotencyKey = `retry_key_${Date.now()}`;

    // Parallel requests simulating rapid double-click or network retry
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/assignments/${assignmentId}/submissions/submit`)
        .set('Host', 'concurrency.edusphere.io')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          textResponse: 'Idempotent submission content.',
          idempotencyKey,
        }),
      request(app)
        .post(`/api/v1/assignments/${assignmentId}/submissions/submit`)
        .set('Host', 'concurrency.edusphere.io')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          textResponse: 'Idempotent submission content.',
          idempotencyKey,
        }),
    ]);

    // Both requests must succeed (one created, one returned via idempotency key)
    expect([200, 201]).toContain(res1.status);
    expect([200, 201]).toContain(res2.status);

    // Only one submission document should exist in the database
    const totalDocs = await AssignmentSubmission.countDocuments({
      tenantId,
      assignmentId,
      isDeleted: false,
    });
    expect(totalDocs).toBe(1);
  });
});
