import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  StudentAttendance,
  AttendanceCorrection,
  Holiday,
} from '../src/models/attendance.model.js';
import {
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
  HolidayType,
} from '@edusphere/common';

describe('Phase 10: Attendance & Calendar Database Invariants', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const classId = new Types.ObjectId();
  const sectionId = new Types.ObjectId();
  const academicClassId = new Types.ObjectId();
  const teacherId = new Types.ObjectId();
  const student1Id = new Types.ObjectId();
  const student2Id = new Types.ObjectId();
  const period1Id = new Types.ObjectId();
  const period2Id = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await StudentAttendance.init();
    await AttendanceCorrection.init();
    await Holiday.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should enforce unique daily attendance submission per section per calendar day', async () => {
    const attendanceDate = new Date('2026-09-14T00:00:00.000Z');

    // 1. First daily attendance submission succeeds
    const session1 = await StudentAttendance.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      classId,
      sectionId,
      date: attendanceDate,
      attendanceMode: AttendanceMode.DAILY,
      takenBy: teacherId,
      status: AttendanceLifecycleStatus.SUBMITTED,
      records: [
        { studentId: student1Id, status: AttendanceStatus.PRESENT },
        { studentId: student2Id, status: AttendanceStatus.ABSENT, remarks: 'Fever' },
      ],
    });

    expect(session1._id).toBeDefined();
    expect(session1.records).toHaveLength(2);

    // 2. Duplicate daily attendance for the same section & date throws E11000 duplicate key error
    await expect(
      StudentAttendance.create({
        tenantId,
        schoolId,
        campusId,
        academicYearId,
        academicClassId,
        classId,
        sectionId,
        date: attendanceDate,
        attendanceMode: AttendanceMode.DAILY,
        takenBy: teacherId,
        status: AttendanceLifecycleStatus.SUBMITTED,
        records: [{ studentId: student1Id, status: AttendanceStatus.PRESENT }],
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should allow multiple period attendance on same day but prevent duplicate period slot', async () => {
    const periodDate = new Date('2026-09-15T00:00:00.000Z');

    // 1. Period 1 attendance succeeds
    const p1Session = await StudentAttendance.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      classId,
      sectionId,
      date: periodDate,
      attendanceMode: AttendanceMode.PERIOD,
      periodId: period1Id,
      takenBy: teacherId,
      status: AttendanceLifecycleStatus.SUBMITTED,
      records: [{ studentId: student1Id, status: AttendanceStatus.PRESENT }],
    });
    expect(p1Session._id).toBeDefined();

    // 2. Period 2 attendance on same day and section also succeeds
    const p2Session = await StudentAttendance.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      classId,
      sectionId,
      date: periodDate,
      attendanceMode: AttendanceMode.PERIOD,
      periodId: period2Id,
      takenBy: teacherId,
      status: AttendanceLifecycleStatus.SUBMITTED,
      records: [{ studentId: student1Id, status: AttendanceStatus.PRESENT }],
    });
    expect(p2Session._id).toBeDefined();

    // 3. Duplicate Period 1 on same day & section fails with E11000
    await expect(
      StudentAttendance.create({
        tenantId,
        schoolId,
        campusId,
        academicYearId,
        academicClassId,
        classId,
        sectionId,
        date: periodDate,
        attendanceMode: AttendanceMode.PERIOD,
        periodId: period1Id,
        takenBy: teacherId,
        records: [{ studentId: student1Id, status: AttendanceStatus.ABSENT }],
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should query attendance records by studentId via multikey index', async () => {
    const records = await StudentAttendance.find({
      tenantId,
      'records.studentId': student1Id,
    });
    expect(records.length).toBeGreaterThanOrEqual(2);
  });

  it('should create and track AttendanceCorrection audit records', async () => {
    const attendanceDoc = await StudentAttendance.findOne({ tenantId });
    expect(attendanceDoc).toBeDefined();

    const correction = await AttendanceCorrection.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      attendanceId: attendanceDoc!._id,
      studentId: student1Id,
      oldStatus: AttendanceStatus.ABSENT,
      newStatus: AttendanceStatus.PRESENT,
      reason: 'Late bus arrival verified by transport in-charge',
      requestedBy: teacherId,
      status: CorrectionStatus.PENDING,
    });

    expect(correction._id).toBeDefined();
    expect(correction.status).toBe(CorrectionStatus.PENDING);
    expect(correction.reason).toContain('Late bus arrival');
  });

  it('should create Holiday and prevent duplicate holiday on same start date and name', async () => {
    const holidayDate = new Date('2026-10-02T00:00:00.000Z');

    const holiday = await Holiday.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      name: 'Gandhi Jayanti',
      startDate: holidayDate,
      endDate: holidayDate,
      type: HolidayType.PUBLIC_HOLIDAY,
      description: 'National holiday in observance of Gandhi Jayanti',
    });

    expect(holiday._id).toBeDefined();

    // Duplicate holiday for same campus, year, date and name throws E11000
    await expect(
      Holiday.create({
        tenantId,
        schoolId,
        campusId,
        academicYearId,
        name: 'Gandhi Jayanti',
        startDate: holidayDate,
        endDate: holidayDate,
        type: HolidayType.PUBLIC_HOLIDAY,
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });
});
