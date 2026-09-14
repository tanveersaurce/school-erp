import { Schema, model, Types } from 'mongoose';
import {
  ExamStatus,
  ExamType,
  MarkStatus,
  ResultStatus,
  CorrectionStatus,
} from '@edusphere/common';
import {
  IExam,
  IExamSchedule,
  IMarksEntry,
  IReportCard,
  IMarkEntryItem,
  IGradingScheme,
  IGradeThreshold,
  IExamMark,
  IMarkCorrection,
  IResult,
  ISubjectResultSnapshot,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// -------------------------------------------------------------
// Document Interfaces
// -------------------------------------------------------------

export interface IGradingSchemeDoc extends Omit<IGradingScheme, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IExamDoc
  extends Omit<
    IExam,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'campusId'
    | 'academicYearId'
    | 'academicClassIds'
    | 'gradingSchemeId'
    | 'createdBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  academicClassIds?: Types.ObjectId[];
  gradingSchemeId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
}

export interface IExamScheduleDoc
  extends Omit<
    IExamSchedule,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'campusId'
    | 'examId'
    | 'classId'
    | 'academicClassId'
    | 'subjectId'
    | 'roomId'
    | 'invigilatorId'
  > {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  examId: Types.ObjectId;
  classId?: Types.ObjectId;
  academicClassId: Types.ObjectId;
  subjectId: Types.ObjectId;
  roomId?: Types.ObjectId;
  invigilatorId?: Types.ObjectId;
  isDeleted?: boolean;
}

export interface IExamMarkDoc
  extends Omit<
    IExamMark,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'campusId'
    | 'academicYearId'
    | 'examId'
    | 'academicClassId'
    | 'subjectId'
    | 'studentId'
    | 'enteredBy'
    | 'verifiedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  examId: Types.ObjectId;
  academicClassId: Types.ObjectId;
  subjectId: Types.ObjectId;
  studentId: Types.ObjectId;
  enteredBy?: Types.ObjectId;
  verifiedBy?: Types.ObjectId;
}

export interface IMarkCorrectionDoc
  extends Omit<
    IMarkCorrection,
    | 'id'
    | 'tenantId'
    | 'examId'
    | 'studentId'
    | 'subjectId'
    | 'academicClassId'
    | 'requestedBy'
    | 'approvedBy'
  > {
  tenantId: Types.ObjectId;
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  academicClassId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

export interface ISubjectResultSnapshotDoc extends Omit<ISubjectResultSnapshot, 'subjectId'> {
  subjectId: Types.ObjectId;
}

export interface IResultDoc
  extends Omit<
    IResult,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'campusId'
    | 'academicYearId'
    | 'examId'
    | 'academicClassId'
    | 'classId'
    | 'sectionId'
    | 'studentId'
    | 'subjectResults'
    | 'calculatedBy'
    | 'approvedBy'
    | 'publishedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  examId: Types.ObjectId;
  academicClassId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectResults: ISubjectResultSnapshotDoc[];
  calculatedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  publishedBy?: Types.ObjectId;
}

// -------------------------------------------------------------
// 1. GradingScheme Schema
// -------------------------------------------------------------
const GradeThresholdSchema = new Schema<IGradeThreshold>(
  {
    grade: { type: String, required: true, trim: true },
    minPercentage: { type: Number, required: true, min: 0, max: 100 },
    maxPercentage: { type: Number, required: true, min: 0, max: 100 },
    gradePoint: { type: Number, min: 0 },
    description: { type: String, trim: true },
    isPassing: { type: Boolean, default: true },
  },
  { _id: false }
);

const GradingSchemeSchema = new Schema<IGradingSchemeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    isDefault: { type: Boolean, default: false },
    grades: [GradeThresholdSchema],
  },
  { timestamps: true, versionKey: '__v' }
);
GradingSchemeSchema.plugin(tenantPlugin);
GradingSchemeSchema.plugin(softDeletePlugin);
GradingSchemeSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// -------------------------------------------------------------
// 2. Exam Schema
// -------------------------------------------------------------
const ExamSchema = new Schema<IExamDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true },
    examType: {
      type: String,
      required: true,
      index: true,
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
    academicClassIds: [{ type: Schema.Types.ObjectId, ref: 'AcademicClass' }],
    gradingSchemeId: { type: Schema.Types.ObjectId, ref: 'GradingScheme' },
    passingPercentage: { type: Number, default: 33, min: 0, max: 100 },
    weightagePercentage: { type: Number, min: 0, max: 100 },
    publishedAt: { type: Date },
    resultsPublishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ExamSchema.plugin(tenantPlugin);
ExamSchema.plugin(softDeletePlugin);
ExamSchema.index({ tenantId: 1, schoolId: 1, academicYearId: 1, title: 1 });
ExamSchema.index({ tenantId: 1, campusId: 1, academicYearId: 1, status: 1 });
ExamSchema.index({ tenantId: 1, status: 1 });

// -------------------------------------------------------------
// 3. ExamSchedule Schema
// -------------------------------------------------------------
const ExamScheduleSchema = new Schema<IExamScheduleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    examDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMinutes: { type: Number },
    room: { type: String },
    roomId: { type: Schema.Types.ObjectId, ref: 'Classroom', index: true },
    invigilatorId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    maxMarks: { type: Number, required: true, default: 100, min: 1 },
    passMarks: { type: Number, required: true, default: 33, min: 0 },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
    },
  },
  { timestamps: true, versionKey: '__v' }
);
ExamScheduleSchema.plugin(tenantPlugin);
ExamScheduleSchema.plugin(softDeletePlugin);
ExamScheduleSchema.index(
  { tenantId: 1, examId: 1, academicClassId: 1, subjectId: 1 },
  { unique: true }
);
ExamScheduleSchema.index({ tenantId: 1, roomId: 1, examDate: 1 });
ExamScheduleSchema.index({ tenantId: 1, invigilatorId: 1, examDate: 1 });

