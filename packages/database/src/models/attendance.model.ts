import { Schema, model, Types } from 'mongoose';
import { AttendanceStatus } from '@edusphere/common';
import { IStudentAttendance, IStaffAttendance, IAttendanceRecord } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';

export interface IAttendanceRecordDoc extends Omit<IAttendanceRecord, 'studentId'> {
  studentId: Types.ObjectId;
}

export interface IStudentAttendanceDoc extends Omit<
  IStudentAttendance,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'academicYearId'
  | 'classId'
  | 'sectionId'
  | 'takenBy'
  | 'verifiedBy'
  | 'records'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  takenBy: Types.ObjectId;
  verifiedBy?: Types.ObjectId;
  records: IAttendanceRecordDoc[];
}

export interface IStaffAttendanceDoc extends Omit<
  IStaffAttendance,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'staffId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  staffId: Types.ObjectId;
}

// 1. StudentAttendance Schema (Section-Aggregated Daily Document)
const StudentAttendanceSchema = new Schema<IStudentAttendanceDoc>(
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
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    date: { type: Date, required: true, index: true },
    takenBy: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    isFinalized: { type: Boolean, default: false },
    records: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        status: {
          type: String,
          enum: Object.values(AttendanceStatus),
          default: AttendanceStatus.PRESENT,
          required: true,
        },
        remarks: { type: String, trim: true },
        arrivalTimestamp: { type: Date },
      },
    ],
  },
  { timestamps: true, versionKey: '__v' }
);

StudentAttendanceSchema.plugin(tenantPlugin);
// Enforce single attendance submission per section per calendar day
StudentAttendanceSchema.index(
  { tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1 },
  { unique: true }
);
// Multikey index for individual student attendance reporting
StudentAttendanceSchema.index({ tenantId: 1, 'records.studentId': 1, date: 1 });

// 2. StaffAttendance Schema
const StaffAttendanceSchema = new Schema<IStaffAttendanceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.PRESENT,
      required: true,
    },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    remarks: { type: String, trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);

StaffAttendanceSchema.plugin(tenantPlugin);
StaffAttendanceSchema.index({ tenantId: 1, staffId: 1, date: 1 }, { unique: true });

export const StudentAttendance = model<IStudentAttendanceDoc>(
  'StudentAttendance',
  StudentAttendanceSchema
);
export const StaffAttendance = model<IStaffAttendanceDoc>('StaffAttendance', StaffAttendanceSchema);
