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
  MarkCorrection,
  Result,
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
  ExamStatus,
  ExamType,
  MarkStatus,
  ResultStatus,
  CorrectionStatus,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 12: Examination Management Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;

  let academicClassId: string;
  let classId: string;
  let sectionId: string;
  let subject1Id: string;
  let subject2Id: string;
  let student1Id: string;
  let student2Id: string;

  let gradingSchemeId: string;
  let examId: string;
  let schedule1Id: string;
  let student1MarkId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await GradingScheme.init();
    await Exam.init();
    await ExamSchedule.init();
    await ExamMark.init();
    await Result.init();

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'St. Xavier Academy',
      slug: 'xavier',
      customDomain: 'xavier.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // 2. Seed School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'St. Xavier High School',
      code: 'XAVIER',
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
      name: 'Central Campus',
      code: 'CENTRAL',
      status: CampusStatus.ACTIVE,
      address: { street: '1 Church St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
    });

    // 4. Seed Academic Year
    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    });

    // 5. Seed Permissions & Roles
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

    const passwordHash = await passwordService.hashPassword('Secret@123');

    // Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@xavier.edu',
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminRole = roleMap.get('SUPER_ADMIN');
    await UserRole.create({ tenantId, userId: adminUser._id, roleId: adminRole!, schoolId });

    // Teacher User & Profile
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher@xavier.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const teacherRole = roleMap.get('TEACHER');
    await UserRole.create({ tenantId, userId: teacherUser._id, roleId: teacherRole!, schoolId });

    const teacherProfile = await Teacher.create({
      tenantId,
      schoolId,
      userId: teacherUser._id,
      employeeId: 'EMP-TCH-001',
      department: 'Mathematics',
      designation: 'Senior Teacher',
      joiningDate: new Date('2020-01-01'),
      status: 'ACTIVE',
    });

    // Student 1 & 2 Users & Profiles
    const s1User = await User.create({
      tenantId,
      schoolId,
      email: 'student1@xavier.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const studentRole = roleMap.get('STUDENT');
    await UserRole.create({ tenantId, userId: s1User._id, roleId: studentRole!, schoolId });

    const s1Profile = await Student.create({
      tenantId,
      schoolId,
      campusId,
      userId: s1User._id,
      admissionNumber: 'ADM-2026-001',
      personalDetails: { firstName: 'Alice', lastName: 'Walker', dateOfBirth: new Date('2010-05-15'), gender: 'FEMALE' },
      contactDetails: { currentAddress: { street: '1 High St' } },
    });
    student1Id = s1Profile._id.toString();

    const s2User = await User.create({
      tenantId,
      schoolId,
      email: 'student2@xavier.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    await UserRole.create({ tenantId, userId: s2User._id, roleId: studentRole!, schoolId });

    const s2Profile = await Student.create({
      tenantId,
      schoolId,
      campusId,
      userId: s2User._id,
      admissionNumber: 'ADM-2026-002',
      personalDetails: { firstName: 'Bob', lastName: 'Marley', dateOfBirth: new Date('2010-08-20'), gender: 'MALE' },
      contactDetails: { currentAddress: { street: '2 High St' } },
    });
    student2Id = s2Profile._id.toString();

    // Academic Structure
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
      educationLevel: EducationLevel.SECONDARY,
    });
    classId = classDoc._id.toString();

    const sectionDoc = await Section.create({
      tenantId,
      schoolId,
      name: 'Section A',
      code: 'A',
      classId: classDoc._id,
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

    const sub1 = await Subject.create({
      tenantId,
      schoolId,
      name: 'Mathematics',
      code: 'MATH10',
      type: 'CORE',
    });
    subject1Id = sub1._id.toString();

    const sub2 = await Subject.create({
      tenantId,
      schoolId,
      name: 'Science',
      code: 'SCI10',
      type: 'CORE',
    });
    subject2Id = sub2._id.toString();

    // Assign teacher to Math
    await TeacherSubjectAssignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      teacherId: teacherProfile._id,
      subjectId: sub1._id,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      status: 'ACTIVE',
    });

    // Enroll students
    await StudentEnrollment.create([
      {
        tenantId,
        schoolId,
        campusId,
        studentId: s1Profile._id,
        academicYearId,
        academicClassId: acDoc._id,
        classId: classDoc._id,
        sectionId: sectionDoc._id,
        rollNumber: 1,
        status: 'ENROLLED',
      },
      {
        tenantId,
        schoolId,
        campusId,
        studentId: s2Profile._id,
        academicYearId,
        academicClassId: acDoc._id,
        classId: classDoc._id,
        sectionId: sectionDoc._id,
        rollNumber: 2,
        status: 'ENROLLED',
      },
    ]);

    // Authenticate sessions to obtain tokens
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'xavier.edusphere.io')
      .send({ email: 'admin@xavier.edu', password: 'Secret@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'xavier.edusphere.io')
      .send({ email: 'teacher@xavier.edu', password: 'Secret@123' });
    teacherToken = teacherLoginRes.body.data.accessToken;

    const studentLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'xavier.edusphere.io')
      .send({ email: 'student1@xavier.edu', password: 'Secret@123' });
    studentToken = studentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Grading Schemes
  // =========================================================================
  it('should create a valid GradingScheme and reject overlapping thresholds', async () => {
    // 1. Rejects overlapping thresholds
    const overlapRes = await request(app)
      .post('/api/v1/examinations/grading-schemes')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Invalid Overlap Scheme',
        code: 'OVERLAP_1',
        grades: [
          { grade: 'A', minPercentage: 80, maxPercentage: 100, isPassing: true },
          { grade: 'B', minPercentage: 70, maxPercentage: 85, isPassing: true }, // Overlaps 80-85
        ],
      });
    expect(overlapRes.status).toBe(400);

    // 2. Successfully creates non-overlapping scheme
    const createRes = await request(app)
      .post('/api/v1/examinations/grading-schemes')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Standard 10-Point Scale',
        code: 'SCALE_10',
        isDefault: true,
        grades: [
          { grade: 'A1', minPercentage: 91, maxPercentage: 100, gradePoint: 10, isPassing: true },
          { grade: 'A2', minPercentage: 81, maxPercentage: 90, gradePoint: 9, isPassing: true },
          { grade: 'B1', minPercentage: 71, maxPercentage: 80, gradePoint: 8, isPassing: true },
          { grade: 'B2', minPercentage: 61, maxPercentage: 70, gradePoint: 7, isPassing: true },
          { grade: 'C1', minPercentage: 51, maxPercentage: 60, gradePoint: 6, isPassing: true },
          { grade: 'C2', minPercentage: 41, maxPercentage: 50, gradePoint: 5, isPassing: true },
          { grade: 'D', minPercentage: 33, maxPercentage: 40, gradePoint: 4, isPassing: true },
          { grade: 'E', minPercentage: 0, maxPercentage: 32, gradePoint: 0, isPassing: false },
        ],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe('SCALE_10');
    gradingSchemeId = createRes.body.data._id;
  });

  // =========================================================================
  // 2. Exam Creation, Update & Lifecycle Transitions
  // =========================================================================
  it('should create an Exam and transition through valid lifecycle states', async () => {
    const createRes = await request(app)
      .post('/api/v1/examinations')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Mid Term Examination 2026',
        code: 'MID_2026',
        examType: ExamType.MID_TERM,
        academicYearId,
        campusId,
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        academicClassIds: [academicClassId],
        gradingSchemeId,
        passingPercentage: 33,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe(ExamStatus.DRAFT);
    examId = createRes.body.data._id;

    // Transition DRAFT -> SCHEDULED
    const schedRes = await request(app)
      .post(`/api/v1/examinations/${examId}/status`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ExamStatus.SCHEDULED });
    expect(schedRes.status).toBe(200);
    expect(schedRes.body.data.status).toBe(ExamStatus.SCHEDULED);

    // Transition SCHEDULED -> ONGOING
    const ongoingRes = await request(app)
      .post(`/api/v1/examinations/${examId}/status`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ExamStatus.ONGOING });
    expect(ongoingRes.status).toBe(200);
    expect(ongoingRes.body.data.status).toBe(ExamStatus.ONGOING);

    // Invalid transition: ONGOING -> DRAFT (Must fail)
    const invalidRes = await request(app)
      .post(`/api/v1/examinations/${examId}/status`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ExamStatus.DRAFT });
    expect(invalidRes.status).toBe(400);

    // Transition ONGOING -> MARKS_ENTRY
    const marksEntryRes = await request(app)
      .post(`/api/v1/examinations/${examId}/status`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ExamStatus.MARKS_ENTRY });
    expect(marksEntryRes.status).toBe(200);
  });

  // =========================================================================
  // 3. Exam Scheduling
  // =========================================================================
  it('should schedule papers and list schedules', async () => {
    // Paper 1: Mathematics
    const sched1Res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId,
        subjectId: subject1Id,
        examDate: '2026-10-05',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Hall 1',
        maxMarks: 100,
        passMarks: 33,
      });

    expect(sched1Res.status).toBe(201);
    schedule1Id = sched1Res.body.data._id;

    // Paper 2: Science (different time on same day)
    const sched2Res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId,
        subjectId: subject2Id,
        examDate: '2026-10-06',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Hall 1',
        maxMarks: 100,
        passMarks: 33,
      });

    expect(sched2Res.status).toBe(201);

    // List schedules
    const listRes = await request(app)
      .get(`/api/v1/examinations/${examId}/schedules`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);
  });

  // =========================================================================
  // 4. Marks Roster & Bulk Marks Entry
  // =========================================================================
  it('should fetch marks roster and enter bulk student marks', async () => {
    // 1. Get Marks Roster for Mathematics
    const rosterRes = await request(app)
      .get(`/api/v1/examinations/marks/roster?examId=${examId}&academicClassId=${academicClassId}&subjectId=${subject1Id}`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.data.students.length).toBe(2);
    expect(rosterRes.body.data.students[0].status).toBe(MarkStatus.NOT_ENTERED);

    // 2. Submit Bulk Marks: Student 1 gets 88 (A2), Student 2 is ABSENT
    const bulkRes = await request(app)
      .post('/api/v1/examinations/marks/bulk')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        examId,
        academicClassId,
        subjectId: subject1Id,
        maxMarks: 100,
        passMarks: 33,
        entries: [
          { studentId: student1Id, marksObtained: 88, status: MarkStatus.ENTERED, remarks: 'Very Good' },
          { studentId: student2Id, marksObtained: null, status: MarkStatus.ABSENT, remarks: 'Medical Leave' },
        ],
      });

    expect(bulkRes.status).toBe(200);
    expect(bulkRes.body.data.length).toBe(2);

    const s1Mark = bulkRes.body.data.find((m: any) => m.studentId.toString() === student1Id);
    expect(s1Mark.marksObtained).toBe(88);
    expect(s1Mark.grade).toBe('A2');
    student1MarkId = s1Mark._id;

    const s2Mark = bulkRes.body.data.find((m: any) => m.studentId.toString() === student2Id);
    expect(s2Mark.status).toBe(MarkStatus.ABSENT);
    expect(s2Mark.marksObtained).toBeNull(); // Specification 15: marksObtained must not accidentally become 0
  });

  // =========================================================================
  // 5. Marks Verification & Locking
  // =========================================================================
  it('should verify and lock marks, blocking direct modifications', async () => {
    // 1. Verify Marks
    const verifyRes = await request(app)
      .post('/api/v1/examinations/marks/verify')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ examId, academicClassId, subjectId: subject1Id });

    expect(verifyRes.status).toBe(200);

    // 2. Lock Marks
    const lockRes = await request(app)
      .post('/api/v1/examinations/marks/lock')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ examId, academicClassId, subjectId: subject1Id });

    expect(lockRes.status).toBe(200);

    // 3. Attempt to directly update locked marks must fail
    const overwriteRes = await request(app)
      .post('/api/v1/examinations/marks/bulk')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        examId,
        academicClassId,
        subjectId: subject1Id,
        maxMarks: 100,
        passMarks: 33,
        entries: [{ studentId: student1Id, marksObtained: 95 }],
      });

    expect(overwriteRes.status).toBe(400);
    expect(overwriteRes.body.error?.message || overwriteRes.body.message).toContain('LOCKED');
  });

  // =========================================================================
  // 6. Marks Correction Workflow
  // =========================================================================
  it('should allow requesting and reviewing mark corrections on locked marks', async () => {
    // 1. Teacher requests a correction for Student 1
    const reqRes = await request(app)
      .post(`/api/v1/examinations/marks/${student1MarkId}/correction`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        newMarks: 92,
        newStatus: MarkStatus.ENTERED,
        reason: 'Recounting of question 4 marks',
      });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.data.status).toBe(CorrectionStatus.PENDING);
    const correctionId = reqRes.body.data._id;

    // 2. Admin reviews and approves the correction
    const reviewRes = await request(app)
      .post(`/api/v1/examinations/marks/corrections/${correctionId}/review`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: CorrectionStatus.APPROVED });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe(CorrectionStatus.APPROVED);

    // Verify student mark was updated
    const updatedMark = await ExamMark.findById(student1MarkId);
    expect(updatedMark!.marksObtained).toBe(92);
  });

  // =========================================================================
  // 7. Result Calculation, Approval & Publishing
  // =========================================================================
  it('should calculate results, approve, and publish immutable results', async () => {
    // 1. Enter marks for Subject 2 (Science) as well so full result can be computed
    await request(app)
      .post('/api/v1/examinations/marks/bulk')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId,
        subjectId: subject2Id,
        maxMarks: 100,
        passMarks: 33,
        entries: [
          { studentId: student1Id, marksObtained: 94, status: MarkStatus.ENTERED },
          { studentId: student2Id, marksObtained: 70, status: MarkStatus.ENTERED },
        ],
      });

    // 2. Calculate Results
    const calcRes = await request(app)
      .post(`/api/v1/examinations/${examId}/results/calculate`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ academicClassId });

    expect(calcRes.status).toBe(200);
    expect(calcRes.body.data.length).toBe(2);

    // Student 1: Math 92, Science 94 => Total: 186/200 = 93% => Grade A1, Result PASS
    const s1Res = calcRes.body.data.find((r: any) => r.studentId.toString() === student1Id);
    expect(s1Res.totalMarksObtained).toBe(186);
    expect(s1Res.totalMaxMarks).toBe(200);
    expect(s1Res.percentage).toBe(93);
    expect(s1Res.overallGrade).toBe('A1');
    expect(s1Res.resultStatus).toBe(ResultStatus.PASS);

    // Student 2: Math ABSENT (0), Science 70 => Failed Math => Result FAIL
    const s2Res = calcRes.body.data.find((r: any) => r.studentId.toString() === student2Id);
    expect(s2Res.failedSubjectCount).toBe(1);
    expect(s2Res.resultStatus).toBe(ResultStatus.FAIL);

    // 3. Approve Results
    const approveRes = await request(app)
      .post(`/api/v1/examinations/${examId}/results/approve`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);

    // 4. Publish Results
    const pubRes = await request(app)
      .post(`/api/v1/examinations/${examId}/results/publish`)
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pubRes.status).toBe(200);

    // 5. Student checks published result via /my-results
    const myResultRes = await request(app)
      .get('/api/v1/examinations/my-results')
      .set('Host', 'xavier.edusphere.io')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(myResultRes.status).toBe(200);
    expect(myResultRes.body.data.length).toBe(1);
    expect(myResultRes.body.data[0].percentage).toBe(93);
    expect(myResultRes.body.data[0].subjectResults.length).toBe(2);
  });
});
