import {
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentGatewayProvider,
} from '@edusphere/common';

export type FeeFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface IFeeHead {
  name: string;
  amount: number;
  isOptional: boolean;
  frequency: FeeFrequency;
}

export interface IFeeStructure {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  title: string;
  heads: IFeeHead[];
  totalAmount: number;
  dueDate?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceLineItem {
  feeHeadId?: string;
  description: string;
  amount: number;
  discountAmount: number;
  netAmount: number;
}

export interface IFeeInvoice {
  id: string;
  tenantId: string;
  schoolId: string;
  invoiceNumber: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  dueDate: Date;
  issueDate: Date;
  lineItems: IInvoiceLineItem[];
  subTotal: number;
  totalDiscount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment {
  id: string;
  tenantId: string;
  schoolId: string;
  receiptNumber: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  gatewayProvider: PaymentGatewayProvider;
  gatewayTransactionId?: string;
  gatewayIdempotencyKey?: string;
  status: PaymentStatus;
  collectedBy?: string;
  notes?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefund {
  id: string;
  tenantId: string;
  schoolId: string;
  refundNumber: string;
  paymentId: string;
  studentId: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
  approvedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIncome {
  id: string;
  tenantId: string;
  schoolId: string;
  title: string;
  category: string;
  amount: number;
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
  title: string;
  category: string;
  amount: number;
  date: Date;
  payee: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  approvedBy?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
