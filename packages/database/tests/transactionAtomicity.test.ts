import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Tenant, School, Student, FeeInvoice, Payment } from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentGatewayProvider,
} from '@edusphere/common';

describe('Financial Transaction Atomicity Suite', () => {
  let tenantId: Types.ObjectId;
  let schoolId: Types.ObjectId;
  let studentId: Types.ObjectId;
  let academicYearId: Types.ObjectId;
  let classId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await FeeInvoice.init();
    await Payment.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    tenantId = new Types.ObjectId();
    schoolId = new Types.ObjectId();
    academicYearId = new Types.ObjectId();
    classId = new Types.ObjectId();

    await Tenant.create({
      _id: tenantId,
      name: 'Finance Trust',
      slug: 'finance-trust',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Finance High School',
      code: 'FHS',
      affiliationBoard: 'CBSE',
    });

    const st = await Student.create({
      tenantId,
      schoolId,
      admissionNumber: 'FIN-001',
      personalDetails: {
        firstName: 'Richie',
        lastName: 'Rich',
        dateOfBirth: new Date('2011-01-01'),
        gender: 'MALE',
      },
      contactDetails: { emergencyPhone: '9876543210', currentAddress: 'Mansion Lane' },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentId = st._id as Types.ObjectId;
  });

  it('should commit multi-document updates atomically during successful payment', async () => {
    const invoice = await FeeInvoice.create({
      tenantId,
      schoolId,
      invoiceNumber: 'INV-2026-0001',
      studentId,
      academicYearId,
      classId,
      dueDate: new Date('2026-05-15'),
      issueDate: new Date('2026-04-01'),
      lineItems: [
        { description: 'Term 1 Tuition', amount: 50000, discountAmount: 0, netAmount: 50000 },
      ],
      subTotal: 50000,
      totalDiscount: 0,
      taxAmount: 0,
      totalAmount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
      status: InvoiceStatus.ISSUED,
    });

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // 1. Record payment
      await Payment.create(
        [
          {
            tenantId,
            schoolId,
            receiptNumber: 'RCP-2026-0001',
            invoiceId: invoice._id,
            studentId,
            amount: 20000,
            paymentMethod: PaymentMethod.UPI,
            gatewayProvider: PaymentGatewayProvider.OFFLINE,
            status: PaymentStatus.SUCCESS,
          },
        ],
        { session }
      );

      // 2. Mutate invoice balance
      await FeeInvoice.findByIdAndUpdate(
        invoice._id,
        {
          paidAmount: 20000,
          balanceAmount: 30000,
          status: InvoiceStatus.PARTIALLY_PAID,
        },
        { session }
      );
    });
    await session.endSession();

    // Verify persisted state
    const updatedInvoice = await FeeInvoice.findById(invoice._id);
    expect(updatedInvoice?.paidAmount).toBe(20000);
    expect(updatedInvoice?.balanceAmount).toBe(30000);
    expect(updatedInvoice?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

    const paymentRecord = await Payment.findOne({ receiptNumber: 'RCP-2026-0001' });
    expect(paymentRecord).not.toBeNull();
    expect(paymentRecord?.amount).toBe(20000);
  });

  it('should cleanly roll back invoice mutations and payments when an exception occurs inside transaction', async () => {
    const invoice = await FeeInvoice.create({
      tenantId,
      schoolId,
      invoiceNumber: 'INV-2026-0002',
      studentId,
      academicYearId,
      classId,
      dueDate: new Date('2026-05-15'),
      issueDate: new Date('2026-04-01'),
      lineItems: [
        { description: 'Term 2 Tuition', amount: 40000, discountAmount: 0, netAmount: 40000 },
      ],
      subTotal: 40000,
      totalDiscount: 0,
      taxAmount: 0,
      totalAmount: 40000,
      paidAmount: 0,
      balanceAmount: 40000,
      status: InvoiceStatus.ISSUED,
    });

    const session = await mongoose.startSession();

    let transactionFailed = false;
    try {
      await session.withTransaction(async () => {
        // Step 1: Create payment
        await Payment.create(
          [
            {
              tenantId,
              schoolId,
              receiptNumber: 'RCP-FAIL-0001',
              invoiceId: invoice._id,
              studentId,
              amount: 40000,
              paymentMethod: PaymentMethod.CREDIT_CARD,
              gatewayProvider: PaymentGatewayProvider.STRIPE,
              status: PaymentStatus.INITIATED,
            },
          ],
          { session }
        );

        // Step 2: Mutate invoice
        await FeeInvoice.findByIdAndUpdate(
          invoice._id,
          {
            paidAmount: 40000,
            balanceAmount: 0,
            status: InvoiceStatus.PAID,
          },
          { session }
        );

        // Step 3: Simulated crash or external gateway verification failure
        throw new Error('Payment gateway settlement failed abruptly!');
      });
    } catch (err: any) {
      transactionFailed = true;
      expect(err.message).toBe('Payment gateway settlement failed abruptly!');
    } finally {
      await session.endSession();
    }

    expect(transactionFailed).toBe(true);

    // Verify that invoice was NOT mutated and remains at original state
    const revertedInvoice = await FeeInvoice.findById(invoice._id);
    expect(revertedInvoice?.paidAmount).toBe(0);
    expect(revertedInvoice?.balanceAmount).toBe(40000);
    expect(revertedInvoice?.status).toBe(InvoiceStatus.ISSUED);

    // Verify that payment record was NOT created
    const failedPayment = await Payment.findOne({ receiptNumber: 'RCP-FAIL-0001' });
    expect(failedPayment).toBeNull();
  });
});
