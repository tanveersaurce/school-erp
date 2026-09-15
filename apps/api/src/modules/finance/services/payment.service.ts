import { Types } from 'mongoose';
import {
  Payment,
  FeeInvoice,
  Student,
  School,
  Counter,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  Money,
  PaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentGatewayProvider,
} from '@edusphere/common';
import { getPaymentGatewayAdapter } from '../adapters/payment-gateway.adapter.js';

export class PaymentService {
  /**
   * Generates a collision-safe sequential receipt number (e.g. REC-2026-00001).
   */
  public static async generateReceiptNumber(
    tenantId: string,
    schoolId: string,
    year = new Date().getFullYear()
  ): Promise<string> {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const school = await School.findOne({
      _id: schoolOid,
      tenantId: tenantOid,
      isDeleted: false,
    }).lean();

    const prefix = school?.settings?.numbering?.receiptPrefix || 'REC';

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: tenantOid,
        schoolId: schoolOid,
        sequenceType: `RECEIPT_NUMBER_${year}`,
      },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const val = counter?.currentValue ?? 1;
    return `${prefix}-${year}-${String(val).padStart(5, '0')}`;
  }

  public static async collectPayment(
    tenantId: string,
    schoolId: string,
    input: {
      invoiceId: string;
      studentId: string;
      amount: number; // minor units
      paymentMethod: PaymentMethod;
      notes?: string;
      transactionReference?: string;
      chequeNumber?: string;
      bankName?: string;
      gatewayIdempotencyKey?: string;
    },
    collectedByUserId?: string
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const invoiceOid = new Types.ObjectId(input.invoiceId);
    const studentOid = new Types.ObjectId(input.studentId);
    const paymentAmount = Math.round(input.amount);

    if (paymentAmount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero.');
    }

    // Idempotency check
    if (input.gatewayIdempotencyKey) {
      const existingPayment = await Payment.findOne({
        tenantId: tenantOid,
        gatewayIdempotencyKey: input.gatewayIdempotencyKey,
      });

      if (existingPayment) {
        return existingPayment;
      }
    }

    const invoice = await FeeInvoice.findOne({
      _id: invoiceOid,
      tenantId: tenantOid,
      schoolId: schoolOid,
      isDeleted: false,
    });

    if (!invoice) throw new NotFoundError('Invoice not found.');

    if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError(`Cannot collect payment for a ${invoice.status} invoice.`);
    }

    if (invoice.balanceAmount <= 0 || invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError('Invoice is already fully paid.');
    }

    if (paymentAmount > invoice.balanceAmount) {
      throw new BadRequestError(
        `Payment amount (${paymentAmount} minor units) exceeds outstanding balance (${invoice.balanceAmount} minor units).`
      );
    }

    const receiptNumber = await this.generateReceiptNumber(tenantId, schoolId);

    // Update invoice balances atomically
    const newPaidAmount = Money.add(invoice.paidAmount, paymentAmount);
    const newBalanceAmount = Money.subtract(invoice.totalAmount, newPaidAmount);

    invoice.paidAmount = newPaidAmount;
    invoice.balanceAmount = newBalanceAmount < 0 ? 0 : newBalanceAmount;
    invoice.status = invoice.balanceAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    await invoice.save();

    // Create payment ledger record
    const payment = await Payment.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      receiptNumber,
      invoiceId: invoiceOid,
      studentId: studentOid,
      amount: paymentAmount,
      paymentMethod: input.paymentMethod,
      gatewayProvider: PaymentGatewayProvider.OFFLINE,
      gatewayTransactionId: input.transactionReference,
      gatewayIdempotencyKey: input.gatewayIdempotencyKey,
      status: PaymentStatus.SUCCESS,
      collectedBy: collectedByUserId ? new Types.ObjectId(collectedByUserId) : undefined,
      notes: input.notes,
      verifiedAt: new Date(),
    });

    return payment;
  }

  public static async initiateOnlinePayment(
    tenantId: string,
    schoolId: string,
    input: {
      invoiceId: string;
      studentId: string;
      amount: number;
      gatewayProvider: PaymentGatewayProvider;
      idempotencyKey?: string;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const invoiceOid = new Types.ObjectId(input.invoiceId);
    const studentOid = new Types.ObjectId(input.studentId);
    const amount = Math.round(input.amount);

    const invoice = await FeeInvoice.findOne({
      _id: invoiceOid,
      tenantId: tenantOid,
      schoolId: schoolOid,
      isDeleted: false,
    });

    if (!invoice) throw new NotFoundError('Invoice not found.');
    if (amount > invoice.balanceAmount) {
      throw new BadRequestError('Payment amount exceeds outstanding balance.');
    }

    const school = await School.findById(schoolOid).lean();
    const currency = school?.currency || 'USD';

    const adapter = getPaymentGatewayAdapter(input.gatewayProvider);
    const orderResult = await adapter.createOrder({
      tenantId,
      schoolId,
      invoiceId: input.invoiceId,
      studentId: input.studentId,
      amount,
      currency,
      idempotencyKey: input.idempotencyKey,
    });

    const receiptNumber = await this.generateReceiptNumber(tenantId, schoolId);

    const payment = await Payment.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      receiptNumber,
      invoiceId: invoiceOid,
      studentId: studentOid,
      amount,
      paymentMethod: PaymentMethod.PAYMENT_GATEWAY,
      gatewayProvider: input.gatewayProvider,
      gatewayOrderId: orderResult.gatewayOrderId,
      gatewayIdempotencyKey: input.idempotencyKey,
      status: PaymentStatus.INITIATED,
    });

    return {
      payment,
      orderResult,
    };
  }

  public static async verifyOnlinePayment(
    tenantId: string,
    schoolId: string,
    input: {
      gatewayOrderId: string;
      gatewayTransactionId: string;
      signature?: string;
    }
  ) {
    const payment = await Payment.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      gatewayOrderId: input.gatewayOrderId,
    });

    if (!payment) throw new NotFoundError('Payment session not found.');
    if (payment.status === PaymentStatus.SUCCESS) {
      return { success: true, payment, message: 'Payment already verified.' };
    }

    const adapter = getPaymentGatewayAdapter(payment.gatewayProvider);
    const verification = await adapter.verifyPayment({
      tenantId,
      schoolId,
      gatewayOrderId: input.gatewayOrderId,
      gatewayTransactionId: input.gatewayTransactionId,
      signature: input.signature,
    });

    if (!verification.verified) {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
      throw new BadRequestError('Payment verification failed.');
    }

    payment.gatewayTransactionId = input.gatewayTransactionId;
    payment.status = PaymentStatus.SUCCESS;
    payment.verifiedAt = new Date();
    await payment.save();

    // Update invoice
    const invoice = await FeeInvoice.findById(payment.invoiceId);
    if (invoice) {
      const newPaid = Money.add(invoice.paidAmount, payment.amount);
      const newBalance = Money.subtract(invoice.totalAmount, newPaid);
      invoice.paidAmount = newPaid;
      invoice.balanceAmount = newBalance < 0 ? 0 : newBalance;
      invoice.status = invoice.balanceAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      await invoice.save();
    }

    return { success: true, payment, message: 'Payment verified and credited.' };
  }

  public static async getPayments(
    tenantId: string,
    schoolId: string,
    query: {
      invoiceId?: string;
      studentId?: string;
      status?: string;
      paymentMethod?: string;
      search?: string;
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

    if (query.invoiceId) filter.invoiceId = new Types.ObjectId(query.invoiceId);
    if (query.studentId) filter.studentId = new Types.ObjectId(query.studentId);
    if (query.status) filter.status = query.status;
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

    if (query.search) {
      filter.$or = [
        { receiptNumber: { $regex: query.search, $options: 'i' } },
        { gatewayTransactionId: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('invoiceId', 'invoiceNumber totalAmount balanceAmount')
        .populate('collectedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
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

  public static async getPaymentById(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const payment = await Payment.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
    })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber email phone')
      .populate('invoiceId', 'invoiceNumber dueDate issueDate totalAmount paidAmount balanceAmount lineItems')
      .populate('collectedBy', 'firstName lastName email');

    if (!payment) throw new NotFoundError('Payment record not found.');
    return payment;
  }
}
