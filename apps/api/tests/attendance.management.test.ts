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
  ClassSubject,
  TeacherSubjectAssignment,
  Period,
  Timetable,
  TimetableEntry,
  StudentAttendance,
  Holiday,
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
  PeriodType,
  TimetableStatus,
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  HolidayType,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 10: Attendance Management Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let schoolAdminToken: string;
  let teacherUserToken: string;
  let teacherProfileId: string;
  let teacherUserId: string;

  let academicClassId: string;
  let classId: string;
  let sectionId: string;
  let student1Id: string;
  let student2Id: string;
  let student3Id: string;
  let periodTeachingId: string;
  let periodLunchId: string;
  let timetableId: string;
  let subjectId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'St. Jude Educational Trust',
      slug: 'stjude',
      customDomain: 'stjude.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // 2. Seed School with Working Days (Monday - Friday)
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'St. Jude International Academy',
      code: 'STJUDE',
      affiliationBoard: 'CBSE',
      timezone: 'Asia/Kolkata',
      settings: {
        general: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12H',
          weekStartDay: WeekDay.MONDAY,
          defaultLanguage: 'en',
        },
        workingDays: [
          WeekDay.MONDAY,
          WeekDay.TUESDAY,
          WeekDay.WEDNESDAY,
          WeekDay.THURSDAY,
          WeekDay.FRIDAY,
        ],
        numbering: {
          admissionNumberPrefix: 'ADM',
          admissionNumberDigits: 5,
          invoicePrefix: 'INV',
          receiptPrefix: 'REC',
          employeeIdPrefix: 'EMP',
        },
        attendance: {
          attendanceMode: 'BOTH',
          lateThresholdMinutes: 15,
          halfDayThresholdMinutes: 120,
          approvalRequired: false,
          allowDirectCorrection: true,
          lowAttendanceThresholdPercentage: 75,
        },
      },
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Downtown Campus',
      code: 'DC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '100 Heritage Blvd',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'India',
      },
    });

    // 4. Seed Academic Year
    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY-2026-2027',
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
    const permissionMap = new Map<string, Types.ObjectId>();
    for (const pDoc of permissionDocs) {
      permissionMap.set(pDoc.permissionString, pDoc._id as Types.ObjectId);
    }

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((roleDef) => ({
        tenantId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      }))
    );

    const roleMap = new Map<string, Types.ObjectId>();
    for (const r of roleDocs) {
      roleMap.set(r.name, r._id as Types.ObjectId);
    }

    const allRolePerms: { tenantId: Types.ObjectId; roleId: Types.ObjectId; permissionId: Types.ObjectId }[] = [];
    for (const roleDef of SYSTEM_ROLES) {
      const roleId = roleMap.get(roleDef.name);
      if (!roleId) continue;
      if (roleDef.permissions.includes('*')) {
        for (const pId of permissionMap.values()) {
          allRolePerms.push({ tenantId, roleId, permissionId: pId });
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
    if (allRolePerms.length > 0) {
      await RolePermission.insertMany(allRolePerms);
    }

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 6. Seed Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@stjude.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });

    const adminRole = await Role.findOne({ tenantId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: adminRole!._id,
      schoolId,
    });

    // 7. Seed Teacher User & Profile
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher.roberts@stjude.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Roberts',
    });
    teacherUserId = teacherUser._id.toString();

    const teacherRole = await Role.findOne({ tenantId, name: 'TEACHER' });
    await UserRole.create({
      tenantId,
      userId: teacherUser._id,
      roleId: teacherRole!._id,
      schoolId,
      campusId,
    });

    const teacherProfile = await Teacher.create({
      tenantId,
      schoolId,
      userId: teacherUser._id,
      employeeId: 'EMP-TCH-201',
      department: 'Science',
      designation: 'Lead Faculty',
      joiningDate: new Date('2023-01-10'),
    });
    teacherProfileId = teacherProfile._id.toString();

    // 8. Seed Class, Section, Academic Class
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 9',
      code: 'G9',
      stage: EducationLevel.SECONDARY,
      order: 9,
    });
    classId = classDoc._id.toString();

    const sectionDoc = await Section.create({
      tenantId,
      schoolId,
      classId: classDoc._id,
      name: 'Section A',
      code: 'A',
      capacity: 35,
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
      capacity: 35,
    });
    academicClassId = acDoc._id.toString();

    // 9. Seed Subject & Teacher Assignment
    const subjectDoc = await Subject.create({
      tenantId,
      schoolId,
      name: 'Physics',
      code: 'PHY101',
      creditHours: 3,
    });
    subjectId = subjectDoc._id.toString();

    await ClassSubject.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      subjectId: subjectDoc._id,
      creditHours: 3,
    });

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

    // 10. Seed Students & Academic Enrollments
    const s1 = await Student.create({
      tenantId,
      schoolId,
      campusId,
      admissionNumber: 'ADM-10001',
      studentId: 'STU-10001',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Walker',
        dateOfBirth: new Date('2011-05-10'),
        gender: 'FEMALE',
      },
      contactDetails: {
        primaryEmail: 'alice@student.stjude.edu',
        primaryPhone: '9876543210',
        currentAddress: { street: '12 Maple St', city: 'Metropolis', state: 'State', postalCode: '10001' },
      },
    });
    student1Id = s1._id.toString();

    const s2 = await Student.create({
      tenantId,
      schoolId,
      campusId,
      admissionNumber: 'ADM-10002',
      studentId: 'STU-10002',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Brown',
        dateOfBirth: new Date('2011-08-15'),
        gender: 'MALE',
      },
      contactDetails: {
        primaryEmail: 'bob@student.stjude.edu',
        primaryPhone: '9876543211',
        currentAddress: { street: '14 Elm St', city: 'Metropolis', state: 'State', postalCode: '10001' },
      },
    });
    student2Id = s2._id.toString();

    const s3 = await Student.create({
      tenantId,
      schoolId,
      campusId,
      admissionNumber: 'ADM-10003',
      studentId: 'STU-10003',
      personalDetails: {
        firstName: 'Charlie',
        lastName: 'Davis',
        dateOfBirth: new Date('2011-12-01'),
        gender: 'MALE',
      },
      contactDetails: {
        primaryEmail: 'charlie@student.stjude.edu',
        primaryPhone: '9876543212',
        currentAddress: { street: '16 Oak St', city: 'Metropolis', state: 'State', postalCode: '10001' },
      },
    });
    student3Id = s3._id.toString();

    await StudentEnrollment.create([
      {
        tenantId,
        schoolId,
        campusId,
        studentId: s1._id,
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
        studentId: s2._id,
        academicYearId,
        academicClassId: acDoc._id,
        classId: classDoc._id,
        sectionId: sectionDoc._id,
        rollNumber: 2,
        status: 'ENROLLED',
      },
      {
        tenantId,
        schoolId,
        campusId,
        studentId: s3._id,
        academicYearId,
        academicClassId: acDoc._id,
        classId: classDoc._id,
        sectionId: sectionDoc._id,
        rollNumber: 3,
        status: 'ENROLLED',
      },
    ]);

    // 11. Seed Periods & Master Timetable for Period Attendance
    const pTeaching = await Period.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Period 1',
      code: 'P1',
      sequence: 1,
      startTime: '09:00',
      endTime: '09:45',
      duration: 45,
      type: PeriodType.TEACHING,
    });
    periodTeachingId = pTeaching._id.toString();

    const pLunch = await Period.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Lunch Break',
      code: 'LUNCH',
      sequence: 4,
      startTime: '12:00',
      endTime: '12:45',
      duration: 45,
      type: PeriodType.LUNCH,
    });
    periodLunchId = pLunch._id.toString();

    const tt = await Timetable.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      name: 'Term 1 Master Schedule',
      status: TimetableStatus.PUBLISHED,
      isCurrent: true,
      effectiveFrom: new Date('2026-06-01'),
    });
    timetableId = tt._id.toString();

    await TimetableEntry.create({
      tenantId,
      schoolId,
      timetableId: tt._id,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      dayOfWeek: 1, // Monday
      periodId: pTeaching._id,
      subjectId: subjectDoc._id,
      teacherId: teacherProfile._id,
    });

    // 12. Retrieve Tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'stjude.edusphere.io')
      .send({ email: 'admin@stjude.edu', password: 'Admin@123456' });
    schoolAdminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'stjude.edusphere.io')
      .send({ email: 'teacher.roberts@stjude.edu', password: 'Admin@123456' });
    teacherUserToken = teacherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Daily Attendance Marking Tests
  // =========================================================================

  it('should allow teacher to mark daily attendance on a working day', async () => {
    // 2026-09-14 is a Monday
    const res = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-14',
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student2Id, status: AttendanceStatus.ABSENT, remarks: 'Medical fever' },
          { studentId: student3Id, status: AttendanceStatus.LATE, arrivalTimestamp: '2026-09-14T09:15:00Z' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.presentCount).toBe(1);
    expect(res.body.data.absentCount).toBe(1);
    expect(res.body.data.lateCount).toBe(1);
    expect(res.body.data.totalStudents).toBe(3);
    expect(res.body.data.attendanceMode).toBe(AttendanceMode.DAILY);
    expect(res.body.data.status).toBe(AttendanceLifecycleStatus.SUBMITTED);
  });

  it('should reject daily attendance on weekend/non-working day without override', async () => {
    // 2026-09-13 is a Sunday
    const res = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-13',
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student2Id, status: AttendanceStatus.PRESENT },
          { studentId: student3Id, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message || res.body.message).toMatch(/Non-working day/i);
  });

  it('should allow marking on non-working day when overrideNonWorkingDay is true', async () => {
    // 2026-09-13 is Sunday
    const res = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-13',
        overrideNonWorkingDay: true,
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student2Id, status: AttendanceStatus.PRESENT },
          { studentId: student3Id, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject daily attendance if student is not enrolled in class', async () => {
    const fakeStudentId = new Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-15',
        records: [
          { studentId: fakeStudentId, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message || res.body.message).toMatch(/not actively enrolled/i);
  });

  // =========================================================================
  // 2. Period Attendance Marking Tests
  // =========================================================================

  it('should allow teacher to mark period attendance for scheduled slot', async () => {
    // 2026-09-14 is Monday (Day 1)
    const res = await request(app)
      .post('/api/v1/attendance/period')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-14',
        periodId: periodTeachingId,
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student2Id, status: AttendanceStatus.PRESENT },
          { studentId: student3Id, status: AttendanceStatus.ABSENT },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendanceMode).toBe(AttendanceMode.PERIOD);
    expect(res.body.data.periodId).toBe(periodTeachingId);
    expect(res.body.data.presentCount).toBe(2);
    expect(res.body.data.absentCount).toBe(1);
  });

  it('should reject period attendance for non-instructional lunch/break periods', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/period')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-14',
        periodId: periodLunchId,
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message || res.body.message).toMatch(/break or lunch/i);
  });

  // =========================================================================
  // 3. Attendance Sheet & Lifecycle Transitions
  // =========================================================================

  it('should fetch attendance sheet with populated students list', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/sheet')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .query({ academicClassId, date: '2026-09-14' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enrolledStudents).toHaveLength(3);
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.isNonWorkingDay).toBe(false);
  });

  it('should support Lifecycle Transitions: Submit -> Approve -> Lock', async () => {
    // First create a DRAFT attendance
    const draftRes = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-16', // Wednesday
        status: AttendanceLifecycleStatus.DRAFT,
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student2Id, status: AttendanceStatus.PRESENT },
          { studentId: student3Id, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(draftRes.status).toBe(201);
    const attendanceId = draftRes.body.data.id;
    expect(draftRes.body.data.status).toBe(AttendanceLifecycleStatus.DRAFT);

    // 1. Submit
    const submitRes = await request(app)
      .post(`/api/v1/attendance/${attendanceId}/submit`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe(AttendanceLifecycleStatus.SUBMITTED);

    // 2. Approve by School Admin
    const approveRes = await request(app)
      .post(`/api/v1/attendance/${attendanceId}/approve`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe(AttendanceLifecycleStatus.APPROVED);
    expect(approveRes.body.data.approvedBy).toBeDefined();

    // 3. Lock by School Admin
    const lockRes = await request(app)
      .post(`/api/v1/attendance/${attendanceId}/lock`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.status).toBe(AttendanceLifecycleStatus.LOCKED);
    expect(lockRes.body.data.lockedBy).toBeDefined();

    // 4. Modifying locked attendance fails
    const editLockedRes = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        academicClassId,
        date: '2026-09-16',
        records: [
          { studentId: student1Id, status: AttendanceStatus.ABSENT },
          { studentId: student2Id, status: AttendanceStatus.PRESENT },
          { studentId: student3Id, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(editLockedRes.status).toBe(400);
    expect(editLockedRes.body.error?.message || editLockedRes.body.message).toMatch(/locked against modifications/i);
  });

  // =========================================================================
  // 4. Summaries & Reports Tests
  // =========================================================================

  it('should compute student attendance summary and percentage accurately', async () => {
    // Alice (student1) was marked PRESENT on 2026-09-14 and PRESENT on 2026-09-16
    const res = await request(app)
      .get(`/api/v1/attendance/student/${student1Id}`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ academicYearId: academicYearId.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalWorkingDays).toBeGreaterThanOrEqual(2);
    expect(res.body.data.presentDays).toBeGreaterThanOrEqual(2);
    expect(res.body.data.attendancePercentage).toBe(100);
  });

  it('should generate class attendance summary for a date', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/class/${academicClassId}/summary`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ date: '2026-09-14' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalEnrolled).toBe(3);
    expect(res.body.data.presentCount).toBe(1);
    expect(res.body.data.absentCount).toBe(1);
    expect(res.body.data.lateCount).toBe(1);
  });

  it('should generate 2D monthly matrix for class', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/class/${academicClassId}/monthly`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ year: 2026, month: 9 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.daysInMonth).toBe(30);
    expect(res.body.data.students).toHaveLength(3);
    // Student 1 has day 14 marked as PRESENT
    const student1Row = res.body.data.students.find((s: any) => s.studentId === student1Id);
    expect(student1Row.days[14]).toBe(AttendanceStatus.PRESENT);
  });

  it('should generate low attendance report for students below threshold', async () => {
    // Bob (student2) was marked ABSENT on 2026-09-14, so his % is lower
    const res = await request(app)
      .get('/api/v1/attendance/reports/low-attendance')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ academicYearId: academicYearId.toString(), threshold: 80 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.students.length).toBeGreaterThanOrEqual(1);
    const bob = res.body.data.students.find((s: any) => s.studentId === student2Id);
    expect(bob).toBeDefined();
    expect(bob.attendancePercentage).toBeLessThan(80);
  });

  it('should generate daily campus report across all classes', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/reports/daily-campus')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ date: '2026-09-14', campusId: campusId.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalClasses).toBe(1);
    expect(res.body.data.markedClasses).toBe(1);
    expect(res.body.data.totalPresent).toBe(1);
  });

  // =========================================================================
  // 5. Holiday Management Tests
  // =========================================================================

  it('should declare, list, and delete a school holiday', async () => {
    // 1. Declare Holiday
    const createRes = await request(app)
      .post('/api/v1/holidays')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        campusId: campusId.toString(),
        academicYearId: academicYearId.toString(),
        name: 'Founder Day',
        startDate: '2026-10-15',
        endDate: '2026-10-15',
        type: HolidayType.SCHOOL_HOLIDAY,
        description: 'Annual Founders Day celebration and sports meet',
      });

    expect(createRes.status).toBe(201);
    const holidayId = createRes.body.data.id;

    // 2. List Holidays
    const listRes = await request(app)
      .get('/api/v1/holidays')
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ academicYearId: academicYearId.toString(), campusId: campusId.toString() });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    // 3. Delete Holiday
    const deleteRes = await request(app)
      .delete(`/api/v1/holidays/${holidayId}`)
      .set('Host', 'stjude.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
