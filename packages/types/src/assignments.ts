import {
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentTargetType,
  AssignmentSubmissionStatus,
  StudentAssignmentStatus,
} from '@edusphere/common';

export interface IAssignmentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt?: Date | string;
}

export interface IAssignmentLatePolicy {
  deductionPercentage?: number;
  maxLateDays?: number;
  notes?: string;
}

export interface IAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
  academicClassId: string;
  classId?: string;
  sectionId?: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  instructions?: string;
  assignmentType: AssignmentType;
  assignedDate: Date | string;
  dueDate: Date | string;
  dueTime: string;
  dueAt: Date | string;
  maxScore: number;
  status: AssignmentStatus;
  attachments: IAssignmentAttachment[];
  submissionType: SubmissionType;
  allowLateSubmission: boolean;
  latePolicy?: IAssignmentLatePolicy;
  targetType: AssignmentTargetType;
  targetStudentIds?: string[];
  createdBy: string;
  publishedAt?: Date | string;
  closedAt?: Date | string;
  archivedAt?: Date | string;
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IAssignmentSubmissionAttempt {
  attemptNumber: number;
  submittedAt: Date | string;
  textResponse?: string;
  attachments: IAssignmentAttachment[];
  lateSubmission: boolean;
  status: AssignmentSubmissionStatus;
}

export interface IAssignmentSubmission {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  assignmentId: string;
  studentId: string;
  status: AssignmentSubmissionStatus;
  submittedAt?: Date | string;
  textResponse?: string;
  attachments: IAssignmentAttachment[];
  attemptNumber: number;
  attempts: IAssignmentSubmissionAttempt[];
  lateSubmission: boolean;
  score?: number;
  feedback?: string;
  feedbackAttachments?: IAssignmentAttachment[];
  gradedBy?: string;
  gradedAt?: Date | string;
  returnedAt?: Date | string;
  idempotencyKey?: string;
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Backward compatibility aliases
export type IHomework = IAssignment;
export type SubmissionStatus = AssignmentSubmissionStatus;

// =========================================================================
// Request / Response DTOs
// =========================================================================

export interface CreateAssignmentDto {
  academicClassId: string;
  subjectId: string;
  teacherId?: string;
  title: string;
  description: string;
  instructions?: string;
  assignmentType?: AssignmentType;
  assignedDate?: string;
  dueDate: string;
  dueTime?: string;
  maxScore?: number;
  submissionType?: SubmissionType;
  allowLateSubmission?: boolean;
  latePolicy?: IAssignmentLatePolicy;
  targetType?: AssignmentTargetType;
  targetStudentIds?: string[];
  attachments?: IAssignmentAttachment[];
  publishImmediately?: boolean;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  instructions?: string;
  assignmentType?: AssignmentType;
  dueDate?: string;
  dueTime?: string;
  maxScore?: number;
  submissionType?: SubmissionType;
  allowLateSubmission?: boolean;
  latePolicy?: IAssignmentLatePolicy;
  targetType?: AssignmentTargetType;
  targetStudentIds?: string[];
  attachments?: IAssignmentAttachment[];
}

export interface DraftSubmissionDto {
  textResponse?: string;
  attachments?: IAssignmentAttachment[];
}

export interface SubmitAssignmentDto {
  textResponse?: string;
  attachments?: IAssignmentAttachment[];
  idempotencyKey?: string;
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
  feedbackAttachments?: IAssignmentAttachment[];
}

export interface ReturnSubmissionDto {
  feedback: string;
}

export interface AssignmentQueryFilters {
  academicYearId?: string;
  campusId?: string;
  academicClassId?: string;
  subjectId?: string;
  teacherId?: string;
  assignmentType?: AssignmentType;
  status?: AssignmentStatus;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubmissionQueryFilters {
  status?: AssignmentSubmissionStatus;
  studentId?: string;
  isGraded?: boolean;
  isLate?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AssignmentResponseDto extends IAssignment {
  academicClassName?: string;
  subjectName?: string;
  subjectCode?: string;
  teacherName?: string;
  totalSubmissions?: number;
  gradedSubmissions?: number;
  pendingSubmissions?: number;
}

export interface SubmissionResponseDto extends IAssignmentSubmission {
  studentName?: string;
  studentAdmissionNumber?: string;
  studentRollNumber?: number;
  assignmentTitle?: string;
  assignmentMaxScore?: number;
  dueDate?: string;
  dueAt?: string;
}

export interface StudentAssignmentSummaryDto {
  assignment: AssignmentResponseDto;
  submission?: SubmissionResponseDto;
  studentStatus: StudentAssignmentStatus;
  isOverdue: boolean;
  canSubmit: boolean;
}

export interface TeacherAssignmentDashboardDto {
  totalDrafts: number;
  totalPublished: number;
  totalClosed: number;
  pendingGradingCount: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    academicClassName: string;
    subjectName: string;
    dueAt: string;
    totalSubmissions: number;
    enrolledCount: number;
  }>;
  recentSubmissions: SubmissionResponseDto[];
}

export interface StudentAssignmentDashboardDto {
  totalAssigned: number;
  upcomingCount: number;
  overdueCount: number;
  submittedCount: number;
  gradedCount: number;
  averageScorePercentage?: number;
  upcomingAssignments: StudentAssignmentSummaryDto[];
  recentFeedback: StudentAssignmentSummaryDto[];
}
