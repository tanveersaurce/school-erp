import { Schema, model, Types } from 'mongoose';
import { StudentStatus, Gender } from '@edusphere/common';
import {
  IStudent,
  IParent,
  IStudentParentRelation,
  ITeacher,
  IStaff,
  ParentRelationType,
  IStudentDocument,
  IStudentStatusHistory,
  IPreviousSchoolDetails,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IStudentDoc extends Omit<IStudent, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  currentAcademicYearId?: Types.ObjectId;
  userId?: Types.ObjectId;
  studentId?: string;
  admissionDate?: Date;
  admissionType?: string;
  studentCategory?: string;
  previousSchoolDetails?: IPreviousSchoolDetails;
  documents?: IStudentDocument[];
  statusHistory?: IStudentStatusHistory[];
}

export interface IParentDoc extends Omit<IParent, 'id' | 'tenantId' | 'userId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  guardianId?: string;
  communicationPreferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export interface IStudentParentRelationDoc extends Omit<
  IStudentParentRelation,
  'id' | 'tenantId' | 'studentId' | 'parentId'
> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  studentId: Types.ObjectId;
  parentId: Types.ObjectId;
  canPickup?: boolean;
  canAccessAcademicInformation?: boolean;
  canAccessFinancialInformation?: boolean;
  canReceiveNotifications?: boolean;
  custodyRestrictions?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ITeacherDoc extends Omit<ITeacher, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
}

export interface IStaffDoc extends Omit<IStaff, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
}

// 1. Student Schema
const StudentSchema = new Schema<IStudentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    currentAcademicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    admissionNumber: { type: String, required: true, uppercase: true, trim: true },
    studentId: { type: String, uppercase: true, trim: true, index: true },
    admissionDate: { type: Date, default: Date.now },
    admissionType: {
      type: String,
      enum: ['REGULAR', 'TRANSFER', 'SCHOLARSHIP', 'MANAGEMENT'],
      default: 'REGULAR',
    },
    studentCategory: { type: String, trim: true },
    personalDetails: {
      firstName: { type: String, required: true, trim: true },
      middleName: { type: String, trim: true },
      lastName: { type: String, required: true, trim: true },
      displayName: { type: String, trim: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
      bloodGroup: { type: String, trim: true },
      nationality: { type: String, default: 'Indian', trim: true },
      religion: { type: String, trim: true },
      category: { type: String, trim: true },
      profilePhoto: { type: String, trim: true },
    },
    contactDetails: {
      primaryEmail: { type: String, lowercase: true, trim: true },
      primaryPhone: { type: String, trim: true },
      alternatePhone: { type: String, trim: true },
      emergencyPhone: { type: String, trim: true },
      currentAddress: { type: Schema.Types.Mixed, required: true },
      permanentAddress: { type: Schema.Types.Mixed },
      emergencyContacts: [
        {
          name: { type: String, required: true },
          relationship: { type: String, required: true },
          phone: { type: String, required: true },
          alternatePhone: { type: String },
          address: { type: String },
          priority: { type: Number, default: 1 },
        },
      ],
    },
    previousSchoolDetails: {
      schoolName: { type: String, trim: true },
      lastClassPassed: { type: String, trim: true },
      tcNumber: { type: String, trim: true },
      percentageObtained: { type: Number },
    },
    medicalInfo: {
      allergies: [{ type: String }],
      chronicConditions: [{ type: String }],
      physicianName: { type: String },
      physicianContact: { type: String },
      medicalNotes: { type: String },
    },
    documents: [
      {
        documentType: { type: String, required: true },
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        verificationStatus: {
          type: String,
          enum: ['UPLOADED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'ARCHIVED'],
          default: 'PENDING_VERIFICATION',
        },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: { type: Date },
        rejectionReason: { type: String },
      },
    ],
    currentStatus: {
      type: String,
      enum: Object.values(StudentStatus),
      default: StudentStatus.ACTIVE,
      required: true,
      index: true,
    },
    statusHistory: [
      {
        previousStatus: { type: String, required: true },
        newStatus: { type: String, required: true },
        reason: { type: String },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentSchema.plugin(tenantPlugin);
StudentSchema.plugin(softDeletePlugin);
StudentSchema.index({ tenantId: 1, schoolId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index(
  { tenantId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $type: 'string' } } }
);
StudentSchema.index({ tenantId: 1, campusId: 1 });
StudentSchema.index({ tenantId: 1, currentAcademicYearId: 1 });
StudentSchema.index({ tenantId: 1, currentStatus: 1 });
StudentSchema.index({
  tenantId: 1,
  'personalDetails.firstName': 1,
  'personalDetails.lastName': 1,
});

// 2. Parent / Guardian Schema
const ParentSchema = new Schema<IParentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guardianId: { type: String, trim: true, index: true },
    personalDetails: {
      firstName: { type: String, required: true, trim: true },
      middleName: { type: String, trim: true },
      lastName: { type: String, required: true, trim: true },
      displayName: { type: String, trim: true },
      occupation: { type: String, trim: true },
      annualIncome: { type: Number },
      profilePhoto: { type: String, trim: true },
    },
    contactDetails: {
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      alternatePhone: { type: String, trim: true },
      address: { type: Schema.Types.Mixed, required: true },
    },
    communicationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ParentSchema.plugin(tenantPlugin);
ParentSchema.plugin(softDeletePlugin);
ParentSchema.index(
  { tenantId: 1, guardianId: 1 },
  { unique: true, partialFilterExpression: { guardianId: { $type: 'string' } } }
);
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
      enum: ['FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'OTHER'] as ParentRelationType[],
      required: true,
    },
    isPrimaryContact: { type: Boolean, default: false },
    isEmergencyContact: { type: Boolean, default: false },
    hasFeeResponsibility: { type: Boolean, default: false },
    canPickup: { type: Boolean, default: false },
    canAccessAcademicInformation: { type: Boolean, default: true },
    canAccessFinancialInformation: { type: Boolean, default: true },
    canReceiveNotifications: { type: Boolean, default: true },
    custodyRestrictions: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true }, versionKey: '__v' }
);
StudentParentRelationSchema.plugin(tenantPlugin);
StudentParentRelationSchema.index({ tenantId: 1, studentId: 1, parentId: 1 }, { unique: true });
StudentParentRelationSchema.index({ tenantId: 1, parentId: 1 });
StudentParentRelationSchema.index({ tenantId: 1, studentId: 1 });

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
export const Guardian = Parent;
export const StudentParentRelation = model<IStudentParentRelationDoc>(
  'StudentParentRelation',
  StudentParentRelationSchema
);
export const StudentGuardianRelation = StudentParentRelation;
export const Teacher = model<ITeacherDoc>('Teacher', TeacherSchema);
export const Staff = model<IStaffDoc>('Staff', StaffSchema);
