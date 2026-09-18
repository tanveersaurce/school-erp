import {
  INotificationProvider,
  ProviderSendResult,
  ProviderCapabilities,
  SendPayload,
} from './notification-provider.interface.js';
import { NotificationChannel, DeliveryStatus } from '@edusphere/common';
import { logger } from '../../../core/logger/logger.js';
import { emailService } from '../../auth/email.service.js';

export interface DispatchedEmailRecord {
  to: string;
  recipientId: string;
  subject: string;
  body: string;
  providerMessageId: string;
  sentAt: Date;
}

export class EmailNotificationProvider implements INotificationProvider {
  public name = 'DevEmailProvider';
  public channel = NotificationChannel.EMAIL;
  public dispatchedEmails: DispatchedEmailRecord[] = [];

  public async send(payload: SendPayload): Promise<ProviderSendResult> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.to || !emailRegex.test(payload.to)) {
      return {
        status: DeliveryStatus.FAILED,
        timestamp: new Date(),
        failureCode: 'INVALID_EMAIL_ADDRESS',
        failureReason: `Recipient email '${payload.to}' is invalid.`,
        retryable: false,
      };
    }

    const providerMessageId = `msg_email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const record: DispatchedEmailRecord = {
      to: payload.to,
      recipientId: payload.recipientId,
      subject: payload.subject || payload.title || 'EduSphere ERP Notification',
      body: payload.body,
      providerMessageId,
      sentAt: new Date(),
    };

    this.dispatchedEmails.push(record);

    logger.info(
      {
        provider: this.name,
        recipient: payload.to,
        subject: record.subject,
        messageId: providerMessageId,
      },
      '📧 [COMMUNICATION EMAIL DISPATCHED]'
    );

    return {
      providerMessageId,
      status: DeliveryStatus.DELIVERED,
      timestamp: new Date(),
      metadata: { to: payload.to, subject: record.subject },
    };
  }

  public async validateConfiguration(): Promise<boolean> {
    return true; // Dev provider is always valid
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      channel: NotificationChannel.EMAIL,
      supportsTemplates: true,
      supportsAttachments: true,
      supportsBulk: true,
    };
  }

  public clearHistory(): void {
    this.dispatchedEmails = [];
  }
}

export const emailNotificationProvider = new EmailNotificationProvider();
