import { z } from 'zod';
import {
  EmploymentStatus,
  EmploymentType,
  HRDocumentType,
  LeaveDurationType,
  HalfDayPeriod,
  LeaveAccrualMode,
  LeaveStatus,
  SalaryComponentType,
  ComponentCalculationType,
  PayrollPeriodStatus,
  PayrollPaymentStatus,
  PayrollAdjustmentType,
  OvertimeStatus,
  StatutoryType,
  PaymentMethod,
} from '@edusphere/common';

// =========================================================================
// 1. Employee HR & Documents
// =========================================================================
export const updateEmployeeHrSchema = z.object({
  probationStartDate: z.string().datetime().optional().nullable(),
  probationEndDate: z.string().datetime().optional().nullable(),
  confirmationDate: z.string().datetime().optional().nullable(),
  workLocation: z.string().trim().optional().nullable(),
  resignationDate: z.string().datetime().optional().nullable(),
  lastWorkingDate: z.string().datetime().optional().nullable(),
  terminationDate: z.string().datetime().optional().nullable(),
  terminationReason: z.string().trim().optional().nullable(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
});

export const transitionEmployeeStatusSchema = z.object({
  status: z.nativeEnum(EmploymentStatus),
  reason: z.string().trim().optional(),
  effectiveDate: z.string().datetime().optional(),
});

export const addEmployeeDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').trim(),
  documentType: z.nativeEnum(HRDocumentType),
  fileRecordId: z.string().optional(),
  fileUrl: z.string().url().optional(),
  expiryDate: z.string().datetime().optional().nullable(),
});

// =========================================================================
// 2. Leave Management
// =========================================================================
export const createLeaveTypeSchema = z.object({
  campusId: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  code: z.string().min(2, 'Code must be at least 2 characters').trim().toUpperCase(),
  description: z.string().trim().optional(),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  requiresDocument: z.boolean().default(false),
  maximumDays: z.number().min(0, 'Maximum days must be non-negative'),
  minimumNoticeDays: z.number().min(0).default(0),
  carryForward: z.boolean().default(false),
  maxCarryForwardDays: z.number().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

export const createLeavePolicySchema = z.object({
  campusId: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  code: z.string().min(2, 'Code must be at least 2 characters').trim().toUpperCase(),
  description: z.string().trim().optional(),
  leaveTypeId: z.string().min(1, 'Leave type ID is required'),
  annualAllocation: z.number().min(0, 'Annual allocation must be non-negative'),
  accrualMode: z.nativeEnum(LeaveAccrualMode).default(LeaveAccrualMode.ANNUAL),
  carryForward: z.boolean().default(false),
  maxCarryForwardDays: z.number().min(0).default(0),
  allowHalfDay: z.boolean().default(true),
  probationAllowed: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateLeavePolicySchema = createLeavePolicySchema.partial();

export const applyLeaveSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type ID is required'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  durationType: z.nativeEnum(LeaveDurationType).default(LeaveDurationType.FULL_DAY),
  halfDayPeriod: z.nativeEnum(HalfDayPeriod).optional(),
  reason: z.string().min(3, 'Reason must be at least 3 characters').trim(),
  attachmentFileRecordId: z.string().optional(),
  attachmentUrl: z.string().url().optional(),
});

export const reviewLeaveSchema = z.object({
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  remarks: z.string().trim().optional(),
});

// =========================================================================
// 3. Salary Components & Structures
// =========================================================================
export const createSalaryComponentSchema = z.object({
  campusId: z.string().optional(),
  name: z.string().min(2, 'Name is required').trim(),
  code: z.string().min(2, 'Code is required').trim().toUpperCase(),
  type: z.nativeEnum(SalaryComponentType),
  calculationType: z.nativeEnum(ComponentCalculationType).default(ComponentCalculationType.FIXED),
  amountOrPercentage: z.number().min(0, 'Value must be non-negative'),
  baseComponentCode: z.string().trim().toUpperCase().optional(),
  isTaxable: z.boolean().default(true),
  isStatutory: z.boolean().default(false),
  statutoryType: z.nativeEnum(StatutoryType).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateSalaryComponentSchema = createSalaryComponentSchema.partial();

export const salaryStructureComponentSchema = z.object({
  componentId: z.string().min(1, 'Component ID is required'),
  componentCode: z.string().trim().toUpperCase(),
  name: z.string().trim(),
  type: z.nativeEnum(SalaryComponentType),
  calculationType: z.nativeEnum(ComponentCalculationType),
  amountOrPercentage: z.number().min(0),
  baseComponentCode: z.string().trim().toUpperCase().optional(),
  isStatutory: z.boolean().optional(),
});

export const createSalaryStructureSchema = z.object({
  campusId: z.string().optional(),
  name: z.string().min(2, 'Name is required').trim(),
  code: z.string().min(2, 'Code is required').trim().toUpperCase(),
  description: z.string().trim().optional(),
  components: z.array(salaryStructureComponentSchema).min(1, 'At least one salary component is required'),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
});

export const updateSalaryStructureSchema = createSalaryStructureSchema.partial();

export const versionSalaryStructureSchema = z.object({
  name: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  components: z.array(salaryStructureComponentSchema).min(1, 'At least one salary component is required'),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
});

export const assignSalarySchema = z.object({
  salaryStructureId: z.string().min(1, 'Salary structure ID is required'),
  baseSalary: z.number().int().min(0, 'Base salary must be non-negative integer minor units'),
  currency: z.string().min(3).max(3).default('USD'),
  customComponents: z.array(
    z.object({
      name: z.string().trim(),
      code: z.string().trim().toUpperCase(),
      type: z.nativeEnum(SalaryComponentType),
      amount: z.number().int().min(0),
    })
  ).default([]),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
});

// =========================================================================
// 4. Payroll Periods & Runs
// =========================================================================
export const createPayrollPeriodSchema = z.object({
  campusId: z.string().optional(),
  name: z.string().min(2, 'Name is required').trim(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  workingDays: z.number().int().min(1).max(31),
});

export const calculatePayrollSchema = z.object({
  payrollPeriodId: z.string().min(1, 'Payroll period ID is required'),
  employeeIds: z.array(z.string()).optional(), // If empty, calculates for all active employees
});

export const processPayrollSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  transactionReference: z.string().trim().optional(),
});

export const createPayrollAdjustmentSchema = z.object({
  payrollPeriodId: z.string().min(1, 'Payroll period ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  type: z.nativeEnum(PayrollAdjustmentType),
  amount: z.number().int().min(1, 'Amount must be positive integer minor units'),
  reason: z.string().min(3, 'Reason is required').trim(),
});

export const reviewPayrollAdjustmentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const recordOvertimeSchema = z.object({
  campusId: z.string().optional(),
  payrollPeriodId: z.string().optional(),
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.string().datetime(),
  hours: z.number().min(0.5).max(24),
  hourlyRate: z.number().int().min(0),
  reason: z.string().trim().optional(),
});

export const reviewOvertimeSchema = z.object({
  status: z.enum([OvertimeStatus.APPROVED, OvertimeStatus.REJECTED]),
});

export const createStatutoryRuleSchema = z.object({
  name: z.string().min(2, 'Name is required').trim(),
  code: z.string().min(2, 'Code is required').trim().toUpperCase(),
  statutoryType: z.nativeEnum(StatutoryType),
  employeePercentage: z.number().min(0).max(100),
  employerPercentage: z.number().min(0).max(100).default(0),
  wageCap: z.number().int().min(0).optional(),
  minWageThreshold: z.number().int().min(0).optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
});

export const updateStatutoryRuleSchema = createStatutoryRuleSchema.partial();
