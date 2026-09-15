import crypto from 'crypto';
import {
  PaymentGatewayProvider,
  PaymentStatus,
  RefundStatus,
  BadRequestError,
} from '@edusphere/common';

export interface CreateOrderParams {
  tenantId: string;
  schoolId: string;
  invoiceId: string;
  studentId: string;
  amount: number; // minor units
  currency: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  gatewayTransactionId?: string;
  checkoutUrl?: string;
  rawResponse?: Record<string, unknown>;
}

export interface VerifyPaymentParams {
  tenantId: string;
  schoolId: string;
  gatewayOrderId: string;
  gatewayTransactionId: string;
  signature?: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  status: PaymentStatus;
  transactionDetails?: Record<string, unknown>;
}

export interface WebhookResult {
  event: string;
  gatewayOrderId?: string;
  gatewayTransactionId: string;
  status: PaymentStatus;
  amount?: number;
  raw: Record<string, unknown>;
}

export interface RefundPaymentParams {
  tenantId: string;
  schoolId: string;
  gatewayTransactionId: string;
  amount: number; // minor units
  reason: string;
}

export interface RefundPaymentResult {
  gatewayRefundId: string;
  status: RefundStatus;
  rawResponse?: Record<string, unknown>;
}

/**
 * Interface definition for pluggable Payment Gateway adapters.
 */
export interface PaymentGatewayAdapter {
  readonly provider: PaymentGatewayProvider;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  processWebhook(payload: Record<string, unknown>, signature: string): Promise<WebhookResult>;
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
}

/**
 * Mock / Sandbox Payment Gateway Adapter for automated testing and offline simulation.
 */
export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  public readonly provider: PaymentGatewayProvider;
  private readonly secretKey: string;

  constructor(provider: PaymentGatewayProvider = PaymentGatewayProvider.OFFLINE, secretKey = 'mock_secret_key_edusphere') {
    this.provider = provider;
    this.secretKey = secretKey;
  }

  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const gatewayOrderId = `order_${params.tenantId.substring(0, 4)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const checkoutUrl = `https://checkout.edusphere.mock/pay/${gatewayOrderId}`;

    return {
      gatewayOrderId,
      checkoutUrl,
      rawResponse: {
        id: gatewayOrderId,
        amount: params.amount,
        currency: params.currency,
        status: 'created',
        idempotencyKey: params.idempotencyKey,
      },
    };
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    // In mock mode, if signature is 'invalid_sig', fail verification
    if (params.signature === 'invalid_signature') {
      return {
        verified: false,
        status: PaymentStatus.FAILED,
      };
    }

    // Deterministic HMAC verification if signature is provided
    if (params.signature && params.signature.startsWith('sig_')) {
      const expectedHmac = `sig_${crypto.createHmac('sha256', this.secretKey).update(`${params.gatewayOrderId}|${params.gatewayTransactionId}`).digest('hex')}`;
      if (params.signature !== expectedHmac) {
        return {
          verified: false,
          status: PaymentStatus.FAILED,
        };
      }
    }

    return {
      verified: true,
      status: PaymentStatus.SUCCESS,
      transactionDetails: {
        verifiedAt: new Date(),
        orderId: params.gatewayOrderId,
        transactionId: params.gatewayTransactionId,
      },
    };
  }

  public async processWebhook(payload: Record<string, unknown>, signature: string): Promise<WebhookResult> {
    if (!signature) {
      throw new BadRequestError('Webhook signature missing.');
    }

    const event = (payload.event as string) || 'payment.captured';
    const gatewayTransactionId = (payload.transactionId as string) || `txn_${Date.now()}`;
    const gatewayOrderId = payload.orderId as string | undefined;

    return {
      event,
      gatewayOrderId,
      gatewayTransactionId,
      status: event === 'payment.failed' ? PaymentStatus.FAILED : PaymentStatus.SUCCESS,
      amount: payload.amount as number | undefined,
      raw: payload,
    };
  }

  public async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const gatewayRefundId = `rfnd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      gatewayRefundId,
      status: RefundStatus.PROCESSED,
      rawResponse: {
        refundId: gatewayRefundId,
        amount: params.amount,
        reason: params.reason,
        processedAt: new Date(),
      },
    };
  }
}

/**
 * Factory method to resolve the appropriate payment gateway adapter.
 */
export function getPaymentGatewayAdapter(provider: PaymentGatewayProvider = PaymentGatewayProvider.OFFLINE): PaymentGatewayAdapter {
  switch (provider) {
    case PaymentGatewayProvider.RAZORPAY:
      return new MockPaymentGatewayAdapter(PaymentGatewayProvider.RAZORPAY);
    case PaymentGatewayProvider.STRIPE:
      return new MockPaymentGatewayAdapter(PaymentGatewayProvider.STRIPE);
    case PaymentGatewayProvider.PAYPAL:
      return new MockPaymentGatewayAdapter(PaymentGatewayProvider.PAYPAL);
    case PaymentGatewayProvider.OFFLINE:
    default:
      return new MockPaymentGatewayAdapter(PaymentGatewayProvider.OFFLINE);
  }
}
