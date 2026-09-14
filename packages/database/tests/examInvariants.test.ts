import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  GradingScheme,
  Exam,
  ExamSchedule,
  ExamMark,
  Result,
} from '../src/models/exam.model.js';
import {
  ExamStatus,
  ExamType,
  MarkStatus,
  ResultStatus,
} from '@edusphere/common';

describe('Phase 12: Examination & Results Database Invariants', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const academicClassId = new Types.ObjectId();
  const classId = new Types.ObjectId();
  const sectionId = new Types.ObjectId();
  const subjectId1 = new Types.ObjectId();
  const subjectId2 = new Types.ObjectId();
  const student1Id = new Types.ObjectId();
  const student2Id = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await GradingScheme.init();
    await Exam.init();
    await ExamSchedule.init();
    await ExamMark.init();
    await Result.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should enforce unique compound index on GradingScheme per tenant, school, and code', async () => {
    const scheme1 = await GradingScheme.create({
      tenantId,
      schoolId,
      name: 'Standard CBSE Scale',
      code: 'CBSE_10',
      isDefault: true,
      grades: [
        { grade: 'A1', minPercentage: 91, maxPercentage: 100, gradePoint: 10, isPassing: true },
        { grade: 'A2', minPercentage: 81, maxPercentage: 90, gradePoint: 9, isPassing: true },
        { grade: 'B1', minPercentage: 71, maxPercentage: 80, gradePoint: 8, isPassing: true },
        { grade: 'E', minPercentage: 0, maxPercentage: 32, gradePoint: 0, isPassing: false },
      ],
    });
    expect(scheme1._id).toBeDefined();

    // Duplicate code within same tenant & school must fail
    await expect(
      GradingScheme.create({
        tenantId,
        schoolId,
        name: 'Duplicate CBSE Scale',
        code: 'CBSE_10',
        isDefault: false,
        grades: [],
      })
    ).rejects.toThrow(/duplicate key error/);
  });

  it('should enforce unique compound index on ExamSchedule preventing same subject scheduled twice for same class in exam', async () => {
    const exam = await Exam.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      title: 'Mid Term Examination 2026',
      code: 'MID_2026',
      examType: ExamType.MID_TERM,
      status: ExamStatus.SCHEDULED,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-15'),
      academicClassIds: [academicClassId],
    });
    expect(exam._id).toBeDefined();

    const schedule1 = await ExamSchedule.create({
      tenantId,
      schoolId,
      campusId,
      examId: exam._id,
      academicClassId,
      subjectId: subjectId1,
      examDate: new Date('2026-10-02'),
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 100,
      passMarks: 33,
    });
    expect(schedule1._id).toBeDefined();

    // Attempting to schedule the same subject for the same academic class in the same exam must fail
    await expect(
      ExamSchedule.create({
        tenantId,
        schoolId,
        campusId,
        examId: exam._id,
        academicClassId,
        subjectId: subjectId1,
        examDate: new Date('2026-10-05'),
        startTime: '13:00',
        endTime: '16:00',
        maxMarks: 100,
        passMarks: 33,
      })
    ).rejects.toThrow(/duplicate key error/);
  });

  it('should enforce unique compound index on ExamMark preventing duplicate student mark records for same subject & exam', async () => {
    const exam = await Exam.findOne({ tenantId, code: 'MID_2026' });
    expect(exam).toBeDefined();

    const mark1 = await ExamMark.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      examId: exam!._id,
      academicClassId,
      subjectId: subjectId1,
      studentId: student1Id,
      maxMarks: 100,
      marksObtained: 85,
      status: MarkStatus.ENTERED,
      grade: 'A2',
      percentage: 85,
    });
    expect(mark1._id).toBeDefined();

    // Duplicate mark for same student, subject, class, and exam must fail
    await expect(
      ExamMark.create({
        tenantId,
        schoolId,
        campusId,
        academicYearId,
        examId: exam!._id,
        academicClassId,
        subjectId: subjectId1,
        studentId: student1Id,
        maxMarks: 100,
        marksObtained: 90,
        status: MarkStatus.ENTERED,
      })
    ).rejects.toThrow(/duplicate key error/);

    // Different student for same subject succeeds
    const mark2 = await ExamMark.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      examId: exam!._id,
      academicClassId,
      subjectId: subjectId1,
      studentId: student2Id,
      maxMarks: 100,
      marksObtained: 72,
      status: MarkStatus.ENTERED,
      grade: 'B1',
      percentage: 72,
    });
    expect(mark2._id).toBeDefined();
  });

  it('should enforce unique compound index on Result per tenant, exam, student, and version', async () => {
    const exam = await Exam.findOne({ tenantId, code: 'MID_2026' });
    expect(exam).toBeDefined();

    const resultV1 = await Result.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      examId: exam!._id,
      academicClassId,
      classId,
      sectionId,
      studentId: student1Id,
      version: 1,
      isCurrentVersion: true,
      status: 'PUBLISHED',
      subjectResults: [
        {
          subjectId: subjectId1,
          subjectName: 'Mathematics',
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 85,
          status: MarkStatus.ENTERED,
          percentage: 85,
          grade: 'A2',
          isPassed: true,
        },
      ],
      totalMaxMarks: 100,
      totalMarksObtained: 85,
      percentage: 85,
      overallGrade: 'A2',
      resultStatus: ResultStatus.PASS,
      failedSubjectCount: 0,
    });
    expect(resultV1._id).toBeDefined();

    // Duplicate version 1 for same student & exam must fail
    await expect(
      Result.create({
        tenantId,
        schoolId,
        campusId,
        academicYearId,
        examId: exam!._id,
        academicClassId,
        classId,
        sectionId,
        studentId: student1Id,
        version: 1,
        isCurrentVersion: false,
        status: 'CALCULATED',
        subjectResults: [],
        totalMaxMarks: 100,
        totalMarksObtained: 85,
        percentage: 85,
        overallGrade: 'A2',
        resultStatus: ResultStatus.PASS,
        failedSubjectCount: 0,
      })
    ).rejects.toThrow(/duplicate key error/);

    // Version 2 for same student & exam succeeds (for auditable revision history)
    const resultV2 = await Result.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      examId: exam!._id,
      academicClassId,
      classId,
      sectionId,
      studentId: student1Id,
      version: 2,
      isCurrentVersion: true,
      status: 'PUBLISHED',
      subjectResults: [
        {
          subjectId: subjectId1,
          subjectName: 'Mathematics',
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 90,
          status: MarkStatus.ENTERED,
          percentage: 90,
          grade: 'A1',
          isPassed: true,
        },
      ],
      totalMaxMarks: 100,
      totalMarksObtained: 90,
      percentage: 90,
      overallGrade: 'A1',
      resultStatus: ResultStatus.PASS,
      failedSubjectCount: 0,
    });
    expect(resultV2.version).toBe(2);
  });
});
