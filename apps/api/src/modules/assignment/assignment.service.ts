import { Types } from 'mongoose';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  UserType,
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentTargetType,
  AssignmentSubmissionStatus,
  StudentAssignmentStatus,
} from '@edusphere/common';
import {
  Assignment,
  AssignmentSubmission,
  IAssignmentDoc,
  IAssignmentSubmissionDoc,
  AcademicClass,
  Subject,
  Teacher,
  Student,
  StudentEnrollment,
  StudentParentRelation,
  Parent,
  AuditLog,
} from '@edusphere/database';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  DraftSubmissionDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  AssignmentQueryFilters,
  SubmissionQueryFilters,
  AssignmentResponseDto,
  SubmissionResponseDto,
  StudentAssignmentSummaryDto,
  TeacherAssignmentDashboardDto,
  StudentAssignmentDashboardDto,
} from '@edusphere/types';
import { assignmentPolicy, AuthUserContext } from './assignment.policy.js';

export class AssignmentService {
  /**
   * Helper: Parse Date and Time into authoritative UTC timestamp.
   */
  private computeDueAt(dueDateStr: string | Date, dueTimeStr = '23:59'): Date {
    const d = new Date(dueDateStr);
    const [hours, minutes] = dueTimeStr.split(':').map((n) => parseInt(n, 10));
    d.setHours(hours || 23, minutes || 59, 59, 999);
    return d;
  }

  /**
   * Helper: Record audit log entry.
   */
  private async logAudit(params: {
    tenantId: string;
    schoolId?: string;
    action: string;
    entity: string;
    entityId: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    userId: string;
  }): Promise<void> {
    try {
      await AuditLog.create({
        tenantId: new Types.ObjectId(params.tenantId),
        schoolId: params.schoolId ? new Types.ObjectId(params.schoolId) : undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before,
        after: params.after,
        userId: new Types.ObjectId(params.userId),
      });
    } catch {
      // Non-blocking audit failure
    }
  }

  // =========================================================================
  // 1. Assignment Management (Teacher / Leadership)
  // =========================================================================

  async createAssignment(
    tenantId: string,
    user: AuthUserContext,
    input: CreateAssignmentDto
  ): Promise<AssignmentResponseDto> {
    // 1. Authorize teacher / leadership scoping
    const teacherId = await assignmentPolicy.authorizeTeacherAssignment(
      user,
      input.academicClassId,
      input.subjectId
    );

    // 2. Fetch academic class details for campus and academic year
    const academicClass = await AcademicClass.findOne({
      _id: new Types.ObjectId(input.academicClassId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!academicClass) {
      throw new NotFoundError('Academic Class not found');
    }

    // 3. Calculate dueAt
    const dueAt = this.computeDueAt(input.dueDate, input.dueTime || '23:59');
    const assignedDate = input.assignedDate ? new Date(input.assignedDate) : new Date();

    if (assignedDate > dueAt) {
      throw new BadRequestError('Due date/time cannot be earlier than assigned date.');
    }

    const isPublish = !!input.publishImmediately;

    const assignment = await Assignment.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: academicClass.schoolId,
      campusId: academicClass.campusId,
      academicYearId: academicClass.academicYearId,
      academicClassId: academicClass._id,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      subjectId: new Types.ObjectId(input.subjectId),
      teacherId,
      title: input.title.trim(),
      description: input.description.trim(),
      instructions: input.instructions?.trim(),
      assignmentType: input.assignmentType || AssignmentType.HOMEWORK,
      assignedDate,
      dueDate: new Date(input.dueDate),
      dueTime: input.dueTime || '23:59',
      dueAt,
      maxScore: input.maxScore || 100,
      status: isPublish ? AssignmentStatus.PUBLISHED : AssignmentStatus.DRAFT,
      attachments: input.attachments || [],
      submissionType: input.submissionType || SubmissionType.BOTH,
      allowLateSubmission: !!input.allowLateSubmission,
      latePolicy: input.latePolicy,
      targetType: input.targetType || AssignmentTargetType.ALL,
      targetStudentIds:
        input.targetStudentIds && input.targetStudentIds.length > 0
          ? input.targetStudentIds.map((id) => new Types.ObjectId(id))
          : undefined,
      createdBy: new Types.ObjectId(user.userId),
      publishedAt: isPublish ? new Date() : undefined,
    });

    await this.logAudit({
      tenantId,
      schoolId: academicClass.schoolId?.toString(),
      action: isPublish ? 'ASSIGNMENT_PUBLISHED' : 'ASSIGNMENT_CREATED',
      entity: 'Assignment',
      entityId: assignment._id.toString(),
      after: { title: assignment.title, status: assignment.status },
      userId: user.userId,
    });

    return this.mapAssignmentToDto(assignment);
  }

