import { Schema, model, Types } from 'mongoose';
import { StudentStatus } from '@edusphere/common';
import {
  IStudent,
  IParent,
  IStudentParentRelation,
  ITeacher,
  IStaff,
  ParentRelationType,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IStudentDoc extends Omit<IStudent, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  userId?: Types.ObjectId;
}

export interface IParentDoc extends Omit<IParent, 'id' | 'tenantId' | 'userId'> {
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
}

export interface IStudentParentRelationDoc extends Omit<
  IStudentParentRelation,
  'id' | 'tenantId' | 'studentId' | 'parentId'
> {
  tenantId: Types.ObjectId;
  studentId: Types.ObjectId;
  parentId: Types.ObjectId;
}

export interface ITeacherDoc extends Omit<ITeacher, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
}

export interface IStaffDoc extends Omit<IStaff, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
}

// 1. Student Schema
const StudentSchema = new Schema<IStudentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    admissionNumber: { type: String, required: true, uppercase: true, trim: true },
    personalDetails: {
      firstName: { type: String, required: true, trim: true },
      middleName: { type: String, trim: true },
      lastName: { type: String, required: true, trim: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
      bloodGroup: { type: String, trim: true },
      nationality: { type: String, default: 'Indian', trim: true },
      religion: { type: String, trim: true },
    },
    contactDetails: {
      primaryEmail: { type: String, lowercase: true, trim: true },
      primaryPhone: { type: String, trim: true },
      emergencyPhone: { type: String, required: true, trim: true },
      currentAddress: { type: String, required: true },
      permanentAddress: { type: String },
    },
    medicalInfo: {
      allergies: [{ type: String }],
      chronicConditions: [{ type: String }],
      physicianName: { type: String },
      physicianContact: { type: String },
    },
    currentStatus: {
      type: String,
      enum: Object.values(StudentStatus),
      default: StudentStatus.ACTIVE,
      required: true,
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentSchema.plugin(tenantPlugin);
StudentSchema.plugin(softDeletePlugin);
StudentSchema.index({ tenantId: 1, schoolId: 1, admissionNumber: 1 }, { unique: true });

// 2. Parent Schema
const ParentSchema = new Schema<IParentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    personalDetails: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      occupation: { type: String, trim: true },
      annualIncome: { type: Number },
    },
    contactDetails: {
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ParentSchema.plugin(tenantPlugin);
ParentSchema.plugin(softDeletePlugin);
ParentSchema.index({ tenantId: 1, 'contactDetails.email': 1 });
ParentSchema.index({ tenantId: 1, 'contactDetails.phone': 1 });

// 3. StudentParentRelation Schema
const StudentParentRelationSchema = new Schema<IStudentParentRelationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    relationshipType: {
      type: String,
      enum: ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'] as ParentRelationType[],
      required: true,
    },
    isPrimaryContact: { type: Boolean, default: false },
    isEmergencyContact: { type: Boolean, default: false },
    hasFeeResponsibility: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: '__v' }
);
StudentParentRelationSchema.plugin(tenantPlugin);
StudentParentRelationSchema.index({ tenantId: 1, studentId: 1, parentId: 1 }, { unique: true });

// 4. Teacher Schema
const TeacherSchema = new Schema<ITeacherDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    qualifications: [{ type: String }],
    joiningDate: { type: Date, required: true },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'ON_LEAVE', 'PROBATION', 'RESIGNED', 'TERMINATED'],
      default: 'ACTIVE',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TeacherSchema.plugin(tenantPlugin);
TeacherSchema.plugin(softDeletePlugin);
TeacherSchema.index({ tenantId: 1, schoolId: 1, employeeId: 1 }, { unique: true });

// 5. Staff Schema
const StaffSchema = new Schema<IStaffDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    joiningDate: { type: Date, required: true },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'ON_LEAVE', 'PROBATION', 'RESIGNED', 'TERMINATED'],
      default: 'ACTIVE',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
StaffSchema.plugin(tenantPlugin);
StaffSchema.plugin(softDeletePlugin);
StaffSchema.index({ tenantId: 1, schoolId: 1, employeeId: 1 }, { unique: true });

export const Student = model<IStudentDoc>('Student', StudentSchema);
export const Parent = model<IParentDoc>('Parent', ParentSchema);
export const StudentParentRelation = model<IStudentParentRelationDoc>(
  'StudentParentRelation',
  StudentParentRelationSchema
);
export const Teacher = model<ITeacherDoc>('Teacher', TeacherSchema);
export const Staff = model<IStaffDoc>('Staff', StaffSchema);
