import { Schema, model, Types } from 'mongoose';
import {
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentGatewayProvider,
  FeeFrequency,
  FeeCategoryType,
  DiscountType,
  LateFeeType,
  RefundStatus,
  ReconciliationStatus,
} from '@edusphere/common';
import {
  IFeeCategory,
  IFeeStructure,
  IStudentFeeAssignment,
  IFeeInvoice,
  IPayment,
  IRefund,
  IIncome,
  IExpense,
  IInvoiceLineItem,
  IFeeHead,
  ILateFeePolicy,
  ICustomDiscount,
  IPaymentAllocation,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// =========================================================================
// Document Interfaces
// =========================================================================
export interface IFeeCategoryDoc extends Omit<IFeeCategory, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IFeeHeadDoc extends Omit<IFeeHead, 'id' | 'feeCategoryId'> {
  feeCategoryId?: Types.ObjectId;
}

export interface IFeeStructureDoc extends Omit<
  IFeeStructure,
  'id' | 'tenantId' | 'schoolId' | 'academicYearId' | 'classId' | 'campusId' | 'heads'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  campusId?: Types.ObjectId;
  heads: IFeeHeadDoc[];
}

export interface ICustomDiscountDoc extends Omit<ICustomDiscount, 'approvedBy'> {
  approvedBy?: Types.ObjectId;
}

export interface IStudentFeeAssignmentDoc extends Omit<
  IStudentFeeAssignment,
  'id' | 'tenantId' | 'schoolId' | 'studentId' | 'academicYearId' | 'classId' | 'feeStructureId' | 'customDiscounts'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  feeStructureId: Types.ObjectId;
  customDiscounts?: ICustomDiscountDoc[];
}

export interface IInvoiceLineItemDoc extends Omit<IInvoiceLineItem, 'id' | 'feeHeadId' | 'feeCategoryId'> {
  feeHeadId?: Types.ObjectId;
  feeCategoryId?: Types.ObjectId;
}

export interface IFeeInvoiceDoc extends Omit<
  IFeeInvoice,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'studentId' | 'academicYearId' | 'classId' | 'feeStructureId' | 'lineItems'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  feeStructureId?: Types.ObjectId;
  lineItems: IInvoiceLineItemDoc[];
}

export interface IPaymentAllocationDoc extends Omit<IPaymentAllocation, 'lineItemId' | 'feeHeadId'> {
  lineItemId?: Types.ObjectId;
  feeHeadId?: Types.ObjectId;
}

export interface IPaymentDoc extends Omit<
  IPayment,
  'id' | 'tenantId' | 'schoolId' | 'invoiceId' | 'studentId' | 'collectedBy' | 'allocations'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  studentId: Types.ObjectId;
  collectedBy?: Types.ObjectId;
  allocations?: IPaymentAllocationDoc[];
}

export interface IRefundDoc extends Omit<
  IRefund,
  'id' | 'tenantId' | 'schoolId' | 'paymentId' | 'invoiceId' | 'studentId' | 'approvedBy' | 'processedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  paymentId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  studentId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  processedBy?: Types.ObjectId;
}

export interface IIncomeDoc extends Omit<IIncome, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'recordedBy'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  recordedBy: Types.ObjectId;
}

export interface IExpenseDoc extends Omit<IExpense, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'approvedBy'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

// =========================================================================
// 1. Fee Category Schema
// =========================================================================
const FeeCategorySchema = new Schema<IFeeCategoryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: Object.values(FeeCategoryType),
      default: FeeCategoryType.TUITION,
      required: true,
    },
    isTaxable: { type: Boolean, default: false },
    taxPercentage: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
FeeCategorySchema.plugin(tenantPlugin);
FeeCategorySchema.plugin(softDeletePlugin);
FeeCategorySchema.index(
  { tenantId: 1, schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 2. Fee Structure Schema
// =========================================================================
const FeeHeadSubSchema = new Schema<IFeeHeadDoc>(
  {
    feeCategoryId: { type: Schema.Types.ObjectId, ref: 'FeeCategory' },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }, // integer minor units
    isOptional: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: Object.values(FeeFrequency),
      default: FeeFrequency.ANNUAL,
      required: true,
    },
  },
  { _id: true }
);

