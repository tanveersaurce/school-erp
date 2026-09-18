import { Types } from 'mongoose';
import {
  Notification,
  NotificationDelivery,
  INotificationDeliveryDoc,
  User,
  PushDevice,
} from '@edusphere/database';
import {
  DeliveryStatus,
  NotificationStatus,
  NotificationChannel,
} from '@edusphere/common';
import { logger } from '../../../core/logger/logger.js';
import { providerRegistry } from '../providers/index.js';

export class DeliveryQueueService {
  private static MAX_RETRIES = 3;
  private static BASE_BACKOFF_MS = 30000; // 30 seconds

  /**
   * Enqueue and immediately attempt dispatch of a delivery record
   */
  public static async dispatchDelivery(deliveryId: string): Promise<INotificationDeliveryDoc> {
    const delivery = await NotificationDelivery.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery record '${deliveryId}' not found.`);
    }

    const provider = providerRegistry.getProvider(delivery.channel);
    if (!provider) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureCode = 'PROVIDER_UNAVAILABLE';
      delivery.failureReason = `No registered provider adapter for channel '${delivery.channel}'.`;
      delivery.failedAt = new Date();
      await delivery.save();
      await this.syncParentNotificationStatus(delivery.notificationId.toString());
      return delivery;
    }

    // Retrieve recipient contact detail based on channel
    const contact = await this.resolveRecipientContact(
      delivery.tenantId.toString(),
      delivery.recipientId.toString(),
      delivery.channel
    );

    if (!contact) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureCode = 'RECIPIENT_CONTACT_UNRESOLVABLE';
      delivery.failureReason = `Unable to resolve recipient address/number for channel '${delivery.channel}'.`;
      delivery.failedAt = new Date();
      await delivery.save();
      await this.syncParentNotificationStatus(delivery.notificationId.toString());
      return delivery;
    }

    // Retrieve parent notification content
    const notification = await Notification.findById(delivery.notificationId);
    if (!notification) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureCode = 'PARENT_NOTIFICATION_NOT_FOUND';
      delivery.failedAt = new Date();
      await delivery.save();
      return delivery;
    }

    delivery.attemptCount += 1;
    delivery.sentAt = new Date();

    try {
      const result = await provider.send({
        to: contact,
        recipientId: delivery.recipientId.toString(),
        title: notification.title,
        body: notification.body,
        metadata: {
          ...delivery.metadata,
          deepLink: notification.deepLink,
        },
      });

      if (result.status === DeliveryStatus.DELIVERED) {
        delivery.status = DeliveryStatus.DELIVERED;
        delivery.providerMessageId = result.providerMessageId;
        delivery.deliveredAt = result.timestamp;
        delivery.failureCode = undefined;
        delivery.failureReason = undefined;
        delivery.nextRetryAt = undefined;
      } else {
        await this.handleDeliveryFailure(delivery, result.failureCode, result.failureReason, result.retryable);
      }
    } catch (err) {
      await this.handleDeliveryFailure(
        delivery,
        'PROVIDER_EXCEPTION',
        (err as Error).message,
        true
      );
    }

    await delivery.save();
    await this.syncParentNotificationStatus(delivery.notificationId.toString());
    return delivery;
  }

  /**
   * Handle transient vs permanent failure and schedule exponential backoff retry
   */
  private static async handleDeliveryFailure(
    delivery: INotificationDeliveryDoc,
    code?: string,
    reason?: string,
    retryable = true
  ): Promise<void> {
    delivery.failureCode = code || 'DELIVERY_FAILED';
    delivery.failureReason = reason || 'Unknown delivery failure';

    if (retryable && delivery.attemptCount < this.MAX_RETRIES) {
      delivery.status = DeliveryStatus.FAILED;
      // Exponential backoff: 30s, 60s, 120s...
      const backoffMs = this.BASE_BACKOFF_MS * Math.pow(2, delivery.attemptCount - 1);
      delivery.nextRetryAt = new Date(Date.now() + backoffMs);
      logger.warn(
        {
          deliveryId: delivery._id,
          attempt: delivery.attemptCount,
          nextRetryAt: delivery.nextRetryAt,
          reason,
        },
        `⚠️ Delivery failed. Retry scheduled with exponential backoff.`
      );
    } else {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failedAt = new Date();
      delivery.nextRetryAt = undefined;
      logger.error(
        {
          deliveryId: delivery._id,
          attempt: delivery.attemptCount,
          reason,
        },
        `❌ Delivery permanently failed after max retries or permanent error code.`
      );
    }
  }

  /**
   * List delivery logs with filtering and pagination
   */
  public static async listDeliveries(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      status?: DeliveryStatus;
      channel?: NotificationChannel;
      notificationId?: string;
      recipientId?: string;
    }
  ): Promise<{ items: INotificationDeliveryDoc[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (params.status) {
      filter.status = params.status;
    }
    if (params.channel) {
      filter.channel = params.channel;
    }
    if (params.notificationId) {
      filter.notificationId = new Types.ObjectId(params.notificationId);
    }
    if (params.recipientId) {
      filter.recipientId = new Types.ObjectId(params.recipientId);
    }

    const [items, total] = await Promise.all([
      NotificationDelivery.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationDelivery.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Manually retry a failed delivery record
   */
  public static async retryDelivery(
    tenantId: string,
    deliveryId: string
  ): Promise<INotificationDeliveryDoc> {
    const delivery = await NotificationDelivery.findOne({
      _id: new Types.ObjectId(deliveryId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!delivery) {
      throw new Error(`Delivery record '${deliveryId}' not found.`);
    }

    delivery.nextRetryAt = undefined;
    await delivery.save();

    return this.dispatchDelivery(deliveryId);
  }

  /**
   * Process all pending retries currently due
   */
  public static async processPendingRetries(limit = 50): Promise<number> {
    const dueDeliveries = await NotificationDelivery.find({
      status: DeliveryStatus.FAILED,
      nextRetryAt: { $lte: new Date() },
    }).limit(limit);

    let processedCount = 0;
    for (const d of dueDeliveries) {
      await this.dispatchDelivery(d._id.toString());
      processedCount++;
    }
    return processedCount;
  }

  /**
   * Resolve recipient contact for the specific channel
   */
  private static async resolveRecipientContact(
    tenantId: string,
    userId: string,
    channel: NotificationChannel
  ): Promise<string | null> {
    if (channel === NotificationChannel.PUSH) {
      const device = await PushDevice.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
        isActive: true,
      }).sort({ lastSeenAt: -1 });
      return device ? device.token : null;
    }

    const user = await User.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!user) return null;

    switch (channel) {
      case NotificationChannel.EMAIL:
        return user.email || null;
      case NotificationChannel.SMS:
      case NotificationChannel.WHATSAPP:
        return user.phone || null;
      default:
        return null;
    }
  }

  /**
   * Aggregate child delivery statuses to parent notification status
   */
  public static async syncParentNotificationStatus(notificationId: string): Promise<void> {
    const notif = await Notification.findById(notificationId);
    if (!notif) return;

    const deliveries = await NotificationDelivery.find({
      notificationId: new Types.ObjectId(notificationId),
    });

    if (deliveries.length === 0) {
      // In-app only notification
      notif.status = NotificationStatus.DELIVERED;
      await notif.save();
      return;
    }

    const allDelivered = deliveries.every((d) => d.status === DeliveryStatus.DELIVERED);
    const anyDelivered = deliveries.some((d) => d.status === DeliveryStatus.DELIVERED);
    const allPermanentlyFailed = deliveries.every(
      (d) => d.status === DeliveryStatus.FAILED && !d.nextRetryAt
    );

    if (allDelivered) {
      notif.status = NotificationStatus.DELIVERED;
    } else if (anyDelivered) {
      notif.status = NotificationStatus.PARTIALLY_DELIVERED;
    } else if (allPermanentlyFailed) {
      notif.status = NotificationStatus.FAILED;
    } else {
      notif.status = NotificationStatus.PROCESSING;
    }

    await notif.save();
  }
}
