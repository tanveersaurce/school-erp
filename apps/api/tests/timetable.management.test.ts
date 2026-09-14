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
  ClassSubject,
  TeacherSubjectAssignment,
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
  EducationLevel,
  AcademicStatus,
  PeriodType,
  RoomType,
  TimetableStatus,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Timetable Management Integration Suite (Phase 9)', () => {
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
  let subjectId: string;
  let period1Id: string;
  let period2Id: string;
  let breakPeriodId: string;
  let classroomId: string;
  let timetableId: string;
  let entryId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Oxford Global Academy Trust',
      slug: 'oxford',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    // 2. Seed School with working days Mon-Fri
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Oxford Grammar High',
      code: 'OXF-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@oxford.edu', phone: '9876543210' },
      address: {
        street: '1 High Street',
        city: 'Oxford',
        state: 'Oxfordshire',
        postalCode: 'OX1 1AA',
        country: 'UK',
      },
      timezone: 'Europe/London',
      currency: 'GBP',
      settings: {
        workingDays: [
          WeekDay.MONDAY,
          WeekDay.TUESDAY,
          WeekDay.WEDNESDAY,
          WeekDay.THURSDAY,
          WeekDay.FRIDAY,
        ],
      },
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'North Campus',
      code: 'NC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 High Street',
        city: 'Oxford',
        state: 'Oxfordshire',
        postalCode: 'OX1 1AA',
        country: 'UK',
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
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    });

    // 5. Seed Permissions & Roles
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

    for (const roleDef of SYSTEM_ROLES) {
      const roleDoc = await Role.create({
        tenantId,
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
          permsToAssign.map((pId) => ({ tenantId, roleId: roleDoc._id, permissionId: pId }))
        );
      }
    }

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 6. Seed Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@oxford.edu',
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
      email: 'prof.smith@oxford.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'Alan',
      lastName: 'Smith',
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
      employeeId: 'EMP-TCH-101',
      department: 'Mathematics',
      designation: 'Senior Lecturer',
      joiningDate: new Date('2023-01-10'),
    });
    teacherProfileId = teacherProfile._id.toString();

    // 8. Seed Class, Section, AcademicClass, Subject, and Teacher Assignment
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 10',
      code: 'G10',
      stage: EducationLevel.SECONDARY,
      order: 10,
    });

    const sectionDoc = await Section.create({
      tenantId,
      schoolId,
      classId: classDoc._id,
      name: 'Section A',
      code: 'A',
      capacity: 35,
    });

    const acDoc = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      capacity: 35,
      classTeacherId: teacherProfile._id,
    });
    academicClassId = acDoc._id.toString();

    const subjectDoc = await Subject.create({
      tenantId,
      schoolId,
      name: 'Advanced Mathematics',
      code: 'MATH101',
      type: 'CORE',
    });
    subjectId = subjectDoc._id.toString();

    await ClassSubject.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      subjectId: subjectDoc._id,
      periodsPerWeek: 5,
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

    // 9. Login tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oxford.edusphere.io')
      .send({ email: 'admin@oxford.edu', password: 'Admin@123456' });
    schoolAdminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oxford.edusphere.io')
      .send({ email: 'prof.smith@oxford.edu', password: 'Admin@123456' });
    teacherUserToken = teacherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Period Management Tests
  // =========================================================================
  describe('Period Management Endpoints', () => {
    it('should create teaching and break periods successfully', async () => {
      // Period 1
      const res1 = await request(app)
        .post('/api/v1/timetable/periods')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: 'Period 1',
          code: 'P1',
          sequence: 1,
          startTime: '08:30',
          endTime: '09:15',
          type: PeriodType.TEACHING,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.name).toBe('Period 1');
      expect(res1.body.data.duration).toBe(45);
      period1Id = res1.body.data.id;

      // Period 2
      const res2 = await request(app)
        .post('/api/v1/timetable/periods')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: 'Period 2',
          code: 'P2',
          sequence: 2,
          startTime: '09:20',
          endTime: '10:05',
          type: PeriodType.TEACHING,
        });

      expect(res2.status).toBe(201);
      period2Id = res2.body.data.id;

      // Morning Break
      const resBreak = await request(app)
        .post('/api/v1/timetable/periods')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: 'Morning Recess',
          code: 'RECESS',
          sequence: 3,
          startTime: '10:05',
          endTime: '10:25',
          type: PeriodType.BREAK,
        });

      expect(resBreak.status).toBe(201);
      expect(resBreak.body.data.type).toBe(PeriodType.BREAK);
      breakPeriodId = resBreak.body.data.id;
    });

    it('should reject period with endTime earlier than startTime', async () => {
      const res = await request(app)
        .post('/api/v1/timetable/periods')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: 'Invalid Period',
          code: 'INV1',
          sequence: 9,
          startTime: '11:00',
          endTime: '10:00',
        });

      expect(res.status).toBe(422);
    });

    it('should list all periods ordered by sequence and time', async () => {
      const res = await request(app)
        .get('/api/v1/timetable/periods')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ campusId: campusId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data[0].sequence).toBe(1);
    });

    it('should update a period details', async () => {
      const res = await request(app)
        .patch(`/api/v1/timetable/periods/${period1Id}`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ name: 'Period 1 (Morning Math)' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Period 1 (Morning Math)');
    });
  });

  // =========================================================================
  // 2. Classroom (Room) Management Tests
  // =========================================================================
  describe('Classroom Management Endpoints', () => {
    it('should create a classroom successfully', async () => {
      const res = await request(app)
        .post('/api/v1/timetable/classrooms')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: 'Science Lab 101',
          code: 'LAB-101',
          roomNumber: '101',
          capacity: 40,
          roomType: RoomType.LABORATORY,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('LAB-101');
      expect(res.body.data.capacity).toBe(40);
      classroomId = res.body.data.id;
    });

    it('should prevent creating room with duplicate code on same campus', async () => {
      const res = await request(app)
        .post('/api/v1/timetable/classrooms')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: 'Another Lab',
          code: 'LAB-101',
          capacity: 30,
        });

      expect(res.status).toBe(409);
    });

    it('should list classrooms filtered by campus', async () => {
      const res = await request(app)
        .get('/api/v1/timetable/classrooms')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ campusId: campusId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. Timetable Master Lifecycle Tests
  // =========================================================================
  describe('Timetable Master Lifecycle', () => {
    it('should create a draft timetable (version 1)', async () => {
      const res = await request(app)
        .post('/api/v1/timetable/timetables')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          academicYearId: academicYearId.toString(),
          name: 'Term 1 Master Schedule',
          code: 'TT-TERM1-V1',
          effectiveFrom: '2026-09-01',
          effectiveTo: '2027-01-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TimetableStatus.DRAFT);
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.isCurrent).toBe(false);
      timetableId = res.body.data.id;
    });

    it('should get timetable by ID with populated references', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableId}`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(timetableId);
      expect(res.body.data.name).toBe('Term 1 Master Schedule');
    });
  });

  // =========================================================================
  // 4. Timetable Entries & Scheduling Tests
  // =========================================================================
  describe('Timetable Slot Entries & Scheduling', () => {
    it('should schedule a valid entry slot on Monday Period 1', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId,
          dayOfWeek: 1, // Monday
          periodId: period1Id,
          subjectId,
          teacherId: teacherProfileId,
          roomId: classroomId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.academicClassId).toBe(academicClassId);
      expect(res.body.data.dayOfWeek).toBe(1);
      expect(res.body.data.dayName).toBe('Monday');
      expect(res.body.data.subjectName).toBe('Advanced Mathematics');
      entryId = res.body.data.id;
    });

    it('should schedule a second valid entry slot on Tuesday Period 2', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId,
          dayOfWeek: 2, // Tuesday
          periodId: period2Id,
          subjectId,
          teacherId: teacherProfileId,
          roomId: classroomId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dayOfWeek).toBe(2);
    });

    it('should list timetable entries for this timetable', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });

  // =========================================================================
  // 5. 2D Matrix Views & Workload Tests
  // =========================================================================
  describe('2D Weekly Grid Matrix Views & Workload', () => {
    it('should return class 2D timetable grid with correct period rows and day columns', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableId}/views/class/${academicClassId}`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timetableId).toBe(timetableId);
      expect(res.body.data.workingDays.length).toBe(5); // Mon-Fri
      expect(res.body.data.grid).toBeDefined();

      // Check slot for Period 1, Monday (Day 1)
      const p1MonSlot = res.body.data.grid[period1Id][1];
      expect(p1MonSlot).toBeDefined();
      expect(p1MonSlot.subjectName).toBe('Advanced Mathematics');
      expect(p1MonSlot.teacherId).toBe(teacherProfileId);

      // Check break slot
      const breakSlot = res.body.data.grid[breakPeriodId][1];
      expect(breakSlot.isBreak).toBe(true);
    });

    it('should return teacher 2D timetable grid', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableId}/views/teacher/${teacherProfileId}`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.teacherId).toBe(teacherProfileId);
      expect(res.body.data.totalWeeklyPeriods).toBe(2);
      expect(res.body.data.grid[period1Id][1].subjectName).toBe('Advanced Mathematics');
    });

    it('should return room 2D timetable grid', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableId}/views/room/${classroomId}`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.roomId).toBe(classroomId);
      expect(res.body.data.grid[period1Id][1].className).toBe('Grade 10');
    });

    it('should return teacher workload summary with aggregation across subjects and days', async () => {
      const res = await request(app)
        .get(`/api/v1/timetable/timetables/${timetableId}/teacher-workload`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalTeachers).toBe(1);
      const teacherWorkload = res.body.data.workload[0];
      expect(teacherWorkload.teacherId).toBe(teacherProfileId);
      expect(teacherWorkload.totalPeriodsPerWeek).toBe(2);
      expect(teacherWorkload.byDay[1]).toBe(1);
      expect(teacherWorkload.byDay[2]).toBe(1);
    });
  });

  // =========================================================================
  // 6. Timetable Versioning, Publishing & Cloning Tests
  // =========================================================================
  describe('Timetable Publishing & Version Cloning', () => {
    it('should validate entire timetable before publish with 0 errors', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/validate`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.summary.teacherConflicts).toBe(0);
      expect(res.body.data.summary.classConflicts).toBe(0);
    });

    it('should publish the draft timetable successfully and set isCurrent to true', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/publish`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timetable.status).toBe(TimetableStatus.PUBLISHED);
      expect(res.body.data.timetable.isCurrent).toBe(true);
      expect(res.body.data.timetable.publishedAt).toBeDefined();
    });

    it('should allow authenticated teacher to view their own schedule via /my-schedule', async () => {
      const res = await request(app)
        .get('/api/v1/timetable/my-schedule')
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${teacherUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.teacherId).toBe(teacherProfileId);
      expect(res.body.data.totalWeeklyPeriods).toBe(2);
    });

    it('should clone the published timetable into a new draft (version 2)', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/clone`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Term 2 Schedule (v2)',
          effectiveFrom: '2027-02-01',
          effectiveTo: '2027-06-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.status).toBe(TimetableStatus.DRAFT);
      expect(res.body.data.isCurrent).toBe(false);
      expect(res.body.data.totalEntries).toBe(2); // Copied entries
    });

    it('should archive a timetable successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/archive`)
        .set('Host', 'oxford.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TimetableStatus.ARCHIVED);
      expect(res.body.data.isCurrent).toBe(false);
    });
  });
});
