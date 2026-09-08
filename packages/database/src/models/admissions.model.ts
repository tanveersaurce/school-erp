import { Schema, model, Types } from 'mongoose';
import { AdmissionStatus } from '@edusphere/common';
import { IAdmissionApplication } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IAdmissionApplicationDoc extends Omit<
  IAdmissionApplication,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId' | 'classId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
}

const AdmissionApplicationSchema = new Schema<IAdmissionApplicationDoc>(
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
    applicationNumber: { type: String, required: true, uppercase: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentDetails: {
      firstName: { type: String, required: true, trim: true },
      middleName: { type: String, trim: true },
      lastName: { type: String, required: true, trim: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
      bloodGroup: { type: String, trim: true },
      nationality: { type: String, default: 'Indian', trim: true },
      religion: { type: String, trim: true },
    },
    parentDetails: {
      fatherName: { type: String, trim: true },
      fatherPhone: { type: String, trim: true },
      fatherEmail: { type: String, lowercase: true, trim: true },
      fatherOccupation: { type: String, trim: true },
      motherName: { type: String, trim: true },
      motherPhone: { type: String, trim: true },
      motherEmail: { type: String, lowercase: true, trim: true },
      guardianName: { type: String, trim: true },
      guardianPhone: { type: String, trim: true },
      guardianRelation: { type: String, trim: true },
      address: { type: String, required: true },
    },
    previousSchoolDetails: {
      schoolName: { type: String, trim: true },
      lastClassPassed: { type: String, trim: true },
      tcNumber: { type: String, trim: true },
      percentageObtained: { type: Number },
    },
    status: {
      type: String,
      enum: Object.values(AdmissionStatus),
      default: AdmissionStatus.DRAFT,
      required: true,
      index: true,
    },
    interviewDate: { type: Date },
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
      },
    ],
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);

AdmissionApplicationSchema.plugin(tenantPlugin);
AdmissionApplicationSchema.plugin(softDeletePlugin);
AdmissionApplicationSchema.index(
  { tenantId: 1, schoolId: 1, applicationNumber: 1 },
  { unique: true }
);

export const AdmissionApplication = model<IAdmissionApplicationDoc>(
  'AdmissionApplication',
  AdmissionApplicationSchema
);
