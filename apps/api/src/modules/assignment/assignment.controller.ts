import { Request, Response, NextFunction } from 'express';
import { assignmentService } from './assignment.service.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  draftSubmissionSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
  returnSubmissionSchema,
  queryAssignmentSchema,
  querySubmissionSchema,
} from './assignment.validator.js';
import { AuthUserContext } from './assignment.policy.js';
import { AuthenticationError } from '@edusphere/common';

const ApiResponse = {
  success: <T>(data: T, message = 'Success', meta?: Record<string, any>) => ({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: meta?.requestId || '',
      ...meta,
    },
  }),
};

export class AssignmentController {
  private getAuthContext(req: Request): AuthUserContext {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required');
    }
    return {
      userId: auth.userId,
      tenantId: auth.tenantId,
      role: auth.roles?.[0] || auth.userType,
      userType: auth.userType,
      permissions: auth.permissions || [],
      campusId: auth.campusId,
    };
  }

  // =========================================================================
  // 1. Assignment CRUD & Lifecycle
  // =========================================================================

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const validated = createAssignmentSchema.parse(req.body);
      const assignment = await assignmentService.createAssignment(user.tenantId, user, validated);
      res.status(201).json(ApiResponse.success(assignment, 'Assignment created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const filters = queryAssignmentSchema.parse(req.query);
      const result = await assignmentService.getAssignments(user.tenantId, filters);
      res.status(200).json(
        ApiResponse.success(result.data, 'Assignments retrieved successfully.', {
          total: result.total,
          page: result.page,
          limit: result.limit,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const assignment = await assignmentService.getAssignmentById(
        user.tenantId,
        user,
        req.params.id
      );
      res.status(200).json(ApiResponse.success(assignment, 'Assignment retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const validated = updateAssignmentSchema.parse(req.body);
      const updated = await assignmentService.updateAssignment(
        user.tenantId,
        user,
        req.params.id,
        validated
      );
      res.status(200).json(ApiResponse.success(updated, 'Assignment updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      await assignmentService.deleteAssignment(user.tenantId, user, req.params.id);
      res.status(200).json(ApiResponse.success(null, 'Assignment deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const published = await assignmentService.publishAssignment(
        user.tenantId,
        user,
        req.params.id
      );
      res.status(200).json(ApiResponse.success(published, 'Assignment published successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const closed = await assignmentService.closeAssignment(user.tenantId, user, req.params.id);
      res.status(200).json(ApiResponse.success(closed, 'Assignment closed successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const archived = await assignmentService.archiveAssignment(
        user.tenantId,
        user,
        req.params.id
      );
      res.status(200).json(ApiResponse.success(archived, 'Assignment archived successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Student Submissions
  // =========================================================================

  async saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const validated = draftSubmissionSchema.parse(req.body);
      const submission = await assignmentService.saveDraftSubmission(
        user.tenantId,
        user,
        req.params.id,
        validated
      );
      res.status(200).json(ApiResponse.success(submission, 'Draft submission saved.'));
    } catch (err) {
      next(err);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const validated = submitAssignmentSchema.parse(req.body);
      const submission = await assignmentService.submitAssignment(
        user.tenantId,
        user,
        req.params.id,
        validated
      );
      res.status(201).json(ApiResponse.success(submission, 'Assignment submitted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Teacher Grading & Review
  // =========================================================================

  async grade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const validated = gradeSubmissionSchema.parse(req.body);
      const submission = await assignmentService.gradeSubmission(
        user.tenantId,
        user,
        req.params.submissionId,
        validated
      );
      res.status(200).json(ApiResponse.success(submission, 'Submission graded successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async return(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const validated = returnSubmissionSchema.parse(req.body);
      const submission = await assignmentService.returnSubmission(
        user.tenantId,
        user,
        req.params.submissionId,
        validated
      );
      res
        .status(200)
        .json(ApiResponse.success(submission, 'Submission returned for student revision.'));
    } catch (err) {
      next(err);
    }
  }

  async listSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const filters = querySubmissionSchema.parse(req.query);
      const result = await assignmentService.getSubmissions(
        user.tenantId,
        user,
        req.params.id,
        filters
      );
      res.status(200).json(
        ApiResponse.success(result.data, 'Submissions retrieved successfully.', {
          total: result.total,
          page: result.page,
          limit: result.limit,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getSubmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const submission = await assignmentService.getSubmissionById(
        user.tenantId,
        user,
        req.params.submissionId
      );
      res.status(200).json(ApiResponse.success(submission, 'Submission retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Student & Parent Longitudinal Views
  // =========================================================================

  async getMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const { status, subjectId, search } = req.query as any;
      const list = await assignmentService.getMyAssignments(user.tenantId, user, {
        status,
        subjectId,
        search,
      });
      res.status(200).json(ApiResponse.success(list, 'Personal assignments retrieved.'));
    } catch (err) {
      next(err);
    }
  }

  async getChildAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const list = await assignmentService.getChildAssignments(
        user.tenantId,
        user,
        req.params.studentId
      );
      res.status(200).json(ApiResponse.success(list, 'Child assignments retrieved.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Dashboards
  // =========================================================================

  async getTeacherDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const dashboard = await assignmentService.getTeacherDashboard(user.tenantId, user);
      res.status(200).json(ApiResponse.success(dashboard, 'Teacher dashboard metrics retrieved.'));
    } catch (err) {
      next(err);
    }
  }

  async getStudentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthContext(req);
      const dashboard = await assignmentService.getStudentDashboard(user.tenantId, user);
      res.status(200).json(ApiResponse.success(dashboard, 'Student dashboard metrics retrieved.'));
    } catch (err) {
      next(err);
    }
  }
}

export const assignmentController = new AssignmentController();
