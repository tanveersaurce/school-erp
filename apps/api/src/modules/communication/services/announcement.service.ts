import { Types } from 'mongoose';
import {
  Announcement,
  IAnnouncementDoc,
  User,
  StudentEnrollment,
} from '@edusphere/database';
import {
  AnnouncementStatus,
  AnnouncementCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationCategory,
  CommunicationJobType,
  NotFoundError,
  BadRequestError,
} from '@edusphere/common';
import { IAnnouncementAudience } from '@edusphere/types';
import { CommunicationJobService } from './communication-job.service.js';
import { NotificationResolverService } from './notification-resolver.service.js';
import { eventBus } from '../events/event-bus.js';
import { logger } from '../../../core/logger/logger.js';

export interface CreateAnnouncementInput {
  schoolId: string;
  title: string;
  content: string;
  category?: AnnouncementCategory;
  priority?: NotificationPriority;
  targetAudience?: IAnnouncementAudience;
  channels?: NotificationChannel[];
  publishAt?: Date;
  expiresAt?: Date;
  attachments?: string[];
  acknowledgementRequired?: boolean;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  category?: AnnouncementCategory;
  priority?: NotificationPriority;
  targetAudience?: IAnnouncementAudience;
  channels?: NotificationChannel[];
  publishAt?: Date;
  expiresAt?: Date;
  attachments?: string[];
  acknowledgementRequired?: boolean;
}

export class AnnouncementService {
  /**
   * Create an announcement in DRAFT or SCHEDULED state
   */
  public static async createAnnouncement(
    tenantId: string,
    authorId: string,
    input: CreateAnnouncementInput
  ): Promise<IAnnouncementDoc> {
    const isScheduled = input.publishAt && new Date(input.publishAt) > new Date();

    const announcement = await Announcement.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(input.schoolId),
      authorId: new Types.ObjectId(authorId),
      title: input.title.trim(),
      content: input.content,
      category: input.category || AnnouncementCategory.GENERAL,
      priority: input.priority || NotificationPriority.NORMAL,
      status: isScheduled ? AnnouncementStatus.SCHEDULED : AnnouncementStatus.DRAFT,
      targetAudience: input.targetAudience || { isAll: true },
      channels: input.channels && input.channels.length > 0 ? input.channels : [NotificationChannel.IN_APP],
      publishAt: input.publishAt ? new Date(input.publishAt) : new Date(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      attachments: input.attachments || [],
      acknowledgementRequired: input.acknowledgementRequired ?? false,
      acknowledgements: [],
    });

