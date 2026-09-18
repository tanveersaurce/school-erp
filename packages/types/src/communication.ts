import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  DeliveryStatus,
  TemplateStatus,
  AnnouncementStatus,
  AnnouncementCategory,
  CommunicationJobType,
  CommunicationJobStatus,
  PushPlatform,
} from '@edusphere/common';

// Backwards compatibility legacy aliases
export type TargetAudience = 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

// ============================================================================
// 1. Domain Event Definition
// ============================================================================
export interface IDomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  sourceEntityType: string;
  sourceEntityId: string;
  occurredAt: Date;
  correlationId?: string;
  version: number;
  payload: T;
}

// ============================================================================
// 2. Notification Model
// ============================================================================
export interface INotification {
  id: string;
  tenantId: string;
  schoolId?: string;
  recipientId: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  deepLink?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  expiresAt?: Date;
  status: NotificationStatus;
  sourceEntityType?: string;
  sourceEntityId?: string;
  deduplicationKey?: string;
  createdBy?: string;
  isDeleted?: boolean;
  createdAt: Date;
}

// ============================================================================
// 3. Notification Delivery (Per-channel tracking)
// ============================================================================
export interface INotificationDelivery {
  id: string;
  tenantId: string;
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  provider: string;
  status: DeliveryStatus;
  attemptCount: number;
  providerMessageId?: string;
  queuedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  nextRetryAt?: Date;
  failureCode?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 4. Notification Template
// ============================================================================
export interface INotificationTemplate {
  id: string;
  tenantId: string;
  templateKey: string;
  category: NotificationCategory;
  eventType: string;
  channel: NotificationChannel;
  locale: string;
  version: number;
  subject?: string;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  status: TemplateStatus;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 5. Notification Preferences & Quiet Hours
// ============================================================================
export interface ICategoryPreference {
  category: NotificationCategory;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
}

export interface INotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  globalChannels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  categoryPreferences: ICategoryPreference[];
  quietHours: {
    enabled: boolean;
    start: string; // e.g., "22:00"
    end: string;   // e.g., "07:00"
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 6. Announcements & Targeted Audience
// ============================================================================
export interface IAnnouncementAudience {
  isAll?: boolean;
  roles?: string[];
  classIds?: string[];
  sectionIds?: string[];
  campusIds?: string[];
  specificUserIds?: string[];
}

export interface IAnnouncementAcknowledgement {
  userId: string;
  acknowledgedAt: Date;
}

export interface IAnnouncement {
  id: string;
  tenantId: string;
  schoolId: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: NotificationPriority;
  status: AnnouncementStatus;
  targetAudience: IAnnouncementAudience;
  channels: NotificationChannel[];
  publishedAt?: Date;
  publishAt?: Date;
  expiresAt?: Date;
  attachments: string[];
  authorId: string;
  acknowledgementRequired: boolean;
  acknowledgements?: IAnnouncementAcknowledgement[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 7. Bulk Communication Jobs
// ============================================================================
export interface ICommunicationJob {
  id: string;
  tenantId: string;
  schoolId?: string;
  title: string;
  communicationType: CommunicationJobType;
  sourceEntity?: {
    entityType: string;
    entityId: string;
  };
  audienceDefinition?: IAnnouncementAudience;
  requestedChannels: NotificationChannel[];
  status: CommunicationJobStatus;
  totalRecipients: number;
  processedRecipients: number;
  successCount: number;
  failureCount: number;
  failureSummary?: string[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 8. Push Device Token Registration
// ============================================================================
export interface IPushDevice {
  id: string;
  tenantId: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 9. Provider Abstraction Contract
// ============================================================================
export interface ProviderSendResult {
  providerMessageId?: string;
  status: DeliveryStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  failureCode?: string;
  failureReason?: string;
  retryable?: boolean;
}

export interface ProviderCapabilities {
  channel: NotificationChannel;
  supportsTemplates: boolean;
  supportsAttachments: boolean;
  supportsBulk: boolean;
}

export interface INotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(payload: {
    to: string;
    recipientId: string;
    subject?: string;
    title?: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProviderSendResult>;
  validateConfiguration(): Promise<boolean>;
  getCapabilities(): ProviderCapabilities;
}

// ============================================================================
// 10. Dashboard & Analytics Stats
// ============================================================================
export interface ICommunicationDashboardStats {
  totalNotificationsSent: number;
  unreadNotificationsCount: number;
  deliveryRatePercentage: number;
  channelBreakdown: Record<string, number>;
  failedDeliveriesCount: number;
  activeAnnouncementsCount: number;
  pendingQueueDepth: number;
}

// ============================================================================
// 11. Legacy Message Interface
// ============================================================================
export interface IMessage {
  id: string;
  tenantId: string;
  senderId: string;
  receiverId: string;
  subject?: string;
  content: string;
  isRead: boolean;
  readAt?: Date;
  attachments: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
