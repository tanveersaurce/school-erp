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
  GradingScheme,
  Exam,
  ExamSchedule,
  ExamMark,
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
  ExamType,
  ExamStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 12: Examination Concurrency & Race Condition Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let adminToken: string;
  let teacherToken: string;
  let academicClassId: string;
  let subjectId: string;
  let examId: string;
  let studentIds: string[] = [];

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await GradingScheme.init();
    await Exam.init();
    await ExamSchedule.init();
    await ExamMark.init();

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Concurrent Academy',
      slug: 'concurrent',
      customDomain: 'concurrent.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({ _id: schoolId, tenantId, name: 'Concurrent School', code: 'CC01', affiliationBoard: 'CBSE' });
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      status: CampusStatus.ACTIVE,
      address: { street: '1 Main St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
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

    // 2. RBAC
    const permissionDocs = await Permission.insertMany(
      SYSTEM_PERMISSIONS.map((perm) => ({
        resource: perm.resource,
        action: perm.action,
        permissionString: perm.permissionString.toLowerCase().trim(),
        description: perm.description,
        category: perm.category,
      }))
    );
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permissionDocs) {
      permMap.set(p.permissionString, p._id as Types.ObjectId);
    }

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap = new Map<string, Types.ObjectId>();
    for (const r of roleDocs) {
      roleMap.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('Password123!');
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin.conc@edusphere.io',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    const adminRole = roleMap.get('SUPER_ADMIN');
    await UserRole.create({ tenantId, userId: adminUser._id, roleId: adminRole!, schoolId });

    const teacherRole = roleMap.get('TEACHER');
    const tUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher.conc@edusphere.io',
      passwordHash,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId, userId: tUser._id, roleId: teacherRole!, schoolId });
    const teacher = await Teacher.create({
      tenantId,
      schoolId,
      userId: tUser._id,
      employeeId: 'TC-01',
      designation: 'Teacher',
      department: 'Science',
      joiningDate: new Date('2020-01-01'),
    });

    const cls = await Class.create({ tenantId, schoolId, name: 'Grade 9', code: 'G9', order: 9, educationLevel: EducationLevel.SECONDARY });
    const sec = await Section.create({ tenantId, schoolId, name: 'Section A', code: 'SEC-A', classId: cls._id });
    const ac = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: cls._id,
      sectionId: sec._id,
      capacity: 50,
    });
    academicClassId = ac._id.toString();

    const sub = await Subject.create({
      tenantId,
      schoolId,
      name: 'Physics',
      code: 'PHY9',
      isElective: false,
    });
    subjectId = sub._id.toString();

    await TeacherSubjectAssignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      teacherId: teacher._id,
      subjectId: sub._id,
      academicClassId: ac._id,
      classId: cls._id,
      sectionId: sec._id,
      status: 'ACTIVE',
      isPrimary: true,
    });

    const studentRole = roleMap.get('STUDENT');

    // Seed 10 students
    for (let i = 1; i <= 10; i++) {
      const u = await User.create({
        tenantId,
        schoolId,
        email: `student${i}.conc@edusphere.io`,
        passwordHash,
        userType: UserType.STUDENT,
        status: UserStatus.ACTIVE,
      });
      await UserRole.create({ tenantId, userId: u._id, roleId: studentRole!, schoolId });
      const st = await Student.create({
        tenantId,
        schoolId,
        campusId,
        userId: u._id,
        admissionNumber: `ADM-C${i}`,
        personalDetails: { firstName: `Student${i}`, lastName: 'Test', dateOfBirth: new Date('2011-01-01'), gender: 'MALE' },
        contactDetails: { currentAddress: { street: '1 High St' } },
      });
      studentIds.push(st._id.toString());
      await StudentEnrollment.create({
        tenantId,
        schoolId,
        campusId,
        studentId: st._id,
        academicClassId: ac._id,
        classId: cls._id,
        sectionId: sec._id,
        academicYearId,
        rollNumber: i,
        status: 'ENROLLED',
        enrollmentDate: new Date('2026-06-01'),
      });
    }

    const gs = await GradingScheme.create({
      tenantId,
      schoolId,
      name: 'Concurrent Scheme',
      code: 'CONC_SCHEME',
      grades: [
        { grade: 'A', minPercentage: 70, maxPercentage: 100, gradePoint: 10, isPassing: true },
        { grade: 'F', minPercentage: 0, maxPercentage: 69.99, gradePoint: 0, isPassing: false },
      ],
    });

    const ex = await Exam.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      title: 'Unit Test Concurrent',
      code: 'UTC-1',
      examType: ExamType.UNIT_TEST,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-10'),
      status: ExamStatus.SCHEDULED,
      gradingSchemeId: gs._id,
      academicClassIds: [new Types.ObjectId(academicClassId)],
      subjectConfigs: [{ subjectId: new Types.ObjectId(subjectId), maxMarks: 50, passMarks: 20, weightage: 100 }],
    });
    examId = ex._id.toString();

    const login = async (email: string) => {
      const res = await request(app).post('/api/v1/auth/login').set('Host', 'concurrent.edusphere.io').send({ email, password: 'Password123!' });
      return res.body.data.accessToken;
    };

    adminToken = await login('admin.conc@edusphere.io');
    teacherToken = await login('teacher.conc@edusphere.io');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('should handle parallel marks entry bursts without corrupting data or duplicate records', async () => {
    // 5 concurrent bursts of entries for subsets of students
    const promises = [];

    // Burst 1: Students 0..3
    promises.push(
      request(app)
        .post('/api/v1/examinations/marks/bulk')
        .set('Host', 'concurrent.edusphere.io')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          examId,
          academicClassId,
          subjectId,
          maxMarks: 50,
          passMarks: 20,
          entries: [
            { studentId: studentIds[0], marksObtained: 40 },
            { studentId: studentIds[1], marksObtained: 42 },
          ],
        })
    );

    // Burst 2: Students 2..5
    promises.push(
      request(app)
        .post('/api/v1/examinations/marks/bulk')
        .set('Host', 'concurrent.edusphere.io')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          examId,
          academicClassId,
          subjectId,
          maxMarks: 50,
          passMarks: 20,
          entries: [
            { studentId: studentIds[2], marksObtained: 38 },
            { studentId: studentIds[3], marksObtained: 45 },
          ],
        })
    );

    // Burst 3: Students 6..9
    promises.push(
      request(app)
        .post('/api/v1/examinations/marks/bulk')
        .set('Host', 'concurrent.edusphere.io')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          examId,
          academicClassId,
          subjectId,
          maxMarks: 50,
          passMarks: 20,
          entries: [
            { studentId: studentIds[6], marksObtained: 30 },
            { studentId: studentIds[7], marksObtained: 35 },
            { studentId: studentIds[8], marksObtained: 48 },
            { studentId: studentIds[9], marksObtained: 49 },
          ],
        })
    );

    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }

    // Verify exactly one mark record exists per submitted student
    const totalMarkRecords = await ExamMark.countDocuments({
      tenantId,
      examId,
      academicClassId,
      subjectId,
    });
    expect(totalMarkRecords).toBe(8); // 2 + 2 + 4 students
  });

  it('should prevent race condition double-booking on schedule creation', async () => {
    // Attempt 2 parallel schedule requests for the EXACT same class and subject
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/examinations/schedules')
        .set('Host', 'concurrent.edusphere.io')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          examId,
          academicClassId,
          subjectId,
          examDate: '2026-11-03T00:00:00.000Z',
          startTime: '09:00',
          endTime: '11:00',
          maxMarks: 50,
          passMarks: 20,
          roomId: 'Room-C1',
        }),
      request(app)
        .post('/api/v1/examinations/schedules')
        .set('Host', 'concurrent.edusphere.io')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          examId,
          academicClassId,
          subjectId,
          examDate: '2026-11-03T00:00:00.000Z',
          startTime: '09:00',
          endTime: '11:00',
          maxMarks: 50,
          passMarks: 20,
          roomId: 'Room-C1',
        }),
    ]);

    // One must succeed (201) and the other must fail (400 or 409 due to duplicate/conflict)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses[0]).toBe(201);
    expect(statuses[1]).toBeGreaterThanOrEqual(400);

    const count = await ExamSchedule.countDocuments({
      tenantId,
      examId,
      academicClassId,
      subjectId,
    });
    expect(count).toBe(1);
  });
});
