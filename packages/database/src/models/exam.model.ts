import { Schema, model, Types } from 'mongoose';
import { ExamStatus } from '@edusphere/common';
import {
  IExam,
  IExamSchedule,
  IMarksEntry,
  IReportCard,
  ExamType,
  IMarkEntryItem,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IExamDoc extends Omit<IExam, 'id' | 'tenantId' | 'schoolId' | 'academicYearId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
}

export interface IExamScheduleDoc extends Omit<
  IExamSchedule,
  'id' | 'tenantId' | 'examId' | 'classId' | 'subjectId'
> {
  tenantId: Types.ObjectId;
  examId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
}

export interface IMarkEntryItemDoc extends Omit<IMarkEntryItem, 'studentId'> {
  studentId: Types.ObjectId;
}

export interface IMarksEntryDoc extends Omit<
  IMarksEntry,
  | 'id'
  | 'tenantId'
  | 'examId'
  | 'academicYearId'
  | 'classId'
  | 'sectionId'
  | 'subjectId'
  | 'teacherId'
  | 'entries'
> {
  tenantId: Types.ObjectId;
  examId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  entries: IMarkEntryItemDoc[];
}

export interface IReportCardDoc extends Omit<
  IReportCard,
  'id' | 'tenantId' | 'examId' | 'academicYearId' | 'studentId' | 'classId' | 'sectionId'
> {
  tenantId: Types.ObjectId;
  examId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
}

// 1. Exam Schema
const ExamSchema = new Schema<IExamDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    examType: {
      type: String,
      enum: ['UNIT_TEST', 'MID_TERM', 'FINAL', 'PRACTICAL'] as ExamType[],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ExamStatus),
      default: ExamStatus.DRAFT,
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ExamSchema.plugin(tenantPlugin);
ExamSchema.plugin(softDeletePlugin);
ExamSchema.index({ tenantId: 1, schoolId: 1, academicYearId: 1, title: 1 });

// 2. ExamSchedule Schema
const ExamScheduleSchema = new Schema<IExamScheduleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String },
    maxMarks: { type: Number, required: true, default: 100 },
    passMarks: { type: Number, required: true, default: 35 },
  },
  { timestamps: true, versionKey: '__v' }
);
ExamScheduleSchema.plugin(tenantPlugin);
ExamScheduleSchema.index({ tenantId: 1, examId: 1, classId: 1, subjectId: 1 }, { unique: true });

// 3. MarksEntry Schema (Section-Subject Level Document)
const MarksEntrySchema = new Schema<IMarksEntryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    maxMarks: { type: Number, required: true },
    passMarks: { type: Number, required: true },
    entries: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        marksObtained: { type: Number, required: true },
        isAbsent: { type: Boolean, default: false },
        grade: { type: String, trim: true },
        feedback: { type: String, trim: true },
      },
    ],
    isLocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
MarksEntrySchema.plugin(tenantPlugin);
MarksEntrySchema.plugin(softDeletePlugin);
MarksEntrySchema.index(
  { tenantId: 1, examId: 1, classId: 1, sectionId: 1, subjectId: 1 },
  { unique: true }
);
MarksEntrySchema.index({ tenantId: 1, 'entries.studentId': 1, examId: 1 });

// 4. ReportCard Schema
const ReportCardSchema = new Schema<IReportCardDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    gpa: { type: Number },
    rank: { type: Number },
    teacherRemarks: { type: String },
    principalRemarks: { type: String },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ReportCardSchema.plugin(tenantPlugin);
ReportCardSchema.plugin(softDeletePlugin);
ReportCardSchema.index({ tenantId: 1, examId: 1, studentId: 1 }, { unique: true });

export const Exam = model<IExamDoc>('Exam', ExamSchema);
export const ExamSchedule = model<IExamScheduleDoc>('ExamSchedule', ExamScheduleSchema);
export const MarksEntry = model<IMarksEntryDoc>('MarksEntry', MarksEntrySchema);
export const ReportCard = model<IReportCardDoc>('ReportCard', ReportCardSchema);