  async getAssignments(
    tenantId: string,
    filters: AssignmentQueryFilters
  ): Promise<{ data: AssignmentResponseDto[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.academicYearId) {
      query.academicYearId = new Types.ObjectId(filters.academicYearId);
    }
    if (filters.campusId) {
      query.campusId = new Types.ObjectId(filters.campusId);
    }
    if (filters.academicClassId) {
      query.academicClassId = new Types.ObjectId(filters.academicClassId);
    }
    if (filters.subjectId) {
      query.subjectId = new Types.ObjectId(filters.subjectId);
    }
    if (filters.teacherId) {
      query.teacherId = new Types.ObjectId(filters.teacherId);
    }
    if (filters.assignmentType) {
      query.assignmentType = filters.assignmentType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.search) {
      query.title = { $regex: filters.search, $options: 'i' };
    }
    if (filters.dueFrom || filters.dueTo) {
      query.dueAt = {};
      if (filters.dueFrom) query.dueAt.$gte = new Date(filters.dueFrom);
      if (filters.dueTo) query.dueAt.$lte = new Date(filters.dueTo);
    }

    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
    const sortField = filters.sortBy || 'dueAt';

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('academicClassId', 'name')
        .populate('subjectId', 'name code')
        .populate('teacherId', 'employeeId userId')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Assignment.countDocuments(query),
    ]);

    // Aggregate submission stats for these assignments
    const assignmentIds = assignments.map((a) => a._id);
    const submissionCounts = await AssignmentSubmission.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          assignmentId: { $in: assignmentIds },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$assignmentId',
          total: { $sum: 1 },
          graded: {
            $sum: { $cond: [{ $eq: ['$status', AssignmentSubmissionStatus.GRADED] }, 1, 0] },
          },
        },
      },
    ]);

    const countMap = new Map<string, { total: number; graded: number }>();
    submissionCounts.forEach((c) => {
      countMap.set(c._id.toString(), { total: c.total, graded: c.graded });
    });

    const data = assignments.map((a) => {
      const stats = countMap.get(a._id.toString()) || { total: 0, graded: 0 };
      return this.mapAssignmentToDto(a, {
        totalSubmissions: stats.total,
        gradedSubmissions: stats.graded,
        pendingSubmissions: Math.max(0, stats.total - stats.graded),
      });
    });

    return { data, total, page, limit };
  }

  async getAssignmentById(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string
  ): Promise<AssignmentResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('academicClassId', 'name')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'employeeId userId');

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    await assignmentPolicy.authorizeAssignmentAccess(user, assignment);

    const [totalSubmissions, gradedSubmissions] = await Promise.all([
      AssignmentSubmission.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        assignmentId: assignment._id,
        isDeleted: false,
      }),
      AssignmentSubmission.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        assignmentId: assignment._id,
        status: AssignmentSubmissionStatus.GRADED,
        isDeleted: false,
      }),
    ]);

    return this.mapAssignmentToDto(assignment, {
      totalSubmissions,
      gradedSubmissions,
      pendingSubmissions: Math.max(0, totalSubmissions - gradedSubmissions),
    });
  }

  async updateAssignment(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string,
    input: UpdateAssignmentDto
  ): Promise<AssignmentResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    // Must be authorized to manage this assignment
    await assignmentPolicy.authorizeTeacherAssignment(
      user,
      assignment.academicClassId,
      assignment.subjectId
    );

    if (
      assignment.status === AssignmentStatus.CLOSED ||
      assignment.status === AssignmentStatus.ARCHIVED
    ) {
      throw new BadRequestError(`Cannot edit an assignment in ${assignment.status} status.`);
    }

    const before = assignment.toObject();

    if (input.title !== undefined) assignment.title = input.title.trim();
    if (input.description !== undefined) assignment.description = input.description.trim();
    if (input.instructions !== undefined) assignment.instructions = input.instructions.trim();
    if (input.assignmentType !== undefined) assignment.assignmentType = input.assignmentType;
    if (input.maxScore !== undefined) assignment.maxScore = input.maxScore;
    if (input.submissionType !== undefined) assignment.submissionType = input.submissionType;
    if (input.allowLateSubmission !== undefined) assignment.allowLateSubmission = input.allowLateSubmission;
    if (input.latePolicy !== undefined) assignment.latePolicy = input.latePolicy;
    if (input.targetType !== undefined) assignment.targetType = input.targetType;
    if (input.targetStudentIds !== undefined) {
      assignment.targetStudentIds = input.targetStudentIds.map((id) => new Types.ObjectId(id));
    }
    if (input.attachments !== undefined) assignment.attachments = input.attachments;

    if (input.dueDate || input.dueTime) {
      const dueDate = input.dueDate ? new Date(input.dueDate) : assignment.dueDate;
      const dueTime = input.dueTime || assignment.dueTime;
      assignment.dueDate = dueDate;
      assignment.dueTime = dueTime;
      assignment.dueAt = this.computeDueAt(dueDate, dueTime);
    }

    await assignment.save();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_UPDATED',
      entity: 'Assignment',
      entityId: assignment._id.toString(),
      before: { title: before.title, maxScore: before.maxScore },
      after: { title: assignment.title, maxScore: assignment.maxScore },
      userId: user.userId,
    });

    return this.mapAssignmentToDto(assignment);
  }

  async deleteAssignment(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string
  ): Promise<void> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    await assignmentPolicy.authorizeTeacherAssignment(
      user,
      assignment.academicClassId,
      assignment.subjectId
    );

    await (assignment as any).softDelete();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_DELETED',
      entity: 'Assignment',
      entityId: assignment._id.toString(),
      userId: user.userId,
    });
  }

  async publishAssignment(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string
  ): Promise<AssignmentResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    await assignmentPolicy.authorizeTeacherAssignment(
      user,
      assignment.academicClassId,
      assignment.subjectId
    );

    if (assignment.status === AssignmentStatus.PUBLISHED) {
      return this.mapAssignmentToDto(assignment);
    }

    assignment.status = AssignmentStatus.PUBLISHED;
    assignment.publishedAt = new Date();
    await assignment.save();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_PUBLISHED',
      entity: 'Assignment',
      entityId: assignment._id.toString(),
      userId: user.userId,
    });

    return this.mapAssignmentToDto(assignment);
  }

  async closeAssignment(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string
  ): Promise<AssignmentResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    await assignmentPolicy.authorizeTeacherAssignment(
      user,
      assignment.academicClassId,
      assignment.subjectId
    );

    assignment.status = AssignmentStatus.CLOSED;
    assignment.closedAt = new Date();
    await assignment.save();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_CLOSED',
      entity: 'Assignment',
      entityId: assignment._id.toString(),
      userId: user.userId,
    });

    return this.mapAssignmentToDto(assignment);
  }

  async archiveAssignment(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string
  ): Promise<AssignmentResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    await assignmentPolicy.authorizeTeacherAssignment(
      user,
      assignment.academicClassId,
      assignment.subjectId
    );

    assignment.status = AssignmentStatus.ARCHIVED;
    assignment.archivedAt = new Date();
    await assignment.save();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_ARCHIVED',
      entity: 'Assignment',
      entityId: assignment._id.toString(),
      userId: user.userId,
    });

    return this.mapAssignmentToDto(assignment);
  }

  // =========================================================================
  // 2. Student Submission Workflows
  // =========================================================================

  async saveDraftSubmission(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string,
    input: DraftSubmissionDto
  ): Promise<SubmissionResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    const studentId = await assignmentPolicy.authorizeStudentSubmission(user, assignment);

    let submission = await AssignmentSubmission.findOne({
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: assignment._id,
      studentId,
      isDeleted: false,
    });

    if (submission) {
      if (
        submission.status === AssignmentSubmissionStatus.SUBMITTED ||
        submission.status === AssignmentSubmissionStatus.GRADED
      ) {
        throw new BadRequestError('Cannot modify draft; assignment has already been submitted.');
      }
      submission.textResponse = input.textResponse;
      submission.attachments = input.attachments || [];
      await submission.save();
    } else {
      submission = await AssignmentSubmission.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: assignment.schoolId,
        campusId: assignment.campusId,
        assignmentId: assignment._id,
        studentId,
        status: AssignmentSubmissionStatus.DRAFT,
        textResponse: input.textResponse,
        attachments: input.attachments || [],
        attemptNumber: 0,
      });
    }

    return this.mapSubmissionToDto(submission);
  }

  async submitAssignment(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string,
    input: SubmitAssignmentDto
  ): Promise<SubmissionResponseDto> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    const studentId = await assignmentPolicy.authorizeStudentSubmission(user, assignment);

    // Idempotency check
    if (input.idempotencyKey) {
      const existingKey = await AssignmentSubmission.findOne({
        tenantId: new Types.ObjectId(tenantId),
        idempotencyKey: input.idempotencyKey,
      });
      if (existingKey) {
        return this.mapSubmissionToDto(existingKey);
      }
    }

    // Determine deadline & late status
    const now = new Date();
    const isLate = now > new Date(assignment.dueAt);

    if (isLate && !assignment.allowLateSubmission) {
      throw new BadRequestError('Submissions are closed. The deadline has passed.');
    }

    const submissionStatus = isLate
      ? AssignmentSubmissionStatus.LATE
      : AssignmentSubmissionStatus.SUBMITTED;

    let submission = await AssignmentSubmission.findOne({
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: assignment._id,
      studentId,
      isDeleted: false,
    });

    try {
      if (submission) {
        // Check if already graded
        if (submission.status === AssignmentSubmissionStatus.GRADED) {
          throw new ConflictError('Cannot resubmit; assignment has already been graded.');
        }

        const isFirstSubmission =
          submission.status === AssignmentSubmissionStatus.DRAFT ||
          !submission.attemptNumber ||
          submission.attemptNumber === 0;
        const nextAttempt = isFirstSubmission ? 1 : (submission.attemptNumber || 1) + 1;
        submission.attemptNumber = nextAttempt;
        submission.status = submissionStatus;
        submission.submittedAt = now;
        submission.lateSubmission = isLate;
        submission.textResponse = input.textResponse;
        submission.attachments = input.attachments || [];
        if (input.idempotencyKey) submission.idempotencyKey = input.idempotencyKey;

        submission.attempts.push({
          attemptNumber: nextAttempt,
          submittedAt: now,
          textResponse: input.textResponse,
          attachments: input.attachments || [],
          lateSubmission: isLate,
          status: submissionStatus,
        });

        await submission.save();
      } else {
        submission = await AssignmentSubmission.create({
          tenantId: new Types.ObjectId(tenantId),
          schoolId: assignment.schoolId,
          campusId: assignment.campusId,
          assignmentId: assignment._id,
          studentId,
          status: submissionStatus,
          submittedAt: now,
          textResponse: input.textResponse,
          attachments: input.attachments || [],
          attemptNumber: 1,
          lateSubmission: isLate,
          idempotencyKey: input.idempotencyKey,
          attempts: [
            {
              attemptNumber: 1,
              submittedAt: now,
              textResponse: input.textResponse,
              attachments: input.attachments || [],
              lateSubmission: isLate,
              status: submissionStatus,
            },
          ],
        });
      }
    } catch (err: any) {
      if (err.code === 11000) {
        const existing = await AssignmentSubmission.findOne({
          tenantId: new Types.ObjectId(tenantId),
          assignmentId: assignment._id,
          studentId,
          isDeleted: false,
        });
        if (existing) {
          return this.mapSubmissionToDto(existing);
        }
      }
      throw err;
    }

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_SUBMITTED',
      entity: 'AssignmentSubmission',
      entityId: submission._id.toString(),
      after: { attemptNumber: submission.attemptNumber, isLate },
      userId: user.userId,
    });

    return this.mapSubmissionToDto(submission);
  }

  // =========================================================================
  // 3. Teacher Grading & Feedback
  // =========================================================================

  async gradeSubmission(
    tenantId: string,
    user: AuthUserContext,
    submissionId: string,
    input: GradeSubmissionDto
  ): Promise<SubmissionResponseDto> {
    const submission = await AssignmentSubmission.findOne({
      _id: new Types.ObjectId(submissionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    const assignment = await Assignment.findOne({
      _id: submission.assignmentId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Parent assignment not found');
    }

    const graderTeacherId = await assignmentPolicy.authorizeGrading(user, assignment);

    if (input.score < 0 || input.score > assignment.maxScore) {
      throw new BadRequestError(
        `Score must be between 0 and maximum possible score (${assignment.maxScore}).`
      );
    }

    const previousScore = submission.score;

    submission.score = input.score;
    submission.feedback = input.feedback?.trim();
    submission.feedbackAttachments = input.feedbackAttachments || [];
    submission.gradedBy = graderTeacherId;
    submission.gradedAt = new Date();
    submission.status = AssignmentSubmissionStatus.GRADED;

    await submission.save();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_SUBMISSION_GRADED',
      entity: 'AssignmentSubmission',
      entityId: submission._id.toString(),
      before: { score: previousScore },
      after: { score: submission.score, feedback: submission.feedback },
      userId: user.userId,
    });

    return this.mapSubmissionToDto(submission);
  }

  async returnSubmission(
    tenantId: string,
    user: AuthUserContext,
    submissionId: string,
    input: ReturnSubmissionDto
  ): Promise<SubmissionResponseDto> {
    const submission = await AssignmentSubmission.findOne({
      _id: new Types.ObjectId(submissionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    const assignment = await Assignment.findOne({
      _id: submission.assignmentId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Parent assignment not found');
    }

    await assignmentPolicy.authorizeGrading(user, assignment);

    submission.status = AssignmentSubmissionStatus.RETURNED;
    submission.feedback = input.feedback.trim();
    submission.returnedAt = new Date();

    await submission.save();

    await this.logAudit({
      tenantId,
      schoolId: assignment.schoolId?.toString(),
      action: 'ASSIGNMENT_SUBMISSION_RETURNED',
      entity: 'AssignmentSubmission',
      entityId: submission._id.toString(),
      after: { status: submission.status, feedback: submission.feedback },
      userId: user.userId,
    });

    return this.mapSubmissionToDto(submission);
  }

  async getSubmissions(
    tenantId: string,
    user: AuthUserContext,
    assignmentId: string,
    filters: SubmissionQueryFilters
  ): Promise<{ data: SubmissionResponseDto[]; total: number; page: number; limit: number }> {
    const assignment = await Assignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: assignment._id,
      isDeleted: false,
    };

    if (filters.status) query.status = filters.status;
    if (filters.studentId) query.studentId = new Types.ObjectId(filters.studentId);
    if (filters.isLate !== undefined) query.lateSubmission = filters.isLate;
    if (filters.isGraded !== undefined) {
      query.status = filters.isGraded
        ? AssignmentSubmissionStatus.GRADED
        : { $ne: AssignmentSubmissionStatus.GRADED };
    }

    // Role scoping: If student, restrict to own
    if (user.userType === UserType.STUDENT) {
      const student = await Student.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });
      query.studentId = student?._id;
    }

    const [submissions, total] = await Promise.all([
      AssignmentSubmission.find(query)
        .populate('studentId', 'admissionNumber personalDetails')
        .sort({ [filters.sortBy || 'submittedAt']: filters.sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit),
      AssignmentSubmission.countDocuments(query),
    ]);

    const data = submissions.map((sub) => this.mapSubmissionToDto(sub, assignment));
    return { data, total, page, limit };
  }

  async getSubmissionById(
    tenantId: string,
    user: AuthUserContext,
    submissionId: string
  ): Promise<SubmissionResponseDto> {
    const submission = await AssignmentSubmission.findOne({
      _id: new Types.ObjectId(submissionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate('studentId', 'admissionNumber personalDetails');

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    await assignmentPolicy.authorizeSubmissionAccess(
      user,
      submission.studentId._id || submission.studentId,
      submission.assignmentId
    );

    const assignment = await Assignment.findById(submission.assignmentId);
    return this.mapSubmissionToDto(submission, assignment || undefined);
  }

  // =========================================================================
  // 4. Student Longitudinal Perspective
  // =========================================================================

  async getMyAssignments(
    tenantId: string,
    user: AuthUserContext,
    filters: { status?: StudentAssignmentStatus; subjectId?: string; search?: string }
  ): Promise<StudentAssignmentSummaryDto[]> {
    if (user.userType !== UserType.STUDENT) {
      throw new BadRequestError('Only students can query personal assignments.');
    }

    const student = await Student.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError('Student profile not found');
    }

    // Find active enrollments
    const enrollments = await StudentEnrollment.find({
      tenantId: new Types.ObjectId(tenantId),
      studentId: student._id,
      status: 'ENROLLED',
    });

    if (enrollments.length === 0) {
      return [];
    }

    const academicClassIds = enrollments
      .map((e) => e.academicClassId)
      .filter((id): id is Types.ObjectId => !!id);

    const assignmentQuery: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      academicClassId: { $in: academicClassIds },
      status: { $in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] },
      isDeleted: false,
      $or: [
        { targetType: AssignmentTargetType.ALL },
        { targetType: AssignmentTargetType.SPECIFIC_STUDENTS, targetStudentIds: student._id },
      ],
    };

    if (filters.subjectId) {
      assignmentQuery.subjectId = new Types.ObjectId(filters.subjectId);
    }
    if (filters.search) {
      assignmentQuery.title = { $regex: filters.search, $options: 'i' };
    }

    const assignments = await Assignment.find(assignmentQuery)
      .populate('academicClassId', 'name')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'employeeId')
      .sort({ dueAt: 1 });

    const assignmentIds = assignments.map((a) => a._id);

    const submissions = await AssignmentSubmission.find({
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: { $in: assignmentIds },
      studentId: student._id,
      isDeleted: false,
    });

    const subMap = new Map<string, IAssignmentSubmissionDoc>();
    submissions.forEach((s) => subMap.set(s.assignmentId.toString(), s));

    const now = new Date();

    const results: StudentAssignmentSummaryDto[] = [];

    for (const assignment of assignments) {
      const sub = subMap.get(assignment._id.toString());
      const isOverdue = now > new Date(assignment.dueAt);
      const canSubmit =
        assignment.status === AssignmentStatus.PUBLISHED &&
        (!isOverdue || assignment.allowLateSubmission) &&
        sub?.status !== AssignmentSubmissionStatus.GRADED;

      let studentStatus: StudentAssignmentStatus = StudentAssignmentStatus.NOT_STARTED;

      if (sub) {
        if (sub.status === AssignmentSubmissionStatus.GRADED) {
          studentStatus = StudentAssignmentStatus.GRADED;
        } else if (sub.status === AssignmentSubmissionStatus.LATE) {
          studentStatus = StudentAssignmentStatus.LATE;
        } else if (sub.status === AssignmentSubmissionStatus.SUBMITTED) {
          studentStatus = StudentAssignmentStatus.SUBMITTED;
        } else if (
          sub.status === AssignmentSubmissionStatus.DRAFT ||
          sub.status === AssignmentSubmissionStatus.RETURNED
        ) {
          studentStatus = StudentAssignmentStatus.IN_PROGRESS;
        }
      } else {
        studentStatus = isOverdue
          ? StudentAssignmentStatus.OVERDUE
          : StudentAssignmentStatus.NOT_STARTED;
      }

      if (filters.status && studentStatus !== filters.status) {
        continue;
      }

      results.push({
        assignment: this.mapAssignmentToDto(assignment),
        submission: sub ? this.mapSubmissionToDto(sub, assignment) : undefined,
        studentStatus,
        isOverdue,
        canSubmit,
      });
    }

    return results;
  }

  // =========================================================================
  // 5. Parent Perspective
  // =========================================================================

  async getChildAssignments(
    tenantId: string,
    user: AuthUserContext,
    targetStudentId: string
  ): Promise<StudentAssignmentSummaryDto[]> {
    if (user.userType !== UserType.PARENT) {
      throw new BadRequestError('Only parents can access child assignments.');
    }

    const parent = await Parent.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    if (!parent) {
      throw new NotFoundError('Parent profile not found');
    }

    const relation = await StudentParentRelation.findOne({
      tenantId: new Types.ObjectId(tenantId),
      parentId: parent._id,
      studentId: new Types.ObjectId(targetStudentId),
    });

    if (!relation) {
      throw new BadRequestError('You are only authorized to view your registered children.');
    }

    // Call internal resolution for this student
    const student = await Student.findById(targetStudentId);
    if (!student) throw new NotFoundError('Student not found');

    const enrollments = await StudentEnrollment.find({
      tenantId: new Types.ObjectId(tenantId),
      studentId: student._id,
      status: 'ENROLLED',
    });

    const academicClassIds = enrollments
      .map((e) => e.academicClassId)
      .filter((id): id is Types.ObjectId => !!id);

    const assignments = await Assignment.find({
      tenantId: new Types.ObjectId(tenantId),
      academicClassId: { $in: academicClassIds },
      status: { $in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] },
      isDeleted: false,
      $or: [
        { targetType: AssignmentTargetType.ALL },
        { targetType: AssignmentTargetType.SPECIFIC_STUDENTS, targetStudentIds: student._id },
      ],
    })
      .populate('academicClassId', 'name')
      .populate('subjectId', 'name code')
      .sort({ dueAt: 1 });

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: { $in: assignmentIds },
      studentId: student._id,
      isDeleted: false,
    });

    const subMap = new Map<string, IAssignmentSubmissionDoc>();
    submissions.forEach((s) => subMap.set(s.assignmentId.toString(), s));
    const now = new Date();

    return assignments.map((assignment) => {
      const sub = subMap.get(assignment._id.toString());
      const isOverdue = now > new Date(assignment.dueAt);
      let studentStatus: StudentAssignmentStatus = StudentAssignmentStatus.NOT_STARTED;

      if (sub) {
        if (sub.status === AssignmentSubmissionStatus.GRADED) {
          studentStatus = StudentAssignmentStatus.GRADED;
        } else if (sub.status === AssignmentSubmissionStatus.LATE) {
          studentStatus = StudentAssignmentStatus.LATE;
        } else if (sub.status === AssignmentSubmissionStatus.SUBMITTED) {
          studentStatus = StudentAssignmentStatus.SUBMITTED;
        } else {
          studentStatus = StudentAssignmentStatus.IN_PROGRESS;
        }
      } else {
        studentStatus = isOverdue
          ? StudentAssignmentStatus.OVERDUE
          : StudentAssignmentStatus.NOT_STARTED;
      }

      return {
        assignment: this.mapAssignmentToDto(assignment),
        submission: sub ? this.mapSubmissionToDto(sub, assignment) : undefined,
        studentStatus,
        isOverdue,
        canSubmit: false, // Parents cannot submit
      };
    });
  }

  // =========================================================================
  // 6. Dashboards
  // =========================================================================

  async getTeacherDashboard(
    tenantId: string,
    user: AuthUserContext
  ): Promise<TeacherAssignmentDashboardDto> {
    const teacher = await Teacher.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    const teacherQuery: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };
    if (teacher) {
      teacherQuery.teacherId = teacher._id;
    }

    const [totalDrafts, totalPublished, totalClosed] = await Promise.all([
      Assignment.countDocuments({ ...teacherQuery, status: AssignmentStatus.DRAFT }),
      Assignment.countDocuments({ ...teacherQuery, status: AssignmentStatus.PUBLISHED }),
      Assignment.countDocuments({ ...teacherQuery, status: AssignmentStatus.CLOSED }),
    ]);

    // Active published assignments with upcoming deadlines
    const now = new Date();
    const upcomingAssignments = await Assignment.find({
      ...teacherQuery,
      status: AssignmentStatus.PUBLISHED,
      dueAt: { $gte: now },
    })
      .populate('academicClassId', 'name capacity')
      .populate('subjectId', 'name code')
      .sort({ dueAt: 1 })
      .limit(5);

    const assignmentIds = upcomingAssignments.map((a) => a._id);
    const submissionCounts = await AssignmentSubmission.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          assignmentId: { $in: assignmentIds },
          isDeleted: false,
        },
      },
      { $group: { _id: '$assignmentId', count: { $sum: 1 } } },
    ]);
    const subCountMap = new Map<string, number>();
    submissionCounts.forEach((c) => subCountMap.set(c._id.toString(), c.count));

    const upcomingDeadlines = upcomingAssignments.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      academicClassName: (a.academicClassId as any)?.name || 'Class',
      subjectName: (a.subjectId as any)?.name || 'Subject',
      dueAt: a.dueAt instanceof Date ? a.dueAt.toISOString() : new Date(a.dueAt).toISOString(),
      totalSubmissions: subCountMap.get(a._id.toString()) || 0,
      enrolledCount: (a.academicClassId as any)?.capacity || 40,
    }));

    // Pending grading count
    const teacherAssignments = await Assignment.find(teacherQuery).select('_id');
    const tAssignIds = teacherAssignments.map((a) => a._id);

    const pendingGradingCount = await AssignmentSubmission.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: { $in: tAssignIds },
      status: { $in: [AssignmentSubmissionStatus.SUBMITTED, AssignmentSubmissionStatus.LATE] },
      isDeleted: false,
    });

    // Recent submissions
    const recentSubmissions = await AssignmentSubmission.find({
      tenantId: new Types.ObjectId(tenantId),
      assignmentId: { $in: tAssignIds },
      isDeleted: false,
    })
      .populate('studentId', 'admissionNumber personalDetails')
      .populate('assignmentId', 'title maxScore')
      .sort({ submittedAt: -1 })
      .limit(5);

    return {
      totalDrafts,
      totalPublished,
      totalClosed,
      pendingGradingCount,
      upcomingDeadlines,
      recentSubmissions: recentSubmissions.map((s) => this.mapSubmissionToDto(s)),
    };
  }

  async getStudentDashboard(
    tenantId: string,
    user: AuthUserContext
  ): Promise<StudentAssignmentDashboardDto> {
    const list = await this.getMyAssignments(tenantId, user, {});

    const totalAssigned = list.length;
    const upcomingCount = list.filter((i) => i.studentStatus === StudentAssignmentStatus.NOT_STARTED && !i.isOverdue).length;
    const overdueCount = list.filter((i) => i.studentStatus === StudentAssignmentStatus.OVERDUE).length;
    const submittedCount = list.filter(
      (i) =>
        i.studentStatus === StudentAssignmentStatus.SUBMITTED ||
        i.studentStatus === StudentAssignmentStatus.LATE
    ).length;
    const gradedList = list.filter((i) => i.studentStatus === StudentAssignmentStatus.GRADED);
    const gradedCount = gradedList.length;

    let averageScorePercentage: number | undefined;
    if (gradedList.length > 0) {
      const totalPct = gradedList.reduce((acc, curr) => {
        const score = curr.submission?.score || 0;
        const max = curr.assignment.maxScore || 100;
        return acc + (score / max) * 100;
      }, 0);
      averageScorePercentage = Math.round((totalPct / gradedList.length) * 10) / 10;
    }

    const upcomingAssignments = list
      .filter((i) => !i.submission || i.studentStatus === StudentAssignmentStatus.IN_PROGRESS)
      .slice(0, 5);

    const recentFeedback = list
      .filter((i) => i.studentStatus === StudentAssignmentStatus.GRADED)
      .slice(0, 5);

    return {
      totalAssigned,
      upcomingCount,
      overdueCount,
      submittedCount,
      gradedCount,
      averageScorePercentage,
      upcomingAssignments,
      recentFeedback,
    };
  }

  // =========================================================================
  // DTO Mappers
  // =========================================================================

  private mapAssignmentToDto(
    doc: IAssignmentDoc,
    stats?: { totalSubmissions?: number; gradedSubmissions?: number; pendingSubmissions?: number }
  ): AssignmentResponseDto {
    const raw: any = (doc as any).toObject ? (doc as any).toObject() : doc;
    return {
      id: raw._id?.toString() || raw.id,
      tenantId: raw.tenantId?.toString(),
      schoolId: raw.schoolId?.toString(),
      campusId: raw.campusId?.toString(),
      academicYearId: raw.academicYearId?.toString(),
      academicClassId: raw.academicClassId?._id?.toString() || raw.academicClassId?.toString(),
      classId: raw.classId?.toString(),
      sectionId: raw.sectionId?.toString(),
      subjectId: raw.subjectId?._id?.toString() || raw.subjectId?.toString(),
      teacherId: raw.teacherId?._id?.toString() || raw.teacherId?.toString(),
      title: raw.title,
      description: raw.description,
      instructions: raw.instructions,
      assignmentType: raw.assignmentType,
      assignedDate: raw.assignedDate,
      dueDate: raw.dueDate,
      dueTime: raw.dueTime,
      dueAt: raw.dueAt,
      maxScore: raw.maxScore,
      status: raw.status,
      attachments: raw.attachments || [],
      submissionType: raw.submissionType,
      allowLateSubmission: raw.allowLateSubmission,
      latePolicy: raw.latePolicy,
      targetType: raw.targetType,
      targetStudentIds: raw.targetStudentIds?.map((id: any) => id.toString()),
      createdBy: raw.createdBy?.toString(),
      publishedAt: raw.publishedAt,
      closedAt: raw.closedAt,
      archivedAt: raw.archivedAt,
      isDeleted: raw.isDeleted,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      academicClassName: (raw.academicClassId as any)?.name,
      subjectName: (raw.subjectId as any)?.name,
      subjectCode: (raw.subjectId as any)?.code,
      totalSubmissions: stats?.totalSubmissions,
      gradedSubmissions: stats?.gradedSubmissions,
      pendingSubmissions: stats?.pendingSubmissions,
    };
  }

  private mapSubmissionToDto(
    doc: IAssignmentSubmissionDoc,
    assignment?: IAssignmentDoc
  ): SubmissionResponseDto {
    const raw: any = (doc as any).toObject ? (doc as any).toObject() : doc;
    const studentObj = raw.studentId as any;
    const studentName = studentObj?.personalDetails
      ? `${studentObj.personalDetails.firstName || ''} ${studentObj.personalDetails.lastName || ''}`.trim()
      : undefined;

    return {
      id: raw._id?.toString() || raw.id,
      tenantId: raw.tenantId?.toString(),
      schoolId: raw.schoolId?.toString(),
      campusId: raw.campusId?.toString(),
      assignmentId: raw.assignmentId?._id?.toString() || raw.assignmentId?.toString(),
      studentId: studentObj?._id?.toString() || studentObj?.toString(),
      status: raw.status,
      submittedAt: raw.submittedAt,
      textResponse: raw.textResponse,
      attachments: raw.attachments || [],
      attemptNumber: raw.attemptNumber || 1,
      attempts: raw.attempts || [],
      lateSubmission: !!raw.lateSubmission,
      score: raw.score,
      feedback: raw.feedback,
      feedbackAttachments: raw.feedbackAttachments || [],
      gradedBy: raw.gradedBy?.toString(),
      gradedAt: raw.gradedAt,
      returnedAt: raw.returnedAt,
      idempotencyKey: raw.idempotencyKey,
      isDeleted: raw.isDeleted,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      studentName,
      studentAdmissionNumber: studentObj?.admissionNumber,
      assignmentTitle: assignment?.title || (raw.assignmentId as any)?.title,
      assignmentMaxScore: assignment?.maxScore || (raw.assignmentId as any)?.maxScore,
      dueDate: assignment?.dueDate
        ? assignment.dueDate instanceof Date
          ? assignment.dueDate.toISOString()
          : new Date(assignment.dueDate).toISOString()
        : undefined,
      dueAt: assignment?.dueAt
        ? assignment.dueAt instanceof Date
          ? assignment.dueAt.toISOString()
          : new Date(assignment.dueAt).toISOString()
        : undefined,
    };
  }
}

export const assignmentService = new AssignmentService();
