import { Types } from 'mongoose';
import {
  Notification,
  NotificationDelivery,
  NotificationTemplate,
  INotificationDoc,
} from '@edusphere/database';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  DeliveryStatus,
  TemplateStatus,
} from '@edusphere/common';
import { IDomainEvent } from '@edusphere/types';
import { TemplateEngine } from './template-engine.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { DeliveryQueueService } from './delivery-queue.service.js';
import { eventBus } from '../events/event-bus.js';
import { logger } from '../../../core/logger/logger.js';

export interface ResolveNotificationInput {
  tenantId: string;
  schoolId?: string;
  recipientId: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  body: string;
  priority?: NotificationPriority;
  deepLink?: string;
  metadata?: Record<string, any>;
  sourceEntityType?: string;
  sourceEntityId?: string;
  deduplicationKey?: string;
  createdBy?: string;
  targetChannels?: NotificationChannel[];
  variables?: Record<string, any>;
}

export class NotificationResolverService {
  /**
   * Resolve and dispatch a notification to a specific recipient across eligible channels
   */
  public static async resolveAndSend(
    input: ResolveNotificationInput
  ): Promise<INotificationDoc | null> {
    const tId = new Types.ObjectId(input.tenantId);
    const uId = new Types.ObjectId(input.recipientId);
    const priority = input.priority || NotificationPriority.NORMAL;

    // 1. Idempotency Deduplication Check
    const dedupKey =
      input.deduplicationKey ||
      `${input.tenantId}:${input.eventType}:${input.sourceEntityId || 'global'}:${input.recipientId}`;

    const existing = await Notification.findOne({
      tenantId: tId,
      deduplicationKey: dedupKey,
    });

    if (existing) {
      logger.debug(
        { dedupKey, notifId: existing._id },
        '🔁 Idempotent event duplicate suppressed; notification already created.'
      );
      return existing;
    }

    // 2. Check for custom active template for this event type
    const template = await NotificationTemplate.findOne({
      tenantId: tId,
      eventType: input.eventType,
      status: TemplateStatus.ACTIVE,
    }).sort({ version: -1 });

    let finalTitle = input.title;
    let finalBody = input.body;

    if (template) {
      finalTitle = TemplateEngine.render(template.titleTemplate, input.variables || input.metadata || {});
      finalBody = TemplateEngine.render(template.bodyTemplate, input.variables || input.metadata || {});
    }

    // 3. Create parent Notification record (In-App delivery)
    const notification = await Notification.create({
      tenantId: tId,
      schoolId: input.schoolId ? new Types.ObjectId(input.schoolId) : undefined,
      recipientId: uId,
      category: input.category,
      eventType: input.eventType,
      title: finalTitle,
      body: finalBody,
      priority,
      deepLink: input.deepLink,
      metadata: input.metadata,
      isRead: false,
      status: NotificationStatus.DELIVERED, // In-app is delivered upon record creation
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      deduplicationKey: dedupKey,
      createdBy: input.createdBy,
    });

    // 4. Resolve external channels
    const candidateChannels = input.targetChannels || [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
      NotificationChannel.PUSH,
    ];

    const externalChannels = candidateChannels.filter((c) => c !== NotificationChannel.IN_APP);

    for (const channel of externalChannels) {
      const allowed = await NotificationPreferenceService.isChannelAllowed(
        input.tenantId,
        input.recipientId,
        input.category,
        channel,
        priority
      );

      if (!allowed.allowed) {
        logger.debug(
          { recipientId: input.recipientId, channel, reason: allowed.reason },
          'Channel delivery skipped per user preferences or quiet hours.'
        );
        continue;
      }

      // Create Delivery Record
      const delivery = await NotificationDelivery.create({
        tenantId: tId,
        notificationId: notification._id,
        recipientId: uId,
        channel,
        provider: 'SystemDefault',
        status: DeliveryStatus.PENDING,
        attemptCount: 0,
        queuedAt: new Date(),
        metadata: input.metadata,
      });

      // Dispatch delivery
      try {
        await DeliveryQueueService.dispatchDelivery(delivery._id.toString());
      } catch (err) {
        logger.error({ err: (err as Error).message }, 'Failed delivery dispatch');
      }
    }

    return notification;
  }

