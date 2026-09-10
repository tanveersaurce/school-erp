import { Schema, model, Types } from 'mongoose';
import {
  TenantPlan,
  TenantBillingStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  OnboardingStatus,
  WeekDay,
} from '@edusphere/common';
import { ITenant, ISchool, ICampus, IAcademicYear } from '@edusphere/types';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';
import { tenantPlugin } from '../plugins/tenantPlugin.js';

export interface ITenantDoc extends Omit<ITenant, 'id'> {}

export interface ISchoolDoc extends Omit<ISchool, 'id' | 'tenantId' | 'principalId'> {
  tenantId: Types.ObjectId;
  principalId?: Types.ObjectId;
}

export interface ICampusDoc extends Omit<ICampus, 'id' | 'tenantId' | 'schoolId' | 'principalId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  principalId?: Types.ObjectId;
}

export interface IAcademicYearDoc extends Omit<
  IAcademicYear,
  'id' | 'tenantId' | 'schoolId' | 'campusId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
}

// 1. Tenant Schema (Root SaaS entity, does NOT have tenantId)
const TenantSchema = new Schema<ITenantDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    customDomain: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    plan: {
      type: String,
      enum: Object.values(TenantPlan),
      default: TenantPlan.STARTER,
      required: true,
    },
    billingStatus: {
      type: String,
      enum: Object.values(TenantBillingStatus),
      default: TenantBillingStatus.TRIAL,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TenantStatus),
      default: TenantStatus.ACTIVE,
      required: true,
    },
    onboardingStep: {
      type: String,
      enum: Object.values(OnboardingStatus),
      default: OnboardingStatus.COMPLETED,
      required: true,
    },
    features: {
      maxStudents: { type: Number, default: 500 },
      modulesEnabled: [{ type: String }],
      customBranding: { type: Boolean, default: false },
    },
    databaseConfig: {
      mode: { type: String, enum: ['SHARED', 'DEDICATED'], default: 'SHARED' },
      connectionUriSecretKey: { type: String, select: false },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TenantSchema.plugin(softDeletePlugin);

// 2. School Schema (Institution Profile & Centralized Settings)
const SchoolSchema = new Schema<ISchoolDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    affiliationBoard: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    establishedYear: { type: Number },
    contact: {
      email: { type: String, trim: true },
      secondaryEmail: { type: String, trim: true },
      phone: { type: String, trim: true },
      emergencyPhone: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    address: {
      street: { type: String },
      area: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String, default: 'India' },
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    branding: {
      logoUrl: { type: String },
      faviconUrl: { type: String },
      primaryColor: { type: String, default: '#4f46e5' },
      secondaryColor: { type: String, default: '#06b6d4' },
      displayName: { type: String },
      reportCardHeader: { type: String },
      emailSignature: { type: String },
    },
    settings: {
      general: {
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeFormat: { type: String, default: '12H' },
        weekStartDay: { type: String, enum: Object.values(WeekDay), default: WeekDay.MONDAY },
        defaultLanguage: { type: String, default: 'en' },
      },
      workingDays: [{ type: String, enum: Object.values(WeekDay) }],
      numbering: {
        admissionNumberPrefix: { type: String, default: 'ADM' },
        admissionNumberDigits: { type: Number, default: 5 },
        invoicePrefix: { type: String, default: 'INV' },
        receiptPrefix: { type: String, default: 'REC' },
        employeeIdPrefix: { type: String, default: 'EMP' },
      },
    },
    principalId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SchoolSchema.plugin(softDeletePlugin);
SchoolSchema.plugin(tenantPlugin);
SchoolSchema.index({ tenantId: 1, code: 1 }, { unique: true });

// 3. Campus Schema (Physical Campus / Branch Site)
const CampusSchema = new Schema<ICampusDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: {
      street: { type: String, required: true },
      area: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: 'India' },
    },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    principalId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(CampusStatus),
      default: CampusStatus.ACTIVE,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
CampusSchema.plugin(softDeletePlugin);
CampusSchema.plugin(tenantPlugin);
CampusSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 4. Academic Year Schema (Session Calendar with status & current toggle)
const AcademicYearSchema = new Schema<IAcademicYearDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(AcademicYearStatus),
      default: AcademicYearStatus.DRAFT,
      required: true,
    },
    isCurrent: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
AcademicYearSchema.plugin(softDeletePlugin);
AcademicYearSchema.plugin(tenantPlugin);
AcademicYearSchema.index({ tenantId: 1, schoolId: 1, campusId: 1, name: 1 }, { unique: true });
AcademicYearSchema.index({ tenantId: 1, campusId: 1, isCurrent: 1 });

export const Tenant = model<ITenantDoc>('Tenant', TenantSchema);
export const School = model<ISchoolDoc>('School', SchoolSchema);
export const Campus = model<ICampusDoc>('Campus', CampusSchema);
export const AcademicYear = model<IAcademicYearDoc>('AcademicYear', AcademicYearSchema);
