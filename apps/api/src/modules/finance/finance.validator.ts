import { z } from 'zod';
import {
  FeeCategoryType,
  FeeFrequency,
  DiscountType,
  LateFeeType,
  InvoiceStatus,
  PaymentMethod,
  PaymentGatewayProvider,
} from '@edusphere/common';

// =========================================================================
// 1. Fee Category Validators
// =========================================================================
export const createFeeCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50).toUpperCase(),
  description: z.string().optional(),
  type: z.nativeEnum(FeeCategoryType).default(FeeCategoryType.TUITION),
  isTaxable: z.boolean().optional().default(false),
  taxPercentage: z.number().min(0).max(100).optional().default(0),
});

export const updateFeeCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(FeeCategoryType).optional(),
  isTaxable: z.boolean().optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

// =========================================================================
// 2. Fee Structure Validators
// =========================================================================
export const feeHeadInputSchema = z.object({
  feeCategoryId: z.string().optional(),
  name: z.string().min(1, 'Head name is required').max(100),
  amount: z.number().int('Amount must be an integer in minor units').min(0, 'Amount cannot be negative'),
  isOptional: z.boolean().optional().default(false),
  frequency: z.nativeEnum(FeeFrequency).default(FeeFrequency.ANNUAL),
});

export const lateFeePolicySchema = z.object({
  enabled: z.boolean().default(false),
  lateFeeType: z.nativeEnum(LateFeeType).default(LateFeeType.FLAT),
  amount: z.number().int().min(0).default(0),
  gracePeriodDays: z.number().int().min(0).default(0),
  maxLateFee: z.number().int().min(0).optional(),
});

export const createFeeStructureSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  classId: z.string().min(1, 'Class is required'),
  campusId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(150),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  heads: z.array(feeHeadInputSchema).min(1, 'At least one fee head is required'),
  lateFeePolicy: lateFeePolicySchema.optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateFeeStructureSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  heads: z.array(feeHeadInputSchema).optional(),
  lateFeePolicy: lateFeePolicySchema.optional(),
  dueDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// =========================================================================
// 3. Student Fee Assignment Validators
// =========================================================================
export const customDiscountSchema = z.object({
  category: z.string().optional(),
  discountType: z.nativeEnum(DiscountType),
  value: z.number().int().min(0, 'Discount value cannot be negative'),
  reason: z.string().min(1, 'Reason for concession is required'),
});

export const createStudentFeeAssignmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
  feeStructureId: z.string().min(1, 'Fee structure ID is required'),
  customDiscounts: z.array(customDiscountSchema).optional().default([]),
});

export const batchAssignFeeStructureSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
  feeStructureId: z.string().min(1, 'Fee structure ID is required'),
  studentIds: z.array(z.string()).optional(), // if empty, applies to all active students in class
});

// =========================================================================
// 4. Invoice Generation Validators
// =========================================================================
export const generateInvoicesSchema = z.object({
  mode: z.enum(['SINGLE', 'BULK_CLASS']),
  studentId: z.string().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
  feeStructureId: z.string().min(1, 'Fee structure is required'),
  dueDate: z.coerce.date(),
  issueDate: z.coerce.date().optional().default(() => new Date()),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.mode === 'SINGLE' && !data.studentId) return false;
  if (data.mode === 'BULK_CLASS' && !data.classId) return false;
  return true;
}, {
  message: 'studentId is required for SINGLE mode; classId is required for BULK_CLASS mode',
});

export const voidInvoiceSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters long'),
});

// =========================================================================
// 5. Payment Collection Validators
// =========================================================================
export const collectPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().int('Payment amount must be in minor units').min(1, 'Amount must be at least 1 minor unit'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  notes: z.string().optional(),
  transactionReference: z.string().optional(),
  chequeNumber: z.string().optional(),
  bankName: z.string().optional(),
});

export const initiateOnlinePaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().int().min(1),
  gatewayProvider: z.nativeEnum(PaymentGatewayProvider).default(PaymentGatewayProvider.OFFLINE),
  idempotencyKey: z.string().optional(),
});

export const verifyOnlinePaymentSchema = z.object({
  gatewayOrderId: z.string().min(1, 'Gateway order ID is required'),
  gatewayTransactionId: z.string().min(1, 'Gateway transaction ID is required'),
  signature: z.string().optional(),
});

// =========================================================================
// 6. Refund Validators
// =========================================================================
export const requestRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().int().min(1, 'Amount must be at least 1 minor unit'),
  reason: z.string().min(3, 'Reason is required'),
});

export const reviewRefundSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectedReason: z.string().optional(),
});

// =========================================================================
// 7. Income & Expense Validators
// =========================================================================
export const createIncomeSchema = z.object({
  campusId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(150),
  category: z.string().min(1, 'Category is required').max(100),
  amount: z.number().int().min(1, 'Amount must be in minor units'),
  date: z.coerce.date().default(() => new Date()),
  referenceNumber: z.string().optional(),
  description: z.string().optional(),
});

export const createExpenseSchema = z.object({
  campusId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(150),
  category: z.string().min(1, 'Category is required').max(100),
  amount: z.number().int().min(1, 'Amount must be in minor units'),
  date: z.coerce.date().default(() => new Date()),
  payee: z.string().min(1, 'Payee is required').max(150),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  referenceNumber: z.string().optional(),
});

// =========================================================================
// 8. Query Filters Validators
// =========================================================================
export const financeFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  academicYearId: z.string().optional(),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  campusId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
