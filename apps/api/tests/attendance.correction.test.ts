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
  StudentAttendance,
  AttendanceCorrection,
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
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 10: Attendance Correction Workflow Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let schoolAdminToken: string;
  let teacherUserToken: string;
  let academicClassId: string;
  let studentId: string;
  let attendanceSessionId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Tenant.create({
      _id: tenantId,
      name: 'Eton Academic Trust',
      slug: 'eton',
      customDomain: 'eton.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Eton High School',
      code: 'ETON',
      affiliationBoard: 'ICSE',
      timezone: 'Asia/Kolkata',
      settings: {
        workingDays: [
          WeekDay.MONDAY,
          WeekDay.TUESDAY,
          WeekDay.WEDNESDAY,
          WeekDay.THURSDAY,
          WeekDay.FRIDAY,
        ],
        attendance: {
          attendanceMode: 'DAILY',
          lateThresholdMinutes: 15,
          halfDayThresholdMinutes: 120,
          approvalRequired: false,
          allowDirectCorrection: true,
          lowAttendanceThresholdPercentage: 75,
        },
      },
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 College Way',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'India',
      },
    });

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

    // Permissions & Roles
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

    // Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@eton.edu',
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

    // Teacher User & Profile
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher.evans@eton.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'David',
      lastName: 'Evans',
    });
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
      employeeId: 'EMP-TCH-301',
      department: 'English',
      designation: 'Faculty',
      joiningDate: new Date('2023-01-10'),
    });

    // Class & Student
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 8',
      code: 'G8',
      stage: EducationLevel.MIDDLE,
      order: 8,
    });
    const sectionDoc = await Section.create({
      tenantId,
      schoolId,
      classId: classDoc._id,
      name: 'Section A',
      code: 'A',
      capacity: 30,
    });
    const acDoc = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      classTeacherId: teacherProfile._id,
    });
    academicClassId = acDoc._id.toString();

    const stuDoc = await Student.create({
      tenantId,
      schoolId,
      campusId,
      admissionNumber: 'ADM-8001',
      studentId: 'STU-8001',
      personalDetails: {
        firstName: 'Emma',
        lastName: 'Watson',
        dateOfBirth: new Date('2012-04-15'),
        gender: 'FEMALE',
      },
      contactDetails: {
        primaryEmail: 'emma@student.eton.edu',
        primaryPhone: '9876543220',
        currentAddress: { street: '1 School St', city: 'Metropolis', state: 'State', postalCode: '10001' },
      },
    });
    studentId = stuDoc._id.toString();

    await StudentEnrollment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: stuDoc._id,
      academicYearId,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      rollNumber: 1,
      status: 'ENROLLED',
    });

    // Create Initial Attendance Record where Emma is marked ABSENT
    // 2026-09-14 is Monday
    const initialSession = await StudentAttendance.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      date: new Date('2026-09-14T00:00:00.000Z'),
      attendanceMode: AttendanceMode.DAILY,
      takenBy: teacherProfile._id,
      status: AttendanceLifecycleStatus.SUBMITTED,
      records: [{ studentId: stuDoc._id, status: AttendanceStatus.ABSENT, remarks: 'Uninformed absence' }],
    });
    attendanceSessionId = initialSession._id.toString();

    // Login tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'eton.edusphere.io')
      .send({ email: 'admin@eton.edu', password: 'Admin@123456' });
    schoolAdminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'eton.edusphere.io')
      .send({ email: 'teacher.evans@eton.edu', password: 'Admin@123456' });
    teacherUserToken = teacherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('should allow teacher to request an attendance correction', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/corrections')
      .set('Host', 'eton.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        attendanceId: attendanceSessionId,
        studentId,
        newStatus: AttendanceStatus.PRESENT,
        reason: 'Student arrived late due to road construction, marked absent erroneously',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.oldStatus).toBe(AttendanceStatus.ABSENT);
    expect(res.body.data.newStatus).toBe(AttendanceStatus.PRESENT);
    expect(res.body.data.status).toBe(CorrectionStatus.PENDING);
  });

  it('should list pending corrections', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/corrections')
      .set('Host', 'eton.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .query({ status: CorrectionStatus.PENDING });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const returnedStudentId =
      typeof res.body.data[0].studentId === 'object'
        ? res.body.data[0].studentId._id || res.body.data[0].studentId.id
        : res.body.data[0].studentId;
    expect(returnedStudentId.toString()).toBe(studentId);
  });

  it('should allow school admin to review and APPROVE attendance correction', async () => {
    // Find the pending correction
    const pending = await AttendanceCorrection.findOne({
      tenantId,
      attendanceId: attendanceSessionId,
      status: CorrectionStatus.PENDING,
    });
    expect(pending).toBeDefined();

    const res = await request(app)
      .patch(`/api/v1/attendance/corrections/${pending!._id}`)
      .set('Host', 'eton.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        status: CorrectionStatus.APPROVED,
        reviewRemarks: 'Verified with attendance register and gate log',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(CorrectionStatus.APPROVED);

    // Verify student record in session was updated
    const updatedSession = await StudentAttendance.findById(attendanceSessionId);
    const rec = updatedSession!.records.find((r) => r.studentId.toString() === studentId);
    expect(rec!.status).toBe(AttendanceStatus.PRESENT);
    expect(rec!.originalStatus).toBe(AttendanceStatus.ABSENT);
    expect(rec!.isCorrected).toBe(true);
  });

  it('should allow school admin to review and REJECT attendance correction', async () => {
    // Teacher requests another correction
    const reqRes = await request(app)
      .post('/api/v1/attendance/corrections')
      .set('Host', 'eton.edusphere.io')
      .set('Authorization', `Bearer ${teacherUserToken}`)
      .send({
        attendanceId: attendanceSessionId,
        studentId,
        newStatus: AttendanceStatus.LATE,
        reason: 'Attempting to change to late',
      });
    const correctionId = reqRes.body.data.id;

    // Admin rejects
    const res = await request(app)
      .patch(`/api/v1/attendance/corrections/${correctionId}`)
      .set('Host', 'eton.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        status: CorrectionStatus.REJECTED,
        reviewRemarks: 'Student was already verified as full day present',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(CorrectionStatus.REJECTED);

    // Status remains PRESENT (not LATE)
    const updatedSession = await StudentAttendance.findById(attendanceSessionId);
    const rec = updatedSession!.records.find((r) => r.studentId.toString() === studentId);
    expect(rec!.status).toBe(AttendanceStatus.PRESENT);
  });

  it('should auto-apply direct correction when executed by school admin', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/corrections')
      .set('Host', 'eton.edusphere.io')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        attendanceId: attendanceSessionId,
        studentId,
        newStatus: AttendanceStatus.EXCUSED,
        reason: 'Principal approved medical leave certificate submitted by parent',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(CorrectionStatus.APPROVED);

    const session = await StudentAttendance.findById(attendanceSessionId);
    const rec = session!.records.find((r) => r.studentId.toString() === studentId);
    expect(rec!.status).toBe(AttendanceStatus.EXCUSED);
  });
});
