import { Types } from 'mongoose';
import {
  Refund,
  Payment,
  FeeInvoice,
  Counter,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  Money,
  RefundStatus,
  PaymentStatus,
  InvoiceStatus,
} from '@edusphere/common';

export class RefundService {
  /**
   * Generates a collision-safe sequential refund identifier (e.g. REF-2026-00001).
   */
  public static async generateRefundNumber(
    tenantId: string,
    schoolId: string,
    year = new Date().getFullYear()
  ): Promise<string> {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: tenantOid,
        schoolId: schoolOid,
        sequenceType: `REFUND_NUMBER_${year}`,
      },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const val = counter?.currentValue ?? 1;
    return `REF-${year}-${String(val).padStart(5, '0')}`;
  }

  public static async requestRefund(
    tenantId: string,
    schoolId: string,
    input: {
      paymentId: string;
      amount: number;
      reason: string;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const paymentOid = new Types.ObjectId(input.paymentId);
    const refundAmount = Math.round(input.amount);

    if (refundAmount <= 0) {
      throw new BadRequestError('Refund amount must be greater than zero.');
    }

    const payment = await Payment.findOne({
      _id: paymentOid,
      tenantId: tenantOid,
      schoolId: schoolOid,
    });

    if (!payment) throw new NotFoundError('Payment record not found.');
    if (payment.status !== PaymentStatus.SUCCESS && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestError('Only successful payments can be refunded.');
    }

    // Check prior refunds
    const priorRefunds = await Refund.find({
      tenantId: tenantOid,
      paymentId: paymentOid,
      status: { $in: [RefundStatus.APPROVED, RefundStatus.PROCESSED, RefundStatus.PENDING] },
    });

    const alreadyRefunded = priorRefunds.reduce((sum, r) => Money.add(sum, r.amount), 0);
    const maxRefundable = Money.subtract(payment.amount, alreadyRefunded);

    if (refundAmount > maxRefundable) {
      throw new BadRequestError(
        `Requested refund (${refundAmount}) exceeds maximum refundable amount (${maxRefundable}).`
      );
    }

    const refundNumber = await this.generateRefundNumber(tenantId, schoolId);

    const refund = await Refund.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      refundNumber,
      paymentId: paymentOid,
      invoiceId: payment.invoiceId,
      studentId: payment.studentId,
      amount: refundAmount,
      reason: input.reason.trim(),
      status: RefundStatus.PENDING,
    });

    return refund;
  }

  public static async reviewRefund(
    tenantId: string,
    schoolId: string,
    id: string,
    input: {
      status: 'APPROVED' | 'REJECTED';
      rejectedReason?: string;
    },
    reviewerUserId: string
  ) {
    const refund = await Refund.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
    });

    if (!refund) throw new NotFoundError('Refund record not found.');
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestError(`Cannot review refund in status '${refund.status}'.`);
    }

    if (input.status === 'APPROVED') {
      refund.status = RefundStatus.APPROVED;
      refund.approvedBy = new Types.ObjectId(reviewerUserId);
      refund.approvedAt = new Date();
    } else {
      refund.status = RefundStatus.REJECTED;
      refund.rejectedReason = input.rejectedReason?.trim() || 'Refund request rejected.';
    }

    await refund.save();
    return refund;
  }

  public static async processRefund(
    tenantId: string,
    schoolId: string,
    id: string,
    processorUserId: string
  ) {
    const refund = await Refund.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
    });

    if (!refund) throw new NotFoundError('Refund record not found.');
    if (refund.status === RefundStatus.PROCESSED) {
      throw new BadRequestError('Refund has already been processed.');
    }
    if (refund.status === RefundStatus.REJECTED) {
      throw new BadRequestError('Cannot process a rejected refund.');
    }

    // Process reversal on invoice
    const invoice = await FeeInvoice.findById(refund.invoiceId);
    if (invoice) {
      const newPaid = Money.subtract(invoice.paidAmount, refund.amount);
      const newBalance = Money.add(invoice.balanceAmount, refund.amount);
      invoice.paidAmount = newPaid < 0 ? 0 : newPaid;
      invoice.balanceAmount = newBalance > invoice.totalAmount ? invoice.totalAmount : newBalance;
      invoice.status = invoice.balanceAmount === invoice.totalAmount
        ? InvoiceStatus.ISSUED
        : InvoiceStatus.PARTIALLY_PAID;
      await invoice.save();
    }

    // Update payment record
    const payment = await Payment.findById(refund.paymentId);
    if (payment) {
      const allProcessedRefunds = await Refund.find({
        paymentId: payment._id,
        status: RefundStatus.PROCESSED,
      });
      const totalRefunded = Money.add(
        allProcessedRefunds.reduce((sum, r) => Money.add(sum, r.amount), 0),
        refund.amount
      );

      if (totalRefunded >= payment.amount) {
        payment.status = PaymentStatus.REFUNDED;
      } else {
        payment.status = PaymentStatus.PARTIALLY_REFUNDED;
      }
      await payment.save();
    }

    refund.status = RefundStatus.PROCESSED;
    refund.processedBy = new Types.ObjectId(processorUserId);
    refund.processedAt = new Date();
    await refund.save();

    return refund;
  }

  public static async getRefunds(
    tenantId: string,
    schoolId: string,
    query: {
      studentId?: string;
      paymentId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
    };

    if (query.studentId) filter.studentId = new Types.ObjectId(query.studentId);
    if (query.paymentId) filter.paymentId = new Types.ObjectId(query.paymentId);
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      Refund.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('paymentId', 'receiptNumber amount paymentMethod')
        .populate('approvedBy', 'firstName lastName')
        .populate('processedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Refund.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
