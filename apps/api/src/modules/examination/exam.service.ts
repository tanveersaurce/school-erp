import { Types } from 'mongoose';
import {
  Exam,
  ExamSchedule,
  ExamMark,
  MarkCorrection,
  Result,
  GradingScheme,
  AcademicClass,
  StudentEnrollment,
  Student,
  Subject,
} from '@edusphere/database';
import {
  ExamStatus,
  MarkStatus,
  ResultStatus,
  CorrectionStatus,
} from '@edusphere/common';
import {
  IGradingScheme,
  IExam,
  IExamSchedule,
  IBulkMarksEntryDto,
  IScheduleConflictCheck,
  ISubjectResultSnapshot,
} from '@edusphere/types';
import { BadRequestError, NotFoundError, ConflictError, AuthorizationError } from '@edusphere/common';
import { GradingService } from './grading.service.js';
import { ExamConflictEngine } from './conflict.engine.js';
import { ExamPolicy } from './exam.policy.js';

export class ExamService {
  // --------------------------------------------------------------------------
  // 1. Grading Schemes
  // --------------------------------------------------------------------------
  public async createGradingScheme(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    data: any
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    GradingService.validateGradingScheme(data.grades);

    if (data.isDefault) {
      await GradingScheme.updateMany({ tenantId: tId, schoolId: sId }, { isDefault: false });
    }

    const scheme = await GradingScheme.create({
      tenantId: tId,
      schoolId: sId,
      name: data.name,
      code: data.code.toUpperCase(),
      isDefault: data.isDefault ?? false,
      grades: data.grades,
    });

    return scheme;
  }

  public async getGradingSchemes(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId): Promise<any[]> {
    return GradingScheme.find({
      tenantId: new Types.ObjectId(tenantId.toString()),
      schoolId: new Types.ObjectId(schoolId.toString()),
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  public async getGradingSchemeById(tenantId: string | Types.ObjectId, id: string): Promise<any> {
    const scheme = await GradingScheme.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });
    if (!scheme) throw new NotFoundError('Grading scheme not found.');
    return scheme;
  }

  // --------------------------------------------------------------------------
  // 2. Exam Management & Lifecycle
  // --------------------------------------------------------------------------
  public async createExam(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    data: any
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    // Check duplicate code
    const existing = await Exam.findOne({ tenantId: tId, code: data.code.toUpperCase(), isDeleted: false });
    if (existing) {
      throw new ConflictError(`An examination with code '${data.code}' already exists.`);
    }

    const exam = await Exam.create({
      tenantId: tId,
      schoolId: sId,
      campusId: data.campusId ? new Types.ObjectId(data.campusId) : undefined,
      academicYearId: new Types.ObjectId(data.academicYearId),
      title: data.title,
      name: data.name || data.title,
      code: data.code.toUpperCase(),
      description: data.description,
      examType: data.examType,
      status: ExamStatus.DRAFT,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      academicClassIds: data.academicClassIds?.map((id: string) => new Types.ObjectId(id)) || [],
      gradingSchemeId: data.gradingSchemeId ? new Types.ObjectId(data.gradingSchemeId) : undefined,
      passingPercentage: data.passingPercentage ?? 33,
      weightagePercentage: data.weightagePercentage,
      createdBy: new Types.ObjectId(userId.toString()),
    });

    return exam;
  }

  public async getExams(
    tenantId: string | Types.ObjectId,
    query: {
      academicYearId?: string;
      campusId?: string;
      examType?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: any[]; meta: any }> {
    const tId = new Types.ObjectId(tenantId.toString());
    const filter: any = { tenantId: tId, isDeleted: false };

    if (query.academicYearId) filter.academicYearId = new Types.ObjectId(query.academicYearId);
    if (query.campusId) filter.campusId = new Types.ObjectId(query.campusId);
    if (query.examType) filter.examType = query.examType;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Exam.find(filter)
        .populate('academicClassIds', 'classId sectionId')
        .populate('gradingSchemeId', 'name code')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit),
      Exam.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getExamById(tenantId: string | Types.ObjectId, id: string): Promise<any> {
    const exam = await Exam.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    })
      .populate('academicClassIds')
      .populate('gradingSchemeId')
      .populate('academicYearId', 'name code startDate endDate');

    if (!exam) throw new NotFoundError('Examination not found.');
    return exam;
  }

