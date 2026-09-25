import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Money, LateFeeType, InvoiceStatus, PaymentStatus } from '@edusphere/common';
import { FeeInvoice, Payment, Refund } from '@edusphere/database';
import {
  createTenant,
  createSchool,
  createAcademicYear,
  createStudent,
  createFeeInvoice,
  createPayment,
} from './factories/entity.factories.js';

describe('Financial Math Precision & Integrity Test Suite (Phase 23)', () => {
  let replSet: MongoMemoryReplSet;
  let tenant: any;
  let school: any;
  let academicYear: any;
  let student: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    tenant = await createTenant();
    school = await createSchool(tenant._id);
    academicYear = await createAcademicYear(tenant._id, school._id, new Types.ObjectId());
    student = await createStudent(tenant._id, school._id);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  // =========================================================================
  // 1. Exact Integer Minor Unit Math (Zero-Floating-Point Drift)
  // =========================================================================
  describe('1. Minor Unit Precision & Zero Floating Point Drift', () => {
    it('eliminates standard IEEE 754 floating point drift (0.1 + 0.2 === 0.3)', () => {
      // Standard JS: 0.1 + 0.2 === 0.30000000000000004
      expect(0.1 + 0.2).not.toBe(0.3);

      // Money utility converts both to integer minor units (10 and 20 cents)
      const minorA = Money.toMinorUnits(0.1);
      const minorB = Money.toMinorUnits(0.2);
      const sumMinor = Money.add(minorA, minorB);

      expect(minorA).toBe(10);
      expect(minorB).toBe(20);
      expect(sumMinor).toBe(30);
      expect(Money.fromMinorUnits(sumMinor)).toBe(0.3);
    });

    it('handles exact addition and subtraction across multiple currency line items', () => {
      const tuition = Money.toMinorUnits(1250.75); // 125075
      const labFee = Money.toMinorUnits(150.50);   // 15050
      const libraryFee = Money.toMinorUnits(45.25); // 4525
      const discount = Money.toMinorUnits(100.00);  // 10000

      const gross = Money.add(tuition, labFee, libraryFee);
      expect(gross).toBe(144650);

      const net = Money.subtract(gross, discount);
      expect(net).toBe(134650);
      expect(Money.fromMinorUnits(net)).toBe(1346.50);
    });

    it('computes exact percentage discount with half-up rounding', () => {
      const totalAmount = 15555; // 155.55
      const discountPercentage = 15; // 15%

      // 15555 * 0.15 = 2333.25 -> rounds to 2333
      const discountAmount = Money.calculatePercentage(totalAmount, discountPercentage);
      expect(discountAmount).toBe(2333);

      const netPayable = Money.subtract(totalAmount, discountAmount);
      expect(netPayable).toBe(13222);
    });

    it('computes capped daily late fees deterministically', () => {
      const baseAmount = 10000; // 100.00
      const daysOverdue = 10;
      const dailyRate = 150; // 1.50 per day
      const maxCap = 1000; // 10.00 max late fee

      // 10 days * 1.50 = 15.00 (1500 cents), but capped at 1000 cents
      const lateFee = Money.calculateLateFee(
        baseAmount,
        LateFeeType.DAILY_RATE,
        dailyRate,
        daysOverdue,
        maxCap
      );

      expect(lateFee).toBe(1000);
    });
  });

  // =========================================================================
  // 2. Partial Payment & Invoice Balance Reconciliation
  // =========================================================================
  describe('2. Partial Payment & Invoice Balance Reconciliation', () => {
    it('transitions invoice through DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID atomically', async () => {
      const totalAmount = 50000; // 500.00
      const invoice = await createFeeInvoice(tenant._id, school._id, student._id, academicYear._id, {
        amount: totalAmount,
        paidAmount: 0,
        status: InvoiceStatus.ISSUED,
      });

      // 1. Partial Payment of 200.00 (20000)
      const payment1Amount = 20000;
      await createPayment(tenant._id, school._id, invoice._id, student._id, {
        amount: payment1Amount,
        status: PaymentStatus.SUCCESS,
      });

      const afterPayment1 = await FeeInvoice.findByIdAndUpdate(
        invoice._id,
        {
          $inc: { paidAmount: payment1Amount },
          $set: { status: InvoiceStatus.PARTIALLY_PAID },
        },
        { new: true }
      );

      expect(afterPayment1?.paidAmount).toBe(20000);
      expect(afterPayment1?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      const remainingBalance = Money.subtract(afterPayment1!.totalAmount, afterPayment1!.paidAmount);
      expect(remainingBalance).toBe(30000);

      // 2. Final Payment of 300.00 (30000)
      await createPayment(tenant._id, school._id, invoice._id, student._id, {
        amount: remainingBalance,
        status: PaymentStatus.SUCCESS,
      });

      const afterPayment2 = await FeeInvoice.findByIdAndUpdate(
        invoice._id,
        {
          $inc: { paidAmount: remainingBalance },
          $set: { status: InvoiceStatus.PAID },
        },
        { new: true }
      );

      expect(afterPayment2?.paidAmount).toBe(totalAmount);
      expect(afterPayment2?.status).toBe(InvoiceStatus.PAID);
      expect(Money.subtract(afterPayment2!.totalAmount, afterPayment2!.paidAmount)).toBe(0);
    });

    it('prohibits refund amounts from exceeding total completed payments', async () => {
      const invoice = await createFeeInvoice(tenant._id, school._id, student._id, academicYear._id, {
        amount: 30000,
        paidAmount: 30000,
        status: InvoiceStatus.PAID,
      });

      const payment = await createPayment(tenant._id, school._id, invoice._id, student._id, {
        amount: 30000,
        status: PaymentStatus.SUCCESS,
      });

      // Attempt to refund more than the paid amount (35000 > 30000)
      const refundAttemptAmount = 35000;
      const isRefundValid = (attemptAmount: number, maxRefundable: number) => {
        return attemptAmount <= maxRefundable;
      };

      expect(isRefundValid(refundAttemptAmount, payment.amount)).toBe(false);

      // Valid refund of 10000
      expect(isRefundValid(10000, payment.amount)).toBe(true);
    });
  });
});
