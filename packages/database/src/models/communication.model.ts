import { Schema, model, Types, Document } from 'mongoose';
import {
  IAnnouncement,
  IMessage,
  INotification,
  INotificationDelivery,
  INotificationTemplate,
  INotificationPreference,
  ICommunicationJob,
  IPushDevice,
} from '@edusphere/types';
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
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// ============================================================================
// Document Type Definitions
// ============================================================================
export interface IAnnouncementDoc
  extends Document,
    Omit<
      IAnnouncement,
      'id' | 'tenantId' | 'schoolId' | 'authorId'
    > {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  authorId: Types.ObjectId;
}

export interface INotificationDoc
  extends Document,
    Omit<INotification, 'id' | 'tenantId' | 'schoolId' | 'recipientId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  recipientId: Types.ObjectId;
}

export interface INotificationDeliveryDoc
  extends Document,
    Omit<INotificationDelivery, 'id' | 'tenantId' | 'notificationId' | 'recipientId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  notificationId: Types.ObjectId;
  recipientId: Types.ObjectId;
}

export interface INotificationTemplateDoc
  extends Document,
    Omit<INotificationTemplate, 'id' | 'tenantId' | 'createdBy' | 'updatedBy'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

export interface INotificationPreferenceDoc
  extends Document,
    Omit<INotificationPreference, 'id' | 'tenantId' | 'userId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
}

export interface ICommunicationJobDoc
  extends Document,
    Omit<ICommunicationJob, 'id' | 'tenantId' | 'schoolId' | 'createdBy'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
}

export interface IPushDeviceDoc
  extends Document,
    Omit<IPushDevice, 'id' | 'tenantId' | 'userId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
}

export interface IMessageDoc
  extends Document,
    Omit<IMessage, 'id' | 'tenantId' | 'senderId' | 'receiverId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
}

// ============================================================================
// 1. Announcement Schema
// ============================================================================
const AnnouncementSchema = new Schema<IAnnouncementDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(AnnouncementCategory),
      default: AnnouncementCategory.GENERAL,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AnnouncementStatus),
      default: AnnouncementStatus.DRAFT,
      required: true,
      index: true,
    },
    targetAudience: {
      type: Schema.Types.Mixed,
      default: { isAll: true },
    },
    channels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
        default: NotificationChannel.IN_APP,
      },
    ],
    publishedAt: { type: Date },
    publishAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date },
    attachments: [{ type: String }],
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    acknowledgementRequired: { type: Boolean, default: false },
    acknowledgements: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        acknowledgedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
AnnouncementSchema.plugin(tenantPlugin);
AnnouncementSchema.plugin(softDeletePlugin);
AnnouncementSchema.index({ tenantId: 1, schoolId: 1, status: 1, publishAt: -1 });
AnnouncementSchema.index({ tenantId: 1, status: 1, publishAt: 1 });

// ============================================================================
// 2. Notification Schema (In-App notification records)
// ============================================================================
const NotificationSchema = new Schema<INotificationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      default: NotificationCategory.SYSTEM,
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      required: true,
    },
    deepLink: { type: String },
    metadata: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    expiresAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.QUEUED,
      required: true,
      index: true,
    },
    sourceEntityType: { type: String },
    sourceEntityId: { type: String },
    deduplicationKey: { type: String, index: true },
    createdBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: '__v' }
);
NotificationSchema.plugin(tenantPlugin);
NotificationSchema.index({ tenantId: 1, recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, recipientId: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, deduplicationKey: 1 });
NotificationSchema.index({ tenantId: 1, category: 1, createdAt: -1 });

// ============================================================================
// 3. NotificationDelivery Schema (Per-channel delivery tracking)
// ============================================================================
const NotificationDeliverySchema = new Schema<INotificationDeliveryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
      index: true,
    },
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
      required: true,
      index: true,
    },
    attemptCount: { type: Number, default: 0 },
    providerMessageId: { type: String },
    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    nextRetryAt: { type: Date, index: true },
    failureCode: { type: String },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: '__v' }
);
NotificationDeliverySchema.plugin(tenantPlugin);
NotificationDeliverySchema.index({ notificationId: 1, channel: 1 });
NotificationDeliverySchema.index({ tenantId: 1, status: 1, nextRetryAt: 1 });
NotificationDeliverySchema.index({ tenantId: 1, channel: 1, createdAt: -1 });

