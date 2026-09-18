import { Types } from 'mongoose';
import {
  Notification,
  PushDevice,
  INotificationDoc,
} from '@edusphere/database';
import { PushPlatform, NotFoundError, AuthorizationError } from '@edusphere/common';

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  unreadOnly?: boolean;
  search?: string;
}

export class NotificationService {
  /**
   * Get user notifications with filtering, search, and pagination
   */
  public static async getUserNotifications(
    tenantId: string,
    userId: string,
    params: NotificationQueryParams
  ): Promise<{ items: INotificationDoc[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      recipientId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    };

    if (params.unreadOnly) {
      filter.isRead = false;
    }

    if (params.category) {
      filter.category = params.category;
    }

    if (params.search && params.search.trim()) {
      filter.$or = [
        { title: { $regex: params.search.trim(), $options: 'i' } },
        { body: { $regex: params.search.trim(), $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Get unread notifications counter for header bell badge
   */
  public static async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return Notification.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      recipientId: new Types.ObjectId(userId),
      isRead: false,
      isDeleted: { $ne: true },
    });
  }

  /**
   * Mark a notification as read (Anti-IDOR protected)
   */
  public static async markAsRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<INotificationDoc> {
    const notif = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });

    if (!notif) {
      throw new NotFoundError('Notification not found.');
    }

    // Anti-IDOR check: user must be the recipient
    if (notif.recipientId.toString() !== userId) {
      throw new AuthorizationError('You are not authorized to access this notification.');
    }

    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();
    return notif;
  }

  /**
   * Mark all unread notifications for a user as read
   */
  public static async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        recipientId: new Types.ObjectId(userId),
        isRead: false,
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Soft delete or dismiss a notification
   */
  public static async deleteNotification(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<void> {
    const notif = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!notif) {
      throw new NotFoundError('Notification not found.');
    }

    if (notif.recipientId.toString() !== userId) {
      throw new AuthorizationError('You are not authorized to delete this notification.');
    }

    notif.isDeleted = true;
    await notif.save();
  }

  /**
   * Register push device token
   */
  public static async registerPushDevice(
    tenantId: string,
    userId: string,
    data: { token: string; platform: PushPlatform; deviceName?: string }
  ): Promise<void> {
    await PushDevice.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
        token: data.token.trim(),
      },
      {
        $set: {
          platform: data.platform,
          deviceName: data.deviceName,
          isActive: true,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }
}
