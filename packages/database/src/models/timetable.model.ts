import { Schema, model, Types } from 'mongoose';
import {
  IPeriod,
  IClassroom,
  ITimetable,
  ITimetableEntry,
} from '@edusphere/types';
import {
  AcademicStatus,
  PeriodType,
  TimetableStatus,
  RoomType,
  TimetableEntryStatus,
} from '@edusphere/common';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// =========================================================================
// 1. Period Model Definition
// =========================================================================
export interface IPeriodDoc extends Omit<IPeriod, 'id' | 'tenantId' | 'schoolId' | 'campusId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
}

const PeriodSchema = new Schema<IPeriodDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sequence: { type: Number, required: true, min: 1 },
    startTime: { type: String, required: true, trim: true }, // "08:30"
    endTime: { type: String, required: true, trim: true }, // "09:15"
    duration: { type: Number, required: true, min: 1 }, // Minutes
    type: {
      type: String,
      enum: Object.values(PeriodType),
      default: PeriodType.TEACHING,
      required: true,
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

PeriodSchema.plugin(tenantPlugin);
PeriodSchema.plugin(softDeletePlugin);

PeriodSchema.index({ tenantId: 1, campusId: 1, sequence: 1, isDeleted: 1 });
PeriodSchema.index({ tenantId: 1, campusId: 1, code: 1, isDeleted: 1 }, { unique: true });

// =========================================================================
// 2. Classroom / Physical Room Model Definition
// =========================================================================
export interface IClassroomDoc extends Omit<IClassroom, 'id' | 'tenantId' | 'schoolId' | 'campusId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
}

const ClassroomSchema = new Schema<IClassroomDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    roomNumber: { type: String, trim: true },
    capacity: { type: Number, required: true, min: 1, default: 40 },
    roomType: {
      type: String,
      enum: Object.values(RoomType),
      default: RoomType.CLASSROOM,
      required: true,
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

ClassroomSchema.plugin(tenantPlugin);
ClassroomSchema.plugin(softDeletePlugin);

ClassroomSchema.index({ tenantId: 1, campusId: 1, code: 1, isDeleted: 1 }, { unique: true });
ClassroomSchema.index({ tenantId: 1, campusId: 1, roomType: 1, isDeleted: 1 });

// =========================================================================
// 3. Timetable Master Version Model Definition
// =========================================================================
export interface ITimetableDoc
  extends Omit<
    ITimetable,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'campusId'
    | 'academicYearId'
    | 'publishedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  publishedBy?: Types.ObjectId;
}

const TimetableSchema = new Schema<ITimetableDoc>(
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
    name: { type: String, required: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(TimetableStatus),
      default: TimetableStatus.DRAFT,
      required: true,
      index: true,
    },
    version: { type: Number, required: true, default: 1 },
    isCurrent: { type: Boolean, default: false, index: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);

TimetableSchema.plugin(tenantPlugin);
TimetableSchema.plugin(softDeletePlugin);

TimetableSchema.index({ tenantId: 1, campusId: 1, academicYearId: 1, status: 1 });
TimetableSchema.index({ tenantId: 1, campusId: 1, academicYearId: 1, isCurrent: 1 });

// =========================================================================
// 4. Timetable Entry Model Definition
// =========================================================================
export interface ITimetableEntryDoc
  extends Omit<
    ITimetableEntry,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'timetableId'
    | 'academicClassId'
    | 'classId'
    | 'sectionId'
    | 'periodId'
    | 'subjectId'
    | 'teacherId'
    | 'roomId'
    | 'substituteTeacherId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  timetableId: Types.ObjectId;
  academicClassId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  periodId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  roomId?: Types.ObjectId;
  substituteTeacherId?: Types.ObjectId;
}

const TimetableEntrySchema = new Schema<ITimetableEntryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    timetableId: { type: Schema.Types.ObjectId, ref: 'Timetable', required: true, index: true },
    academicClassId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicClass',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 }, // 1 = Monday ... 7 = Sunday
    periodId: { type: Schema.Types.ObjectId, ref: 'Period', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Classroom', index: true },
    status: {
      type: String,
      enum: Object.values(TimetableEntryStatus),
      default: TimetableEntryStatus.ACTIVE,
      required: true,
    },
    substituteTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    substitutionNote: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);

TimetableEntrySchema.plugin(tenantPlugin);
TimetableEntrySchema.plugin(softDeletePlugin);

// Concurrency-safe unique indexes preventing race conditions
// 1. Class cannot have two subjects/teachers in the same day and period slot
TimetableEntrySchema.index(
  { timetableId: 1, academicClassId: 1, dayOfWeek: 1, periodId: 1, isDeleted: 1 },
  { unique: true }
);

// 2. Teacher cannot be double-booked across classes during the same day and period slot
TimetableEntrySchema.index(
  { timetableId: 1, teacherId: 1, dayOfWeek: 1, periodId: 1, isDeleted: 1 },
  { unique: true }
);

// 3. Room cannot be double-booked across classes during the same day and period slot
TimetableEntrySchema.index(
  { timetableId: 1, roomId: 1, dayOfWeek: 1, periodId: 1, isDeleted: 1 },
  { unique: true, sparse: true }
);

// General query lookup indexes
TimetableEntrySchema.index({ tenantId: 1, timetableId: 1, dayOfWeek: 1 });
TimetableEntrySchema.index({ tenantId: 1, timetableId: 1, teacherId: 1 });
TimetableEntrySchema.index({ tenantId: 1, timetableId: 1, academicClassId: 1 });

export const Period = model<IPeriodDoc>('Period', PeriodSchema);
export const Classroom = model<IClassroomDoc>('Classroom', ClassroomSchema);
export const Timetable = model<ITimetableDoc>('Timetable', TimetableSchema);
export const TimetableEntry = model<ITimetableEntryDoc>('TimetableEntry', TimetableEntrySchema);
