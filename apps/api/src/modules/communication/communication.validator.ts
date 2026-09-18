import { z } from 'zod';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  TemplateStatus,
  AnnouncementStatus,
  AnnouncementCategory,
  CommunicationJobType,
  CommunicationJobStatus,
  DeliveryStatus,
  PushPlatform,
} from '@edusphere/common';

// ============================================================================
// 1. Notification Schemas
// ============================================================================

export const notificationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.nativeEnum(NotificationCategory).optional(),
  unreadOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  search: z.string().optional(),
});

export const registerPushDeviceSchema = z.object({
  token: z.string().min(1, 'Device token is required').trim(),
  platform: z.nativeEnum(PushPlatform).default(PushPlatform.WEB),
  deviceName: z.string().optional(),
});

// ============================================================================
// 2. Announcement Schemas
// ============================================================================

export const announcementAudienceSchema = z.object({
  all: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  sections: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  campuses: z.array(z.string()).optional(),
  specificUserIds: z.array(z.string()).optional(),
});

export const createAnnouncementSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  title: z.string().min(1, 'Title is required').max(255).trim(),
  content: z.string().min(1, 'Content is required').trim(),
  category: z.nativeEnum(AnnouncementCategory).default(AnnouncementCategory.GENERAL),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  targetAudience: announcementAudienceSchema.optional(),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  publishAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  attachments: z.array(z.string()).optional(),
  acknowledgementRequired: z.boolean().default(false),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const announcementQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  schoolId: z.string().optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  category: z.nativeEnum(AnnouncementCategory).optional(),
  search: z.string().optional(),
});

export const cancelAnnouncementSchema = z.object({
  reason: z.string().optional(),
});

// ============================================================================
// 3. Template Schemas
// ============================================================================

export const createTemplateSchema = z.object({
  templateKey: z.string().min(1, 'Template key is required').trim(),
  category: z.nativeEnum(NotificationCategory),
  eventType: z.string().min(1, 'Event type is required').trim(),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.IN_APP),
  locale: z.string().default('en-IN'),
  subject: z.string().optional(),
  titleTemplate: z.string().min(1, 'Title template is required').trim(),
  bodyTemplate: z.string().min(1, 'Body template is required').trim(),
  variables: z.array(z.string()).optional(),
  status: z.nativeEnum(TemplateStatus).default(TemplateStatus.DRAFT),
});

export const updateTemplateSchema = z.object({
  subject: z.string().optional(),
  titleTemplate: z.string().optional(),
  bodyTemplate: z.string().optional(),
  variables: z.array(z.string()).optional(),
  status: z.nativeEnum(TemplateStatus).optional(),
});

export const templateQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.nativeEnum(NotificationCategory).optional(),
  eventType: z.string().optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  status: z.nativeEnum(TemplateStatus).optional(),
  search: z.string().optional(),
});

// ============================================================================
// 4. Preference Schemas
// ============================================================================

const channelPreferencesSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
});

export const updatePreferencesSchema = z.object({
  globalChannels: channelPreferencesSchema.optional(),
  categoryPreferences: z
    .array(
      z.object({
        category: z.nativeEnum(NotificationCategory),
        inApp: z.boolean().optional(),
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        push: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
      })
    )
    .optional(),
  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm').optional(),
      end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm').optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

// ============================================================================
// 5. Delivery Schemas
// ============================================================================

export const deliveryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(DeliveryStatus).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  notificationId: z.string().optional(),
  recipientId: z.string().optional(),
});

// ============================================================================
// 6. Communication Job Schemas
// ============================================================================

export const createCommunicationJobSchema = z.object({
  schoolId: z.string().optional(),
  title: z.string().min(1, 'Job title is required').trim(),
  communicationType: z.nativeEnum(CommunicationJobType),
  sourceEntity: z
    .object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
    })
    .optional(),
  audienceDefinition: announcementAudienceSchema.optional(),
  requestedChannels: z.array(z.nativeEnum(NotificationChannel)).min(1, 'At least one channel required'),
  totalRecipients: z.number().int().min(1, 'Total recipients must be at least 1').optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(CommunicationJobStatus).optional(),
  communicationType: z.nativeEnum(CommunicationJobType).optional(),
});