    return announcement;
  }

  /**
   * Query announcements with filters and pagination
   */
  public static async getAnnouncements(
    tenantId: string,
    query: {
      schoolId?: string;
      status?: AnnouncementStatus;
      category?: AnnouncementCategory;
      priority?: NotificationPriority;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: IAnnouncementDoc[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    };

    if (query.schoolId) {
      filter.schoolId = new Types.ObjectId(query.schoolId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }
    if (query.search && query.search.trim()) {
      filter.$or = [
        { title: { $regex: query.search.trim(), $options: 'i' } },
        { content: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Announcement.find(filter)
        .sort({ publishAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Retrieve single announcement by ID
   */
  public static async getAnnouncementById(
    tenantId: string,
    id: string
  ): Promise<IAnnouncementDoc> {
    const announcement = await Announcement.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });

    if (!announcement) {
      throw new NotFoundError('Announcement not found.');
    }
    return announcement;
  }

  /**
   * Update announcement (only if not already published/archived)
   */
  public static async updateAnnouncement(
    tenantId: string,
    id: string,
    input: UpdateAnnouncementInput
  ): Promise<IAnnouncementDoc> {
    const announcement = await this.getAnnouncementById(tenantId, id);

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new BadRequestError('Archived announcements cannot be modified.');
    }

    if (input.title) announcement.title = input.title.trim();
    if (input.content) announcement.content = input.content;
    if (input.category) announcement.category = input.category;
    if (input.priority) announcement.priority = input.priority;
    if (input.targetAudience) announcement.targetAudience = input.targetAudience;
    if (input.channels) announcement.channels = input.channels;
    if (input.publishAt) {
      announcement.publishAt = new Date(input.publishAt);
      if (announcement.status === AnnouncementStatus.DRAFT && announcement.publishAt > new Date()) {
        announcement.status = AnnouncementStatus.SCHEDULED;
      }
    }
    if (input.expiresAt !== undefined) {
      announcement.expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    }
    if (input.attachments) announcement.attachments = input.attachments;
    if (input.acknowledgementRequired !== undefined) {
      announcement.acknowledgementRequired = input.acknowledgementRequired;
    }

    await announcement.save();
    return announcement;
  }

  /**
   * Publish an announcement immediately and dispatch notifications to resolved audience
   */
  public static async publishAnnouncement(
    tenantId: string,
    id: string,
    authorId?: string
  ): Promise<IAnnouncementDoc> {
    const announcement = await this.getAnnouncementById(tenantId, id);

    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      return announcement; // Idempotent
    }

    announcement.status = AnnouncementStatus.PUBLISHED;
    announcement.publishedAt = new Date();
    announcement.publishAt = new Date();
    await announcement.save();

    // 1. Resolve audience user IDs
    const recipientUserIds = await this.resolveAudience(
      tenantId,
      announcement.schoolId.toString(),
      announcement.targetAudience
    );

    // 2. Create and start a CommunicationJob for tracking
    const job = await CommunicationJobService.createJob({
      tenantId,
      schoolId: announcement.schoolId.toString(),
      title: `Broadcast: ${announcement.title}`,
      communicationType: CommunicationJobType.ANNOUNCEMENT_BROADCAST,
      sourceEntity: {
        entityType: 'Announcement',
        entityId: announcement._id.toString(),
      },
      audienceDefinition: announcement.targetAudience,
      requestedChannels: announcement.channels,
      totalRecipients: recipientUserIds.length,
      createdBy: authorId,
    });

    // 3. Process dispatch in chunks
    try {
      await this.dispatchAnnouncementToRecipients(
        tenantId,
        announcement,
        recipientUserIds,
        job._id.toString()
      );
    } catch (err) {
      logger.error(
        { err: (err as Error).message, announcementId: announcement._id },
        'Background announcement distribution encountered an error'
      );
    }

    // 4. Emit domain event
    await eventBus.emit({
      eventId: `evt_ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType: 'announcement.published',
      tenantId,
      schoolId: announcement.schoolId.toString(),
      sourceEntityType: 'Announcement',
      sourceEntityId: announcement._id.toString(),
      occurredAt: new Date(),
      version: 1,
      payload: {
        announcementId: announcement._id.toString(),
        title: announcement.title,
        recipientCount: recipientUserIds.length,
      },
    });

    return announcement;
  }

  /**
   * Cancel a scheduled or published announcement
   */
  public static async cancelAnnouncement(
    tenantId: string,
    id: string,
    reason?: string
  ): Promise<IAnnouncementDoc> {
    const announcement = await this.getAnnouncementById(tenantId, id);
    announcement.status = AnnouncementStatus.CANCELLED;
    await announcement.save();
    return announcement;
  }

  /**
   * Archive an announcement
   */
  public static async archiveAnnouncement(
    tenantId: string,
    id: string
  ): Promise<IAnnouncementDoc> {
    const announcement = await this.getAnnouncementById(tenantId, id);
    announcement.status = AnnouncementStatus.ARCHIVED;
    await announcement.save();
    return announcement;
  }

  /**
   * Acknowledge receipt of announcement
   */
  public static async acknowledgeAnnouncement(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<IAnnouncementDoc> {
    const announcement = await this.getAnnouncementById(tenantId, id);

    const alreadyAck = announcement.acknowledgements?.some(
      (a) => a.userId.toString() === userId
    );

    if (!alreadyAck) {
      if (!announcement.acknowledgements) announcement.acknowledgements = [];
      announcement.acknowledgements.push({
        userId,
        acknowledgedAt: new Date(),
      });
      await announcement.save();
    }

    return announcement;
  }

  /**
   * Get announcements visible to user
   */
  public static async getAnnouncementsForUser(
    tenantId: string,
    userId: string,
    userRoles: string[],
    query: {
      schoolId?: string;
      category?: AnnouncementCategory;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: IAnnouncementDoc[]; total: number; page: number; limit: number }> {
    return this.getAnnouncements(tenantId, {
      ...query,
      status: AnnouncementStatus.PUBLISHED,
    });
  }

  /**
   * List all announcements for administrative management
   */
  public static async listAllAnnouncements(
    tenantId: string,
    query: any
  ): Promise<{ items: IAnnouncementDoc[]; total: number; page: number; limit: number }> {
    return this.getAnnouncements(tenantId, query);
  }

  /**
   * Background scan: publish any announcements scheduled for now or earlier
   */
  public static async publishDueScheduledAnnouncements(): Promise<number> {
    const now = new Date();
    const dueAnnouncements = await Announcement.find({
      status: AnnouncementStatus.SCHEDULED,
      publishAt: { $lte: now },
      isDeleted: { $ne: true },
    });

    let publishedCount = 0;
    for (const ann of dueAnnouncements) {
      await this.publishAnnouncement(ann.tenantId.toString(), ann._id.toString());
      publishedCount++;
    }
    return publishedCount;
  }

  /**
   * Resolve user IDs matching audience filters
   */
  public static async resolveAudience(
    tenantId: string,
    schoolId: string,
    audience: IAnnouncementAudience = {}
  ): Promise<string[]> {
    const tId = new Types.ObjectId(tenantId);
    const userIdsSet = new Set<string>();

    if (audience.specificUserIds && audience.specificUserIds.length > 0) {
      for (const id of audience.specificUserIds) userIdsSet.add(id);
    }

    if (audience.isAll) {
      // All active users in tenant
      const users = await User.find({ tenantId: tId, isActive: true }, { _id: 1 });
      for (const u of users) userIdsSet.add(u._id.toString());
      return Array.from(userIdsSet);
    }

    // Role filtering
    if (audience.roles && audience.roles.length > 0) {
      const usersByRole = await User.find(
        { tenantId: tId, userType: { $in: audience.roles }, isActive: true },
        { _id: 1 }
      );
      for (const u of usersByRole) userIdsSet.add(u._id.toString());
    }

    // Class/Section filtering via student enrollments
    if (
      (audience.classIds && audience.classIds.length > 0) ||
      (audience.sectionIds && audience.sectionIds.length > 0)
    ) {
      const enrollFilter: any = { tenantId: tId };
      if (audience.classIds && audience.classIds.length > 0) {
        enrollFilter.classId = { $in: audience.classIds.map((id) => new Types.ObjectId(id)) };
      }
      if (audience.sectionIds && audience.sectionIds.length > 0) {
        enrollFilter.sectionId = { $in: audience.sectionIds.map((id) => new Types.ObjectId(id)) };
      }

      const enrollments = await StudentEnrollment.find(enrollFilter, { studentId: 1 });
      for (const e of enrollments) {
        userIdsSet.add(e.studentId.toString());
      }
    }

    return Array.from(userIdsSet);
  }

  /**
   * Helper to dispatch announcement to resolved recipients in chunks
   */
  private static async dispatchAnnouncementToRecipients(
    tenantId: string,
    announcement: IAnnouncementDoc,
    recipients: string[],
    jobId: string
  ): Promise<void> {
    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];

    const CHUNK_SIZE = 50;
    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (userId) => {
          try {
            await NotificationResolverService.resolveAndSend({
              tenantId,
              schoolId: announcement.schoolId.toString(),
              recipientId: userId,
              category: NotificationCategory.ANNOUNCEMENT,
              eventType: 'announcement.published',
              title: announcement.title,
              body: announcement.content,
              priority: announcement.priority,
              deepLink: `/announcements/${announcement._id}`,
              sourceEntityType: 'Announcement',
              sourceEntityId: announcement._id.toString(),
              targetChannels: announcement.channels,
            });
            successCount++;
          } catch (err) {
            failureCount++;
            failures.push(`User ${userId}: ${(err as Error).message}`);
          }
        })
      );

      await CommunicationJobService.updateJobProgress(
        jobId,
        Math.min(i + CHUNK_SIZE, recipients.length),
        successCount,
        failureCount,
        failures
      );
    }

    await CommunicationJobService.completeJob(jobId, successCount, failureCount, failures);
  }
}
