import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  Class,
  Section,
  AcademicClass,
  Subject,
  Teacher,
  User,
  Period,
  Classroom,
  Timetable,
  TimetableEntry,
} from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  AcademicStatus,
  PeriodType,
  TimetableStatus,
  RoomType,
  TimetableEntryStatus,
  UserType,
} from '@edusphere/common';

describe('Timetable & Scheduling Domain Invariants Suite (Phase 9)', () => {
  let tenantId: Types.ObjectId;
  let schoolId: Types.ObjectId;
  let campusId: Types.ObjectId;
  let academicYearId: Types.ObjectId;
  let classId: Types.ObjectId;
  let sectionId: Types.ObjectId;
  let academicClassId: Types.ObjectId;
  let subjectId: Types.ObjectId;
  let teacherId: Types.ObjectId;
  let period1Id: Types.ObjectId;
  let period2Id: Types.ObjectId;
  let classroomId: Types.ObjectId;
  let timetableId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Period.init();
    await Classroom.init();
    await Timetable.init();
    await TimetableEntry.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const t = await Tenant.create({
      name: 'Cambridge Academy',
      slug: 'cambridge',
      plan: TenantPlan.GROWTH,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenantId = t._id as Types.ObjectId;

    const s = await School.create({
      tenantId,
      name: 'Cambridge High School',
      code: 'CHS',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      affiliationBoard: 'CBSE',
    });
    schoolId = s._id as Types.ObjectId;

    const c = await Campus.create({
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MC',
      address: {
        street: '123 University Ave',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
        country: 'India',
      },
    });
    campusId = c._id as Types.ObjectId;

    const ay = await AcademicYear.create({
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
    });
    academicYearId = ay._id as Types.ObjectId;

    const cls = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
    });
    classId = cls._id as Types.ObjectId;

    const sec = await Section.create({
      tenantId,
      schoolId,
      classId,
      name: 'Section A',
      code: 'A',
      capacity: 40,
    });
    sectionId = sec._id as Types.ObjectId;

    const ac = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId,
      sectionId,
      capacity: 40,
    });
    academicClassId = ac._id as Types.ObjectId;

    const sub = await Subject.create({
      tenantId,
      schoolId,
      name: 'Mathematics',
      code: 'MATH10',
      type: 'CORE',
    });
    subjectId = sub._id as Types.ObjectId;

    const u = await User.create({
      tenantId,
      schoolId,
      email: 'teacher@cambridge.edu',
      passwordHash: 'hash123',
      userType: UserType.TEACHER,
    });

    const tch = await Teacher.create({
      tenantId,
      schoolId,
      employeeId: 'EMP-001',
      userId: u._id,
      teacherCode: 'TCH-001',
      primarySubject: 'Mathematics',
      teachingExperienceYears: 5,
      department: 'Mathematics',
      designation: 'Senior Teacher',
      joiningDate: new Date('2020-01-01'),
    });
    teacherId = tch._id as Types.ObjectId;

    // Create Periods
    const p1 = await Period.create({
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
    period1Id = p1._id as Types.ObjectId;

    const p2 = await Period.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Period 2',
      code: 'P2',
      sequence: 2,
      startTime: '09:15',
      endTime: '10:00',
      duration: 45,
      type: PeriodType.TEACHING,
      status: AcademicStatus.ACTIVE,
    });
    period2Id = p2._id as Types.ObjectId;

    // Create Classroom
    const room = await Classroom.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Room 101',
      code: 'RM-101',
      roomNumber: '101',
      capacity: 45,
      roomType: RoomType.CLASSROOM,
      status: AcademicStatus.ACTIVE,
    });
    classroomId = room._id as Types.ObjectId;

    // Create Timetable
    const tt = await Timetable.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      name: '2026-2027 Master Schedule',
      code: 'MS-2026',
      status: TimetableStatus.DRAFT,
      version: 1,
      isCurrent: false,
      effectiveFrom: new Date('2026-04-01'),
    });
    timetableId = tt._id as Types.ObjectId;
  });

  it('enforces period code uniqueness per campus', async () => {
    await expect(
      Period.create({
        tenantId,
        schoolId,
        campusId,
        name: 'Period 1 Duplicate',
        code: 'P1',
        sequence: 3,
        startTime: '10:00',
        endTime: '10:45',
        duration: 45,
        type: PeriodType.TEACHING,
      })
    ).rejects.toThrow();
  });

  it('enforces classroom code uniqueness per campus', async () => {
    await expect(
      Classroom.create({
        tenantId,
        schoolId,
        campusId,
        name: 'Another Room 101',
        code: 'RM-101',
        capacity: 40,
        roomType: RoomType.CLASSROOM,
      })
    ).rejects.toThrow();
  });

  it('prevents class double-booking in the same day and period slot', async () => {
    // 1. Create first valid entry for Monday Period 1
    await TimetableEntry.create({
      tenantId,
      schoolId,
      timetableId,
      academicClassId,
      classId,
      sectionId,
      dayOfWeek: 1, // Monday
      periodId: period1Id,
      subjectId,
      teacherId,
      roomId: classroomId,
      status: TimetableEntryStatus.ACTIVE,
    });

    // 2. Attempt to schedule another subject for the SAME academic class during Monday Period 1
    const sub2 = await Subject.create({
      tenantId,
      schoolId,
      name: 'Physics',
      code: 'PHY10',
      type: 'CORE',
    });

    await expect(
      TimetableEntry.create({
        tenantId,
        schoolId,
        timetableId,
        academicClassId,
        classId,
        sectionId,
        dayOfWeek: 1, // Same Monday
        periodId: period1Id, // Same Period 1
        subjectId: sub2._id,
        teacherId,
        roomId: classroomId,
        status: TimetableEntryStatus.ACTIVE,
      })
    ).rejects.toThrow();
  });

  it('prevents teacher double-booking across different classes in the same day and period slot', async () => {
    // 1. First entry: Teacher teaches Grade 10-A on Monday Period 1
    await TimetableEntry.create({
      tenantId,
      schoolId,
      timetableId,
      academicClassId,
      classId,
      sectionId,
      dayOfWeek: 1, // Monday
      periodId: period1Id,
      subjectId,
      teacherId,
      status: TimetableEntryStatus.ACTIVE,
    });

    // 2. Create another section: Grade 10-B
    const secB = await Section.create({
      tenantId,
      schoolId,
      classId,
      name: 'Section B',
      code: 'B',
      capacity: 40,
    });
    const acB = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId,
      sectionId: secB._id as Types.ObjectId,
      capacity: 40,
    });

    // 3. Attempt to schedule the SAME teacher in Grade 10-B during Monday Period 1
    await expect(
      TimetableEntry.create({
        tenantId,
        schoolId,
        timetableId,
        academicClassId: acB._id as Types.ObjectId,
        classId,
        sectionId: secB._id as Types.ObjectId,
        dayOfWeek: 1, // Monday
        periodId: period1Id, // Period 1 (collision!)
        subjectId,
        teacherId, // Same teacher!
        status: TimetableEntryStatus.ACTIVE,
      })
    ).rejects.toThrow();
  });

  it('prevents room double-booking across different classes in the same day and period slot', async () => {
    // 1. First entry: Grade 10-A is in Room 101 on Monday Period 1
    await TimetableEntry.create({
      tenantId,
      schoolId,
      timetableId,
      academicClassId,
      classId,
      sectionId,
      dayOfWeek: 1, // Monday
      periodId: period1Id,
      subjectId,
      teacherId,
      roomId: classroomId,
      status: TimetableEntryStatus.ACTIVE,
    });

    // 2. Create another teacher & section
    const u2 = await User.create({
      tenantId,
      schoolId,
      email: 'teacher2@cambridge.edu',
      passwordHash: 'hash123',
      userType: UserType.TEACHER,
    });
    const tch2 = await Teacher.create({
      tenantId,
      schoolId,
      employeeId: 'EMP-002',
      userId: u2._id,
      teacherCode: 'TCH-002',
      department: 'Science',
      designation: 'Faculty',
      joiningDate: new Date('2021-01-01'),
    });
    const secB = await Section.create({
      tenantId,
      schoolId,
      classId,
      name: 'Section B',
      code: 'B',
      capacity: 40,
    });
    const acB = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId,
      sectionId: secB._id as Types.ObjectId,
      capacity: 40,
    });

    // 3. Attempt to book Room 101 for Grade 10-B during the SAME Monday Period 1
    await expect(
      TimetableEntry.create({
        tenantId,
        schoolId,
        timetableId,
        academicClassId: acB._id as Types.ObjectId,
        classId,
        sectionId: secB._id as Types.ObjectId,
        dayOfWeek: 1, // Monday
        periodId: period1Id, // Period 1
        subjectId,
        teacherId: tch2._id as Types.ObjectId,
        roomId: classroomId, // Same Room 101!
        status: TimetableEntryStatus.ACTIVE,
      })
    ).rejects.toThrow();
  });

  it('allows scheduling different periods for the same class or teacher without conflict', async () => {
    // Period 1
    const e1 = await TimetableEntry.create({
      tenantId,
      schoolId,
      timetableId,
      academicClassId,
      classId,
      sectionId,
      dayOfWeek: 1,
      periodId: period1Id,
      subjectId,
      teacherId,
      roomId: classroomId,
      status: TimetableEntryStatus.ACTIVE,
    });

    // Period 2
    const e2 = await TimetableEntry.create({
      tenantId,
      schoolId,
      timetableId,
      academicClassId,
      classId,
      sectionId,
      dayOfWeek: 1,
      periodId: period2Id, // Different period
      subjectId,
      teacherId,
      roomId: classroomId,
      status: TimetableEntryStatus.ACTIVE,
    });

    expect(e1._id).toBeDefined();
    expect(e2._id).toBeDefined();
  });
});
