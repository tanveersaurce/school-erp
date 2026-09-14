import { Schema, model, Types } from 'mongoose';
import {
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentTargetType,
  AssignmentSubmissionStatus,
} from '@edusphere/common';
import {
  IAssignment,
  IAssignmentSubmission,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// =========================================================================
// 1. Document Interfaces
// =========================================================================

export interface IAssignmentDoc extends Omit<
  IAssignment,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'academicYearId'
  | 'academicClassId'
  | 'classId'
  | 'sectionId'
  | 'subjectId'
  | 'teacherId'
  | 'createdBy'
  | 'targetStudentIds'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  academicClassId: Types.ObjectId;
  classId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  createdBy: Types.ObjectId;
  targetStudentIds?: Types.ObjectId[];
}

export interface IAssignmentSubmissionDoc extends Omit<
  IAssignmentSubmission,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'assignmentId'
  | 'studentId'
  | 'gradedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  gradedBy?: Types.ObjectId;
}

// Sub-document schema for attachments
const AttachmentSubSchema = new Schema(
  {
    id: { type: String, required: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Sub-document schema for submission attempts history
const SubmissionAttemptSubSchema = new Schema(
  {
    attemptNumber: { type: Number, required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
    textResponse: { type: String },
    attachments: [AttachmentSubSchema],
    lateSubmission: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(AssignmentSubmissionStatus),
      default: AssignmentSubmissionStatus.SUBMITTED,
    },
  },
  { _id: false }
);

// =========================================================================
// 2. Assignment Schema
// =========================================================================

const AssignmentSchema = new Schema<IAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    academicClassId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicClass',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    instructions: { type: String },
    assignmentType: {
      type: String,
      enum: Object.values(AssignmentType),
      default: AssignmentType.HOMEWORK,
      required: true,
    },
    assignedDate: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    dueTime: { type: String, default: '23:59', required: true },
    dueAt: { type: Date, required: true, index: true },
    maxScore: { type: Number, default: 100, min: 1, required: true },
    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      default: AssignmentStatus.DRAFT,
      required: true,
      index: true,
    },
    attachments: [AttachmentSubSchema],
    submissionType: {
      type: String,
      enum: Object.values(SubmissionType),
      default: SubmissionType.BOTH,
      required: true,
    },
    allowLateSubmission: { type: Boolean, default: false },
    latePolicy: {
      deductionPercentage: { type: Number, min: 0, max: 100 },
      maxLateDays: { type: Number, min: 0 },
      notes: { type: String },
    },
    targetType: {
      type: String,
      enum: Object.values(AssignmentTargetType),
      default: AssignmentTargetType.ALL,
      required: true,
    },
    targetStudentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date },
    closedAt: { type: Date },
    archivedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);

AssignmentSchema.plugin(tenantPlugin);
AssignmentSchema.plugin(softDeletePlugin);

// Compound indexes for performant queries
AssignmentSchema.index({ tenantId: 1, academicClassId: 1, status: 1, dueAt: 1 });
AssignmentSchema.index({ tenantId: 1, teacherId: 1, status: 1 });
AssignmentSchema.index({ tenantId: 1, academicYearId: 1, subjectId: 1 });
AssignmentSchema.index({ tenantId: 1, campusId: 1, status: 1 });

// =========================================================================
// 3. AssignmentSubmission Schema
// =========================================================================

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmissionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AssignmentSubmissionStatus),
      default: AssignmentSubmissionStatus.DRAFT,
      required: true,
      index: true,
    },
    submittedAt: { type: Date },
    textResponse: { type: String },
    attachments: [AttachmentSubSchema],
    attemptNumber: { type: Number, default: 1, required: true },
    attempts: [SubmissionAttemptSubSchema],
    lateSubmission: { type: Boolean, default: false },
    score: { type: Number, min: 0 },
    feedback: { type: String },
    feedbackAttachments: [AttachmentSubSchema],
    gradedBy: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    gradedAt: { type: Date },
    returnedAt: { type: Date },
    idempotencyKey: { type: String, sparse: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);

AssignmentSubmissionSchema.plugin(tenantPlugin);
AssignmentSubmissionSchema.plugin(softDeletePlugin);

// Ensure one primary active submission record per student per assignment
AssignmentSubmissionSchema.index(
  { tenantId: 1, assignmentId: 1, studentId: 1 },
  { unique: true }
);
AssignmentSubmissionSchema.index({ tenantId: 1, studentId: 1, status: 1 });
AssignmentSubmissionSchema.index({ tenantId: 1, assignmentId: 1, status: 1 });
AssignmentSubmissionSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

// =========================================================================
// 4. Exports & Aliases
// =========================================================================

export const Assignment = model<IAssignmentDoc>('Assignment', AssignmentSchema);
export const AssignmentSubmission = model<IAssignmentSubmissionDoc>(
  'AssignmentSubmission',
  AssignmentSubmissionSchema
);

// Backward compatibility alias: Homework -> Assignment
export const Homework = Assignment;
export type IHomeworkDoc = IAssignmentDoc;
