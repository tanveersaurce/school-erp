import { Schema, model, Types } from 'mongoose';
import { IHomework, IAssignmentSubmission, SubmissionStatus } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IHomeworkDoc extends Omit<
  IHomework,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'academicYearId'
  | 'classId'
  | 'sectionId'
  | 'subjectId'
  | 'teacherId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
}

export interface IAssignmentSubmissionDoc extends Omit<
  IAssignmentSubmission,
  'id' | 'tenantId' | 'homeworkId' | 'studentId' | 'gradedBy'
> {
  tenantId: Types.ObjectId;
  homeworkId: Types.ObjectId;
  studentId: Types.ObjectId;
  gradedBy?: Types.ObjectId;
}

// 1. Homework Schema
const HomeworkSchema = new Schema<IHomeworkDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    dueDate: { type: Date, required: true, index: true },
    maxScore: { type: Number, default: 100 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
HomeworkSchema.plugin(tenantPlugin);
HomeworkSchema.plugin(softDeletePlugin);
HomeworkSchema.index({ tenantId: 1, classId: 1, sectionId: 1, dueDate: -1 });

// 2. AssignmentSubmission Schema
const AssignmentSubmissionSchema = new Schema<IAssignmentSubmissionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    submissionDate: { type: Date, default: Date.now, required: true },
    attachments: [{ type: String }],
    content: { type: String },
    score: { type: Number },
    feedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    gradedAt: { type: Date },
    status: {
      type: String,
      enum: ['SUBMITTED', 'GRADED', 'LATE', 'RESUBMITTED'] as SubmissionStatus[],
      default: 'SUBMITTED',
      required: true,
    },
  },
  { timestamps: true, versionKey: '__v' }
);
AssignmentSubmissionSchema.plugin(tenantPlugin);
AssignmentSubmissionSchema.index({ tenantId: 1, homeworkId: 1, studentId: 1 }, { unique: true });

export const Homework = model<IHomeworkDoc>('Homework', HomeworkSchema);
export const AssignmentSubmission = model<IAssignmentSubmissionDoc>(
  'AssignmentSubmission',
  AssignmentSubmissionSchema
);
