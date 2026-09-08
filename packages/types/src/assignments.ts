export interface IHomework {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  attachments: string[];
  dueDate: Date;
  maxScore?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionStatus = 'SUBMITTED' | 'GRADED' | 'LATE' | 'RESUBMITTED';

export interface IAssignmentSubmission {
  id: string;
  tenantId: string;
  homeworkId: string;
  studentId: string;
  submissionDate: Date;
  attachments: string[];
  content?: string;
  score?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
  status: SubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
}