  public async updateExam(
    tenantId: string | Types.ObjectId,
    id: string,
    data: any
  ): Promise<any> {
    const exam = await Exam.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!exam) throw new NotFoundError('Examination not found.');

    if (exam.status === ExamStatus.PUBLISHED || exam.status === ExamStatus.ARCHIVED) {
      throw new BadRequestError(`Cannot edit examination in ${exam.status} status.`);
    }

    if (data.title) exam.title = data.title;
    if (data.name) exam.name = data.name;
    if (data.code) exam.code = data.code.toUpperCase();
    if (data.description !== undefined) exam.description = data.description;
    if (data.examType) exam.examType = data.examType;
    if (data.startDate) exam.startDate = new Date(data.startDate);
    if (data.endDate) exam.endDate = new Date(data.endDate);
    if (data.academicClassIds) {
      exam.academicClassIds = data.academicClassIds.map((cId: string) => new Types.ObjectId(cId));
    }
    if (data.gradingSchemeId) exam.gradingSchemeId = new Types.ObjectId(data.gradingSchemeId);
    if (data.passingPercentage !== undefined) exam.passingPercentage = data.passingPercentage;
    if (data.weightagePercentage !== undefined) exam.weightagePercentage = data.weightagePercentage;

    await exam.save();
    return exam;
  }

  public async transitionExamStatus(
    tenantId: string | Types.ObjectId,
    id: string,
    targetStatus: ExamStatus
  ): Promise<any> {
    const exam = await Exam.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!exam) throw new NotFoundError('Examination not found.');

    const currentStatus = exam.status;
    const validTransitions: Record<string, string[]> = {
      [ExamStatus.DRAFT]: [ExamStatus.SCHEDULED, ExamStatus.ONGOING],
      [ExamStatus.SCHEDULED]: [ExamStatus.ONGOING, ExamStatus.COMPLETED],
      [ExamStatus.ONGOING]: [ExamStatus.COMPLETED, ExamStatus.MARKS_ENTRY],
      [ExamStatus.MARKS_ENTRY]: [ExamStatus.VERIFICATION, ExamStatus.RESULTS_PENDING, ExamStatus.COMPLETED],
      [ExamStatus.COMPLETED]: [ExamStatus.MARKS_ENTRY, ExamStatus.RESULTS_PENDING],
      [ExamStatus.VERIFICATION]: [ExamStatus.RESULTS_PENDING, ExamStatus.MARKS_ENTRY],
      [ExamStatus.RESULTS_PENDING]: [ExamStatus.RESULTS_APPROVED, ExamStatus.MARKS_ENTRY],
      [ExamStatus.RESULTS_APPROVED]: [ExamStatus.PUBLISHED, ExamStatus.RESULTS_PENDING],
      [ExamStatus.PUBLISHED]: [ExamStatus.ARCHIVED],
      [ExamStatus.ARCHIVED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ') || 'None'}`
      );
    }

    exam.status = targetStatus;
    if (targetStatus === ExamStatus.PUBLISHED) {
      exam.publishedAt = new Date();
    }

    await exam.save();
    return exam;
  }

  public async deleteExam(tenantId: string | Types.ObjectId, id: string): Promise<void> {
    const exam = await Exam.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!exam) throw new NotFoundError('Examination not found.');
    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestError('Only draft examinations can be deleted.');
    }

    exam.isDeleted = true;
    await exam.save();
  }

  // --------------------------------------------------------------------------
  // 3. Exam Scheduling & Conflict Checking
  // --------------------------------------------------------------------------
  public async createExamSchedule(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    data: any
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    // Conflict Check
    const conflictResult = await ExamConflictEngine.checkConflicts(tId, {
      examId: data.examId,
      academicClassId: data.academicClassId,
      subjectId: data.subjectId,
      examDate: data.examDate,
      startTime: data.startTime,
      endTime: data.endTime,
      roomId: data.roomId,
      invigilatorId: data.invigilatorId,
    });

    if (conflictResult.hasConflict) {
      const messages = conflictResult.conflicts.map((c) => c.message).join(' | ');
      throw new BadRequestError(`Schedule Conflict: ${messages}`);
    }

    const exam = await Exam.findOne({ _id: new Types.ObjectId(data.examId), tenantId: tId });
    if (!exam) throw new NotFoundError('Exam not found.');

    const schedule = await ExamSchedule.create({
      tenantId: tId,
      schoolId: sId,
      campusId: exam.campusId,
      examId: exam._id,
      academicClassId: new Types.ObjectId(data.academicClassId),
      subjectId: new Types.ObjectId(data.subjectId),
      examDate: new Date(data.examDate),
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: data.durationMinutes,
      room: data.room || (data.roomId && !Types.ObjectId.isValid(data.roomId) ? data.roomId : undefined),
      roomId: data.roomId && Types.ObjectId.isValid(data.roomId) ? new Types.ObjectId(data.roomId) : undefined,
      invigilatorId: data.invigilatorId ? new Types.ObjectId(data.invigilatorId) : undefined,
      maxMarks: data.maxMarks,
      passMarks: data.passMarks,
      status: 'SCHEDULED',
    });

    return schedule;
  }

  public async checkScheduleConflicts(
    tenantId: string | Types.ObjectId,
    params: IScheduleConflictCheck
  ): Promise<any> {
    return ExamConflictEngine.checkConflicts(tenantId, params);
  }

  public async getExamSchedules(
    tenantId: string | Types.ObjectId,
    examId: string,
    academicClassId?: string
  ): Promise<any[]> {
    const tId = new Types.ObjectId(tenantId.toString());
    const filter: any = {
      tenantId: tId,
      examId: new Types.ObjectId(examId),
      isDeleted: false,
    };
    if (academicClassId) {
      filter.academicClassId = new Types.ObjectId(academicClassId);
    }

    return ExamSchedule.find(filter)
      .populate('subjectId', 'name code')
      .populate('academicClassId')
      .populate('invigilatorId', 'firstName lastName employeeId')
      .sort({ examDate: 1, startTime: 1 });
  }

  public async deleteExamSchedule(tenantId: string | Types.ObjectId, id: string): Promise<void> {
    const schedule = await ExamSchedule.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!schedule) throw new NotFoundError('Exam schedule not found.');
    schedule.isDeleted = true;
    await schedule.save();
  }

  // --------------------------------------------------------------------------
  // 4. Marks Entry, Validation, Verification & Locking
  // --------------------------------------------------------------------------
  public async getMarksRoster(
    tenantId: string | Types.ObjectId,
    examId: string,
    academicClassId: string,
    subjectId: string
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const eId = new Types.ObjectId(examId);
    const acId = new Types.ObjectId(academicClassId);
    const subId = new Types.ObjectId(subjectId);

    // 1. Fetch all actively enrolled students in this academic class
    const enrollments = await StudentEnrollment.find({
      tenantId: tId,
      academicClassId: acId,
      status: 'ENROLLED',
    })
      .populate('studentId', 'admissionNumber personalDetails')
      .sort({ rollNumber: 1 });

    // 2. Fetch existing marks for this exam, class, subject
    const existingMarks = await ExamMark.find({
      tenantId: tId,
      examId: eId,
      academicClassId: acId,
      subjectId: subId,
      isDeleted: false,
    });

    const marksMap = new Map<string, any>();
    for (const m of existingMarks) {
      marksMap.set(m.studentId.toString(), m);
    }

    // 3. Schedule details for max marks
    const schedule = await ExamSchedule.findOne({
      tenantId: tId,
      examId: eId,
      academicClassId: acId,
      subjectId: subId,
      isDeleted: false,
    });

    const roster = enrollments.map((enr: any) => {
      const sIdStr = enr.studentId._id.toString();
      const existing = marksMap.get(sIdStr);

      return {
        studentId: sIdStr,
        admissionNumber: enr.studentId.admissionNumber,
        firstName: enr.studentId.personalDetails?.firstName || '',
        lastName: enr.studentId.personalDetails?.lastName || '',
        rollNumber: enr.rollNumber,
        markId: existing?._id,
        maxMarks: existing?.maxMarks || schedule?.maxMarks || 100,
        passMarks: schedule?.passMarks || 33,
        marksObtained: existing?.marksObtained ?? null,
        status: existing?.status || MarkStatus.NOT_ENTERED,
        grade: existing?.grade || '',
        percentage: existing?.percentage ?? null,
        remarks: existing?.remarks || '',
        isLocked: existing?.status === MarkStatus.LOCKED,
      };
    });

    return {
      examId,
      academicClassId,
      subjectId,
      maxMarks: schedule?.maxMarks || 100,
      passMarks: schedule?.passMarks || 33,
      students: roster,
    };
  }

  public async enterBulkMarks(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    dto: IBulkMarksEntryDto
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const uId = new Types.ObjectId(userId.toString());
    const eId = new Types.ObjectId(dto.examId);
    const acId = new Types.ObjectId(dto.academicClassId);
    const subId = new Types.ObjectId(dto.subjectId);

    const exam = await Exam.findOne({ _id: eId, tenantId: tId });
    if (!exam) throw new NotFoundError('Exam not found.');
    ExamPolicy.assertExamStateForMarks(exam);

    // Resolve Grading Scheme
    let gradingSchemeGrades: any[] = [];
    if (exam.gradingSchemeId) {
      const scheme = await GradingScheme.findOne({ _id: exam.gradingSchemeId, tenantId: tId });
      if (scheme) gradingSchemeGrades = scheme.grades;
    }

    const results = [];

    for (const entry of dto.entries) {
      const studentId = new Types.ObjectId(entry.studentId);
      const status = entry.status || MarkStatus.ENTERED;

      // Validate bounds
      if (status === MarkStatus.ENTERED || status === MarkStatus.PRESENT) {
        if (entry.marksObtained !== null && entry.marksObtained !== undefined) {
          if (entry.marksObtained < 0 || entry.marksObtained > dto.maxMarks) {
            throw new BadRequestError(
              `Marks obtained (${entry.marksObtained}) must be between 0 and maximum marks (${dto.maxMarks}).`
            );
          }
        }
      }

      // Check existing mark record to prevent overwriting LOCKED marks
      const existing = await ExamMark.findOne({
        tenantId: tId,
        examId: eId,
        academicClassId: acId,
        subjectId: subId,
        studentId,
      });

      if (existing && existing.status === MarkStatus.LOCKED) {
        throw new BadRequestError(
          `Marks for student ${entry.studentId} are LOCKED and cannot be modified directly.`
        );
      }

      // Score calculation
      const scoreData = GradingService.calculateSubjectScore(
        entry.marksObtained,
        dto.maxMarks,
        dto.passMarks,
        status,
        gradingSchemeGrades
      );

      const updated = await ExamMark.findOneAndUpdate(
        {
          tenantId: tId,
          examId: eId,
          academicClassId: acId,
          subjectId: subId,
          studentId,
        },
        {
          tenantId: tId,
          schoolId: sId,
          campusId: exam.campusId,
          academicYearId: exam.academicYearId,
          examId: eId,
          academicClassId: acId,
          subjectId: subId,
          studentId,
          maxMarks: dto.maxMarks,
          marksObtained: status === MarkStatus.ABSENT ? null : entry.marksObtained,
          status,
          grade: scoreData.grade,
          gradePoint: scoreData.gradePoint,
          percentage: scoreData.percentage,
          remarks: entry.remarks,
          enteredBy: uId,
          enteredAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push(updated);
    }

    return results;
  }

  public async verifyMarks(
    tenantId: string | Types.ObjectId,
    examId: string,
    academicClassId: string,
    subjectId: string,
    userId: string | Types.ObjectId
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const uId = new Types.ObjectId(userId.toString());

    const result = await ExamMark.updateMany(
      {
        tenantId: tId,
        examId: new Types.ObjectId(examId),
        academicClassId: new Types.ObjectId(academicClassId),
        subjectId: new Types.ObjectId(subjectId),
        status: MarkStatus.ENTERED,
      },
      {
        status: MarkStatus.VERIFIED,
        verifiedBy: uId,
        verifiedAt: new Date(),
      }
    );

    return { updatedCount: result.modifiedCount };
  }

  public async lockMarks(
    tenantId: string | Types.ObjectId,
    examId: string,
    academicClassId: string,
    subjectId: string,
    userId: string | Types.ObjectId
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());

    const result = await ExamMark.updateMany(
      {
        tenantId: tId,
        examId: new Types.ObjectId(examId),
        academicClassId: new Types.ObjectId(academicClassId),
        subjectId: new Types.ObjectId(subjectId),
        status: { $in: [MarkStatus.ENTERED, MarkStatus.VERIFIED] },
      },
      {
        status: MarkStatus.LOCKED,
        lockedAt: new Date(),
      }
    );

    return { lockedCount: result.modifiedCount };
  }

  public async requestMarkCorrection(
    tenantId: string | Types.ObjectId,
    markId: string,
    userId: string | Types.ObjectId,
    data: { newMarks?: number | null; newStatus: MarkStatus; reason: string },
    isElevatedUser: boolean = false
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const uId = new Types.ObjectId(userId.toString());

    const mark = await ExamMark.findOne({ _id: new Types.ObjectId(markId), tenantId: tId });
    if (!mark) throw new NotFoundError('Mark record not found.');

    if (data.newMarks !== null && data.newMarks !== undefined) {
      if (data.newMarks < 0 || data.newMarks > mark.maxMarks) {
        throw new BadRequestError(`New marks must be between 0 and maximum marks (${mark.maxMarks}).`);
      }
    }

    const correction = await MarkCorrection.create({
      tenantId: tId,
      examId: mark.examId,
      studentId: mark.studentId,
      subjectId: mark.subjectId,
      academicClassId: mark.academicClassId,
      previousMarks: mark.marksObtained,
      newMarks: data.newMarks,
      previousStatus: mark.status,
      newStatus: data.newStatus,
      reason: data.reason,
      requestedBy: uId,
      status: isElevatedUser ? CorrectionStatus.APPROVED : CorrectionStatus.PENDING,
      approvedBy: isElevatedUser ? uId : undefined,
    });

    if (isElevatedUser) {
      // Direct resolution: patch ExamMark immediately
      mark.marksObtained = data.newMarks;
      mark.status = data.newStatus;
      await mark.save();
    }

    return correction;
  }

  public async reviewMarkCorrection(
    tenantId: string | Types.ObjectId,
    correctionId: string,
    reviewerUserId: string | Types.ObjectId,
    decision: { status: CorrectionStatus }
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const rId = new Types.ObjectId(reviewerUserId.toString());

    const correction = await MarkCorrection.findOne({
      _id: new Types.ObjectId(correctionId),
      tenantId: tId,
      status: CorrectionStatus.PENDING,
    });

    if (!correction) throw new NotFoundError('Pending mark correction request not found.');

    correction.status = decision.status;
    correction.approvedBy = rId;
    await correction.save();

    if (decision.status === CorrectionStatus.APPROVED) {
      const mark = await ExamMark.findOne({
        tenantId: tId,
        examId: correction.examId,
        studentId: correction.studentId,
        subjectId: correction.subjectId,
      });

      if (mark) {
        mark.marksObtained = correction.newMarks;
        mark.status = correction.newStatus;
        await mark.save();
      }
    }

    return correction;
  }

  // --------------------------------------------------------------------------
  // 5. Result Calculation, Approval, Snapshot Publishing & Queries
  // --------------------------------------------------------------------------
  public async calculateResults(
    tenantId: string | Types.ObjectId,
    examId: string,
    academicClassId?: string,
    userId?: string | Types.ObjectId
  ): Promise<any[]> {
    const tId = new Types.ObjectId(tenantId.toString());
    const eId = new Types.ObjectId(examId);

    const exam = await Exam.findOne({ _id: eId, tenantId: tId });
    if (!exam) throw new NotFoundError('Exam not found.');

    // Fetch grading scheme
    let gradingSchemeGrades: any[] = [];
    let gradingSchemeName = 'Default';
    if (exam.gradingSchemeId) {
      const scheme = await GradingScheme.findOne({ _id: exam.gradingSchemeId, tenantId: tId });
      if (scheme) {
        gradingSchemeGrades = scheme.grades;
        gradingSchemeName = scheme.name;
      }
    }

    // Determine target classes
    const targetClassIds = academicClassId
      ? [new Types.ObjectId(academicClassId)]
      : exam.academicClassIds && exam.academicClassIds.length > 0
      ? exam.academicClassIds
      : (await ExamSchedule.distinct('academicClassId', { tenantId: tId, examId: eId }));

    const createdResults: any[] = [];

    for (const acId of targetClassIds) {
      // Find class details
      const acDoc = await AcademicClass.findOne({ _id: acId, tenantId: tId });
      if (!acDoc) continue;

      // Find all scheduled subjects for this class
      const schedules = await ExamSchedule.find({
        tenantId: tId,
        examId: eId,
        academicClassId: acId,
        isDeleted: false,
      }).populate('subjectId', 'name code');

      if (schedules.length === 0) continue;

      // Find all enrolled students
      const enrollments = await StudentEnrollment.find({
        tenantId: tId,
        academicClassId: acId,
        status: 'ENROLLED',
      });

      for (const enr of enrollments) {
        const studentId = enr.studentId;
        const subjectResults: ISubjectResultSnapshot[] = [];
        let totalMaxMarks = 0;
        let totalMarksObtained = 0;
        let failedSubjectCount = 0;

        for (const sched of schedules) {
          const subject = sched.subjectId as any;
          const markDoc = await ExamMark.findOne({
            tenantId: tId,
            examId: eId,
            academicClassId: acId,
            subjectId: subject._id,
            studentId,
            isDeleted: false,
          });

          const maxMarks = sched.maxMarks;
          const passMarks = sched.passMarks;
          const marksObtained = markDoc?.marksObtained ?? null;
          const status = markDoc?.status || MarkStatus.NOT_ENTERED;

          const scoreData = GradingService.calculateSubjectScore(
            marksObtained,
            maxMarks,
            passMarks,
            status,
            gradingSchemeGrades
          );

          if (!scoreData.isPassed) {
            failedSubjectCount++;
          }

          totalMaxMarks += maxMarks;
          if (status !== MarkStatus.ABSENT && marksObtained !== null) {
            totalMarksObtained += marksObtained;
          }

          subjectResults.push({
            subjectId: subject._id.toString(),
            subjectName: subject.name,
            subjectCode: subject.code,
            maxMarks,
            passMarks,
            marksObtained,
            status,
            percentage: scoreData.percentage,
            grade: scoreData.grade,
            gradePoint: scoreData.gradePoint,
            isPassed: scoreData.isPassed,
          });
        }

        const overallPercentage =
          totalMaxMarks > 0 ? Math.round(((totalMarksObtained / totalMaxMarks) * 100) * 100) / 100 : 0;
        const overallGradeInfo = GradingService.resolveGrade(overallPercentage, gradingSchemeGrades);
        const isPassed = overallPercentage >= (exam.passingPercentage || 33) && failedSubjectCount === 0;

        // Upsert or create version 1 Result
        const resultDoc = await Result.findOneAndUpdate(
          {
            tenantId: tId,
            examId: eId,
            studentId,
            version: 1,
          },
          {
            tenantId: tId,
            schoolId: exam.schoolId,
            campusId: exam.campusId || acDoc.campusId,
            academicYearId: exam.academicYearId,
            examId: eId,
            academicClassId: acId,
            classId: acDoc.classId,
            sectionId: acDoc.sectionId,
            studentId,
            rollNumber: enr.rollNumber,
            version: 1,
            isCurrentVersion: true,
            status: 'CALCULATED',
            subjectResults,
            totalMaxMarks,
            totalMarksObtained,
            percentage: overallPercentage,
            overallGrade: overallGradeInfo.grade,
            overallGradePoint: overallGradeInfo.gradePoint,
            resultStatus: isPassed ? ResultStatus.PASS : ResultStatus.FAIL,
            failedSubjectCount,
            gradingSchemeSnapshot: {
              name: gradingSchemeName,
              grades: gradingSchemeGrades,
            },
            calculatedAt: new Date(),
            calculatedBy: userId ? new Types.ObjectId(userId.toString()) : undefined,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        createdResults.push(resultDoc);
      }
    }

    if (exam.status !== ExamStatus.PUBLISHED) {
      exam.status = ExamStatus.RESULTS_PENDING;
      await exam.save();
    }

    return createdResults;
  }

  public async approveResults(
    tenantId: string | Types.ObjectId,
    examId: string,
    userId: string | Types.ObjectId
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const eId = new Types.ObjectId(examId);
    const uId = new Types.ObjectId(userId.toString());

    const exam = await Exam.findOne({ _id: eId, tenantId: tId });
    if (!exam) throw new NotFoundError('Exam not found.');

    const res = await Result.updateMany(
      { tenantId: tId, examId: eId, isCurrentVersion: true },
      { status: 'APPROVED', approvedAt: new Date(), approvedBy: uId }
    );

    exam.status = ExamStatus.RESULTS_APPROVED;
    await exam.save();

    return { approvedCount: res.modifiedCount };
  }

  public async publishResults(
    tenantId: string | Types.ObjectId,
    examId: string,
    userId: string | Types.ObjectId
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const eId = new Types.ObjectId(examId);
    const uId = new Types.ObjectId(userId.toString());

    const exam = await Exam.findOne({ _id: eId, tenantId: tId });
    if (!exam) throw new NotFoundError('Exam not found.');

    const res = await Result.updateMany(
      { tenantId: tId, examId: eId, isCurrentVersion: true },
      { status: 'PUBLISHED', publishedAt: new Date(), publishedBy: uId }
    );

    exam.status = ExamStatus.PUBLISHED;
    exam.resultsPublishedAt = new Date();
    await exam.save();

    return { publishedCount: res.modifiedCount };
  }

  public async getResults(
    tenantId: string | Types.ObjectId,
    examId: string,
    query: { academicClassId?: string; studentId?: string; page?: number; limit?: number }
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const filter: any = {
      tenantId: tId,
      examId: new Types.ObjectId(examId),
      isCurrentVersion: true,
    };

    if (query.academicClassId) filter.academicClassId = new Types.ObjectId(query.academicClassId);
    if (query.studentId) filter.studentId = new Types.ObjectId(query.studentId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Result.find(filter)
        .populate('studentId', 'admissionNumber personalDetails')
        .populate('academicClassId')
        .sort({ rollNumber: 1 })
        .skip(skip)
        .limit(limit),
      Result.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getMyResults(
    tenantId: string | Types.ObjectId,
    studentUserId: string | Types.ObjectId,
    examId?: string
  ): Promise<any[]> {
    const tId = new Types.ObjectId(tenantId.toString());
    const student = await Student.findOne({ tenantId: tId, userId: new Types.ObjectId(studentUserId.toString()) });
    if (!student) throw new NotFoundError('Student profile not found.');

    const filter: any = {
      tenantId: tId,
      studentId: student._id,
      status: 'PUBLISHED',
      isCurrentVersion: true,
    };
    if (examId) filter.examId = new Types.ObjectId(examId);

    return Result.find(filter)
      .populate('examId', 'title code examType startDate endDate')
      .populate('academicClassId')
      .sort({ createdAt: -1 });
  }

  public async getParentChildResults(
    tenantId: string | Types.ObjectId,
    studentId: string,
    examId?: string
  ): Promise<any[]> {
    const tId = new Types.ObjectId(tenantId.toString());
    const filter: any = {
      tenantId: tId,
      studentId: new Types.ObjectId(studentId),
      status: 'PUBLISHED',
      isCurrentVersion: true,
    };
    if (examId) filter.examId = new Types.ObjectId(examId);

    return Result.find(filter)
      .populate('examId', 'title code examType startDate endDate')
      .populate('academicClassId')
      .sort({ createdAt: -1 });
  }

  public async getStudentPublishedResults(
    tenantId: string | Types.ObjectId,
    studentId: string,
    examId?: string,
    isElevated: boolean = false
  ): Promise<any[]> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(studentId);

    const filter: any = {
      tenantId: tId,
      studentId: sId,
      isCurrentVersion: true,
    };
    if (examId) filter.examId = new Types.ObjectId(examId);

    if (!isElevated) {
      filter.status = { $in: ['APPROVED', 'PUBLISHED'] };
    }

    const results = await Result.find(filter)
      .populate('examId', 'title code examType startDate endDate status')
      .populate('academicClassId')
      .sort({ createdAt: -1 });

    if (!isElevated && results.length === 0) {
      throw new AuthorizationError('Results are not yet published for this examination.');
    }

    return results;
  }

  public async getDashboardKPIs(
    tenantId: string | Types.ObjectId,
    campusId?: string,
    academicYearId?: string
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId.toString());
    const filter: any = { tenantId: tId, isDeleted: false };
    if (campusId) filter.campusId = new Types.ObjectId(campusId);
    if (academicYearId) filter.academicYearId = new Types.ObjectId(academicYearId);

    const [totalExams, scheduledExams, ongoingExams, resultsPending, publishedExams] = await Promise.all([
      Exam.countDocuments(filter),
      Exam.countDocuments({ ...filter, status: ExamStatus.SCHEDULED }),
      Exam.countDocuments({ ...filter, status: ExamStatus.ONGOING }),
      Exam.countDocuments({ ...filter, status: ExamStatus.RESULTS_PENDING }),
      Exam.countDocuments({ ...filter, status: ExamStatus.PUBLISHED }),
    ]);

    const recentExams = await Exam.find(filter)
      .sort({ startDate: -1 })
      .limit(5)
      .populate('academicClassIds', 'classId sectionId');

    return {
      totalExams,
      scheduledExams,
      ongoingExams,
      resultsPending,
      publishedExams,
      recentExams,
    };
  }
}

export const examService = new ExamService();
