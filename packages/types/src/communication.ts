export type TargetAudience = 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export interface IAnnouncement {
  id: string;
  tenantId: string;
  schoolId: string;
  title: string;
  content: string;
  targetAudience: TargetAudience[];
  priority: AnnouncementPriority;
  publishedAt?: Date;
  expiresAt?: Date;
  attachments: string[];
  authorId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface INotification {
  id: string;
  tenantId: string;
  recipientId: string;
  title: string;
  body: string;
  type: NotificationType;
  channel: NotificationChannel;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface INotificationTemplate {
  id: string;
  tenantId: string;
  code: string;
  titleTemplate: string;
  bodyTemplate: string;
  channel: NotificationChannel;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
