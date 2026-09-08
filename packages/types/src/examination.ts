import { ExamStatus } from '@edusphere/common';

export type ExamType = 'UNIT_TEST' | 'MID_TERM' | 'FINAL' | 'PRACTICAL';

export interface IExam {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  title: string;
  examType: ExamType;
  status: ExamStatus;
  startDate: Date;
  endDate: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamSchedule {
  id: string;
  tenantId: string;
  examId: string;
  classId: string;
  subjectId: string;
  examDate: Date;
  startTime: string;
  endTime: string;
  room?: string;
  maxMarks: number;
  passMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

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
