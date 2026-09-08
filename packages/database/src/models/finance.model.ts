import { Schema, model, Types } from 'mongoose';
import {
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentGatewayProvider,
} from '@edusphere/common';
import {
  IFeeStructure,
  IFeeInvoice,
  IPayment,
  IRefund,
  IIncome,
  IExpense,
  FeeFrequency,
  IInvoiceLineItem,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IFeeStructureDoc extends Omit<
  IFeeStructure,
  'id' | 'tenantId' | 'schoolId' | 'academicYearId' | 'classId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
}

export interface IInvoiceLineItemDoc extends Omit<IInvoiceLineItem, 'feeHeadId'> {
  feeHeadId?: Types.ObjectId;
}

export interface IFeeInvoiceDoc extends Omit<
  IFeeInvoice,
  'id' | 'tenantId' | 'schoolId' | 'studentId' | 'academicYearId' | 'classId' | 'lineItems'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  lineItems: IInvoiceLineItemDoc[];
}

export interface IPaymentDoc extends Omit<
  IPayment,
  'id' | 'tenantId' | 'schoolId' | 'invoiceId' | 'studentId' | 'collectedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  studentId: Types.ObjectId;
  collectedBy?: Types.ObjectId;
}

export interface IRefundDoc extends Omit<
  IRefund,
  'id' | 'tenantId' | 'schoolId' | 'paymentId' | 'studentId' | 'approvedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  paymentId: Types.ObjectId;
  studentId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

export interface IIncomeDoc extends Omit<IIncome, 'id' | 'tenantId' | 'schoolId' | 'recordedBy'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  recordedBy: Types.ObjectId;
}

export interface IExpenseDoc extends Omit<IExpense, 'id' | 'tenantId' | 'schoolId' | 'approvedBy'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

// 1. FeeStructure Schema
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
    title: { type: String, required: true, trim: true },
    heads: [
      {
        name: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        isOptional: { type: Boolean, default: false },
        frequency: {
          type: String,
          enum: ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL'] as FeeFrequency[],
          default: 'ANNUAL',
          required: true,
        },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
FeeStructureSchema.plugin(tenantPlugin);
FeeStructureSchema.plugin(softDeletePlugin);
FeeStructureSchema.index({ tenantId: 1, academicYearId: 1, classId: 1, title: 1 });

// 2. FeeInvoice Schema
const FeeInvoiceSchema = new Schema<IFeeInvoiceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    invoiceNumber: { type: String, required: true, uppercase: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    issueDate: { type: Date, required: true },
    lineItems: [
      {
        feeHeadId: { type: Schema.Types.ObjectId },
        description: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        discountAmount: { type: Number, default: 0, min: 0 },
        netAmount: { type: Number, required: true, min: 0 },
      },
    ],
    subTotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      required: true,
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
FeeInvoiceSchema.plugin(tenantPlugin);
FeeInvoiceSchema.plugin(softDeletePlugin);
FeeInvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
FeeInvoiceSchema.index({ tenantId: 1, studentId: 1, status: 1 });
FeeInvoiceSchema.index({ tenantId: 1, dueDate: 1, status: 1 });

// 3. Payment Schema
const PaymentSchema = new Schema<IPaymentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    receiptNumber: { type: String, required: true, uppercase: true, trim: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
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
    gatewayIdempotencyKey: { type: String, sparse: true, trim: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.INITIATED,
      required: true,
      index: true,
    },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    verifiedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
PaymentSchema.plugin(tenantPlugin);
PaymentSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
PaymentSchema.index({ tenantId: 1, gatewayTransactionId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ tenantId: 1, gatewayIdempotencyKey: 1 }, { unique: true, sparse: true });

// 4. Refund Schema
const RefundSchema = new Schema<IRefundDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    refundNumber: { type: String, required: true, uppercase: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'],
      default: 'PENDING',
      required: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
RefundSchema.plugin(tenantPlugin);
RefundSchema.index({ tenantId: 1, refundNumber: 1 }, { unique: true });

// 5. Income Schema
const IncomeSchema = new Schema<IIncomeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    referenceNumber: { type: String, trim: true },
    description: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
IncomeSchema.plugin(tenantPlugin);
IncomeSchema.plugin(softDeletePlugin);
IncomeSchema.index({ tenantId: 1, schoolId: 1, date: -1 });

// 6. Expense Schema
const ExpenseSchema = new Schema<IExpenseDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
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

export const FeeStructure = model<IFeeStructureDoc>('FeeStructure', FeeStructureSchema);
export const FeeInvoice = model<IFeeInvoiceDoc>('FeeInvoice', FeeInvoiceSchema);
export const Payment = model<IPaymentDoc>('Payment', PaymentSchema);
export const Refund = model<IRefundDoc>('Refund', RefundSchema);
export const Income = model<IIncomeDoc>('Income', IncomeSchema);
export const Expense = model<IExpenseDoc>('Expense', ExpenseSchema);
