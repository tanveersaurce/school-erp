import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission, requireAnyPermission } from '../../middlewares/authorize.js';
import { CommunicationController } from './communication.controller.js';

export const communicationRouter = Router();
export const notificationRouter = Router();

// All communication and notification endpoints require authentication
communicationRouter.use(authenticate);
notificationRouter.use(authenticate);

// ============================================================================
// 1. In-App Notifications (Dedicated Router /notifications)
// ============================================================================
notificationRouter.get(
  '/',
  requireAnyPermission(['notification:read', 'notification:manage']),
  CommunicationController.getUserNotifications
);
notificationRouter.get(
  '/unread-count',
  requireAnyPermission(['notification:read', 'notification:manage']),
  CommunicationController.getUnreadCount
);
notificationRouter.patch(
  '/:id/read',
  requireAnyPermission(['notification:read', 'notification:manage']),
  CommunicationController.markAsRead
);
notificationRouter.post(
  '/mark-all-read',
  requireAnyPermission(['notification:read', 'notification:manage']),
  CommunicationController.markAllAsRead
);
notificationRouter.delete(
  '/:id',
  requireAnyPermission(['notification:read', 'notification:manage']),
  CommunicationController.deleteNotification
);
notificationRouter.post(
  '/push-devices',
  requireAnyPermission(['notification:read', 'notification:manage']),
  CommunicationController.registerPushDevice
);

// Also mount notifications under /communication/notifications
communicationRouter.use('/notifications', notificationRouter);

// ============================================================================
// 2. Announcements
// ============================================================================
communicationRouter.get(
  '/announcements',
  requireAnyPermission(['announcement:read', 'announcement:create', 'announcement:publish']),
  CommunicationController.getAnnouncementsForUser
);
communicationRouter.get(
  '/announcements/manage',
  requireAnyPermission(['announcement:create', 'announcement:publish', 'announcement:update']),
  CommunicationController.listAllAnnouncements
);
communicationRouter.get(
  '/announcements/:id',
  requireAnyPermission(['announcement:read', 'announcement:create', 'announcement:publish']),
  CommunicationController.getAnnouncementById
);
communicationRouter.post(
  '/announcements',
  requireAnyPermission(['announcement:create', 'announcement:publish']),
  CommunicationController.createAnnouncement
);
communicationRouter.put(
  '/announcements/:id',
  requireAnyPermission(['announcement:update', 'announcement:publish']),
  CommunicationController.updateAnnouncement
);
communicationRouter.post(
  '/announcements/:id/publish',
  requirePermission('announcement:publish'),
  CommunicationController.publishAnnouncement
);
communicationRouter.post(
  '/announcements/:id/cancel',
  requireAnyPermission(['announcement:cancel', 'announcement:publish']),
  CommunicationController.cancelAnnouncement
);
communicationRouter.post(
  '/announcements/:id/archive',
  requireAnyPermission(['announcement:archive', 'announcement:publish']),
  CommunicationController.archiveAnnouncement
);
communicationRouter.post(
  '/announcements/:id/acknowledge',
  requirePermission('announcement:read'),
  CommunicationController.acknowledgeAnnouncement
);

// ============================================================================
// 3. Notification Templates
// ============================================================================
communicationRouter.get(
  '/templates',
  requirePermission('notification_template:read'),
  CommunicationController.listTemplates
);
communicationRouter.get(
  '/templates/:id',
  requirePermission('notification_template:read'),
  CommunicationController.getTemplateById
);
communicationRouter.post(
  '/templates',
  requirePermission('notification_template:create'),
  CommunicationController.createTemplate
);
communicationRouter.put(
  '/templates/:id',
  requirePermission('notification_template:update'),
  CommunicationController.updateTemplate
);
communicationRouter.post(
  '/templates/:id/publish',
  requirePermission('notification_template:publish'),
  CommunicationController.publishTemplate
);
communicationRouter.post(
  '/templates/:id/archive',
  requirePermission('notification_template:archive'),
  CommunicationController.archiveTemplate
);

// ============================================================================
// 4. Notification Preferences
// ============================================================================
communicationRouter.get(
  '/preferences',
  requirePermission('notification_preference:read'),
  CommunicationController.getUserPreferences
);
communicationRouter.put(
  '/preferences',
  requirePermission('notification_preference:update'),
  CommunicationController.updateUserPreferences
);

// ============================================================================
// 5. Deliveries & Retries
// ============================================================================
communicationRouter.get(
  '/deliveries',
  requirePermission('notification_delivery:read'),
  CommunicationController.listDeliveries
);
communicationRouter.post(
  '/deliveries/:id/retry',
  requirePermission('notification_delivery:retry'),
  CommunicationController.retryDelivery
);

// ============================================================================
// 6. Communication Jobs
// ============================================================================
communicationRouter.get(
  '/jobs',
  requirePermission('communication:read'),
  CommunicationController.listJobs
);
communicationRouter.get(
  '/jobs/:id',
  requirePermission('communication:read'),
  CommunicationController.getJobById
);
communicationRouter.post(
  '/jobs',
  requirePermission('communication:create'),
  CommunicationController.createJob
);
communicationRouter.post(
  '/jobs/:id/cancel',
  requirePermission('communication:cancel'),
  CommunicationController.cancelJob
);

// ============================================================================
// 7. Executive Dashboard & Metrics
// ============================================================================
communicationRouter.get(
  '/reports/dashboard',
  requireAnyPermission(['communication_report:read', 'communication:read']),
  CommunicationController.getDashboardStats
);
communicationRouter.get(
  '/dashboard',
  requireAnyPermission(['communication_report:read', 'communication:read']),
  CommunicationController.getDashboardStats
);
