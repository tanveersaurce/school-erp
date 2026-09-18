import { Types } from 'mongoose';
import {
  ReportScheduleFrequency,
  ReportFormat,
  NotFoundError,
  BadRequestError,
} from '@edusphere/common';
import {
  IScheduledReport,
} from '@edusphere/types';
import { ScheduledReport } from '@edusphere/database';
import { REPORT_DEFINITIONS_MAP } from '../registry/report-definitions.js';
import { reportExportService } from './report-export.service.js';

export class ScheduledReportService {
  /**
   * Computes the next scheduled execution timestamp.
   */
  calculateNextRunAt(
    frequency: ReportScheduleFrequency,
    timeOfDay = '08:00',
    dayOfWeek = 1,
    dayOfMonth = 1
  ): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const next = new Date();
    next.setHours(hours || 8, minutes || 0, 0, 0);

    // If time has already passed today, advance by default 1 day
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case ReportScheduleFrequency.DAILY:
        return next;

      case ReportScheduleFrequency.WEEKLY: {
        const currentDay = next.getDay();
        const diff = (dayOfWeek - currentDay + 7) % 7;
        next.setDate(next.getDate() + (diff === 0 ? 7 : diff));
        return next;
      }

      case ReportScheduleFrequency.MONTHLY: {
        next.setDate(dayOfMonth);
        if (next.getTime() <= Date.now()) {
          next.setMonth(next.getMonth() + 1);
        }
        return next;
      }

      case ReportScheduleFrequency.QUARTERLY: {
        next.setDate(dayOfMonth);
        next.setMonth(next.getMonth() + 3);
        return next;
      }

