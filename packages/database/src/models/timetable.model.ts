import { Schema, model, Types } from 'mongoose';
import { ITimetable, IPeriod } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface ITimetableDoc extends Omit<
  ITimetable,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'academicYearId' | 'classId' | 'sectionId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
}

export interface IPeriodDoc extends Omit<
  IPeriod,
  'id' | 'tenantId' | 'schoolId' | 'timetableId' | 'subjectId' | 'teacherId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  timetableId: Types.ObjectId;
  subjectId?: Types.ObjectId;
  teacherId?: Types.ObjectId;
}

// 1. Timetable Schema
const TimetableSchema = new Schema<ITimetableDoc>(
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
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TimetableSchema.plugin(tenantPlugin);
TimetableSchema.plugin(softDeletePlugin);
TimetableSchema.index({ tenantId: 1, academicYearId: 1, sectionId: 1 });

// 2. Period Schema
const PeriodSchema = new Schema<IPeriodDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    timetableId: { type: Schema.Types.ObjectId, ref: 'Timetable', required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 }, // 1 = Monday ... 7 = Sunday
    periodNumber: { type: Number, required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "09:45"
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    room: { type: String, trim: true },
    isBreak: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
PeriodSchema.plugin(tenantPlugin);
PeriodSchema.index(
  { tenantId: 1, timetableId: 1, dayOfWeek: 1, periodNumber: 1 },
  { unique: true }
);

export const Timetable = model<ITimetableDoc>('Timetable', TimetableSchema);
export const Period = model<IPeriodDoc>('Period', PeriodSchema);
