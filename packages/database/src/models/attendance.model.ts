import { Schema, model, Types } from 'mongoose';
import {
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
  HolidayType,
} from '@edusphere/common';
import {
  IStudentAttendance,
  IStaffAttendance,
  IAttendanceRecord,
  IAttendanceCorrection,
  IHoliday,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

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
  | 'academicClassId'
  | 'classId'
  | 'sectionId'
  | 'periodId'
  | 'timetableEntryId'
  | 'subjectId'
  | 'takenBy'
  | 'approvedBy'
  | 'lockedBy'
  | 'records'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  academicClassId?: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  periodId?: Types.ObjectId;
  timetableEntryId?: Types.ObjectId;
  subjectId?: Types.ObjectId;
  takenBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  lockedBy?: Types.ObjectId;
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

export interface IAttendanceCorrectionDoc extends Omit<
  IAttendanceCorrection,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'campusId'
  | 'academicYearId'
  | 'attendanceId'
  | 'studentId'
  | 'requestedBy'
  | 'reviewedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  attendanceId: Types.ObjectId;
  studentId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
}

export interface IHolidayDoc extends Omit<
  IHoliday,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  isDeleted?: boolean;
}

// =========================================================================
// 1. StudentAttendance Schema (Class / Section / Period Attendance Sheet)
// =========================================================================
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
    academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    date: { type: Date, required: true, index: true },
    attendanceMode: {
      type: String,
      enum: Object.values(AttendanceMode),
      default: AttendanceMode.DAILY,
      required: true,
      index: true,
    },
    periodId: { type: Schema.Types.ObjectId, ref: 'Period', index: true },
    timetableEntryId: { type: Schema.Types.ObjectId, ref: 'TimetableEntry' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
    takenBy: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AttendanceLifecycleStatus),
      default: AttendanceLifecycleStatus.SUBMITTED,
      required: true,
      index: true,
    },
    isFinalized: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },
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
        isExcused: { type: Boolean, default: false },
        originalStatus: { type: String, enum: Object.values(AttendanceStatus) },
        isCorrected: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true, versionKey: '__v' }
);

StudentAttendanceSchema.plugin(tenantPlugin);

// Compound Unique Indexes for Strict Duplicate Prevention:
// 1. Class-Section Daily or Period Attendance collision prevention
StudentAttendanceSchema.index(
  { tenantId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1, attendanceMode: 1, periodId: 1 },
  { unique: true }
);

// 2. AcademicClass index (when academicClassId is present)
StudentAttendanceSchema.index(
  { tenantId: 1, academicClassId: 1, date: 1, attendanceMode: 1, periodId: 1 },
  { unique: true, sparse: true }
);

// 3. Multikey index for individual student attendance reporting
StudentAttendanceSchema.index({ tenantId: 1, 'records.studentId': 1, date: 1 });

// 4. Query indexes for campus/status monitoring
StudentAttendanceSchema.index({ tenantId: 1, campusId: 1, date: 1, status: 1 });
StudentAttendanceSchema.index({ tenantId: 1, academicYearId: 1, date: 1 });

// =========================================================================
// 2. AttendanceCorrection Schema (Audited Workflow)
// =========================================================================
const AttendanceCorrectionSchema = new Schema<IAttendanceCorrectionDoc>(
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
    attendanceId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentAttendance',
      required: true,
      index: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    oldStatus: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },
    newStatus: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(CorrectionStatus),
      default: CorrectionStatus.PENDING,
      required: true,
      index: true,
    },
    reviewedAt: { type: Date },
    reviewRemarks: { type: String, trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);

AttendanceCorrectionSchema.plugin(tenantPlugin);
AttendanceCorrectionSchema.index({ tenantId: 1, attendanceId: 1, studentId: 1 });
AttendanceCorrectionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

// =========================================================================
// 3. Holiday / Declared Non-Working Days Schema
// =========================================================================
const HolidaySchema = new Schema<IHolidayDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    type: {
      type: String,
      enum: Object.values(HolidayType),
      default: HolidayType.SCHOOL_HOLIDAY,
      required: true,
    },
    description: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);

HolidaySchema.plugin(tenantPlugin);
HolidaySchema.plugin(softDeletePlugin);
HolidaySchema.index(
  { tenantId: 1, academicYearId: 1, campusId: 1, startDate: 1, name: 1, isDeleted: 1 },
  { unique: true }
);

// =========================================================================
// 4. StaffAttendance Schema
// =========================================================================
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
export const AttendanceCorrection = model<IAttendanceCorrectionDoc>(
  'AttendanceCorrection',
  AttendanceCorrectionSchema
);
export const Holiday = model<IHolidayDoc>('Holiday', HolidaySchema);
export const StaffAttendance = model<IStaffAttendanceDoc>('StaffAttendance', StaffAttendanceSchema);
