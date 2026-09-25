import { Schema, model, Types } from 'mongoose';
import { EmploymentStatus, EmploymentType, Gender, StaffDocumentType } from '@edusphere/common';
import { IDepartment, IDesignation, IEmployee, ITeacherProfile } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// =========================================================================
// Document Interfaces
// =========================================================================
export interface IDepartmentDoc extends Omit<
  IDepartment,
  'id' | 'tenantId' | 'schoolId' | 'headOfDepartmentId'
> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  headOfDepartmentId?: Types.ObjectId;
}

export interface IDesignationDoc extends Omit<
  IDesignation,
  'id' | 'tenantId' | 'schoolId' | 'departmentId'
> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  departmentId?: Types.ObjectId;
}

export interface ICounterDoc {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  sequenceType: string;
  currentValue: number;
}

export interface IEmployeeDoc extends Omit<
  IEmployee,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'userId'
  | 'departmentId'
  | 'designationId'
  | 'reportingManagerId'
  | 'documents'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  userId?: Types.ObjectId;
  departmentId: Types.ObjectId;
  designationId: Types.ObjectId;
  reportingManagerId?: Types.ObjectId;
  documents: Array<{
    id?: string;
    name: string;
    documentType: StaffDocumentType;
    fileRecordId?: Types.ObjectId;
    fileUrl?: string;
    uploadedAt: Date;
  }>;
}

export interface ITeacherProfileDoc extends Omit<
  ITeacherProfile,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'employeeId' | 'userId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  userId?: Types.ObjectId;
}

// =========================================================================
// 1. Department Schema
// =========================================================================
const DepartmentSchema = new Schema<IDepartmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    headOfDepartmentId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
DepartmentSchema.plugin(tenantPlugin);
DepartmentSchema.plugin(softDeletePlugin);
DepartmentSchema.index(
  { tenantId: 1, schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
DepartmentSchema.index(
  { tenantId: 1, schoolId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 2. Designation Schema
// =========================================================================
const DesignationSchema = new Schema<IDesignationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    level: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
DesignationSchema.plugin(tenantPlugin);
DesignationSchema.plugin(softDeletePlugin);
DesignationSchema.index(
  { tenantId: 1, schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 3. Counter Schema (Atomic, concurrency-safe sequential identifiers)
// =========================================================================
const CounterSchema = new Schema<ICounterDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    sequenceType: { type: String, required: true, uppercase: true, trim: true },
    currentValue: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false }
);
CounterSchema.index({ tenantId: 1, schoolId: 1, sequenceType: 1 }, { unique: true });

// =========================================================================
// 4. Employee Schema
// =========================================================================
const QualificationSubSchema = new Schema(
  {
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    yearOfPassing: { type: Number, required: true },
    percentageOrCgpa: { type: String, trim: true },
  },
  { _id: false }
);

const PreviousExperienceSubSchema = new Schema(
  {
    institutionOrCompany: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    fromYear: { type: Number, required: true },
    toYear: { type: Number, required: true },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const EmergencyContactSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const StaffDocumentSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    documentType: {
      type: String,
      enum: Object.values(StaffDocumentType),
      default: StaffDocumentType.OTHER,
      required: true,
    },
    fileRecordId: { type: Schema.Types.ObjectId, ref: 'FileRecord' },
    fileUrl: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const EmployeeSchema = new Schema<IEmployeeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    gender: { type: String, enum: Object.values(Gender), required: true },
    dateOfBirth: { type: Date, required: true },
    bloodGroup: { type: String, trim: true },
    nationality: { type: String, default: 'Indian', trim: true },
    profilePhotoUrl: { type: String, trim: true },
    workEmail: { type: String, lowercase: true, trim: true },
    workPhone: { type: String, trim: true },
    personalEmail: { type: String, lowercase: true, trim: true },
    personalPhone: { type: String, trim: true },
    currentAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    designationId: { type: Schema.Types.ObjectId, ref: 'Designation', required: true, index: true },
    reportingManagerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      default: EmploymentType.FULL_TIME,
      required: true,
    },
    employmentStatus: {
      type: String,
      enum: Object.values(EmploymentStatus),
      default: EmploymentStatus.ACTIVE,
      required: true,
      index: true,
    },
    joiningDate: { type: Date, required: true },
    probationStartDate: { type: Date },
    probationEndDate: { type: Date },
    confirmationDate: { type: Date },
    workLocation: { type: String, trim: true },
    resignationDate: { type: Date },
    lastWorkingDate: { type: Date },
    terminationDate: { type: Date },
    terminationReason: { type: String, trim: true },
    qualifications: [QualificationSubSchema],
    previousExperience: [PreviousExperienceSubSchema],
    emergencyContact: EmergencyContactSubSchema,
    documents: [StaffDocumentSubSchema],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
EmployeeSchema.plugin(tenantPlugin);
EmployeeSchema.plugin(softDeletePlugin);

// Compound Unique Indexes
EmployeeSchema.index(
  { tenantId: 1, schoolId: 1, employeeId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
EmployeeSchema.index(
  { tenantId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $exists: true, $ne: null }, isDeleted: false },
  }
);
EmployeeSchema.index({
  tenantId: 1,
  schoolId: 1,
  campusId: 1,
  departmentId: 1,
  employmentStatus: 1,
});
EmployeeSchema.index({ tenantId: 1, schoolId: 1, isDeleted: 1, createdAt: -1 });
EmployeeSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
EmployeeSchema.index({ tenantId: 1, displayName: 'text', employeeId: 'text', workEmail: 'text' });

// =========================================================================
// 5. TeacherProfile Schema (Extends Employee for Academic Specialty)
// =========================================================================
const TeacherProfileSchema = new Schema<ITeacherProfileDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    teacherCode: { type: String, uppercase: true, trim: true },
    specialization: { type: String, trim: true },
    primarySubject: { type: String, trim: true },
    secondarySubjects: [{ type: String, trim: true }],
    teachingExperienceYears: { type: Number, default: 0, min: 0 },
    isAvailableForTimetable: { type: Boolean, default: true },
    maxWeeklyPeriods: { type: Number, default: 30, min: 1 },
    bio: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TeacherProfileSchema.plugin(tenantPlugin);
TeacherProfileSchema.plugin(softDeletePlugin);
TeacherProfileSchema.index(
  { tenantId: 1, employeeId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// Models Export
// =========================================================================
export const Department = model<IDepartmentDoc>('Department', DepartmentSchema);
export const Designation = model<IDesignationDoc>('Designation', DesignationSchema);
export const Counter = model<ICounterDoc>('Counter', CounterSchema);
export const Employee = model<IEmployeeDoc>('Employee', EmployeeSchema);
export const TeacherProfile = model<ITeacherProfileDoc>('TeacherProfile', TeacherProfileSchema);
