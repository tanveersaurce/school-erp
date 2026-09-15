import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import {
  School,
  Counter,
  FeeInvoice,
  Payment,
} from '@edusphere/database';
import {
  InvoiceStatus,
  PaymentMethod,
  PaymentGatewayProvider,
  PaymentStatus,
} from '@edusphere/common';
import { InvoiceService } from '../src/modules/finance/services/invoice.service.js';
import { PaymentService } from '../src/modules/finance/services/payment.service.js';

describe('Phase 13: Finance Concurrency & Idempotency Suite', () => {
  let replSet: MongoMemoryReplSet;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const studentId = new Types.ObjectId();

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Counter.init();
    await FeeInvoice.init();
    await Payment.init();

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Oakridge High',
      code: 'OAKRIDGE',
      affiliationBoard: 'IB',
      timezone: 'UTC',
      settings: {
        numbering: {
          invoicePrefix: 'INV',
          receiptPrefix: 'REC',
        },
      },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('should prevent double charging by returning existing payment when identical idempotency key is used', async () => {
    const invoice = await FeeInvoice.create({
      tenantId,
      schoolId,
      invoiceNumber: 'INV-2026-90001',
      studentId,
      academicYearId: new Types.ObjectId(),
      classId: new Types.ObjectId(),
      dueDate: new Date(),
      issueDate: new Date(),
      subTotal: 50000,
      totalDiscount: 0,
      taxAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
      status: InvoiceStatus.ISSUED,
    });

    const idempotencyKey = 'idemp_key_concurrency_999';

    // First call
    const payment1 = await PaymentService.collectPayment(
      tenantId.toString(),
      schoolId.toString(),
      {
        invoiceId: invoice._id.toString(),
        studentId: studentId.toString(),
        amount: 25000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        gatewayIdempotencyKey: idempotencyKey,
      }
    );

    // Second call with same idempotency key
    const payment2 = await PaymentService.collectPayment(
      tenantId.toString(),
      schoolId.toString(),
      {
        invoiceId: invoice._id.toString(),
        studentId: studentId.toString(),
        amount: 25000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        gatewayIdempotencyKey: idempotencyKey,
      }
    );

    expect(payment1._id.toString()).toBe(payment2._id.toString());
    expect(payment1.receiptNumber).toBe(payment2.receiptNumber);

    // Verify invoice was only charged once (paidAmount = 25000, not 50000)
    const refreshedInvoice = await FeeInvoice.findById(invoice._id);
    expect(refreshedInvoice?.paidAmount).toBe(25000);
    expect(refreshedInvoice?.balanceAmount).toBe(25000);
  });

  it('should generate collision-safe sequential numbers under concurrent load', async () => {
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () =>
      InvoiceService.generateInvoiceNumber(tenantId.toString(), schoolId.toString())
    );

    const generatedNumbers = await Promise.all(promises);

    // All generated invoice numbers must be unique
    const uniqueNumbers = new Set(generatedNumbers);
    expect(uniqueNumbers.size).toBe(concurrentRequests);

    for (const num of generatedNumbers) {
      expect(num).toMatch(/^INV-\d{4}-\d{5}$/);
    }
  });
});
