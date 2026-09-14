import { z } from 'zod';
import {
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentTargetType,
  AssignmentSubmissionStatus,
} from '@edusphere/common';

// Helper regex for ObjectId
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Allowed MIME types for educational attachments
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
];

export const attachmentSchema = z.object({
  id: z.string().min(1, 'Attachment ID is required'),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().min(1, 'File URL is required'),
  fileType: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type.toLowerCase()) || type.startsWith('image/'),
    { message: 'Unsupported file MIME type. Supported: PDF, Word, Excel, PowerPoint, Text, Images, ZIP.' }
  ),
  fileSize: z
    .number()
    .positive()
    .max(15 * 1024 * 1024, 'Maximum attachment size is 15MB.'),
  uploadedAt: z.string().or(z.date()).optional(),
});

export const createAssignmentSchema = z.object({
  academicClassId: z.string().regex(objectIdRegex, 'Invalid Academic Class ID'),
  subjectId: z.string().regex(objectIdRegex, 'Invalid Subject ID'),
  teacherId: z.string().regex(objectIdRegex, 'Invalid Teacher ID').optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000),
  instructions: z.string().trim().max(5000).optional(),
  assignmentType: z.nativeEnum(AssignmentType).default(AssignmentType.HOMEWORK),
  assignedDate: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  dueTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Due time must be in HH:mm 24-hour format')
    .default('23:59'),
  maxScore: z.number().min(1, 'Max score must be at least 1').max(1000).default(100),
  submissionType: z.nativeEnum(SubmissionType).default(SubmissionType.BOTH),
  allowLateSubmission: z.boolean().default(false),
  latePolicy: z
    .object({
      deductionPercentage: z.number().min(0).max(100).optional(),
      maxLateDays: z.number().min(0).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
  targetType: z.nativeEnum(AssignmentTargetType).default(AssignmentTargetType.ALL),
  targetStudentIds: z.array(z.string().regex(objectIdRegex)).optional(),
  attachments: z.array(attachmentSchema).max(5, 'Maximum 5 attachments allowed').optional(),
  publishImmediately: z.boolean().default(false),
});

export const updateAssignmentSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(5).max(5000).optional(),
  instructions: z.string().trim().max(5000).optional(),
  assignmentType: z.nativeEnum(AssignmentType).optional(),
  dueDate: z.string().optional(),
  dueTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Due time must be in HH:mm 24-hour format')
    .optional(),
  maxScore: z.number().min(1).max(1000).optional(),
  submissionType: z.nativeEnum(SubmissionType).optional(),
  allowLateSubmission: z.boolean().optional(),
  latePolicy: z
    .object({
      deductionPercentage: z.number().min(0).max(100).optional(),
      maxLateDays: z.number().min(0).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
  targetType: z.nativeEnum(AssignmentTargetType).optional(),
  targetStudentIds: z.array(z.string().regex(objectIdRegex)).optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
});

export const draftSubmissionSchema = z.object({
  textResponse: z.string().max(10000).optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
});

export const submitAssignmentSchema = z.object({
  textResponse: z.string().max(10000).optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0, 'Score cannot be negative'),
  feedback: z.string().trim().max(2000).optional(),
  feedbackAttachments: z.array(attachmentSchema).max(3).optional(),
});

export const returnSubmissionSchema = z.object({
  feedback: z.string().trim().min(1, 'Feedback is required when returning a submission').max(2000),
});

export const queryAssignmentSchema = z.object({
  academicYearId: z.string().regex(objectIdRegex).optional(),
  campusId: z.string().regex(objectIdRegex).optional(),
  academicClassId: z.string().regex(objectIdRegex).optional(),
  subjectId: z.string().regex(objectIdRegex).optional(),
  teacherId: z.string().regex(objectIdRegex).optional(),
  assignmentType: z.nativeEnum(AssignmentType).optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
  search: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('dueAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const querySubmissionSchema = z.object({
  status: z.nativeEnum(AssignmentSubmissionStatus).optional(),
  studentId: z.string().regex(objectIdRegex).optional(),
  isGraded: z.coerce.boolean().optional(),
  isLate: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