      default:
        return next;
    }
  }

  /**
   * Create a new scheduled report.
   */
  async createSchedule(
    data: {
      name: string;
      description?: string;
      reportKey: string;
      filters?: Record<string, any>;
      format?: ReportFormat;
      frequency: ReportScheduleFrequency;
      timeOfDay?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      recipients: string[];
      isActive?: boolean;
    },
    tenantId: string,
    userId: string,
    schoolId?: string
  ): Promise<IScheduledReport> {
    if (!REPORT_DEFINITIONS_MAP.has(data.reportKey)) {
      throw new NotFoundError(`Report '${data.reportKey}' not found in registry.`);
    }

    const nextRunAt = this.calculateNextRunAt(
      data.frequency,
      data.timeOfDay,
      data.dayOfWeek,
      data.dayOfMonth
    );

    const doc = await ScheduledReport.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: schoolId ? new Types.ObjectId(schoolId) : undefined,
      name: data.name,
      description: data.description,
      reportKey: data.reportKey,
      filters: data.filters || {},
      format: data.format || ReportFormat.CSV,
      frequency: data.frequency,
      timeOfDay: data.timeOfDay || '08:00',
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      recipients: data.recipients || [],
      isActive: data.isActive !== false,
      nextRunAt,
      createdBy: new Types.ObjectId(userId),
    });

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId?.toString(),
      name: doc.name,
      description: doc.description,
      reportKey: doc.reportKey,
      filters: doc.filters || {},
      format: doc.format as ReportFormat,
      frequency: doc.frequency as ReportScheduleFrequency,
      timeOfDay: doc.timeOfDay,
      dayOfWeek: doc.dayOfWeek,
      dayOfMonth: doc.dayOfMonth,
      recipients: doc.recipients,
      isActive: doc.isActive,
      nextRunAt: doc.nextRunAt,
      createdBy: doc.createdBy.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * List scheduled reports for tenant.
   */
  async listSchedules(tenantId: string): Promise<IScheduledReport[]> {
    const docs = await ScheduledReport.find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .lean();

    return docs.map((doc: any) => ({
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId?.toString(),
      name: doc.name,
      description: doc.description,
      reportKey: doc.reportKey,
      filters: doc.filters || {},
      format: doc.format as ReportFormat,
      frequency: doc.frequency as ReportScheduleFrequency,
      timeOfDay: doc.timeOfDay,
      dayOfWeek: doc.dayOfWeek,
      dayOfMonth: doc.dayOfMonth,
      recipients: doc.recipients || [],
      isActive: doc.isActive,
      lastRunAt: doc.lastRunAt,
      nextRunAt: doc.nextRunAt,
      lastRunStatus: doc.lastRunStatus,
      lastRunError: doc.lastRunError,
      createdBy: doc.createdBy.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  /**
   * Get single schedule by ID.
   */
  async getScheduleById(id: string, tenantId: string): Promise<IScheduledReport> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid schedule ID.');
    }

    const doc = await ScheduledReport.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!doc) {
      throw new NotFoundError('Scheduled report not found.');
    }

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId?.toString(),
      name: doc.name,
      description: doc.description,
      reportKey: doc.reportKey,
      filters: doc.filters || {},
      format: doc.format as ReportFormat,
      frequency: doc.frequency as ReportScheduleFrequency,
      timeOfDay: doc.timeOfDay,
      dayOfWeek: doc.dayOfWeek,
      dayOfMonth: doc.dayOfMonth,
      recipients: doc.recipients || [],
      isActive: doc.isActive,
      lastRunAt: doc.lastRunAt,
      nextRunAt: doc.nextRunAt,
      lastRunStatus: doc.lastRunStatus,
      lastRunError: doc.lastRunError,
      createdBy: doc.createdBy.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Update scheduled report.
   */
  async updateSchedule(
    id: string,
    data: Partial<IScheduledReport>,
    tenantId: string,
    userId: string
  ): Promise<IScheduledReport> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid schedule ID.');
    }

    const doc = await ScheduledReport.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!doc) {
      throw new NotFoundError('Scheduled report not found.');
    }

    if (data.name !== undefined) doc.name = data.name;
    if (data.description !== undefined) doc.description = data.description;
    if (data.filters !== undefined) doc.filters = data.filters;
    if (data.format !== undefined) doc.format = data.format;
    if (data.frequency !== undefined) doc.frequency = data.frequency;
    if (data.timeOfDay !== undefined) doc.timeOfDay = data.timeOfDay;
    if (data.dayOfWeek !== undefined) doc.dayOfWeek = data.dayOfWeek;
    if (data.dayOfMonth !== undefined) doc.dayOfMonth = data.dayOfMonth;
    if (data.recipients !== undefined) doc.recipients = data.recipients;
    if (data.isActive !== undefined) doc.isActive = data.isActive;

    doc.updatedBy = new Types.ObjectId(userId);
    doc.nextRunAt = this.calculateNextRunAt(
      doc.frequency as ReportScheduleFrequency,
      doc.timeOfDay,
      doc.dayOfWeek,
      doc.dayOfMonth
    );

    await doc.save();
    return this.getScheduleById(id, tenantId);
  }

  /**
   * Delete scheduled report.
   */
  async deleteSchedule(id: string, tenantId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid schedule ID.');
    }

    const res = await ScheduledReport.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (res.deletedCount === 0) {
      throw new NotFoundError('Scheduled report not found.');
    }
  }

  /**
   * Manually trigger an immediate run of a scheduled report.
   */
  async triggerScheduleRun(id: string, tenantId: string, userId: string): Promise<any> {
    const schedule = await this.getScheduleById(id, tenantId);

    // Create an export job for the scheduled report
    const job = await reportExportService.createExportJob(
      schedule.reportKey,
      schedule.filters,
      { tenantId, schoolId: schedule.schoolId, userId },
      schedule.format
    );

    await ScheduledReport.findByIdAndUpdate(id, {
      lastRunAt: new Date(),
      lastRunStatus: 'SUCCESS',
      lastJobId: new Types.ObjectId(job.id),
      nextRunAt: this.calculateNextRunAt(
        schedule.frequency,
        schedule.timeOfDay,
        schedule.dayOfWeek,
        schedule.dayOfMonth
      ),
    });

    return job;
  }
}

export const scheduledReportService = new ScheduledReportService();
