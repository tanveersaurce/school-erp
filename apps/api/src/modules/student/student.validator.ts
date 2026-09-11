import { z } from 'zod';
import {
  StudentStatus,
  Gender,
  GuardianRelationType,
  StudentDocumentType,
  DocumentVerificationStatus,
  AdmissionType,
} from '@edusphere/common';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoId = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

export const structuredAddressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required').trim(),
  addressLine2: z.string().trim().optional(),
  city: z.string().min(1, 'City is required').trim(),
  state: z.string().min(1, 'State is required').trim(),
  postalCode: z.string().min(1, 'Postal code is required').trim(),
  country: z.string().min(1, 'Country is required').trim(),
});

export const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').trim(),
  relationship: z.string().min(1, 'Relationship is required').trim(),
  phone: z.string().min(5, 'Valid phone number is required').trim(),
  alternatePhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  priority: z.number().int().min(1).default(1),
});

export const previousSchoolDetailsSchema = z.object({
  schoolName: z.string().trim().optional(),
  lastClassPassed: z.string().trim().optional(),
  tcNumber: z.string().trim().optional(),
  percentageObtained: z.number().min(0).max(100).optional(),
});

export const medicalInfoSchema = z.object({
  allergies: z.array(z.string().trim()).default([]),
  chronicConditions: z.array(z.string().trim()).default([]),
  physicianName: z.string().trim().optional(),
  physicianContact: z.string().trim().optional(),
  medicalNotes: z.string().trim().optional(),
});

// =========================================================================
// 1. Student Schemas
// =========================================================================
export const createStudentSchema = z.object({
  admissionNumber: z.string().trim().toUpperCase().optional(),
  studentId: z.string().trim().toUpperCase().optional(),
  campusId: mongoId.optional(),
  currentAcademicYearId: mongoId.optional(),
  admissionDate: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
  admissionType: z.nativeEnum(AdmissionType).default(AdmissionType.REGULAR),
  studentCategory: z.string().trim().optional(),
  personalDetails: z.object({
    firstName: z.string().min(1, 'First name is required').trim(),
    middleName: z.string().trim().optional(),
    lastName: z.string().min(1, 'Last name is required').trim(),
    displayName: z.string().trim().optional(),
    dateOfBirth: z.string().datetime().or(z.string().date()).or(z.date()),
    gender: z.nativeEnum(Gender),
    bloodGroup: z.string().trim().optional(),
    nationality: z.string().trim().default('Indian'),
    religion: z.string().trim().optional(),
    category: z.string().trim().optional(),
    profilePhoto: z.string().url().trim().optional(),
  }),
  contactDetails: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim().optional(),
    phone: z.string().trim().optional(),
    alternatePhone: z.string().trim().optional(),
    emergencyPhone: z.string().trim().optional(),
    currentAddress: z.union([
      structuredAddressSchema,
      z.string().min(1, 'Current address is required').trim(),
    ]),
    permanentAddress: z.union([structuredAddressSchema, z.string().trim()]).optional(),
    emergencyContacts: z.array(emergencyContactSchema).default([]),
  }),
  previousSchoolDetails: previousSchoolDetailsSchema.optional(),
  medicalInfo: medicalInfoSchema.optional(),
  initialEnrollment: z
    .object({
      academicYearId: mongoId,
      campusId: mongoId.optional(),
      classId: mongoId.optional(),
      sectionId: mongoId.optional(),
      rollNumber: z.number().int().min(1).optional(),
      startDate: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
    })
    .optional(),
  primaryGuardian: z
    .object({
      guardianId: mongoId.optional(), // If linking existing guardian
      firstName: z.string().trim().optional(),
      lastName: z.string().trim().optional(),
      email: z.string().email().toLowerCase().trim().optional(),
      phone: z.string().trim().optional(),
      relationshipType: z.nativeEnum(GuardianRelationType),
      isPrimaryContact: z.boolean().default(true),
      isEmergencyContact: z.boolean().default(true),
      canPickup: z.boolean().default(false),
    })
    .optional(),
  provisionUser: z.boolean().default(false),
  userPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  sendUserInvitation: z.boolean().default(false),
});

export const updateStudentSchema = z.object({
  campusId: mongoId.optional(),
  currentAcademicYearId: mongoId.optional(),
  studentCategory: z.string().trim().optional(),
  personalDetails: z
    .object({
      firstName: z.string().min(1).trim().optional(),
      middleName: z.string().trim().optional(),
      lastName: z.string().min(1).trim().optional(),
      displayName: z.string().trim().optional(),
      dateOfBirth: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
      gender: z.nativeEnum(Gender).optional(),
      bloodGroup: z.string().trim().optional(),
      nationality: z.string().trim().optional(),
      religion: z.string().trim().optional(),
      category: z.string().trim().optional(),
      profilePhoto: z.string().url().trim().optional(),
    })
    .optional(),
  contactDetails: z
    .object({
      email: z.string().email().toLowerCase().trim().optional(),
      phone: z.string().trim().optional(),
      alternatePhone: z.string().trim().optional(),
      emergencyPhone: z.string().trim().optional(),
      currentAddress: z.union([structuredAddressSchema, z.string().trim()]).optional(),
      permanentAddress: z.union([structuredAddressSchema, z.string().trim()]).optional(),
      emergencyContacts: z.array(emergencyContactSchema).optional(),
    })
    .optional(),
  previousSchoolDetails: previousSchoolDetailsSchema.optional(),
  medicalInfo: medicalInfoSchema.optional(),
});