  /**
   * Register domain event subscribers on the EventBus
   */
  public static registerEventSubscribers(): void {
    // Attendance Events
    eventBus.subscribe('attendance.low', async (event: IDomainEvent<any>) => {
      if (!event.payload?.studentUserId) return;
      await this.resolveAndSend({
        tenantId: event.tenantId,
        schoolId: event.schoolId,
        recipientId: event.payload.studentUserId,
        category: NotificationCategory.ATTENDANCE,
        eventType: event.eventType,
        title: 'Low Attendance Warning',
        body: `Attendance for ${event.payload.studentName || 'Student'} is at ${event.payload.percentage || 0}%, below the required 75%.`,
        priority: NotificationPriority.HIGH,
        deepLink: '/attendance',
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
        metadata: event.payload,
      });
    });

    // Homework Events
    eventBus.subscribe('homework.published', async (event: IDomainEvent<any>) => {
      const studentUserIds = event.payload?.studentUserIds || [];
      for (const studentId of studentUserIds) {
        await this.resolveAndSend({
          tenantId: event.tenantId,
          schoolId: event.schoolId,
          recipientId: studentId,
          category: NotificationCategory.HOMEWORK,
          eventType: event.eventType,
          title: `New Homework: ${event.payload.title || 'Assignment'}`,
          body: `Due date: ${event.payload.dueDate ? new Date(event.payload.dueDate).toLocaleDateString() : 'Upcoming'}.`,
          priority: NotificationPriority.NORMAL,
          deepLink: `/assignments`,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          metadata: event.payload,
        });
      }
    });

    // Fee Invoice Events
    eventBus.subscribe('fee.invoice_created', async (event: IDomainEvent<any>) => {
      if (!event.payload?.recipientUserId) return;
      await this.resolveAndSend({
        tenantId: event.tenantId,
        schoolId: event.schoolId,
        recipientId: event.payload.recipientUserId,
        category: NotificationCategory.FEES,
        eventType: event.eventType,
        title: 'Tuition Fee Invoice Generated',
        body: `Invoice ${event.payload.invoiceNumber || ''} for ${event.payload.studentName || 'Student'} is ready for payment.`,
        priority: NotificationPriority.NORMAL,
        deepLink: '/finance',
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
        metadata: event.payload,
      });
    });

    // Exam Results Events
    eventBus.subscribe('exam.results_published', async (event: IDomainEvent<any>) => {
      const recipients = event.payload?.recipients || [];
      for (const recId of recipients) {
        await this.resolveAndSend({
          tenantId: event.tenantId,
          schoolId: event.schoolId,
          recipientId: recId,
          category: NotificationCategory.RESULTS,
          eventType: event.eventType,
          title: `Exam Results Published: ${event.payload.examName || 'Term Exam'}`,
          body: 'Your term grade report card has been approved and published.',
          priority: NotificationPriority.NORMAL,
          deepLink: '/examinations',
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          metadata: event.payload,
        });
      }
    });

    // Inventory Low Stock Events
    eventBus.subscribe('inventory.low_stock', async (event: IDomainEvent<any>) => {
      if (!event.payload?.managerUserId) return;
      await this.resolveAndSend({
        tenantId: event.tenantId,
        schoolId: event.schoolId,
        recipientId: event.payload.managerUserId,
        category: NotificationCategory.INVENTORY,
        eventType: event.eventType,
        title: `Low Stock Alert: ${event.payload.itemName || 'Inventory Item'}`,
        body: `Current quantity on hand (${event.payload.quantityOnHand}) is below the reorder point (${event.payload.reorderLevel}).`,
        priority: NotificationPriority.HIGH,
        deepLink: '/inventory/stock',
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
        metadata: event.payload,
      });
    });

    logger.info('🔔 [NotificationResolverService] Domain event listeners initialized.');
  }
}
