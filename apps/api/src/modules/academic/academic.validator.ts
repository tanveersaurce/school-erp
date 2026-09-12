import { z } from 'zod';
import {
  EducationLevel,
  AcademicStatus,
  SubjectCategory,
  TeacherAssignmentStatus,
} from '@edusphere/common';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoId = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

// =========================================================================
// 1. Class / Grade Level Validation Schemas
// =========================================================================
export const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(100).trim(),
  shortName: z.string().max(20).trim().optional(),
  code: z.string().min(1, 'Class code is required').max(20).trim().toUpperCase(),
  order: z.number().int().min(0, 'Order must be non-negative'),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  status: z.nativeEnum(AcademicStatus).default(AcademicStatus.ACTIVE),
});

export const updateClassSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  shortName: z.string().max(20).trim().optional(),
  code: z.string().min(1).max(20).trim().toUpperCase().optional(),
  order: z.number().int().min(0).optional(),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

export const classFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  status: z.string().optional(),
});

// =========================================================================
// 2. Section Validation Schemas
// =========================================================================
export const createSectionSchema = z.object({
  classId: mongoId,
  name: z.string().min(1, 'Section name is required').max(50).trim(),
  code: z.string().max(20).trim().toUpperCase().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(500).default(40),
  room: z.string().max(50).trim().optional(),
  classTeacherId: mongoId.optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  status: z.nativeEnum(AcademicStatus).default(AcademicStatus.ACTIVE),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  code: z.string().max(20).trim().toUpperCase().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().max(50).trim().optional(),
  classTeacherId: mongoId.nullable().optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

export const sectionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  classId: mongoId.optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  status: z.string().optional(),
});

// =========================================================================
// 3. Academic Class (Offering) Validation Schemas
// =========================================================================
export const createAcademicClassSchema = z.object({
  campusId: mongoId,
  academicYearId: mongoId,
  classId: mongoId,
  sectionId: mongoId,
  classTeacherId: mongoId.optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(500).default(40),
  room: z.string().max(50).trim().optional(),
  status: z.nativeEnum(AcademicStatus).default(AcademicStatus.ACTIVE),
});

export const updateAcademicClassSchema = z.object({
  classTeacherId: mongoId.nullable().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().max(50).trim().optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

export const academicClassFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  classId: mongoId.optional(),
  sectionId: mongoId.optional(),
  classTeacherId: mongoId.optional(),
  status: z.string().optional(),
});

// =========================================================================
// 4. Subject Validation Schemas
// =========================================================================
export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100).trim(),
  shortName: z.string().max(20).trim().optional(),
  code: z.string().min(1, 'Subject code is required').max(20).trim().toUpperCase(),
  type: z.enum(['CORE', 'ELECTIVE', 'LAB', 'VOCATIONAL']).default('CORE'),
  category: z.nativeEnum(SubjectCategory).default(SubjectCategory.CORE),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  creditHours: z.number().min(0).default(1),
  sequence: z.number().int().min(0).default(0),
  status: z.nativeEnum(AcademicStatus).default(AcademicStatus.ACTIVE),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  shortName: z.string().max(20).trim().optional(),
  code: z.string().min(1).max(20).trim().toUpperCase().optional(),
  type: z.enum(['CORE', 'ELECTIVE', 'LAB', 'VOCATIONAL']).optional(),
  category: z.nativeEnum(SubjectCategory).optional(),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  creditHours: z.number().min(0).optional(),
  sequence: z.number().int().min(0).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

export const subjectFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  educationLevel: z.string().optional(),
  status: z.string().optional(),
});

// =========================================================================
// 5. Class ↔ Subject Curriculum Mapping Schemas
// =========================================================================
export const createClassSubjectSchema = z.object({
  academicYearId: mongoId,
  classId: mongoId,
  subjectId: mongoId,
  campusId: mongoId.optional(),
  isOptional: z.boolean().default(false),
  creditHours: z.number().min(0).optional(),
  sequence: z.number().int().min(0).default(0),
});

export const updateClassSubjectSchema = z.object({
  isOptional: z.boolean().optional(),
  creditHours: z.number().min(0).optional(),
  sequence: z.number().int().min(0).optional(),
});

// =========================================================================
// 6. Teacher Subject Assignment Schemas
// =========================================================================
export const createTeacherAssignmentSchema = z.object({
  academicYearId: mongoId,
  teacherId: mongoId,
  subjectId: mongoId,
  classId: mongoId,
  sectionId: mongoId,
  academicClassId: mongoId.optional(),
  campusId: mongoId.optional(),
  status: z.nativeEnum(TeacherAssignmentStatus).default(TeacherAssignmentStatus.ACTIVE),
  effectiveFrom: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
  effectiveTo: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
});

export const updateTeacherAssignmentSchema = z.object({
  status: z.nativeEnum(TeacherAssignmentStatus).optional(),
  effectiveTo: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
});

export const teacherAssignmentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  teacherId: mongoId.optional(),
  subjectId: mongoId.optional(),
  classId: mongoId.optional(),
  sectionId: mongoId.optional(),
  academicClassId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  campusId: mongoId.optional(),
  status: z.string().optional(),
});

// =========================================================================
// 7. Academic Enrollment & Roll Number Schemas
// =========================================================================
export const enrollStudentAcademicSchema = z.object({
  studentId: mongoId,
  academicClassId: mongoId,
  rollNumber: z.number().int().min(1).max(9999).optional(),
  startDate: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
});

export const assignRollNumberSchema = z.object({
  rollNumber: z.number().int().min(1, 'Roll number must be at least 1').max(9999),
});

export const classTeacherAssignmentSchema = z.object({
  classTeacherId: mongoId.nullable(),
});