export const studentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  campusId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  status: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  admissionType: z.string().trim().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const studentStatusTransitionSchema = z.object({
  status: z.nativeEnum(StudentStatus),
  reason: z.string().trim().optional(),
});

// =========================================================================
// 2. Guardian Schemas
// =========================================================================
export const createGuardianSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  middleName: z.string().trim().optional(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  displayName: z.string().trim().optional(),
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  phone: z.string().min(5, 'Valid phone number is required').trim(),
  alternatePhone: z.string().trim().optional(),
  address: z.union([structuredAddressSchema, z.string().min(1, 'Address is required').trim()]),
  occupation: z.string().trim().optional(),
  annualIncome: z.number().min(0).optional(),
  profilePhoto: z.string().url().trim().optional(),
  communicationPreferences: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(true),
      whatsapp: z.boolean().default(false),
    })
    .optional(),
  provisionUser: z.boolean().default(false),
  userPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  sendUserInvitation: z.boolean().default(false),
});

export const updateGuardianSchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  middleName: z.string().trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  displayName: z.string().trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().min(5).trim().optional(),
  alternatePhone: z.string().trim().optional(),
  address: z.union([structuredAddressSchema, z.string().trim()]).optional(),
  occupation: z.string().trim().optional(),
  annualIncome: z.number().min(0).optional(),
  profilePhoto: z.string().url().trim().optional(),
  communicationPreferences: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
    })
    .optional(),
});

export const guardianFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =========================================================================
// 3. Student-Guardian Relationship Schemas
// =========================================================================
export const createRelationSchema = z.object({
  guardianId: mongoId,
  relationshipType: z.nativeEnum(GuardianRelationType),
  isPrimaryContact: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  canPickup: z.boolean().default(false),
  canAccessAcademicInformation: z.boolean().default(true),
  canAccessFinancialInformation: z.boolean().default(true),
  canReceiveNotifications: z.boolean().default(true),
  custodyRestrictions: z.string().trim().optional(),
});

export const updateRelationSchema = z.object({
  relationshipType: z.nativeEnum(GuardianRelationType).optional(),
  isPrimaryContact: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  canPickup: z.boolean().optional(),
  canAccessAcademicInformation: z.boolean().optional(),
  canAccessFinancialInformation: z.boolean().optional(),
  canReceiveNotifications: z.boolean().optional(),
  custodyRestrictions: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// =========================================================================
// 4. Enrollment Schemas
// =========================================================================
export const createEnrollmentSchema = z.object({
  studentId: mongoId,
  academicYearId: mongoId,
  campusId: mongoId.optional(),
  classId: mongoId.optional(),
  sectionId: mongoId.optional(),
  rollNumber: z.number().int().min(1).optional(),
  status: z
    .enum(['ENROLLED', 'PROMOTED', 'RETAINED', 'TRANSFERRED', 'WITHDRAWN'])
    .default('ENROLLED'),
  startDate: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
});

export const updateEnrollmentSchema = z.object({
  campusId: mongoId.optional(),
  classId: mongoId.optional(),
  sectionId: mongoId.optional(),
  rollNumber: z.number().int().min(1).optional(),
  status: z.enum(['ENROLLED', 'PROMOTED', 'RETAINED', 'TRANSFERRED', 'WITHDRAWN']).optional(),
  endDate: z.string().datetime().or(z.string().date()).or(z.date()).optional(),
});

export const enrollmentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: mongoId.optional(),
  academicYearId: mongoId.optional(),
  campusId: mongoId.optional(),
  status: z.string().trim().optional(),
});

// =========================================================================
// 5. Document Schemas
// =========================================================================
export const createDocumentSchema = z.object({
  documentType: z.nativeEnum(StudentDocumentType),
  title: z.string().min(1, 'Title is required').trim(),
  fileUrl: z.string().url('Valid file URL is required').trim(),
});

export const verifyDocumentSchema = z
  .object({
    verificationStatus: z.enum([
      DocumentVerificationStatus.VERIFIED,
      DocumentVerificationStatus.REJECTED,
    ]),
    rejectionReason: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.verificationStatus !== DocumentVerificationStatus.REJECTED || !!data.rejectionReason,
    {
      message: 'Rejection reason is required when rejecting a document',
      path: ['rejectionReason'],
    }
  );
