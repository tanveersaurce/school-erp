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

export {
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
};

// =========================================================================
// 1. Fee Category & Heads
// =========================================================================
export interface IFeeCategory {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  type: FeeCategoryType;
  isTaxable: boolean;
  taxPercentage?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILateFeePolicy {
  enabled: boolean;
  lateFeeType: LateFeeType;
  amount: number; // minor units or percentage rate
  gracePeriodDays: number;
  maxLateFee?: number; // minor units
}

export interface IFeeHead {
  id?: string;
  feeCategoryId?: string;
  name: string;
  amount: number; // minor units
  isOptional: boolean;
  frequency: FeeFrequency;
}

// =========================================================================
// 2. Fee Structure
// =========================================================================
export interface IFeeStructure {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  campusId?: string;
  title: string;
  code?: string;
  description?: string;
  heads: IFeeHead[];
  lateFeePolicy?: ILateFeePolicy;
  totalAmount: number; // minor units
  dueDate?: Date;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 3. Student Fee Assignment & Discounts
// =========================================================================
export interface ICustomDiscount {
  category?: string;
  discountType: DiscountType;
  value: number; // minor units for FLAT or percentage (0-100)
  reason: string;
  approvedBy?: string;
}

export interface IStudentFeeAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  feeStructureId: string;
  customDiscounts?: ICustomDiscount[];
  totalPayable: number; // minor units after structure calculation & discounts
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 4. Invoice & Line Items
// =========================================================================
export interface IInvoiceLineItem {
  id?: string;
  feeHeadId?: string;
  feeCategoryId?: string;
  description: string;
  amount: number; // minor units
  discountAmount: number; // minor units
  taxAmount?: number; // minor units
  netAmount: number; // minor units
}

export interface IFeeInvoice {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  invoiceNumber: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  feeStructureId?: string;
  dueDate: Date;
  issueDate: Date;
  lineItems: IInvoiceLineItem[];
  subTotal: number; // minor units
  totalDiscount: number; // minor units
  taxAmount: number; // minor units
  lateFeeAmount: number; // minor units
  totalAmount: number; // minor units
  paidAmount: number; // minor units
  balanceAmount: number; // minor units
  status: InvoiceStatus;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 5. Payments & Allocations
// =========================================================================
export interface IPaymentAllocation {
  lineItemId?: string;
  feeHeadId?: string;
  allocatedAmount: number; // minor units
}

export interface IPayment {
  id: string;
  tenantId: string;
  schoolId: string;
  receiptNumber: string;
  invoiceId: string;
  studentId: string;
  amount: number; // minor units
  paymentMethod: PaymentMethod;
  gatewayProvider: PaymentGatewayProvider;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  gatewayIdempotencyKey?: string;
  allocations?: IPaymentAllocation[];
  status: PaymentStatus;
  reconciliationStatus?: ReconciliationStatus;
  collectedBy?: string;
  notes?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 6. Refunds
// =========================================================================
export interface IRefund {
  id: string;
  tenantId: string;
  schoolId: string;
  refundNumber: string;
  paymentId: string;
  invoiceId: string;
  studentId: string;
  amount: number; // minor units
  reason: string;
  status: RefundStatus;
  approvedBy?: string;
  approvedAt?: Date;
  processedBy?: string;
  processedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 7. Income & Expense
// =========================================================================
export interface IIncome {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  title: string;
  category: string;
  amount: number; // minor units
  date: Date;
  referenceNumber?: string;
  description?: string;
  recordedBy: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpense {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  title: string;
  category: string;
  amount: number; // minor units
  date: Date;
  payee: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  approvedBy?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 8. Financial Reports & Analytics DTOs
// =========================================================================
export interface IFinanceSummaryKPIs {
  totalInvoiced: number; // minor units
  totalCollected: number; // minor units
  totalOutstanding: number; // minor units
  totalOverdue: number; // minor units
  totalDiscounts: number; // minor units
  totalRefunds: number; // minor units
  collectionRatePercentage: number;
}

export interface IDefaulterRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  invoiceId: string;
  invoiceNumber: string;
  dueDate: Date;
  daysOverdue: number;
  totalAmount: number; // minor units
  paidAmount: number; // minor units
  outstandingAmount: number; // minor units
}

export interface IStudentLedgerEntry {
  id: string;
  date: Date;
  type: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
  referenceNumber: string;
  description: string;
  debit: number; // minor units
  credit: number; // minor units
  runningBalance: number; // minor units
}

export interface IStudentLedgerStatement {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  academicYearName: string;
  totalInvoiced: number; // minor units
  totalPaid: number; // minor units
  totalRefunded: number; // minor units
  outstandingBalance: number; // minor units
  entries: IStudentLedgerEntry[];
}
