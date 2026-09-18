import { Types } from 'mongoose';
import {
  NotificationTemplate,
  INotificationTemplateDoc,
} from '@edusphere/database';
import {
  TemplateStatus,
  NotificationCategory,
  NotificationChannel,
  NotFoundError,
  BadRequestError,
} from '@edusphere/common';
import { TemplateEngine } from './template-engine.js';

export interface CreateTemplateInput {
  templateKey: string;
  category: NotificationCategory;
  eventType: string;
  channel?: NotificationChannel;
  locale?: string;
  subject?: string;
  titleTemplate: string;
  bodyTemplate: string;
  variables?: string[];
  status?: TemplateStatus;
}

export interface UpdateTemplateInput {
  subject?: string;
  titleTemplate?: string;
  bodyTemplate?: string;
  variables?: string[];
  status?: TemplateStatus;
}

export class TemplateService {
  /**
   * Create a new notification template
   */
  public static async createTemplate(
    tenantId: string,
    authorId: string,
    input: CreateTemplateInput
  ): Promise<INotificationTemplateDoc> {
    const tId = new Types.ObjectId(tenantId);
    const key = input.templateKey.trim().toUpperCase();
    const channel = input.channel || NotificationChannel.IN_APP;
    const locale = input.locale || 'en-IN';

    // Auto-detect variables from templates if not supplied
    const titleVars = TemplateEngine.extractVariables(input.titleTemplate);
    const bodyVars = TemplateEngine.extractVariables(input.bodyTemplate);
    const mergedVars = Array.from(new Set([...(input.variables || []), ...titleVars, ...bodyVars]));

    // Find highest version for this key + channel + locale
    const existing = await NotificationTemplate.findOne({
      tenantId: tId,
      templateKey: key,
      channel,
      locale,
    }).sort({ version: -1 });

    const nextVersion = existing ? existing.version + 1 : 1;

    const template = await NotificationTemplate.create({
      tenantId: tId,
      templateKey: key,
      category: input.category,
      eventType: input.eventType,
      channel,
      locale,
      version: nextVersion,
      subject: input.subject,
      titleTemplate: input.titleTemplate,
      bodyTemplate: input.bodyTemplate,
      variables: mergedVars,
      status: input.status || TemplateStatus.ACTIVE,
      createdBy: new Types.ObjectId(authorId),
      updatedBy: new Types.ObjectId(authorId),
    });

    return template;
  }

  /**
   * Get templates list with filters
   */
  public static async getTemplates(
    tenantId: string,
    query: {
      category?: NotificationCategory;
      channel?: NotificationChannel;
      status?: TemplateStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: INotificationTemplateDoc[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    };

    if (query.category) {
      filter.category = query.category;
    }
    if (query.channel) {
      filter.channel = query.channel;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search && query.search.trim()) {
      filter.$or = [
        { templateKey: { $regex: query.search.trim(), $options: 'i' } },
        { titleTemplate: { $regex: query.search.trim(), $options: 'i' } },
        { bodyTemplate: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      NotificationTemplate.find(filter)
        .sort({ templateKey: 1, version: -1 })
        .skip(skip)
        .limit(limit),
      NotificationTemplate.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Alias for getTemplates
   */
  public static async listTemplates(
    tenantId: string,
    query: any
  ): Promise<{ items: INotificationTemplateDoc[]; total: number; page: number; limit: number }> {
    return this.getTemplates(tenantId, query);
  }

  /**
   * Get single template by ID
   */
  public static async getTemplateById(
    tenantId: string,
    id: string
  ): Promise<INotificationTemplateDoc> {
    const template = await NotificationTemplate.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });

    if (!template) {
      throw new NotFoundError('Notification template not found.');
    }
    return template;
  }

  /**
   * Update template draft or active record
   */
  public static async updateTemplate(
    tenantId: string,
    id: string,
    input: UpdateTemplateInput,
    authorId?: string
  ): Promise<INotificationTemplateDoc> {
    const template = await this.getTemplateById(tenantId, id);

    if (template.status === TemplateStatus.ARCHIVED) {
      throw new BadRequestError('Archived templates cannot be modified.');
    }

    if (input.subject !== undefined) template.subject = input.subject;
    if (input.titleTemplate) template.titleTemplate = input.titleTemplate;
    if (input.bodyTemplate) template.bodyTemplate = input.bodyTemplate;

    const titleVars = TemplateEngine.extractVariables(template.titleTemplate);
    const bodyVars = TemplateEngine.extractVariables(template.bodyTemplate);
    template.variables = Array.from(new Set([...(input.variables || template.variables || []), ...titleVars, ...bodyVars]));

    if (input.status) template.status = input.status;
    if (authorId) template.updatedBy = new Types.ObjectId(authorId);

    await template.save();
    return template;
  }

  /**
   * Publish a template
   */
  public static async publishTemplate(
    tenantId: string,
    id: string
  ): Promise<INotificationTemplateDoc> {
    const template = await this.getTemplateById(tenantId, id);
    template.status = TemplateStatus.ACTIVE;
    await template.save();
    return template;
  }

  /**
   * Archive a template
   */
  public static async archiveTemplate(
    tenantId: string,
    id: string
  ): Promise<INotificationTemplateDoc> {
    const template = await this.getTemplateById(tenantId, id);
    template.status = TemplateStatus.ARCHIVED;
    await template.save();
    return template;
  }
}
