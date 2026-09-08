import { Schema, model, Types } from 'mongoose';
import { TenantPlan, TenantBillingStatus } from '@edusphere/common';
import { ITenant, ISchool, ICampus, IAcademicYear } from '@edusphere/types';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface ITenantDoc extends Omit<ITenant, 'id'> {}

export interface ISchoolDoc extends Omit<ISchool, 'id' | 'tenantId'> {
  tenantId: Types.ObjectId;
}

export interface ICampusDoc extends Omit<ICampus, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IAcademicYearDoc extends Omit<
  IAcademicYear,
  'id' | 'tenantId' | 'schoolId' | 'campusId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
}

// 1. Tenant Schema (Root entity, does NOT have tenantId)
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

// 2. School Schema
const SchoolSchema = new Schema<ISchoolDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    affiliationBoard: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SchoolSchema.plugin(softDeletePlugin);
SchoolSchema.index({ tenantId: 1, code: 1 }, { unique: true });

// 3. Campus Schema
const CampusSchema = new Schema<ICampusDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: 'India' },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
CampusSchema.plugin(softDeletePlugin);
CampusSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 4. Academic Year Schema
const AcademicYearSchema = new Schema<IAcademicYearDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
AcademicYearSchema.plugin(softDeletePlugin);
AcademicYearSchema.index({ tenantId: 1, schoolId: 1, campusId: 1, name: 1 }, { unique: true });

export const Tenant = model<ITenantDoc>('Tenant', TenantSchema);
export const School = model<ISchoolDoc>('School', SchoolSchema);
export const Campus = model<ICampusDoc>('Campus', CampusSchema);
export const AcademicYear = model<IAcademicYearDoc>('AcademicYear', AcademicYearSchema);