// ============================================================================
// 4. NotificationTemplate Schema
// ============================================================================
const NotificationTemplateSchema = new Schema<INotificationTemplateDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    templateKey: { type: String, required: true, uppercase: true, trim: true, index: true },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      default: NotificationCategory.SYSTEM,
      required: true,
    },
    eventType: { type: String, required: true },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      default: NotificationChannel.IN_APP,
      required: true,
    },
    locale: { type: String, default: 'en-IN' },
    version: { type: Number, default: 1 },
    subject: { type: String },
    titleTemplate: { type: String, required: true },
    bodyTemplate: { type: String, required: true },
    variables: [{ type: String }],
    status: {
      type: String,
      enum: Object.values(TemplateStatus),
      default: TemplateStatus.ACTIVE,
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
NotificationTemplateSchema.plugin(tenantPlugin);
NotificationTemplateSchema.plugin(softDeletePlugin);
NotificationTemplateSchema.index(
  { tenantId: 1, templateKey: 1, channel: 1, locale: 1, version: -1 }
);

// ============================================================================
// 5. NotificationPreference Schema
// ============================================================================
const NotificationPreferenceSchema = new Schema<INotificationPreferenceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    globalChannels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },
    categoryPreferences: [
      {
        category: {
          type: String,
          enum: Object.values(NotificationCategory),
          required: true,
        },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
    ],
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
  },
  { timestamps: true, versionKey: '__v' }
);
NotificationPreferenceSchema.plugin(tenantPlugin);
NotificationPreferenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

// ============================================================================
// 6. CommunicationJob Schema (Asynchronous bulk operations)
// ============================================================================
const CommunicationJobSchema = new Schema<ICommunicationJobDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    title: { type: String, required: true, trim: true },
    communicationType: {
      type: String,
      enum: Object.values(CommunicationJobType),
      default: CommunicationJobType.BULK_COMMUNICATION,
      required: true,
    },
    sourceEntity: {
      entityType: { type: String },
      entityId: { type: Schema.Types.ObjectId },
    },
    audienceDefinition: { type: Schema.Types.Mixed },
    requestedChannels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
        required: true,
      },
    ],
    status: {
      type: String,
      enum: Object.values(CommunicationJobStatus),
      default: CommunicationJobStatus.QUEUED,
      required: true,
      index: true,
    },
    totalRecipients: { type: Number, default: 0 },
    processedRecipients: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    failureSummary: [{ type: String }],
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: '__v' }
);
CommunicationJobSchema.plugin(tenantPlugin);
CommunicationJobSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

// ============================================================================
// 7. PushDevice Schema (Mobile & Web push device registration)
// ============================================================================
const PushDeviceSchema = new Schema<IPushDeviceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: Object.values(PushPlatform),
      default: PushPlatform.WEB,
      required: true,
    },
    deviceName: { type: String },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: '__v' }
);
PushDeviceSchema.plugin(tenantPlugin);
PushDeviceSchema.index({ tenantId: 1, userId: 1, token: 1 }, { unique: true });

// ============================================================================
// 8. Legacy Message Schema
// ============================================================================
const MessageSchema = new Schema<IMessageDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, trim: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    attachments: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
MessageSchema.plugin(tenantPlugin);
MessageSchema.plugin(softDeletePlugin);
MessageSchema.index({ tenantId: 1, receiverId: 1, isRead: 1 });
MessageSchema.index({ tenantId: 1, senderId: 1, createdAt: -1 });

// ============================================================================
// Model Registrations & Exports
// ============================================================================
export const Announcement = model<IAnnouncementDoc>('Announcement', AnnouncementSchema);
export const Notification = model<INotificationDoc>('Notification', NotificationSchema);
export const NotificationDelivery = model<INotificationDeliveryDoc>(
  'NotificationDelivery',
  NotificationDeliverySchema
);
export const NotificationTemplate = model<INotificationTemplateDoc>(
  'NotificationTemplate',
  NotificationTemplateSchema
);
export const NotificationPreference = model<INotificationPreferenceDoc>(
  'NotificationPreference',
  NotificationPreferenceSchema
);
export const CommunicationJob = model<ICommunicationJobDoc>(
  'CommunicationJob',
  CommunicationJobSchema
);
export const PushDevice = model<IPushDeviceDoc>('PushDevice', PushDeviceSchema);
export const Message = model<IMessageDoc>('Message', MessageSchema);
