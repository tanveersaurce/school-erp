import { Types } from 'mongoose';
import {
  NotificationPreference,
  INotificationPreferenceDoc,
} from '@edusphere/database';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '@edusphere/common';

export interface UpdatePreferenceInput {
  globalChannels?: {
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
  };
  categoryPreferences?: Array<{
    category: NotificationCategory;
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
  }>;
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
    timezone?: string;
  };
}

export class NotificationPreferenceService {
  /**
   * Retrieve user notification preferences or instantiate default preferences
   */
  public static async getPreferences(
    tenantId: string,
    userId: string
  ): Promise<INotificationPreferenceDoc> {
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(userId);

    let pref = await NotificationPreference.findOne({ tenantId: tId, userId: uId });
    if (!pref) {
      pref = await NotificationPreference.create({
        tenantId: tId,
        userId: uId,
        globalChannels: {
          inApp: true,
          email: true,
          sms: false,
          push: true,
          whatsapp: false,
        },
        categoryPreferences: [],
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00',
          timezone: 'Asia/Kolkata',
        },
      });
    }
    return pref;
  }

  /**
   * Update notification preferences
   */
  public static async updatePreferences(
    tenantId: string,
    userId: string,
    input: UpdatePreferenceInput
  ): Promise<INotificationPreferenceDoc> {
    const pref = await this.getPreferences(tenantId, userId);

    if (input.globalChannels) {
      pref.globalChannels = {
        inApp: input.globalChannels.inApp ?? pref.globalChannels.inApp,
        email: input.globalChannels.email ?? pref.globalChannels.email,
        sms: input.globalChannels.sms ?? pref.globalChannels.sms,
        push: input.globalChannels.push ?? pref.globalChannels.push,
        whatsapp: input.globalChannels.whatsapp ?? pref.globalChannels.whatsapp,
      };
    }

    if (input.categoryPreferences) {
      pref.categoryPreferences = input.categoryPreferences.map((cp) => ({
        category: cp.category,
        inApp: cp.inApp ?? true,
        email: cp.email ?? true,
        sms: cp.sms ?? false,
        push: cp.push ?? true,
        whatsapp: cp.whatsapp ?? false,
      }));
    }

    if (input.quietHours) {
      pref.quietHours = {
        enabled: input.quietHours.enabled ?? pref.quietHours.enabled,
        start: input.quietHours.start ?? pref.quietHours.start,
        end: input.quietHours.end ?? pref.quietHours.end,
        timezone: input.quietHours.timezone ?? pref.quietHours.timezone,
      };
    }

    await pref.save();
    return pref;
  }

  /**
   * Determine if a channel is allowed for a user given category and priority
   */
  public static async isChannelAllowed(
    tenantId: string,
    userId: string,
    category: NotificationCategory,
    channel: NotificationChannel,
    priority: NotificationPriority
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Security & Critical Alerts cannot be muted
    if (
      priority === NotificationPriority.URGENT ||
      category === NotificationCategory.SECURITY ||
      category === NotificationCategory.AUTHENTICATION
    ) {
      // In-app and Email are strictly enforced for critical alerts
      if (channel === NotificationChannel.IN_APP || channel === NotificationChannel.EMAIL) {
        return { allowed: true, reason: 'MANDATORY_CRITICAL_ALERT' };
      }
    }

    const pref = await this.getPreferences(tenantId, userId);

    // 2. Check category-specific override
    const catPref = pref.categoryPreferences?.find((cp) => cp.category === category);
    if (catPref) {
      switch (channel) {
        case NotificationChannel.IN_APP:
          if (!catPref.inApp) return { allowed: false, reason: 'CATEGORY_PREFERENCE_OFF' };
          break;
        case NotificationChannel.EMAIL:
          if (!catPref.email) return { allowed: false, reason: 'CATEGORY_PREFERENCE_OFF' };
          break;
        case NotificationChannel.SMS:
          if (!catPref.sms) return { allowed: false, reason: 'CATEGORY_PREFERENCE_OFF' };
          break;
        case NotificationChannel.PUSH:
          if (!catPref.push) return { allowed: false, reason: 'CATEGORY_PREFERENCE_OFF' };
          break;
        case NotificationChannel.WHATSAPP:
          if (!catPref.whatsapp) return { allowed: false, reason: 'CATEGORY_PREFERENCE_OFF' };
          break;
      }
    } else {
      // 3. Check global channel setting
      switch (channel) {
        case NotificationChannel.IN_APP:
          if (!pref.globalChannels.inApp) return { allowed: false, reason: 'GLOBAL_CHANNEL_OFF' };
          break;
        case NotificationChannel.EMAIL:
          if (!pref.globalChannels.email) return { allowed: false, reason: 'GLOBAL_CHANNEL_OFF' };
          break;
        case NotificationChannel.SMS:
          if (!pref.globalChannels.sms) return { allowed: false, reason: 'GLOBAL_CHANNEL_OFF' };
          break;
        case NotificationChannel.PUSH:
          if (!pref.globalChannels.push) return { allowed: false, reason: 'GLOBAL_CHANNEL_OFF' };
          break;
        case NotificationChannel.WHATSAPP:
          if (!pref.globalChannels.whatsapp) return { allowed: false, reason: 'GLOBAL_CHANNEL_OFF' };
          break;
      }
    }

    // 4. Quiet Hours Check (for non-urgent external channels)
    if (
      priority !== NotificationPriority.URGENT &&
      channel !== NotificationChannel.IN_APP &&
      pref.quietHours?.enabled
    ) {
      const isQuiet = this.isWithinQuietHours(pref.quietHours.start, pref.quietHours.end);
      if (isQuiet) {
        return { allowed: false, reason: 'QUIET_HOURS_ACTIVE' };
      }
    }

    return { allowed: true };
  }

  /**
   * Helper to evaluate if the current time is within quiet hours window
   */
  public static isWithinQuietHours(startTime: string, endTime: string): boolean {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Spans midnight (e.g. 22:00 to 07:00)
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch {
      return false;
    }
  }
}
