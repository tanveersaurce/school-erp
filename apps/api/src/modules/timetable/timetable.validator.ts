import { z } from 'zod';
import {
  PeriodType,
  AcademicStatus,
  RoomType,
  TimetableStatus,
  TimetableEntryStatus,
} from '@edusphere/common';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId format');
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

// =========================================================================
// 1. Period Validators
// =========================================================================
export const createPeriodSchema = z.object({
  campusId: objectIdSchema.optional(),
  name: z.string().trim().min(2, 'Period name must be at least 2 characters').max(60),
  code: z.string().trim().min(1).max(20),
  sequence: z.coerce.number().int().min(1, 'Sequence must be at least 1'),
  startTime: z.string().regex(timeFormatRegex, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(timeFormatRegex, 'End time must be in HH:mm format'),
  duration: z.coerce.number().int().min(1).max(300).optional(),
  type: z.nativeEnum(PeriodType).default(PeriodType.TEACHING),
  status: z.nativeEnum(AcademicStatus).default(AcademicStatus.ACTIVE),
}).refine(
  (data) => {
    return data.startTime < data.endTime;
  },
  {
    message: 'Start time must be earlier than end time',
    path: ['endTime'],
  }
);

export const updatePeriodSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  code: z.string().trim().min(1).max(20).optional(),
  sequence: z.coerce.number().int().min(1).optional(),
  startTime: z.string().regex(timeFormatRegex, 'Start time must be in HH:mm format').optional(),
  endTime: z.string().regex(timeFormatRegex, 'End time must be in HH:mm format').optional(),
  duration: z.coerce.number().int().min(1).max(300).optional(),
  type: z.nativeEnum(PeriodType).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true;
  },
  {
    message: 'Start time must be earlier than end time',
    path: ['endTime'],
  }
);

export const periodFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  campusId: objectIdSchema.optional(),
  type: z.nativeEnum(PeriodType).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

// =========================================================================
// 2. Classroom Validators
// =========================================================================
export const createClassroomSchema = z.object({
  campusId: objectIdSchema,
  name: z.string().trim().min(2, 'Room name must be at least 2 characters').max(60),
  code: z.string().trim().min(1).max(20),
  roomNumber: z.string().trim().max(30).optional(),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(1000).default(40),
  roomType: z.nativeEnum(RoomType).default(RoomType.CLASSROOM),
  status: z.nativeEnum(AcademicStatus).default(AcademicStatus.ACTIVE),
});

export const updateClassroomSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  code: z.string().trim().min(1).max(20).optional(),
  roomNumber: z.string().trim().max(30).optional(),
  capacity: z.coerce.number().int().min(1).max(1000).optional(),
  roomType: z.nativeEnum(RoomType).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

export const classroomFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  campusId: objectIdSchema.optional(),
  roomType: z.nativeEnum(RoomType).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

// =========================================================================
// 3. Timetable Master Validators
// =========================================================================
export const createTimetableSchema = z.object({
  campusId: objectIdSchema,
  academicYearId: objectIdSchema,
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().max(30).optional(),
  description: z.string().trim().max(500).optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
});

export const updateTimetableSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().max(30).optional(),
  description: z.string().trim().max(500).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
});

export const cloneTimetableSchema = z.object({
  name: z.string().trim().min(2).max(100),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
});

export const timetableFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  campusId: objectIdSchema.optional(),
  academicYearId: objectIdSchema.optional(),
  status: z.nativeEnum(TimetableStatus).optional(),
  isCurrent: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
});

// =========================================================================
// 4. Timetable Entry Validators
// =========================================================================
export const createTimetableEntrySchema = z.object({
  academicClassId: objectIdSchema,
  dayOfWeek: z.coerce.number().int().min(1).max(7), // 1 = Monday ... 7 = Sunday
  periodId: objectIdSchema,
  subjectId: objectIdSchema,
  teacherId: objectIdSchema,
  roomId: objectIdSchema.optional().nullable(),
});

export const updateTimetableEntrySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
  periodId: objectIdSchema.optional(),
  subjectId: objectIdSchema.optional(),
  teacherId: objectIdSchema.optional(),
  roomId: objectIdSchema.optional().nullable(),
  status: z.nativeEnum(TimetableEntryStatus).optional(),
  substituteTeacherId: objectIdSchema.optional().nullable(),
  substitutionNote: z.string().trim().max(250).optional(),
});

export const timetableEntryFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  timetableId: objectIdSchema.optional(),
  academicClassId: objectIdSchema.optional(),
  teacherId: objectIdSchema.optional(),
  roomId: objectIdSchema.optional(),
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
  periodId: objectIdSchema.optional(),
  subjectId: objectIdSchema.optional(),
});

export const validateCandidateSlotSchema = z.object({
  entryId: objectIdSchema.optional(),
  academicClassId: objectIdSchema,
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  periodId: objectIdSchema,
  subjectId: objectIdSchema,
  teacherId: objectIdSchema,
  roomId: objectIdSchema.optional().nullable(),
});
