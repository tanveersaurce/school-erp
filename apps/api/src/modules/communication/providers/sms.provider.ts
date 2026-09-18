import {
  INotificationProvider,
  ProviderSendResult,
  ProviderCapabilities,
  SendPayload,
} from './notification-provider.interface.js';
import { NotificationChannel, DeliveryStatus } from '@edusphere/common';
import { logger } from '../../../core/logger/logger.js';

export interface DispatchedSmsRecord {
  to: string;
  recipientId: string;
  body: string;
  providerMessageId: string;
  sentAt: Date;
}

export class SmsNotificationProvider implements INotificationProvider {
  public name = 'DevSmsProvider';
  public channel = NotificationChannel.SMS;
  public dispatchedSms: DispatchedSmsRecord[] = [];

  public async send(payload: SendPayload): Promise<ProviderSendResult> {
    // E.164 format or minimum 10 digits
    const cleanPhone = (payload.to || '').replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        status: DeliveryStatus.FAILED,
        timestamp: new Date(),
        failureCode: 'INVALID_PHONE_NUMBER',
        failureReason: `Recipient phone number '${payload.to}' is invalid.`,
        retryable: false,
      };
    }

    const providerMessageId = `msg_sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const record: DispatchedSmsRecord = {
      to: cleanPhone,
      recipientId: payload.recipientId,
      body: payload.body,
      providerMessageId,
      sentAt: new Date(),
    };

    this.dispatchedSms.push(record);

    logger.info(
      {
        provider: this.name,
        recipient: cleanPhone,
        messageId: providerMessageId,
        length: payload.body.length,
      },
      '📱 [COMMUNICATION SMS DISPATCHED]'
    );

    return {
      providerMessageId,
      status: DeliveryStatus.DELIVERED,
      timestamp: new Date(),
      metadata: { to: cleanPhone },
    };
  }

  public async validateConfiguration(): Promise<boolean> {
    return true;
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      channel: NotificationChannel.SMS,
      supportsTemplates: true,
      supportsAttachments: false,
      supportsBulk: true,
    };
  }

  public clearHistory(): void {
    this.dispatchedSms = [];
  }
}

export const smsNotificationProvider = new SmsNotificationProvider();
