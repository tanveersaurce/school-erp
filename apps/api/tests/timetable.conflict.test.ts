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

describe('Timetable Scheduling Conflict Engine Test Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let schoolAdminToken: string;
  let teacherProfile1Id: string;
  let teacherProfile2Id: string;

  let academicClass1Id: string;
  let academicClass2Id: string;
  let subject1Id: string;
  let subject2Id: string;
  let periodTeachingId: string;
  let periodBreakId: string;
  let smallRoomId: string;
  let largeRoomId: string;
  let timetableId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Conflict Test Academy',
      slug: 'conflict-test',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 1000, modulesEnabled: ['ALL'] },
    });

    // 2. Seed School with working days Mon-Fri (1-5)
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Conflict Test High',
      code: 'CTH-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@cth.edu', phone: '9876543210' },
      address: {
        street: '1 High Street',
        city: 'London',
        state: 'London',
        postalCode: 'EC1A 1BB',
        country: 'UK',
      },
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

    // 3. Seed Campus & Academic Year
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'South Campus',
      code: 'SC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '1 High Street',
        city: 'London',
        state: 'London',
        postalCode: 'EC1A 1BB',
        country: 'UK',
      },
    });

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

    // 4. Seed Permissions & Roles
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

    // 5. Seed Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@cth.edu',
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

    // 6. Seed Two Teachers
    const tUser1 = await User.create({
      tenantId,
      schoolId,
      email: 'prof.einstein@cth.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'Albert',
      lastName: 'Einstein',
    });
    const teacher1 = await Teacher.create({
      tenantId,
      schoolId,
      userId: tUser1._id,
      employeeId: 'EMP-TCH-001',
      department: 'Physics',
      designation: 'Professor',
      joiningDate: new Date('2020-01-01'),
    });
    teacherProfile1Id = teacher1._id.toString();

    const tUser2 = await User.create({
      tenantId,
      schoolId,
      email: 'prof.curie@cth.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      firstName: 'Marie',
      lastName: 'Curie',
    });
    const teacher2 = await Teacher.create({
      tenantId,
      schoolId,
      userId: tUser2._id,
      employeeId: 'EMP-TCH-002',
      department: 'Chemistry',
      designation: 'Professor',
      joiningDate: new Date('2020-01-01'),
    });
    teacherProfile2Id = teacher2._id.toString();

    // 7. Seed Classes & Sections
    const class1 = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 9',
      code: 'G9',
      stage: EducationLevel.SECONDARY,
      order: 9,
    });
    const section1 = await Section.create({
      tenantId,
      schoolId,
      classId: class1._id,
      name: 'Section A',
      code: 'A',
      capacity: 30,
    });
    const ac1 = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: class1._id,
      sectionId: section1._id,
      capacity: 30,
      classTeacherId: teacher1._id,
    });
    academicClass1Id = ac1._id.toString();

    const class2 = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 10',
      code: 'G10',
      stage: EducationLevel.SECONDARY,
      order: 10,
    });
    const section2 = await Section.create({
      tenantId,
      schoolId,
      classId: class2._id,
      name: 'Section B',
      code: 'B',
      capacity: 35,
    });
    const ac2 = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: class2._id,
      sectionId: section2._id,
      capacity: 35,
      classTeacherId: teacher2._id,
    });
    academicClass2Id = ac2._id.toString();

    // 8. Seed Subjects & Assignments
    const sub1 = await Subject.create({
      tenantId,
      schoolId,
      name: 'Physics',
      code: 'PHY101',
      type: 'CORE',
    });
    subject1Id = sub1._id.toString();

    const sub2 = await Subject.create({
      tenantId,
      schoolId,
      name: 'Chemistry',
      code: 'CHEM101',
      type: 'CORE',
    });
    subject2Id = sub2._id.toString();

    await ClassSubject.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: class1._id,
      subjectId: sub1._id,
      periodsPerWeek: 4,
    });

    await ClassSubject.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: class2._id,
      subjectId: sub2._id,
      periodsPerWeek: 4,
    });

    await TeacherSubjectAssignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId: ac1._id,
      classId: class1._id,
      sectionId: section1._id,
      subjectId: sub1._id,
      teacherId: teacher1._id,
      status: 'ACTIVE',
    });

    await TeacherSubjectAssignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId: ac2._id,
      classId: class2._id,
      sectionId: section2._id,
      subjectId: sub2._id,
      teacherId: teacher2._id,
      status: 'ACTIVE',
    });

    // 9. Seed Periods
    const pTeach = await Period.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Period 1',
      code: 'P1',
      sequence: 1,
      startTime: '08:30',
      endTime: '09:15',
      duration: 45,
      type: PeriodType.TEACHING,
      status: AcademicStatus.ACTIVE,
    });
    periodTeachingId = pTeach._id.toString();

    const pBreak = await Period.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Lunch Break',
      code: 'LUNCH',
      sequence: 2,
      startTime: '12:00',
      endTime: '12:45',
      duration: 45,
      type: PeriodType.LUNCH,
      status: AcademicStatus.ACTIVE,
    });
    periodBreakId = pBreak._id.toString();

    // 10. Seed Rooms (small room 20 capacity vs class 30 capacity)
    const smallRoom = await Classroom.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Small Tutorial Room',
      code: 'TUT-01',
      capacity: 20, // less than class1 capacity (30)
      roomType: RoomType.CLASSROOM,
    });
    smallRoomId = smallRoom._id.toString();

    const largeRoom = await Classroom.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Main Lecture Hall',
      code: 'HALL-A',
      capacity: 60,
      roomType: RoomType.AUDITORIUM,
    });
    largeRoomId = largeRoom._id.toString();

    // 11. Seed Timetable
    const tt = await Timetable.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      name: 'Conflict Test Timetable',
      status: TimetableStatus.DRAFT,
      version: 1,
      isCurrent: false,
      effectiveFrom: new Date('2026-09-01'),
    });
    timetableId = tt._id.toString();

    // 12. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'conflict-test.edusphere.io')
      .send({ email: 'admin@cth.edu', password: 'Admin@123456' });
    schoolAdminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // Conflict Detection Engine Tests
  // =========================================================================
  describe('Conflict Engine Verifications', () => {
    it('successfully creates base slot: Class 1, Mon P1, Teacher 1, Large Room', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId: academicClass1Id,
          dayOfWeek: 1, // Monday
          periodId: periodTeachingId,
          subjectId: subject1Id,
          teacherId: teacherProfile1Id,
          roomId: largeRoomId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects TEACHER_CONFLICT: same teacher scheduled concurrently in another class', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId: academicClass2Id, // different class
          dayOfWeek: 1, // same Monday
          periodId: periodTeachingId, // same Period 1
          subjectId: subject2Id,
          teacherId: teacherProfile1Id, // SAME teacher!
          roomId: smallRoomId,
        });

      expect(res.status).toBe(409);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('is already assigned to');
    });

    it('rejects CLASS_CONFLICT: class cannot have two simultaneous subjects/teachers', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId: academicClass1Id, // SAME class!
          dayOfWeek: 1, // same Monday
          periodId: periodTeachingId, // same Period 1
          subjectId: subject2Id,
          teacherId: teacherProfile2Id, // different teacher
          roomId: smallRoomId,
        });

      expect(res.status).toBe(409);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('already has');
    });

    it('rejects ROOM_CONFLICT: room cannot be double-booked across classes', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId: academicClass2Id, // different class
          dayOfWeek: 1, // same Monday
          periodId: periodTeachingId, // same Period 1
          subjectId: subject2Id,
          teacherId: teacherProfile2Id, // different teacher
          roomId: largeRoomId, // SAME room!
        });

      expect(res.status).toBe(409);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('is already booked');
    });

    it('rejects PERIOD_TYPE_INVALID: cannot schedule subject in a LUNCH / BREAK period', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/entries`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId: academicClass2Id,
          dayOfWeek: 1,
          periodId: periodBreakId, // Lunch period!
          subjectId: subject2Id,
          teacherId: teacherProfile2Id,
        });

      expect(res.status).toBe(409);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('Cannot schedule subject');
      expect(errMsg).toContain('LUNCH');
    });

    it('returns conflict details via validate-slot endpoint without inserting', async () => {
      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/validate-slot`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicClassId: academicClass2Id,
          dayOfWeek: 1,
          periodId: periodTeachingId,
          subjectId: subject2Id,
          teacherId: teacherProfile1Id, // Teacher conflict
          roomId: largeRoomId, // Room conflict
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(false);
      expect(res.body.data.conflicts.length).toBeGreaterThanOrEqual(2);
      const types = res.body.data.conflicts.map((c: any) => c.type);
      expect(types).toContain('TEACHER_CONFLICT');
      expect(types).toContain('ROOM_CONFLICT');
    });

    it('prevents publishing timetable when fatal scheduling conflicts exist', async () => {
      // Force insert a conflict directly into DB bypassing service to test publish gatekeeper
      await TimetableEntry.create({
        tenantId,
        schoolId,
        timetableId,
        academicClassId: new Types.ObjectId(academicClass2Id),
        classId: new Types.ObjectId(),
        sectionId: new Types.ObjectId(),
        dayOfWeek: 1,
        periodId: new Types.ObjectId(periodBreakId), // Lunch break!
        subjectId: new Types.ObjectId(subject2Id),
        teacherId: new Types.ObjectId(teacherProfile2Id),
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post(`/api/v1/timetable/timetables/${timetableId}/publish`)
        .set('Host', 'conflict-test.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('Cannot publish timetable with scheduling errors');
    });
  });
});
