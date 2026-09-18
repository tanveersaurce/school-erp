import {
  INotificationProvider,
  ProviderSendResult,
  ProviderCapabilities,
} from '@edusphere/types';
import { NotificationChannel } from '@edusphere/common';

export type { INotificationProvider, ProviderSendResult, ProviderCapabilities };

export interface SendPayload {
  to: string;
  recipientId: string;
  subject?: string;
  title?: string;
  body: string;
  metadata?: Record<string, unknown>;
}
