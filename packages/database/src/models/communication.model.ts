import { Schema, model, Types } from 'mongoose';
import {
  IAnnouncement,
  IMessage,
  INotification,
  INotificationTemplate,
  INotificationPreference,
  TargetAudience,
  AnnouncementPriority,
  NotificationType,
  NotificationChannel,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IAnnouncementDoc extends Omit<
  IAnnouncement,
  'id' | 'tenantId' | 'schoolId' | 'authorId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  authorId: Types.ObjectId;
}

export interface IMessageDoc extends Omit<IMessage, 'id' | 'tenantId' | 'senderId' | 'receiverId'> {
  tenantId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
}

export interface INotificationDoc extends Omit<INotification, 'id' | 'tenantId' | 'recipientId'> {
  tenantId: Types.ObjectId;
  recipientId: Types.ObjectId;
}

export interface INotificationTemplateDoc extends Omit<INotificationTemplate, 'id' | 'tenantId'> {
  tenantId: Types.ObjectId;
}

export interface INotificationPreferenceDoc extends Omit<
  INotificationPreference,
  'id' | 'tenantId' | 'userId'
> {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
}

// 1. Announcement Schema
const AnnouncementSchema = new Schema<IAnnouncementDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetAudience: [
      {
        type: String,
        enum: ['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF'] as TargetAudience[],
        required: true,
      },
    ],
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as AnnouncementPriority[],
      default: 'NORMAL',
      required: true,
    },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    attachments: [{ type: String }],
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
AnnouncementSchema.plugin(tenantPlugin);
AnnouncementSchema.plugin(softDeletePlugin);
AnnouncementSchema.index({ tenantId: 1, schoolId: 1, publishedAt: -1 });

// 2. Message Schema
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

// 3. Notification Schema
const NotificationSchema = new Schema<INotificationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'ALERT', 'SUCCESS'] as NotificationType[],
      default: 'INFO',
      required: true,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'] as NotificationChannel[],
      default: 'IN_APP',
      required: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: '__v' }
);
NotificationSchema.plugin(tenantPlugin);
NotificationSchema.index({ tenantId: 1, recipientId: 1, isRead: 1, createdAt: -1 });

// 4. NotificationTemplate Schema
const NotificationTemplateSchema = new Schema<INotificationTemplateDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    titleTemplate: { type: String, required: true },
    bodyTemplate: { type: String, required: true },
    channel: {
      type: String,
      enum: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'] as NotificationChannel[],
      default: 'IN_APP',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
NotificationTemplateSchema.plugin(tenantPlugin);
NotificationTemplateSchema.plugin(softDeletePlugin);
NotificationTemplateSchema.index({ tenantId: 1, code: 1 }, { unique: true });

// 5. NotificationPreference Schema
const NotificationPreferenceSchema = new Schema<INotificationPreferenceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    pushEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: '__v' }
);
NotificationPreferenceSchema.plugin(tenantPlugin);
NotificationPreferenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export const Announcement = model<IAnnouncementDoc>('Announcement', AnnouncementSchema);
export const Message = model<IMessageDoc>('Message', MessageSchema);
export const Notification = model<INotificationDoc>('Notification', NotificationSchema);
export const NotificationTemplate = model<INotificationTemplateDoc>(
  'NotificationTemplate',
  NotificationTemplateSchema
);
export const NotificationPreference = model<INotificationPreferenceDoc>(
  'NotificationPreference',
  NotificationPreferenceSchema
);