const LateFeePolicySubSchema = new Schema<ILateFeePolicy>(
  {
    enabled: { type: Boolean, default: false },
    lateFeeType: {
      type: String,
      enum: Object.values(LateFeeType),
      default: LateFeeType.FLAT,
    },
    amount: { type: Number, default: 0, min: 0 },
    gracePeriodDays: { type: Number, default: 0, min: 0 },
    maxLateFee: { type: Number, min: 0 },
  },
  { _id: false }
);

const FeeStructureSchema = new Schema<IFeeStructureDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    title: { type: String, required: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
    description: { type: String, trim: true },
    heads: { type: [FeeHeadSubSchema], default: [] },
    lateFeePolicy: { type: LateFeePolicySubSchema },
    totalAmount: { type: Number, required: true, min: 0 }, // integer minor units
    dueDate: { type: Date },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
FeeStructureSchema.plugin(tenantPlugin);
FeeStructureSchema.plugin(softDeletePlugin);
FeeStructureSchema.index({ tenantId: 1, schoolId: 1, academicYearId: 1, classId: 1, title: 1 });

// =========================================================================
// 3. Student Fee Assignment Schema
// =========================================================================
const CustomDiscountSubSchema = new Schema<ICustomDiscountDoc>(
  {
    category: { type: String, trim: true },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const StudentFeeAssignmentSchema = new Schema<IStudentFeeAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    feeStructureId: {
      type: Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: true,
      index: true,
    },
    customDiscounts: { type: [CustomDiscountSubSchema], default: [] },
    totalPayable: { type: Number, required: true, min: 0 }, // integer minor units
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentFeeAssignmentSchema.plugin(tenantPlugin);
StudentFeeAssignmentSchema.plugin(softDeletePlugin);
StudentFeeAssignmentSchema.index(
  { tenantId: 1, studentId: 1, feeStructureId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 4. Fee Invoice Schema
// =========================================================================
const InvoiceLineItemSubSchema = new Schema<IInvoiceLineItemDoc>(
  {
    feeHeadId: { type: Schema.Types.ObjectId },
    feeCategoryId: { type: Schema.Types.ObjectId, ref: 'FeeCategory' },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }, // integer minor units
    discountAmount: { type: Number, default: 0, min: 0 }, // integer minor units
    taxAmount: { type: Number, default: 0, min: 0 }, // integer minor units
    netAmount: { type: Number, required: true, min: 0 }, // integer minor units
  },
  { _id: true }
);

const FeeInvoiceSchema = new Schema<IFeeInvoiceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    invoiceNumber: { type: String, required: true, uppercase: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure' },
    dueDate: { type: Date, required: true, index: true },
    issueDate: { type: Date, required: true },
    lineItems: { type: [InvoiceLineItemSubSchema], default: [] },
    subTotal: { type: Number, required: true, min: 0 }, // integer minor units
    totalDiscount: { type: Number, default: 0, min: 0 }, // integer minor units
    taxAmount: { type: Number, default: 0, min: 0 }, // integer minor units
    lateFeeAmount: { type: Number, default: 0, min: 0 }, // integer minor units
    totalAmount: { type: Number, required: true, min: 0 }, // integer minor units
    paidAmount: { type: Number, default: 0, min: 0 }, // integer minor units
    balanceAmount: { type: Number, required: true, min: 0 }, // integer minor units
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      required: true,
      index: true,
    },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
FeeInvoiceSchema.plugin(tenantPlugin);
FeeInvoiceSchema.plugin(softDeletePlugin);
FeeInvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
FeeInvoiceSchema.index({ tenantId: 1, studentId: 1, status: 1 });
FeeInvoiceSchema.index({ tenantId: 1, dueDate: 1, status: 1 });
FeeInvoiceSchema.index({ tenantId: 1, academicYearId: 1, classId: 1 });
FeeInvoiceSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
FeeInvoiceSchema.index({ tenantId: 1, schoolId: 1, status: 1, isDeleted: 1 });

// =========================================================================
// 5. Payment Schema
// =========================================================================
const PaymentAllocationSubSchema = new Schema<IPaymentAllocationDoc>(
  {
    lineItemId: { type: Schema.Types.ObjectId },
    feeHeadId: { type: Schema.Types.ObjectId },
    allocatedAmount: { type: Number, required: true, min: 0 }, // minor units
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPaymentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    receiptNumber: { type: String, required: true, uppercase: true, trim: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: 1 }, // integer minor units (at least 1 cent/paise)
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    gatewayProvider: {
      type: String,
      enum: Object.values(PaymentGatewayProvider),
      default: PaymentGatewayProvider.OFFLINE,
      required: true,
    },
    gatewayTransactionId: { type: String, sparse: true, trim: true },
    gatewayOrderId: { type: String, sparse: true, trim: true },
    gatewayIdempotencyKey: { type: String, sparse: true, trim: true },
    allocations: { type: [PaymentAllocationSubSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.INITIATED,
      required: true,
      index: true,
    },
    reconciliationStatus: {
      type: String,
      enum: Object.values(ReconciliationStatus),
      default: ReconciliationStatus.MATCHED,
      required: true,
    },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
    verifiedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
PaymentSchema.plugin(tenantPlugin);
PaymentSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
PaymentSchema.index(
  { tenantId: 1, gatewayTransactionId: 1 },
  { unique: true, partialFilterExpression: { gatewayTransactionId: { $type: 'string' } } }
);
PaymentSchema.index(
  { tenantId: 1, gatewayIdempotencyKey: 1 },
  { unique: true, partialFilterExpression: { gatewayIdempotencyKey: { $type: 'string' } } }
);
PaymentSchema.index(
  { tenantId: 1, gatewayOrderId: 1 },
  { unique: true, partialFilterExpression: { gatewayOrderId: { $type: 'string' } } }
);
PaymentSchema.index({ tenantId: 1, invoiceId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });

// =========================================================================
// 6. Refund Schema
// =========================================================================
const RefundSchema = new Schema<IRefundDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    refundNumber: { type: String, required: true, uppercase: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: 1 }, // integer minor units
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      required: true,
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    rejectedReason: { type: String, trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);
RefundSchema.plugin(tenantPlugin);
RefundSchema.index({ tenantId: 1, refundNumber: 1 }, { unique: true });
RefundSchema.index({ tenantId: 1, paymentId: 1 });
RefundSchema.index({ tenantId: 1, studentId: 1 });

// =========================================================================
// 7. Income Schema
// =========================================================================
const IncomeSchema = new Schema<IIncomeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 }, // integer minor units
    date: { type: Date, required: true },
    referenceNumber: { type: String, trim: true },
    description: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
IncomeSchema.plugin(tenantPlugin);
IncomeSchema.plugin(softDeletePlugin);
IncomeSchema.index({ tenantId: 1, schoolId: 1, date: -1 });

// =========================================================================
// 8. Expense Schema
// =========================================================================
const ExpenseSchema = new Schema<IExpenseDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 }, // integer minor units
    date: { type: Date, required: true },
    payee: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    referenceNumber: { type: String, trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
ExpenseSchema.plugin(tenantPlugin);
ExpenseSchema.plugin(softDeletePlugin);
ExpenseSchema.index({ tenantId: 1, schoolId: 1, date: -1 });

// =========================================================================
// Exports
// =========================================================================
export const FeeCategory = model<IFeeCategoryDoc>('FeeCategory', FeeCategorySchema);
export const FeeStructure = model<IFeeStructureDoc>('FeeStructure', FeeStructureSchema);
export const StudentFeeAssignment = model<IStudentFeeAssignmentDoc>('StudentFeeAssignment', StudentFeeAssignmentSchema);
export const FeeInvoice = model<IFeeInvoiceDoc>('FeeInvoice', FeeInvoiceSchema);
export const Payment = model<IPaymentDoc>('Payment', PaymentSchema);
export const Refund = model<IRefundDoc>('Refund', RefundSchema);
export const Income = model<IIncomeDoc>('Income', IncomeSchema);
export const Expense = model<IExpenseDoc>('Expense', ExpenseSchema);
