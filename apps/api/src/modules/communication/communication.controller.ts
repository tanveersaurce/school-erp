import { Request, Response, NextFunction } from 'express';
import {
  createSuccessResponse,
  AuthenticationError,
} from '@edusphere/common';
import { NotificationService } from './services/notification.service.js';
import { AnnouncementService } from './services/announcement.service.js';
import { TemplateService } from './services/template.service.js';
import { NotificationPreferenceService } from './services/notification-preference.service.js';
import { DeliveryQueueService } from './services/delivery-queue.service.js';
import { CommunicationJobService } from './services/communication-job.service.js';
import { CommunicationReportsService } from './services/communication-reports.service.js';
import {
  notificationQuerySchema,
  registerPushDeviceSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementQuerySchema,
  cancelAnnouncementSchema,
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
  updatePreferencesSchema,
  deliveryQuerySchema,
  createCommunicationJobSchema,
  jobQuerySchema,
} from './communication.validator.js';

export class CommunicationController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = (req.tenantContext?.tenantId || auth.tenantId).toString();
    const userId = auth.userId.toString();
    const schoolId =
      (req.query.schoolId as string) ||
      (req.body?.schoolId as string) ||
      (auth.schoolId ? auth.schoolId.toString() : undefined);
    const userRoles = auth.roles || [];
    return { auth, tenantId, userId, schoolId, userRoles };
  }

  private static reply(
    res: Response,
    req: Request,
    data: any,
    message = 'Operation completed successfully',
    status = 200
  ) {
    return res.status(status).json(
      createSuccessResponse(data, message, {
        requestId: (req as any).id,
      })
    );
  }

  // =========================================================================
  // 1. In-App Notifications
  // =========================================================================

  public static async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const query = notificationQuerySchema.parse(req.query);
      const result = await NotificationService.getUserNotifications(tenantId, userId, query);
      return CommunicationController.reply(res, req, result, 'User notifications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const unreadCount = await NotificationService.getUnreadCount(tenantId, userId);
      return CommunicationController.reply(res, req, { unreadCount }, 'Unread count retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const result = await NotificationService.markAsRead(tenantId, userId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  public static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const updatedCount = await NotificationService.markAllAsRead(tenantId, userId);
      return CommunicationController.reply(res, req, { updatedCount }, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      await NotificationService.deleteNotification(tenantId, userId, req.params.id);
      return CommunicationController.reply(res, req, { success: true }, 'Notification dismissed');
    } catch (error) {
      next(error);
    }
  }

  public static async registerPushDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const data = registerPushDeviceSchema.parse(req.body);
      await NotificationService.registerPushDevice(tenantId, userId, data);
      return CommunicationController.reply(res, req, { success: true }, 'Push device registered successfully');
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 2. Announcements
  // =========================================================================

  public static async getAnnouncementsForUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, userRoles } = CommunicationController.getAuth(req);
      const query = announcementQuerySchema.parse(req.query);
      const result = await AnnouncementService.getAnnouncementsForUser(
        tenantId,
        userId,
        userRoles,
        query
      );
      return CommunicationController.reply(res, req, result, 'Announcements retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getAnnouncementById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await AnnouncementService.getAnnouncementById(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Announcement details retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async listAllAnnouncements(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const query = announcementQuerySchema.parse(req.query);
      const result = await AnnouncementService.listAllAnnouncements(tenantId, query);
      return CommunicationController.reply(res, req, result, 'All announcements retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = CommunicationController.getAuth(req);
      const body = createAnnouncementSchema.parse({
        schoolId: schoolId || req.body.schoolId,
        ...req.body,
      });
      const result = await AnnouncementService.createAnnouncement(tenantId, userId, body);
      return CommunicationController.reply(res, req, result, 'Announcement created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async updateAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const body = updateAnnouncementSchema.parse(req.body);
      const result = await AnnouncementService.updateAnnouncement(tenantId, req.params.id, body);
      return CommunicationController.reply(res, req, result, 'Announcement updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async publishAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await AnnouncementService.publishAnnouncement(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Announcement published successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async cancelAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const body = cancelAnnouncementSchema.parse(req.body || {});
      const result = await AnnouncementService.cancelAnnouncement(tenantId, req.params.id, body.reason);
      return CommunicationController.reply(res, req, result, 'Announcement cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async archiveAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await AnnouncementService.archiveAnnouncement(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Announcement archived successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async acknowledgeAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const result = await AnnouncementService.acknowledgeAnnouncement(tenantId, req.params.id, userId);
      return CommunicationController.reply(res, req, result, 'Announcement acknowledged successfully');
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 3. Notification Templates
  // =========================================================================

  public static async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const query = templateQuerySchema.parse(req.query);
      const result = await TemplateService.listTemplates(tenantId, query);
      return CommunicationController.reply(res, req, result, 'Templates retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await TemplateService.getTemplateById(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Template retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const body = createTemplateSchema.parse(req.body);
      const result = await TemplateService.createTemplate(tenantId, userId, body);
      return CommunicationController.reply(res, req, result, 'Template created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const body = updateTemplateSchema.parse(req.body);
      const result = await TemplateService.updateTemplate(tenantId, req.params.id, body);
      return CommunicationController.reply(res, req, result, 'Template updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async publishTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await TemplateService.publishTemplate(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Template published successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async archiveTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await TemplateService.archiveTemplate(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Template archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 4. Notification Preferences
  // =========================================================================

  public static async getUserPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const result = await NotificationPreferenceService.getPreferences(tenantId, userId);
      return CommunicationController.reply(res, req, result, 'Preferences retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateUserPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = CommunicationController.getAuth(req);
      const body = updatePreferencesSchema.parse(req.body);
      const result = await NotificationPreferenceService.updatePreferences(tenantId, userId, body);
      return CommunicationController.reply(res, req, result, 'Preferences updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 5. Deliveries & Retries
  // =========================================================================

  public static async listDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const query = deliveryQuerySchema.parse(req.query);
      const result = await DeliveryQueueService.listDeliveries(tenantId, query);
      return CommunicationController.reply(res, req, result, 'Deliveries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async retryDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await DeliveryQueueService.retryDelivery(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Delivery retry initiated');
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6. Communication Jobs
  // =========================================================================

  public static async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const query = jobQuerySchema.parse(req.query);
      const result = await CommunicationJobService.getJobs(tenantId, query);
      return CommunicationController.reply(res, req, result, 'Communication jobs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await CommunicationJobService.getJobById(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Communication job retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = CommunicationController.getAuth(req);
      const body = createCommunicationJobSchema.parse({
        schoolId: schoolId || req.body.schoolId,
        ...req.body,
      });
      const result = await CommunicationJobService.createJob({
        tenantId,
        schoolId: body.schoolId,
        title: body.title,
        communicationType: body.communicationType,
        sourceEntity: body.sourceEntity,
        audienceDefinition: body.audienceDefinition,
        requestedChannels: body.requestedChannels,
        totalRecipients: body.totalRecipients || 1,
        createdBy: userId,
      });
      return CommunicationController.reply(res, req, result, 'Communication job created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async cancelJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = CommunicationController.getAuth(req);
      const result = await CommunicationJobService.cancelJob(tenantId, req.params.id);
      return CommunicationController.reply(res, req, result, 'Communication job cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 7. Dashboard & Analytics
  // =========================================================================

  public static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = CommunicationController.getAuth(req);
      const result = await CommunicationReportsService.getDashboardStats(tenantId, schoolId);
      return CommunicationController.reply(res, req, result, 'Communication stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
