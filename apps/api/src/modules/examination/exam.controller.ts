import { Request, Response, NextFunction } from 'express';
import { examService } from './exam.service.js';
import { createSuccessResponse, AuthenticationError } from '@edusphere/common';
import { ExamPolicy } from './exam.policy.js';
import {
  createGradingSchemeSchema,
  createExamSchema,
  updateExamSchema,
  examStatusTransitionSchema,
  createExamScheduleSchema,
  checkScheduleConflictSchema,
  bulkMarksEntrySchema,
  markCorrectionRequestSchema,
  reviewExamCorrectionSchema,
  calculateResultsSchema,
} from './exam.validator.js';

export class ExamController {
  private getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = req.tenantContext?.tenantId || auth.tenantId;
    return { auth, tenantId };
  }

  // --------------------------------------------------------------------------
  // Grading Schemes
  // --------------------------------------------------------------------------
  public async createGradingScheme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = createGradingSchemeSchema.parse(req.body);
      const schoolId = req.body.schoolId || auth.schoolId || '';
      const scheme = await examService.createGradingScheme(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(scheme, 'Grading scheme created successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getGradingSchemes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const schoolId = (req.query.schoolId as string) || auth.schoolId || '';
      const schemes = await examService.getGradingSchemes(tenantId, schoolId);
      res.status(200).json(createSuccessResponse(schemes, 'Grading schemes retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getGradingSchemeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const scheme = await examService.getGradingSchemeById(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(scheme, 'Grading scheme retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // --------------------------------------------------------------------------
  // Exams
  // --------------------------------------------------------------------------
  public async createExam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = createExamSchema.parse(req.body);
      const schoolId = req.body.schoolId || auth.schoolId || '';
      const exam = await examService.createExam(tenantId, schoolId, auth.userId, validated);
      res.status(201).json(createSuccessResponse(exam, 'Examination created successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getExams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const query = {
        academicYearId: req.query.academicYearId as string,
        campusId: req.query.campusId as string,
        examType: req.query.examType as string,
        status: req.query.status as string,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      };
      const result = await examService.getExams(tenantId, query);
      res.status(200).json(createSuccessResponse(result.data, 'Examinations retrieved.', { requestId: (req as any).id, meta: result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public async getExamById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const exam = await examService.getExamById(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(exam, 'Examination retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async updateExam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const validated = updateExamSchema.parse(req.body);
      const exam = await examService.updateExam(tenantId, req.params.id, validated);
      res.status(200).json(createSuccessResponse(exam, 'Examination updated successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async transitionExamStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const validated = examStatusTransitionSchema.parse(req.body);
      const exam = await examService.transitionExamStatus(tenantId, req.params.id, validated.status);
      res.status(200).json(createSuccessResponse(exam, `Examination transitioned to ${validated.status}.`, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async deleteExam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      await examService.deleteExam(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(null, 'Draft examination deleted successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // --------------------------------------------------------------------------
  // Schedules & Conflicts
  // --------------------------------------------------------------------------
  public async createExamSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = createExamScheduleSchema.parse(req.body);
      const schoolId = req.body.schoolId || auth.schoolId || '';
      const schedule = await examService.createExamSchedule(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(schedule, 'Exam scheduled successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async checkScheduleConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const validated = checkScheduleConflictSchema.parse(req.body);
      const result = await examService.checkScheduleConflicts(tenantId, validated);
      res.status(200).json(createSuccessResponse(result, 'Conflict check completed.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getExamSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const schedules = await examService.getExamSchedules(
        tenantId,
        req.params.examId,
        req.query.academicClassId as string
      );
      res.status(200).json(createSuccessResponse(schedules, 'Exam schedules retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async deleteExamSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      await examService.deleteExamSchedule(tenantId, req.params.scheduleId);
      res.status(200).json(createSuccessResponse(null, 'Exam schedule deleted successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // --------------------------------------------------------------------------
  // Marks Roster & Entry
  // --------------------------------------------------------------------------
  public async getMarksRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const { examId, academicClassId, subjectId } = req.query as {
        examId: string;
        academicClassId: string;
        subjectId: string;
      };
      const roster = await examService.getMarksRoster(tenantId, examId, academicClassId, subjectId);
      res.status(200).json(createSuccessResponse(roster, 'Marks roster retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async enterBulkMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = bulkMarksEntrySchema.parse(req.body);
      await ExamPolicy.assertTeacherMarksEntryScope(req, validated.academicClassId, validated.subjectId);

      const schoolId = req.body.schoolId || auth.schoolId || '';
      const updated = await examService.enterBulkMarks(tenantId, schoolId, auth.userId, validated);
      res.status(200).json(createSuccessResponse(updated, 'Marks saved successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async verifyMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const { examId, academicClassId, subjectId } = req.body;
      const result = await examService.verifyMarks(tenantId, examId, academicClassId, subjectId, auth.userId);
      res.status(200).json(createSuccessResponse(result, 'Marks verified successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async lockMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const { examId, academicClassId, subjectId } = req.body;
      const result = await examService.lockMarks(tenantId, examId, academicClassId, subjectId, auth.userId);
      res.status(200).json(createSuccessResponse(result, 'Marks locked successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async requestMarkCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = markCorrectionRequestSchema.parse(req.body);
      const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'];
      const isElevatedUser = auth.roles?.some((r: any) =>
        elevatedRoles.includes(typeof r === 'string' ? r : r.name)
      );

      const correction = await examService.requestMarkCorrection(
        tenantId,
        req.params.markId,
        auth.userId,
        validated,
        isElevatedUser
      );
      res.status(200).json(
        createSuccessResponse(
          correction,
          isElevatedUser ? 'Mark updated directly.' : 'Correction request submitted for approval.',
          { requestId: (req as any).id }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  public async reviewMarkCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = reviewExamCorrectionSchema.parse(req.body);
      const correction = await examService.reviewMarkCorrection(
        tenantId,
        req.params.correctionId,
        auth.userId,
        validated
      );
      res.status(200).json(createSuccessResponse(correction, `Correction request ${validated.status}.`, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // --------------------------------------------------------------------------
  // Results
  // --------------------------------------------------------------------------
  public async calculateResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const validated = calculateResultsSchema.parse(req.body);
      const results = await examService.calculateResults(
        tenantId,
        req.params.examId,
        validated.academicClassId,
        auth.userId
      );
      res.status(200).json(createSuccessResponse(results, 'Results calculated successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async approveResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const result = await examService.approveResults(tenantId, req.params.examId, auth.userId);
      res.status(200).json(createSuccessResponse(result, 'Results approved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async publishResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const result = await examService.publishResults(tenantId, req.params.examId, auth.userId);
      res.status(200).json(createSuccessResponse(result, 'Results published to students and parents.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const query = {
        academicClassId: req.query.academicClassId as string,
        studentId: req.query.studentId as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
      };
      const results = await examService.getResults(tenantId, req.params.examId, query);
      res.status(200).json(createSuccessResponse(results.data, 'Results retrieved.', { requestId: (req as any).id, meta: results.meta }));
    } catch (err) {
      next(err);
    }
  }

  public async getMyResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const results = await examService.getMyResults(
        tenantId,
        auth.userId,
        req.query.examId as string
      );
      res.status(200).json(createSuccessResponse(results, 'My results retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getParentChildResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const studentId = req.params.studentId;
      await ExamPolicy.assertParentChildAccess(req, studentId);

      const results = await examService.getParentChildResults(
        tenantId,
        studentId,
        req.query.examId as string
      );
      res.status(200).json(createSuccessResponse(results, 'Child examination results retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getStudentResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId } = this.getAuth(req);
      const studentId = req.params.studentId;

      const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'TEACHER'];
      const isElevated = auth.roles?.some((r: any) => elevatedRoles.includes(typeof r === 'string' ? r : r.name));

      if (!isElevated) {
        if (auth.userType === 'STUDENT') {
          await ExamPolicy.assertStudentResultAccess(req, studentId);
        } else {
          await ExamPolicy.assertParentChildAccess(req, studentId);
        }
      }

      const results = await examService.getStudentPublishedResults(
        tenantId,
        studentId,
        req.query.examId as string,
        isElevated
      );
      res.status(200).json(createSuccessResponse(results, 'Student examination results retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public async getDashboardKPIs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = this.getAuth(req);
      const kpis = await examService.getDashboardKPIs(
        tenantId,
        req.query.campusId as string,
        req.query.academicYearId as string
      );
      res.status(200).json(createSuccessResponse(kpis, 'Examination KPIs retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }
}

export const examController = new ExamController();
