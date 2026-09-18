import {
  INotificationProvider,
  ProviderSendResult,
  ProviderCapabilities,
  SendPayload,
} from './notification-provider.interface.js';
import { NotificationChannel, DeliveryStatus } from '@edusphere/common';
import { logger } from '../../../core/logger/logger.js';

export interface DispatchedPushRecord {
  token: string;
  recipientId: string;
  title: string;
  body: string;
  providerMessageId: string;
  metadata?: Record<string, unknown>;
  sentAt: Date;
}

export class PushNotificationProvider implements INotificationProvider {
  public name = 'DevPushProvider';
  public channel = NotificationChannel.PUSH;
  public dispatchedPush: DispatchedPushRecord[] = [];

  public async send(payload: SendPayload): Promise<ProviderSendResult> {
    if (!payload.to || payload.to.trim().length === 0) {
      return {
        status: DeliveryStatus.FAILED,
        timestamp: new Date(),
        failureCode: 'MISSING_DEVICE_TOKEN',
        failureReason: 'Push device token is missing or empty.',
        retryable: false,
      };
    }

    const providerMessageId = `msg_push_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const record: DispatchedPushRecord = {
      token: payload.to,
      recipientId: payload.recipientId,
      title: payload.title || payload.subject || 'EduSphere ERP Notification',
      body: payload.body,
      providerMessageId,
      metadata: payload.metadata,
      sentAt: new Date(),
    };

    this.dispatchedPush.push(record);

    logger.info(
      {
        provider: this.name,
        deviceToken: payload.to.substring(0, 16) + '...',
        title: record.title,
        messageId: providerMessageId,
      },
      '🔔 [COMMUNICATION PUSH DISPATCHED]'
    );

    return {
      providerMessageId,
      status: DeliveryStatus.DELIVERED,
      timestamp: new Date(),
      metadata: { token: payload.to, title: record.title },
    };
  }

  public async validateConfiguration(): Promise<boolean> {
    return true;
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      channel: NotificationChannel.PUSH,
      supportsTemplates: true,
      supportsAttachments: false,
      supportsBulk: true,
    };
  }

  public clearHistory(): void {
    this.dispatchedPush = [];
  }
}

export const pushNotificationProvider = new PushNotificationProvider();
