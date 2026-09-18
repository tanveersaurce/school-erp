import { Types } from 'mongoose';
import {
  Notification,
  NotificationDelivery,
  Announcement,
} from '@edusphere/database';
import {
  DeliveryStatus,
  AnnouncementStatus,
  NotificationChannel,
} from '@edusphere/common';
import { ICommunicationDashboardStats } from '@edusphere/types';

export class CommunicationReportsService {
  /**
   * Aggregate executive dashboard metrics for communication and notifications
   */
  public static async getDashboardStats(
    tenantId: string,
    schoolId?: string
  ): Promise<ICommunicationDashboardStats> {
    const tId = new Types.ObjectId(tenantId);
    const filter: any = { tenantId: tId };
    if (schoolId) {
      filter.schoolId = new Types.ObjectId(schoolId);
    }

    const [
      totalNotificationsSent,
      unreadNotificationsCount,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveriesCount,
      pendingDeliveriesCount,
      activeAnnouncementsCount,
      channelStats,
    ] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
      NotificationDelivery.countDocuments({ tenantId: tId }),
      NotificationDelivery.countDocuments({ tenantId: tId, status: DeliveryStatus.DELIVERED }),
      NotificationDelivery.countDocuments({ tenantId: tId, status: DeliveryStatus.FAILED }),
      NotificationDelivery.countDocuments({ tenantId: tId, status: DeliveryStatus.PENDING }),
      Announcement.countDocuments({
        tenantId: tId,
        status: AnnouncementStatus.PUBLISHED,
        isDeleted: { $ne: true },
      }),
      NotificationDelivery.aggregate([
        { $match: { tenantId: tId } },
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
    ]);

    const channelBreakdown: Record<string, number> = {
      [NotificationChannel.IN_APP]: 0,
      [NotificationChannel.EMAIL]: 0,
      [NotificationChannel.SMS]: 0,
      [NotificationChannel.PUSH]: 0,
      [NotificationChannel.WHATSAPP]: 0,
    };

    for (const item of channelStats) {
      if (item._id) {
        channelBreakdown[item._id] = item.count;
      }
    }

    const deliveryRatePercentage =
      totalDeliveries > 0
        ? Math.round((successfulDeliveries / totalDeliveries) * 100)
        : 100;

    return {
      totalNotificationsSent,
      unreadNotificationsCount,
      deliveryRatePercentage,
      channelBreakdown,
      failedDeliveriesCount,
      activeAnnouncementsCount,
      pendingQueueDepth: pendingDeliveriesCount,
    };
  }
}