// -------------------------------------------------------------
// 4. ExamMark Schema (Individual Student Mark Document)
// -------------------------------------------------------------
const ExamMarkSchema = new Schema<IExamMarkDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    maxMarks: { type: Number, required: true, min: 1 },
    marksObtained: { type: Number, min: 0, default: null },
    status: {
      type: String,
      enum: Object.values(MarkStatus),
      default: MarkStatus.NOT_ENTERED,
      required: true,
      index: true,
    },
    grade: { type: String, trim: true },
    gradePoint: { type: Number },
    percentage: { type: Number, min: 0, max: 100 },
    remarks: { type: String, trim: true },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    enteredAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    lockedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
ExamMarkSchema.plugin(tenantPlugin);
ExamMarkSchema.plugin(softDeletePlugin);
ExamMarkSchema.index(
  { tenantId: 1, examId: 1, academicClassId: 1, subjectId: 1, studentId: 1 },
  { unique: true }
);
ExamMarkSchema.index({ tenantId: 1, examId: 1, studentId: 1 });
ExamMarkSchema.index({ tenantId: 1, examId: 1, academicClassId: 1, subjectId: 1 });

// -------------------------------------------------------------
// 5. MarkCorrection Schema
// -------------------------------------------------------------
const MarkCorrectionSchema = new Schema<IMarkCorrectionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', required: true, index: true },
    previousMarks: { type: Number, default: null },
    newMarks: { type: Number, default: null },
    previousStatus: {
      type: String,
      enum: Object.values(MarkStatus),
      required: true,
    },
    newStatus: {
      type: String,
      enum: Object.values(MarkStatus),
      required: true,
    },
    reason: { type: String, required: true, trim: true, minlength: 3 },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(CorrectionStatus),
      default: CorrectionStatus.PENDING,
      required: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: '__v' }
);
MarkCorrectionSchema.plugin(tenantPlugin);
MarkCorrectionSchema.plugin(softDeletePlugin);
MarkCorrectionSchema.index({ tenantId: 1, examId: 1, studentId: 1 });
MarkCorrectionSchema.index({ tenantId: 1, status: 1 });

// -------------------------------------------------------------
// 6. Result Schema
// -------------------------------------------------------------
const SubjectResultSnapshotSchema = new Schema<ISubjectResultSnapshotDoc>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    subjectCode: { type: String },
    maxMarks: { type: Number, required: true },
    passMarks: { type: Number, required: true },
    marksObtained: { type: Number, default: null },
    status: {
      type: String,
      enum: Object.values(MarkStatus),
      required: true,
    },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    gradePoint: { type: Number },
    isPassed: { type: Boolean, required: true },
    remarks: { type: String },
  },
  { _id: false }
);

const ResultSchema = new Schema<IResultDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    rollNumber: { type: Number },
    version: { type: Number, required: true, default: 1 },
    isCurrentVersion: { type: Boolean, required: true, default: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'CALCULATED', 'APPROVED', 'PUBLISHED', 'ARCHIVED'],
      default: 'CALCULATED',
      required: true,
      index: true,
    },
    subjectResults: [SubjectResultSnapshotSchema],
    totalMaxMarks: { type: Number, required: true },
    totalMarksObtained: { type: Number, required: true },
    percentage: { type: Number, required: true },
    overallGrade: { type: String, required: true },
    overallGradePoint: { type: Number },
    resultStatus: {
      type: String,
      enum: Object.values(ResultStatus),
      required: true,
      index: true,
    },
    failedSubjectCount: { type: Number, required: true, default: 0 },
    gradingSchemeSnapshot: {
      name: { type: String },
      grades: [GradeThresholdSchema],
    },
    calculatedAt: { type: Date, default: Date.now },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: '__v' }
);
ResultSchema.plugin(tenantPlugin);
ResultSchema.plugin(softDeletePlugin);
ResultSchema.index(
  { tenantId: 1, examId: 1, studentId: 1, version: 1 },
  { unique: true }
);
ResultSchema.index({ tenantId: 1, examId: 1, studentId: 1, isCurrentVersion: 1 });
ResultSchema.index({ tenantId: 1, examId: 1, academicClassId: 1, status: 1 });
ResultSchema.index({ tenantId: 1, studentId: 1, status: 1 });

// -------------------------------------------------------------
// Legacy Models for Backwards Compatibility
// -------------------------------------------------------------
export interface IMarkEntryItemDoc extends Omit<IMarkEntryItem, 'studentId'> {
  studentId: Types.ObjectId;
}

export interface IMarksEntryDoc
  extends Omit<
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

export interface IReportCardDoc
  extends Omit<
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

// -------------------------------------------------------------
// Exports
// -------------------------------------------------------------
export const GradingScheme = model<IGradingSchemeDoc>('GradingScheme', GradingSchemeSchema);
export const Exam = model<IExamDoc>('Exam', ExamSchema);
export const ExamSchedule = model<IExamScheduleDoc>('ExamSchedule', ExamScheduleSchema);
export const ExamMark = model<IExamMarkDoc>('ExamMark', ExamMarkSchema);
export const MarkCorrection = model<IMarkCorrectionDoc>('MarkCorrection', MarkCorrectionSchema);
export const Result = model<IResultDoc>('Result', ResultSchema);

// Legacy exports
export const MarksEntry = model<IMarksEntryDoc>('MarksEntry', MarksEntrySchema);
export const ReportCard = model<IReportCardDoc>('ReportCard', ReportCardSchema);
