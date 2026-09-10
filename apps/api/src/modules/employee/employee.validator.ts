import { z } from 'zod';
import {
  EmploymentStatus,
  EmploymentType,
  Gender,
  StaffDocumentType,
  UserType,
} from '@edusphere/common';

// ============================================================================
// Department Validation Schemas
// ============================================================================

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'Department code must be at least 2 characters')
    .max(20)
    .regex(
      /^[A-Z0-9_-]+$/,
      'Department code must be uppercase alphanumeric (may include hyphens/underscores)'
    ),
  description: z.string().trim().max(500).optional(),
  headOfDepartmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid employee ID')
    .optional()
    .nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ============================================================================
// Designation Validation Schemas
// ============================================================================

export const createDesignationSchema = z.object({
  name: z.string().trim().min(2, 'Designation name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'Designation code must be at least 2 characters')
    .max(20)
    .regex(
      /^[A-Z0-9_-]+$/,
      'Designation code must be uppercase alphanumeric (may include hyphens/underscores)'
    ),
  departmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid department ID')
    .optional()
    .nullable(),
  description: z.string().trim().max(500).optional(),
  level: z.number().int().min(1).max(20).optional().default(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export const updateDesignationSchema = createDesignationSchema.partial();

// ============================================================================
// Sub-document Schemas
// ============================================================================

const qualificationSchema = z.object({
  degree: z.string().trim().min(1, 'Degree is required').max(100),
  institution: z.string().trim().min(1, 'Institution is required').max(150),
  yearOfPassing: z.number().int().min(1950).max(2100),
  percentageOrCgpa: z.string().trim().max(20).optional(),
});

const previousExperienceSchema = z.object({
  institutionOrCompany: z.string().trim().min(1, 'Institution / Company is required').max(150),
  role: z.string().trim().min(1, 'Role / Designation is required').max(100),
  fromYear: z.number().int().min(1950).max(2100),
  toYear: z.number().int().min(1950).max(2100),
  remarks: z.string().trim().max(500).optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, 'Emergency contact name is required').max(100),
  relationship: z.string().trim().min(1, 'Relationship is required').max(50),
  phone: z.string().trim().min(5, 'Valid phone number required').max(20),
  alternatePhone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(200).optional(),
});

const staffDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Document name is required').max(100),
  documentType: z.nativeEnum(StaffDocumentType),
  fileRecordId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid file record ID')
    .optional(),
  fileUrl: z.string().trim().url('Valid document URL required').optional(),
  uploadedAt: z.string().or(z.date()).optional(),
});

// ============================================================================
// Employee Schemas
// ============================================================================

export const createEmployeeSchema = z.object({
  campusId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid campus ID')
    .optional()
    .nullable(),
  employeeId: z.string().trim().max(30).optional(), // auto-generated if omitted
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  middleName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  displayName: z.string().trim().max(100).optional(),
  gender: z.nativeEnum(Gender),
  dateOfBirth: z.string().or(z.date()),
  bloodGroup: z.string().trim().max(10).optional(),
  nationality: z.string().trim().max(50).optional().default('Indian'),
  profilePhotoUrl: z.string().trim().url('Valid photo URL required').optional(),
  workEmail: z.string().trim().email('Invalid work email address').toLowerCase().optional(),
  workPhone: z.string().trim().max(20).optional(),
  personalEmail: z.string().trim().email('Invalid personal email address').toLowerCase().optional(),
  personalPhone: z.string().trim().max(20).optional(),
  currentAddress: z.string().trim().max(300).optional(),
  permanentAddress: z.string().trim().max(300).optional(),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid department ID'),
  designationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid designation ID'),
  reportingManagerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid reporting manager ID')
    .optional()
    .nullable(),
  employmentType: z.nativeEnum(EmploymentType).optional().default(EmploymentType.FULL_TIME),
  employmentStatus: z.nativeEnum(EmploymentStatus).optional().default(EmploymentStatus.ACTIVE),
  joiningDate: z.string().or(z.date()),
  confirmationDate: z.string().or(z.date()).optional(),
  qualifications: z.array(qualificationSchema).optional().default([]),
  previousExperience: z.array(previousExperienceSchema).optional().default([]),
  emergencyContact: emergencyContactSchema.optional(),
  documents: z.array(staffDocumentSchema).optional().default([]),

  // Account Provisioning options
  provisionUser: z.boolean().optional().default(false),
  userType: z.nativeEnum(UserType).optional().default(UserType.STAFF),
  roles: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID'))
    .optional()
    .default([]),
  initialPassword: z.string().min(8, 'Initial password must be at least 8 characters').optional(),
});

export const updateEmployeeSchema = z.object({
  campusId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid campus ID')
    .optional()
    .nullable(),
  firstName: z.string().trim().min(1).max(50).optional(),
  middleName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  displayName: z.string().trim().max(100).optional(),
  gender: z.nativeEnum(Gender).optional(),
  dateOfBirth: z.string().or(z.date()).optional(),
  bloodGroup: z.string().trim().max(10).optional(),
  nationality: z.string().trim().max(50).optional(),
  profilePhotoUrl: z.string().trim().url().optional().nullable(),
  workEmail: z.string().trim().email().toLowerCase().optional(),
  workPhone: z.string().trim().max(20).optional(),
  personalEmail: z.string().trim().email().toLowerCase().optional(),
  personalPhone: z.string().trim().max(20).optional(),
  currentAddress: z.string().trim().max(300).optional(),
  permanentAddress: z.string().trim().max(300).optional(),
  departmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid department ID')
    .optional(),
  designationId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid designation ID')
    .optional(),
  reportingManagerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid reporting manager ID')
    .optional()
    .nullable(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  joiningDate: z.string().or(z.date()).optional(),
  confirmationDate: z.string().or(z.date()).optional().nullable(),
  qualifications: z.array(qualificationSchema).optional(),
  previousExperience: z.array(previousExperienceSchema).optional(),
  emergencyContact: emergencyContactSchema.optional(),
  documents: z.array(staffDocumentSchema).optional(),
});

export const employeeStatusTransitionSchema = z.object({
  status: z.nativeEnum(EmploymentStatus),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500).optional(),
  effectiveDate: z.string().or(z.date()).optional(),
});

// ============================================================================
// Teacher Profile Schemas
// ============================================================================

export const createTeacherProfileSchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid employee ID'),
  campusId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid campus ID')
    .optional()
    .nullable(),
  teacherCode: z.string().trim().max(20).optional(),
  specialization: z.string().trim().max(200).optional(),
  primarySubject: z.string().trim().min(1, 'Primary subject is required').max(100).optional(),
  secondarySubjects: z.array(z.string().trim().min(1)).optional().default([]),
  teachingExperienceYears: z.number().int().min(0).max(60).optional().default(0),
  isAvailableForTimetable: z.boolean().optional().default(true),
  maxWeeklyPeriods: z.number().int().min(1).max(60).optional().default(30),
  bio: z.string().trim().max(1000).optional(),
});

export const updateTeacherProfileSchema = createTeacherProfileSchema
  .omit({ employeeId: true })
  .partial();

// ============================================================================
// Query & Filter Schemas
// ============================================================================

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  departmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid department ID')
    .optional(),
  designationId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid designation ID')
    .optional(),
  campusId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid campus ID')
    .optional(),
  status: z.nativeEnum(EmploymentStatus).optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  joiningDateFrom: z.string().optional(),
  joiningDateTo: z.string().optional(),
  sortBy: z
    .enum(['employeeId', 'name', 'joiningDate', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const teacherQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  campusId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid campus ID')
    .optional(),
  primarySubject: z.string().trim().optional(),
  isAvailableForTimetable: z.preprocess((val) => {
    if (typeof val === 'string') return val === 'true';
    return val;
  }, z.boolean().optional()),
});
