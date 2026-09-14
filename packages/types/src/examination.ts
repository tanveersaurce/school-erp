import { ExamStatus, ExamType, MarkStatus, ResultStatus, CorrectionStatus } from '@edusphere/common';

export { ExamType };

export interface IGradeThreshold {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  description?: string;
  isPassing: boolean;
}

export interface IGradingScheme {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  isDefault: boolean;
  grades: IGradeThreshold[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamSubjectConfig {
  subjectId: string;
  maxMarks: number;
  passMarks: number;
  theoryMaxMarks?: number;
  practicalMaxMarks?: number;
  weightage?: number;
  durationMinutes?: number;
}

export interface IExam {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  title: string;
  name?: string;
  code?: string;
  description?: string;
  examType: ExamType | string;
  status: ExamStatus;
  startDate: Date;
  endDate: Date;
  academicClassIds?: string[];
  gradingSchemeId?: string;
  passingPercentage?: number;
  weightagePercentage?: number;
  publishedAt?: Date;
  resultsPublishedAt?: Date;
  createdBy?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamSchedule {
  id: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  examId: string;
  classId?: string;
  academicClassId?: string;
  subjectId: string;
  examDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  room?: string;
  roomId?: string;
  invigilatorId?: string;
  maxMarks: number;
  passMarks: number;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduleConflictCheck {
  examId: string;
  academicClassId: string;
  subjectId: string;
  examDate: string | Date;
  startTime: string;
  endTime: string;
  roomId?: string;
  invigilatorId?: string;
  excludeScheduleId?: string;
}

export interface IScheduleConflictCheckResult {
  hasConflict: boolean;
  hasConflicts?: boolean;
  conflicts: {
    type:
      | 'CLASS_CONFLICT'
      | 'ROOM_CONFLICT'
      | 'INVIGILATOR_CONFLICT'
      | 'SUBJECT_CONFLICT'
      | 'WINDOW_CONFLICT'
      | 'CLASS_OVERLAP'
      | 'ROOM_OCCUPIED'
      | 'INVIGILATOR_ASSIGNED'
      | 'DUPLICATE_SUBJECT'
      | 'DATE_OUTSIDE_RANGE';
    message: string;
    conflictingScheduleId?: string;
  }[];
}

export interface IExamMark {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  examId: string;
  academicClassId: string;
  subjectId: string;
  studentId: string;
  maxMarks: number;
  marksObtained?: number | null;
  status: MarkStatus;
  grade?: string;
  gradePoint?: number;
  percentage?: number;
  remarks?: string;
  enteredBy?: string;
  enteredAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBulkMarksItem {
  studentId: string;
  marksObtained?: number | null;
  status?: MarkStatus;
  remarks?: string;
}

export interface IBulkMarksEntryDto {
  examId: string;
  academicClassId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
  entries: IBulkMarksItem[];
}

export interface IMarkCorrection {
  id: string;
  tenantId: string;
  examId: string;
  studentId: string;
  subjectId: string;
  academicClassId: string;
  previousMarks?: number | null;
  newMarks?: number | null;
  previousStatus: MarkStatus;
  newStatus: MarkStatus;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  status: CorrectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubjectResultSnapshot {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  maxMarks: number;
  passMarks: number;
  marksObtained?: number | null;
  status: MarkStatus;
  percentage: number;
  grade: string;
  gradePoint?: number;
  isPassed: boolean;
  remarks?: string;
}

export interface IResult {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
  examId: string;
  academicClassId: string;
  classId: string;
  sectionId: string;
  studentId: string;
  rollNumber?: number;
  version: number;
  isCurrentVersion: boolean;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  subjectResults: ISubjectResultSnapshot[];
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  overallGrade: string;
  overallGradePoint?: number;
  resultStatus: ResultStatus;
  failedSubjectCount: number;
  gradingSchemeSnapshot?: {
    name: string;
    grades: IGradeThreshold[];
  };
  calculatedAt?: Date;
  calculatedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  publishedAt?: Date;
  publishedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy structures for backwards compatibility
export interface IMarkEntryItem {
  studentId: string;
  marksObtained: number;
  isAbsent: boolean;
  grade?: string;
  feedback?: string;
}

export interface IMarksEntry {
  id: string;
  tenantId: string;
  examId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  maxMarks: number;
  passMarks: number;
  entries: IMarkEntryItem[];
  isLocked: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportCard {
  id: string;
  tenantId: string;
  examId: string;
  academicYearId: string;
  studentId: string;
  classId: string;
  sectionId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  gpa?: number;
  rank?: number;
  teacherRemarks?: string;
  principalRemarks?: string;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
