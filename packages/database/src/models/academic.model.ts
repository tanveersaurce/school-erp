import { Schema, model, Types } from 'mongoose';
import {
  IClass,
  ISection,
  ISubject,
  ITeacherSubjectAssignment,
  IStudentEnrollment,
  SubjectType,
  EnrollmentStatus,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IClassDoc extends Omit<
  IClass,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
}

export interface ISectionDoc extends Omit<
  ISection,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId' | 'classId' | 'classTeacherId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  classTeacherId?: Types.ObjectId;
}

export interface ISubjectDoc extends Omit<ISubject, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface ITeacherSubjectAssignmentDoc extends Omit<
  ITeacherSubjectAssignment,
  | 'id'
  | 'tenantId'
  | 'academicYearId'
  | 'schoolId'
  | 'teacherId'
  | 'subjectId'
  | 'classId'
  | 'sectionId'
> {
  tenantId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
}

export interface IStudentEnrollmentDoc extends Omit<
  IStudentEnrollment,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'studentId'
  | 'academicYearId'
  | 'classId'
  | 'sectionId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
}

// 1. Class Schema
const ClassSchema = new Schema<IClassDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    order: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ClassSchema.plugin(tenantPlugin);
ClassSchema.plugin(softDeletePlugin);
ClassSchema.index({ tenantId: 1, schoolId: 1, academicYearId: 1, code: 1 }, { unique: true });

// 2. Section Schema
const SectionSchema = new Schema<ISectionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, default: 40 },
    room: { type: String, trim: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SectionSchema.plugin(tenantPlugin);
SectionSchema.plugin(softDeletePlugin);
SectionSchema.index({ tenantId: 1, classId: 1, name: 1 }, { unique: true });

// 3. Subject Schema
const SubjectSchema = new Schema<ISubjectDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['CORE', 'ELECTIVE', 'LAB', 'VOCATIONAL'] as SubjectType[],
      default: 'CORE',
      required: true,
    },
    creditHours: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SubjectSchema.plugin(tenantPlugin);
SubjectSchema.plugin(softDeletePlugin);
SubjectSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 4. TeacherSubjectAssignment Schema
const TeacherSubjectAssignmentSchema = new Schema<ITeacherSubjectAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: '__v' }
);
TeacherSubjectAssignmentSchema.plugin(tenantPlugin);
TeacherSubjectAssignmentSchema.index(
  { tenantId: 1, academicYearId: 1, sectionId: 1, subjectId: 1 },
  { unique: true }
);

// 5. StudentEnrollment Schema
const StudentEnrollmentSchema = new Schema<IStudentEnrollmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', index: true },
    rollNumber: { type: Number },
    status: {
      type: String,
      enum: ['ENROLLED', 'PROMOTED', 'RETAINED', 'TRANSFERRED', 'WITHDRAWN'] as EnrollmentStatus[],
      default: 'ENROLLED',
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentEnrollmentSchema.plugin(tenantPlugin);
StudentEnrollmentSchema.index({ tenantId: 1, academicYearId: 1, studentId: 1 }, { unique: true });
StudentEnrollmentSchema.index(
  { tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, rollNumber: 1 },
  { unique: true, sparse: true }
);

export const Class = model<IClassDoc>('Class', ClassSchema);
export const Section = model<ISectionDoc>('Section', SectionSchema);
export const Subject = model<ISubjectDoc>('Subject', SubjectSchema);
export const TeacherSubjectAssignment = model<ITeacherSubjectAssignmentDoc>(
  'TeacherSubjectAssignment',
  TeacherSubjectAssignmentSchema
);
export const StudentEnrollment = model<IStudentEnrollmentDoc>(
  'StudentEnrollment',
  StudentEnrollmentSchema
);
