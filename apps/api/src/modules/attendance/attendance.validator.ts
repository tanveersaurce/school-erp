import { z } from 'zod';
import {
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
  HolidayType,
} from '@edusphere/common';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const attendanceRecordItemSchema = z.object({
  studentId: z.string().regex(objectIdRegex, 'Invalid studentId format'),
  status: z.nativeEnum(AttendanceStatus),
  remarks: z.string().max(255).optional(),
  arrivalTimestamp: z.string().optional().or(z.date().optional()),
});

export const markDailyAttendanceSchema = z.object({
  academicClassId: z.string().regex(objectIdRegex, 'Invalid academicClassId format'),
  date: z.string().refine(
    (d) => dateRegex.test(d) || !isNaN(Date.parse(d)),
    'Invalid date format. Use YYYY-MM-DD or ISO 8601'
  ),
  status: z.nativeEnum(AttendanceLifecycleStatus).optional().default(AttendanceLifecycleStatus.SUBMITTED),
  records: z.array(attendanceRecordItemSchema).min(1, 'At least one student record is required'),
  overrideNonWorkingDay: z.boolean().optional().default(false),
});

export const markPeriodAttendanceSchema = z.object({
  academicClassId: z.string().regex(objectIdRegex, 'Invalid academicClassId format'),
  date: z.string().refine(
    (d) => dateRegex.test(d) || !isNaN(Date.parse(d)),
    'Invalid date format. Use YYYY-MM-DD or ISO 8601'
  ),
  periodId: z.string().regex(objectIdRegex, 'Invalid periodId format'),
  timetableEntryId: z.string().regex(objectIdRegex, 'Invalid timetableEntryId format').optional(),
  subjectId: z.string().regex(objectIdRegex, 'Invalid subjectId format').optional(),
  status: z.nativeEnum(AttendanceLifecycleStatus).optional().default(AttendanceLifecycleStatus.SUBMITTED),
  records: z.array(attendanceRecordItemSchema).min(1, 'At least one student record is required'),
  overrideNonWorkingDay: z.boolean().optional().default(false),
});

export const requestCorrectionSchema = z.object({
  attendanceId: z.string().regex(objectIdRegex, 'Invalid attendanceId format'),
  studentId: z.string().regex(objectIdRegex, 'Invalid studentId format'),
  newStatus: z.nativeEnum(AttendanceStatus),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export const reviewCorrectionSchema = z.object({
  status: z.enum([CorrectionStatus.APPROVED, CorrectionStatus.REJECTED]),
  reviewRemarks: z.string().max(500).optional(),
});

export const createHolidaySchema = z.object({
  campusId: z.string().regex(objectIdRegex, 'Invalid campusId format').optional(),
  academicYearId: z.string().regex(objectIdRegex, 'Invalid academicYearId format'),
  name: z.string().min(2, 'Holiday name must be at least 2 characters').max(100),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid startDate'),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid endDate'),
  type: z.nativeEnum(HolidayType).default(HolidayType.SCHOOL_HOLIDAY),
  description: z.string().max(500).optional(),
});

export const updateHolidaySchema = createHolidaySchema.partial();

export const queryAttendanceSchema = z.object({
  campusId: z.string().regex(objectIdRegex).optional(),
  academicYearId: z.string().regex(objectIdRegex).optional(),
  academicClassId: z.string().regex(objectIdRegex).optional(),
  classId: z.string().regex(objectIdRegex).optional(),
  sectionId: z.string().regex(objectIdRegex).optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  attendanceMode: z.nativeEnum(AttendanceMode).optional(),
  periodId: z.string().regex(objectIdRegex).optional(),
  teacherId: z.string().regex(objectIdRegex).optional(),
  subjectId: z.string().regex(objectIdRegex).optional(),
  status: z.nativeEnum(AttendanceLifecycleStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
