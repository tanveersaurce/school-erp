import { Schema, model, Types } from 'mongoose';
import {
  IClass,
  ISection,
  IAcademicClass,
  ISubject,
  IClassSubject,
  ITeacherSubjectAssignment,
  IStudentEnrollment,
  SubjectType,
  EnrollmentStatus,
} from '@edusphere/types';
import {
  EducationLevel,
  AcademicStatus,
  SubjectCategory,
  TeacherAssignmentStatus,
} from '@edusphere/common';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IClassDoc extends Omit<
  IClass,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId?: Types.ObjectId;
}

export interface ISectionDoc extends Omit<
  ISection,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId' | 'classId' | 'classTeacherId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId?: Types.ObjectId;
  classId: Types.ObjectId;
  classTeacherId?: Types.ObjectId;
}

export interface IAcademicClassDoc extends Omit<
  IAcademicClass,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'academicYearId'
  | 'classId'
  | 'sectionId'
  | 'classTeacherId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  classTeacherId?: Types.ObjectId;
}

export interface ISubjectDoc extends Omit<ISubject, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IClassSubjectDoc extends Omit<
  IClassSubject,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId' | 'classId' | 'subjectId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
}

export interface ITeacherSubjectAssignmentDoc extends Omit<
  ITeacherSubjectAssignment,
  | 'id'
  | 'tenantId'
  | 'academicYearId'
  | 'schoolId'
  | 'campusId'
  | 'teacherId'
  | 'subjectId'
  | 'classId'
  | 'sectionId'
  | 'academicClassId'
> {
  tenantId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  academicClassId?: Types.ObjectId;
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
  | 'academicClassId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
  academicClassId?: Types.ObjectId;
}

// 1. Class / Grade Schema
const ClassSchema = new Schema<IClassDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      index: true,
    },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    order: { type: Number, required: true },
    educationLevel: {
      type: String,
      enum: Object.values(EducationLevel),
    },
    status: {
      type: String,
      enum: Object.values(AcademicStatus),
      default: AcademicStatus.ACTIVE,
      required: true,
    },
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
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    capacity: { type: Number, required: true, default: 40 },
    room: { type: String, trim: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    status: {
      type: String,
      enum: Object.values(AcademicStatus),
      default: AcademicStatus.ACTIVE,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SectionSchema.plugin(tenantPlugin);
SectionSchema.plugin(softDeletePlugin);
SectionSchema.index({ tenantId: 1, classId: 1, name: 1 }, { unique: true });

// 3. Academic Class (Grade + Section offering per Academic Year & Campus)
const AcademicClassSchema = new Schema<IAcademicClassDoc>(
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
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    capacity: { type: Number, required: true, default: 40 },
    room: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(AcademicStatus),
      default: AcademicStatus.ACTIVE,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
AcademicClassSchema.plugin(tenantPlugin);
AcademicClassSchema.plugin(softDeletePlugin);
AcademicClassSchema.index(
  { tenantId: 1, academicYearId: 1, campusId: 1, classId: 1, sectionId: 1 },
  { unique: true }
);
AcademicClassSchema.index({ tenantId: 1, academicYearId: 1, classTeacherId: 1 });

// 4. Subject Schema
const SubjectSchema = new Schema<ISubjectDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['CORE', 'ELECTIVE', 'LAB', 'VOCATIONAL'] as SubjectType[],
      default: 'CORE',
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(SubjectCategory),
      default: SubjectCategory.CORE,
    },
    educationLevel: {
      type: String,
      enum: Object.values(EducationLevel),
    },
    creditHours: { type: Number, default: 1 },
    sequence: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(AcademicStatus),
      default: AcademicStatus.ACTIVE,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SubjectSchema.plugin(tenantPlugin);
SubjectSchema.plugin(softDeletePlugin);
SubjectSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 5. Class ↔ Subject Curriculum Mapping
const ClassSubjectSchema = new Schema<IClassSubjectDoc>(
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
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    isOptional: { type: Boolean, default: false },
    creditHours: { type: Number },
    sequence: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ClassSubjectSchema.plugin(tenantPlugin);
ClassSubjectSchema.plugin(softDeletePlugin);
ClassSubjectSchema.index(
  { tenantId: 1, academicYearId: 1, classId: 1, subjectId: 1 },
  { unique: true }
);

// 6. TeacherSubjectAssignment Schema
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
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass' },
    status: {
      type: String,
      enum: Object.values(TeacherAssignmentStatus),
      default: TeacherAssignmentStatus.ACTIVE,
      required: true,
    },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
TeacherSubjectAssignmentSchema.plugin(tenantPlugin);
TeacherSubjectAssignmentSchema.index(
  { tenantId: 1, academicYearId: 1, sectionId: 1, subjectId: 1 },
  { unique: true }
);
TeacherSubjectAssignmentSchema.index({ tenantId: 1, teacherId: 1, academicYearId: 1 });

// 7. StudentEnrollment Schema
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
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', index: true },
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
    promotionStatus: { type: String, trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentEnrollmentSchema.plugin(tenantPlugin);
StudentEnrollmentSchema.index({ tenantId: 1, academicYearId: 1, studentId: 1 }, { unique: true });
StudentEnrollmentSchema.index(
  { tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, rollNumber: 1 },
  { unique: true, sparse: true }
);
StudentEnrollmentSchema.index({ tenantId: 1, academicClassId: 1, rollNumber: 1 }, { sparse: true });

export const Class = model<IClassDoc>('Class', ClassSchema);
export const Section = model<ISectionDoc>('Section', SectionSchema);
export const AcademicClass = model<IAcademicClassDoc>('AcademicClass', AcademicClassSchema);
export const Subject = model<ISubjectDoc>('Subject', SubjectSchema);
export const ClassSubject = model<IClassSubjectDoc>('ClassSubject', ClassSubjectSchema);
export const TeacherSubjectAssignment = model<ITeacherSubjectAssignmentDoc>(
  'TeacherSubjectAssignment',
  TeacherSubjectAssignmentSchema
);
export const StudentEnrollment = model<IStudentEnrollmentDoc>(
  'StudentEnrollment',
  StudentEnrollmentSchema
);
