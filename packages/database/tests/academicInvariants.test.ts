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
  Student,
  StudentEnrollment,
  StudentAttendance,
  Teacher,
  User,
} from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  AttendanceStatus,
  UserType,
} from '@edusphere/common';

describe('Academic Domain Invariants Suite', () => {
  let tenantId: Types.ObjectId;
  let schoolId: Types.ObjectId;
  let campusId: Types.ObjectId;
  let academicYearId: Types.ObjectId;
  let classId: Types.ObjectId;
  let sectionId: Types.ObjectId;
  let student1Id: Types.ObjectId;
  let student2Id: Types.ObjectId;
  let teacherId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await StudentEnrollment.init();
    await StudentAttendance.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const t = await Tenant.create({
      name: 'Oxford Academy',
      slug: 'oxford',
      plan: TenantPlan.GROWTH,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenantId = t._id as Types.ObjectId;

    const s = await School.create({
      tenantId,
      name: 'Oxford Senior School',
      code: 'OSS',
      affiliationBoard: 'CBSE',
    });
    schoolId = s._id as Types.ObjectId;

    const c = await Campus.create({
      tenantId,
      schoolId,
      name: 'North Campus',
      code: 'NC',
      address: {
        street: 'Oxford Way',
        city: 'London',
        state: 'Oxfordshire',
        postalCode: 'OX1',
        country: 'UK',
      },
    });
    campusId = c._id as Types.ObjectId;

    const ay = await AcademicYear.create({
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    });
    academicYearId = ay._id as Types.ObjectId;

    const cls = await Class.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
    });
    classId = cls._id as Types.ObjectId;

    const sec = await Section.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId,
      name: 'Section A',
      capacity: 40,
    });
    sectionId = sec._id as Types.ObjectId;

    const st1 = await Student.create({
      tenantId,
      schoolId,
      admissionNumber: 'OXF-001',
      personalDetails: {
        firstName: 'Harry',
        lastName: 'Potter',
        dateOfBirth: new Date('2010-07-31'),
        gender: 'MALE',
      },
      contactDetails: { emergencyPhone: '9876543210', currentAddress: '4 Privet Drive' },
      currentStatus: StudentStatus.ACTIVE,
    });
    student1Id = st1._id as Types.ObjectId;

    const st2 = await Student.create({
      tenantId,
      schoolId,
      admissionNumber: 'OXF-002',
      personalDetails: {
        firstName: 'Ron',
        lastName: 'Weasley',
        dateOfBirth: new Date('2010-03-01'),
        gender: 'MALE',
      },
      contactDetails: { emergencyPhone: '9876543211', currentAddress: 'The Burrow' },
      currentStatus: StudentStatus.ACTIVE,
    });
    student2Id = st2._id as Types.ObjectId;

    const u = await User.create({
      tenantId,
      email: 'mcgonagall@oxford.edu',
      passwordHash: 'hash',
      userType: UserType.TEACHER,
    });

    const tch = await Teacher.create({
      tenantId,
      schoolId,
      userId: u._id,
      employeeId: 'EMP-001',
      department: 'Transfiguration',
      designation: 'Professor',
      joiningDate: new Date('2020-01-01'),
    });
    teacherId = tch._id as Types.ObjectId;
  });

  it('should prevent a student from having two active enrollments in the same academic year', async () => {
    // Enroll Harry in Grade 10 Section A
    await StudentEnrollment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: student1Id,
      academicYearId,
      classId,
      sectionId,
      rollNumber: 1,
      status: 'ENROLLED',
      startDate: new Date('2026-04-01'),
    });

    // Attempting another enrollment for Harry in same academic year must fail
    await expect(
      StudentEnrollment.create({
        tenantId,
        schoolId,
        campusId,
        studentId: student1Id,
        academicYearId,
        classId,
        sectionId,
        rollNumber: 2,
        status: 'ENROLLED',
        startDate: new Date('2026-04-01'),
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should prevent duplicate roll numbers within the same section and academic year', async () => {
    // Enroll Harry with Roll Number 7
    await StudentEnrollment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: student1Id,
      academicYearId,
      classId,
      sectionId,
      rollNumber: 7,
      status: 'ENROLLED',
      startDate: new Date('2026-04-01'),
    });

    // Enrolling Ron with duplicate Roll Number 7 in same section must fail
    await expect(
      StudentEnrollment.create({
        tenantId,
        schoolId,
        campusId,
        studentId: student2Id,
        academicYearId,
        classId,
        sectionId,
        rollNumber: 7,
        status: 'ENROLLED',
        startDate: new Date('2026-04-01'),
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should enforce unique section daily attendance submission', async () => {
    const attendanceDate = new Date('2026-09-01T00:00:00.000Z');

    // First submission succeeds
    await StudentAttendance.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId,
      sectionId,
      date: attendanceDate,
      takenBy: teacherId,
      records: [
        { studentId: student1Id, status: AttendanceStatus.PRESENT },
        { studentId: student2Id, status: AttendanceStatus.ABSENT, remarks: 'Sick' },
      ],
    });

    // Duplicate submission for same section on same date fails
    await expect(
      StudentAttendance.create({
        tenantId,
        schoolId,
        campusId,
        academicYearId,
        classId,
        sectionId,
        date: attendanceDate,
        takenBy: teacherId,
        records: [{ studentId: student1Id, status: AttendanceStatus.PRESENT }],
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });
});
