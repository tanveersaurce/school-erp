import { z } from 'zod';
import { ExamStatus, MarkStatus, CorrectionStatus } from '@edusphere/common';

export const createGradingSchemeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  isDefault: z.boolean().optional().default(false),
  grades: z
    .array(
      z.object({
        grade: z.string().min(1, 'Grade title is required'),
        minPercentage: z.number().min(0).max(100),
        maxPercentage: z.number().min(0).max(100),
        gradePoint: z.number().min(0).optional(),
        description: z.string().optional(),
        isPassing: z.boolean().default(true),
      })
    )
    .min(1, 'At least one grade threshold is required'),
});

export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  name: z.string().optional(),
  code: z.string().min(1, 'Code is required').max(50),
  description: z.string().optional(),
  examType: z.string().min(1, 'Exam type is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  campusId: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  academicClassIds: z.array(z.string()).optional().default([]),
  gradingSchemeId: z.string().optional(),
  passingPercentage: z.number().min(0).max(100).optional().default(33),
  weightagePercentage: z.number().min(0).max(100).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const updateExamSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  name: z.string().optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  examType: z.string().optional(),
  academicYearId: z.string().optional(),
  campusId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  academicClassIds: z.array(z.string()).optional(),
  gradingSchemeId: z.string().optional(),
  passingPercentage: z.number().min(0).max(100).optional(),
  weightagePercentage: z.number().min(0).max(100).optional(),
});

export const examStatusTransitionSchema = z.object({
  status: z.nativeEnum(ExamStatus),
});

export const createExamScheduleSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  academicClassId: z.string().min(1, 'Academic class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  examDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM format'),
  durationMinutes: z.number().positive().optional(),
  room: z.string().optional(),
  roomId: z.string().optional(),
  invigilatorId: z.string().optional(),
  maxMarks: z.number().positive('Max marks must be greater than 0').default(100),
  passMarks: z.number().min(0, 'Pass marks cannot be negative').default(33),
}).refine((data) => data.passMarks <= data.maxMarks, {
  message: 'Pass marks cannot exceed maximum marks',
  path: ['passMarks'],
});

export const checkScheduleConflictSchema = z.object({
  examId: z.string().min(1),
  academicClassId: z.string().min(1),
  subjectId: z.string().min(1),
  examDate: z.string().or(z.date()),
  startTime: z.string(),
  endTime: z.string(),
  roomId: z.string().optional(),
  invigilatorId: z.string().optional(),
  excludeScheduleId: z.string().optional(),
});

export const bulkMarksEntrySchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  academicClassId: z.string().min(1, 'Academic class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  maxMarks: z.number().positive().default(100),
  passMarks: z.number().min(0).default(33),
  entries: z.array(
    z.object({
      studentId: z.string().min(1, 'Student ID is required'),
      marksObtained: z.number().min(0).nullable().optional(),
      status: z.nativeEnum(MarkStatus).optional().default(MarkStatus.ENTERED),
      remarks: z.string().optional(),
    })
  ).min(1, 'Entries array cannot be empty'),
});

export const markCorrectionRequestSchema = z.object({
  newMarks: z.number().min(0).nullable().optional(),
  newStatus: z.nativeEnum(MarkStatus),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').max(500),
});

export const reviewExamCorrectionSchema = z.object({
  status: z.enum([CorrectionStatus.APPROVED, CorrectionStatus.REJECTED]),
  reviewRemarks: z.string().optional(),
});

export const calculateResultsSchema = z.object({
  academicClassId: z.string().optional(),
});
