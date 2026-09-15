import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  FeeCategory,
  FeeStructure,
  StudentFeeAssignment,
  FeeInvoice,
  Payment,
  Refund,
  Income,
  Expense,
} from '../src/models/finance.model.js';
import {
  FeeCategoryType,
  FeeFrequency,
  InvoiceStatus,
  PaymentMethod,
  PaymentGatewayProvider,
  PaymentStatus,
  RefundStatus,
  DiscountType,
  LateFeeType,
} from '@edusphere/common';

describe('Phase 13: Finance Database Invariants & Constraints', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const classId = new Types.ObjectId();
  const studentId1 = new Types.ObjectId();
  const studentId2 = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await FeeCategory.init();
    await FeeStructure.init();
    await StudentFeeAssignment.init();
    await FeeInvoice.init();
    await Payment.init();
    await Refund.init();
    await Income.init();
    await Expense.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should enforce unique compound index on FeeCategory per tenant, school, and code', async () => {
    await FeeCategory.create({
      tenantId,
      schoolId,
      name: 'Tuition Fee',
      code: 'TUITION_TERM',
      type: FeeCategoryType.TUITION,
    });

    await expect(
      FeeCategory.create({
        tenantId,
        schoolId,
        name: 'Another Tuition',
        code: 'TUITION_TERM',
        type: FeeCategoryType.TUITION,
      })
    ).rejects.toThrow();

    // Allowed for another tenant
    const otherTenantCategory = await FeeCategory.create({
      tenantId: new Types.ObjectId(),
      schoolId,
      name: 'Tuition Fee',
      code: 'TUITION_TERM',
      type: FeeCategoryType.TUITION,
    });
    expect(otherTenantCategory._id).toBeDefined();
  });

  it('should enforce unique index on FeeInvoice per tenant and invoiceNumber', async () => {
    await FeeInvoice.create({
      tenantId,
      schoolId,
      invoiceNumber: 'INV-2026-00001',
      studentId: studentId1,
      academicYearId,
      classId,
      dueDate: new Date(Date.now() + 86400000 * 15),
      issueDate: new Date(),
      subTotal: 500000,
      totalDiscount: 0,
      taxAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 500000,
      paidAmount: 0,
      balanceAmount: 500000,
      status: InvoiceStatus.ISSUED,
    });

    await expect(
      FeeInvoice.create({
        tenantId,
        schoolId,
        invoiceNumber: 'INV-2026-00001',
        studentId: studentId2,
        academicYearId,
        classId,
        dueDate: new Date(Date.now() + 86400000 * 15),
        issueDate: new Date(),
        subTotal: 300000,
        totalDiscount: 0,
        taxAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 300000,
        paidAmount: 0,
        balanceAmount: 300000,
        status: InvoiceStatus.ISSUED,
      })
    ).rejects.toThrow();
  });

  it('should enforce unique index on Payment receiptNumber per tenant', async () => {
    const invoice = await FeeInvoice.create({
      tenantId,
      schoolId,
      invoiceNumber: 'INV-2026-00002',
      studentId: studentId1,
      academicYearId,
      classId,
      dueDate: new Date(),
      issueDate: new Date(),
      subTotal: 100000,
      totalDiscount: 0,
      taxAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 100000,
      paidAmount: 0,
      balanceAmount: 100000,
      status: InvoiceStatus.ISSUED,
    });

    await Payment.create({
      tenantId,
      schoolId,
      receiptNumber: 'REC-2026-00001',
      invoiceId: invoice._id,
      studentId: studentId1,
      amount: 100000,
      paymentMethod: PaymentMethod.CASH,
      gatewayProvider: PaymentGatewayProvider.OFFLINE,
      status: PaymentStatus.SUCCESS,
    });

    await expect(
      Payment.create({
        tenantId,
        schoolId,
        receiptNumber: 'REC-2026-00001',
        invoiceId: invoice._id,
        studentId: studentId1,
        amount: 50000,
        paymentMethod: PaymentMethod.CASH,
        gatewayProvider: PaymentGatewayProvider.OFFLINE,
        status: PaymentStatus.SUCCESS,
      })
    ).rejects.toThrow();
  });

  it('should enforce sparse unique index on Payment gatewayIdempotencyKey', async () => {
    const invoice = await FeeInvoice.findOne({ tenantId, invoiceNumber: 'INV-2026-00002' });

    await Payment.create({
      tenantId,
      schoolId,
      receiptNumber: 'REC-2026-00002',
      invoiceId: invoice!._id,
      studentId: studentId1,
      amount: 25000,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      gatewayProvider: PaymentGatewayProvider.STRIPE,
      gatewayIdempotencyKey: 'idem_key_abc_123',
      status: PaymentStatus.SUCCESS,
    });

    await expect(
      Payment.create({
        tenantId,
        schoolId,
        receiptNumber: 'REC-2026-00003',
        invoiceId: invoice!._id,
        studentId: studentId1,
        amount: 25000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        gatewayProvider: PaymentGatewayProvider.STRIPE,
        gatewayIdempotencyKey: 'idem_key_abc_123',
        status: PaymentStatus.SUCCESS,
      })
    ).rejects.toThrow();
  });

  it('should enforce unique index on Refund refundNumber per tenant', async () => {
    const payment = await Payment.findOne({ tenantId, receiptNumber: 'REC-2026-00001' });

    await Refund.create({
      tenantId,
      schoolId,
      refundNumber: 'REF-2026-00001',
      paymentId: payment!._id,
      invoiceId: payment!.invoiceId,
      studentId: studentId1,
      amount: 50000,
      reason: 'Overpayment adjustment',
      status: RefundStatus.PENDING,
    });

    await expect(
      Refund.create({
        tenantId,
        schoolId,
        refundNumber: 'REF-2026-00001',
        paymentId: payment!._id,
        invoiceId: payment!.invoiceId,
        studentId: studentId1,
        amount: 50000,
        reason: 'Duplicate refund submission',
        status: RefundStatus.PENDING,
      })
    ).rejects.toThrow();
  });

  it('should enforce unique index on StudentFeeAssignment per student and fee structure', async () => {
    const structure = await FeeStructure.create({
      tenantId,
      schoolId,
      academicYearId,
      classId,
      title: 'Grade 10 Annual Fee',
      totalAmount: 1200000,
      heads: [
        {
          name: 'Annual Tuition',
          amount: 1200000,
          isOptional: false,
          frequency: FeeFrequency.ANNUAL,
        },
      ],
    });

    await StudentFeeAssignment.create({
      tenantId,
      schoolId,
      studentId: studentId1,
      academicYearId,
      classId,
      feeStructureId: structure._id,
      totalPayable: 1200000,
    });

    await expect(
      StudentFeeAssignment.create({
        tenantId,
        schoolId,
        studentId: studentId1,
        academicYearId,
        classId,
        feeStructureId: structure._id,
        totalPayable: 1200000,
      })
    ).rejects.toThrow();
  });

  it('should support soft delete filtering via softDeletePlugin', async () => {
    const category = await FeeCategory.create({
      tenantId,
      schoolId,
      name: 'Sports Fee',
      code: 'SPORTS_2026',
      type: FeeCategoryType.SPORTS,
    });

    // Soft delete
    category.isDeleted = true;
    await category.save();

    const active = await FeeCategory.findOne({ _id: category._id, isDeleted: false });
    expect(active).toBeNull();

    const all = await FeeCategory.findOne({ _id: category._id, isDeleted: true });
    expect(all?.isDeleted).toBe(true);
  });
});
