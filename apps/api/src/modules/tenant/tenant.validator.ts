import { z } from 'zod';
import {
  TenantPlan,
  TenantBillingStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  WeekDay,
} from '@edusphere/common';

export const tenantOnboardSchema = z.object({
  tenantName: z.string().trim().min(3).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
  schoolName: z.string().trim().min(3).max(150),
  schoolCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'School code must be alphanumeric'),
  affiliationBoard: z.string().trim().min(2).max(50),
  campusName: z.string().trim().min(2).max(100),
  campusCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Campus code must be alphanumeric'),
  academicYearName: z.string().trim().min(4).max(20),
  academicYearStartDate: z.string().datetime(),
  academicYearEndDate: z.string().datetime(),
  adminEmail: z.string().email().trim().toLowerCase(),
  adminPassword: z.string().min(8).max(100),
  adminFirstName: z.string().trim().min(2).max(50),
  adminLastName: z.string().trim().min(2).max(50),
  adminPhone: z.string().trim().optional(),
});

export const createTenantSchema = z.object({
  name: z.string().trim().min(3).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
  customDomain: z.string().trim().toLowerCase().optional(),
  plan: z.nativeEnum(TenantPlan).optional(),
  features: z
    .object({
      maxStudents: z.number().int().positive().optional(),
      modulesEnabled: z.array(z.string()).optional(),
      customBranding: z.boolean().optional(),
    })
    .optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  customDomain: z.string().trim().toLowerCase().optional(),
  plan: z.nativeEnum(TenantPlan).optional(),
  billingStatus: z.nativeEnum(TenantBillingStatus).optional(),
  status: z.nativeEnum(TenantStatus).optional(),
  features: z
    .object({
      maxStudents: z.number().int().positive().optional(),
      modulesEnabled: z.array(z.string()).optional(),
      customBranding: z.boolean().optional(),
    })
    .optional(),
});

export const updateSchoolProfileSchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  legalName: z.string().trim().max(150).optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  affiliationBoard: z.string().trim().min(2).max(50).optional(),
  registrationNumber: z.string().trim().max(50).optional(),
  establishedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  contact: z
    .object({
      email: z.string().email().optional(),
      secondaryEmail: z.string().email().optional(),
      phone: z.string().trim().min(5).max(20).optional(),
      emergencyPhone: z.string().trim().min(5).max(20).optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  address: z
    .object({
      street: z.string().trim().optional(),
      area: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
  timezone: z.string().trim().optional(),
  currency: z.string().trim().min(3).max(5).optional(),
});

export const updateSchoolSettingsSchema = z.object({
  general: z
    .object({
      dateFormat: z.string().trim().optional(),
      timeFormat: z.enum(['12H', '24H']).optional(),
      weekStartDay: z.nativeEnum(WeekDay).optional(),
      defaultLanguage: z.string().trim().optional(),
    })
    .optional(),
  workingDays: z.array(z.nativeEnum(WeekDay)).min(1).optional(),
  numbering: z
    .object({
      admissionNumberPrefix: z.string().trim().max(10).optional(),
      admissionNumberDigits: z.number().int().min(3).max(10).optional(),
      invoicePrefix: z.string().trim().max(10).optional(),
      receiptPrefix: z.string().trim().max(10).optional(),
      employeeIdPrefix: z.string().trim().max(10).optional(),
    })
    .optional(),
});

export const updateSchoolBrandingSchema = z.object({
  logoUrl: z.string().url().or(z.string().trim()).optional(),
  faviconUrl: z.string().url().or(z.string().trim()).optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color')
    .optional(),
  displayName: z.string().trim().max(100).optional(),
  reportCardHeader: z.string().trim().max(200).optional(),
  emailSignature: z.string().trim().max(500).optional(),
});

export const createCampusSchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Campus code must be alphanumeric'),
  address: z.object({
    street: z.string().trim().min(3),
    area: z.string().trim().optional(),
    city: z.string().trim().min(2),
    state: z.string().trim().min(2),
    postalCode: z.string().trim().min(3),
    country: z.string().trim().default('India'),
  }),
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  status: z.nativeEnum(CampusStatus).optional(),
  isMain: z.boolean().optional(),
});

export const updateCampusSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  address: z
    .object({
      street: z.string().trim().optional(),
      area: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  status: z.nativeEnum(CampusStatus).optional(),
  isMain: z.boolean().optional(),
});

export const createAcademicYearSchema = z
  .object({
    schoolId: z.string().optional(),
    campusId: z.string().optional(),
    name: z.string().trim().min(4).max(20),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.nativeEnum(AcademicYearStatus).optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Start date must be strictly before end date',
    path: ['startDate'],
  });

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(4).max(20).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.nativeEnum(AcademicYearStatus).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be strictly before end date',
      path: ['startDate'],
    }
  );
