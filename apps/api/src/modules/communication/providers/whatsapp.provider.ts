import {
  INotificationProvider,
  ProviderSendResult,
  ProviderCapabilities,
  SendPayload,
} from './notification-provider.interface.js';
import { NotificationChannel, DeliveryStatus } from '@edusphere/common';
import { logger } from '../../../core/logger/logger.js';

export interface DispatchedWhatsAppRecord {
  to: string;
  recipientId: string;
  body: string;
  providerMessageId: string;
  sentAt: Date;
}

export class WhatsAppNotificationProvider implements INotificationProvider {
  public name = 'DevWhatsAppProvider';
  public channel = NotificationChannel.WHATSAPP;
  public dispatchedWhatsApp: DispatchedWhatsAppRecord[] = [];

  public async send(payload: SendPayload): Promise<ProviderSendResult> {
    const cleanPhone = (payload.to || '').replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        status: DeliveryStatus.FAILED,
        timestamp: new Date(),
        failureCode: 'INVALID_WHATSAPP_NUMBER',
        failureReason: `Recipient phone number '${payload.to}' is invalid for WhatsApp.`,
        retryable: false,
      };
    }

    const providerMessageId = `msg_wa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const record: DispatchedWhatsAppRecord = {
      to: cleanPhone,
      recipientId: payload.recipientId,
      body: payload.body,
      providerMessageId,
      sentAt: new Date(),
    };

    this.dispatchedWhatsApp.push(record);

    logger.info(
      {
        provider: this.name,
        recipient: cleanPhone,
        messageId: providerMessageId,
      },
      '💬 [COMMUNICATION WHATSAPP DISPATCHED]'
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
      channel: NotificationChannel.WHATSAPP,
      supportsTemplates: true,
      supportsAttachments: true,
      supportsBulk: false,
    };
  }

  public clearHistory(): void {
    this.dispatchedWhatsApp = [];
  }
}

export const whatsappNotificationProvider = new WhatsAppNotificationProvider();
